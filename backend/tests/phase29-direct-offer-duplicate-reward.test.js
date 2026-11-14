const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const ClickLog = require('../models/ClickLog');
const Conversion = require('../models/Conversion');
const { createClick, buildDirectOfferClaimKey, findExistingDirectOfferClick } = require('../services/tracking/clickService');
const { createOrResolveConversion } = require('../services/tracking/conversionService');

const hasIndex = (model, fields, optionsMatcher = () => true) =>
  model.schema.indexes().some(([indexFields, indexOptions]) =>
    JSON.stringify(indexFields) === JSON.stringify(fields) && optionsMatcher(indexOptions || {})
  );

const makeDoc = (payload) => ({
  _id: payload._id || new mongoose.Types.ObjectId(),
  ...payload,
  async save() { return this; },
});

// In-memory Conversion model with the same uniqueness boundaries used in
// production: idempotencyKey and (provider, transaction, goal).
const makeConversionModel = (state) => ({
  async create(payload) {
    const duplicate = state.conversions.some((conversion) =>
      (payload.idempotencyKey && conversion.idempotencyKey === payload.idempotencyKey) ||
      (
        conversion.providerId === payload.providerId &&
        conversion.providerTransactionId === payload.providerTransactionId &&
        (conversion.goalKey || null) === (payload.goalKey || null)
      )
    );
    if (duplicate) {
      const error = new Error('duplicate key');
      error.code = 11000;
      error.keyPattern = { idempotencyKey: 1 };
      throw error;
    }
    const conversion = makeDoc(payload);
    state.conversions.push(conversion);
    return conversion;
  },
  async findOne(query) {
    return state.conversions.find((conversion) =>
      Object.entries(query).every(([key, value]) =>
        String(conversion[key] ?? '') === String(value ?? '')
      )
    ) || null;
  },
});

const makeConversionArgs = ({
  userId,
  offerId,
  clickLogId,
  clickId,
  transactionId,
  goalKey = null,
  goalLabel = 'Deposit',
}) => {
  const goalsSnapshot = goalKey
    ? { [goalKey]: { amount: 250, payoutAmount: 1.5, label: goalLabel } }
    : null;

  return {
    providerConfig: { providerId: 'direct', providerSettings: {} },
    mapped: {
      clickId,
      transactionId,
      status: 'approved',
      eventType: goalKey || 'conversion',
    },
    internalStatus: 'approved',
    clickLog: {
      _id: clickLogId,
      clickId,
      userId,
      campaignType: 'direct_offer',
      campaignId: offerId,
      offerId,
      rewardAmount: 100,
      goalsSnapshot,
    },
    payoutAmount: 1.5,
    security: { method: 'shared_secret', checked: true, passed: true, reason: '' },
    goalKey,
    rewardAmount: goalKey ? 250 : null,
  };
};

const makeClickContext = () => {
  const userId = new mongoose.Types.ObjectId();
  const offerId = new mongoose.Types.ObjectId();
  return {
    userId,
    offerId,
    click1: { _id: new mongoose.Types.ObjectId(), clickId: 'click-1' },
    click2: { _id: new mongoose.Types.ObjectId(), clickId: 'click-2' },
  };
};

test('two click IDs for one single-step offer can create only one rewardable conversion', async () => {
  const state = { conversions: [] };
  const model = makeConversionModel(state);
  const { userId, offerId, click1, click2 } = makeClickContext();

  const first = await createOrResolveConversion({
    ...makeConversionArgs({ userId, offerId, clickLogId: click1._id, clickId: click1.clickId, transactionId: 'txn-1' }),
    conversionModel: model,
  });
  const second = await createOrResolveConversion({
    ...makeConversionArgs({ userId, offerId, clickLogId: click2._id, clickId: click2.clickId, transactionId: 'txn-2' }),
    conversionModel: model,
  });

  assert.equal(first.shouldProcess, true);
  assert.equal(second.isDuplicate, true);
  assert.equal(second.shouldProcess, false);
  assert.equal(second.transition, 'direct_offer_goal_already_rewarded');
  assert.equal(state.conversions.length, 1);
  assert.equal(String(state.conversions[0].clickLogId), String(click1._id));
});

test('two click IDs for the same multi-step goal can create only one rewardable conversion', async () => {
  const state = { conversions: [] };
  const model = makeConversionModel(state);
  const { userId, offerId, click1, click2 } = makeClickContext();

  const first = await createOrResolveConversion({
    ...makeConversionArgs({
      userId, offerId, clickLogId: click1._id, clickId: click1.clickId,
      transactionId: 'txn-goal-1', goalKey: 'deposit',
    }),
    conversionModel: model,
  });
  const second = await createOrResolveConversion({
    ...makeConversionArgs({
      userId, offerId, clickLogId: click2._id, clickId: click2.clickId,
      transactionId: 'txn-goal-2', goalKey: 'deposit',
    }),
    conversionModel: model,
  });

  assert.equal(first.shouldProcess, true);
  assert.equal(second.isDuplicate, true);
  assert.equal(second.shouldProcess, false);
  assert.equal(state.conversions.length, 1);
  assert.equal(state.conversions[0].goalKey, 'deposit');
});

