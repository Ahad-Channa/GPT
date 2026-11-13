// Compact primary/secondary labels for the Live Feed (and reusable elsewhere).
//
// Rules (client-confirmed):
// - Direct Offer, single-step: primary = actual offer title, secondary = "Direct Offer"
// - Direct Offer, multi-step:  primary = paid step/goal label, secondary = "Direct Offer"
//   (the parent offer title is intentionally NOT shown as the secondary line)
// - Offerwall: primary = campaign/offer title if available, else provider name;
//   secondary = provider name only when it differs from the primary
// - Custom/manual: primary = actual offer title, secondary = "Custom Offer"
// - Never duplicate the same text on both lines.
const clean = (value) => String(value ?? '').trim();

// Legacy descriptions sometimes carry the old generic suffix, e.g.
// "QA Offer - Offer Reward"; strip it for display fallbacks.
import { formatGoalLabel, humanizeGoalKey } from './offerGoalDisplay.js';

const cleanDescription = (value) =>
  clean(value).replace(/\s*-\s*(offer reward|direct offer reward)\s*$/i, '').trim();

const stripCustomPrefix = (value) =>
  value
    .replace(/^custom offer reward:\s*/i, '')
    .replace(/^reward for custom offer:\s*/i, '')
    .trim();

const isGenericDescription = (value) =>
  /^(offer reward|direct offer reward|offer reward on hold|offer completed!?|offer credited|custom offer reward)$/i.test(clean(value));

export const getEarningDisplay = (tx = {}) => {
  const meta = tx.metadata || {};
  const type = tx.transactionType || '';
  const description = cleanDescription(tx.description);
  const providerName = clean(meta.providerName) || clean(meta.providerId);
  const offerTitle = clean(meta.offerTitle) || (type === 'custom_offer_reward' ? stripCustomPrefix(description) : '');
  const rawStepLabel = clean(meta.stepLabel) || clean(meta.goalLabel);
  const stepLabel = rawStepLabel
    ? formatGoalLabel({ goalKey: meta.goalKey, label: rawStepLabel })
    : '';

  const finish = (primary, secondary, lastResort = '') => {
    let p = clean(primary);
    let s = clean(secondary);
    if (!p) p = s || (isGenericDescription(description) ? '' : description) || lastResort;
    if (s && s.toLowerCase() === p.toLowerCase()) s = '';
    return { primary: p, secondary: s };
  };

  if (type === 'direct_offer_reward') {
    if (stepLabel) return finish(stepLabel);
    const title = offerTitle || (isGenericDescription(description) ? '' : description);
    return finish(title);
  }

  if (type === 'custom_offer_reward') {
    const title = offerTitle || (isGenericDescription(description) ? '' : description);
    return finish(title);
  }

  if (type === 'offer_reward') {
    if (stepLabel) return finish(stepLabel);
    const campaign = clean(meta.campaignTitle) || clean(meta.offerTitle) || clean(meta.campaign);
    const primary = campaign || providerName || (isGenericDescription(description) ? '' : description);
    const secondary = campaign && providerName ? providerName : '';
    return finish(primary, secondary, 'Offer');
  }

  return { primary: description, secondary: '' };
};

const DIRECT_OFFER_SOURCE_LABEL = 'Goodpicks';

const GENERIC_STEP_LABEL =
  /^(offer reward|direct offer reward|offer|reward|completed( offer)?|complete step|completed step|step reward|task reward)$/i;

const isMachineLabel = (value) => {
  const raw = clean(value);
  if (!raw) return false;
  return /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(raw) || /[a-z][A-Z]/.test(raw);
};

// Offerwall/direct step labels are snapshotted from provider payloads and admin
// goal configs. Some providers send raw event IDs; humanize those for display
// only, never mutate the stored value.
const resolveLiveStepLabel = (meta = {}) => {
  const raw = clean(meta.stepLabel) || clean(meta.goalLabel);
  if (!raw || GENERIC_STEP_LABEL.test(raw)) return '';

  const formatted = formatGoalLabel({ goalKey: meta.goalKey, label: raw });
  if (formatted && formatted !== raw) return formatted;
  return isMachineLabel(raw) ? humanizeGoalKey(raw) : raw;
};

const resolveLiveProviderName = (meta = {}) => {
  const explicit = clean(meta.providerName);
  if (explicit) {
    return explicit.toLowerCase() === 'direct' ? DIRECT_OFFER_SOURCE_LABEL : explicit;
  }

  const providerId = clean(meta.providerId);
  if (providerId) {
    if (providerId.toLowerCase() === 'direct') return DIRECT_OFFER_SOURCE_LABEL;
    return humanizeGoalKey(providerId) || providerId;
  }

  // Older offerwall rows stored only this legacy field.
  return clean(meta.offerwall);
};

const isGenericLiveDescription = (value) => {
  const description = clean(value);
  return isGenericDescription(description) || /^direct offer reward( conversion)?$/i.test(description);
};

const resolveLiveOfferDetail = (tx = {}, meta = {}) => {
  const step = resolveLiveStepLabel(meta);
  if (step) return step;

  const offerTitle = clean(meta.offerTitle) || clean(meta.campaignTitle) || clean(meta.campaign);
  if (offerTitle) return offerTitle;

  const description = cleanDescription(tx.description);
  if (description && !isGenericLiveDescription(description)) return description;

  return 'Offer';
};

// Two-line source/detail labels for the live-feed chip. Kept separate from
// getEarningDisplay() because transaction history/profile views intentionally
// use the offer/step as their primary label.
export const getLiveFeedDisplay = (tx = {}) => {
  const type = tx.transactionType || '';
  if (type !== 'offer_reward' && type !== 'direct_offer_reward') return null;

  const meta = tx.metadata || {};
  const provider = type === 'direct_offer_reward'
    ? DIRECT_OFFER_SOURCE_LABEL
    : resolveLiveProviderName(meta);
  const providerText = provider.replace(/^offerwall:\s*/i, '').trim();
  const sourceLine = type === 'direct_offer_reward'
    ? DIRECT_OFFER_SOURCE_LABEL
    : (providerText ? `Offerwall: ${providerText}` : 'Offerwall');

  let detailLine = resolveLiveOfferDetail(tx, meta);
  if (provider && detailLine.toLowerCase() === provider.toLowerCase()) detailLine = 'Offer';

  return { sourceLine, detailLine };
};

export default getEarningDisplay;
