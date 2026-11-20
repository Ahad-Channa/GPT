import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {
  DEFAULT_LOCALE,
  buildLocaleRegistry,
  createMissingKeyHandler,
  resolveSupportedLocale,
} from './localeRegistry.js';

// Every ./<code>.json file is an available language resource. Only locales
// enabled in localeRegistry.js are exposed by the current release.
const { resources, codes: supportedLanguageCodes } = buildLocaleRegistry(
  import.meta.glob('./*.json', { eager: true })
);

export const supportedLanguages = supportedLanguageCodes;

const hasFunctionalConsent = () => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('taskmint_cookie_consent');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.functional);
  } catch (e) {
    return false;
  }
};

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  if (hasFunctionalConsent()) {
    const saved = localStorage.getItem('i18nextLng');
    if (saved) return resolveSupportedLocale(saved, supportedLanguageCodes);
  }
  // Default without functional consent: the default locale
  return DEFAULT_LOCALE;
};

const canPersist = hasFunctionalConsent();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: supportedLanguageCodes,
    // Deliberate missing-translation policy (details in localeRegistry.js):
    // no silent English fallback; a missing key shows localized
    // "translation unavailable" text instead.
    fallbackLng: false,
    lng: getInitialLanguage(),
    interpolation: {
      escapeValue: false // React already escapes
    },
    parseMissingKeyHandler: createMissingKeyHandler(resources, () => i18n.language),
    detection: {
      order: canPersist ? ['localStorage', 'cookie', 'htmlTag'] : [],
      caches: canPersist ? ['localStorage'] : [],
      lookupLocalStorage: 'i18nextLng'
    }
  });

// Global listeners for consent changes
if (typeof window !== 'undefined') {
  window.addEventListener('taskmint_reset_functional_preferences', () => {
    i18n.changeLanguage(DEFAULT_LOCALE);
    localStorage.removeItem('i18nextLng');
    document.cookie = 'i18nextLng=; max-age=0; path=/; SameSite=Lax';
  });

  window.addEventListener('taskmint_functional_consent_granted', (e) => {
    const lang = e.detail?.lang || i18n.language || DEFAULT_LOCALE;
    localStorage.setItem('i18nextLng', lang);
    document.cookie = `i18nextLng=${lang}; max-age=31536000; path=/; SameSite=Lax`;
  });
}

export default i18n;
