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

const DEFAULT_EARNING_HOLD_DAYS = 30;

const toNonNegativeNumber = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
};

const isCustomHoldEnabled = (config) =>
  Boolean(config && typeof config === 'object' && config.holdEnabled === true);

const normalizeGlobalHoldConfig = (config = {}) => ({
  enabled: Boolean(config?.enabled),
  threshold: toNonNegativeNumber(config?.threshold, 0),
  holdDays: toNonNegativeNumber(config?.holdDays, DEFAULT_EARNING_HOLD_DAYS),
});

const normalizeCustomHoldConfig = (config = {}) => ({
  enabled: true,
  threshold: toNonNegativeNumber(config?.holdThreshold, 0),
  holdDays: toNonNegativeNumber(config?.holdDays, DEFAULT_EARNING_HOLD_DAYS),
});

// Resolves which hold policy applies to a reward. Direct Offer overrides take
// priority over offerwall provider overrides, which take priority over the
// global earning hold config. A custom policy is only active when its
// holdEnabled flag is explicitly true; otherwise legacy/global behavior applies.
const resolveEarningHoldConfig = ({ globalConfig, providerConfig, directOfferConfig } = {}) => {
  if (isCustomHoldEnabled(directOfferConfig)) return normalizeCustomHoldConfig(directOfferConfig);
  if (isCustomHoldEnabled(providerConfig)) return normalizeCustomHoldConfig(providerConfig);
  return normalizeGlobalHoldConfig(globalConfig);
};

const getEarningHoldDecision = (settings, rewardAmount, now = new Date(), options = {}) => {
  const config = resolveEarningHoldConfig({
    globalConfig: settings?.earningHoldConfig,
    providerConfig: options?.providerConfig,
    directOfferConfig: options?.directOfferConfig,
  });
  const threshold = Number(config.threshold || 0);
  // Nullish handling is intentional: holdDays === 0 is a valid policy meaning
  // instant credit / no hold.
  const holdDays = config.holdDays ?? DEFAULT_EARNING_HOLD_DAYS;
  const shouldHold = Boolean(config.enabled) && holdDays > 0 && rewardAmount >= threshold;
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
  resolveEarningHoldConfig,
};
