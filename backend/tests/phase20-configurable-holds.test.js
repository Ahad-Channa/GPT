const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const {
  getEarningHoldDecision,
  resolveEarningHoldConfig,
} = require('../utils/earningTypes');
const { processReward, rewardExternalId } = require('../services/rewards/rewardService');
const { processReversal, reversalExternalId } = require('../services/rewards/reversalService');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const DAY_MS = 24 * 60 * 60 * 1000;

const clonePlain = (value) => JSON.parse(JSON.stringify(value));

const makeDoc = (payload) => ({
  _id: payload._id || new mongoose.Types.ObjectId(),
  ...payload,
  async save() {
    return this;
  },
});

const q = (value) => ({
  session() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(value).then(resolve, reject);
  },
});

const matches = (doc, query = {}) => Object.entries(query).every(([key, expected]) => {
  const actual = key.split('.').reduce((target, part) => target?.[part], doc);
  if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof mongoose.Types.ObjectId)) {
    if (expected.$in) return expected.$in.includes(actual);
    if (Object.prototype.hasOwnProperty.call(expected, '$ne')) {
      if (Array.isArray(actual)) return !actual.some((item) => String(item) === String(expected.$ne));
      return String(actual || '') !== String(expected.$ne || '');
    }
  }
  return String(actual || '') === String(expected || '');
});

const applyUpdate = (doc, update = {}) => {
  if (!doc) return doc;
  if (update.$set) Object.assign(doc, update.$set);
  if (update.$inc) {
    for (const [key, value] of Object.entries(update.$inc)) {
      doc[key] = (doc[key] || 0) + value;
    }
  }
  if (update.$addToSet) {
    for (const [key, value] of Object.entries(update.$addToSet)) {
      doc[key] = doc[key] || [];
      if (!doc[key].some((item) => String(item) === String(value))) doc[key].push(value);
    }
  }
  return doc;
};

const makeState = ({ globalHold = { enabled: false }, offerHold = null, goalKey = null } = {}) => {
  const userId = new mongoose.Types.ObjectId();
  const offerId = new mongoose.Types.ObjectId();
  const clickId = new mongoose.Types.ObjectId();
  const conversionId = new mongoose.Types.ObjectId();
  const baseReward = 777;
  const rewardAmount = goalKey ? 250 : baseReward;

  const user = makeDoc({
    _id: userId,
    firebaseUid: 'phase20-user',
    walletBalance: 100,
    totalEarned: 500,
    isBanned: false,
    referredBy: null,
    referralPercentage: null,
    commissionGenerated: 0,
    appliedFinancialTransactionIds: [],
    releasedEarningHoldTransactionIds: [],
  });

  const click = makeDoc({
    _id: clickId,
    clickId: 'click-phase20',
    userId,
    offerId,
    providerId: 'direct',
    campaignType: 'direct_offer',
    campaignId: offerId,
    rewardAmount: baseReward,
    rewardSnapshot: { amount: baseReward, currency: 'coins', source: 'direct_offer.rewardAmount' },
    goalsSnapshot: goalKey
      ? { [goalKey]: { amount: 250, payoutAmount: 1.5, label: 'Goal' } }
      : null,
    status: 'clicked',
  });

  const conversion = makeDoc({
    _id: conversionId,
    providerId: 'direct',
    providerTransactionId: 'phase20-provider-txn',
    clickId: click.clickId,
    clickLogId: click._id,
    userId,
    campaignType: 'direct_offer',
    campaignId: offerId,
    offerId,
    goalKey: goalKey || null,
    internalStatus: 'approved',
    processingState: 'claimed',
    rewardTransactionId: null,
    reversalTransactionId: null,
    payout: { amount: 999, currency: 'USD' },
    rewardAmount,
  });

  const directOffer = offerHold
    ? makeDoc({ _id: offerId, ...offerHold })
    : null;

  return {
    users: [user],
    clicks: [click],
    conversions: [conversion],
    transactions: [],
    settings: {
      referralConfig: { holdDays: 0, globalPercentage: 5, signupBonusCoins: 0 },
      earningHoldConfig: globalHold,
    },
    directOffer,
    offerStats: { totalApproved: 0 },
    user,
    click,
    conversion,
  };
};

