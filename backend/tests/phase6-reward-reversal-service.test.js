const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const directOffersRouter = require('../routes/directOffers');
const { isUnsupportedTransactionError, runAtomic } = require('../services/rewards/atomicRunner');
const { processReward, rewardExternalId, referralExternalId } = require('../services/rewards/rewardService');
const { processReversal, reversalExternalId, referralReversalExternalId } = require('../services/rewards/reversalService');

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
  if (update.$set) {
    for (const [key, value] of Object.entries(update.$set)) {
      const parts = key.split('.');
      let target = doc;
      while (parts.length > 1) {
        const part = parts.shift();
        target[part] = target[part] || {};
        target = target[part];
      }
      target[parts[0]] = value;
    }
  }
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

const makeState = ({ referral = false, holdDays = 0 } = {}) => {
  const userId = new mongoose.Types.ObjectId();
  const referrerId = new mongoose.Types.ObjectId();
  const offerId = new mongoose.Types.ObjectId();
  const clickId = new mongoose.Types.ObjectId();
  const conversionId = new mongoose.Types.ObjectId();
  const user = makeDoc({
    _id: userId,
    firebaseUid: 'phase6-user',
    walletBalance: 100,
    totalEarned: 500,
    isBanned: false,
    referredBy: referral ? referrerId : null,
    referralPercentage: null,
    commissionGenerated: 0,
    appliedFinancialTransactionIds: [],
  });
  const referrer = makeDoc({
    _id: referrerId,
    firebaseUid: 'phase6-referrer',
    walletBalance: 50,
    totalEarned: 0,
    referralEarnings: 0,
    appliedFinancialTransactionIds: [],
  });
  const click = makeDoc({
    _id: clickId,
    clickId: 'click-phase6',
    userId,
    offerId,
    providerId: 'direct',
    campaignType: 'direct_offer',
    campaignId: offerId,
    rewardAmount: 777,
    rewardSnapshot: { amount: 777, currency: 'coins', source: 'direct_offer.rewardAmount' },
    status: 'clicked',
  });
  const conversion = makeDoc({
    _id: conversionId,
    providerId: 'direct',
    providerTransactionId: 'provider-txn',
    clickId: click.clickId,
    clickLogId: click._id,
    userId,
    campaignType: 'direct_offer',
    campaignId: offerId,
    offerId,
    internalStatus: 'approved',
    processingState: 'claimed',
    rewardTransactionId: null,
    reversalTransactionId: null,
    payout: { amount: 999999999, currency: 'USD' },
    rewardAmount: 777,
  });
  return {
    users: [user, referrer],
    clicks: [click],
    conversions: [conversion],
    transactions: [],
    settings: {
      referralConfig: { holdDays, globalPercentage: 5, signupBonusCoins: 0 },
    },
    offerStats: { totalApproved: 0 },
    user,
    referrer,
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
    state.user = state.users.find((item) => String(item._id) === String(snapshot.users[0]._id));
    state.referrer = state.users.find((item) => String(item._id) === String(snapshot.users[1]._id));
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

test('approved reward is processed once with deterministic transaction identity', async () => {
  const state = makeState();
  const result = await processReward({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: noSideEffects,
    runInTransaction: transactionRunner(state),
  });

  assert.equal(result.ok, true);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].externalId, rewardExternalId(state.conversion._id));
  assert.equal(state.transactions[0].amount, 777);
  assert.equal(state.user.walletBalance, 877);
  assert.equal(state.user.totalEarned, 1277);
  assert.equal(state.conversion.processingState, 'processed');
  assert.equal(String(state.conversion.rewardTransactionId), String(state.transactions[0]._id));
  assert.equal(state.click.status, 'approved');
  assert.equal(state.click.advertiserPayout, 999999999);

  const duplicate = await processReward({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: noSideEffects,
    runInTransaction: transactionRunner(state),
  });
  assert.equal(duplicate.duplicate, true);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.user.walletBalance, 877);
});

test('pending and rejected conversions do not receive rewards', async () => {
  for (const status of ['pending', 'rejected']) {
    const state = makeState();
    state.conversion.internalStatus = status;
    const result = await processReward({
      conversion: state.conversion,
      models: makeModels(state),
      hooks: noSideEffects,
      runInTransaction: transactionRunner(state),
    });
    assert.equal(result.ok, false);
    assert.equal(state.transactions.length, 0);
    assert.equal(state.user.walletBalance, 100);
  }
});

