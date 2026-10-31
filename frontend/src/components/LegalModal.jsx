import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PAGE_TITLES = {
  'impressum': { en: 'Impressum', de: 'Impressum', fr: 'Mentions Légales', es: 'Aviso Legal', ur: 'امپریسم (قانونی معلومات)' },
  'terms-of-use': { en: 'Terms of Service', de: 'Nutzungsbedingungen', fr: "Conditions d'Utilisation", es: 'Términos de Servicio', ur: 'استعمال کی شرائط' },
  'privacy-policy': { en: 'Privacy Policy', de: 'Datenschutzerklärung', fr: 'Politique de Confidentialité', es: 'Política de Privacidad', ur: 'پرائیویسی پالیسی' },
  'affiliate-policy': { en: 'Affiliate Policy', de: 'Partnerprogramm-Richtlinie', fr: "Politique d'Affiliation", es: 'Política de Afiliados', ur: 'ایفیلی ایٹ پالیسی' },
  'cookie-policy': { en: 'Cookie Policy', de: 'Cookie-Richtlinie', fr: 'Politique relative aux Cookies', es: 'Política de Cookies', ur: 'کوکی پالیسی' },
};

const formatInline = (text, isDarkMode, lineIdx = 0) => {
  if (!text) return text;
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`b-${lineIdx}-${idx}`} style={{ color: isDarkMode ? '#FFFFFF' : '#111827', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`em-${lineIdx}-${idx}`}>{part.slice(1, -1)}</em>;
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={`a-${lineIdx}-${idx}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#00A247', textDecoration: 'underline' }}
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={`t-${lineIdx}-${idx}`}>{part}</span>;
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
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            margin: '1.75rem 0 0.85rem',
            color: isDarkMode ? '#FFFFFF' : '#111827',
            fontFamily: '"Bricolage Grotesque", sans-serif',
            letterSpacing: '-0.01em',
          }}
        >
          {line.replace(/^#\s+/, '')}
        </h2>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            margin: '1.5rem 0 0.65rem',
            color: isDarkMode ? '#F3F4F6' : '#1F2937',
            fontFamily: '"Bricolage Grotesque", sans-serif',
          }}
        >
          {line.replace(/^##\s+/, '')}
        </h3>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h4-${i}`}
          style={{
            fontSize: '1.02rem',
            fontWeight: 600,
            margin: '1.25rem 0 0.4rem',
            color: isDarkMode ? '#E5E7EB' : '#374151',
          }}
        >
          {line.replace(/^###\s+/, '')}
        </h4>
      );
    } else if (line.trim() === '---') {
      elements.push(
        <hr
          key={`hr-${i}`}
          style={{
            border: 'none',
            borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E5E7EB',
            margin: '1.5rem 0',
          }}
        />
      );
    } else if (line.startsWith('- ')) {
      elements.push(
        <li
          key={`li-${i}`}
          style={{
            marginLeft: '1.25rem',
            marginBottom: '0.35rem',
            listStyleType: 'disc',
            color: isDarkMode ? 'rgba(255,255,255,0.85)' : '#374151',
          }}
        >
          {formatInline(line.replace(/^- /, ''), isDarkMode, i)}
        </li>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={`empty-${i}`} style={{ height: '0.5rem' }} />);
    } else {
      elements.push(
        <p
          key={`p-${i}`}
          style={{
            marginBottom: '0.55rem',
            color: isDarkMode ? 'rgba(255,255,255,0.82)' : '#374151',
          }}
        >
          {formatInline(line, isDarkMode, i)}
        </p>
      );
    }
  }
  return elements;
};

