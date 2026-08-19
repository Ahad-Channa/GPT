const REAL_OFFER_EARNING_TYPES = Object.freeze([
  'offer_reward',
  'custom_offer_reward',
  'direct_offer_reward',
]);

const REAL_EARNING_REVERSAL_TYPES = Object.freeze([
  'chargeback',
]);

const ACTIVE_EARNING_STATUSES = Object.freeze([
  'completed',
  'hold',
]);

const COMPLETED_EARNING_STATUS = 'completed';

const NET_REAL_EARNING_TYPES = Object.freeze([
  ...REAL_OFFER_EARNING_TYPES,
  ...REAL_EARNING_REVERSAL_TYPES,
]);

const isRealOfferEarningType = (transactionType) =>
  REAL_OFFER_EARNING_TYPES.includes(transactionType);

const isRealEarningReversalType = (transactionType) =>
  REAL_EARNING_REVERSAL_TYPES.includes(transactionType);

const getEarningHoldDecision = (settings, rewardAmount, now = new Date()) => {
  const config = settings?.earningHoldConfig || {};
  const threshold = Number(config.threshold || 0);
  const holdDays = Number(config.holdDays || 30);
  const shouldHold = Boolean(config.enabled) && rewardAmount >= threshold;
  if (!shouldHold) {
    return {
      status: 'completed',
      holdUntil: null,
      walletCredit: rewardAmount,
      holdDays: 0,
    };
  }
  const holdUntil = new Date(now);
  holdUntil.setDate(holdUntil.getDate() + holdDays);
  return {
    status: 'hold',
    holdUntil,
    walletCredit: 0,
    holdDays,
  };
};

const getActiveRealOfferEarningMatch = (extra = {}) => ({
  ...extra,
  transactionType: { $in: [...REAL_OFFER_EARNING_TYPES] },
  amount: { $gt: 0 },
  status: { $in: [...ACTIVE_EARNING_STATUSES] },
});

const getCompletedRealOfferEarningMatch = (extra = {}) => ({
  ...extra,
  transactionType: { $in: [...REAL_OFFER_EARNING_TYPES] },
  amount: { $gt: 0 },
  status: COMPLETED_EARNING_STATUS,
});

module.exports = {
  ACTIVE_EARNING_STATUSES,
  COMPLETED_EARNING_STATUS,
  NET_REAL_EARNING_TYPES,
  REAL_EARNING_REVERSAL_TYPES,
  REAL_OFFER_EARNING_TYPES,
  getEarningHoldDecision,
  getActiveRealOfferEarningMatch,
  getCompletedRealOfferEarningMatch,
  isRealEarningReversalType,
  isRealOfferEarningType,
};
