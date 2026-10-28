import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useCookieConsent } from '../../contexts/CookieConsentContext';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

const CookieSettingsModal = () => {
  const { isSettingsOpen, closeCookieSettings, consent, savePreferences, acceptAll, cookiesList } = useCookieConsent();
  const { isDarkMode } = useTheme();
  const { i18n } = useTranslation();

  const isGerman = i18n.language?.startsWith('de');
  const isFrench = i18n.language?.startsWith('fr');
  const isUrdu = i18n.language === 'ur' || i18n.language?.startsWith('ur');

  // Category toggle states
  const [functional, setFunctional] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // Accordion open states
  const [openSection, setOpenSection] = useState(null);

  // Synchronize internal state when modal opens or consent changes
  useEffect(() => {
    if (isSettingsOpen) {
      if (consent) {
        setFunctional(Boolean(consent.functional));
        setMarketing(Boolean(consent.marketing));
      } else {
        // German law: Optional categories must default to UNCHECKED prior to consent
        setFunctional(false);
        setMarketing(false);
      }
    }
  }, [isSettingsOpen, consent]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        closeCookieSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, closeCookieSettings]);

  if (!isSettingsOpen) return null;

  const toggleSection = (cat) => {
    setOpenSection((prev) => (prev === cat ? null : cat));
  };

  const handleSave = () => {
    savePreferences({ functional, marketing });
  };

  // Group cookies by category
  const essentialCookies = cookiesList.filter((c) => c.category === 'essential');
  const functionalCookies = cookiesList.filter((c) => c.category === 'functional');
  const marketingCookies = cookiesList.filter((c) => c.category === 'marketing');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-settings-title"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={closeCookieSettings}
    >
      {/* Modal Dialog Box */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '640px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          background: isDarkMode ? '#0F141D' : '#FFFFFF',
          borderRadius: '25px',
          padding: '8px 8px 14px 8px',
          boxSizing: 'border-box',
          fontFamily: '"Poppins", sans-serif',
          color: isDarkMode ? '#FFFFFF' : '#0E0F0C',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
        className="relative shadow-2xl overflow-y-auto hide-scrollbar z-10"
      >
        {/* Top Header Card */}
        <div
          style={{
            width: '100%',
            background: isDarkMode ? 'rgba(18, 22, 28, 1)' : 'rgba(248, 245, 239, 1)',
            borderRadius: '16px',
            boxSizing: 'border-box',
            position: 'relative',
          }}
          className="p-3.5 sm:p-5 flex items-start justify-between gap-3 shrink-0"
        >
          <div className="pr-8">
            <h2
              id="cookie-settings-title"
              className="text-[17px] sm:text-[20px] font-bold leading-[22px] sm:leading-[26px]"
              style={{
                fontFamily: '"Bricolage Grotesque", sans-serif',
                color: isDarkMode ? '#FFFFFF' : '#000000',
                margin: 0,
              }}
            >
              {isUrdu ? 'کوکی اور پرائیویسی کی ترتیبات' : isGerman ? 'Cookie- & Privatsphäre-Einstellungen' : isFrench ? 'Préférences de Cookies & Confidentialité' : 'Cookie & Privacy Preferences'}
            </h2>
            <p
              className="text-xs sm:text-[13px] mt-1.5 leading-relaxed"
              style={{
                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.65)',
                margin: 0,
              }}
            >
              {isUrdu
                ? 'یہاں آپ یہ منتخب کر سکتے ہیں کہ آپ کے ڈیوائس پر ڈیٹا محفوظ کرنے کے لیے کن ٹیکنالوجیز کے استعمال کی اجازت ہے۔ تکنیکی طور پر ضروری ڈیٹا ہمیشہ درکار ہوتا ہے۔'
                : isGerman
                ? 'Hier können Sie festlegen, welche Technologien für die Speicherung von Daten auf Ihrem Gerät verwendet werden dürfen. Technisch notwendige Daten werden stets benötigt.'
                : isFrench
                ? 'Gérez vos préférences individuelles de consentement. Les technologies strictement nécessaires restent toujours actives pour assurer le bon fonctionnement.'
                : 'Manage your individual consent preferences. Strictly necessary technologies are always active to provide essential functions.'}
            </p>
          </div>

          {/* Close button at top-right (matching screenshot circular button) */}
          <button
            type="button"
            onClick={closeCookieSettings}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#000000',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              margin: 0,
              lineHeight: 0,
              flexShrink: 0,
            }}
            className="hover:opacity-80 transition-opacity"
            aria-label="Close"
          >
            <svg
              style={{ width: '12px', height: '12px', display: 'block' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 1. Essential Category (Locked ON) */}
        <div
          style={{
            background: isDarkMode ? 'rgba(18, 22, 28, 1)' : 'rgba(248, 245, 239, 1)',
            borderRadius: '16px',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
          }}
          className="p-3.5 sm:p-4 overflow-hidden shrink-0 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="font-bold text-sm sm:text-base"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}
                >
                  {isUrdu ? 'تکنیکی طور پر ضروری' : isGerman ? 'Technisch notwendig' : isFrench ? 'Strictement Nécessaires' : 'Strictly Essential'}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isDarkMode ? 'bg-white/10 text-white' : 'bg-[#24324D]/10 text-[#24324D]'
                  }`}
                >
                  {isUrdu ? 'ہمیشہ فعال' : isGerman ? 'Immer aktiv' : isFrench ? 'Toujours Actif' : 'Always Active'}
                </span>
              </div>
              <p
                className="text-xs"
                style={{
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
                }}
              >
                {isUrdu
                  ? 'صارف کے لاگ ان، 2-مرحلہ سیکیورٹی، سیشن برقرار رکھنے اور آپ کے کوکی کے انتخاب کو یاد رکھنے کے لیے لازمی ہے۔ اسے غیر فعال نہیں کیا جا سکتا۔'
                  : isGerman
                  ? 'Erforderlich für Benutzeranmeldung, 2-Faktor-Authentifizierung, Sicherheit und Speicherung Ihrer Cookie-Einstellungen. Kann nicht deaktiviert werden.'
                  : isFrench
                  ? "Requis pour la connexion, l'authentification 2FA, la persistance de session et la mémorisation de vos choix de cookies. Ne peut être désactivé."
                  : 'Required for user authentication, 2-Factor security, session persistence, and remembering your cookie choices. Cannot be disabled.'}
              </p>
            </div>

            {/* Locked Toggle Switch */}
            <div className="shrink-0 pt-1">
              <div
                className="w-11 h-6 rounded-full flex items-center p-1 opacity-90 cursor-not-allowed"
                style={{ background: 'rgba(36, 50, 77, 1)' }}
              >
                <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-sm" />
              </div>
            </div>
          </div>

          {/* Accordion toggle button */}
          <div
            className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs cursor-pointer"
            style={{
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            }}
            onClick={() => toggleSection('essential')}
          >
            <span
              className="font-semibold"
              style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
            >
              {openSection === 'essential'
                ? (isUrdu ? 'تفصیلات چھپائیں' : isGerman ? 'Details ausblenden' : isFrench ? 'Masquer les détails' : 'Hide details')
                : `${isUrdu ? 'تفصیلات دیکھیں' : isGerman ? 'Details anzeigen' : isFrench ? 'Afficher les détails' : 'Show details'} (${essentialCookies.length})`}
            </span>
            {openSection === 'essential' ? <FiChevronUp /> : <FiChevronDown />}
          </div>

          {/* Accordion Table */}
          {openSection === 'essential' && (
            <div className="mt-3 space-y-2.5">
              {essentialCookies.map((c) => (
                <div
                  key={c._id || c.name}
                  className="p-3 rounded-xl text-xs"
                  style={{
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.05)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <span
                      className="font-semibold text-sm"
                      style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
                    >
                      {c.name}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }}
                    >
                      {c.provider} • {c.duration}
                    </span>
                  </div>
                  <p style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
                    {isGerman ? c.description_de || c.description_en : c.description_en}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Functional Category (Theme, Language, Chat) */}
        <div
          style={{
            background: isDarkMode ? 'rgba(18, 22, 28, 1)' : 'rgba(248, 245, 239, 1)',
            borderRadius: '16px',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
          }}
          className="p-3.5 sm:p-4 overflow-hidden shrink-0 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="font-bold text-sm sm:text-base"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}
                >
                  {isUrdu ? 'فنکشنل اور ترجیحات' : isGerman ? 'Funktional & Präferenzen' : isFrench ? 'Fonctionnel & Préférences' : 'Functional & Preferences'}
                </span>
              </div>
              <p
                className="text-xs"
                style={{
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
                }}
              >
                {isUrdu
                  ? 'آپ کی منتخب کردہ زبان (انگریزی/جرمن/اردو)، ڈارک/لائٹ موڈ اور چیٹ سائڈبار کی سیٹنگز کو محفوظ رکھنے کی سہولت فراہم کرتا ہے۔'
                  : isGerman
                  ? 'Ermöglicht das Speichern Ihrer Sprache (Deutsch/Englisch), Ihres Farbschemas (Dark Mode/Light Mode) und der Chat-Seitenleisten-Einstellung.'
                  : isFrench
                  ? "Permet d'enregistrer votre langue préférée (anglais/allemand/français/ourdou), votre thème (mode sombre/clair) et l'état de la barre de chat."
                  : 'Enables saving your selected language (English/German/French/Urdu), Dark Mode/Light Mode theme preference, and chat sidebar state.'}
              </p>
            </div>

            {/* Functional Toggle Switch */}
            <div className="shrink-0 pt-1">
              <button
                type="button"
                role="switch"
                aria-checked={functional}
                onClick={() => setFunctional((prev) => !prev)}
                style={functional ? { background: 'rgba(36, 50, 77, 1)' } : undefined}
                className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors cursor-pointer border-none ${
                  functional ? '' : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                    functional ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Accordion toggle button */}
          <div
            className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs cursor-pointer"
            style={{
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            }}
            onClick={() => toggleSection('functional')}
          >
            <span
              className="font-semibold"
              style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
            >
              {openSection === 'functional'
                ? (isUrdu ? 'تفصیلات چھپائیں' : isGerman ? 'Details ausblenden' : isFrench ? 'Masquer les détails' : 'Hide details')
                : `${isUrdu ? 'تفصیلات دیکھیں' : isGerman ? 'Details anzeigen' : isFrench ? 'Afficher les détails' : 'Show details'} (${functionalCookies.length})`}
            </span>
            {openSection === 'functional' ? <FiChevronUp /> : <FiChevronDown />}
          </div>

          {/* Accordion Table */}
          {openSection === 'functional' && (
            <div className="mt-3 space-y-2.5">
              {functionalCookies.map((c) => (
                <div
                  key={c._id || c.name}
                  className="p-3 rounded-xl text-xs"
                  style={{
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.05)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <span
                      className="font-semibold text-sm"
                      style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
                    >
                      {c.name}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }}
                    >
                      {c.provider} • {c.duration}
                    </span>
                  </div>
                  <p style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
                    {isUrdu ? c.description_ur || c.description_en : isGerman ? c.description_de || c.description_en : c.description_en}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Marketing & Attribution Category (Affiliate ref) */}
        <div
          style={{
            background: isDarkMode ? 'rgba(18, 22, 28, 1)' : 'rgba(248, 245, 239, 1)',
            borderRadius: '16px',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
          }}
          className="p-3.5 sm:p-4 overflow-hidden shrink-0 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="font-bold text-sm sm:text-base"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}
                >
                  {isUrdu ? 'مارکیٹنگ اور ایفیلی ایٹ' : isGerman ? 'Marketing & Empfehlungsprogramm' : isFrench ? 'Marketing & Affiliation' : 'Marketing & Attribution'}
                </span>
              </div>
              <p
                className="text-xs"
                style={{
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
                }}
              >
                {isUrdu
                  ? 'ریفرل اور ایفیلی ایٹ لنکس کو ٹریک کرنے کے لیے تاکہ دوستوں اور پارٹنرز کو سائن اپ پر ان کے کمائے گئے بونس مل سکیں۔'
                  : isGerman
                  ? 'Dient der korrekten Zuordnung von Empfehlungs- und Partnerlinks, damit Freunde und Partner ihre verdienten Registrierungsboni erhalten.'
                  : isFrench
                  ? "Permet de suivre les liens d'affiliation et de parrainage afin que vos amis et partenaires reçoivent leurs commissions lors de l'inscription."
                  : 'Used to track affiliate and referral links so that friends and partners receive their earned commission bonuses upon signup.'}
              </p>
            </div>

            {/* Marketing Toggle Switch */}
            <div className="shrink-0 pt-1">
              <button
                type="button"
                role="switch"
                aria-checked={marketing}
                onClick={() => setMarketing((prev) => !prev)}
                style={marketing ? { background: 'rgba(36, 50, 77, 1)' } : undefined}
                className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors cursor-pointer border-none ${
                  marketing ? '' : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                    marketing ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Accordion toggle button */}
          <div
            className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs cursor-pointer"
            style={{
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            }}
            onClick={() => toggleSection('marketing')}
          >
            <span
              className="font-semibold"
              style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
            >
              {openSection === 'marketing'
                ? (isUrdu ? 'تفصیلات چھپائیں' : isGerman ? 'Details ausblenden' : isFrench ? 'Masquer les détails' : 'Hide details')
                : `${isUrdu ? 'تفصیلات دیکھیں' : isGerman ? 'Details anzeigen' : isFrench ? 'Afficher les détails' : 'Show details'} (${marketingCookies.length})`}
            </span>
            {openSection === 'marketing' ? <FiChevronUp /> : <FiChevronDown />}
          </div>

          {/* Accordion Table */}
          {openSection === 'marketing' && (
            <div className="mt-3 space-y-2.5">
              {marketingCookies.map((c) => (
                <div
                  key={c._id || c.name}
                  className="p-3 rounded-xl text-xs"
                  style={{
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.05)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <span
                      className="font-semibold text-sm"
                      style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}
                    >
                      {c.name}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }}
                    >
                      {c.provider} • {c.duration}
                    </span>
                  </div>
                  <p style={{ color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
                    {isUrdu ? c.description_ur || c.description_en : isGerman ? c.description_de || c.description_en : c.description_en}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
            }`}
          >
            {isUrdu ? 'ترجیحات محفوظ کریں' : isGerman ? 'Auswahl speichern' : isFrench ? 'Enregistrer les choix' : 'Save Preferences'}
          </button>

          <button
            type="button"
            onClick={acceptAll}
            className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-md active:scale-95 cursor-pointer hover:opacity-90"
            style={{
              background: 'rgba(36, 50, 77, 1)',
              color: '#FFFFFF',
              fontFamily: '"Bricolage Grotesque", sans-serif',
            }}
          >
            <span>{isUrdu ? 'سب قبول کریں' : isGerman ? 'Alle akzeptieren' : isFrench ? 'Tout accepter' : 'Accept All'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieSettingsModal;
