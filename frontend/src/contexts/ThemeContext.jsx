import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCookieConsent } from './CookieConsentContext';

const ThemeContext = createContext({
  isDarkMode: false,
  setIsDarkMode: () => {},
  toggleDarkMode: () => {}
});

export const ThemeProvider = ({ children }) => {
  const cookieConsent = useCookieConsent();
  const hasConsent = cookieConsent?.hasConsent;

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('taskmint_cookie_consent');
        const parsed = raw ? JSON.parse(raw) : null;
        // Only restore saved theme if functional consent was granted
        if (parsed?.functional) {
          const saved = localStorage.getItem('taskmint_theme');
          if (saved) return saved === 'dark';
        }
      } catch (e) {}
    }
    // Default without consent: Light Mode
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Persist ONLY if user has granted Functional & Preferences consent
      if (hasConsent && hasConsent('functional')) {
        const val = isDarkMode ? 'dark' : 'light';
        localStorage.setItem('taskmint_theme', val);
        document.cookie = `taskmint_theme=${val}; max-age=31536000; path=/; SameSite=Lax`;
      } else {
        // Without functional consent, do not allow persistence
        localStorage.removeItem('taskmint_theme');
        document.cookie = 'taskmint_theme=; max-age=0; path=/; SameSite=Lax';
      }
    }
  }, [isDarkMode, hasConsent]);

  // Listen for consent revocation or approval events
  useEffect(() => {
    const handleReset = () => {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('taskmint_theme');
      document.cookie = 'taskmint_theme=; max-age=0; path=/; SameSite=Lax';
    };

    const handleGranted = () => {
      const val = isDarkMode ? 'dark' : 'light';
      localStorage.setItem('taskmint_theme', val);
      document.cookie = `taskmint_theme=${val}; max-age=31536000; path=/; SameSite=Lax`;
    };

    window.addEventListener('taskmint_reset_functional_preferences', handleReset);
    window.addEventListener('taskmint_functional_consent_granted', handleGranted);
    return () => {
      window.removeEventListener('taskmint_reset_functional_preferences', handleReset);
      window.removeEventListener('taskmint_functional_consent_granted', handleGranted);
    };
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
