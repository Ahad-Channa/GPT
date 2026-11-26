const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Settings = require('../models/Settings');
const PromoCode = require('../models/PromoCode');
const LeaderboardCycle = require('../models/Leaderboard');
const Notification = require('../models/Notification');
const VipConfig = require('../models/VipConfig');
const VipClaim = require('../models/VipClaim');
const admin = require('../config/firebase');

const walletRouter = require('../routes/wallet');
const { resetLeaderboard } = require('../routes/leaderboard');
const vipRouter = require('../routes/vip');
const {
  BONUS_HOLDABLE_TYPES,
  EARNING_HOLD_RELEASE_TYPES,
  REAL_OFFER_EARNING_TYPES,
  isBonusHoldableType,
  isRealOfferEarningType,
} = require('../utils/earningTypes');
const {
  releaseEarningHoldTransaction,
  releaseEligibleEarningHolds,
} = require('../utils/earningHoldJob');

const handlerFor = (router, method, routePath) => {
  const layer = router.stack.find((l) => l.route && l.route.path === routePath && l.route.methods[method]);
  return layer.route.stack[layer.route.stack.length - 1].handle;
};

test('bonus holdable types include daily, leaderboard, and vip rewards but exclude promo codes and remain distinct from real offer earnings', () => {
  assert.deepEqual(BONUS_HOLDABLE_TYPES, [
    'daily_bonus',
    'leaderboard_reward',
    'vip_reward',
  ]);
  for (const bonusType of BONUS_HOLDABLE_TYPES) {
    assert.equal(isBonusHoldableType(bonusType), true);
    assert.equal(isRealOfferEarningType(bonusType), false);
    assert.equal(EARNING_HOLD_RELEASE_TYPES.includes(bonusType), true);
  }
  for (const offerType of REAL_OFFER_EARNING_TYPES) {
    assert.equal(EARNING_HOLD_RELEASE_TYPES.includes(offerType), true);
  }
  assert.equal(isBonusHoldableType('promo_code'), false);
  assert.equal(EARNING_HOLD_RELEASE_TYPES.includes('promo_code'), false);
});

test('daily bonus claim applies platform hold when reward meets threshold and credits immediately when below threshold', async (t) => {
  const claimHandler = handlerFor(walletRouter, 'post', '/daily-bonus');

  // Case 1: reward (500) >= threshold (500) -> held, walletBalance not incremented
  {
    const user = { _id: 'u-daily-1', firebaseUid: 'f-daily-1', walletBalance: 1000, dailyBonusStreak: 9, lastDailyBonusClaim: null };
    let walletIncrement = null;
    let createdTx = null;

    t.mock.method(User, 'findOne', async () => user);
    t.mock.method(User, 'findOneAndUpdate', async (_q, update) => {
      walletIncrement = update.$inc?.walletBalance;
      return { ...user, walletBalance: user.walletBalance + (walletIncrement || 0) };
    });
    t.mock.method(Settings, 'getSingleton', async () => ({
      rewardEngine: {
        dailyBonusEarnGate: Array(30).fill(1000),
        dailyBonusReward: Array(30).fill(500),
      },
      earningHoldConfig: { enabled: true, threshold: 500, holdDays: 7 },
    }));
    t.mock.method(Transaction, 'aggregate', async () => [{ _id: null, total: 5000 }]);
    t.mock.method(Transaction, 'create', async (doc) => {
      createdTx = doc;
      return doc;
    });

    let body;
    const res = { status() { return this; }, json(data) { body = data; return this; } };
    await claimHandler({ user: { uid: 'f-daily-1' } }, res);

    assert.equal(body.success, true);
    assert.equal(body.rewardAmount, 500);
    assert.equal(body.status, 'hold');
    assert.equal(body.balance, 1000);
    assert.equal(walletIncrement, 0);
    assert.equal(createdTx.transactionType, 'daily_bonus');
    assert.equal(createdTx.status, 'hold');
    assert.ok(createdTx.holdUntil instanceof Date);
    assert.equal(createdTx.metadata?.walletApplied, false);
  }

  // Case 2: reward (100) < threshold (500) -> completed immediately
  {
    const user = { _id: 'u-daily-2', firebaseUid: 'f-daily-2', walletBalance: 1000, dailyBonusStreak: 0, lastDailyBonusClaim: null };
    let walletIncrement = null;
    let createdTx = null;

    t.mock.method(User, 'findOne', async () => user);
    t.mock.method(User, 'findOneAndUpdate', async (_q, update) => {
      walletIncrement = update.$inc?.walletBalance;
      return { ...user, walletBalance: user.walletBalance + (walletIncrement || 0) };
    });
    t.mock.method(Settings, 'getSingleton', async () => ({
      rewardEngine: {
        dailyBonusEarnGate: Array(30).fill(1000),
        dailyBonusReward: Array(30).fill(100),
      },
      earningHoldConfig: { enabled: true, threshold: 500, holdDays: 7 },
    }));
    t.mock.method(Transaction, 'aggregate', async () => [{ _id: null, total: 5000 }]);
    t.mock.method(Transaction, 'create', async (doc) => {
      createdTx = doc;
      return doc;
    });

    let body;
    const res = { status() { return this; }, json(data) { body = data; return this; } };
    await claimHandler({ user: { uid: 'f-daily-2' } }, res);

    assert.equal(body.success, true);
    assert.equal(body.rewardAmount, 100);
    assert.equal(body.status, 'completed');
    assert.equal(body.balance, 1100);
    assert.equal(walletIncrement, 100);
    assert.equal(createdTx.status, 'completed');
    assert.equal(createdTx.holdUntil, null);
  }
});

