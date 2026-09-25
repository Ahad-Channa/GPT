import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageToggle = ({ style }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('de') ? 'de' : 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'de' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-[6px] cursor-pointer transition-all hover:opacity-80 active:scale-95"
      style={{
        height: '40px',
        padding: '8px 14px',
        borderRadius: '80px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        background: 'rgba(255, 255, 255, 0.9)',
        fontFamily: '"Poppins", sans-serif',
        fontWeight: 600,
        fontSize: '13px',
        color: 'rgba(30, 30, 30, 1)',
        backdropFilter: 'blur(8px)',
        ...style
      }}
      title={currentLang === 'en' ? 'Auf Deutsch wechseln' : 'Switch to English'}
    >
      <span style={{ fontSize: '16px', lineHeight: 1 }}>
        {currentLang === 'en' ? '🇬🇧' : '🇩🇪'}
      </span>
      <span>{currentLang === 'en' ? 'EN' : 'DE'}</span>
      <svg
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
        style={{ opacity: 0.5, transform: 'rotate(0deg)' }}
      >
        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
};

export default LanguageToggle;
