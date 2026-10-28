import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useCookieConsent } from '../contexts/CookieConsentContext';

const LanguageToggle = ({
  style,
  className = '',
  pillOnMobile = false,
  showArrowOnMobile = false,
  dropdownAlign = 'left',
}) => {
  const { i18n } = useTranslation();
  const { isDarkMode } = useTheme();
  const cookieConsent = useCookieConsent();
  const hasConsent = cookieConsent?.hasConsent;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = i18n.language?.startsWith('ur')
    ? 'ur'
    : (i18n.language?.startsWith('de')
        ? 'de'
        : (i18n.language?.startsWith('fr') ? 'fr' : 'en'));

  const selectLanguage = (lang) => {
    i18n.changeLanguage(lang);
    if (typeof window !== 'undefined') {
      window.__taskmintCurrentLang = lang;
      if (hasConsent && hasConsent('functional')) {
        localStorage.setItem('i18nextLng', lang);
        document.cookie = `i18nextLng=${lang}; max-age=31536000; path=/; SameSite=Lax`;
      } else {
        localStorage.removeItem('i18nextLng');
        document.cookie = 'i18nextLng=; max-age=0; path=/; SameSite=Lax';
      }
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative shrink-0 ${className}`} ref={dropdownRef}>
      {/* Trigger Button: Transparent by default on mobile unless pillOnMobile, styled pill on desktop */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center justify-center transition-all cursor-pointer select-none border-0 active:scale-95 ${
          pillOnMobile
            ? (isDarkMode
                ? 'bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.16)] px-[10px] h-[44px] rounded-[80px] gap-[6px]'
                : 'bg-white hover:bg-gray-50 px-[10px] h-[44px] rounded-[80px] gap-[6px]')
            : 'bg-transparent border-0 p-0 gap-[3px]'
        } lg:gap-[10px] lg:w-[106px] lg:h-[49px] lg:pl-[8px] lg:pr-[14px] lg:rounded-[80px] ${
          isDarkMode
            ? 'lg:bg-[rgba(255,255,255,0.1)] lg:hover:bg-[rgba(255,255,255,0.16)]'
            : 'lg:bg-white lg:hover:bg-gray-50'
        }`}
        style={{
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          opacity: 1,
          transform: 'rotate(0deg)',
          boxSizing: 'border-box',
          WebkitTapHighlightColor: 'transparent',
          ...style,
        }}
        title="Change Language"
      >
        {/* Flag Icon: 20x20 on mobile, 24x24 on desktop */}
        <div
          className="w-[20px] h-[20px] lg:w-[24px] lg:h-[24px] rounded-full overflow-hidden shrink-0 flex items-center justify-center"
          style={{
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          <img
            src={
              currentLang === 'en'
                ? '/coins/EN.png'
                : currentLang === 'de'
                  ? '/coins/DE.svg'
                  : currentLang === 'fr'
                    ? '/coins/FR.svg'
                    : '/coins/PK.svg'
            }
            alt={currentLang === 'en' ? 'EN Flag' : currentLang === 'de' ? 'DE Flag' : currentLang === 'fr' ? 'FR Flag' : 'UR Flag'}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Text Code (EN / DE / FR / UR): 18x21 on mobile, 20x24 on desktop */}
        <span
          className="flex items-center justify-center shrink-0 w-[18px] h-[21px] text-[14px] leading-[21px] lg:w-[20px] lg:h-[24px] lg:text-[16px] lg:leading-[100%] transition-colors duration-300"
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 400,
            letterSpacing: '0%',
            color: isDarkMode ? '#FFFFFF' : '#000000',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          {currentLang.toUpperCase()}
        </span>

        {/* Arrow / Chevron Button */}
        <svg
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          className={`${showArrowOnMobile ? 'block' : 'hidden lg:block'} shrink-0 transition-transform duration-200`}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: isDarkMode ? '#FFFFFF' : '#000000',
          }}
        >
          <path
            d="M1.5 2L6 6.5L10.5 2"
            stroke={isDarkMode ? '#FFFFFF' : '#000000'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 flex flex-col ${
              dropdownAlign === 'right'
                ? 'right-0 top-[48px] lg:top-[56px]'
                : 'left-0 top-[32px] lg:top-[56px]'
            }`}
            style={{
              width: '180px',
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: '16px',
              padding: '14px 16px',
              background: isDarkMode ? 'rgba(18, 22, 28, 0.98)' : '#FFFFFF',
              boxShadow: isDarkMode ? '0px 10px 30px rgba(0, 0, 0, 0.5)' : '0px 10px 30px rgba(0, 0, 0, 0.12)',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
              boxSizing: 'border-box',
            }}
          >
            {/* 1. English */}
            <button
              type="button"
              onClick={() => selectLanguage('en')}
              className="flex items-center justify-between w-full py-1 cursor-pointer bg-transparent border-0 hover:opacity-75 transition-opacity"
            >
              <span
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: currentLang === 'en' ? 600 : 400,
                  fontSize: '15px',
                  lineHeight: '20px',
                  color: currentLang === 'en' ? (isDarkMode ? '#FFFFFF' : '#0E0F0C') : (isDarkMode ? '#9CA3AF' : '#8E8E93'),
                }}
              >
                English
              </span>
              <div className="w-[24px] h-[24px] rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src="/coins/EN.png"
                  alt="English Flag"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            {/* Divider */}
            <div
              style={{
                width: '100%',
                height: '1px',
                background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                margin: '8px 0',
                flexShrink: 0,
              }}
            />

            {/* 2. German */}
            <button
              type="button"
              onClick={() => selectLanguage('de')}
              className="flex items-center justify-between w-full py-1 cursor-pointer bg-transparent border-0 hover:opacity-75 transition-opacity"
            >
              <span
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: currentLang === 'de' ? 600 : 400,
                  fontSize: '15px',
                  lineHeight: '20px',
                  color: currentLang === 'de' ? (isDarkMode ? '#FFFFFF' : '#0E0F0C') : (isDarkMode ? '#9CA3AF' : '#8E8E93'),
                }}
              >
                Deutsch
              </span>
              <div className="w-[24px] h-[24px] rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src="/coins/DE.svg"
                  alt="German Flag"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            {/* Divider */}
            <div
              style={{
                width: '100%',
                height: '1px',
                background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                margin: '8px 0',
                flexShrink: 0,
              }}
            />

            {/* 3. French */}
            <button
              type="button"
              onClick={() => selectLanguage('fr')}
              className="flex items-center justify-between w-full py-1 cursor-pointer bg-transparent border-0 hover:opacity-75 transition-opacity"
            >
              <span
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: currentLang === 'fr' ? 600 : 400,
                  fontSize: '15px',
                  lineHeight: '20px',
                  color: currentLang === 'fr' ? (isDarkMode ? '#FFFFFF' : '#0E0F0C') : (isDarkMode ? '#9CA3AF' : '#8E8E93'),
                }}
              >
                Français
              </span>
              <div className="w-[24px] h-[24px] rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src="/coins/FR.svg"
                  alt="French Flag"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            {/* Divider */}
            <div
              style={{
                width: '100%',
                height: '1px',
                background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                margin: '8px 0',
                flexShrink: 0,
              }}
            />

            {/* 4. Urdu */}
            <button
              type="button"
              onClick={() => selectLanguage('ur')}
              className="flex items-center justify-between w-full py-1 cursor-pointer bg-transparent border-0 hover:opacity-75 transition-opacity"
            >
              <span
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: currentLang === 'ur' ? 600 : 400,
                  fontSize: '15px',
                  lineHeight: '20px',
                  color: currentLang === 'ur' ? (isDarkMode ? '#FFFFFF' : '#0E0F0C') : (isDarkMode ? '#9CA3AF' : '#8E8E93'),
                }}
              >
                Urdu (اردو)
              </span>
              <div className="w-[24px] h-[24px] rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src="/coins/PK.svg"
                  alt="Urdu Flag"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageToggle;

