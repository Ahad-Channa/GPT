import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiTrash2, FiToggleLeft, FiToggleRight,
  FiExternalLink, FiLoader, FiAlertTriangle, FiRefreshCw,
  FiCheckSquare, FiEdit2, FiCheck, FiX
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl bg-[#0f1728] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] bg-gradient-to-r from-sky-500/[0.08] to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <FiCheckSquare className="text-sky-400 text-sm" />
            </div>
            <div>
              <h3 className="text-white font-bold font-display text-sm">
                {isEditing ? 'Edit Goodpicks Offer' : 'Create Goodpicks Offer'}
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Configure offer for the in-house Goodpicks offerwall
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <FiX size={14} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3 overflow-y-auto custom-scrollbar relative">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <FiAlertTriangle className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Title *
            </label>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Treehouse Fishing"
              required
              className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Description *
            </label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Short description for the offer card and modal..."
              rows={2}
              required
              className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20 resize-none"
            />
          </div>

          {/* Requirement Style Toggle & Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Requirements Format
              </label>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, requirementType: 'bullets' }))}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    form.requirementType === 'bullets'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bullet Points
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, requirementType: 'paragraph' }))}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    form.requirementType === 'paragraph'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'text-slate-400 hover:text-white'
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
              className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20 resize-none"
            />
            <span className="text-[11px] text-slate-500 block mt-1">
              {form.requirementType === 'paragraph'
                ? 'Displays as text inside the detail modal.'
                : 'Enter each requirement on a separate line for the checklist.'}
            </span>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Icon
            </label>
            <div className="grid grid-cols-8 gap-1.5 p-2 bg-slate-900 border border-white/[0.08] rounded-xl mb-2">
              {PRESET_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon: f.icon === emoji ? '' : emoji }))}
                  className={`h-9 rounded-lg text-xl flex items-center justify-center transition-all ${
                    form.icon === emoji
                      ? 'bg-sky-500/30 border border-sky-500/50 scale-110 shadow-[0_0_8px_rgba(14,165,233,0.3)]'
                      : 'hover:bg-white/[0.06] border border-transparent'
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
              className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20"
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Cover Image URL <span className="normal-case text-slate-600 font-normal">(displayed on card)</span>
            </label>
            <input
              type="text"
              value={form.coverImage}
              onChange={set('coverImage')}
              placeholder="/coins/Mask group.png or https://.../image.jpg"
              className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20"
            />
            {form.coverImage && (
              <div className="mt-2 rounded-xl overflow-hidden border border-white/[0.08] h-20 bg-slate-800 flex items-center justify-center">
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
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Reward (Coins) *
              </label>
              <input
                type="number"
                min="1"
                value={form.rewardAmount}
                onChange={set('rewardAmount')}
                placeholder="e.g. 7000000"
                required
                className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Expiry Date
              </label>
              <input
                type="datetime-local"
                value={form.expirationDate}
                onChange={set('expirationDate')}
                className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20"
              />
            </div>
          </div>

          {/* External Link */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Offer Link / Tracking URL *
            </label>
            <input
              type="url"
              value={form.externalLink}
              onChange={set('externalLink')}
              placeholder="https://..."
              required
              className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20"
            />
          </div>

          {/* Platforms Checkboxes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Available Platforms
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.platforms.desktop}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, platforms: { ...f.platforms, desktop: e.target.checked } }))
                  }
                  className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <FaDesktop className="text-slate-400" />
                <span>PC / Desktop</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.platforms.android}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, platforms: { ...f.platforms, android: e.target.checked } }))
                  }
                  className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <FaAndroid className="text-emerald-400" />
                <span>Android</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.platforms.ios}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, platforms: { ...f.platforms, ios: e.target.checked } }))
                  }
                  className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <FaApple className="text-slate-200" />
                <span>iOS</span>
              </label>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 hover:text-white text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
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
          <h1 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 text-base">
              <FiCheckSquare />
            </span>
            Goodpicks Offers Management
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Manage in-house offers displayed in the Goodpicks offerwall modal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOffers}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all border border-white/[0.06]"
            title="Refresh"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={15} />
          </button>
          <button
            onClick={() => setModalOffer('new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-sky-500/20"
          >
            <FiPlus size={15} />
            <span>Create Goodpicks Offer</span>
          </button>
        </div>
      </div>

      {/* Offers Table / List */}
      <div className="bg-[#0f1728]/80 border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            All Goodpicks Offers ({offers.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <FiLoader className="w-6 h-6 text-sky-400 animate-spin" />
            <p className="text-slate-500 text-xs">Loading offers...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <FiCheckSquare className="text-sky-400 text-xl" />
            </div>
            <p className="text-slate-300 font-semibold text-sm">No Goodpicks Offers Created Yet</p>
            <p className="text-slate-500 text-xs max-w-sm">
              Click &quot;Create Goodpicks Offer&quot; above to add your first in-house offer for users to complete.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-white/[0.06] uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3">Offer</th>
                  <th className="px-4 py-3">Platforms</th>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Requirements</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {offers.map((offer) => {
                  const cover = offer.coverImage || offer.icon || '/coins/Mask group.png';
                  const isBusy = actionLoading === offer._id;

                  return (
                    <tr key={offer._id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Offer Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
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
                              <span className="text-xl">{offer.icon || '🎮'}</span>
                            )}
                          </div>
                          <div className="min-w-0 max-w-[240px]">
                            <p className="text-white font-bold truncate">{offer.title}</p>
                            <p className="text-slate-400 text-[11px] truncate">{offer.description}</p>
                            {offer.externalLink && (
                              <a
                                href={offer.externalLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-400 hover:text-sky-300 text-[10px] inline-flex items-center gap-1 mt-0.5"
                              >
                                <span>Link</span>
                                <FiExternalLink size={9} />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Platforms */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 text-slate-300">
                          {offer.platforms?.desktop && (
                            <span title="PC/Desktop" className="p-1 rounded bg-slate-800 border border-white/[0.06]">
                              <FaDesktop size={12} />
                            </span>
                          )}
                          {offer.platforms?.android && (
                            <span title="Android" className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <FaAndroid size={12} />
                            </span>
                          )}
                          {offer.platforms?.ios && (
                            <span title="iOS" className="p-1 rounded bg-slate-700/50 text-slate-200 border border-white/[0.06]">
                              <FaApple size={12} />
                            </span>
                          )}
                          {!offer.platforms?.desktop && !offer.platforms?.android && !offer.platforms?.ios && (
                            <span className="text-slate-500 text-[10px]">All</span>
                          )}
                        </div>
                      </td>

                      {/* Reward */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 font-bold text-sky-400">
                          <span>🪙</span>
                          <span>{(offer.rewardAmount || 0).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Requirements */}
                      <td className="px-4 py-3.5">
                        <span className="text-slate-400 text-[11px] line-clamp-2 max-w-[200px]">
                          {Array.isArray(offer.requirements) && offer.requirements.length > 0
                            ? `${offer.requirements.length} requirement(s)`
                            : typeof offer.requirements === 'string'
                            ? offer.requirements
                            : 'Standard'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggle(offer)}
                          disabled={isBusy}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                            offer.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border border-white/[0.06] hover:bg-slate-700'
                          }`}
                        >
                          {offer.isActive ? (
                            <>
                              <FiToggleRight size={13} className="text-emerald-400" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <FiToggleLeft size={13} />
                              <span>Paused</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setModalOffer(offer)}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all"
                            title="Edit"
                          >
                            <FiEdit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(offer)}
                            disabled={isBusy}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all"
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