test('concurrent approved rewards apply financial mutation exactly once', async () => {
  const state = makeState();
  const models = makeModels(state);
  const calls = Array.from({ length: 20 }, () => processReward({
    conversion: state.conversion,
    models,
    hooks: noSideEffects,
    runInTransaction: transactionRunner(state),
  }));

  const results = await Promise.all(calls);
  assert.equal(results.some((result) => result.ok), true);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.user.walletBalance, 877);
  assert.equal(state.user.totalEarned, 1277);
});

test('reward transaction rollback handles injected failure points', async () => {
  for (const failurePoint of ['before-claim', 'after-claim-before-transaction', 'after-transaction-before-wallet', 'after-wallet-before-finalize']) {
    const state = makeState();
    await assert.rejects(() => processReward({
      conversion: state.conversion,
      models: makeModels(state),
      hooks: noSideEffects,
      runInTransaction: transactionRunner(state),
      failurePoint,
    }), /Injected reward failure/);

    assert.equal(state.transactions.length, 0);
    assert.equal(state.user.walletBalance, 100);
    assert.equal(state.user.totalEarned, 500);

    await processReward({
      conversion: state.conversion,
      models: makeModels(state),
      hooks: noSideEffects,
      runInTransaction: transactionRunner(state),
    });
    assert.equal(state.transactions.length, 1);
    assert.equal(state.user.walletBalance, 877);
  }
});

test('referral reward is created once and reversed once', async () => {
  const state = makeState({ referral: true, holdDays: 0 });
  await processReward({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: noSideEffects,
    runInTransaction: transactionRunner(state),
  });
  await processReward({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: noSideEffects,
    runInTransaction: transactionRunner(state),
  });

  const referralTxs = state.transactions.filter((tx) => tx.externalId === referralExternalId(state.conversion._id));
  assert.equal(referralTxs.length, 1);
  assert.equal(referralTxs[0].amount, 38);
  assert.equal(state.referrer.walletBalance, 88);
  assert.equal(state.referrer.referralEarnings, 38);

  state.conversion.internalStatus = 'reversed';
  await processReversal({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: { notify: async () => {}, emitWalletUpdate: () => {} },
    runInTransaction: transactionRunner(state),
  });
  await processReversal({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: { notify: async () => {}, emitWalletUpdate: () => {} },
    runInTransaction: transactionRunner(state),
  });

  assert.equal(state.transactions.filter((tx) => tx.externalId === referralReversalExternalId(state.conversion._id)).length, 1);
  assert.equal(state.referrer.walletBalance, 50);
  assert.equal(state.referrer.referralEarnings, 0);
});

test('reversal uses exact reward linkage and is idempotent under concurrency', async () => {
  const state = makeState();
  await processReward({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: noSideEffects,
    runInTransaction: transactionRunner(state),
  });

  state.conversion.internalStatus = 'reversed';
  const models = makeModels(state);
  const calls = Array.from({ length: 20 }, () => processReversal({
    conversion: state.conversion,
    models,
    hooks: { notify: async () => {}, emitWalletUpdate: () => {} },
    runInTransaction: transactionRunner(state),
  }));
  const results = await Promise.all(calls);

  assert.equal(results.some((result) => result.ok), true);
  assert.equal(state.transactions.filter((tx) => tx.externalId === reversalExternalId(state.conversion._id)).length, 1);
  assert.equal(state.user.walletBalance, 100);
  assert.equal(state.user.totalEarned, 500);
  assert.equal(state.conversion.processingState, 'reversed');
});

test('trusted click-time reward amount is used after campaign reward changes', async () => {
  const state = makeState();
  state.click.rewardAmount = 500;
  state.click.rewardSnapshot.amount = 500;
  state.conversion.rewardAmount = 1000;
  state.conversion.payout.amount = 999999999;

  await processReward({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: noSideEffects,
    runInTransaction: transactionRunner(state),
  });

  assert.equal(state.transactions[0].amount, 500);
  assert.equal(state.user.walletBalance, 600);
  assert.equal(state.user.totalEarned, 1000);

  state.conversion.internalStatus = 'reversed';
  await processReversal({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: { notify: async () => {}, emitWalletUpdate: () => {} },
    runInTransaction: transactionRunner(state),
  });
  assert.equal(state.transactions.find((tx) => tx.externalId === reversalExternalId(state.conversion._id)).amount, -500);
  assert.equal(state.user.walletBalance, 100);
});

test('missing or inconsistent trusted click reward fails safely', async () => {
  for (const mutate of [
    (state) => { delete state.click.rewardAmount; },
    (state) => { state.click.rewardAmount = 0; state.click.rewardSnapshot.amount = 0; },
    (state) => { state.click.rewardAmount = 10.5; state.click.rewardSnapshot.amount = 10.5; },
    (state) => { state.click.rewardSnapshot.amount = 999; },
  ]) {
    const state = makeState();
    mutate(state);
    await assert.rejects(() => processReward({
      conversion: state.conversion,
      models: makeModels(state),
      hooks: noSideEffects,
      runInTransaction: transactionRunner(state),
    }), /trusted click reward|snapshot/);
    assert.equal(state.transactions.length, 0);
    assert.equal(state.user.walletBalance, 100);
  }
});

