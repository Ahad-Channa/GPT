const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const { processReward } = require('../services/rewards/rewardService');
const { findCreditedConversionForClickLog } = require('../services/tracking/conversionService');

const makeDoc = (payload) => ({
  _id: payload._id || new mongoose.Types.ObjectId(),
  ...payload,
  async save() { return this; },
});

const q = (value) => ({
  session() { return this; },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
});

const matches = (doc, query = {}) => Object.entries(query).every(([key, expected]) => {
  const actual = key.split('.').reduce((target, part) => target?.[part], doc);
  if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof mongoose.Types.ObjectId)) {
    if (expected.$in) return expected.$in.includes(actual);
    if (expected.$gt !== undefined) return Number(actual) > Number(expected.$gt);
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
  if (update.$inc) for (const [key, value] of Object.entries(update.$inc)) doc[key] = (doc[key] || 0) + value;
  if (update.$addToSet) for (const [key, value] of Object.entries(update.$addToSet)) {
    doc[key] = doc[key] || [];
    if (!doc[key].some((item) => String(item) === String(value))) doc[key].push(value);
  }
  return doc;
};

const makeModels = (state, extra = {}) => ({
  Conversion: {
    findById(id) { return q(state.conversions.find((item) => String(item._id) === String(id)) || null); },
    findOne(query) { return q(state.conversions.find((item) => matches(item, query)) || null); },
    async findOneAndUpdate(query, update) { return applyUpdate(state.conversions.find((item) => matches(item, query)), update) || null; },
    async findByIdAndUpdate(id, update) { return applyUpdate(state.conversions.find((item) => String(item._id) === String(id)), update) || null; },
  },
  ClickLog: {
    findById(id) { return q(state.clicks.find((item) => String(item._id) === String(id)) || null); },
    async findByIdAndUpdate(id, update) { return applyUpdate(state.clicks.find((item) => String(item._id) === String(id)), update) || null; },
  },
  DirectOffer: {
    async findByIdAndUpdate(_id, update) { state.offerStats.totalApproved += update?.$inc?.totalApproved || 0; return {}; },
  },
  Settings: { getSingleton() { return q(state.settings); } },
  Transaction: {
    findOne(query) { return q(state.transactions.find((item) => matches(item, query)) || null); },
    findById(id) { return q(state.transactions.find((item) => String(item._id) === String(id)) || null); },
    async create(payloadOrArray) {
      const payload = Array.isArray(payloadOrArray) ? payloadOrArray[0] : payloadOrArray;
      const tx = makeDoc(payload);
      state.transactions.push(tx);
      return Array.isArray(payloadOrArray) ? [tx] : tx;
    },
  },
  User: {
    findById(id) { return q(state.users.find((item) => String(item._id) === String(id)) || null); },
    async findOneAndUpdate(query, update) { return applyUpdate(state.users.find((item) => matches(item, query)), update) || null; },
  },
  ...extra,
});

const noSideEffects = { notify: async () => {}, emitWalletUpdate: () => {}, processVipLevelUp: async () => {} };

const makeBaseState = () => {
  const userId = new mongoose.Types.ObjectId();
  const offerId = new mongoose.Types.ObjectId();
  const user = makeDoc({ _id: userId, firebaseUid: 'phase11-user', walletBalance: 100, totalEarned: 0, isBanned: false, referredBy: null, appliedFinancialTransactionIds: [] });
  const click = makeDoc({
    _id: new mongoose.Types.ObjectId(),
    clickId: 'click-phase11',
    userId,
    offerId,
    providerId: 'direct',
    campaignType: 'direct_offer',
    campaignId: offerId,
    rewardAmount: 500,
    rewardSnapshot: { amount: 500, currency: 'coins' },
    goalsSnapshot: null,
    status: 'clicked',
  });
  const conversion = makeDoc({
    _id: new mongoose.Types.ObjectId(),
    providerId: 'direct',
    providerTransactionId: 'prov-second',
    clickId: click.clickId,
    clickLogId: click._id,
    userId,
    campaignType: 'direct_offer',
    campaignId: offerId,
    offerId,
    goalKey: null,
    internalStatus: 'approved',
    processingState: 'claimed',
    rewardTransactionId: null,
    reversalTransactionId: null,
    payout: { amount: 0, currency: 'USD' },
    rewardAmount: 500,
  });
  return {
    userId, offerId, user, click, conversion,
    users: [user], clicks: [click], conversions: [conversion], transactions: [],
    settings: { referralConfig: { holdDays: 0, globalPercentage: 5, signupBonusCoins: 0 } },
    offerStats: { totalApproved: 0 },
  };
};

