import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiHelpCircle,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSearch,
  FiAlertCircle,
  FiEye,
  FiEyeOff,
  FiGlobe,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', isDefault: true, qKey: 'question', aKey: 'answer' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', qKey: 'questionDe', aKey: 'answerDe' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', qKey: 'questionFr', aKey: 'answerFr' },
  { code: 'es', label: 'Español', flag: '🇪🇸', qKey: 'questionEs', aKey: 'answerEs' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', qKey: 'questionRu', aKey: 'answerRu' },
  { code: 'pt', label: 'Português', flag: '🇵🇹', qKey: 'questionPt', aKey: 'answerPt' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', qKey: 'questionIt', aKey: 'answerIt' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱', qKey: 'questionPl', aKey: 'answerPl' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷', qKey: 'questionTr', aKey: 'answerTr' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰', dir: 'rtl', qKey: 'questionUr', aKey: 'answerUr' },
];

const INITIAL_FORM = {
  question: '',
  answer: '',
  questionDe: '',
  answerDe: '',
  questionUr: '',
  answerUr: '',
  questionFr: '',
  answerFr: '',
  questionEs: '',
  answerEs: '',
  questionRu: '',
  answerRu: '',
  questionPt: '',
  answerPt: '',
  questionIt: '',
  answerIt: '',
  questionPl: '',
  answerPl: '',
  questionTr: '',
  answerTr: '',
  order: 0,
  isActive: true,
};

