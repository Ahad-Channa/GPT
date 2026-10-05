const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const notify = require('./notify');
const { REAL_OFFER_EARNING_TYPES } = require('./earningTypes');

const RELEASE_STALE_MS = 15 * 60 * 1000;

const buildReleaseClaimQuery = (txId, now) => ({
  _id: txId,
  transactionType: { $in: REAL_OFFER_EARNING_TYPES },
  status: 'hold',
  holdUntil: { $lte: now },
  'metadata.walletApplied': { $ne: true },
  'metadata.reversalApplied': { $ne: true },
  $or: [
    { 'metadata.releaseState': { $exists: false } },
    { 'metadata.releaseState': { $ne: 'processing' } },
    { 'metadata.releaseClaimedAt': { $lte: new Date(now.getTime() - RELEASE_STALE_MS) } },
  ],
});

const extractOfferTitle = (description = '') => {
  let offerTitle = description || 'an offer';
  if (description.includes('Custom Offer Reward: ')) {
    offerTitle = description.replace('Custom Offer Reward: ', '');
  } else if (description.includes('Reward for custom offer: ')) {
    offerTitle = description.replace('Reward for custom offer: ', '');
  } else if (description.includes('Manual reward: ')) {
    offerTitle = description.replace('Manual reward: ', '');
  }
  return offerTitle;
};

const releaseEarningHoldTransaction = async ({
  tx,
  now = new Date(),
  models = {},
  hooks = {},
} = {}) => {
  const transactionModel = models.Transaction || Transaction;
  const userModel = models.User || User;
  const notifyFn = hooks.notify || notify;
  const txId = tx?._id || tx;

  const claimedTx = await transactionModel.findOneAndUpdate(
    buildReleaseClaimQuery(txId, now),
    {
      $set: {
        'metadata.releaseState': 'processing',
        'metadata.releaseClaimedAt': now,
      },
    },
    { new: true }
  );

  if (!claimedTx) {
    return { released: false, reason: 'not_eligible_or_already_claimed' };
  }

  const updatedUser = await userModel.findOneAndUpdate(
    {
      _id: claimedTx.userId,
      releasedEarningHoldTransactionIds: { $ne: claimedTx._id },
    },
    {
      $inc: { walletBalance: claimedTx.amount },
      $addToSet: { releasedEarningHoldTransactionIds: claimedTx._id },
    },
    { new: true }
  );

  if (!updatedUser) {
    const currentUser = await userModel.findById(claimedTx.userId);
    if (!currentUser) {
      await transactionModel.findOneAndUpdate(
        {
          _id: claimedTx._id,
          status: 'hold',
          'metadata.releaseState': 'processing',
        },
        {
          $set: {
            'metadata.releaseState': 'failed',
            'metadata.releaseError': 'User not found for earning hold release.',
          },
        },
        { new: true }
      );
      return { released: false, reason: 'user_not_found', transaction: claimedTx };
    }
    const finalizedDuplicate = await transactionModel.findOneAndUpdate(
      {
        _id: claimedTx._id,
        status: 'hold',
        'metadata.releaseState': 'processing',
      },
      {
        $set: {
          status: 'completed',
          balanceAfter: currentUser?.walletBalance ?? claimedTx.balanceAfter,
          'metadata.releaseState': 'completed',
          'metadata.walletApplied': true,
          'metadata.releasedAt': now.toISOString(),
        },
      },
      { new: true }
    );
    return {
      released: false,
      duplicate: true,
      transaction: finalizedDuplicate || claimedTx,
      user: currentUser,
    };
  }

  const finalizedTx = await transactionModel.findOneAndUpdate(
    {
      _id: claimedTx._id,
      status: 'hold',
      'metadata.releaseState': 'processing',
    },
    {
      $set: {
        status: 'completed',
        balanceAfter: updatedUser.walletBalance,
        'metadata.releaseState': 'completed',
        'metadata.walletApplied': true,
        'metadata.releasedAt': now.toISOString(),
      },
    },
    { new: true }
  );

  let notificationError = null;
  try {
    const offerTitle = extractOfferTitle(claimedTx.description);
    await notifyFn(
      updatedUser._id,
      'earning_released',
      'Earning Hold Released!',
      `Your held reward for "${offerTitle}" has been released! +${claimedTx.amount} coins have been credited to your wallet.`,
      { amount: claimedTx.amount, txId: claimedTx._id }
    );
  } catch (error) {
    notificationError = error;
    console.error('[earningHoldJob] Release notification failed:', error.message);
  }

  return {
    released: true,
    transaction: finalizedTx || claimedTx,
    user: updatedUser,
    notificationError,
  };
};

const releaseEligibleEarningHolds = async ({
  now = new Date(),
  models = {},
  hooks = {},
  logger = console,
} = {}) => {
  const transactionModel = models.Transaction || Transaction;
  const eligibleHolds = await transactionModel.find({
    transactionType: { $in: REAL_OFFER_EARNING_TYPES },
    status: 'hold',
    holdUntil: { $lte: now },
    'metadata.walletApplied': { $ne: true },
    'metadata.reversalApplied': { $ne: true },
  });

  if (eligibleHolds.length === 0) {
    logger.log('[CRON] No earning holds to release today.');
    return { scanned: 0, released: 0 };
  }

  logger.log(`[CRON] Found ${eligibleHolds.length} earning hold(s) ready for release.`);

  let releasedCount = 0;
  for (const tx of eligibleHolds) {
    const result = await releaseEarningHoldTransaction({ tx, now, models, hooks });
    if (result.released) releasedCount++;
  }

  logger.log(`[CRON] Successfully released ${releasedCount} earning holds.`);
  return { scanned: eligibleHolds.length, released: releasedCount };
};

/**
 * Runs daily at midnight UTC
 * Sweeps real offer earning transactions with status 'hold'
 * where 'holdUntil' <= now, and credits the user.
 */
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily earning hold release...');
    try {
      await releaseEligibleEarningHolds();
    } catch (error) {
      console.error('[CRON] Error during earning hold release:', error);
    }
  }, { timezone: 'UTC' });
}

module.exports = {
  buildReleaseClaimQuery,
  releaseEarningHoldTransaction,
  releaseEligibleEarningHolds,
};
