import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useCookieConsent } from '../contexts/CookieConsentContext';
import { FiSliders, FiShield, FiTag, FiClock } from 'react-icons/fi';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TABS = [
  { slug: 'terms-of-use', labelEn: 'Terms of Service', labelDe: 'Nutzungsbedingungen', labelUr: 'استعمال کی شرائط', labelFr: "Conditions d'Utilisation", labelEs: 'Términos de Servicio' },
  { slug: 'privacy-policy', labelEn: 'Privacy Policy', labelDe: 'Datenschutzerklärung', labelUr: 'پرائیویسی پالیسی', labelFr: 'Politique de Confidentialité', labelEs: 'Política de Privacidad' },
  { slug: 'cookie-policy', labelEn: 'Cookie Policy', labelDe: 'Cookie-Richtlinie', labelUr: 'کوکی پالیسی', labelFr: 'Politique de Cookies', labelEs: 'Política de Cookies' },
  { slug: 'affiliate-policy', labelEn: 'Affiliate Policy', labelDe: 'Affiliate-Richtlinie', labelUr: 'ایفیلی ایٹ پالیسی', labelFr: "Conditions d'Affiliation", labelEs: 'Política de Afiliados' },
  { slug: 'impressum', labelEn: 'Impressum', labelDe: 'Impressum', labelUr: 'امپریسم (قانونی معلومات)', labelFr: 'Mentions Légales', labelEs: 'Aviso Legal' },
];

const SLUG_ALIASES = {
  'terms': 'terms-of-use',
  'terms-of-service': 'terms-of-use',
  'privacy': 'privacy-policy',
  'cookies': 'cookie-policy',
  'affiliate': 'affiliate-policy',
};

