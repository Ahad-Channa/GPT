import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiStar, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight,
  FiExternalLink, FiClock, FiLoader, FiAlertTriangle, FiRefreshCw, FiX
} from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PRESET_ICONS = [
  '🎮', '🏆', '💰', '🎯', '🎁', '💎', '🔥', '⚡',
  '🚀', '📱', '🛒', '🎵', '💪', '🌟', '🎲', '📺',
];

// Returns true if the icon value is a URL/image path, false if emoji/text
const isIconUrl = (icon) => icon && (icon.startsWith('http') || icon.startsWith('data:') || icon.includes('/') || icon.startsWith('fa-'));

const CreateOfferModal = ({ onClose, onCreated, token }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    rewardAmount: '',
    externalLink: '',
    trackingType: 'manual_approval',
    expirationDate: '',
    icon: '',
    coverImage: '',
    requirements: '',
    requirementType: 'bullets',
    platforms: { desktop: false, android: false, ios: false },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/custom-offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          rewardAmount: Number(form.rewardAmount),
          expirationDate: form.expirationDate || null,
          requirements: form.requirementType === 'paragraph'
            ? [form.requirements.trim()].filter(Boolean)
            : form.requirements.split('\n').map(r => r.trim()).filter(Boolean),
          requirementType: form.requirementType,
          platforms: form.platforms,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.offer);
        onClose();
      } else {
        setError(data.error || 'Failed to create offer');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <FiStar className="text-amber-600 text-base" />
            </div>
            <div>
              <h3 className="text-gray-900 font-bold font-display text-base">Create Featured Offer</h3>
              <p className="text-gray-500 text-xs mt-0.5">Add a new offer for users to complete</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-all"
          >
            <FiX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar relative">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs shrink-0">
              <FiAlertTriangle className="flex-shrink-0 text-rose-600" /> {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Title *</label>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Sign up for CryptoGame and reach Level 5"
              required
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Description *</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Describe the steps needed to complete and earn the reward..."
              rows={2}
              required
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 resize-none transition-all"
            />
          </div>

          {/* Requirement Style Toggle & Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Requirements Format
              </label>
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, requirementType: 'bullets' }))}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    form.requirementType === 'bullets'
                      ? 'bg-[#1E2538] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Bullet Points
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, requirementType: 'paragraph' }))}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    form.requirementType === 'paragraph'
                      ? 'bg-[#1E2538] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Paragraph
                </button>
              </div>
            </div>

            <textarea
              value={form.requirements}
              onChange={set('requirements')}
              placeholder={
                form.requirementType === 'paragraph'
                  ? "e.g. Register and deposit €50, then wager €100."
                  : "e.g. Register → receive 10 coins\nDeposit €50 → receive 50,000 coins\nGenerate €200 in revenue → receive 10,000 coins"
              }
              rows={form.requirementType === 'paragraph' ? 2 : 3}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 resize-none transition-all"
            />
            <span className="text-[11px] text-gray-500 block mt-1">
              {form.requirementType === 'paragraph'
                ? "Displays as a single clean paragraph box."
                : "Enter each step on a new line to display as a step-by-step checklist."}
            </span>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Icon</label>
            <div className="grid grid-cols-8 gap-1.5 p-2.5 bg-gray-50 border border-gray-200 rounded-xl mb-2">
              {PRESET_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, icon: f.icon === emoji ? '' : emoji }))}
                  className={`h-9 rounded-lg text-xl flex items-center justify-center transition-all ${
                    form.icon === emoji
                      ? 'bg-white border-2 border-[#1E2538] shadow-sm scale-110'
                      : 'hover:bg-gray-200/70 border border-transparent'
                  }`}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                value={isIconUrl(form.icon) ? form.icon : ''}
                onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="Or paste an image URL to override..."
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 transition-all"
              />
            </div>
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Cover Image URL <span className="normal-case text-gray-500 font-normal">(shown on card — recommended)</span>
            </label>
            <input
              type="text"
              value={form.coverImage}
              onChange={set('coverImage')}
              placeholder="https://.../banner.jpg"
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 transition-all"
            />
            {form.coverImage && (
              <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 h-20 bg-gray-100">
                <img src={form.coverImage} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
              </div>
            )}
          </div>

          {/* Reward + External Link (2 cols) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Reward (Coins) *</label>
              <input
                type="number"
                min="1"
                value={form.rewardAmount}
                onChange={set('rewardAmount')}
                placeholder="e.g. 500"
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Expiry Date</label>
              <input
                type="datetime-local"
                value={form.expirationDate}
                onChange={set('expirationDate')}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 transition-all"
              />
            </div>
          </div>

          {/* External Link */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">External Link *</label>
            <input
              type="url"
              value={form.externalLink}
              onChange={set('externalLink')}
              placeholder="https://..."
              required
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 transition-all"
            />
          </div>

          {/* Tracking Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Tracking Type</label>
            <select
              value={form.trackingType}
              onChange={set('trackingType')}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 transition-all"
            >
              <option value="manual_approval">Manual Approval (user submits proof)</option>
              <option value="click">Click Tracking (auto-credit on click)</option>
            </select>
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Available Platforms</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.platforms.desktop}
                  onChange={(e) => setForm(f => ({ ...f, platforms: { ...f.platforms, desktop: e.target.checked } }))}
                  className="rounded border-gray-300 text-[#1E2538] focus:ring-[#1E2538]"
                />
                Desktop
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.platforms.android}
                  onChange={(e) => setForm(f => ({ ...f, platforms: { ...f.platforms, android: e.target.checked } }))}
                  className="rounded border-gray-300 text-[#1E2538] focus:ring-[#1E2538]"
                />
                Android
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.platforms.ios}
                  onChange={(e) => setForm(f => ({ ...f, platforms: { ...f.platforms, ios: e.target.checked } }))}
                  className="rounded border-gray-300 text-[#1E2538] focus:ring-[#1E2538]"
                />
                iOS
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1E2538] hover:bg-[#2B334B] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? <FiLoader className="animate-spin text-xs" /> : <FiPlus size={14} />}
              <span>{loading ? 'Creating...' : 'Create Offer'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Main Admin Component ──────────────────────────────────────────────────────
const AdminCustomOffers = () => {
  const { currentUser } = useAuth();
  const [token, setToken] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshSub, setRefreshSub] = useState(0);

  useEffect(() => {
    if (currentUser) currentUser.getIdToken().then(setToken);
  }, [currentUser]);

  const fetchOffers = useCallback(async (t) => {
    if (!t) return;
    try {
      const res = await fetch(`${API}/admin/custom-offers`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (data.success) setOffers(data.offers);
    } catch (e) {
      console.error('Failed to load offers:', e);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchOffers(token).finally(() => setLoading(false));
  }, [token, fetchOffers, refreshSub]);

  const toggleOffer = async (offer) => {
    try {
      const res = await fetch(`${API}/admin/custom-offers/${offer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !offer.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setOffers((prev) => prev.map((o) => (o._id === offer._id ? data.offer : o)));
      }
    } catch (e) {
      console.error('Toggle failed:', e);
    }
  };

  const deleteOffer = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this offer?')) return;
    try {
      const res = await fetch(`${API}/admin/custom-offers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setOffers((prev) => prev.filter((o) => o._id !== id));
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#1E2538] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-lg">
              <FiStar />
            </span>
            Featured Offers
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Create and manage featured partnership offers and bonus rewards for users.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setRefreshSub((n) => n + 1)}
            className="p-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all border border-gray-200 shadow-sm"
            title="Refresh"
          >
            <FiRefreshCw className="text-sm" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E2538] hover:bg-[#2B334B] text-white font-bold text-xs transition-all shadow-sm"
          >
            <FiPlus size={15} />
            <span>Create Offer</span>
          </button>
        </div>
      </div>

      {/* ─── OFFERS VIEW ─── */}
      <AnimatePresence mode="wait">
        <div className="space-y-3.5">
          {offers.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-2xl p-16 text-center flex flex-col items-center gap-3 bg-white shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <FiStar className="text-amber-500 text-2xl" />
              </div>
              <div>
                <p className="text-gray-900 font-bold mb-1 text-sm">No Featured Offers Yet</p>
                <p className="text-gray-500 text-xs">Click "Create Offer" to add your first partnership offer.</p>
              </div>
            </div>
          ) : (
            offers.map((offer) => (
              <motion.div
                key={offer._id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white border rounded-2xl p-5 transition-all shadow-sm ${
                  offer.isActive ? 'border-gray-200 hover:border-gray-300' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-gray-900 font-bold font-display text-base">{offer.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        offer.isActive
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-gray-500 bg-gray-100 border-gray-200'
                      }`}>
                        {offer.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-700">
                        {offer.trackingType === 'manual_approval' ? 'Manual Proof' : 'Click Auto'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">{offer.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="text-emerald-600 font-bold font-display text-sm">+{offer.rewardAmount?.toLocaleString()} Coins</span>
                      <span className="px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200 text-gray-700 font-medium">
                        {offer.clicks || 0} Click{(offer.clicks !== 1) ? 's' : ''}
                      </span>
                      <a href={offer.externalLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors">
                        <FiExternalLink className="text-xs" /> View Link
                      </a>
                      {offer.expirationDate && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <FiClock className="text-xs" />
                          Expires {new Date(offer.expirationDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-gray-400">Created {new Date(offer.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleOffer(offer)}
                      title={offer.isActive ? 'Deactivate offer' : 'Activate offer'}
                      className={`p-2 rounded-lg border transition-all ${
                        offer.isActive
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-gray-100 border-gray-200 text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      {offer.isActive ? <FiToggleRight className="text-base" /> : <FiToggleLeft className="text-base" />}
                    </button>
                    <button
                      onClick={() => deleteOffer(offer._id)}
                      title="Delete offer"
                      className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all"
                    >
                      <FiTrash2 className="text-base" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateOfferModal
            token={token}
            onClose={() => setShowCreate(false)}
            onCreated={(offer) => setOffers((prev) => [offer, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCustomOffers;

