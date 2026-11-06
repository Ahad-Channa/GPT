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
import { formatGoalLabel } from './offerGoalDisplay.js';

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
    return finish(title, 'Custom Offer');
  }

  if (type === 'offer_reward') {
    const campaign = clean(meta.campaignTitle) || clean(meta.offerTitle) || clean(meta.campaign);
    const primary = campaign || providerName || (isGenericDescription(description) ? '' : description);
    const secondary = campaign && providerName ? providerName : '';
    return finish(primary, secondary, 'Offer');
  }

  return { primary: description, secondary: '' };
};

export default getEarningDisplay;