const formatInline = (text, isDarkMode, lineIdx = 0) => {
  if (!text) return text;
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          key={`b-${lineIdx}-${idx}`}
          style={{
            fontFamily: '"Poppins", sans-serif',
            color: isDarkMode ? '#FFFFFF' : '#111827',
            fontWeight: 600,
          }}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={`em-${lineIdx}-${idx}`} style={{ fontFamily: '"Poppins", sans-serif' }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={`a-${lineIdx}-${idx}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: '"Poppins", sans-serif',
            color: '#00D65D',
            textDecoration: 'underline',
          }}
        >
          {linkMatch[1]}
        </a>
      );
    }
    return (
      <span key={`t-${lineIdx}-${idx}`} style={{ fontFamily: '"Poppins", sans-serif' }}>
        {part}
      </span>
    );
  });
};

const renderMarkdown = (text, isDarkMode) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-2xl sm:text-3xl font-extrabold mt-6 mb-3 tracking-tight transition-colors duration-300"
          style={{
            color: isDarkMode ? '#FFFFFF' : '#111827',
            fontFamily: '"Bricolage Grotesque", sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          {line.replace(/^#\s+/, '')}
        </h2>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-xl sm:text-2xl font-bold mt-5 mb-2.5 transition-colors duration-300"
          style={{
            color: isDarkMode ? '#F3F4F6' : '#1F2937',
            fontFamily: '"Bricolage Grotesque", sans-serif',
            letterSpacing: '-0.01em',
          }}
        >
          {line.replace(/^##\s+/, '')}
        </h3>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="text-base sm:text-lg font-bold mt-4 mb-2 transition-colors duration-300"
          style={{
            color: isDarkMode ? '#E5E7EB' : '#374151',
            fontFamily: '"Bricolage Grotesque", sans-serif',
          }}
        >
          {line.replace(/^###\s+/, '')}
        </h4>
      );
    } else if (line.trim() === '---') {
      elements.push(
        <hr
          key={`hr-${i}`}
          className="my-6 border-0"
          style={{
            borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E5E7EB',
          }}
        />
      );
    } else if (line.startsWith('- ')) {
      elements.push(
        <li
          key={`li-${i}`}
          className="ml-5 mb-2 list-disc"
          style={{
            fontFamily: '"Poppins", sans-serif',
            color: isDarkMode ? 'rgba(255,255,255,0.85)' : '#374151',
          }}
        >
          {formatInline(line.replace(/^- /, ''), isDarkMode, i)}
        </li>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
    } else {
      elements.push(
        <p
          key={`p-${i}`}
          className="mb-3 leading-relaxed"
          style={{
            fontFamily: '"Poppins", sans-serif',
            color: isDarkMode ? 'rgba(255,255,255,0.84)' : '#374151',
          }}
        >
          {formatInline(line, isDarkMode, i)}
        </p>
      );
    }
  }
  return elements;
};

export default function Policies({ customSlug }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { slug: routeSlug } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isDe = i18n?.language?.startsWith('de');
  const isFr = i18n?.language?.startsWith('fr');
  const isEs = i18n?.language?.startsWith('es');
  const isUr = i18n?.language === 'ur' || i18n?.language?.startsWith('ur');
  const { isDarkMode } = useTheme();
  const { openCookieSettings, cookiesList } = useCookieConsent();

  // Resolve initial active tab
  const rawTab = customSlug || routeSlug || searchParams.get('tab') || 'terms-of-use';
  const resolvedSlug = SLUG_ALIASES[rawTab] || rawTab;
  const initialTab = TABS.some(t => t.slug === resolvedSlug) ? resolvedSlug : 'terms-of-use';

  const [activeSlug, setActiveSlug] = useState(initialTab);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Scroll container reference so we reset scroll on tab switch
  const scrollContainerRef = useRef(null);

  // Sync tab with URL parameter changes
  useEffect(() => {
    const target = SLUG_ALIASES[rawTab] || rawTab;
    if (TABS.some(t => t.slug === target) && target !== activeSlug) {
      setActiveSlug(target);
    }
  }, [rawTab]);

  // Reset scroll to top when switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSlug]);

  // Fetch page data whenever activeSlug changes
  useEffect(() => {
    let isMounted = true;
    if (!cache[activeSlug]) {
      setLoading(true);
    }
    setError(null);

    fetch(`${API}/public/legal/${activeSlug}?t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.page) {
          setCache((prev) => ({ ...prev, [activeSlug]: data.page }));
        } else {
          setError(data.error || 'Failed to load policy');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load policy:', err);
        setError('Failed to load policy');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeSlug]);

  const handleTabChange = (slug) => {
    setActiveSlug(slug);
    setSearchParams({ tab: slug });
  };

  const currentPage = cache[activeSlug];

  const currentTitle = currentPage
    ? (isUr
        ? (currentPage.title_ur || currentPage.title_en)
        : isDe
        ? (currentPage.title_de || currentPage.title_en)
        : isFr
        ? (currentPage.title_fr || currentPage.title_en)
        : isEs
        ? (currentPage.title_es || currentPage.title_en)
        : (currentPage.title_en || currentPage.title_de))
    : (TABS.find(t => t.slug === activeSlug)?.[isUr ? 'labelUr' : isDe ? 'labelDe' : isFr ? 'labelFr' : isEs ? 'labelEs' : 'labelEn'] || 'Policy');

  const currentContent = currentPage
    ? (isUr
        ? (currentPage.content_ur || currentPage.content_en || '')
        : isDe
        ? (currentPage.content_de || currentPage.content_en || '')
        : isFr
        ? (currentPage.content_fr || currentPage.content_en || '')
        : isEs
        ? (currentPage.content_es || currentPage.content_en || '')
        : (currentPage.content_en || currentPage.content_de || ''))
    : '';

  // Strip duplicate H1 heading from markdown body if card header already displays it
  const cleanedContent = currentContent ? currentContent.replace(/^#\s+[^\n]+\n+/, '') : '';

  const lastUpdatedDate = currentPage?.updatedAt
    ? new Date(currentPage.updatedAt).toLocaleDateString(isUr ? 'ur-PK' : isDe ? 'de-DE' : isFr ? 'fr-FR' : isEs ? 'es-ES' : 'en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : (isUr ? '17 جولائی 2026' : isFr ? '17 juillet 2026' : 'July 17, 2026');

  const renderTabButton = (tab, isMobile = false, isRow1 = false) => {
    const isActive = activeSlug === tab.slug;
    const tabLabel = isUr ? tab.labelUr : isDe ? tab.labelDe : isFr ? tab.labelFr : isEs ? tab.labelEs : tab.labelEn;
    return (
      <button
        key={tab.slug}
        type="button"
        onClick={() => handleTabChange(tab.slug)}
        className={`${
          isMobile ? 'w-full px-0.5 sm:px-1 py-2' : 'flex-1 min-w-fit px-3 sm:px-6 py-2 sm:py-2.5'
        } rounded-[40px] cursor-pointer transition-all duration-200 text-center select-none border-none flex items-center justify-center ${
          isActive ? 'shadow-sm' : 'hover:opacity-75'
        }`}
        style={{
          fontFamily: '"Bricolage Grotesque", sans-serif',
          fontWeight: 700,
          letterSpacing: isMobile && isDe ? '-0.035em' : '-0.01em',
          background: isActive
            ? (isDarkMode ? 'rgba(14, 15, 12, 1)' : 'rgba(36, 50, 77, 1)')
            : 'transparent',
          color: isActive
            ? '#FFFFFF'
            : (isDarkMode ? 'rgba(255, 255, 255, 0.75)' : '#000000'),
          minHeight: isMobile ? '36px' : '40px',
        }}
        title={tabLabel}
      >
        <span
          className="whitespace-nowrap inline-block text-center"
          style={{
            lineHeight: 1,
            fontSize: isMobile
              ? (isDe
                  ? (isRow1 ? 'clamp(7.8px, 2.45vw, 10.5px)' : 'clamp(8.8px, 2.7vw, 11.5px)')
                  : (isRow1 ? 'clamp(10px, 3.1vw, 12.5px)' : 'clamp(10.5px, 3.3vw, 13px)'))
              : undefined,
          }}
        >
          {tabLabel}
        </span>
      </button>
    );
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0E1015] text-white' : 'bg-[#FAFAFA] text-gray-900'
      }`}
    >
      {/* Header Container with solid background so nothing scrolls through */}
      <div
        className={`sticky top-0 z-40 w-full transition-colors duration-300 ${
          isDarkMode ? 'bg-[#0E1015]' : 'bg-[#FAFAFA]'
        }`}
      >
        <Header />
      </div>

      {/* Main Container — Increased width on both sides (max-w-[1480px] xl:max-w-[1560px]) */}
      <main className="flex-1 w-full max-w-[1480px] xl:max-w-[1560px] mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-5 flex flex-col">
        {/* Top Bar: Policies Title + Tab Changer (Scrolls naturally with content - no overlapping!) */}
        <div className="w-full pt-1 pb-4 transition-colors duration-300">
          {/* Page Title with exact website font */}
          <h1
            className="text-[28px] sm:text-[34px] font-extrabold mb-3 text-left transition-colors duration-300"
            style={{
              fontFamily: '"Bricolage Grotesque", sans-serif',
              color: isDarkMode ? '#FFFFFF' : '#0E0F0C',
              letterSpacing: '-0.02em',
            }}
          >
            {t('policies.title', 'Policies')}
          </h1>

          {/* Desktop Tab Switcher Bar: All 5 in 1 single row */}
          <div
            className="hidden md:flex w-full items-center rounded-[50px] p-1 sm:p-1.5 transition-colors duration-300 shadow-sm"
            style={{
              background: isDarkMode ? 'rgba(34, 39, 48, 1)' : '#FFFFFF',
              border: 'none',
              gap: '4px',
              boxSizing: 'border-box',
            }}
          >
            {TABS.map((tab) => renderTabButton(tab, false, false))}
          </div>

          {/* Mobile Tab Switcher: 3 in line 1, 2 in line 2 (identical on all mobiles) */}
          <div
            className="flex md:hidden flex-col w-full rounded-[22px] p-1 transition-colors duration-300 shadow-sm"
            style={{
              background: isDarkMode ? 'rgba(34, 39, 48, 1)' : '#FFFFFF',
              border: 'none',
              gap: '5px',
              boxSizing: 'border-box',
            }}
          >
            {/* Line 1: 3 tabs */}
            <div className="grid grid-cols-3 gap-1 w-full">
              {TABS.slice(0, 3).map((tab) => renderTabButton(tab, true, true))}
            </div>

            {/* Line 2: 2 tabs */}
            <div className="grid grid-cols-2 gap-1 w-full">
              {TABS.slice(3, 5).map((tab) => renderTabButton(tab, true, false))}
            </div>
          </div>

          {/* "Last Updated" subtitle */}
          <div className="mt-2 pl-1">
            <span
              className="text-[12.5px] sm:text-[13px]"
              style={{
                fontFamily: '"Poppins", sans-serif',
                color: isDarkMode ? 'rgba(255, 255, 255, 0.45)' : '#6B7280',
              }}
            >
              {t('policies.lastUpdated', 'Last Updated')}: {lastUpdatedDate}
            </span>
          </div>
        </div>

        {/* Policy Content Section (Scrolls naturally with the page as one unified section) */}
        <div
          ref={scrollContainerRef}
          className="w-full rounded-[20px] sm:rounded-[28px] p-5 sm:p-8 md:p-10 transition-colors duration-300 shadow-sm"
          style={{
            background: isDarkMode ? 'rgba(18, 22, 28, 0.98)' : '#FFFFFF',
            border: 'none',
            minHeight: '420px',
            fontFamily: '"Poppins", sans-serif',
            fontSize: '14.5px',
            lineHeight: 1.85,
            color: isDarkMode ? 'rgba(255, 255, 255, 0.88)' : '#374151',
          }}
        >
          {loading && !currentPage ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div
                className="w-9 h-9 rounded-full animate-spin border-[3px]"
                style={{
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                  borderTopColor: '#00D65D',
                }}
              />
              <span className="text-xs" style={{ fontFamily: '"Poppins", sans-serif', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                {isDe ? 'Wird geladen...' : 'Loading...'}
              </span>
            </div>
          ) : error && !currentPage ? (
            <div className="text-center py-16">
              <p className="text-red-500 font-semibold mb-2" style={{ fontFamily: '"Poppins", sans-serif' }}>
                {isDe ? 'Fehler beim Laden' : 'Failed to load policy'}
              </p>
              <p className="text-xs text-gray-400 mb-4" style={{ fontFamily: '"Poppins", sans-serif' }}>{error}</p>
              <button
                type="button"
                onClick={() => handleTabChange(activeSlug)}
                className="px-4 py-2 rounded-lg bg-[#00A247] text-white text-xs font-semibold cursor-pointer"
                style={{ fontFamily: '"Poppins", sans-serif' }}
              >
                {isDe ? 'Erneut versuchen' : 'Retry'}
              </button>
            </div>
          ) : (
            <div>
              {/* Header Title inside card */}
              <h2
                className="text-[26px] sm:text-[34px] font-extrabold mb-1 tracking-tight"
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  color: isDarkMode ? '#FFFFFF' : '#0E0F0C',
                  letterSpacing: '-0.02em',
                }}
              >
                {currentTitle}
              </h2>

              <p
                className="text-xs sm:text-[13px] italic mb-6"
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#6B7280',
                }}
              >
                ({t('policies.effective', 'Effective')}: {lastUpdatedDate})
              </p>

              {/* Rendered Markdown Body with duplicate title removed */}
              <div className="space-y-1">
                {renderMarkdown(cleanedContent, isDarkMode)}
              </div>

              {/* Dynamic Live Cookie Registry Table when viewing Cookie Policy */}
              {activeSlug === 'cookie-policy' && (
                <div
                  className="mt-10 pt-8 border-t transition-colors duration-300"
                  style={{
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
                  }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3
                        className="text-xl sm:text-2xl font-bold tracking-tight"
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          color: isDarkMode ? '#FFFFFF' : '#111827',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {isDe ? 'Verzeichnis der verwendeten Cookies & Technologien' : 'Registry of Used Cookies & Technologies'}
                      </h3>
                      <p
                        className="text-xs sm:text-sm mt-1"
                        style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}
                      >
                        {isDe
                          ? 'Aktuelle Übersicht der auf TaskMint eingesetzten Cookies und Speichertechnologien mit Verwendungszweck und Speicherdauer.'
                          : 'Live directory of all cookies and browser storage technologies used on TaskMint, including purpose and duration.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={openCookieSettings}
                      className="shrink-0 flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-md active:scale-95 cursor-pointer hover:opacity-90"
                      style={{
                        background: 'rgba(36, 50, 77, 1)',
                        color: '#FFFFFF',
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                      }}
                    >
                      <span>{isDe ? 'Cookie-Einstellungen anpassen' : 'Manage Cookie Preferences'}</span>
                    </button>
                  </div>

                  {/* Cookie items table */}
                  {cookiesList && cookiesList.length > 0 ? (
                    <div
                      className="rounded-2xl overflow-hidden border transition-colors"
                      style={{
                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
                        background: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#F9FAFB',
                      }}
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm border-collapse">
                          <thead>
                            <tr
                              className="border-b text-[11px] font-bold uppercase tracking-wider"
                              style={{
                                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB',
                                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                                background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#F3F4F6',
                              }}
                            >
                              <th className="py-3 px-4 sm:px-6">Cookie / Name</th>
                              <th className="py-3 px-4">Kategorie / Category</th>
                              <th className="py-3 px-4">Anbieter / Provider</th>
                              <th className="py-3 px-4">Dauer / Duration</th>
                              <th className="py-3 px-4 sm:px-6">Zweck / Purpose</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cookiesList.map((c) => (
                              <tr
                                key={c._id || c.name}
                                className="border-b last:border-b-0 transition-colors"
                                style={{
                                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
                                }}
                              >
                                <td className="py-3.5 px-4 sm:px-6 font-semibold">
                                  <code
                                    className="px-2 py-0.5 rounded text-xs"
                                    style={{
                                      background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB',
                                      color: isDarkMode ? '#E5E7EB' : '#1F2937',
                                    }}
                                  >
                                    {c.name}
                                  </code>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize"
                                    style={{
                                      background:
                                        c.category === 'essential'
                                          ? 'rgba(0, 214, 93, 0.15)'
                                          : c.category === 'functional'
                                          ? 'rgba(59, 130, 246, 0.15)'
                                          : 'rgba(245, 158, 11, 0.15)',
                                      color:
                                        c.category === 'essential'
                                          ? '#00D65D'
                                          : c.category === 'functional'
                                          ? '#3B82F6'
                                          : '#F59E0B',
                                    }}
                                  >
                                    {c.category}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-xs" style={{ color: isDarkMode ? '#D1D5DB' : '#4B5563' }}>
                                  {c.provider}
                                </td>
                                <td className="py-3.5 px-4 text-xs whitespace-nowrap" style={{ color: isDarkMode ? '#D1D5DB' : '#4B5563' }}>
                                  <span className="flex items-center gap-1.5">
                                    <FiClock className="w-3.5 h-3.5 text-gray-400" />
                                    {c.duration}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 sm:px-6 text-xs leading-relaxed" style={{ color: isDarkMode ? '#9CA3AF' : '#4B5563' }}>
                                  {isDe ? c.description_de || c.description_en : c.description_en}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-gray-400">
                      {isDe ? 'Keine Cookies registriert.' : 'No cookies registered.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
