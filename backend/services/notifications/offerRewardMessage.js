const OFFER_EARNING_TYPES = new Set(['offer_reward', 'custom_offer_reward', 'direct_offer_reward']);

const clean = (value) => String(value || '').trim();

const getHoldDays = (transaction) => {
  const metadataDays = Number(transaction?.metadata?.holdDays);
  if (Number.isFinite(metadataDays) && metadataDays > 0) return Math.ceil(metadataDays);

  if (transaction?.holdUntil && transaction?.createdAt) {
    const duration = new Date(transaction.holdUntil).getTime() - new Date(transaction.createdAt).getTime();
    if (Number.isFinite(duration) && duration > 0) {
      return Math.max(1, Math.ceil(duration / (24 * 60 * 60 * 1000)));
    }
  }
  return 0;
};

const buildOfferRewardMessage = (transaction) => {
  if (!transaction || !OFFER_EARNING_TYPES.has(transaction.transactionType) || Number(transaction.amount) <= 0) {
    return null;
  }

  const metadata = transaction.metadata || {};
  const step = clean(metadata.stepLabel || metadata.goalLabel);
  const offerTitle = clean(metadata.offerTitle || metadata.campaignTitle || metadata.campaign);
  const providerName = clean(metadata.providerName || metadata.providerId);
  let message;

  if (transaction.transactionType === 'direct_offer_reward') {
    const label = step || offerTitle || clean(transaction.description);
    if (!label || /^(direct offer reward|offer reward)$/i.test(label)) return null;
    message = `You earned +${Number(transaction.amount).toLocaleString()} coins for completing "${label}".`;
  } else if (transaction.transactionType === 'custom_offer_reward') {
    const label = offerTitle || clean(transaction.description).replace(/^(custom offer reward:|reward for custom offer:)/i, '').trim();
    if (!label || /^(custom offer reward|offer reward)$/i.test(label)) return null;
    message = `You earned +${Number(transaction.amount).toLocaleString()} coins for "${label}".`;
  } else if (offerTitle) {
    message = `You earned +${Number(transaction.amount).toLocaleString()} coins for "${offerTitle}"${providerName ? ` via ${providerName}` : ''}.`;
  } else if (providerName) {
    message = `You earned +${Number(transaction.amount).toLocaleString()} coins from ${providerName}.`;
  } else {
    return null;
  }

  const holdDays = getHoldDays(transaction);
  const isHeld = transaction.status === 'hold' && holdDays > 0;
  message += isHeld
    ? ` It is on hold for ${holdDays} days.`
    : ' The reward is available now.';
  return message;
};

module.exports = { buildOfferRewardMessage, getHoldDays };
