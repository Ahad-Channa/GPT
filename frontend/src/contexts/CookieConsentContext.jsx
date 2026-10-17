import React, { createContext, useContext, useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const CONSENT_STORAGE_KEY = 'taskmint_cookie_consent';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

const CookieConsentContext = createContext(null);

export const CookieConsentProvider = ({ children }) => {
  const [consent, setConsent] = useState(() => {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.essential === true) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading cookie consent from storage:', e);
    }
    return null; // null means no decision has been made yet
  });

  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cookiesList, setCookiesList] = useState([]);
  const [loadingCookies, setLoadingCookies] = useState(false);

  // Check if consent has been decided
  useEffect(() => {
    if (consent === null) {
      // Small timeout so initial page animation finishes smoothly before banner appears
      const timer = setTimeout(() => {
        setIsBannerOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsBannerOpen(false);
    }
  }, [consent]);

  // Fetch active cookies list from API
  const fetchCookies = async () => {
    setLoadingCookies(true);
    try {
      const res = await fetch(`${API}/public/cookies`);
      const data = await res.json();
      if (data.success && Array.isArray(data.cookies)) {
        setCookiesList(data.cookies);
      }
    } catch (err) {
      console.error('Failed to fetch cookies list:', err);
    } finally {
      setLoadingCookies(false);
    }
  };

  useEffect(() => {
    fetchCookies();
  }, []);

  // Helper to persist consent in both localStorage and document.cookie
  const persistConsent = (consentObj) => {
    try {
      const dataToSave = {
        essential: true,
        functional: Boolean(consentObj.functional),
        marketing: Boolean(consentObj.marketing),
        updatedAt: new Date().toISOString(),
        version: 1,
      };

      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(dataToSave));

      // Also set a document cookie so server-side or header inspection works
      document.cookie = `${CONSENT_STORAGE_KEY}=${encodeURIComponent(JSON.stringify(dataToSave))}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;

      setConsent(dataToSave);
      setIsBannerOpen(false);
      setIsSettingsOpen(false);

      // Enforce marketing permissions on storage
      if (dataToSave.marketing) {
        // If there was a pending affiliate referral in sessionStorage, promote it
        const pendingRef = sessionStorage.getItem('pending_ref');
        if (pendingRef) {
          localStorage.setItem('ref', pendingRef);
        }
      } else {
        // User withdrew or rejected marketing consent: remove persistent affiliate tracker
        localStorage.removeItem('ref');
      }

      return dataToSave;
    } catch (err) {
      console.error('Failed to save cookie consent:', err);
    }
  };

  const acceptAll = () => {
    persistConsent({ functional: true, marketing: true });
  };

  const rejectNonEssential = () => {
    persistConsent({ functional: false, marketing: false });
  };

  const savePreferences = ({ functional, marketing }) => {
    persistConsent({ functional, marketing });
  };

  const openCookieSettings = () => {
    setIsSettingsOpen(true);
  };

  const closeCookieSettings = () => {
    setIsSettingsOpen(false);
  };

  const hasConsent = (category) => {
    if (category === 'essential') return true;
    if (!consent) return false; // Prior consent required under TDDDG § 25
    return Boolean(consent[category]);
  };

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        isBannerOpen,
        isSettingsOpen,
        cookiesList,
        loadingCookies,
        acceptAll,
        rejectNonEssential,
        savePreferences,
        openCookieSettings,
        closeCookieSettings,
        hasConsent,
        fetchCookies,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
};

export const useCookieConsent = () => {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
};

export default CookieConsentContext;
