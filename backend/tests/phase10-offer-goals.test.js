const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const DirectOffer = require('../models/DirectOffer');
const ClickLog = require('../models/ClickLog');
const Conversion = require('../models/Conversion');
const {
  buildGoalsSnapshot,
  normalizeGoals,
  resolveGoal,
} = require('../utils/offerGoals');
const { processReward, rewardExternalId } = require('../services/rewards/rewardService');
const { createOrResolveConversion } = require('../services/tracking/conversionService');

// ─── Part A: pure goal helpers ────────────────────────────────────────────────

test('normalizeGoals rejects malformed goals and de-duplicates case-insensitively', () => {
  const goals = normalizeGoals([
    { goalKey: 'deposit', rewardAmount: 100, label: 'Deposit' },
    { goalKey: 'DEPOSIT', rewardAmount: 999 },
    { goalKey: '1invalid', rewardAmount: 50 },
    { goalKey: 'registration', rewardAmount: 'not-a-number' },
    { goalKey: 'level5', rewardAmount: 250, payoutAmount: 1.5, enabled: false },
    'nope',
  ]);

  assert.equal(goals.length, 2);
  assert.equal(goals[0].goalKey, 'deposit');
  assert.equal(goals[0].rewardAmount, 100);
  assert.equal(goals[1].goalKey, 'level5');
  assert.equal(goals[1].enabled, false);
});

test('resolveGoal preserves single-step behavior when no goals snapshot exists', () => {
  const resolution = resolveGoal({ goalsSnapshot: null, eventType: 'anything' });
  assert.equal(resolution.hasGoals, false);
  assert.equal(resolution.matched, true);
  assert.equal(resolution.goalKey, null);
});

test('resolveGoal ignores disabled goals and rejects unknown goals', () => {
  const snapshot = buildGoalsSnapshot([
    { goalKey: 'deposit', rewardAmount: 100, enabled: true },
    { goalKey: 'disabled_goal', rewardAmount: 500, enabled: false },
  ]);

  assert.deepEqual(Object.keys(snapshot), ['deposit']);

  const unknown = resolveGoal({ goalsSnapshot: snapshot, eventType: 'disabled_goal' });
  assert.equal(unknown.hasGoals, true);
  assert.equal(unknown.matched, false);

  const matched = resolveGoal({ goalsSnapshot: snapshot, eventType: 'deposit' });
  assert.equal(matched.matched, true);
  assert.equal(matched.amount, 100);
});

// ─── Part B: schema ───────────────────────────────────────────────────────────

test('DirectOffer accepts optional goals and still validates without them', () => {
  const withoutGoals = new DirectOffer({
    title: 'Single step',
    description: 'desc',
    rewardAmount: 100,
    advertiserUrl: 'https://example.com',
  });
  assert.equal(withoutGoals.validateSync(), undefined);
  assert.deepEqual(withoutGoals.goals, []);

  const withGoals = new DirectOffer({
    title: 'Multi step',
    description: 'desc',
    rewardAmount: 100,
    advertiserUrl: 'https://example.com',
    goals: [{ goalKey: 'deposit', label: 'Deposit', rewardAmount: 250 }],
  });
  assert.equal(withGoals.validateSync(), undefined);
  assert.equal(withGoals.goals[0].goalKey, 'deposit');
});

test('ClickLog stores a null goalsSnapshot for single-step offers and Conversion exposes goalKey', () => {
  const click = new ClickLog({
    clickId: 'goal-schema-click',
    offerId: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    rewardAmount: 100,
  });
  assert.equal(click.validateSync(), undefined);
  assert.equal(click.goalsSnapshot, null);

  const conversion = new Conversion({
    providerId: 'direct',
    providerTransactionId: 'tx-1',
    goalKey: 'deposit',
  });
  assert.equal(conversion.validateSync(), undefined);
  assert.equal(conversion.goalKey, 'deposit');
  assert.ok(
    Conversion.schema.indexes().some(([fields]) =>
      JSON.stringify(fields) === JSON.stringify({ providerId: 1, providerTransactionId: 1, goalKey: 1 })
    )
  );
});

// ─── Part C: conversion identity is goal-aware ────────────────────────────────

const makeDoc = (payload) => ({
  _id: payload._id || new mongoose.Types.ObjectId(),
  ...payload,
  async save() { return this; },
});

const applyUpdate = (doc, update = {}) => {
  if (!doc) return doc;
  if (update.$set) Object.assign(doc, update.$set);
  return doc;
};

