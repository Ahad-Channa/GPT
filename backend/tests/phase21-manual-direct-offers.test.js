const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const DirectOffer = require('../models/DirectOffer');
const CustomOfferSubmission = require('../models/CustomOfferSubmission');
const {
  buildGoalsSnapshot,
  normalizeGoals,
  resolveGoal,
} = require('../utils/offerGoals');
const { buildDirectOfferProviderConfig } = require('../services/tracking/directOfferProvider');
const {
  buildManualProofConversionPayload,
  syncManualProofSubmissionStatus,
  upsertManualProofConversion,
  manualTransactionId,
} = require('../services/tracking/manualProofService');
const {
  processReward,
  buildDirectOfferRewardDescription,
} = require('../services/rewards/rewardService');
const { buildChargebackDescription } = require('../services/rewards/reversalService');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

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

// ─── Schema backward compatibility ────────────────────────────────────────────

const baseOffer = () => ({
  title: 'Plarium Vikings',
  description: 'Play Vikings',
  rewardAmount: 500,
  advertiserUrl: 'https://advertiser.example/offer',
});

test('legacy Direct Offers default to postback and remain rewardable by S2S', () => {
  const offer = new DirectOffer(baseOffer());
  assert.equal(offer.trackingMode, 'postback');
  assert.equal(buildDirectOfferProviderConfig(offer).enabled, true);

  const historical = { ...baseOffer(), _id: new mongoose.Types.ObjectId(), isActive: true };
  assert.equal(buildDirectOfferProviderConfig(historical).enabled, true);
});

test('manual Direct Offers are disabled for postback processing', () => {
  const offer = new DirectOffer({ ...baseOffer(), trackingMode: 'manual' });
  assert.equal(offer.trackingMode, 'manual');
  assert.equal(buildDirectOfferProviderConfig(offer).enabled, false);
});

test('CustomOfferSubmission validates old Custom Offers and new Direct Offers', () => {
  const userId = new mongoose.Types.ObjectId();
  const customOfferId = new mongoose.Types.ObjectId();
  const directOfferId = new mongoose.Types.ObjectId();

  const legacyCustom = new CustomOfferSubmission({ offerId: customOfferId, userId });
  assert.equal(legacyCustom.validateSync(), undefined);
  assert.equal(legacyCustom.offerType, 'custom_offer');

  const direct = new CustomOfferSubmission({
    offerType: 'direct_offer',
    directOfferId,
    userId,
  });
  assert.equal(direct.validateSync(), undefined);
  assert.equal(direct.offerId, null);

  const missingOffer = new CustomOfferSubmission({ userId });
  assert.ok(missingOffer.validateSync());
});

// ─── External Event ID resolution order ───────────────────────────────────────

const externalSnapshot = () => buildGoalsSnapshot(normalizeGoals([
  {
    goalKey: 'fight_20_battles',
    label: 'Fight 20 Battles',
    rewardAmount: 250,
    externalEventId: 'Game Event 269',
    externalEventAliases: ['GE-269'],
  },
  {
    goalKey: 'reach_level_5',
    label: 'Reach Level 5',
    rewardAmount: 500,
    externalEventId: 'Game Event 4',
  },
  {
    goalKey: 'disabled_goal',
    label: 'Disabled',
    rewardAmount: 999,
    externalEventId: 'Game Event 999',
    enabled: false,
  },
]));

test('exact internal goalKey wins before external mappings', () => {
  const snapshot = externalSnapshot();
  snapshot.collision = { amount: 10, label: 'Collision' };

  const result = resolveGoal({ goalsSnapshot: snapshot, eventType: 'collision' });
  assert.equal(result.matched, true);
  assert.equal(result.goalKey, 'collision');
  assert.equal(result.amount, 10);
});

test('exact external Event ID and exact alias resolve to internal goals', () => {
  const snapshot = externalSnapshot();

  const external = resolveGoal({ goalsSnapshot: snapshot, eventType: 'Game Event 269' });
  assert.equal(external.matched, true);
  assert.equal(external.goalKey, 'fight_20_battles');
  assert.equal(external.label, 'Fight 20 Battles');

  const alias = resolveGoal({ goalsSnapshot: snapshot, eventType: 'GE-269' });
  assert.equal(alias.matched, true);
  assert.equal(alias.goalKey, 'fight_20_battles');
});

test('safe normalized fallback handles case and whitespace differences only', () => {
  const snapshot = externalSnapshot();
  const result = resolveGoal({ goalsSnapshot: snapshot, eventType: '  game   event 4 ' });
  assert.equal(result.matched, true);
  assert.equal(result.goalKey, 'reach_level_5');

  const fuzzy = resolveGoal({ goalsSnapshot: snapshot, eventType: 'GameEvents4' });
  assert.equal(fuzzy.matched, false);
});

