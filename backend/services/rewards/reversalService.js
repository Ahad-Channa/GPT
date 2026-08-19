const Conversion = require('../../models/Conversion');
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const notify = require('../../utils/notify');
const { emitWalletUpdate } = require('../../utils/walletEvents');
const { createOne, runAtomic, withSession } = require('./atomicRunner');
const { referralExternalId, rewardExternalId } = require('./rewardService');

const reversalExternalId = (conversionId) => `conversion:${conversionId}:reversal`;
const referralReversalExternalId = (conversionId) => `conversion:${conversionId}:referral-reversal`;

const queryOne = async (query, session) => withSession(query, session);

const findTransactionByExternalId = (transactionModel, externalId, session) =>
  queryOne(transactionModel.findOne({ externalId }), session);

const ensureSameTransactionIntent = (existing, payload) => {
  if (!existing) return;
  const sameConversion = String(existing.conversionId || '') === String(payload.conversionId || '');
  const sameUser = String(existing.userId || '') === String(payload.userId || '');
  const sameType = existing.transactionType === payload.transactionType;
  const sameAmount = Number(existing.amount) === Number(payload.amount);
  if (!sameConversion || !sameUser || !sameType || !sameAmount) {
    throw new Error(`Conflicting transaction exists for externalId ${payload.externalId}.`);
  }
};

const createTransactionIdempotent = async ({ transactionModel, payload, session }) => {
  const existing = await findTransactionByExternalId(transactionModel, payload.externalId, session);
  if (existing) {
    ensureSameTransactionIntent(existing, payload);
    return { transaction: existing, created: false };
  }
  try {
    return { transaction: await createOne(transactionModel, payload, session), created: true };
  } catch (error) {
    if (error?.code === 11000) {
      const transaction = await findTransactionByExternalId(transactionModel, payload.externalId, session);
      if (transaction) {
        ensureSameTransactionIntent(transaction, payload);
        return { transaction, created: false };
      }
    }
    throw error;
  }
};

const loadConversion = async (conversionModel, conversionOrId, session) => {
  if (conversionOrId && typeof conversionOrId === 'object' && conversionOrId._id) return conversionOrId;
  return queryOne(conversionModel.findById(conversionOrId), session);
};

const claimReversalConversion = async (conversionModel, conversionId, session) =>
  conversionModel.findOneAndUpdate(
    {
      _id: conversionId,
      internalStatus: 'reversed',
      processingState: { $in: ['processed', 'reversal_failed'] },
      rewardTransactionId: { $ne: null },
      reversalTransactionId: null,
    },
    { $set: { processingState: 'reversal_processing', errorReason: '' } },
    { new: true, session }
  );

