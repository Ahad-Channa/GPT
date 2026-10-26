import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiFileText,
  FiSave,
  FiGlobe,
  FiCheck,
  FiAlertCircle,
  FiShield,
  FiInfo,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PAGE_LABELS = {
  'impressum': { label: 'Impressum', icon: '🏛️', description: 'Legal disclosure required for German websites (Pflichtangaben nach § 5 DDG).' },
  'terms-of-use': { label: 'Terms of Use', icon: '📜', description: 'General terms and conditions governing the use of the platform.' },
  'privacy-policy': { label: 'Privacy Policy', icon: '🔒', description: 'Data protection and privacy information for users.' },
  'affiliate-policy': { label: 'Affiliate Policy', icon: '🤝', description: 'Referral program guidelines, commission rules, and advertising compliance.' },
  'cookie-policy': { label: 'Cookie Policy', icon: '🍪', description: 'Information on cookies, tracking technologies, and consent settings.' },
};

const AdminLegalPages = () => {
  const { currentUser } = useAuth();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState('impressum');
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState('en');

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/legal-pages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPages(data.pages);
        // Initialize edit data for all pages
        const ed = {};
        data.pages.forEach(p => {
          ed[p.slug] = {
            title_en: p.title_en || '',
            content_en: p.content_en || '',
            title_de: p.title_de || '',
            content_de: p.content_de || '',
            title_ur: p.title_ur || '',
            content_ur: p.content_ur || '',
          };
        });
        setEditData(ed);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load legal pages');
    }
    setLoading(false);
  };

  const handleSave = async (slug) => {
    if (!editData[slug]) return;
    setSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/legal-pages/${slug}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData[slug]),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${PAGE_LABELS[slug]?.label || slug} saved successfully!`);
        // Update local state
        setPages(prev => prev.map(p => p.slug === slug ? data.page : p));
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error');
    }
    setSaving(false);
  };

  const updateField = (slug, field, value) => {
    setEditData(prev => ({
      ...prev,
      [slug]: {
        ...prev[slug],
        [field]: value,
      },
    }));
  };

  const current = editData[activeSlug] || {};
  const meta = PAGE_LABELS[activeSlug] || {};
  const pageObj = pages.find(p => p.slug === activeSlug);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiFileText style={{ color: '#2563EB' }} />
            Legal Pages
          </h1>
          <p className="admin-page-sub">Manage Impressum, Terms of Use, Privacy Policy, and other legal content in English, German, and Urdu.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>

          {/* Left: Page Selector Tabs */}
          <div style={{ width: 260, flexShrink: 0 }}>
            <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px 8px', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#9CA3AF',
                }}>
                  Select Page
                </span>
              </div>
              {Object.entries(PAGE_LABELS).map(([slug, { label, icon }]) => {
                const isActive = activeSlug === slug;
                const p = pages.find(pg => pg.slug === slug);
                const hasContent = p && (p.content_en || p.content_de);
                return (
                  <button
                    key={slug}
                    onClick={() => setActiveSlug(slug)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '14px 20px',
                      border: 'none',
                      borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
                      background: isActive ? '#EFF6FF' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.92rem',
                      color: isActive ? '#1E40AF' : '#374151',
                    }}
                  >
                    <span style={{ fontSize: '1.15rem' }}>{icon}</span>
                    <span style={{ flex: 1 }}>{label}</span>
                    {hasContent ? (
                      <FiCheck size={14} style={{ color: '#22C55E' }} />
                    ) : (
                      <FiAlertCircle size={14} style={{ color: '#F59E0B' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Editor */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="admin-card">
              {/* Page Title and Description */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#0E0F0C',
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700,
                  fontSize: '1.15rem',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{meta.icon}</span>
                  {meta.label}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6B7280' }}>
                  {meta.description}
                </p>
                {pageObj?.updatedAt && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
                    Last updated: {new Date(pageObj.updatedAt).toLocaleString()}
                  </p>
                )}
                {activeSlug === 'cookie-policy' && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0, 214, 93, 0.08)',
                      border: '1px solid rgba(0, 214, 93, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', color: '#065F46', fontWeight: 500 }}>
                      Looking to add, edit, or delete individual cookies and duration periods?
                    </span>
                    <Link
                      to="/admin/cookies"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#00A247',
                        textDecoration: 'none',
                      }}
                    >
                      <FiShield size={14} />
                      Open Cookie Consent Manager →
                    </Link>
                  </div>
                )}
              </div>

              {/* Markdown Formatting Explanation & Example (Applies to all 5 legal pages) */}
              <div
                style={{
                  marginBottom: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  padding: '1.15rem 1.25rem',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: '#EFF6FF',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    <FiInfo size={16} />
                  </div>
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                      }}
                    >
                      Formatting Instructions
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748B' }}>
                      Use these standard symbols in the content box below. They will automatically be styled on the website:
                    </p>
                  </div>
                </div>

                {/* Explanation Rules */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '0.55rem 1.25rem',
                    fontSize: '0.8rem',
                    color: '#334155',
                    marginBottom: '1rem',
                    background: '#FFFFFF',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div>
                    <code style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>## Title</code>
                    <span style={{ marginLeft: '8px' }}>— Major section heading</span>
                  </div>
                  <div>
                    <code style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>### Title</code>
                    <span style={{ marginLeft: '8px' }}>— Sub-heading (e.g. contact block)</span>
                  </div>
                  <div>
                    <code style={{ background: '#F0FDF4', color: '#15803D', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>- item</code>
                    <span style={{ marginLeft: '8px' }}>— <strong>How to add a dot (●)</strong>: Start line with hyphen + space</span>
                  </div>
                  <div>
                    <code style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>---</code>
                    <span style={{ marginLeft: '8px' }}>— Horizontal <strong>divider line</strong> between sections</span>
                  </div>
                  <div>
                    <code style={{ background: '#FAF5FF', color: '#7E22CE', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>**text**</code>
                    <span style={{ marginLeft: '8px' }}>— <strong>Bold</strong> text</span>
                  </div>
                  <div>
                    <code style={{ background: '#FAF5FF', color: '#7E22CE', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>*text*</code>
                    <span style={{ marginLeft: '8px' }}>— <em>Italic</em> text</span>
                  </div>
                  <div>
                    <code style={{ background: '#F0F9FF', color: '#0369A1', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>[Text](URL)</code>
                    <span style={{ marginLeft: '8px' }}>— Clickable link (e.g. <code>[Support](mailto:info@...)</code>)</span>
                  </div>
                  <div>
                    <code style={{ background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>Enter twice</code>
                    <span style={{ marginLeft: '8px' }}>— Leave an empty line between paragraphs</span>
                  </div>
                </div>

                {/* Single Example Block */}
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '6px' }}>
                    Example:
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '12px 16px',
                      background: '#1E2538',
                      color: '#F8FAFC',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      lineHeight: '1.6',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      overflowX: 'auto',
                    }}
                  >{`## 1. Company Information