const makeModels = (state) => ({
  Conversion: {
    findById(id) {
      return q(state.conversions.find((item) => String(item._id) === String(id)) || null);
    },
    async findOneAndUpdate(query, update) {
      const doc = state.conversions.find((item) => matches(item, query));
      return applyUpdate(doc, update) || null;
    },
    async findByIdAndUpdate(id, update) {
      const doc = state.conversions.find((item) => String(item._id) === String(id));
      return applyUpdate(doc, update) || null;
    },
  },
  ClickLog: {
    findById(id) {
      return q(state.clicks.find((item) => String(item._id) === String(id)) || null);
    },
    async findByIdAndUpdate(id, update) {
      const doc = state.clicks.find((item) => String(item._id) === String(id));
      return applyUpdate(doc, update) || null;
    },
  },
  DirectOffer: {
    findById(id) {
      return q(
        state.directOffer && String(state.directOffer._id) === String(id)
          ? state.directOffer
          : null
      );
    },
    async findByIdAndUpdate(_id, update) {
      state.offerStats.totalApproved += update?.$inc?.totalApproved || 0;
      return {};
    },
  },
  Settings: {
    getSingleton() {
      return q(state.settings);
    },
  },
  Transaction: {
    findOne(query) {
      return q(state.transactions.find((item) => matches(item, query)) || null);
    },
    findById(id) {
      return q(state.transactions.find((item) => String(item._id) === String(id)) || null);
    },
    async create(payloadOrArray) {
      const payload = Array.isArray(payloadOrArray) ? payloadOrArray[0] : payloadOrArray;
      if (state.transactions.some((item) => item.externalId && item.externalId === payload.externalId)) {
        const error = new Error('duplicate key');
        error.code = 11000;
        throw error;
      }
      const tx = makeDoc(payload);
      state.transactions.push(tx);
      return Array.isArray(payloadOrArray) ? [tx] : tx;
    },
  },
  User: {
    findById(id) {
      return q(state.users.find((item) => String(item._id) === String(id)) || null);
    },
    async findOneAndUpdate(query, update) {
      const doc = state.users.find((item) => matches(item, query));
      return applyUpdate(doc, update) || null;
    },
    async updateOne(query, update) {
      const doc = state.users.find((item) => String(item._id) === String(query._id));
      applyUpdate(doc, update);
      return { modifiedCount: doc ? 1 : 0 };
    },
  },
});

const transactionRunner = (state) => async (operation) => {
  const snapshot = {
    users: clonePlain(state.users),
    clicks: clonePlain(state.clicks),
    conversions: clonePlain(state.conversions),
    transactions: clonePlain(state.transactions),
    offerStats: clonePlain(state.offerStats),
  };
  try {
    return await operation({ session: {}, strategy: 'transaction' });
  } catch (error) {
    state.users.length = 0;
    state.users.push(...snapshot.users.map(makeDoc));
    state.clicks.length = 0;
    state.clicks.push(...snapshot.clicks.map(makeDoc));
    state.conversions.length = 0;
    state.conversions.push(...snapshot.conversions.map(makeDoc));
    state.transactions.length = 0;
    state.transactions.push(...snapshot.transactions.map(makeDoc));
    state.offerStats.totalApproved = snapshot.offerStats.totalApproved;
    state.user = state.users[0];
    state.click = state.clicks[0];
    state.conversion = state.conversions[0];
    throw error;
  }
};

const noSideEffects = {
  notify: async () => {},
  emitWalletUpdate: () => {},
  processVipLevelUp: async () => {},
};

const runReward = (state) => processReward({
  conversion: state.conversion,
  models: makeModels(state),
  hooks: noSideEffects,
  runInTransaction: transactionRunner(state),
});

const getRewardTx = (state) =>
  state.transactions.find((tx) => tx.externalId === rewardExternalId(state.conversion._id));

const daysUntil = (date) => (new Date(date).getTime() - Date.now()) / DAY_MS;

// ─── Pure resolver / decision tests ──────────────────────────────────────────

test('resolveEarningHoldConfig prioritizes Direct Offer over provider over global', () => {
  const globalConfig = { enabled: true, threshold: 100, holdDays: 3 };
  const providerConfig = { holdEnabled: true, holdThreshold: 0, holdDays: 7 };
  const directOfferConfig = { holdEnabled: true, holdThreshold: 0, holdDays: 10 };

  assert.deepEqual(resolveEarningHoldConfig({ globalConfig }), {
    enabled: true,
    threshold: 100,
    holdDays: 3,
  });
  assert.deepEqual(resolveEarningHoldConfig({ globalConfig, providerConfig }), {
    enabled: true,
    threshold: 0,
    holdDays: 7,
  });
  assert.deepEqual(resolveEarningHoldConfig({ globalConfig, providerConfig, directOfferConfig }), {
    enabled: true,
    threshold: 0,
    holdDays: 10,
  });
});

