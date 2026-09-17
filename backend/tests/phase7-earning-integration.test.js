const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.NODE_ENV = 'test';

const Transaction = require('../models/Transaction');
const { releaseEarningHoldTransaction } = require('../utils/earningHoldJob');
const {
  ACTIVE_EARNING_STATUSES,
  REAL_EARNING_REVERSAL_TYPES,
  REAL_OFFER_EARNING_TYPES,
  getActiveRealOfferEarningMatch,
  getCompletedRealOfferEarningMatch,
  getEarningHoldDecision,
  isRealEarningReversalType,
  isRealOfferEarningType,
} = require('../utils/earningTypes');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const makeDoc = (payload) => ({
  ...payload,
  async save() {
    return this;
  },
});

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
    if (Object.prototype.hasOwnProperty.call(expected, '$ne')) return actual !== expected.$ne;
    if (Object.prototype.hasOwnProperty.call(expected, '$exists')) return (actual !== undefined) === expected.$exists;
    if (Object.prototype.hasOwnProperty.call(expected, '$lte')) return new Date(actual).getTime() <= new Date(expected.$lte).getTime();
  }
  return String(actual || '') === String(expected || '');
});

const applyUpdate = (doc, update = {}) => {
  if (!doc) return doc;
  if (update.$set) {
    for (const [key, value] of Object.entries(update.$set)) setPath(doc, key, value);
  }
  if (update.$inc) {
    for (const [key, value] of Object.entries(update.$inc)) setPath(doc, key, (getPath(doc, key) || 0) + value);
  }
  if (update.$addToSet) {
    for (const [key, value] of Object.entries(update.$addToSet)) {
      const current = getPath(doc, key) || [];
      if (!current.some((item) => String(item) === String(value))) current.push(value);
      setPath(doc, key, current);
    }
  }
  return doc;
};

const makeHoldReleaseModels = (state) => ({
  Transaction: {
    async findOneAndUpdate(query, update) {
      const tx = state.transactions.find((item) => matches(item, query));
      return applyUpdate(tx, update) || null;
    },
    async find(query) {
      return state.transactions.filter((item) => matches(item, query));
    },
  },
  User: {
    async findOneAndUpdate(query, update) {
      const user = state.users.find((item) => matches(item, query));
      return applyUpdate(user, update) || null;
    },
    async findById(id) {
      return state.users.find((item) => String(item._id) === String(id)) || null;
    },
  },
});

test('shared real earning classification covers direct, custom, and offerwall rewards only', () => {
  assert.deepEqual(REAL_OFFER_EARNING_TYPES, [
    'offer_reward',
    'custom_offer_reward',
    'direct_offer_reward',
  ]);
  assert.equal(isRealOfferEarningType('offer_reward'), true);
  assert.equal(isRealOfferEarningType('custom_offer_reward'), true);
  assert.equal(isRealOfferEarningType('direct_offer_reward'), true);
  assert.equal(isRealOfferEarningType('daily_bonus'), false);
  assert.equal(isRealOfferEarningType('referral_reward'), false);
  assert.equal(isRealEarningReversalType('chargeback'), true);
  assert.deepEqual(REAL_EARNING_REVERSAL_TYPES, ['chargeback']);
});

test('shared earning match helpers include direct rewards and exclude pending or rejected states', () => {
  assert.deepEqual(getCompletedRealOfferEarningMatch({ userId: 'user-1' }), {
    userId: 'user-1',
    transactionType: { $in: REAL_OFFER_EARNING_TYPES },
    amount: { $gt: 0 },
    status: 'completed',
  });
  assert.deepEqual(getActiveRealOfferEarningMatch({ createdAt: { $gte: new Date(0) } }).status, {
    $in: ACTIVE_EARNING_STATUSES,
  });
  assert.equal(ACTIVE_EARNING_STATUSES.includes('pending'), false);
  assert.equal(ACTIVE_EARNING_STATUSES.includes('rejected'), false);
  assert.equal(ACTIVE_EARNING_STATUSES.includes('reversed'), false);
});

