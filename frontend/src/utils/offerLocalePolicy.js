import { REQUIRED_OFFER_LOCALE } from '../i18n/localeRegistry.js';

// Offer text policy
// -----------------
// * Translations are stored under generic locale keys (offer.translations[code]).
// * Exactly one locale is mandatory: REQUIRED_OFFER_LOCALE (the project default
//   locale). Its title + description back the base record / legacy fields that
//   the offer schema requires. Every other locale is optional.
// * Which locale is mandatory comes from the central registry, never from a
//   hard-coded language inside the editor.

const filled = (value) => String(value ?? '').trim().length > 0;

export const getRequiredOfferFields = () => ['title', 'description'];

// Returns { valid, locale, missingFields }. `locale` is the locale the admin has
// to complete (so the editor can switch to it).
export const validateOfferText = (translations = {}, requiredLocale = REQUIRED_OFFER_LOCALE) => {
  const text = translations?.[requiredLocale] || {};
  const missingFields = getRequiredOfferFields().filter((field) => !filled(text[field]));
  return { valid: missingFields.length === 0, locale: requiredLocale, missingFields };
};

export default validateOfferText;