test('leaderboard reset puts prizes at or above platform hold threshold on hold and credits smaller prizes immediately', async (t) => {
  const usersById = {
    'u-rank-1': {
      _id: 'u-rank-1',
      firebaseUid: 'f-rank-1',
      displayName: 'Winner1',
      walletBalance: 200,
      savedCount: 0,
      async save() { this.savedCount++; return this; },
    },
    'u-rank-2': {
      _id: 'u-rank-2',
      firebaseUid: 'f-rank-2',
      displayName: 'Winner2',
      walletBalance: 300,
      savedCount: 0,
      async save() { this.savedCount++; return this; },
    },
  };

  const settingsDoc = {
    leaderboardConfig: {
      daily: {
        enabled: true,
        rewardedRanks: 2,
        rewardTiers: [1000, 200],
        visibleSlots: 10,
        lastResetAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    earningHoldConfig: { enabled: true, threshold: 500, holdDays: 5 },
    markModified() {},
    async save() { return this; },
  };

  const createdTxs = [];

  t.mock.method(Notification, 'create', async (doc) => doc);
  t.mock.method(Settings, 'getSingleton', async () => settingsDoc);
  t.mock.method(Settings, 'findOneAndUpdate', async () => settingsDoc);
  t.mock.method(Transaction, 'aggregate', async () => [
    {
      userId: 'u-rank-1',
      displayName: 'Winner1',
      coinsEarned: 8000,
    },
    {
      userId: 'u-rank-2',
      displayName: 'Winner2',
      coinsEarned: 4000,
    },
  ]);
  t.mock.method(User, 'find', () => ({
    sort() { return this; },
    limit() { return this; },
    lean: async () => [],
  }));
  t.mock.method(User, 'findById', async (id) => usersById[String(id)] || null);
  t.mock.method(Transaction, 'create', async (doc) => {
    const tx = { _id: `tx-${createdTxs.length + 1}`, createdAt: new Date(), ...doc };
    createdTxs.push(tx);
    return tx;
  });
  t.mock.method(LeaderboardCycle, 'create', async (doc) => doc);

  await resetLeaderboard('daily');

  assert.equal(createdTxs.length, 2);

  // Rank 1 prize (1000 >= 500) is put on hold; walletBalance stays 200
  const tx1 = createdTxs.find((tx) => tx.userId === 'u-rank-1');
  assert.equal(tx1.transactionType, 'leaderboard_reward');
  assert.equal(tx1.amount, 1000);
  assert.equal(tx1.status, 'hold');
  assert.ok(tx1.holdUntil instanceof Date);
  assert.equal(tx1.balanceAfter, 200);
  assert.equal(usersById['u-rank-1'].walletBalance, 200);
  assert.equal(usersById['u-rank-1'].savedCount, 0);

  // Rank 2 prize (200 < 500) is credited immediately; walletBalance becomes 500
  const tx2 = createdTxs.find((tx) => tx.userId === 'u-rank-2');
  assert.equal(tx2.transactionType, 'leaderboard_reward');
  assert.equal(tx2.amount, 200);
  assert.equal(tx2.status, 'completed');
  assert.equal(tx2.holdUntil, null);
  assert.equal(tx2.balanceAfter, 500);
  assert.equal(usersById['u-rank-2'].walletBalance, 500);
  assert.equal(usersById['u-rank-2'].savedCount, 1);
});

test('VIP level bonus claim applies platform hold when reward meets threshold', async (t) => {
  // Use the router stack directly; bypass auth middleware by calling the route handler with req.user populated
  const layer = vipRouter.stack.find((l) => l.route && l.route.path === '/claim/:levelKey' && l.route.methods.post);
  const claimHandler = layer.route.stack[layer.route.stack.length - 1].handle;

  const user = { _id: 'u-vip-1', firebaseUid: 'f-vip-1', totalEarned: 500000, walletBalance: 400 };
  let walletUpdated = false;
  let createdClaim = null;
  let createdTx = null;

  t.mock.method(Notification, 'create', async (doc) => doc);
  t.mock.method(VipConfig, 'find', async () => [{ levelKey: 'gold_1', rewardAmount: 2000, threshold: 200000 }]);
  t.mock.method(VipClaim, 'findOne', async () => null);
  t.mock.method(VipConfig, 'findOne', async () => ({ levelKey: 'gold_1', rewardAmount: 2000 }));
  t.mock.method(Settings, 'getSingleton', async () => ({
    earningHoldConfig: { enabled: true, threshold: 1000, holdDays: 14 },
  }));
  t.mock.method(User, 'findByIdAndUpdate', async () => {
    walletUpdated = true;
    return { ...user, walletBalance: 2400 };
  });
  t.mock.method(VipClaim, 'create', async (doc) => {
    createdClaim = doc;
    return doc;
  });
  t.mock.method(Transaction, 'create', async (doc) => {
    createdTx = doc;
    return doc;
  });

  let body;
  const res = { status() { return this; }, json(data) { body = data; return this; } };
  await claimHandler({ params: { levelKey: 'gold_1' }, user }, res);

  assert.equal(body.success, true);
  assert.equal(body.rewardAmount, 2000);
  assert.equal(body.newBalance, 400);
  assert.equal(body.status, 'hold');
  assert.equal(walletUpdated, false);
  assert.equal(createdClaim.levelKey, 'gold_1');
  assert.equal(createdTx.transactionType, 'vip_reward');
  assert.equal(createdTx.status, 'hold');
  assert.ok(createdTx.holdUntil instanceof Date);
  assert.equal(createdTx.metadata?.walletApplied, false);
});

test('promo codes never go on hold even when platform hold threshold is 0', async (t) => {
  const promoHandler = handlerFor(walletRouter, 'post', '/redeem-promo');
  const user = { _id: 'u-promo-1', firebaseUid: 'f-promo-1', walletBalance: 50 };
  const promo = {
    _id: 'promo-1',
    code: 'WELCOME500',
    isActive: true,
    expiresAt: null,
    usedBy: [],
    maxUses: 0,
    usedCount: 0,
    minEarningsLast7Days: 0,
    rewardCoins: 500,
  };

  let createdTx = null;
  t.mock.method(User, 'findOne', async () => user);
  t.mock.method(PromoCode, 'findOne', async () => promo);
  t.mock.method(PromoCode, 'findOneAndUpdate', async () => promo);
  t.mock.method(User, 'findOneAndUpdate', async (_q, update) => ({
    ...user,
    walletBalance: user.walletBalance + (update.$inc?.walletBalance || 0),
  }));
  t.mock.method(Settings, 'getSingleton', async () => ({
    earningHoldConfig: { enabled: true, threshold: 0, holdDays: 30 },
  }));
  t.mock.method(Transaction, 'create', async (doc) => {
    createdTx = doc;
    return doc;
  });

  let body;
  const res = { status() { return this; }, json(data) { body = data; return this; } };
  await promoHandler({ body: { code: 'welcome500' }, user: { uid: 'f-promo-1' } }, res);

  assert.equal(body.success, true);
  assert.equal(body.coinsEarned, 500);
  assert.equal(body.newBalance, 550);
  assert.equal(createdTx.transactionType, 'promo_code');
  assert.equal(createdTx.status, 'completed');
  assert.equal(createdTx.holdUntil, undefined);
});

test('earning hold release job releases matured daily_bonus, leaderboard_reward, and vip_reward holds once', async () => {
  const now = new Date('2026-11-26T12:00:00.000Z');
  const past = new Date('2026-11-25T12:00:00.000Z');

  const user = {
    _id: 'u-release-bonus',
    walletBalance: 100,
    releasedEarningHoldTransactionIds: [],
  };

  const txs = [
    {
      _id: 'tx-daily',
      userId: 'u-release-bonus',
      transactionType: 'daily_bonus',
      amount: 500,
      status: 'hold',
      holdUntil: past,
      balanceAfter: 100,
      metadata: { walletApplied: false },
      description: 'Daily Bonus Claim (Streak: 10 Days)',
    },
    {
      _id: 'tx-lb',
      userId: 'u-release-bonus',
      transactionType: 'leaderboard_reward',
      amount: 1000,
      status: 'hold',
      holdUntil: past,
      balanceAfter: 100,
      metadata: { walletApplied: false },
      description: 'Daily Leaderboard Reward — Rank #1',
    },
    {
      _id: 'tx-vip',
      userId: 'u-release-bonus',
      transactionType: 'vip_reward',
      amount: 2000,
      status: 'hold',
      holdUntil: past,
      balanceAfter: 100,
      metadata: { walletApplied: false },
      description: 'VIP Bonus — Gold I',
    },
  ];

  const getPath = (target, key) => key.split('.').reduce((value, part) => value?.[part], target);
  const setPath = (target, key, value) => {
    const parts = key.split('.');
    let cursor = target;
    while (parts.length > 1) {
      const part = parts.shift();
      cursor[part] = cursor[part] || {};
      cursor = cursor[part];
    }
    cursor[parts[0]] = value;
  };
  const matches = (doc, query = {}) => Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some((branch) => matches(doc, branch));
    const actual = getPath(doc, key);
    if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
      if (expected.$in) return expected.$in.includes(actual);
      if (Object.prototype.hasOwnProperty.call(expected, '$ne')) {
        if (Array.isArray(actual)) return !actual.includes(expected.$ne);
        return actual !== expected.$ne;
      }
      if (Object.prototype.hasOwnProperty.call(expected, '$exists')) return (actual !== undefined) === expected.$exists;
      if (Object.prototype.hasOwnProperty.call(expected, '$lte')) return new Date(actual).getTime() <= new Date(expected.$lte).getTime();
    }
    return String(actual || '') === String(expected || '');
  });
  const applyUpdate = (doc, update = {}) => {
    if (!doc) return null;
    if (update.$set) {
      for (const [k, v] of Object.entries(update.$set)) setPath(doc, k, v);
    }
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) setPath(doc, k, (getPath(doc, k) || 0) + v);
    }
    if (update.$addToSet) {
      for (const [k, v] of Object.entries(update.$addToSet)) {
        const arr = getPath(doc, k) || [];
        if (!arr.includes(v)) arr.push(v);
        setPath(doc, k, arr);
      }
    }
    return doc;
  };

  const models = {
    Transaction: {
      async find(query) {
        return txs.filter((item) => matches(item, query));
      },
      async findOneAndUpdate(query, update) {
        const tx = txs.find((item) => matches(item, query));
        return applyUpdate(tx, update);
      },
    },
    User: {
      async findOneAndUpdate(query, update) {
        if (!matches(user, query)) return null;
        return applyUpdate(user, update);
      },
      async findById(id) {
        return String(user._id) === String(id) ? user : null;
      },
    },
  };

  const summary = await releaseEligibleEarningHolds({
    now,
    models,
    hooks: { notify: async () => {} },
    logger: { log() {} },
  });

  assert.equal(summary.scanned, 3);
  assert.equal(summary.released, 3);
  assert.equal(user.walletBalance, 100 + 500 + 1000 + 2000);
  for (const tx of txs) {
    assert.equal(tx.status, 'completed');
    assert.equal(tx.metadata.walletApplied, true);
  }

  // Re-running does not double-credit
  const secondRun = await releaseEligibleEarningHolds({
    now,
    models,
    hooks: { notify: async () => {} },
    logger: { log() {} },
  });
  assert.equal(secondRun.scanned, 0);
  assert.equal(secondRun.released, 0);
  assert.equal(user.walletBalance, 3600);
});