test('unknown, disabled, and ambiguous external events never reward', () => {
  const snapshot = externalSnapshot();
  assert.equal(resolveGoal({ goalsSnapshot: snapshot, eventType: 'Game Event 999' }).matched, false);
  assert.equal(resolveGoal({ goalsSnapshot: snapshot, eventType: 'unknown-event' }).matched, false);

  const ambiguous = {
    ...snapshot,
    another_goal: {
      amount: 100,
      label: 'Another',
      externalEventId: 'Game Event 269',
      externalEventAliases: [],
    },
  };
  const result = resolveGoal({ goalsSnapshot: ambiguous, eventType: 'Game Event 269' });
  assert.equal(result.matched, false);
  assert.match(result.reason, /Ambiguous/);
});

test('normalizeGoals preserves external IDs and aliases while dropping duplicates', () => {
  const [goal] = normalizeGoals([{
    goalKey: 'fight_20',
    rewardAmount: 10,
    externalEventId: '  Game   Event 269 ',
    externalEventAliases: ['GE 269', 'ge 269', 'Alt Event'],
  }]);
  assert.equal(goal.externalEventId, 'Game Event 269');
  assert.deepEqual(goal.externalEventAliases, ['GE 269', 'Alt Event']);
});

// ─── Manual proof conversion lifecycle ────────────────────────────────────────

const makeConversionModel = (state) => ({
  async findOne(query) {
    return state.conversions.find((conversion) => matches(conversion, query)) || null;
  },
  async create(payload) {
    const doc = makeDoc(payload);
    state.conversions.push(doc);
    return doc;
  },
  async findOneAndUpdate(query, update) {
    const doc = state.conversions.find((conversion) => matches(conversion, query)) || null;
    return applyUpdate(doc, update);
  },
});

const makeSubmissionFixture = () => {
  const userId = new mongoose.Types.ObjectId();
  const offerId = new mongoose.Types.ObjectId();
  const submission = makeDoc({
    _id: new mongoose.Types.ObjectId(),
    offerType: 'direct_offer',
    directOfferId: offerId,
    userId,
    clickId: 'manual-click-1',
    status: 'started',
  });
  const clickLog = makeDoc({
    _id: new mongoose.Types.ObjectId(),
    clickId: 'manual-click-1',
    userId,
    offerId,
    campaignId: offerId,
    rewardAmount: 500,
  });
  const offer = makeDoc({ _id: offerId, title: 'Plarium Vikings', rewardAmount: 500 });
  return { userId, offerId, submission, clickLog, offer };
};

test('manual proof submission creates a pending conversion using the trusted click reward', async () => {
  const state = { conversions: [] };
  const fixture = makeSubmissionFixture();

  const conversion = await upsertManualProofConversion({
    ...fixture,
    conversionModel: makeConversionModel(state),
  });

  assert.equal(conversion.internalStatus, 'pending');
  assert.equal(conversion.processingState, 'pending');
  assert.equal(conversion.eventType, 'manual_proof');
  assert.equal(conversion.rewardAmount, 500);
  assert.equal(conversion.providerTransactionId, manualTransactionId(fixture.submission._id));
  assert.equal(conversion.metadata.manualProof, true);
});

test('rejected manual proof can be resubmitted and reset to pending', async () => {
  const state = { conversions: [] };
  const fixture = makeSubmissionFixture();
  const model = makeConversionModel(state);
  await upsertManualProofConversion({ ...fixture, conversionModel: model });
  state.conversions[0].internalStatus = 'rejected';
  state.conversions[0].rejectionReason = 'not enough proof';

  const reset = await upsertManualProofConversion({ ...fixture, conversionModel: model });
  assert.equal(state.conversions.length, 1);
  assert.equal(reset.internalStatus, 'pending');
  assert.equal(reset.rejectionReason, '');
});

test('credited manual proof cannot be submitted or reset again', async () => {
  const state = { conversions: [] };
  const fixture = makeSubmissionFixture();
  const model = makeConversionModel(state);
  await upsertManualProofConversion({ ...fixture, conversionModel: model });
  state.conversions[0].processingState = 'processed';
  state.conversions[0].rewardTransactionId = new mongoose.Types.ObjectId();

  await assert.rejects(
    () => upsertManualProofConversion({ ...fixture, conversionModel: model }),
    (error) => error.code === 'MANUAL_PROOF_ALREADY_CREDITED'
  );
});

test('admin conversion actions sync the manual proof submission status', async () => {
  const submissionId = new mongoose.Types.ObjectId();
  let captured = null;
  const submissionModel = {
    async findByIdAndUpdate(id, update) {
      captured = { id, update };
      return { _id: id, ...update.$set };
    },
  };

  await syncManualProofSubmissionStatus({
    conversion: { metadata: { proofSubmissionId: submissionId } },
    status: 'rejected',
    adminNote: 'Invalid screenshot',
    submissionModel,
  });

  assert.equal(String(captured.id), String(submissionId));
  assert.equal(captured.update.$set.status, 'rejected');
  assert.equal(captured.update.$set.adminNote, 'Invalid screenshot');
});

