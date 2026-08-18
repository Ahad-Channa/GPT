const Conversion = require('../../models/Conversion');
const ClickLog = require('../../models/ClickLog');
const DirectOffer = require('../../models/DirectOffer');
const Settings = require('../../models/Settings');
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const notify = require('../../utils/notify');
const { emitToUser, emitWalletUpdate } = require('../../utils/walletEvents');
const { processVipLevelUp } = require('../../utils/vipUtils');
const { createOne, runAtomic, withSession } = require('./atomicRunner');

const rewardExternalId = (conversionId) => `conversion:${conversionId}:reward`;
const referralExternalId = (conversionId) => `conversion:${conversionId}:referral`;

const applyUpdate = (doc, update = {}) => {
  if (!doc || !update.$set) return doc;
  Object.assign(doc, update.$set);
  return doc;
};

const queryOne = async (query, session) => withSession(query, session);

const findTransactionByExternalId = (transactionModel, externalId, session) =>
  queryOne(transactionModel.findOne({ externalId }), session);

const createTransactionIdempotent = async ({ transactionModel, payload, session }) => {
  const existing = await findTransactionByExternalId(transactionModel, payload.externalId, session);
  if (existing) return { transaction: existing, created: false };
  try {
    return { transaction: await createOne(transactionModel, payload, session), created: true };
  } catch (error) {
    if (error?.code === 11000) {
      const transaction = await findTransactionByExternalId(transactionModel, payload.externalId, session);
      if (transaction) return { transaction, created: false };
    }
    throw error;
  }
};

const loadConversion = async (conversionModel, conversionOrId, session) => {
  if (conversionOrId && typeof conversionOrId === 'object' && conversionOrId._id) return conversionOrId;
  return queryOne(conversionModel.findById(conversionOrId), session);
};

const claimRewardConversion = async (conversionModel, conversionId, session) =>
  conversionModel.findOneAndUpdate(
    {
      _id: conversionId,
      internalStatus: 'approved',
      processingState: { $in: ['claimed', 'failed'] },
      rewardTransactionId: null,
    },
    { $set: { processingState: 'processing', errorReason: '' } },
    { new: true, session }
  );

const markRewardFailed = async (conversionModel, conversionId, error, session) =>
  conversionModel.findByIdAndUpdate(
    conversionId,
    { $set: { processingState: 'failed', errorReason: error.message || 'Reward processing failed.' } },
    { session }
  );

const createReferralReward = async ({ settingsModel, transactionModel, userModel, rewardTx, user, rewardAmount, session }) => {
  if (!user?.referredBy || rewardAmount <= 0) return null;
  const existing = await findTransactionByExternalId(transactionModel, referralExternalId(rewardTx.conversionId), session);
  if (existing) return existing;

  const settings = await queryOne(settingsModel.getSingleton(), session);
  const referrer = await queryOne(userModel.findById(user.referredBy), session);
  if (!referrer) return null;

  const globalPct = settings.referralConfig?.globalPercentage ?? 5;
  const holdDays = settings.referralConfig?.holdDays ?? 30;
  const pct = user.referralPercentage != null && user.referralPercentage > 0 ? user.referralPercentage : globalPct;
  const amount = Math.floor(rewardAmount * (pct / 100));
  if (amount <= 0) return null;

  await userModel.updateOne({ _id: referrer._id }, { $inc: { referralEarnings: amount } }, { session });
  await userModel.updateOne({ _id: user._id }, { $inc: { commissionGenerated: amount } }, { session });

  const status = holdDays === 0 ? 'completed' : 'hold';
  let balanceAfter = referrer.walletBalance || 0;
  if (status === 'completed') {
    const updatedReferrer = await userModel.findOneAndUpdate(
      { _id: referrer._id },
      { $inc: { walletBalance: amount } },
      { new: true, session }
    );
    balanceAfter = updatedReferrer.walletBalance;
  }

  const holdUntil = status === 'hold' ? new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000) : null;
  const { transaction } = await createTransactionIdempotent({
    transactionModel,
    session,
    payload: {
      userId: referrer._id,
      transactionType: 'referral_reward',
      sourceType: 'referral',
      sourceId: rewardTx._id,
      linkedTransactionId: rewardTx._id,
      conversionId: rewardTx.conversionId,
      amount,
      balanceAfter,
      description: 'Referral Reward from Offer',
      status,
      holdUntil,
      externalId: referralExternalId(rewardTx.conversionId),
      metadata: {
        sourceUserId: user._id,
        rewardTransactionId: rewardTx._id,
      },
    },
  });
  return transaction;
};