const makeConversionModel = (state) => ({
  async create(payload) {
    const duplicate = state.conversions.some((c) =>
      c.providerId === payload.providerId &&
      c.providerTransactionId === payload.providerTransactionId &&
      (c.goalKey || null) === (payload.goalKey || null));
    if (duplicate) {
      const error = new Error('duplicate key');
      error.code = 11000;
      throw error;
    }
    const doc = makeDoc(payload);
    state.conversions.push(doc);
    return doc;
  },
  async findOne(query) {
    return state.conversions.find((c) =>
      c.providerId === query.providerId &&
      c.providerTransactionId === query.providerTransactionId &&
      (c.goalKey || null) === (query.goalKey || null)) || null;
  },
  async findOneAndUpdate(query, update) {
    const doc = state.conversions.find((c) =>
      String(c._id) === String(query._id) &&
      c.providerId === query.providerId &&
      c.providerTransactionId === query.providerTransactionId &&
      (c.goalKey || null) === (query.goalKey || null) &&
      c.internalStatus === query.internalStatus);
    return applyUpdate(doc, update) || null;
  },
});

const baseConversionArgs = (goalKey) => {
  const offerId = new mongoose.Types.ObjectId();
  const clickLog = {
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    campaignType: 'direct_offer',
    campaignId: offerId,
    offerId,
    rewardAmount: 100,
    goalsSnapshot: {
      deposit: { amount: 250, payoutAmount: 1.5, label: 'Deposit' },
      level5: { amount: 500, payoutAmount: 3, label: 'Reach level 5' },
    },
  };
  return {
    providerConfig: { providerId: 'direct', providerSettings: {} },
    mapped: {
      clickId: clickLog._id.toString(),
      transactionId: 'shared-txn-1',
      status: 'approved',
      eventType: goalKey,
    },
    internalStatus: 'approved',
    clickLog,
    payoutAmount: 1.5,
    security: { method: 'shared_secret', checked: true, passed: true, reason: '' },
    goalKey,
    rewardAmount: 250,
  };
};

test('same provider transaction id can reward different goals as separate conversions', async () => {
  const state = { conversions: [] };

  const deposit = await createOrResolveConversion({
    ...baseConversionArgs('deposit'),
    conversionModel: makeConversionModel(state),
  });
  const level5 = await createOrResolveConversion({
    ...baseConversionArgs('level5'),
    conversionModel: makeConversionModel(state),
  });

  assert.equal(state.conversions.length, 2);
  assert.equal(deposit.conversion.goalKey, 'deposit');
  assert.equal(level5.conversion.goalKey, 'level5');
});

test('duplicate (transaction, goal) resolves to the same conversion instead of creating another', async () => {
  const state = { conversions: [] };
  const model = makeConversionModel(state);

  const first = await createOrResolveConversion({ ...baseConversionArgs('deposit'), conversionModel: model });
  const second = await createOrResolveConversion({ ...baseConversionArgs('deposit'), conversionModel: model });

  assert.equal(state.conversions.length, 1);
  assert.equal(String(first.conversion._id), String(second.conversion._id));
});

// ─── Part D: reward service is goal-aware and idempotent ──────────────────────

