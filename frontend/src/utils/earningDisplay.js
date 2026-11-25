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
const GENERIC_DETAIL_FALLBACK = 'Offer details unavailable';

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

  // A raw event id ("fight_20_battles") becomes "Fight 20 Battles". This must come
  // before formatGoalLabel, which only swaps underscores for spaces and would leave
  // the text lowercase.
  if (isMachineLabel(raw)) return humanizeGoalKey(raw);

  const formatted = formatGoalLabel({ goalKey: meta.goalKey, label: raw });
  return formatted && formatted !== raw ? formatted : raw;
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

const isGenericLiveDescription = (value, provider = '') => {
  const description = clean(value);
  if (isGenericDescription(description) || /^direct offer reward( conversion)?$/i.test(description)) {
    return true;
  }

  // Legacy offerwall rows sometimes stored the provider name plus a generic
  // suffix instead of the campaign/step name (e.g. "Lootably Offer Reward").
  const providerText = clean(provider).replace(/^offerwall:\s*/i, '');
  if (!providerText) return false;
  const escapedProvider = providerText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escapedProvider}\\s*(?:[-:|]\\s*)?offer(?:\\s+reward)?$`, 'i').test(description);
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Descriptions that name no offer: generic copy, privacy-scrubbed copy
// ("Completed an Offer" / "Earned from <provider>") and provider-branded copy.
const isNonOfferDescription = (description, provider) =>
  isGenericLiveDescription(description, provider) ||
  /^(completed an offer|earned from .+)$/i.test(clean(description));

// The offer name for the feed's second line. It is NEVER the step name and
// never the provider name; when no offer name can be determined it returns
// GENERIC_DETAIL_FALLBACK.
const resolveLiveOfferName = (tx = {}, meta = {}, provider = '', type = '', rawStep = '') => {
  const offerTitle = clean(meta.offerTitle) || clean(meta.campaignTitle) || clean(meta.campaign);
  if (offerTitle) return offerTitle;

  let description = cleanDescription(tx.description);
  if (type === 'custom_offer_reward') description = stripCustomPrefix(description);
  // Direct multi-step rows were stored as "<offer> - <step>"; keep the offer part only.
  if (rawStep) {
    const suffix = new RegExp(`\\s*-\\s*${escapeRegExp(rawStep)}\\s*$`, 'i');
    if (suffix.test(description)) description = description.replace(suffix, '').trim();
    // Legacy rows whose whole description is the step do not carry an offer name.
    if (description.toLowerCase() === rawStep.toLowerCase()) description = '';
  }
  if (description && !isNonOfferDescription(description, provider)) return description;

  return GENERIC_DETAIL_FALLBACK;
};

// Two-line source/offer labels for the live-feed chip. Kept separate from
// getEarningDisplay() because transaction history/profile views intentionally
// use the offer/step as their primary label.
//
// Line 1 = provider ("Goodpicks" for direct/custom offers), line 2 = the offer
// name, always - also for multi-step offers. The completed step is returned
// separately as `stepLabel`, and `isMultiStep` is true, only for genuinely
// multi-step offers. Classification, in order of reliability:
//  - direct: `metadata.enabledGoalCount` (enabled goals in the immutable
//    click-time snapshot, written when the reward is created). Multi-step only
//    when a goalKey is present AND count > 1; a one-goal offer also has a
//    goalKey but is single-step. Count 0 = no goals = single-step.
//    LEGACY FALLBACK (rows written before enabledGoalCount existed): a goalKey
//    is treated as multi-step, because the step would otherwise be shown
//    nowhere in the feed. Old one-goal rows may therefore still show a
//    redundant popup until they age out of the 20-item feed.
//  - custom offers: always single-step.
//  - offerwall: `metadata.offerType` ('singlestep' | 'multistep') when the
//    provider supplies it (Lootably does). FALLBACK for providers/rows without
//    it: a usable step label that differs from the offer name marks multi-step
//    (providers only send step names for multi-step offers, but this is a
//    heuristic and cannot be verified from the data).
// Stored metadata is never modified; labels are formatted for display only.
export const getLiveFeedDisplay = (tx = {}) => {
  const type = tx.transactionType || '';
  if (type !== 'offer_reward' && type !== 'direct_offer_reward' && type !== 'custom_offer_reward') {
    return null;
  }

  const meta = tx.metadata || {};
  const isOwnOffer = type === 'direct_offer_reward' || type === 'custom_offer_reward';
  const provider = isOwnOffer ? DIRECT_OFFER_SOURCE_LABEL : resolveLiveProviderName(meta);
  const providerText = provider.replace(/^offerwall:\s*/i, '').trim();
  const sourceLine = isOwnOffer
    ? DIRECT_OFFER_SOURCE_LABEL
    : (providerText ? `Offerwall: ${providerText}` : 'Offerwall');

  const rawStep = clean(meta.stepLabel) || clean(meta.goalLabel);
  let detailLine = resolveLiveOfferName(tx, meta, provider, type, rawStep);
  if (provider && detailLine.toLowerCase() === provider.toLowerCase()) detailLine = GENERIC_DETAIL_FALLBACK;

  let stepLabel = resolveLiveStepLabel(meta);
  if (type === 'direct_offer_reward') {
    const goalKey = clean(meta.goalKey);
    const goalCount = meta.enabledGoalCount;
    const countKnown = Number.isInteger(goalCount) && goalCount >= 0;
    const isMulti = Boolean(goalKey) && (countKnown ? goalCount > 1 : true);
    if (!isMulti) stepLabel = '';
    else if (!stepLabel) stepLabel = humanizeGoalKey(goalKey);
  } else if (type === 'custom_offer_reward') {
    stepLabel = '';
  } else if (clean(meta.offerType).toLowerCase() === 'singlestep') {
    stepLabel = '';
  }
  if (stepLabel && (stepLabel.toLowerCase() === detailLine.toLowerCase() || stepLabel.toLowerCase() === providerText.toLowerCase())) {
    stepLabel = '';
  }

  return { sourceLine, detailLine, isMultiStep: Boolean(stepLabel), stepLabel };
};

// Same two lines as the live feed, for transaction lists (profile Recent
// Activity, wallet history): line 1 = "Goodpicks" / "Offerwall: <name>",
// line 2 = offer name, plus " - <step>" for multi-step offers, so it stays two
// lines. Returns null for non-offer transactions (callers keep their own text).
export const getTransactionLines = (tx = {}) => {
  const live = getLiveFeedDisplay(tx);
  if (!live) return null;
  return {
    primary: live.sourceLine,
    secondary: live.stepLabel ? `${live.detailLine} - ${live.stepLabel}` : live.detailLine,
  };
};

export default getEarningDisplay;
