import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.json';
import de from './de.json';

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
  if (typeof window === 'undefined') return 'en';
  if (hasFunctionalConsent()) {
    const saved = localStorage.getItem('i18nextLng');
    if (saved && (saved.startsWith('de') || saved.startsWith('en'))) {
      return saved.startsWith('de') ? 'de' : 'en';
    }
  }
  // Default without functional consent: English
  return 'en';
};

const canPersist = hasFunctionalConsent();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de }
    },
    fallbackLng: 'en',
    lng: getInitialLanguage(),
    interpolation: {
      escapeValue: false // React already escapes
    },
    detection: {
      order: canPersist ? ['localStorage', 'cookie', 'htmlTag'] : [],
      caches: canPersist ? ['localStorage'] : [],
      lookupLocalStorage: 'i18nextLng'
    }
  });

// Global listeners for consent changes
if (typeof window !== 'undefined') {
  window.addEventListener('taskmint_reset_functional_preferences', () => {
    i18n.changeLanguage('en');
    localStorage.removeItem('i18nextLng');
    document.cookie = 'i18nextLng=; max-age=0; path=/; SameSite=Lax';
  });

  window.addEventListener('taskmint_functional_consent_granted', (e) => {
    const lang = e.detail?.lang || i18n.language || 'en';
    localStorage.setItem('i18nextLng', lang);
    document.cookie = `i18nextLng=${lang}; max-age=31536000; path=/; SameSite=Lax`;
  });
}

export default i18n;