const q = (value) => ({
  session() { return this; },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
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

const applyUserUpdate = (doc, update = {}) => {
  if (!doc) return doc;
  if (update.$inc) {
    for (const [key, value] of Object.entries(update.$inc)) doc[key] = (doc[key] || 0) + value;
  }
  if (update.$addToSet) {
    for (const [key, value] of Object.entries(update.$addToSet)) {
      doc[key] = doc[key] || [];
      if (!doc[key].some((item) => String(item) === String(value))) doc[key].push(value);
    }
  }
  return doc;
};

const makeGoalRewardState = () => {
  const referralConfig = { holdDays: 0, globalPercentage: 5, signupBonusCoins: 0 };
  const offerId = new mongoose.Types.ObjectId();
  const clickId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  const user = makeDoc({
    _id: userId,
    firebaseUid: 'goal-user',
    walletBalance: 10,
    totalEarned: 0,
    isBanned: false,
    referredBy: null,
    appliedFinancialTransactionIds: [],
  });
  const click = makeDoc({
    _id: clickId,
    clickId: 'goal-click',
    userId,
    offerId,
    rewardAmount: 100,
    rewardSnapshot: { amount: 100, currency: 'coins', source: 'direct_offer.rewardAmount' },
    goalsSnapshot: { deposit: { amount: 250, payoutAmount: 1.5, label: 'Deposit' } },
    status: 'clicked',
  });
  const conversion = makeDoc({
    _id: new mongoose.Types.ObjectId(),
    providerId: 'direct',
    providerTransactionId: 'goal-txn',
    clickId: click.clickId,
    clickLogId: click._id,
    userId,
    offerId,
    goalKey: 'deposit',
    internalStatus: 'approved',
    processingState: 'claimed',
    rewardTransactionId: null,
    payout: { amount: 1.5, currency: 'USD' },
    rewardAmount: 250,
  });

  const state = { users: [user], clicks: [click], conversions: [conversion], transactions: [], offerStats: { totalApproved: 0 }, settings: { referralConfig } };

  const models = {
    Conversion: {
      findById(id) { return q(state.conversions.find((c) => String(c._id) === String(id)) || null); },
      async findOneAndUpdate(query, update) {
        const doc = state.conversions.find((c) => matches(c, query));
        return applyUpdate(doc, update) || null;
      },
      async findByIdAndUpdate(id, update) {
        const doc = state.conversions.find((c) => String(c._id) === String(id));
        return applyUpdate(doc, update) || null;
      },
    },
    ClickLog: {
      findById(id) { return q(state.clicks.find((c) => String(c._id) === String(id)) || null); },
      async findByIdAndUpdate(id, update) {
        const doc = state.clicks.find((c) => String(c._id) === String(id));
        return applyUpdate(doc, update) || null;
      },
    },
    DirectOffer: { async findByIdAndUpdate() { return {}; } },
    Settings: { getSingleton() { return q(state.settings); } },
    Transaction: {
      findOne(query) { return q(state.transactions.find((t) => matches(t, query)) || null); },
      findById(id) { return q(state.transactions.find((t) => String(t._id) === String(id)) || null); },
      async create(payloadOrArray) {
        const payload = Array.isArray(payloadOrArray) ? payloadOrArray[0] : payloadOrArray;
        if (state.transactions.some((t) => t.externalId === payload.externalId)) {
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
      findById(id) { return q(state.users.find((u) => String(u._id) === String(id)) || null); },
      async findOneAndUpdate(query, update) {
        const doc = state.users.find((u) => matches(u, query));
        return applyUserUpdate(doc, update) || null;
      },
      async updateOne() { return { modifiedCount: 0 }; },
    },
  };

  return { state, models, conversion, user, click };
};

const noSideEffects = { notify: async () => {}, emitWalletUpdate: () => {}, processVipLevelUp: async () => {} };

test('goal conversion rewards the trusted click-time goal amount, not the base reward', async () => {
  const { state, models, conversion, user } = makeGoalRewardState();

  const result = await processReward({ conversion, models, hooks: noSideEffects });
  assert.equal(result.ok, true);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].amount, 250);
  assert.equal(state.transactions[0].metadata.goalKey, 'deposit');
  assert.equal(user.walletBalance, 260);
});

test('goal conversion does not reward twice', async () => {
  const { state, models, conversion, user } = makeGoalRewardState();

  await processReward({ conversion, models, hooks: noSideEffects });
  const duplicate = await processReward({ conversion, models, hooks: noSideEffects });

  assert.equal(duplicate.duplicate, true);
  assert.equal(state.transactions.length, 1);
  assert.equal(user.walletBalance, 260);
  assert.equal(state.transactions[0].externalId, rewardExternalId(conversion._id));
});

test('goal conversion without a trusted snapshot is rejected and not rewarded', async () => {
  const { state, models, conversion, click } = makeGoalRewardState();
  click.goalsSnapshot = null;

  await assert.rejects(
    () => processReward({ conversion, models, hooks: noSideEffects }),
    /Trusted goal snapshot not found/
  );
  assert.equal(state.transactions.length, 0);
});

// ─── Part E: placements share one offer record and one click endpoint ─────────

const directOffersRouter = require('../routes/directOffers');
const { buildPlacementClause, resolveClickPlacement } = directOffersRouter.__testInternals;

test('featured and branded placements query the same DirectOffer collection with different placement filters', () => {
  assert.deepEqual(buildPlacementClause('featured'), { 'displayPlacements.featured': { $ne: false } });
  assert.deepEqual(buildPlacementClause('brandedOfferwall'), { 'displayPlacements.brandedOfferwall': true });
  assert.deepEqual(buildPlacementClause('all'), {
    $or: [
      { 'displayPlacements.featured': { $ne: false } },
      { 'displayPlacements.brandedOfferwall': true },
    ],
  });
});

test('one offer record can be clicked from both placements and rejected from placements it is not in', () => {
  const both = { displayPlacements: { featured: true, brandedOfferwall: true } };
  assert.deepEqual(resolveClickPlacement(both, 'featured'), { placement: 'featured', allowed: true });
  assert.deepEqual(resolveClickPlacement(both, 'brandedOfferwall'), { placement: 'brandedOfferwall', allowed: true });

  const brandedOnly = { displayPlacements: { featured: false, brandedOfferwall: true } };
  assert.deepEqual(resolveClickPlacement(brandedOnly, 'featured'), { placement: 'featured', allowed: false });
  assert.deepEqual(resolveClickPlacement(brandedOnly, 'brandedOfferwall'), { placement: 'brandedOfferwall', allowed: true });

  // Default remains featured for backward compatibility.
  assert.deepEqual(resolveClickPlacement({ displayPlacements: { featured: true } }, undefined), { placement: 'featured', allowed: true });
});

test('public direct-offer responses never select or expose the postback secret', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'routes', 'directOffers.js'), 'utf8');
  assert.match(source, /\.select\('-postbackSecretKey'\)/);
});
