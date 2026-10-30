import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiShield,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiClock,
  FiTag,
  FiSearch,
  FiAlertCircle,
  FiLayers,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CATEGORY_META = {
  essential: {
    label: 'Strictly Essential',
    color: '#00D65D',
    bg: 'rgba(0, 214, 93, 0.12)',
    border: 'rgba(0, 214, 93, 0.3)',
    desc: 'Required for core website security, login, and basic operations.',
  },
  functional: {
    label: 'Functional',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.3)',
    desc: 'Remembers user settings like language, dark mode, and layout preferences.',
  },
  marketing: {
    label: 'Marketing / Attribution',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    desc: 'Stores affiliate referral parameters to attribute friend signups.',
  },
};

const AdminCookies = () => {
  const { currentUser } = useAuth();
  const [cookies, setCookies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCookie, setEditingCookie] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'TaskMint',
    category: 'essential',
    duration: 'Persistent',
    description_en: '',
    description_de: '',
    isActive: true,
    order: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCookies();
  }, []);

  const fetchCookies = async () => {
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/cookies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCookies(data.cookies || []);
      } else {
        toast.error(data.error || 'Failed to load cookies');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error loading cookies');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCookie(null);
    setFormData({
      name: '',
      provider: 'TaskMint',
      category: 'functional',
      duration: 'Persistent',
      description_en: '',
      description_de: '',
      isActive: true,
      order: cookies.length + 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cookie) => {
    setEditingCookie(cookie);
    setFormData({
      name: cookie.name || '',
      provider: cookie.provider || 'TaskMint',
      category: cookie.category || 'essential',
      duration: cookie.duration || 'Persistent',
      description_en: cookie.description_en || '',
      description_de: cookie.description_de || '',
      isActive: cookie.isActive !== false,
      order: cookie.order || 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.provider.trim() || !formData.duration.trim()) {
      toast.error('Name, provider, and duration are required');
      return;
    }

    setSubmitting(true);
    try {
      const token = await currentUser.getIdToken();
      const url = editingCookie
        ? `${API}/admin/cookies/${editingCookie._id}`
        : `${API}/admin/cookies`;
      const method = editingCookie ? 'PUT' : 'POST';

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
        toast.success(editingCookie ? 'Cookie updated successfully!' : 'Cookie created successfully!');
        setIsModalOpen(false);
        fetchCookies();
      } else {
        toast.error(data.error || 'Failed to save cookie');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error saving cookie');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/cookies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Cookie deleted successfully');
        setCookies((prev) => prev.filter((c) => c._id !== id));
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error deleting cookie');
    }
  };

  const handleToggleActive = async (cookie) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/admin/cookies/${cookie._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !cookie.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setCookies((prev) =>
          prev.map((c) => (c._id === cookie._id ? { ...c, isActive: !c.isActive } : c))
        );
        toast.success(`Cookie ${!cookie.isActive ? 'activated' : 'deactivated'}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  // Filtered cookies
  const filteredCookies = cookies.filter((c) => {
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description_de.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const countEssential = cookies.filter((c) => c.category === 'essential').length;
  const countFunctional = cookies.filter((c) => c.category === 'functional').length;
  const countMarketing = cookies.filter((c) => c.category === 'marketing').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiShield style={{ color: '#00D65D' }} />
            Cookie Consent & Storage
          </h1>
          <p className="admin-page-sub">
            Manage cookies and browser storage technologies, their categories, retention durations, and legal descriptions.
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
          Add Cookie
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="admin-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Total Registered</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', marginTop: 4 }}>{cookies.length}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px 20px', borderLeft: '4px solid #00D65D' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#00A247', textTransform: 'uppercase' }}>Strictly Essential</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', marginTop: 4 }}>{countEssential}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px 20px', borderLeft: '4px solid #3B82F6' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase' }}>Functional</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', marginTop: 4 }}>{countFunctional}</div>
        </div>
        <div className="admin-card" style={{ padding: '16px 20px', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#D97706', textTransform: 'uppercase' }}>Marketing</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', marginTop: 4 }}>{countMarketing}</div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="admin-card" style={{ marginBottom: '1.5rem', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All (${cookies.length})` },
              { id: 'essential', label: `Essential (${countEssential})` },
              { id: 'functional', label: `Functional (${countFunctional})` },
              { id: 'marketing', label: `Marketing (${countMarketing})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: selectedCategory === tab.id ? 700 : 500,
                  background: selectedCategory === tab.id ? '#1E293B' : '#F3F4F6',
                  color: selectedCategory === tab.id ? '#FFFFFF' : '#4B5563',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: 240 }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Search cookies or providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Cookies Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>Loading cookies...</div>
        ) : filteredCookies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
            No cookies found matching your criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px' }}>Cookie / Key</th>
                  <th style={{ padding: '14px 16px' }}>Category</th>
                  <th style={{ padding: '14px 16px' }}>Provider</th>
                  <th style={{ padding: '14px 16px' }}>Duration</th>
                  <th style={{ padding: '14px 20px' }}>Description (EN / DE)</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Active</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCookies.map((cookie, idx) => {
                  const meta = CATEGORY_META[cookie.category] || CATEGORY_META.essential;
                  return (
                    <tr
                      key={cookie._id}
                      style={{
                        borderBottom: idx === filteredCookies.length - 1 ? 'none' : '1px solid #F3F4F6',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Name */}
                      <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                        <code style={{ background: '#F3F4F6', padding: '3px 7px', borderRadius: '6px', fontSize: '0.82rem', color: '#1F2937' }}>
                          {cookie.name}
                        </code>
                        {cookie.isDefault && (
                          <span style={{ marginLeft: 6, fontSize: '0.68rem', padding: '2px 6px', background: '#E0E7FF', color: '#4338CA', borderRadius: '4px', fontWeight: 600 }}>
                            System
                          </span>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td style={{ padding: '16px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>

                      {/* Provider */}
                      <td style={{ padding: '16px 16px', color: '#4B5563' }}>
                        {cookie.provider}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '16px 16px', color: '#4B5563' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <FiClock size={12} style={{ color: '#9CA3AF' }} />
                          {cookie.duration}
                        </span>
                      </td>

                      {/* Descriptions */}
                      <td style={{ padding: '16px 20px', maxWidth: 320 }}>
                        <div style={{ fontSize: '0.82rem', color: '#111827', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: '#3B82F6', marginRight: 4 }}>EN:</span>
                          {cookie.description_en || '—'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                          <span style={{ fontWeight: 600, color: '#10B981', marginRight: 4 }}>DE:</span>
                          {cookie.description_de || '—'}
                        </div>
                      </td>

                      {/* Active Status */}
                      <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(cookie)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: cookie.isActive !== false ? '#DCFCE7' : '#FEE2E2',
                            color: cookie.isActive !== false ? '#15803D' : '#B91C1C',
                          }}
                        >
                          {cookie.isActive !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(cookie)}
                            title="Edit Cookie"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #E5E7EB',
                              background: '#FFFFFF',
                              color: '#374151',
                              cursor: 'pointer',
                            }}
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cookie._id, cookie.name)}
                            title="Delete Cookie"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #FEE2E2',
                              background: '#FEF2F2',
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="admin-card"
            style={{
              width: '100%',
              maxWidth: 580,
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '24px 28px',
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>
                {editingCookie ? 'Edit Cookie / Technology' : 'Add New Cookie / Technology'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Cookie / Storage Key Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. taskmint_theme, ref, _ga"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                />
              </div>

              {/* Provider & Duration Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Provider *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TaskMint"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Storage Duration *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Session, 30 days, Persistent"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.88rem', background: '#FFFFFF' }}
                >
                  <option value="essential">Strictly Essential (Always Active, Cannot Opt-Out)</option>
                  <option value="functional">Functional (Preferences, Dark Mode, Language)</option>
                  <option value="marketing">Marketing (Affiliate Referrals, External Trackers)</option>
                </select>
              </div>

              {/* Description EN */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Purpose / Explanation (English) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain what this cookie does in simple words..."
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.88rem', resize: 'vertical' }}
                />
              </div>

              {/* Description DE */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Zweck / Erklärung (German) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Erklären Sie den Zweck in einfachen Worten auf Deutsch..."
                  value={formData.description_de}
                  onChange={(e) => setFormData({ ...formData, description_de: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.88rem', resize: 'vertical' }}
                />
              </div>

              {/* Order & Active */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="cookie-active"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="cookie-active" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    Active (Publicly visible & enforced)
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: '0.82rem', color: '#6B7280' }}>Display Order:</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#374151', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#00D65D',
                    color: '#0A0D12',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Saving...' : editingCookie ? 'Update Cookie' : 'Create Cookie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCookies;
