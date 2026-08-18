const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const DirectOffer = require('../models/DirectOffer');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Conversion = require('../models/Conversion');
const VipConfig = require('../models/VipConfig');
const directOffersRouter = require('../routes/directOffers');

const { applyValidatedDirectOfferRewardBridge } = directOffersRouter.__testInternals;

const makeState = () => {
  const userId = new mongoose.Types.ObjectId();
  const offerId = new mongoose.Types.ObjectId();
  const conversionId = new mongoose.Types.ObjectId();
  const user = {
    _id: userId,
    firebaseUid: 'firebase-user',
    walletBalance: 100,
    totalEarned: 500,
    isBanned: false,
    phase4RewardBridgeClaims: [],
  };
  const conversion = {
    _id: conversionId,
    internalStatus: 'approved',
    processingState: 'claimed',
    rewardTransactionId: null,
    errorReason: '',
  };
  const clickLog = {
    _id: new mongoose.Types.ObjectId(),
    clickId: 'click-financial',
    userId,
    offerId,
    status: 'clicked',
    rewardAmount: 777,
    transactionId: null,
    saveCalls: 0,
    async save() {
      this.saveCalls += 1;
      return this;
    },
  };
  return {
    user,
    conversion,
    clickLog,
    offer: { _id: offerId, title: 'Financial Audit Offer', advertiserPayoutAmount: 1.25 },
    result: {
      ok: true,
      shouldProcessRewardBridge: true,
      internalStatus: 'approved',
      clickLog,
      conversion,
      mapped: { clickId: clickLog.clickId, transactionId: 'provider-txn', payout: '999999' },
    },
    transactions: [],
    directOfferApprovedIncrements: 0,
  };
};

const queryFor = (doc) => ({
  select() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(doc).then(resolve, reject);
  },
  catch(reject) {
    return Promise.resolve(doc).catch(reject);
  },
});

const withBridgeMocks = async (state, fn, overrides = {}) => {
  const originals = {
    userFindById: User.findById,
    userFindOneAndUpdate: User.findOneAndUpdate,
    txFindOne: Transaction.findOne,
    txCreate: Transaction.create,
    conversionFindOneAndUpdate: Conversion.findOneAndUpdate,
    conversionFindByIdAndUpdate: Conversion.findByIdAndUpdate,
    directOfferFindByIdAndUpdate: DirectOffer.findByIdAndUpdate,
    notificationCreate: Notification.create,
    vipConfigFind: VipConfig.find,
    vipConfigFindOne: VipConfig.findOne,
  };

  User.findById = (id) => {
    if (overrides.failUserLookup) return queryFor(null);
    return String(id) === String(state.user._id) ? queryFor(state.user) : queryFor(null);
  };

  User.findOneAndUpdate = async (query, update) => {
    if (overrides.failBeforeWalletUpdate) throw new Error('wallet update unavailable');
    const claimId = update?.$addToSet?.phase4RewardBridgeClaims;
    if (claimId && state.user.phase4RewardBridgeClaims.some((id) => String(id) === String(claimId))) {
      return null;
    }
    if (update?.$inc) {
      state.user.walletBalance += update.$inc.walletBalance || 0;
      state.user.totalEarned += update.$inc.totalEarned || 0;
    }
    if (claimId) state.user.phase4RewardBridgeClaims.push(claimId);
    return state.user;
  };

  Transaction.findOne = async (query) =>
    state.transactions.find((tx) => tx.externalId === query.externalId) || null;

  Transaction.create = async (payload) => {
    if (overrides.failAfterWalletClaim) throw new Error('transaction history unavailable');
    const existing = state.transactions.find((tx) => tx.externalId === payload.externalId);
    if (existing) return existing;
    const tx = { _id: new mongoose.Types.ObjectId(), ...payload };
    state.transactions.push(tx);
    return tx;
  };

  Conversion.findOneAndUpdate = async (query, update) => {
    if (
      String(query._id) !== String(state.conversion._id) ||
      state.conversion.internalStatus !== query.internalStatus ||
      !query.processingState.$in.includes(state.conversion.processingState) ||
      state.conversion.rewardTransactionId !== query.rewardTransactionId
    ) {
      return null;
    }
    Object.assign(state.conversion, update.$set || {});
    return state.conversion;
  };

  Conversion.findByIdAndUpdate = async (id, update) => {
    if (String(id) === String(state.conversion._id)) {
      Object.assign(state.conversion, update.$set || {});
    }
    return state.conversion;
  };

  DirectOffer.findByIdAndUpdate = async (_id, update) => {
    state.directOfferApprovedIncrements += update?.$inc?.totalApproved || 0;
    return state.offer;
  };
  Notification.create = async (payload) => ({ _id: new mongoose.Types.ObjectId(), ...payload });
  VipConfig.find = async () => [];
  VipConfig.findOne = async () => null;

  try {
    return await fn();
  } finally {
    User.findById = originals.userFindById;
    User.findOneAndUpdate = originals.userFindOneAndUpdate;
    Transaction.findOne = originals.txFindOne;
    Transaction.create = originals.txCreate;
    Conversion.findOneAndUpdate = originals.conversionFindOneAndUpdate;
    Conversion.findByIdAndUpdate = originals.conversionFindByIdAndUpdate;
    DirectOffer.findByIdAndUpdate = originals.directOfferFindByIdAndUpdate;
    Notification.create = originals.notificationCreate;
    VipConfig.find = originals.vipConfigFind;
    VipConfig.findOne = originals.vipConfigFindOne;
  }
};

