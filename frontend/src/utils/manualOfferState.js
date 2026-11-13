import { getOfferTranslation } from './offerTranslations';

export const hasManualOfferStarted = (offer = {}) =>
  ['started', 'rejected'].includes(String(offer.submissionStatus || '').toLowerCase()) ||
  String(offer.clickStatus || '').toLowerCase() === 'clicked';

export const resolveProofInstructions = (offer = {}, language = 'en') => {
  const localized = String(getOfferTranslation(offer, language).proofInstructions || '').trim();
  return localized || String(offer.proofInstructions || '').trim();
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