const reverseReferralReward = async ({ conversion, rewardTx, transactionModel, userModel, session }) => {
  const referralTx = await findTransactionByExternalId(transactionModel, referralExternalId(conversion._id), session);
  if (!referralTx || referralTx.status === 'reversed') return null;

  let balanceAfter = referralTx.balanceAfter || 0;
  const { transaction } = await createTransactionIdempotent({
    transactionModel,
    session,
    payload: {
      userId: referralTx.userId,
      transactionType: 'chargeback',
      amount: -Math.abs(referralTx.amount),
      balanceAfter,
      description: 'Referral reward reversed after offer chargeback',
      status: 'pending',
      sourceType: 'chargeback',
      sourceId: rewardTx._id,
      linkedTransactionId: referralTx._id,
      conversionId: conversion._id,
      reversalOfConversionId: conversion._id,
      externalId: referralReversalExternalId(conversion._id),
      metadata: {
        originalReferralTransactionId: referralTx._id,
        originalRewardTransactionId: rewardTx._id,
        walletApplied: false,
      },
    },
  });

  if (referralTx.metadata?.reversalApplied === true) return null;

  const referralWalletWasApplied = referralTx.status === 'completed';
  if (referralWalletWasApplied) {
    const updatedReferrer = await userModel.findOneAndUpdate(
      { _id: referralTx.userId, appliedFinancialTransactionIds: { $ne: transaction._id } },
      {
        $inc: { walletBalance: -Math.abs(referralTx.amount), referralEarnings: -Math.abs(referralTx.amount) },
        $addToSet: { appliedFinancialTransactionIds: transaction._id },
      },
      { new: true, session }
    );
    balanceAfter = updatedReferrer?.walletBalance ?? balanceAfter;
  } else {
    const updatedReferrer = await userModel.findOneAndUpdate(
      { _id: referralTx.userId, appliedFinancialTransactionIds: { $ne: transaction._id } },
      {
        $inc: { referralEarnings: -Math.abs(referralTx.amount) },
        $addToSet: { appliedFinancialTransactionIds: transaction._id },
      },
      { new: true, session }
    );
    balanceAfter = updatedReferrer?.walletBalance ?? balanceAfter;
  }

  referralTx.status = 'reversed';
  referralTx.metadata = { ...(referralTx.metadata || {}), reversalApplied: true };
  if (typeof referralTx.save === 'function') await referralTx.save({ session });

  transaction.status = 'completed';
  transaction.balanceAfter = balanceAfter;
  transaction.metadata = {
    ...(transaction.metadata || {}),
    walletApplied: referralWalletWasApplied,
  };
  if (typeof transaction.save === 'function') await transaction.save({ session });
  return transaction;
};