test('provider-specific hold periods resolve to 7 and 14 days', () => {
  const now = new Date('2026-08-20T00:00:00.000Z');
  const settings = { earningHoldConfig: { enabled: true, threshold: 1, holdDays: 3 } };

  const seven = getEarningHoldDecision(settings, 500, now, {
    providerConfig: { holdEnabled: true, holdThreshold: 0, holdDays: 7 },
  });
  const fourteen = getEarningHoldDecision(settings, 500, now, {
    providerConfig: { holdEnabled: true, holdThreshold: 0, holdDays: 14 },
  });

  assert.equal(seven.status, 'hold');
  assert.equal(seven.holdDays, 7);
  assert.equal(seven.walletCredit, 0);
  assert.equal(seven.holdUntil.toISOString(), '2026-08-27T00:00:00.000Z');
  assert.equal(fourteen.status, 'hold');
  assert.equal(fourteen.holdDays, 14);
  assert.equal(fourteen.holdUntil.toISOString(), '2026-09-03T00:00:00.000Z');
});

test('provider without custom hold falls back to global; disabled custom also falls back', () => {
  const now = new Date('2026-08-20T00:00:00.000Z');
  const settings = { earningHoldConfig: { enabled: true, threshold: 1, holdDays: 3 } };

  const noCustom = getEarningHoldDecision(settings, 500, now, {
    providerConfig: { holdEnabled: false, holdDays: 9, holdThreshold: 0 },
  });
  const disabledCustom = getEarningHoldDecision(settings, 500, now, {
    providerConfig: { holdEnabled: false, holdDays: 0, holdThreshold: 0 },
  });

  assert.equal(noCustom.holdDays, 3);
  assert.equal(disabledCustom.holdDays, 3);
  assert.equal(disabledCustom.status, 'hold');
});

test('holdEnabled true with zero hold days is an instant completed reward', () => {
  const now = new Date('2026-08-20T00:00:00.000Z');
  const settings = { earningHoldConfig: { enabled: true, threshold: 1, holdDays: 30 } };

  for (const config of [
    { holdEnabled: true, holdDays: 0, holdThreshold: 0 },
  ]) {
    assert.deepEqual(getEarningHoldDecision(settings, 500, now, { providerConfig: config }), {
      status: 'completed',
      holdUntil: null,
      walletCredit: 500,
      holdDays: 0,
    });
    assert.deepEqual(getEarningHoldDecision(settings, 500, now, { directOfferConfig: config }), {
      status: 'completed',
      holdUntil: null,
      walletCredit: 500,
      holdDays: 0,
    });
  }
});

// ─── Direct Offer reward integration ─────────────────────────────────────────

test('Direct Offer custom 10-day hold holds reward and does not credit wallet', async () => {
  const state = makeState({
    globalHold: { enabled: true, threshold: 1, holdDays: 3 },
    offerHold: { holdEnabled: true, holdThreshold: 0, holdDays: 10 },
  });

  const result = await runReward(state);
  assert.equal(result.ok, true);

  const rewardTx = getRewardTx(state);
  assert.equal(rewardTx.status, 'hold');
  assert.equal(rewardTx.metadata.holdApplied, true);
  assert.equal(rewardTx.metadata.holdDays, 10);
  assert.equal(rewardTx.metadata.walletApplied, false);
  assert.ok(rewardTx.holdUntil instanceof Date);
  assert.ok(Math.abs(daysUntil(rewardTx.holdUntil) - 10) < 0.01);
  assert.equal(state.user.walletBalance, 100);
  assert.equal(state.user.totalEarned, 1277);
});

test('Direct Offer without custom config falls back to global hold', async () => {
  const state = makeState({
    globalHold: { enabled: true, threshold: 1, holdDays: 3 },
  });

  await runReward(state);
  const rewardTx = getRewardTx(state);

  assert.equal(rewardTx.status, 'hold');
  assert.equal(rewardTx.metadata.holdDays, 3);
  assert.ok(Math.abs(daysUntil(rewardTx.holdUntil) - 3) < 0.01);
  assert.equal(state.user.walletBalance, 100);
});

test('Direct Offer custom hold disabled falls back to global hold', async () => {
  const state = makeState({
    globalHold: { enabled: true, threshold: 1, holdDays: 5 },
    offerHold: { holdEnabled: false, holdThreshold: 0, holdDays: 10 },
  });

  await runReward(state);
  const rewardTx = getRewardTx(state);

  assert.equal(rewardTx.status, 'hold');
  assert.equal(rewardTx.metadata.holdDays, 5);
});

