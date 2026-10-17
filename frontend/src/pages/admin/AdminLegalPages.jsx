import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiFileText, FiSave, FiGlobe, FiCheck, FiAlertCircle } from 'react-icons/fi';
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
          <p className="admin-page-sub">Manage Impressum, Terms of Use, and Privacy Policy content in English and German.</p>
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

              {/* Title Field */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.4rem',
                  fontSize: '0.78rem',
                  color: '#4B5563',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Page Title ({activeLang === 'en' ? 'English' : 'German'}) *
                </label>
                <input
                  type="text"
                  value={current[`title_${activeLang}`] || ''}
                  onChange={(e) => updateField(activeSlug, `title_${activeLang}`, e.target.value)}
                  placeholder={activeLang === 'en' ? `e.g. ${meta.label}` : `z.B. ${meta.label}`}
                  className="admin-input"
                />
              </div>

              {/* Content Field */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.4rem',
                  fontSize: '0.78rem',
                  color: '#4B5563',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Page Content ({activeLang === 'en' ? 'English' : 'German'}) *
                </label>
                <textarea
                  value={current[`content_${activeLang}`] || ''}
                  onChange={(e) => updateField(activeSlug, `content_${activeLang}`, e.target.value)}
                  placeholder={activeLang === 'en'
                    ? 'Enter the full page content here...'
                    : 'Geben Sie den vollständigen Seiteninhalt hier ein...'}
                  className="admin-input"
                  rows={18}
                  style={{ resize: 'vertical', minHeight: 300 }}
                />
              </div>

              {/* Save Button */}
              <button
                className="admin-btn-primary"
                onClick={() => handleSave(activeSlug)}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <FiSave />
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