test('credited Conversion found by clickLogId blocks a second credit even without clickLog.transactionId', async () => {
  const state = makeBaseState();
  state.click.transactionId = null;
  const creditedTx = makeDoc({
    _id: new mongoose.Types.ObjectId(),
    userId: state.userId,
    transactionType: 'direct_offer_reward',
    amount: 500,
    status: 'completed',
    externalId: 'conversion:already:reward',
    metadata: { clickId: state.click.clickId },
  });
  state.transactions.push(creditedTx);
  const priorConversion = makeDoc({
    _id: new mongoose.Types.ObjectId(),
    providerId: 'direct',
    providerTransactionId: 'prov-first',
    clickId: state.click.clickId,
    clickLogId: state.click._id,
    userId: state.userId,
    internalStatus: 'approved',
    processingState: 'processed',
    rewardTransactionId: creditedTx._id,
    goalKey: null,
  });
  state.conversions.push(priorConversion);

  const result = await processReward({ conversion: state.conversion, models: makeModels(state), hooks: noSideEffects });

  assert.equal(result.ok, true);
  assert.equal(result.duplicate, true);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.user.walletBalance, 100);
  assert.equal(state.conversion.processingState, 'processed');
  assert.equal(String(state.conversion.rewardTransactionId), String(creditedTx._id));
});

test('existing reward ledger transaction for the click blocks a second credit when transactionId is missing', async () => {
  const state = makeBaseState();
  state.click.transactionId = null;
  state.transactions.push(makeDoc({
    _id: new mongoose.Types.ObjectId(),
    userId: state.userId,
    transactionType: 'direct_offer_reward',
    amount: 500,
    status: 'completed',
    externalId: 'legacy-unlinked',
    metadata: { clickId: state.click.clickId },
  }));

  const result = await processReward({ conversion: state.conversion, models: makeModels(state), hooks: noSideEffects });

  assert.equal(result.ok, true);
  assert.equal(result.duplicate, true);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.user.walletBalance, 100);
  assert.equal(state.conversion.processingState, 'processed');
});

test('no prior credit still rewards a single-step conversion exactly once', async () => {
  const state = makeBaseState();

  const first = await processReward({ conversion: state.conversion, models: makeModels(state), hooks: noSideEffects });
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, false);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.user.walletBalance, 600);

  const second = await processReward({ conversion: state.conversion, models: makeModels(state), hooks: noSideEffects });
  assert.equal(second.duplicate, true);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.user.walletBalance, 600);
});

test('findCreditedConversionForClickLog excludes the conversion under test and is defensive about models', async () => {
  const conversionModel = {
    findOne(query) {
      assert.equal(query.internalStatus, 'approved');
      assert.equal(query.processingState, 'processed');
      assert.equal(String(query._id.$ne), 'self-id');
      return q({ _id: 'credited-id' });
    },
  };
  const found = await findCreditedConversionForClickLog({ clickLogId: 'click-1', excludeConversionId: 'self-id', conversionModel });
  assert.equal(found._id, 'credited-id');

  assert.equal(await findCreditedConversionForClickLog({ clickLogId: 'click-1', conversionModel: { findById() {} } }), null);
  assert.equal(await findCreditedConversionForClickLog({ clickLogId: '', conversionModel }), null);
});