test('earning hold decision matches existing Taskmint hold policy for real rewards', () => {
  assert.deepEqual(getEarningHoldDecision({ earningHoldConfig: { enabled: false } }, 500), {
    status: 'completed',
    holdUntil: null,
    walletCredit: 500,
    holdDays: 0,
  });

  const now = new Date('2026-08-20T00:00:00.000Z');
  const held = getEarningHoldDecision({
    earningHoldConfig: { enabled: true, threshold: 100, holdDays: 3 },
  }, 500, now);
  assert.equal(held.status, 'hold');
  assert.equal(held.walletCredit, 0);
  assert.equal(held.holdDays, 3);
  assert.equal(held.holdUntil.toISOString(), '2026-08-23T00:00:00.000Z');
});

test('core routes consume the shared earning classification instead of two-type arrays', () => {
  for (const relativePath of [
    'backend/routes/leaderboard.js',
    'backend/routes/wallet.js',
    'backend/routes/public.js',
    'backend/routes/admin.js',
    'backend/utils/earningHoldJob.js',
  ]) {
    const source = read(relativePath);
    assert.match(source, /REAL_OFFER_EARNING_TYPES|getCompletedRealOfferEarningMatch/);
    assert.doesNotMatch(source, /\['offer_reward', 'custom_offer_reward'\]/);
  }
});

test('daily bonus transaction hook uses the shared real earning predicate', () => {
  const source = read('backend/models/Transaction.js');
  assert.match(source, /isRealOfferEarningType\(doc\.transactionType\)/);
  assert.doesNotMatch(source, /\['offer_reward', 'custom_offer_reward', 'direct_offer_reward'\]/);

  const validReward = new Transaction({
    userId: '000000000000000000000001',
    transactionType: 'direct_offer_reward',
    amount: 100,
    balanceAfter: 100,
    description: 'Direct offer reward',
    status: 'completed',
  });
  assert.equal(validReward.validateSync(), undefined);

  const validReversal = new Transaction({
    userId: '000000000000000000000001',
    transactionType: 'chargeback',
    amount: -100,
    balanceAfter: 0,
    description: 'Offer reward reversed',
    status: 'completed',
  });
  assert.equal(validReversal.validateSync(), undefined);
});

test('transaction history and public recent earnings support reward and reversal types without raw postback data', () => {
  const transactionSource = read('backend/models/Transaction.js');
  for (const type of ['direct_offer_reward', 'offer_reward', 'custom_offer_reward', 'chargeback', 'referral_reward']) {
    assert.match(transactionSource, new RegExp(`'${type}'`));
  }

  const publicSource = read('backend/routes/public.js');
  assert.match(publicSource, /REAL_OFFER_EARNING_TYPES/);
  assert.match(publicSource, /metadata = \{ offerwall: scrubbed\.metadata\.offerwall \}/);
  assert.doesNotMatch(publicSource, /postbackSecret|secretValue|authorization/i);
});

test('featured placement remains presentation-only and click tracking is shared', () => {
  const directOffersSource = read('backend/routes/directOffers.js');
  assert.match(directOffersSource, /'displayPlacements\.featured': \{ \$ne: false \}/);
  assert.match(directOffersSource, /createDirectOfferClick/);
  assert.match(directOffersSource, /placement: 'featured'/);
  assert.doesNotMatch(directOffersSource, /brandedOfferwall.*processReward/s);
});