test('multi-step goal reward uses the Direct Offer hold policy', async () => {
  const state = makeState({
    goalKey: 'deposit',
    globalHold: { enabled: true, threshold: 1, holdDays: 3 },
    offerHold: { holdEnabled: true, holdThreshold: 0, holdDays: 10 },
  });

  await runReward(state);
  const rewardTx = getRewardTx(state);

  assert.equal(rewardTx.amount, 250);
  assert.equal(rewardTx.status, 'hold');
  assert.equal(rewardTx.metadata.goalKey, 'deposit');
  assert.equal(rewardTx.metadata.holdDays, 10);
  assert.ok(Math.abs(daysUntil(rewardTx.holdUntil) - 10) < 0.01);
  assert.equal(state.user.walletBalance, 100);
});

test('Direct Offer zero-day custom hold credits the wallet immediately', async () => {
  const state = makeState({
    globalHold: { enabled: true, threshold: 1, holdDays: 30 },
    offerHold: { holdEnabled: true, holdThreshold: 0, holdDays: 0 },
  });

  await runReward(state);
  const rewardTx = getRewardTx(state);

  assert.equal(rewardTx.status, 'completed');
  assert.equal(rewardTx.holdUntil, null);
  assert.equal(rewardTx.metadata.holdApplied, false);
  assert.equal(rewardTx.metadata.walletApplied, true);
  assert.equal(state.user.walletBalance, 877);
  assert.equal(state.user.totalEarned, 1277);
});

test('global hold disabled still produces an instant reward when offer has no custom hold', async () => {
  const state = makeState({ globalHold: { enabled: false } });

  await runReward(state);
  const rewardTx = getRewardTx(state);

  assert.equal(rewardTx.status, 'completed');
  assert.equal(rewardTx.holdUntil, null);
  assert.equal(state.user.walletBalance, 877);
});

test('chargeback of a held reward reverses the ledger without deducting the wallet', async () => {
  const state = makeState({
    globalHold: { enabled: true, threshold: 1, holdDays: 3 },
    offerHold: { holdEnabled: true, holdThreshold: 0, holdDays: 10 },
  });

  await runReward(state);
  const rewardTx = getRewardTx(state);
  assert.equal(rewardTx.status, 'hold');

  state.conversion.internalStatus = 'reversed';
  await processReversal({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: { notify: async () => {}, emitWalletUpdate: () => {} },
    runInTransaction: transactionRunner(state),
  });

  const reversalTx = state.transactions.find(
    (tx) => tx.externalId === reversalExternalId(state.conversion._id)
  );
  assert.equal(reversalTx.amount, -777);
  assert.equal(reversalTx.metadata.walletApplied, false);
  assert.equal(rewardTx.status, 'reversed');
  assert.equal(state.user.walletBalance, 100);
  assert.equal(state.user.totalEarned, 500);
});

test('duplicate approval of a held reward cannot credit twice', async () => {
  const state = makeState({
    offerHold: { holdEnabled: true, holdThreshold: 0, holdDays: 10 },
  });
  const models = makeModels(state);

  await processReward({
    conversion: state.conversion,
    models,
    hooks: noSideEffects,
    runInTransaction: transactionRunner(state),
  });
  const duplicate = await processReward({
    conversion: state.conversion,
    models,
    hooks: noSideEffects,
    runInTransaction: transactionRunner(state),
  });

  assert.equal(duplicate.duplicate, true);
  assert.equal(state.transactions.filter((tx) => tx.externalId === rewardExternalId(state.conversion._id)).length, 1);
  assert.equal(state.user.walletBalance, 100);
  assert.equal(state.user.totalEarned, 1277);
});

// ─── Route integration guards ────────────────────────────────────────────────

test('offerwall route resolves holds through the shared helper with provider config', () => {
  const source = read('backend/routes/offerwalls.js');
  assert.match(source, /getEarningHoldDecision\(settings,\s*platformCoins[\s\S]*?providerConfig:\s*provider/);
  assert.doesNotMatch(source, /settings\.earningHoldConfig\?\.enabled/);
});

test('reward service resolves Direct Offer holds from the offer record', () => {
  const source = read('backend/services/rewards/rewardService.js');
  assert.match(source, /directOfferModel\.findById\(directOfferId\)/);
  assert.match(source, /directOfferConfig:\s*directOffer/);
});
