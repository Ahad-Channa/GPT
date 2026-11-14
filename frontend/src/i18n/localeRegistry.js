// Central language registry and release configuration.
//
// Every `src/i18n/<code>.json` file is an available language resource. The
// LOCALE_CONFIG below decides which of those resources are selectable for the
// current release. i18n.js loads them through `import.meta.glob`, and this
// module is the single source of truth used by:
//   - the i18n resources (i18n.js)
//   - the language switcher (LanguageToggle.jsx)
//   - the admin offer editor language selector (AdminDirectOffers.jsx)
//
// Adding a language later = add `<code>.json`, add a LOCALE_CONFIG entry with
// `enabled: true`, and no dropdown/schema/translation-logic changes are needed.
// This does NOT translate anything automatically: a language that lacks keys
// shows the localized "translation unavailable" text (see missing-key policy).

export const DEFAULT_LOCALE = 'en';

// Language whose offer text (title + description) is mandatory on every offer.
// Offers keep a base record in this language (it backs the legacy fields and
// the schema's required title/description). Other languages are optional.
export const REQUIRED_OFFER_LOCALE = DEFAULT_LOCALE;

// Release configuration. French and Urdu resources are intentionally kept on
// disk and preserved in offer translations, but they are not selectable in this
// release. Flip `enabled` here to expose a language later.
export const LOCALE_CONFIG = Object.freeze({
  en: { enabled: true, flag: '/coins/EN.png' },
  de: { enabled: true, flag: '/coins/DE.svg' },
  fr: { enabled: false, flag: '/coins/FR.svg' },
  ur: { enabled: false, flag: '/coins/PK.svg' },
});

export const ENABLED_LOCALE_CODES = Object.freeze(
  Object.entries(LOCALE_CONFIG)
    .filter(([, config]) => config.enabled === true)
    .map(([code]) => code)
);

// Optional presentation hints. Unknown codes simply render without a flag.
export const LOCALE_FLAGS = Object.freeze(
  Object.fromEntries(
    Object.entries(LOCALE_CONFIG)
      .filter(([, config]) => Boolean(config.flag))
      .map(([code, config]) => [code, config.flag])
  )
);

const LOCALE_FILE = /(?:^|\/)([A-Za-z]{2,3}(?:[-_][A-Za-z0-9]+)*)\.json$/;

export const normalizeLocaleCode = (code) => String(code || '').trim().replace('_', '-').toLowerCase();

// modules: { './de.json': { default: {...} } | {...} }
export const buildLocaleRegistry = (
  modules = {},
  { enabledLocales = ENABLED_LOCALE_CODES } = {}
) => {
  const availableResources = {};
  for (const [path, mod] of Object.entries(modules)) {
    const match = LOCALE_FILE.exec(path);
    if (!match) continue;
    const code = normalizeLocaleCode(match[1]);
    const messages = mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;
    if (!messages || typeof messages !== 'object') continue;
    availableResources[code] = { translation: messages };
  }

  // Default locale first, the rest alphabetically for a stable switcher order.
  const sortCodes = (codes) => codes.sort((a, b) => {
    if (a === DEFAULT_LOCALE) return -1;
    if (b === DEFAULT_LOCALE) return 1;
    return a.localeCompare(b);
  });

  const allCodes = sortCodes(Object.keys(availableResources));
  const enabledSet = new Set((enabledLocales || []).map(normalizeLocaleCode));
  const codes = allCodes.filter((code) => enabledSet.has(code));
  const resources = Object.fromEntries(codes.map((code) => [code, availableResources[code]]));

  return { resources, codes, allCodes };
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
// 2. Inline English defaults (string or `{ defaultValue }` form) are honored only
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

// i18next `parseMissingKeyHandler`. i18next calls it for every missing key,
// including when a caller supplied a default (`t('k', 'Default')` and
// `t('k', { defaultValue: 'Default' })` alike), so one handler covers both call
// forms. Inline defaults are authored in the default locale, so they are shown
// only when that locale is active; any other language gets its localized
// "translation unavailable" text.
export const createMissingKeyHandler = (resources, getLanguage) => (key, defaultValue, options) => {
  const requested = String(options?.lng || getLanguage() || DEFAULT_LOCALE).toLowerCase();
  const isDefaultLocale = requested === DEFAULT_LOCALE || requested.startsWith(`${DEFAULT_LOCALE}-`);
  if (isDefaultLocale && typeof defaultValue === 'string') return defaultValue;
  const language = resolveSupportedLocale(requested, Object.keys(resources));
  return getTranslationUnavailableText(resources, language);
};