test('fallback reward failures recover without duplicate wallet credit', async () => {
  for (const failurePoint of ['after-claim-before-transaction', 'after-transaction-before-wallet', 'after-wallet-before-finalize']) {
    const state = makeState();
    await assert.rejects(() => processReward({
      conversion: state.conversion,
      models: makeModels(state),
      hooks: noSideEffects,
      failurePoint,
    }), /Injected reward failure/);

    await processReward({
      conversion: state.conversion,
      models: makeModels(state),
      hooks: noSideEffects,
    });

    assert.equal(state.transactions.filter((tx) => tx.externalId === rewardExternalId(state.conversion._id)).length, 1);
    assert.equal(state.user.walletBalance, 877);
    assert.equal(state.user.totalEarned, 1277);
    assert.equal(state.conversion.processingState, 'processed');
  }
});

test('fallback reversal failures recover without duplicate wallet deduction', async () => {
  for (const failurePoint of ['after-claim-before-transaction', 'after-transaction-before-wallet', 'after-wallet-before-finalize']) {
    const state = makeState();
    await processReward({ conversion: state.conversion, models: makeModels(state), hooks: noSideEffects });
    state.conversion.internalStatus = 'reversed';

    await assert.rejects(() => processReversal({
      conversion: state.conversion,
      models: makeModels(state),
      hooks: { notify: async () => {}, emitWalletUpdate: () => {} },
      failurePoint,
    }), /Injected reversal failure/);

    await processReversal({
      conversion: state.conversion,
      models: makeModels(state),
      hooks: { notify: async () => {}, emitWalletUpdate: () => {} },
    });

    assert.equal(state.transactions.filter((tx) => tx.externalId === reversalExternalId(state.conversion._id)).length, 1);
    assert.equal(state.user.walletBalance, 100);
    assert.equal(state.user.totalEarned, 500);
    assert.equal(state.conversion.processingState, 'reversed');
  }
});

test('duplicate externalId conflicts are not treated as idempotent', async () => {
  const state = makeState();
  state.transactions.push(makeDoc({
    userId: new mongoose.Types.ObjectId(),
    transactionType: 'direct_offer_reward',
    amount: 1,
    balanceAfter: 1,
    status: 'completed',
    conversionId: new mongoose.Types.ObjectId(),
    externalId: rewardExternalId(state.conversion._id),
  }));

  await assert.rejects(() => processReward({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: noSideEffects,
  }), /Conflicting transaction/);
  assert.equal(state.user.walletBalance, 100);
});

test('side-effect failure after commit does not duplicate reward on retry', async () => {
  const state = makeState();
  await processReward({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: {
      notify: async () => { throw new Error('notification down'); },
      emitWalletUpdate: () => { throw new Error('socket down'); },
      processVipLevelUp: async () => { throw new Error('vip down'); },
    },
  });
  assert.equal(state.user.walletBalance, 877);

  await processReward({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: noSideEffects,
  });
  assert.equal(state.transactions.filter((tx) => tx.externalId === rewardExternalId(state.conversion._id)).length, 1);
  assert.equal(state.user.walletBalance, 877);
});

test('negative balance policy is preserved on reversal', async () => {
  const state = makeState();
  await processReward({ conversion: state.conversion, models: makeModels(state), hooks: noSideEffects });
  state.user.walletBalance = 100;
  state.conversion.internalStatus = 'reversed';
  await processReversal({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: { notify: async () => {}, emitWalletUpdate: () => {} },
  });
  assert.equal(state.transactions.find((tx) => tx.externalId === reversalExternalId(state.conversion._id)).amount, -777);
  assert.equal(state.user.walletBalance, -677);
});

test('ledger reconciliation invariant holds for reward and reversal', async () => {
  const state = makeState();
  await processReward({ conversion: state.conversion, models: makeModels(state), hooks: noSideEffects });
  state.conversion.internalStatus = 'reversed';
  await processReversal({ conversion: state.conversion, models: makeModels(state), hooks: { notify: async () => {}, emitWalletUpdate: () => {} } });
  const rewardTx = state.transactions.find((tx) => tx.externalId === rewardExternalId(state.conversion._id));
  const reversalTx = state.transactions.find((tx) => tx.externalId === reversalExternalId(state.conversion._id));
  assert.equal(rewardTx.amount + reversalTx.amount, 0);
  assert.equal(state.user.walletBalance, 100);
  assert.equal(Boolean(state.conversion.rewardTransactionId), true);
  assert.equal(Boolean(state.conversion.reversalTransactionId), true);
});