Pursuant to Section 5 DDG:
TaskMint Platform / Goodpicks Media GmbH
Musterstraße 123, 10115 Berlin, Germany

---

### Contact Information:
- Telephone: +49 (0) 30 123456
- Email: [support@taskmint.io](mailto:support@taskmint.io)
- Website: [taskmint.io](https://taskmint.io)
- Managing Director: **Max Mustermann**`}
                  </pre>
                </div>
              </div>

              {/* Language Tabs */}
              <div style={{
                display: 'flex',
                gap: 0,
                marginBottom: '1.25rem',
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid #E5E7EB',
                width: 'fit-content',
              }}>
                {[
                  { key: 'en', label: '🇬🇧 English', flag: '🇬🇧' },
                  { key: 'de', label: '🇩🇪 Deutsch', flag: '🇩🇪' },
                  { key: 'ur', label: '🇵🇰 اردو', flag: '🇵🇰' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveLang(key)}
                    style={{
                      padding: '8px 20px',
                      border: 'none',
                      background: activeLang === key ? '#2563EB' : '#FFFFFF',
                      color: activeLang === key ? '#FFFFFF' : '#374151',
                      fontWeight: activeLang === key ? 700 : 500,
                      fontSize: '0.82rem',
                      fontFamily: "'Poppins', sans-serif",
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Title Field (Full Width) */}
              <div style={{ marginBottom: '1.25rem', width: '100%' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.45rem',
                  fontSize: '0.78rem',
                  color: '#4B5563',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Page Title ({activeLang === 'en' ? 'English' : activeLang === 'de' ? 'German' : 'Urdu'}) *
                </label>
                <input
                  type="text"
                  dir={activeLang === 'ur' ? 'rtl' : 'ltr'}
                  value={current[`title_${activeLang}`] || ''}
                  onChange={(e) => updateField(activeSlug, `title_${activeLang}`, e.target.value)}
                  placeholder={
                    activeLang === 'en'
                      ? `e.g. ${meta.label}`
                      : activeLang === 'de'
                      ? `z.B. ${meta.label}`
                      : `مثال: ${meta.label}`
                  }
                  className="admin-input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    display: 'block',
                    padding: '0.75rem 1rem',
                    fontSize: '0.92rem',
                    borderRadius: '10px',
                    border: '1px solid #D1D5DB',
                    background: '#FFFFFF',
                    color: '#0E0F0C',
                  }}
                />
              </div>

              {/* Content Field (Full Width & Expanded Height) */}
              <div style={{ marginBottom: '1.5rem', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <label style={{
                    fontSize: '0.78rem',
                    color: '#4B5563',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Page Content ({activeLang === 'en' ? 'English' : activeLang === 'de' ? 'German' : 'Urdu'}) *
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                    Full Markdown Supported
                  </span>
                </div>
                <textarea
                  id="legal-page-content-textarea"
                  dir={activeLang === 'ur' ? 'rtl' : 'ltr'}
                  value={current[`content_${activeLang}`] || ''}
                  onChange={(e) => updateField(activeSlug, `content_${activeLang}`, e.target.value)}
                  placeholder={
                    activeLang === 'en'
                      ? 'Enter the full page content here using Markdown formatting (e.g. ## Heading, ### Subtitle, - Bullets, --- Dividers)...'
                      : activeLang === 'de'
                      ? 'Geben Sie den vollständigen Seiteninhalt hier mit Markdown-Formatierung ein (z.B. ## Überschrift, ### Untertitel, - Aufzählungspunkte, --- Trennlinie)...'
                      : 'مارک ڈاؤن فارمیٹنگ کا استعمال کرتے ہوئے صفحہ کا مواد یہاں درج کریں (جیسے ## ہیڈنگ، ### ذیلی عنوان، - نکات، --- لکیر)...'
                  }
                  className="admin-input"
                  rows={24}
                  style={{
                    width: '100%',
                    minWidth: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    display: 'block',
                    minHeight: 520,
                    resize: 'vertical',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: '0.88rem',
                    lineHeight: '1.65',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid #D1D5DB',
                    background: '#FFFFFF',
                    color: '#111827',
                  }}
                />
              </div>

              {/* Save Button */}
              <button
                className="action-btn primary"
                onClick={() => handleSave(activeSlug)}
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.75rem 1.85rem',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  borderRadius: '10px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  background: '#1E2538',
                  color: '#FFFFFF',
                  border: 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.18s ease',
                }}
              >
                <FiSave size={16} />
                {saving ? 'Saving...' : `Save ${meta.label}`}
              </button>

              {/* Tip */}
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: '#EFF6FF',
                borderRadius: '12px',
                border: '1px solid #BFDBFE',
              }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#1E40AF', lineHeight: '1.5' }}>
                  <strong>Tip:</strong> You can write content in both English and German. 
                  Users will automatically see the version matching their language setting. 
                  If the German version is empty, the English version will be used as fallback.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLegalPages;
