import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiTrash2, FiToggleLeft, FiToggleRight,
  FiExternalLink, FiLoader, FiAlertTriangle, FiRefreshCw,
  FiCheckSquare, FiEdit2, FiX
} from 'react-icons/fi';
import { FaAndroid, FaApple, FaDesktop } from 'react-icons/fa';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PRESET_ICONS = [
  '🎮', '🏆', '💰', '🎯', '🎁', '💎', '🔥', '⚡',
  '🚀', '📱', '🛒', '🎵', '💪', '🌟', '🎲', '📺',
];

const isIconUrl = (icon) => icon && (icon.startsWith('http') || icon.startsWith('data:') || icon.includes('/') || icon.startsWith('fa-'));

// ─── Modal for Create & Edit ────────────────────────────────────────────────
const GoodpickModal = ({ offer, onClose, onSaved, token, currentUser }) => {
  const isEditing = Boolean(offer);

  const [form, setForm] = useState({
    title: offer?.title || '',
    description: offer?.description || '',
    rewardAmount: offer?.rewardAmount || '',
    externalLink: offer?.externalLink || '',
    expirationDate: offer?.expirationDate ? new Date(offer.expirationDate).toISOString().slice(0, 16) : '',
    icon: offer?.icon || '',
    coverImage: offer?.coverImage || '',
    requirements: Array.isArray(offer?.requirements)
      ? offer.requirements.join('\n')
      : (offer?.requirements || ''),
    requirementType: offer?.requirementType || 'bullets',
    platforms: offer?.platforms || { desktop: true, android: true, ios: true },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const authToken = token || (currentUser ? await currentUser.getIdToken() : null);
      const url = isEditing
        ? `${API}/admin/goodpicks-offers/${offer._id}`
        : `${API}/admin/goodpicks-offers`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          ...form,
          rewardAmount: Number(form.rewardAmount),
          expirationDate: form.expirationDate || null,
          requirements: form.requirementType === 'paragraph'
            ? [form.requirements.trim()].filter(Boolean)
            : form.requirements.split('\n').map((r) => r.trim()).filter(Boolean),
          requirementType: form.requirementType,
          platforms: form.platforms,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSaved(data.offer);
        onClose();
      } else {
        setError(data.error || `Failed to ${isEditing ? 'update' : 'create'} offer`);
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
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
              <FiCheckSquare className="text-sky-600 text-base" />
            </div>
            <div>
              <h3 className="text-gray-900 font-bold font-display text-base">
                {isEditing ? 'Edit Goodpicks Offer' : 'Create Goodpicks Offer'}
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                Configure offer for the in-house Goodpicks offerwall
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-all"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar relative">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <FiAlertTriangle className="shrink-0 text-sm text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Title *
            </label>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Treehouse Fishing"
              required
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description *
            </label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Short description for the offer card and modal..."
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
                  onClick={() => setForm((f) => ({ ...f, requirementType: 'bullets' }))}
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
                  onClick={() => setForm((f) => ({ ...f, requirementType: 'paragraph' }))}
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
                  ? 'e.g. Complete this offer by downloading and registering on your device.'
                  : 'e.g. Register → receive 10 coins\nDeposit €50 → receive 50,000 coins\nGenerate €200 in revenue → receive 10,000 coins'
              }
              rows={form.requirementType === 'paragraph' ? 2 : 3}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 resize-none transition-all"
            />
            <span className="text-[11px] text-gray-500 block mt-1">
              {form.requirementType === 'paragraph'
                ? 'Displays as text inside the detail modal.'
                : 'Enter each requirement on a separate line for the checklist.'}
            </span>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Icon
            </label>
            <div className="grid grid-cols-8 gap-1.5 p-2.5 bg-gray-50 border border-gray-200 rounded-xl mb-2">
              {PRESET_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon: f.icon === emoji ? '' : emoji }))}
                  className={`h-9 rounded-lg text-xl flex items-center justify-center transition-all ${
                    form.icon === emoji
                      ? 'bg-white border-2 border-[#1E2538] shadow-sm scale-110'
                      : 'hover:bg-gray-200/70 border border-transparent'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={isIconUrl(form.icon) ? form.icon : ''}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              placeholder="Or paste an icon/image URL..."
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 transition-all"
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Cover Image URL <span className="normal-case text-gray-500 font-normal">(displayed on card)</span>
            </label>
            <input
              type="text"
              value={form.coverImage}
              onChange={set('coverImage')}
              placeholder="/coins/Mask group.png or https://.../image.jpg"
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 transition-all"
            />
            {form.coverImage && (
              <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 h-20 bg-gray-100 flex items-center justify-center">
                <img
                  src={form.coverImage}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Reward + Expiry Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Reward (Coins) *
              </label>
              <input
                type="number"
                min="1"
                value={form.rewardAmount}
                onChange={set('rewardAmount')}
                placeholder="e.g. 7000000"
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Expiry Date
              </label>
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
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Offer Link / Tracking URL *
            </label>
            <input
              type="url"
              value={form.externalLink}
              onChange={set('externalLink')}
              placeholder="https://..."
              required
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-[#1E2538] focus:ring-1 focus:ring-[#1E2538]/20 transition-all"
            />
          </div>

          {/* Platforms Checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Available Platforms
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.platforms.desktop}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, platforms: { ...f.platforms, desktop: e.target.checked } }))
                  }
                  className="rounded border-gray-300 text-[#1E2538] focus:ring-[#1E2538]"
                />
                <FaDesktop className="text-gray-500" />
                <span>PC / Desktop</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.platforms.android}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, platforms: { ...f.platforms, android: e.target.checked } }))
                  }
                  className="rounded border-gray-300 text-[#1E2538] focus:ring-[#1E2538]"
                />
                <FaAndroid className="text-emerald-600" />
                <span>Android</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.platforms.ios}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, platforms: { ...f.platforms, ios: e.target.checked } }))
                  }
                  className="rounded border-gray-300 text-[#1E2538] focus:ring-[#1E2538]"
                />
                <FaApple className="text-gray-700" />
                <span>iOS</span>
              </label>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#1E2538] hover:bg-[#2B334B] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <FiLoader className="animate-spin text-xs" />}
              <span>{isEditing ? 'Save Changes' : 'Create Offer'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Admin Goodpicks Offers Page ───────────────────────────────────────
const AdminGoodpicksOffers = () => {
  const { currentUser } = useAuth();
  const [token, setToken] = useState('');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOffer, setModalOffer] = useState(null); // null = closed, 'new' = create, obj = edit
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (currentUser) {
      currentUser.getIdToken().then(setToken);
    }
  }, [currentUser]);

  const fetchOffers = useCallback(async (t) => {
    const authToken = t || token || (currentUser ? await currentUser.getIdToken() : null);
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/goodpicks-offers`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setOffers(data.offers || []);
      }
    } catch (err) {
      console.error('Failed to load Goodpicks offers:', err);
    } finally {
      setLoading(false);
    }
  }, [token, currentUser]);

  useEffect(() => {
    if (token) {
      fetchOffers(token);
    }
  }, [token, fetchOffers]);

  const handleToggle = async (offer) => {
    const authToken = token || (currentUser ? await currentUser.getIdToken() : null);
    if (!authToken) return;
    setActionLoading(offer._id);
    try {
      const res = await fetch(`${API}/admin/goodpicks-offers/${offer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ isActive: !offer.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setOffers((prev) =>
          prev.map((o) => (o._id === offer._id ? { ...o, isActive: !o.isActive } : o))
        );
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (offer) => {
    if (!window.confirm(`Are you sure you want to delete "${offer.title}"?`)) return;
    const authToken = token || (currentUser ? await currentUser.getIdToken() : null);
    if (!authToken) return;
    setActionLoading(offer._id);
    try {
      const res = await fetch(`${API}/admin/goodpicks-offers/${offer._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setOffers((prev) => prev.filter((o) => o._id !== offer._id));
      }
    } catch (err) {
      console.error('Failed to delete offer:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 text-lg">
              <FiCheckSquare />
            </span>
            Goodpicks Offers Management
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Manage in-house offers displayed in the Goodpicks offerwall modal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOffers}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all border border-gray-200 shadow-sm"
            title="Refresh"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={15} />
          </button>
          <button
            onClick={() => setModalOffer('new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E2538] hover:bg-[#2B334B] text-white font-bold text-xs transition-all shadow-sm"
          >
            <FiPlus size={15} />
            <span>Create Goodpicks Offer</span>
          </button>
        </div>
      </div>

      {/* Offers Table / List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            All Goodpicks Offers ({offers.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <FiLoader className="w-6 h-6 text-[#1E2538] animate-spin" />
            <p className="text-gray-500 text-xs font-medium">Loading offers...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center">
              <FiCheckSquare className="text-sky-600 text-xl" />
            </div>
            <p className="text-gray-900 font-bold text-sm">No Goodpicks Offers Created Yet</p>
            <p className="text-gray-500 text-xs max-w-sm">
              Click &quot;Create Goodpicks Offer&quot; above to add your first in-house offer for users to complete.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">Offer</th>
                  <th className="px-4 py-3.5">Platforms</th>
                  <th className="px-4 py-3.5">Reward</th>
                  <th className="px-4 py-3.5">Requirements</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {offers.map((offer) => {
                  const cover = offer.coverImage || offer.icon || '/coins/Mask group.png';
                  const isBusy = actionLoading === offer._id;

                  return (
                    <tr key={offer._id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Offer Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {isIconUrl(cover) ? (
                              <img
                                src={cover}
                                alt={offer.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/coins/Mask group.png';
                                }}
                              />
                            ) : (
                              <span className="text-2xl">{offer.icon || '🎮'}</span>
                            )}
                          </div>
                          <div className="min-w-0 max-w-[240px]">
                            <p className="text-gray-900 font-bold truncate text-sm">{offer.title}</p>
                            <p className="text-gray-500 text-xs truncate mt-0.5">{offer.description}</p>
                            {offer.externalLink && (
                              <a
                                href={offer.externalLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-[11px] inline-flex items-center gap-1 mt-1 font-medium"
                              >
                                <span>Preview Link</span>
                                <FiExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Platforms */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          {offer.platforms?.desktop && (
                            <span title="PC/Desktop" className="p-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-700">
                              <FaDesktop size={12} />
                            </span>
                          )}
                          {offer.platforms?.android && (
                            <span title="Android" className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <FaAndroid size={12} />
                            </span>
                          )}
                          {offer.platforms?.ios && (
                            <span title="iOS" className="p-1.5 rounded-lg bg-gray-100 text-gray-800 border border-gray-200">
                              <FaApple size={12} />
                            </span>
                          )}
                          {!offer.platforms?.desktop && !offer.platforms?.android && !offer.platforms?.ios && (
                            <span className="text-gray-400 text-xs">All</span>
                          )}
                        </div>
                      </td>

                      {/* Reward */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900 font-display text-sm">
                          <span>🪙</span>
                          <span>{(offer.rewardAmount || 0).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Requirements */}
                      <td className="px-4 py-4">
                        <span className="text-gray-600 text-xs line-clamp-2 max-w-[200px]">
                          {Array.isArray(offer.requirements) && offer.requirements.length > 0
                            ? `${offer.requirements.length} requirement(s)`
                            : typeof offer.requirements === 'string'
                            ? offer.requirements
                            : 'Standard'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggle(offer)}
                          disabled={isBusy}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase transition-all ${
                            offer.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {offer.isActive ? (
                            <>
                              <FiToggleRight size={14} className="text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <FiToggleLeft size={14} />
                              <span>Paused</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setModalOffer(offer)}
                            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all"
                            title="Edit"
                          >
                            <FiEdit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(offer)}
                            disabled={isBusy}
                            className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 transition-all"
                            title="Delete"
                          >
                            <FiTrash2 size={13} />
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

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {modalOffer && (
          <GoodpickModal
            offer={modalOffer === 'new' ? null : modalOffer}
            onClose={() => setModalOffer(null)}
            onSaved={() => {
              fetchOffers();
            }}
            token={token}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminGoodpicksOffers;