const AdminFaqs = () => {
  const { currentUser } = useAuth();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState('en');

  // Form State
  const [formData, setFormData] = useState(INITIAL_FORM);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/admin/faqs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFaqs(data.faqs || []);
      } else {
        toast.error(data.error || 'Failed to fetch FAQs');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingFaq(null);
    setActiveLang('en');
    setFormData({
      ...INITIAL_FORM,
      order: faqs.length,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (faq) => {
    setEditingFaq(faq);
    setActiveLang('en');
    setFormData({
      question: faq.question || '',
      answer: faq.answer || '',
      questionDe: faq.questionDe || '',
      answerDe: faq.answerDe || '',
      questionUr: faq.questionUr || '',
      answerUr: faq.answerUr || '',
      questionFr: faq.questionFr || '',
      answerFr: faq.answerFr || '',
      questionEs: faq.questionEs || '',
      answerEs: faq.answerEs || '',
      questionRu: faq.questionRu || '',
      answerRu: faq.answerRu || '',
      questionPt: faq.questionPt || '',
      answerPt: faq.answerPt || '',
      questionIt: faq.questionIt || '',
      answerIt: faq.answerIt || '',
      questionPl: faq.questionPl || '',
      answerPl: faq.answerPl || '',
      questionTr: faq.questionTr || '',
      answerTr: faq.answerTr || '',
      order: faq.order ?? 0,
      isActive: faq.isActive ?? true,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingFaq(null);
    setActiveLang('en');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('English Question and Answer are required');
      setActiveLang('en');
      return;
    }

    setSaving(true);
    try {
      const token = await currentUser?.getIdToken();
      const isEdit = Boolean(editingFaq);
      const url = isEdit ? `${API}/admin/faqs/${editingFaq._id}` : `${API}/admin/faqs`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(isEdit ? 'FAQ updated successfully' : 'FAQ created successfully');
        closeModal();
        fetchFaqs();
      } else {
        toast.error(data.error || 'Failed to save FAQ');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (faq) => {
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/admin/faqs/${faq._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !faq.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`FAQ ${!faq.isActive ? 'activated' : 'deactivated'}`);
        setFaqs((prev) =>
          prev.map((item) => (item._id === faq._id ? { ...item, isActive: !item.isActive } : item))
        );
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/admin/faqs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('FAQ deleted');
        setFaqs((prev) => prev.filter((item) => item._id !== id));
      } else {
        toast.error(data.error || 'Failed to delete FAQ');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete FAQ');
    }
  };

  const filteredFaqs = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.questionDe && f.questionDe.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.questionUr && f.questionUr.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentLangObj = LANGUAGES.find((l) => l.code === activeLang) || LANGUAGES[0];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiHelpCircle style={{ color: '#00D65D' }} />
            FAQ Management
          </h1>
          <p className="admin-page-sub">
            Add, update, or translate questions and dropdown answers for the dedicated FAQ page.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="admin-btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            background: '#00D65D',
            color: '#0A0D12',
            fontWeight: 700,
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <FiPlus size={18} />
          Add FAQ
        </button>
      </div>

      {/* Stats Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="admin-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
            Total FAQs
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px' }}>{faqs.length}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#00D65D', textTransform: 'uppercase' }}>
            Active FAQs
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: '#00D65D' }}>
            {faqs.filter((f) => f.isActive).length}
          </div>
        </div>
        <div className="admin-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#EF4444', textTransform: 'uppercase' }}>
            Inactive FAQs
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '4px', color: '#EF4444' }}>
            {faqs.filter((f) => !f.isActive).length}
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="admin-card" style={{ padding: '12px 16px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FiSearch style={{ color: '#6B7280' }} />
          <input
            type="text"
            placeholder="Search FAQs by question or answer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '0.95rem',
              color: 'inherit',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
            >
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* FAQ Items List */}
      {loading ? (
        <div className="admin-card" style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
          Loading FAQs...
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="admin-card" style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
          <FiAlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ margin: 0, fontWeight: 500 }}>No FAQs found.</p>
          <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>Click "Add FAQ" above to create your first FAQ entry.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredFaqs.map((faq, index) => {
            // Count translations
            const translatedCount = LANGUAGES.filter(
              (l) => !l.isDefault && (faq[l.qKey] || faq[l.aKey])
            ).length;

            return (
              <div
                key={faq._id}
                className="admin-card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  borderLeft: faq.isActive ? '4px solid #00D65D' : '4px solid #6B7280',
                  opacity: faq.isActive ? 1 : 0.7,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      #{faq.order ?? index + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{faq.question}</h3>
                      <p
                        style={{
                          margin: '8px 0 0',
                          fontSize: '0.9rem',
                          color: 'rgba(255, 255, 255, 0.7)',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {faq.answer}
                      </p>

                      {/* Language badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#6B7280',
                            fontWeight: 600,
                          }}
                        >
                          <FiGlobe size={12} /> Translations:
                        </span>
                        {LANGUAGES.map((lang) => {
                          const hasContent = Boolean(faq[lang.qKey] && faq[lang.aKey]);
                          if (!hasContent && !lang.isDefault) return null;
                          return (
                            <span
                              key={lang.code}
                              title={`${lang.label} translated`}
                              style={{
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: lang.isDefault
                                  ? 'rgba(59, 130, 246, 0.15)'
                                  : 'rgba(0, 214, 93, 0.15)',
                                color: lang.isDefault ? '#60A5FA' : '#00D65D',
                                fontWeight: 600,
                              }}
                            >
                              {lang.flag} {lang.label}
                            </span>
                          );
                        })}
                        {translatedCount === 0 && (
                          <span style={{ fontSize: '0.72rem', color: '#6B7280', fontStyle: 'italic' }}>
                            English only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', shrink: 0 }}>
                    <button
                      onClick={() => handleToggleStatus(faq)}
                      title={faq.isActive ? 'Hide FAQ' : 'Show FAQ'}
                      style={{
                        background: faq.isActive ? 'rgba(0, 214, 93, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: faq.isActive ? '#00D65D' : '#EF4444',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {faq.isActive ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                      {faq.isActive ? 'Active' : 'Inactive'}
                    </button>

                    <button
                      onClick={() => openEditModal(faq)}
                      title="Edit FAQ & Translations"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'inherit',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      <FiEdit2 size={15} />
                    </button>

                    <button
                      onClick={() => handleDelete(faq._id)}
                      title="Delete FAQ"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#EF4444',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="admin-card"
            style={{
              width: '100%',
              maxWidth: 620,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '16px',
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                  {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#9CA3AF' }}>
                  Provide question & answer in English, then switch tabs to add other languages.
                </p>
              </div>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Language Tabs Selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Language / Translations
                </label>
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Switch tabs to provide translations</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  overflowX: 'auto',
                }}
              >
                {LANGUAGES.map((lang) => {
                  const isSelected = activeLang === lang.code;
                  const hasTranslation = Boolean(formData[lang.qKey] && formData[lang.aKey]);

                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setActiveLang(lang.code)}
                      style={{
                        flex: '1 0 auto',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? '1px solid rgba(0, 214, 93, 0.5)' : '1px solid transparent',
                        background: isSelected ? '#00D65D' : 'transparent',
                        color: isSelected ? '#0A0D12' : 'inherit',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                      {hasTranslation && !isSelected && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#00D65D',
                            display: 'inline-block',
                          }}
                          title="Translated"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Question ({currentLangObj.label}) {currentLangObj.isDefault ? '*' : '(Optional)'}
                </label>
                <input
                  type="text"
                  required={currentLangObj.isDefault}
                  dir={currentLangObj.dir || 'ltr'}
                  placeholder={
                    currentLangObj.isDefault
                      ? 'e.g. How do I earn money?'
                      : `Enter ${currentLangObj.label} translation for question...`
                  }
                  value={formData[currentLangObj.qKey] || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, [currentLangObj.qKey]: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'inherit',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Answer / Dropdown ({currentLangObj.label}) {currentLangObj.isDefault ? '*' : '(Optional)'}
                </label>
                <textarea
                  required={currentLangObj.isDefault}
                  rows={4}
                  dir={currentLangObj.dir || 'ltr'}
                  placeholder={
                    currentLangObj.isDefault
                      ? 'e.g. By completing offers, surveys, and tasks on the platform.'
                      : `Enter ${currentLangObj.label} translation for answer...`
                  }
                  value={formData[currentLangObj.aKey] || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, [currentLangObj.aKey]: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'inherit',
                    fontSize: '0.95rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: 'inherit',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '22px' }}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#00D65D' }}
                  />
                  <label htmlFor="isActive" style={{ fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>
                    Active (Visible on page)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'transparent',
                    color: 'inherit',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#00D65D',
                    color: '#0A0D12',
                    cursor: 'pointer',
                    fontWeight: 700,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving...' : editingFaq ? 'Update FAQ' : 'Create FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFaqs;