export default function LegalModal({ isOpen, onClose, initialSlug = 'impressum' }) {
  const { isDarkMode } = useTheme();
  const { i18n } = useTranslation();
  const isDe = i18n?.language?.startsWith('de');
  const isFr = i18n?.language?.startsWith('fr');
  const isEs = i18n?.language?.startsWith('es');
  const isUr = i18n?.language === 'ur' || i18n?.language?.startsWith('ur');

  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeSlug = initialSlug || 'impressum';

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Fetch legal page when modal opens or activeSlug changes
  useEffect(() => {
    if (!isOpen || !activeSlug) return;

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
          setError(data.error || 'Failed to load page');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load legal page:', err);
        setError('Failed to load page');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeSlug]);

  if (!isOpen) return null;

  const currentPage = cache[activeSlug];

  const title = currentPage
    ? (isUr
        ? (currentPage.title_ur || currentPage.title_en)
        : isDe
        ? (currentPage.title_de || currentPage.title_en)
        : isFr
        ? (currentPage.title_fr || currentPage.title_en)
        : isEs
        ? (currentPage.title_es || currentPage.title_en)
        : (currentPage.title_en || currentPage.title_de))
    : PAGE_TITLES[activeSlug]?.[isUr ? 'ur' : isDe ? 'de' : isFr ? 'fr' : isEs ? 'es' : 'en'] || 'Legal';

  const content = currentPage
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

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto overflow-x-hidden flex items-center justify-center p-2.5 sm:p-4 md:p-6"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`relative rounded-[24px] sm:rounded-[36px] shadow-2xl flex flex-col w-full my-auto transition-colors duration-300 overflow-hidden p-2 sm:p-[10px] pb-4 sm:pb-6 ${
          isDarkMode ? 'border border-white/10' : 'bg-white border border-black/5'
        }`}
          style={{
            maxWidth: '780px',
            maxHeight: '90vh',
            width: '100%',
            backgroundColor: isDarkMode ? 'rgba(12, 14, 17, 1)' : 'rgba(255, 255, 255, 1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header Card */}
          <div
            className="relative rounded-[18px] sm:rounded-[24px] overflow-hidden flex flex-col justify-center w-full transition-colors duration-300 p-4 sm:p-[20px_24px] shrink-0"
            style={{
              background: isDarkMode ? 'rgba(18, 22, 28, 1)' : 'rgba(248, 245, 239, 1)',
            }}
          >
            {/* Top row: Brand & Close */}
            <div className="flex items-center justify-between relative z-10 mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#00A247',
                  }}
                />
                <span
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: isDarkMode ? '#00D65D' : '#00A247',
                  }}
                >
                  TaskMint Legal
                </span>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className={`rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer shadow-sm p-0 ${
                  isDarkMode ? 'bg-white text-black' : 'bg-black text-white'
                }`}
                style={{
                  width: '26px',
                  height: '26px',
                }}
                aria-label="Close popup"
              >
                <FiX style={{ width: '14px', height: '14px', strokeWidth: 2.5 }} />
              </button>
            </div>

            {/* Title & Blue/Purple Accent line matching other popups */}
            <div className="relative z-10">
              <h2
                className="m-0 text-[24px] sm:text-[32px] leading-[30px] sm:leading-[38px] transition-colors duration-300"
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: isDarkMode ? '#FFFFFF' : '#0E0F0C',
                }}
              >
                {title}
              </h2>
              <div
                style={{
                  width: '74px',
                  height: '4px',
                  borderRadius: '20px',
                  background: 'rgba(85, 88, 211, 1)',
                  marginTop: '10px',
                }}
              />
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div
            className="p-3 sm:p-5 md:p-6 overflow-y-auto"
            style={{
              flex: 1,
              fontFamily: '"Poppins", sans-serif',
              fontSize: '14.5px',
              lineHeight: 1.8,
              color: isDarkMode ? 'rgba(255,255,255,0.86)' : '#374151',
              maxHeight: 'calc(90vh - 150px)',
            }}
          >
            {loading && !currentPage ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div
                  className="w-[34px] h-[34px] rounded-full animate-spin border-[3px]"
                  style={{
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                    borderTopColor: '#00A247',
                  }}
                />
                <span style={{ fontSize: '13px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                  {isDe ? 'Wird geladen...' : isFr ? 'Chargement...' : 'Loading...'}
                </span>
              </div>
            ) : error && !currentPage ? (
              <div className="text-center py-14">
                <p style={{ color: '#EF4444', fontWeight: 600, marginBottom: '6px' }}>
                  {isDe ? 'Fehler beim Laden' : isFr ? 'Échec du chargement' : 'Failed to load content'}
                </p>
                <p style={{ fontSize: '13px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                  {error}
                </p>
              </div>
            ) : (
              <div>
                {currentPage?.updatedAt && (
                  <p
                    style={{
                      fontSize: '12px',
                      color: isDarkMode ? 'rgba(255,255,255,0.45)' : '#9CA3AF',
                      marginBottom: '16px',
                    }}
                  >
                    {isDe ? 'Zuletzt aktualisiert:' : isFr ? 'Dernière mise à jour :' : 'Last updated:'}{' '}
                    {new Date(currentPage.updatedAt).toLocaleDateString(isDe ? 'de-DE' : isFr ? 'fr-FR' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}

                {content ? (
                  renderMarkdown(content, isDarkMode)
                ) : (
                  <p
                    style={{
                      textAlign: 'center',
                      color: isDarkMode ? 'rgba(255,255,255,0.35)' : '#9CA3AF',
                      padding: '40px 0',
                      fontStyle: 'italic',
                    }}
                  >
                    {isDe
                      ? 'Diese Seite wurde noch nicht eingerichtet.'
                      : 'This page has not been set up yet.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
  );
}
