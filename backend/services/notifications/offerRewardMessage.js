const OFFER_EARNING_TYPES = new Set(['offer_reward', 'custom_offer_reward', 'direct_offer_reward']);

const { humanizeDisplayLabel, humanizeMachineTokensInText } = require('../../utils/displayLabels');

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
  const step = humanizeDisplayLabel(metadata.stepLabel || metadata.goalLabel);
  const offerTitle = humanizeDisplayLabel(metadata.offerTitle || metadata.campaignTitle || metadata.campaign);
  const providerName = clean(metadata.providerName || metadata.providerId);
  let message;

  if (transaction.transactionType === 'direct_offer_reward') {
    const label = step || offerTitle || humanizeMachineTokensInText(clean(transaction.description));
    if (!label || /^(direct offer reward|offer reward)$/i.test(label)) return null;
    message = `You earned +${Number(transaction.amount).toLocaleString()} coins for completing "${label}".`;
  } else if (transaction.transactionType === 'custom_offer_reward') {
    const label = humanizeDisplayLabel(
      offerTitle || clean(transaction.description).replace(/^(custom offer reward:|reward for custom offer:)/i, '').trim()
    );
    if (!label || /^(custom offer reward|offer reward)$/i.test(label)) return null;
    message = `You earned +${Number(transaction.amount).toLocaleString()} coins for "${label}".`;
  } else if (offerTitle || step) {
    const label = step || offerTitle;
    message = `You earned +${Number(transaction.amount).toLocaleString()} coins for "${label}"${providerName ? ` via ${providerName}` : ''}.`;
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

const GENERIC_LABEL = /^(offer reward|direct offer reward|custom offer reward|offer completed!?|offer completion|offer)$/i;

// The offer a charged-back reward belonged to: "<offer>" for single-step offers,
// "<offer> - <step>" for multi-step offers. Display only; nothing is stored.
const getChargebackOfferLabel = (transaction) => {
  const metadata = transaction?.metadata || {};
  const title = humanizeDisplayLabel(metadata.offerTitle || metadata.campaignTitle || metadata.campaign);
  const rawStep = humanizeDisplayLabel(metadata.stepLabel || metadata.goalLabel);
  const step = rawStep && !GENERIC_LABEL.test(rawStep) && rawStep.toLowerCase() !== title.toLowerCase() ? rawStep : '';
  if (title) return step ? `${title} - ${step}` : title;

  const description = humanizeMachineTokensInText(clean(transaction?.description))
    .replace(/^(custom offer reward:|reward for custom offer:|manual reward:)\s*/i, '')
    .replace(/\s*-\s*(offer reward|direct offer reward)\s*$/i, '')
    .trim();
  if (description && !GENERIC_LABEL.test(description)) return description;
  return step || clean(metadata.providerName) || 'an offer';
};

// Notification for a chargeback, naming the offer (and step) so users know which
// reward was taken back, even weeks later.
const buildChargebackNotification = (transaction) => {
  const amount = Math.abs(Number(transaction?.amount) || 0);
  const label = getChargebackOfferLabel(transaction);
  const metadata = transaction?.metadata || {};
  return {
    title: 'Offer Chargeback',
    message: `Your reward for "${label}" was charged back: -${amount.toLocaleString('de-DE')} coins.`,
    metadata: {
      txId: transaction?._id,
      amount: -amount,
      offerLabel: label,
      offerTitle: metadata.offerTitle || metadata.campaignTitle || null,
      stepLabel: metadata.stepLabel || metadata.goalLabel || null,
    },
  };
};

module.exports = { buildOfferRewardMessage, buildChargebackNotification, getChargebackOfferLabel, getHoldDays };