test('temporary direct-offer bridge applies financial effects exactly once under concurrent duplicates', async () => {
  const state = makeState();

  await withBridgeMocks(state, async () => {
    await Promise.all(Array.from({ length: 12 }, () =>
      applyValidatedDirectOfferRewardBridge({ offer: state.offer, result: state.result })
    ));
  });

  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].amount, 777);
  assert.equal(state.user.walletBalance, 877);
  assert.equal(state.user.totalEarned, 1277);
  assert.equal(state.user.phase4RewardBridgeClaims.length, 1);
  assert.equal(String(state.user.phase4RewardBridgeClaims[0]), String(state.conversion._id));
  assert.equal(state.conversion.processingState, 'processed');
  assert.equal(String(state.conversion.rewardTransactionId), String(state.transactions[0]._id));
  assert.equal(state.clickLog.status, 'approved');
  assert.equal(state.clickLog.advertiserPayout, 999999);
  assert.equal(state.directOfferApprovedIncrements, 1);

  state.result.shouldProcessRewardBridge = true;
  await withBridgeMocks(state, async () => {
    await applyValidatedDirectOfferRewardBridge({ offer: state.offer, result: state.result });
  });

  assert.equal(state.transactions.length, 1);
  assert.equal(state.user.walletBalance, 877);
  assert.equal(state.user.totalEarned, 1277);
  assert.equal(state.conversion.processingState, 'processed');
});

test('temporary bridge retry recovers if failure happens before wallet increment', async () => {
  const state = makeState();

  await assert.rejects(
    withBridgeMocks(state, async () =>
      applyValidatedDirectOfferRewardBridge({ offer: state.offer, result: state.result }), { failUserLookup: true }
    ),
    /User not found/
  );

  assert.equal(state.user.walletBalance, 100);
  assert.equal(state.user.totalEarned, 500);
  assert.equal(state.transactions.length, 0);
  assert.equal(state.conversion.processingState, 'failed');

  await withBridgeMocks(state, async () => {
    await applyValidatedDirectOfferRewardBridge({ offer: state.offer, result: state.result });
  });

  assert.equal(state.user.walletBalance, 877);
  assert.equal(state.user.totalEarned, 1277);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.conversion.processingState, 'processed');
});

test('temporary bridge retry recovers after conversion claim but before wallet update', async () => {
  const state = makeState();

  await assert.rejects(
    withBridgeMocks(state, async () =>
      applyValidatedDirectOfferRewardBridge({ offer: state.offer, result: state.result }), { failBeforeWalletUpdate: true }
    ),
    /wallet update unavailable/
  );

  assert.equal(state.user.walletBalance, 100);
  assert.equal(state.user.totalEarned, 500);
  assert.equal(state.user.phase4RewardBridgeClaims.length, 0);
  assert.equal(state.transactions.length, 0);
  assert.equal(state.conversion.processingState, 'failed');

  await withBridgeMocks(state, async () => {
    await applyValidatedDirectOfferRewardBridge({ offer: state.offer, result: state.result });
  });

  assert.equal(state.user.walletBalance, 877);
  assert.equal(state.user.totalEarned, 1277);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.conversion.processingState, 'processed');
});

test('temporary bridge retry after wallet claim does not credit wallet twice', async () => {
  const state = makeState();

  await assert.rejects(
    withBridgeMocks(state, async () =>
      applyValidatedDirectOfferRewardBridge({ offer: state.offer, result: state.result }), { failAfterWalletClaim: true }
    ),
    /transaction history unavailable/
  );

  assert.equal(state.user.walletBalance, 877);
  assert.equal(state.user.totalEarned, 1277);
  assert.equal(state.user.phase4RewardBridgeClaims.length, 1);
  assert.equal(state.transactions.length, 0);
  assert.equal(state.conversion.processingState, 'failed');

  await withBridgeMocks(state, async () => {
    await applyValidatedDirectOfferRewardBridge({ offer: state.offer, result: state.result });
  });

  assert.equal(state.user.walletBalance, 877);
  assert.equal(state.user.totalEarned, 1277);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].metadata.walletApplied, false);
  assert.equal(state.conversion.processingState, 'processed');
});