test('different goals on the same offer remain independently rewardable once', async () => {
  const state = { conversions: [] };
  const model = makeConversionModel(state);
  const { userId, offerId, click1, click2 } = makeClickContext();

  const deposit = await createOrResolveConversion({
    ...makeConversionArgs({
      userId, offerId, clickLogId: click1._id, clickId: click1.clickId,
      transactionId: 'txn-deposit', goalKey: 'deposit',
    }),
    conversionModel: model,
  });
  const level5 = await createOrResolveConversion({
    ...makeConversionArgs({
      userId, offerId, clickLogId: click1._id, clickId: click1.clickId,
      transactionId: 'txn-level5', goalKey: 'level5',
    }),
    conversionModel: model,
  });
  const replayDeposit = await createOrResolveConversion({
    ...makeConversionArgs({
      userId, offerId, clickLogId: click2._id, clickId: click2.clickId,
      transactionId: 'txn-deposit-replay', goalKey: 'deposit',
    }),
    conversionModel: model,
  });

  assert.equal(deposit.shouldProcess, true);
  assert.equal(level5.shouldProcess, true);
  assert.equal(replayDeposit.isDuplicate, true);
  assert.equal(state.conversions.length, 2);
  assert.deepEqual(
    state.conversions.map((conversion) => conversion.goalKey).sort(),
    ['deposit', 'level5']
  );
});

test('simultaneous postbacks with different click IDs create only one conversion', async () => {
  const state = { conversions: [] };
  const model = makeConversionModel(state);
  const { userId, offerId, click1, click2 } = makeClickContext();

  const results = await Promise.all([
    createOrResolveConversion({
      ...makeConversionArgs({
        userId, offerId, clickLogId: click1._id, clickId: click1.clickId,
        transactionId: 'txn-concurrent-1', goalKey: 'deposit',
      }),
      conversionModel: model,
    }),
    createOrResolveConversion({
      ...makeConversionArgs({
        userId, offerId, clickLogId: click2._id, clickId: click2.clickId,
        transactionId: 'txn-concurrent-2', goalKey: 'deposit',
      }),
      conversionModel: model,
    }),
  ]);

  assert.equal(results.filter((result) => result.shouldProcess === true).length, 1);
  assert.equal(state.conversions.length, 1);
});

test('a reversed conversion cannot be credited again with a different click or transaction ID', async () => {
  const state = { conversions: [] };
  const model = makeConversionModel(state);
  const { userId, offerId, click1, click2 } = makeClickContext();

  await createOrResolveConversion({
    ...makeConversionArgs({
      userId, offerId, clickLogId: click1._id, clickId: click1.clickId,
      transactionId: 'txn-reversed', goalKey: 'deposit',
    }),
    conversionModel: model,
  });
  state.conversions[0].internalStatus = 'reversed';
  state.conversions[0].processingState = 'reversed';

  const replay = await createOrResolveConversion({
    ...makeConversionArgs({
      userId, offerId, clickLogId: click2._id, clickId: click2.clickId,
      transactionId: 'txn-new-after-reversal', goalKey: 'deposit',
    }),
    conversionModel: model,
  });

  assert.equal(replay.isDuplicate, true);
  assert.equal(replay.shouldProcess, false);
  assert.equal(state.conversions.length, 1);
});

test('concurrent click creation reuses one claim key and one ClickLog', async () => {
  const clicks = [];
  const clickLogModel = {
    async create(payload) {
      if (
        payload.directOfferClaimKey &&
        clicks.some((click) => click.directOfferClaimKey === payload.directOfferClaimKey)
      ) {
        const error = new Error('E11000 duplicate key error collection: clicklogs index: directOfferClaimKey_1');
        error.code = 11000;
        error.keyPattern = { directOfferClaimKey: 1 };
        throw error;
      }
      const click = makeDoc(payload);
      clicks.push(click);
      return click;
    },
    async findOne(query) {
      return clicks.find((click) =>
        Object.entries(query).every(([key, value]) =>
          String(click[key] ?? '') === String(value ?? '')
        )
      ) || null;
    },
  };

  const userId = new mongoose.Types.ObjectId();
  const offerId = new mongoose.Types.ObjectId();
  const claimKey = buildDirectOfferClaimKey(userId, offerId);
  const args = {
    user: { _id: userId },
    offerId,
    providerId: 'direct',
    providerType: 'direct_offer',
    campaignId: offerId,
    campaignType: 'direct_offer',
    rewardAmount: 100,
    destinationUrl: 'https://advertiser.example/offer',
    claimKey,
    clickLogModel,
  };

  const [first, second] = await Promise.all([
    createClick(args),
    createClick(args),
  ]);

  assert.equal(clicks.length, 1);
  assert.equal(first.clickId, second.clickId);
  assert.equal([first.reused, second.reused].filter(Boolean).length, 1);

  const existing = await findExistingDirectOfferClick({ userId, offerId, clickLogModel });
  assert.equal(existing.clickId, clicks[0].clickId);
});

test('direct-offer duplicate-reward indexes are present', () => {
  assert.ok(hasIndex(
    ClickLog,
    { directOfferClaimKey: 1 },
    (options) => options.unique === true && Boolean(options.partialFilterExpression)
  ));
  assert.ok(hasIndex(ClickLog, { userId: 1, offerId: 1, createdAt: -1 }));
  assert.ok(hasIndex(Conversion, { providerId: 1, userId: 1, offerId: 1, goalKey: 1 }));

  const source = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'routes', 'directOffers.js'),
    'utf8'
  );
  assert.match(source, /findExistingDirectOfferClick/);
  assert.match(source, /clickResult\.reused[\s\S]{0,120}releaseDirectOfferClickSlot/);
});
