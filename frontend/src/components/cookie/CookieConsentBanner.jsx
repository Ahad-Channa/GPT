import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useCookieConsent } from '../../contexts/CookieConsentContext';

const CookieConsentBanner = () => {
  const { isBannerOpen, acceptAll, rejectNonEssential, openCookieSettings } = useCookieConsent();
  const { isDarkMode } = useTheme();
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  if (!isBannerOpen) return null;

  const isGerman = i18n.language?.startsWith('de');
  const policyColor = isDarkMode ? '#FFFFFF' : 'rgba(36, 50, 77, 1)';

  return (
    <div
      role="region"
      aria-label="Cookie Consent"
      className="fixed bottom-3 sm:bottom-5 left-3 sm:left-6 right-3 sm:right-6 max-w-5xl mx-auto z-[99999] animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div
        className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-xl transition-all duration-300 ${
          isDarkMode
            ? 'bg-[#0e131b]/95 border border-white/15 text-white shadow-[0_16px_45px_rgba(0,0,0,0.75)]'
            : 'bg-white/95 border border-gray-200/90 text-gray-900 shadow-[0_16px_45px_rgba(0,0,0,0.18)]'
        }`}
        style={{ fontFamily: '"Poppins", sans-serif' }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
          {/* Text & Content (Icon removed as requested) */}
          <div className="flex-1 text-xs sm:text-sm leading-relaxed">
            <h4
              className={`font-bold text-sm sm:text-base mb-1 tracking-tight ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              {isGerman ? 'Privatsphäre & Cookie-Einstellungen' : 'Privacy & Cookie Settings'}
            </h4>

            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              {isGerman ? (
                <>
                  Wir nutzen technisch notwendige Speichertechnologien für den sicheren Betrieb von TaskMint. Mit
                  Ihrer Einwilligung verwenden wir zudem funktionale Technologien (wie Sprache und Dark Mode) sowie
                  Marketing-Technologien für unser Empfehlungsprogramm. Weitere Details finden Sie in unserer{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/policies?tab=privacy-policy')}
                    style={{
                      color: policyColor,
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      fontWeight: 700,
                    }}
                    className="hover:opacity-80 transition-opacity bg-transparent border-none p-0 inline cursor-pointer"
                  >
                    Datenschutzerklärung
                  </button>{' '}
                  und{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/policies?tab=cookie-policy')}
                    style={{
                      color: policyColor,
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      fontWeight: 700,
                    }}
                    className="hover:opacity-80 transition-opacity bg-transparent border-none p-0 inline cursor-pointer"
                  >
                    Cookie-Richtlinie
                  </button>
                  .
                </>
              ) : (
                <>
                  We use strictly essential technologies to ensure TaskMint operates securely. With your consent, we
                  also use functional technologies (such as language and dark mode preferences) and marketing
                  technologies for our affiliate program. Learn more in our{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/policies?tab=privacy-policy')}
                    style={{
                      color: policyColor,
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      fontWeight: 700,
                    }}
                    className="hover:opacity-80 transition-opacity bg-transparent border-none p-0 inline cursor-pointer"
                  >
                    Privacy Policy
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/policies?tab=cookie-policy')}
                    style={{
                      color: policyColor,
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      fontWeight: 700,
                    }}
                    className="hover:opacity-80 transition-opacity bg-transparent border-none p-0 inline cursor-pointer"
                  >
                    Cookie Policy
                  </button>
                  .
                </>
              )}
            </p>
          </div>

          {/* Action Buttons with Equal Prominence (DSGVO / TDDDG compliant) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
            {/* Customize Settings Button */}
            <button
              type="button"
              onClick={openCookieSettings}
              className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
              }`}
            >
              <span>{isGerman ? 'Einstellungen' : 'Customize'}</span>
            </button>

            {/* Essential Only (Reject All non-essential) */}
            <button
              type="button"
              onClick={rejectNonEssential}
              className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-[#1e293b] hover:bg-[#28384f] text-gray-200 border border-white/15'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
              }`}
            >
              <span>{isGerman ? 'Nur essenzielle' : 'Essential Only'}</span>
            </button>

            {/* Accept All (Active policy tab color rgba(36, 50, 77, 1)) */}
            <button
              type="button"
              onClick={acceptAll}
              className="flex items-center justify-center px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer hover:opacity-90"
              style={{
                background: 'rgba(36, 50, 77, 1)',
                color: '#FFFFFF',
                fontFamily: '"Bricolage Grotesque", sans-serif',
                boxShadow: isDarkMode ? '0 4px 14px rgba(0,0,0,0.5)' : '0 4px 14px rgba(36, 50, 77, 0.25)',
              }}
            >
              <span>{isGerman ? 'Alle akzeptieren' : 'Accept All'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