const processReversal = async ({
  conversion,
  conversionId,
  models = {},
  hooks = {},
  runInTransaction,
  failurePoint = '',
} = {}) => {
  const conversionModel = models.Conversion || Conversion;
  const transactionModel = models.Transaction || Transaction;
  const userModel = models.User || User;
  const sideEffects = [];

  const result = await runAtomic(async ({ session, strategy }) => {
    if (failurePoint === 'before-claim') throw new Error('Injected reversal failure before claim.');

    const initialConversion = await loadConversion(conversionModel, conversion || conversionId, session);
    if (!initialConversion) return { ok: false, reason: 'Conversion not found.', strategy };
    if (initialConversion.internalStatus !== 'reversed') return { ok: false, reason: 'Conversion is not reversed.', conversion: initialConversion, strategy };
    if (!initialConversion.rewardTransactionId) return { ok: false, reason: 'Reward transaction is missing for reversal.', conversion: initialConversion, strategy };
    if (initialConversion.processingState === 'reversed' && initialConversion.reversalTransactionId) {
      const existingReversal = await queryOne(transactionModel.findById(initialConversion.reversalTransactionId), session);
      return { ok: true, duplicate: true, conversion: initialConversion, reversalTransaction: existingReversal, strategy };
    }

    const claimed = await claimReversalConversion(conversionModel, initialConversion._id, session);
    if (!claimed) {
      const current = await queryOne(conversionModel.findById(initialConversion._id), session);
      if (current?.processingState === 'reversed' && current.reversalTransactionId) {
        const existingReversal = await queryOne(transactionModel.findById(current.reversalTransactionId), session);
        return { ok: true, duplicate: true, conversion: current, reversalTransaction: existingReversal, strategy };
      }
      return { ok: false, reason: 'Conversion is not eligible for reversal claim.', conversion: current || initialConversion, strategy };
    }

    try {
      if (failurePoint === 'after-claim-before-transaction') throw new Error('Injected reversal failure after claim.');

      const rewardTx = await queryOne(transactionModel.findById(claimed.rewardTransactionId), session);
      const rewardAlreadyMarkedReversed = rewardTx?.status === 'reversed' && rewardTx.metadata?.reversalApplied === true;
      if (!rewardTx || (!['completed', 'hold'].includes(rewardTx.status) && !rewardAlreadyMarkedReversed)) {
        throw new Error('Original reward transaction is not completed or held.');
      }
      if (rewardTx.status === 'hold' && rewardTx.metadata?.releaseState === 'processing') {
        throw new Error('Original reward transaction is being released; retry reversal.');
      }
      if (String(rewardTx.conversionId || '') !== String(claimed._id)) throw new Error('Reward transaction does not match conversion.');

      const user = await queryOne(userModel.findById(claimed.userId), session);
      if (!user) throw new Error('User not found for reversal.');
      const reversalAmount = -Math.abs(rewardTx.amount);
      const walletWasApplied = rewardTx.status === 'completed' && rewardTx.metadata?.walletApplied !== false;
      const walletDelta = walletWasApplied ? reversalAmount : 0;

      const { transaction: reversalTx } = await createTransactionIdempotent({
        transactionModel,
        session,
        payload: {
          userId: user._id,
          transactionType: 'chargeback',
          amount: reversalAmount,
          balanceAfter: user.walletBalance || 0,
          description: 'Offer reward reversed',
          status: 'pending',
          sourceType: 'chargeback',
          sourceId: rewardTx._id,
          linkedTransactionId: rewardTx._id,
          conversionId: claimed._id,
          reversalOfConversionId: claimed._id,
          externalId: reversalExternalId(claimed._id),
      metadata: {
        originalRewardTransactionId: rewardTx._id,
        walletApplied: false,
          },
        },
      });

      if (failurePoint === 'after-transaction-before-wallet') throw new Error('Injected reversal failure after transaction.');

      const updatedUser = await userModel.findOneAndUpdate(
        { _id: user._id, appliedFinancialTransactionIds: { $ne: reversalTx._id } },
        {
          $inc: { walletBalance: walletDelta, totalEarned: reversalAmount },
          $addToSet: { appliedFinancialTransactionIds: reversalTx._id },
        },
        { new: true, session }
      );
      const effectiveUser = updatedUser || await queryOne(userModel.findById(user._id), session);
      if (!effectiveUser) throw new Error('Failed to deduct user wallet.');

      if (failurePoint === 'after-wallet-before-finalize') throw new Error('Injected reversal failure after wallet.');

      reversalTx.status = 'completed';
      reversalTx.balanceAfter = effectiveUser.walletBalance;
      reversalTx.metadata = { ...(reversalTx.metadata || {}), walletApplied: walletWasApplied };
      if (typeof reversalTx.save === 'function') await reversalTx.save({ session });

      rewardTx.status = 'reversed';
      rewardTx.metadata = { ...(rewardTx.metadata || {}), reversalApplied: true };
      if (typeof rewardTx.save === 'function') await rewardTx.save({ session });

      const referralReversalTransaction = await reverseReferralReward({
        conversion: claimed,
        rewardTx,
        transactionModel,
        userModel,
        session,
      });

      const finalized = await conversionModel.findByIdAndUpdate(
        claimed._id,
        {
          $set: {
            processingState: 'reversed',
            reversalTransactionId: reversalTx._id,
            errorReason: '',
          },
        },
        { new: true, session }
      );

      sideEffects.push({ user: effectiveUser, reversalAmount, reversalTx });
      return { ok: true, duplicate: false, conversion: finalized || claimed, reversalTransaction: reversalTx, referralReversalTransaction, walletBalance: effectiveUser.walletBalance, strategy };
    } catch (error) {
      await conversionModel.findByIdAndUpdate(
        claimed._id,
        { $set: { processingState: 'reversal_failed', errorReason: error.message || 'Reversal processing failed.' } },
        { session }
      );
      throw error;
    }
  }, { runInTransaction });

  for (const effect of sideEffects) {
    try {
      await (hooks.notify || notify)(
        effect.user._id,
        'chargeback',
        'Offer Chargebacked',
        `A previously approved offer was reversed: ${effect.reversalAmount.toLocaleString()} coins.`,
        { txId: effect.reversalTx._id, amount: effect.reversalAmount }
      );
      (hooks.emitWalletUpdate || emitWalletUpdate)(effect.user.firebaseUid, effect.user.walletBalance);
    } catch (error) {
      console.error('[reversalService] Post-commit side effect failed:', error.message);
    }
  }

  return result;
};

module.exports = {
  processReversal,
  referralReversalExternalId,
  reversalExternalId,
};