// ─── Reward / chargeback naming ───────────────────────────────────────────────

test('reward description helpers use offer title plus goal label', () => {
  assert.equal(
    buildDirectOfferRewardDescription({ offerTitle: 'Plarium Vikings' }),
    'Plarium Vikings - Offer Reward'
  );
  assert.equal(
    buildDirectOfferRewardDescription({ offerTitle: 'Plarium Vikings', stepLabel: 'Fight 20 Battles' }),
    'Plarium Vikings - Fight 20 Battles'
  );
});

test('chargeback description uses the original reward metadata', () => {
  assert.equal(
    buildChargebackDescription({ metadata: { offerTitle: 'Plarium Vikings', stepLabel: 'Fight 20 Battles' } }),
    'Chargeback - Plarium Vikings - Fight 20 Battles'
  );
  assert.equal(buildChargebackDescription({ metadata: {} }), 'Offer reward reversed');
});

const makeRewardState = ({ goalKey = null } = {}) => {
  const userId = new mongoose.Types.ObjectId();
  const offerId = new mongoose.Types.ObjectId();
  const user = makeDoc({
    _id: userId,
    firebaseUid: 'phase21-user',
    walletBalance: 100,
    totalEarned: 0,
    isBanned: false,
    referredBy: null,
    appliedFinancialTransactionIds: [],
  });
  const click = makeDoc({
    _id: new mongoose.Types.ObjectId(),
    clickId: 'phase21-click',
    userId,
    offerId,
    providerId: 'direct',
    campaignType: 'direct_offer',
    campaignId: offerId,
    rewardAmount: 500,
    offerTitle: 'Plarium Vikings',
    rewardSnapshot: { amount: 500, currency: 'coins' },
    goalsSnapshot: goalKey
      ? { [goalKey]: { amount: 250, payoutAmount: 0, label: 'Fight 20 Battles' } }
      : null,
    status: 'clicked',
  });
  const conversion = makeDoc({
    _id: new mongoose.Types.ObjectId(),
    providerId: 'direct',
    providerTransactionId: 'phase21-txn',
    clickId: click.clickId,
    clickLogId: click._id,
    userId,
    campaignType: 'direct_offer',
    campaignId: offerId,
    offerId,
    goalKey,
    internalStatus: 'approved',
    processingState: 'claimed',
    rewardTransactionId: null,
    payout: { amount: 0, currency: 'USD' },
    rewardAmount: goalKey ? 250 : 500,
  });
  const offer = makeDoc({ _id: offerId, title: 'Plarium Vikings', holdEnabled: false });
  const state = {
    user,
    click,
    conversion,
    offer,
    users: [user],
    clicks: [click],
    conversions: [conversion],
    transactions: [],
    settings: { referralConfig: { holdDays: 0, globalPercentage: 5, signupBonusCoins: 0 } },
    offerStats: { totalApproved: 0 },
  };
  const models = {
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
      findById(id) { return q(String(id) === String(offer._id) ? offer : null); },
      async findByIdAndUpdate(_id, update) { state.offerStats.totalApproved += update?.$inc?.totalApproved || 0; return offer; },
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
  };
  return { state, models };
};

const noSideEffects = { notify: async () => {}, emitWalletUpdate: () => {}, processVipLevelUp: async () => {} };

test('single-step direct reward stores the offer title in the ledger description', async () => {
  const { state, models } = makeRewardState();
  const result = await processReward({ conversion: state.conversion, models, hooks: noSideEffects });

  assert.equal(result.ok, true);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].description, 'Plarium Vikings - Offer Reward');
  assert.equal(state.transactions[0].metadata.offerTitle, 'Plarium Vikings');
  assert.equal(state.transactions[0].sourceType, 'direct_offer');
});

test('multi-step direct reward stores the completed goal label in the ledger description', async () => {
  const { state, models } = makeRewardState({ goalKey: 'fight_20_battles' });
  const result = await processReward({ conversion: state.conversion, models, hooks: noSideEffects });

  assert.equal(result.ok, true);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].description, 'Plarium Vikings - Fight 20 Battles');
  assert.equal(state.transactions[0].metadata.stepLabel, 'Fight 20 Battles');
});

// ─── Route guard markers ──────────────────────────────────────────────────────

test('manual start reuses an existing submission/click before reserving a new slot', () => {
  const source = read('backend/routes/directOffers.js');
  assert.match(source, /isManualOffer\(offer\)/);
  assert.match(source, /\$setOnInsert:\s*\{[\s\S]*?status: 'started'/);
  assert.match(source, /if \(submission\.clickId\)[\s\S]*?respondWithManualClick/);
  assert.match(source, /releaseDirectOfferClickSlot/);
});

test('public postback route explicitly rejects manual offers before processing', () => {
  const source = read('backend/routes/directOffers.js');
  assert.match(source, /if \(isManualOffer\(offer\)\)\s*\{[\s\S]*?return res\.status\(200\)\.send\('0'\)/);
});
