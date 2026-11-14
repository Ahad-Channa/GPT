const SUPPORTED_NUMBER_LOCALES = new Set(['en', 'de', 'fr', 'ur']);
const FALLBACK_NUMBER_LOCALE = 'en';

const normalizeLocale = (locale) => String(locale || '').trim().replace('_', '-').toLowerCase();

// Resolve the active UI language to a supported number locale. Region variants
// use their base language (de-DE -> de); unsupported or malformed values fall
// back to English instead of leaking the host's default locale.
export const resolveNumberLocale = (locale) => {
  const normalized = normalizeLocale(locale);
  if (!normalized) return FALLBACK_NUMBER_LOCALE;
  if (SUPPORTED_NUMBER_LOCALES.has(normalized)) return normalized;

  const base = normalized.split('-')[0];
  return SUPPORTED_NUMBER_LOCALES.has(base) ? base : FALLBACK_NUMBER_LOCALE;
};

export const formatOfferAmount = (amount, locale) => {
  const numeric = Number(amount);
  const value = Number.isFinite(numeric) ? numeric : 0;
  const safeLocale = resolveNumberLocale(locale);

  try {
    return value.toLocaleString(safeLocale);
  } catch {
    return value.toLocaleString(FALLBACK_NUMBER_LOCALE);
  }
};

export default formatOfferAmount;