test('atomic runner selects transaction, fallback, and error behavior correctly', async () => {
  const originalStartSession = mongoose.startSession;
  let attempts = 0;
  try {
    mongoose.startSession = async () => ({
      async withTransaction(fn) {
        attempts += 1;
        return fn();
      },
      async endSession() {},
    });
    const transactionResult = await runAtomic(async ({ strategy }) => strategy, { forceTransactionAttempt: true });
    assert.equal(transactionResult, 'transaction');

    mongoose.startSession = async () => ({
      async withTransaction() {
        const error = new Error('Transaction numbers are only allowed on a replica set member or mongos');
        error.code = 20;
        throw error;
      },
      async endSession() {},
    });
    const fallbackResult = await runAtomic(async ({ strategy }) => strategy, { forceTransactionAttempt: true });
    assert.equal(fallbackResult, 'fallback');

    mongoose.startSession = async () => ({
      async withTransaction() {
        throw new Error('ordinary application error');
      },
      async endSession() {},
    });
    await assert.rejects(() => runAtomic(async () => 'unused', { forceTransactionAttempt: true }), /ordinary application error/);

    let transientAttempts = 0;
    mongoose.startSession = async () => ({
      async withTransaction(fn) {
        transientAttempts += 1;
        if (transientAttempts === 1) {
          const error = new Error('temporary');
          error.hasErrorLabel = (label) => label === 'TransientTransactionError';
          throw error;
        }
        return fn();
      },
      async endSession() {},
    });
    assert.equal(await runAtomic(async ({ strategy }) => strategy, { forceTransactionAttempt: true }), 'transaction');
    assert.equal(transientAttempts, 2);
    assert.equal(isUnsupportedTransactionError({ code: 20 }), true);
    assert.equal(attempts, 1);
  } finally {
    mongoose.startSession = originalStartSession;
  }
});

test('reversal rejects missing or mismatched original reward transaction', async () => {
  const state = makeState();
  state.conversion.internalStatus = 'reversed';
  state.conversion.processingState = 'processed';
  state.conversion.rewardTransactionId = new mongoose.Types.ObjectId();

  await assert.rejects(() => processReversal({
    conversion: state.conversion,
    models: makeModels(state),
    hooks: { notify: async () => {}, emitWalletUpdate: () => {} },
    runInTransaction: transactionRunner(state),
  }), /Original reward transaction/);
  assert.equal(state.user.walletBalance, 100);
});

test('reversal rollback handles injected failure points', async () => {
  for (const failurePoint of ['before-claim', 'after-claim-before-transaction', 'after-transaction-before-wallet', 'after-wallet-before-finalize']) {
    const state = makeState();
    await processReward({
      conversion: state.conversion,
      models: makeModels(state),
      hooks: noSideEffects,
      runInTransaction: transactionRunner(state),
    });
    state.conversion.internalStatus = 'reversed';

    await assert.rejects(() => processReversal({
      conversion: state.conversion,
      models: makeModels(state),
      hooks: { notify: async () => {}, emitWalletUpdate: () => {} },
      runInTransaction: transactionRunner(state),
      failurePoint,
    }), /Injected reversal failure/);

    assert.equal(state.transactions.filter((tx) => tx.externalId === reversalExternalId(state.conversion._id)).length, 0);
    assert.equal(state.user.walletBalance, 877);

    await processReversal({
      conversion: state.conversion,
      models: makeModels(state),
      hooks: { notify: async () => {}, emitWalletUpdate: () => {} },
      runInTransaction: transactionRunner(state),
    });
    assert.equal(state.transactions.filter((tx) => tx.externalId === reversalExternalId(state.conversion._id)).length, 1);
    assert.equal(state.user.walletBalance, 100);
  }
});

test('temporary bridge is removed from direct-offer route test internals', () => {
  assert.equal(Object.prototype.hasOwnProperty.call(directOffersRouter.__testInternals, 'applyValidatedDirectOfferRewardBridge'), false);
});

test('direct-offer postback route has no direct wallet mutation', () => {
  const routeSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'directOffers.js'), 'utf8');
  const postbackSource = routeSource.slice(routeSource.indexOf("router.get('/postback'"));
  assert.equal(/walletBalance|totalEarned/.test(postbackSource), false);
  assert.equal(/Transaction\.create|Transaction\.findOne/.test(postbackSource), false);
});