const processReward = async ({
  conversion,
  conversionId,
  models = {},
  hooks = {},
  runInTransaction,
  failurePoint = '',
} = {}) => {
  const conversionModel = models.Conversion || Conversion;
  const clickLogModel = models.ClickLog || ClickLog;
  const directOfferModel = models.DirectOffer || DirectOffer;
  const settingsModel = models.Settings || Settings;
  const transactionModel = models.Transaction || Transaction;
  const userModel = models.User || User;

  const sideEffects = [];
  const result = await runAtomic(async ({ session, strategy }) => {
    if (failurePoint === 'before-claim') throw new Error('Injected reward failure before claim.');

    const initialConversion = await loadConversion(conversionModel, conversion || conversionId, session);
    if (!initialConversion) return { ok: false, reason: 'Conversion not found.', strategy };
    if (initialConversion.internalStatus !== 'approved') return { ok: false, reason: 'Conversion is not approved.', conversion: initialConversion, strategy };
    if (initialConversion.processingState === 'processed' && initialConversion.rewardTransactionId) {
      const existingReward = await queryOne(transactionModel.findById(initialConversion.rewardTransactionId), session);
      return { ok: true, duplicate: true, conversion: initialConversion, rewardTransaction: existingReward, strategy };
    }
    if (['reversed', 'reversal_processing'].includes(initialConversion.processingState) || initialConversion.internalStatus === 'reversed') {
      return { ok: false, reason: 'Reversed conversion cannot be rewarded.', conversion: initialConversion, strategy };
    }

    const claimed = await claimRewardConversion(conversionModel, initialConversion._id, session);
    if (!claimed) {
      const current = await queryOne(conversionModel.findById(initialConversion._id), session);
      if (current?.processingState === 'processed' && current.rewardTransactionId) {
        const existingReward = await queryOne(transactionModel.findById(current.rewardTransactionId), session);
        return { ok: true, duplicate: true, conversion: current, rewardTransaction: existingReward, strategy };
      }
      return { ok: false, reason: 'Conversion is not eligible for reward claim.', conversion: current || initialConversion, strategy };
    }

    try {
      if (failurePoint === 'after-claim-before-transaction') throw new Error('Injected reward failure after claim.');

      const clickLog = await queryOne(clickLogModel.findById(claimed.clickLogId), session);
      if (!clickLog) throw new Error('Tracked click not found for reward.');
      const user = await queryOne(userModel.findById(claimed.userId), session);
      if (!user) throw new Error('User not found for reward.');
      if (user.isBanned) throw new Error('Banned user cannot receive reward.');

      const rewardAmount = Number(clickLog.rewardAmount || claimed.rewardAmount || 0);
      if (!Number.isFinite(rewardAmount) || rewardAmount <= 0) throw new Error('Invalid trusted reward amount.');
      const externalId = rewardExternalId(claimed._id);
      const balanceBefore = user.walletBalance || 0;

      const { transaction: rewardTx } = await createTransactionIdempotent({
        transactionModel,
        session,
        payload: {
          userId: user._id,
          transactionType: 'direct_offer_reward',
          amount: rewardAmount,
          balanceAfter: balanceBefore,
          description: `Direct offer reward${clickLog.offerId ? '' : ' conversion'}`,
          status: 'pending',
          sourceType: 'offer',
          sourceId: claimed.offerId || clickLog.offerId || claimed.campaignId || null,
          conversionId: claimed._id,
          metadata: {
            clickId: claimed.clickId,
            providerId: claimed.providerId,
            advertiserTransactionId: claimed.providerTransactionId,
            advertiserPayout: claimed.payout?.amount || 0,
            walletApplied: false,
          },
          externalId,
        },
      });

      if (failurePoint === 'after-transaction-before-wallet') throw new Error('Injected reward failure after transaction.');

      const updatedUser = await userModel.findOneAndUpdate(
        { _id: user._id },
        { $inc: { walletBalance: rewardAmount, totalEarned: rewardAmount } },
        { new: true, session }
      );
      if (!updatedUser) throw new Error('Failed to update user wallet.');

      if (failurePoint === 'after-wallet-before-finalize') throw new Error('Injected reward failure after wallet.');

      rewardTx.status = 'completed';
      rewardTx.balanceAfter = updatedUser.walletBalance;
      rewardTx.metadata = { ...(rewardTx.metadata || {}), walletApplied: true };
      if (typeof rewardTx.save === 'function') await rewardTx.save({ session });

      await clickLogModel.findByIdAndUpdate(
        clickLog._id,
        {
          $set: {
            status: 'approved',
            convertedAt: new Date(),
            advertiserPayout: claimed.payout?.amount || 0,
            transactionId: rewardTx._id,
          },
        },
        { session }
      );

      const finalized = await conversionModel.findByIdAndUpdate(
        claimed._id,
        {
          $set: {
            processingState: 'processed',
            rewardTransactionId: rewardTx._id,
            rewardAmount,
            errorReason: '',
          },
        },
        { new: true, session }
      );

      if (claimed.offerId) {
        await directOfferModel.findByIdAndUpdate(claimed.offerId, { $inc: { totalApproved: 1 } }, { session });
      }

      const referralTransaction = await createReferralReward({
        settingsModel,
        transactionModel,
        userModel,
        rewardTx,
        user,
        rewardAmount,
        session,
      });

      sideEffects.push({ user: updatedUser, rewardAmount, rewardTx, referralTransaction });
      return { ok: true, duplicate: false, conversion: finalized || applyUpdate(claimed, { $set: { processingState: 'processed', rewardTransactionId: rewardTx._id } }), rewardTransaction: rewardTx, referralTransaction, walletBalance: updatedUser.walletBalance, strategy };
    } catch (error) {
      await markRewardFailed(conversionModel, claimed._id, error, session);
      throw error;
    }
  }, { runInTransaction });

  for (const effect of sideEffects) {
    try {
      await (hooks.notify || notify)(
        effect.user._id,
        'direct_offer_reward',
        'Offer Completed!',
        `You earned ${effect.rewardAmount.toLocaleString()} coins from an offer.`,
        { txId: effect.rewardTx._id, amount: effect.rewardAmount }
      );
      (hooks.emitWalletUpdate || emitWalletUpdate)(effect.user.firebaseUid, effect.user.walletBalance);
      await (hooks.processVipLevelUp || processVipLevelUp)(effect.user, effect.rewardAmount, emitToUser);
    } catch (error) {
      console.error('[rewardService] Post-commit side effect failed:', error.message);
    }
  }

  return result;
};

module.exports = {
  processReward,
  referralExternalId,
  rewardExternalId,
};