test('leaderboard contribution is zero after reward reversal marks original reward reversed', () => {
  const txs = [
    { transactionType: 'direct_offer_reward', amount: 500, status: 'reversed' },
    { transactionType: 'chargeback', amount: -500, status: 'completed' },
  ];
  const contribution = txs
    .filter((tx) =>
      REAL_OFFER_EARNING_TYPES.includes(tx.transactionType) &&
      tx.amount > 0 &&
      ACTIVE_EARNING_STATUSES.includes(tx.status)
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
  assert.equal(contribution, 0);
});

test('earning hold release credits wallet once and marks walletApplied for later reversal', async () => {
  const now = new Date('2026-08-20T00:00:00.000Z');
  const user = makeDoc({
    _id: 'user-1',
    walletBalance: 100,
    releasedEarningHoldTransactionIds: [],
  });
  const tx = makeDoc({
    _id: 'tx-1',
    userId: 'user-1',
    transactionType: 'direct_offer_reward',
    amount: 500,
    status: 'hold',
    holdUntil: now,
    balanceAfter: 100,
    metadata: { walletApplied: false },
    description: 'Direct offer reward',
  });
  const state = { users: [user], transactions: [tx] };
  const hooks = { notify: async () => {} };

  const first = await releaseEarningHoldTransaction({
    tx,
    now,
    models: makeHoldReleaseModels(state),
    hooks,
  });
  const second = await releaseEarningHoldTransaction({
    tx,
    now,
    models: makeHoldReleaseModels(state),
    hooks,
  });

  assert.equal(first.released, true);
  assert.equal(second.released, false);
  assert.equal(user.walletBalance, 600);
  assert.equal(tx.status, 'completed');
  assert.equal(tx.balanceAfter, 600);
  assert.equal(tx.metadata.walletApplied, true);
  assert.equal(tx.metadata.releaseState, 'completed');
  assert.deepEqual(user.releasedEarningHoldTransactionIds, ['tx-1']);
});

test('reversed held reward is not eligible for later hold release', async () => {
  const now = new Date('2026-08-20T00:00:00.000Z');
  const user = makeDoc({
    _id: 'user-1',
    walletBalance: 100,
    releasedEarningHoldTransactionIds: [],
  });
  const tx = makeDoc({
    _id: 'tx-1',
    userId: 'user-1',
    transactionType: 'direct_offer_reward',
    amount: 500,
    status: 'reversed',
    holdUntil: now,
    metadata: { walletApplied: false, reversalApplied: true },
  });
  const state = { users: [user], transactions: [tx] };
  const result = await releaseEarningHoldTransaction({
    tx,
    now,
    models: makeHoldReleaseModels(state),
    hooks: { notify: async () => {} },
  });

  assert.equal(result.released, false);
  assert.equal(user.walletBalance, 100);
  assert.equal(tx.status, 'reversed');
});

test('concurrent hold release attempts are reconcilable and credit once', async () => {
  const now = new Date('2026-08-20T00:00:00.000Z');
  const user = makeDoc({
    _id: 'user-1',
    walletBalance: 100,
    releasedEarningHoldTransactionIds: [],
  });
  const tx = makeDoc({
    _id: 'tx-1',
    userId: 'user-1',
    transactionType: 'direct_offer_reward',
    amount: 500,
    status: 'hold',
    holdUntil: now,
    balanceAfter: 100,
    metadata: { walletApplied: false },
    description: 'Direct offer reward',
  });
  const state = { users: [user], transactions: [tx] };
  const models = makeHoldReleaseModels(state);

  const results = await Promise.all(Array.from({ length: 10 }, () =>
    releaseEarningHoldTransaction({
      tx,
      now,
      models,
      hooks: { notify: async () => {} },
    })
  ));

  assert.equal(results.filter((result) => result.released).length, 1);
  assert.equal(user.walletBalance, 600);
  assert.equal(tx.status, 'completed');
  assert.equal(tx.metadata.walletApplied, true);
});

test('hold release notification failure does not undo financial release or allow duplicate credit', async () => {
  const now = new Date('2026-08-20T00:00:00.000Z');
  const user = makeDoc({
    _id: 'user-1',
    walletBalance: 100,
    releasedEarningHoldTransactionIds: [],
  });
  const tx = makeDoc({
    _id: 'tx-1',
    userId: 'user-1',
    transactionType: 'direct_offer_reward',
    amount: 500,
    status: 'hold',
    holdUntil: now,
    balanceAfter: 100,
    metadata: { walletApplied: false },
    description: 'Direct offer reward',
  });
  const state = { users: [user], transactions: [tx] };
  const models = makeHoldReleaseModels(state);

  const first = await releaseEarningHoldTransaction({
    tx,
    now,
    models,
    hooks: { notify: async () => { throw new Error('notify down'); } },
  });
  const retry = await releaseEarningHoldTransaction({
    tx,
    now,
    models,
    hooks: { notify: async () => {} },
  });

  assert.equal(first.released, true);
  assert.match(first.notificationError.message, /notify down/);
  assert.equal(retry.released, false);
  assert.equal(user.walletBalance, 600);
  assert.equal(tx.status, 'completed');
  assert.equal(tx.metadata.walletApplied, true);
});
