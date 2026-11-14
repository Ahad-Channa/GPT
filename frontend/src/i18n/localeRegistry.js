// Central language registry.
//
// Every `src/i18n/<code>.json` file is a supported website language. i18n.js
// loads them through `import.meta.glob`, and this module turns that module map
// into the single source of truth used by:
//   - the i18n resources (i18n.js)
//   - the language switcher (LanguageToggle.jsx)
//   - the admin offer editor language selector (AdminDirectOffers.jsx)
//
// Adding a language = adding `<code>.json`. No other registration is needed.
// This does NOT translate anything automatically: a language that lacks keys
// shows the localized "translation unavailable" text (see missing-key policy).

export const DEFAULT_LOCALE = 'en';

// Language whose offer text (title + description) is mandatory on every offer.
// Offers keep a base record in this language (it backs the legacy fields and
// the schema's required title/description). Other languages are optional.
export const REQUIRED_OFFER_LOCALE = DEFAULT_LOCALE;

// Optional presentation hints. Unknown codes simply render without a flag.
export const LOCALE_FLAGS = {
  en: '/coins/EN.png',
  de: '/coins/DE.svg',
  fr: '/coins/FR.svg',
  ur: '/coins/PK.svg',
};

const LOCALE_FILE = /(?:^|\/)([A-Za-z]{2,3}(?:[-_][A-Za-z0-9]+)*)\.json$/;

export const normalizeLocaleCode = (code) => String(code || '').trim().replace('_', '-');

// modules: { './de.json': { default: {...} } | {...} }
export const buildLocaleRegistry = (modules = {}) => {
  const resources = {};
  for (const [path, mod] of Object.entries(modules)) {
    const match = LOCALE_FILE.exec(path);
    if (!match) continue;
    const code = normalizeLocaleCode(match[1]).toLowerCase();
    const messages = mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;
    if (!messages || typeof messages !== 'object') continue;
    resources[code] = { translation: messages };
  }
  // Default locale first, the rest alphabetically for a stable switcher order.
  const codes = Object.keys(resources).sort((a, b) => {
    if (a === DEFAULT_LOCALE) return -1;
    if (b === DEFAULT_LOCALE) return 1;
    return a.localeCompare(b);
  });
  return { resources, codes };
};

// Resolves a stored/detected language ("de-AT", "DE", "xx") to a supported code.
export const resolveSupportedLocale = (value, codes, fallback = DEFAULT_LOCALE) => {
  const wanted = normalizeLocaleCode(value).toLowerCase();
  if (!wanted) return fallback;
  const exact = codes.find((code) => code === wanted);
  if (exact) return exact;
  const base = codes.find((code) => wanted.startsWith(`${code}-`));
  return base || fallback;
};

// Name of a language in that language (e.g. "Deutsch"). Language names are the
// one place where a non-UI-language label is expected.
export const getLocaleNativeName = (code) => {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    if (name && name !== code) return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch {
    // Unknown/invalid tag: fall through to the raw code.
  }
  return code;
};

// ── Missing-translation policy ────────────────────────────────────────────────
// 1. The selected language is the only source for UI text. There is NO silent
//    fallback to English (i18next fallbackLng is disabled).
// 2. Inline English defaults in `t('key', 'English default')` are honored only
//    when the active language is the default locale. In any other language a
//    missing key renders the localized `offers.translationUnavailable` text.
// 3. That single message is the one deliberate exception: if a language does not
//    define it either, the default-locale wording is used so the user is still
//    told something is missing rather than seeing a raw key.
export const UNAVAILABLE_KEY = 'offers.translationUnavailable';

const lookup = (messages, dottedKey) =>
  dottedKey.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), messages);

export const getTranslationUnavailableText = (resources, language) => {
  const own = lookup(resources?.[language]?.translation, UNAVAILABLE_KEY);
  if (typeof own === 'string' && own.trim()) return own;
  const base = lookup(resources?.[DEFAULT_LOCALE]?.translation, UNAVAILABLE_KEY);
  return typeof base === 'string' && base.trim() ? base : 'Translation unavailable';
};

// i18next `overloadTranslationOptionHandler`: drops an inline English default
// when the active language is not the default locale.
export const createOverloadHandler = (getLanguage) => (args) => {
  const options = typeof args[1] === 'object' && args[1] ? { ...args[1] } : {};
  if (typeof args[1] === 'string') options.defaultValue = args[1];
  if (typeof args[2] === 'object' && args[2]) Object.assign(options, args[2]);
  const language = String(getLanguage() || DEFAULT_LOCALE).toLowerCase();
  if (language !== DEFAULT_LOCALE && !language.startsWith(`${DEFAULT_LOCALE}-`)) {
    delete options.defaultValue;
  }
  return options;
};

// i18next `parseMissingKeyHandler`: i18next also calls it when an inline default
// was used, so pass an allowed default through and otherwise show the localized
// "translation unavailable" text for the active language.
export const createMissingKeyHandler = (resources, getLanguage) => (key, defaultValue) => {
  if (typeof defaultValue === 'string') return defaultValue;
  const language = resolveSupportedLocale(getLanguage(), Object.keys(resources));
  return getTranslationUnavailableText(resources, language);
};
