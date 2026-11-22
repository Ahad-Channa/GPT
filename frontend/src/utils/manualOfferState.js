import { getOfferTranslation } from './offerTranslations.js';

// Offers the user started in this browser session. Keeps the proof area visible
// when a popup is closed and reopened before the offers list has been refetched.
// The server (submissionStatus / clickStatus) stays authoritative after a reload.
const locallyStartedManualOffers = new Set();

export const rememberManualOfferStarted = (offerId) => {
  if (offerId) locallyStartedManualOffers.add(String(offerId));
};

export const hasManualOfferStarted = (offer = {}) =>
  ['started', 'rejected'].includes(String(offer.submissionStatus || '').toLowerCase()) ||
  String(offer.clickStatus || '').toLowerCase() === 'clicked' ||
  (Boolean(offer._id) && locallyStartedManualOffers.has(String(offer._id)) &&
    !['pending', 'approved', 'chargebacked'].includes(String(offer.submissionStatus || '').toLowerCase()));

export const resolveProofInstructions = (offer = {}, language = 'en') =>
  String(getOfferTranslation(offer, language).proofInstructions || '').trim();

const hasText = (value) => String(value ?? '').trim().length > 0;

// True when the offer has proof instructions in at least one language, even if
// not in the requested one. Used to show a "translation unavailable" notice
// instead of silently hiding the instructions area.
export const hasAnyProofInstructions = (offer = {}) =>
  hasText(offer.proofInstructions) ||
  hasText(offer.proofInstructionsDe) ||
  Object.values(offer.translations && typeof offer.translations === 'object' ? offer.translations : {})
    .some((entry) => hasText(entry?.proofInstructions));

// { text, unavailable }: `unavailable` is true when instructions exist in some
// other language but not in the selected one. No other language is borrowed.
export const getProofInstructionsView = (offer = {}, language = 'en') => {
  const text = resolveProofInstructions(offer, language);
  return { text, unavailable: !text && hasAnyProofInstructions(offer) };
};

export const reserveOfferTab = () => {
  if (typeof window === 'undefined') return null;
  return window.open('about:blank', '_blank');
};

export const navigateReservedOfferTab = (tab, url) => {
  if (!tab || tab.closed || !url) return false;
  tab.location.href = url;
  try {
    tab.opener = null;
  } catch {
    // The opener may already be isolated by browser policy.
  }
  return true;
};

export const closeReservedOfferTab = (tab) => {
  if (tab && !tab.closed) tab.close();
};
