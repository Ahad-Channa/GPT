import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiZap, FiStar, FiMail, FiCalendar, FiEdit2, FiCheck, FiX, FiShield,
  FiActivity, FiUser, FiArrowDownCircle, FiCheckCircle, FiClock,
  FiInbox, FiLoader, FiTrendingUp, FiChevronDown, FiPlayCircle,
  FiSend, FiExternalLink, FiSettings, FiTrash2, FiAlertTriangle, FiRefreshCw,
  FiUsers, FiCopy
} from 'react-icons/fi';

const PREDEFINED_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jocelyn',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Avery',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mason',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Wyatt',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robo1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robo2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robo3',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Wink',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Shape1',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Shape2',
  // More Avatars added
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robo4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robo5',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robo6',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Bella',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Lucy',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Molly',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Daisy',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Sadie',
  'https://api.dicebear.com/7.x/micah/svg?seed=Caleb',
  'https://api.dicebear.com/7.x/micah/svg?seed=Elijah',
  'https://api.dicebear.com/7.x/micah/svg?seed=Isaiah',
  'https://api.dicebear.com/7.x/micah/svg?seed=Josiah',
  'https://api.dicebear.com/7.x/micah/svg?seed=Noah',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Hunter',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Chase',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ryder',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Gage',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Zane',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel1',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel2',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel3',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel4',
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Peep1',
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Peep2',
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Peep3',
  'https://api.dicebear.com/7.x/open-peeps/svg?seed=Peep4',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=Thumb1',
  'https://api.dicebear.com/7.x/thumbs/svg?seed=Thumb2',
  'https://api.dicebear.com/7.x/rings/svg?seed=Ring1',
  'https://api.dicebear.com/7.x/rings/svg?seed=Ring2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Grayson',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Levi',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Isaac',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robo7',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robo8',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cry',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Laugh',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Tired',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Shape3',
];

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TX_TYPE_LABEL = {
  offer_reward:       { label: 'Offer Reward',    color: 'text-indigo-400'  },
  daily_bonus:        { label: 'Daily Bonus',      color: 'text-amber-400'   },
  promo_code:         { label: 'Promo Code',       color: 'text-emerald-400' },
  referral_reward:    { label: 'Referral',         color: 'text-cyan-400'    },
  withdrawal:         { label: 'Withdrawal',       color: 'text-rose-400'    },
  admin_adjustment:   { label: 'Adjustment',       color: 'text-orange-400'  },
  leaderboard_reward: { label: 'Leaderboard',      color: 'text-violet-400'  },
};

const STATUS_DOT = {
  completed: 'bg-emerald-400',
  pending:   'bg-amber-400 animate-pulse',
  rejected:  'bg-rose-400',
  failed:    'bg-rose-400',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Compact history list shared by Offers and Withdrawals tab
const HistoryList = ({ transactions, loading, error, hasMore, onLoadMore, loadingMore, emptyMessage }) => {
  if (loading) {
    return (
      <div className="space-y-3 px-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/[0.05] rounded w-1/3" />
              <div className="h-2 bg-white/[0.04] rounded w-2/3" />
            </div>
            <div className="h-3 bg-white/[0.05] rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <p className="text-rose-400 text-sm">{error}</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-14 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
          <FiInbox className="text-slate-600 text-xl" />
        </div>
        <p className="text-slate-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-white/[0.04]">
        {transactions.map((tx) => {
          const isActivity = !!tx.actionType;
          let label = '';
          let color = 'text-slate-400';
          let isDebit = false;
          let dotClass = STATUS_DOT.completed;
          let description = '';
          let amountStr = '';
          
          if (isActivity) {
            label = tx.actionType.replace('_', ' ').toUpperCase();
            color = 'text-cyan-400';
            dotClass = 'bg-cyan-400';
            description = `${tx.actionType} on target ${tx.targetId || 'unknown'}`;
            amountStr = 'Log';
          } else {
            const cfg = TX_TYPE_LABEL[tx.transactionType] || { label: tx.transactionType, color: 'text-slate-400' };
            label = cfg.label;
            color = cfg.color;
            isDebit = tx.amount < 0;
            dotClass = STATUS_DOT[tx.status] || STATUS_DOT.completed;
            description = tx.description;
            amountStr = `${isDebit ? '' : '+'}${Math.abs(tx.amount).toLocaleString()}`;
          }

          return (
            <div key={tx._id} className="flex items-center gap-3 py-3 hover:bg-white/[0.01] transition-colors">
              {/* Status dot */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />

              {/* Description */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 font-medium truncate">{description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-semibold ${color}`}>{label}</span>
                  <span className="text-[10px] text-slate-600">{timeAgo(tx.createdAt)}</span>
                  {!isActivity && tx.method && (
                    <span className="text-[10px] text-slate-600 capitalize">· via {tx.method}</span>
                  )}
                  {!isActivity && tx.status !== 'completed' && (
                    <span className={`text-[10px] font-mono ${tx.status === 'pending' ? 'text-amber-400' : 'text-rose-400'}`}>
                      · {tx.status}
                    </span>
                  )}
                  {isActivity && tx.ipAddress && (
                    <span className="text-[10px] text-slate-600">· {tx.ipAddress}</span>
                  )}
                </div>
              </div>

              {/* Amount */}
              <span className={`text-sm font-bold font-mono flex-shrink-0 ${isDebit ? 'text-rose-400' : 'text-emerald-400'}`}>
                {amountStr}
              </span>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="pt-4 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors disabled:opacity-50"
          >
            {loadingMore ? <FiLoader className="animate-spin text-xs" /> : <FiChevronDown className="text-xs" />}
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};

// ── useHistory hook (reusable per type filter)
const useHistory = (token, type, endpoint = '/wallet/history') => {
  const [dataList, setDataList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [totalEarned, setTotalEarned] = useState(0);

  const fetchPage = async (pg, append = false) => {
    if (!token) return;
    try {
      if (pg === 1) setLoading(true); else setLoadingMore(true);
      setError('');
      const params = new URLSearchParams({ page: pg, limit: 15 });
      if (type) params.append('type', type);

      const res = await fetch(`${API}${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const items = data.transactions || data.logs || [];
      setDataList((prev) => append ? [...prev, ...items] : items);
      setHasMore(data.pagination.hasMore);
      setPage(pg);
      if (pg === 1 && data.stats) {
        setTotalEarned(data.stats.totalEarned || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (token) fetchPage(1);
  }, [token, type, endpoint]);

  const loadMore = () => fetchPage(page + 1, true);

  return { dataList, loading, loadingMore, error, hasMore, loadMore, totalEarned };
};

// ── Tab Button
const TabBtn = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
      active
        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
        : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10'
    }`}
  >
    <Icon className="text-base" /> {label}
  </button>
);

// ── Clicked Offer Row (inline proof upload per offer)
const ClickedOfferRow = ({ offer, token, onRefresh }) => {
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const isRejected = offer.submissionStatus === 'rejected';
  const iconEmoji = offer.icon && !offer.icon.startsWith('http') && !offer.icon.includes('/') ? offer.icon : null;
  const iconUrl   = offer.coverImage || (offer.icon && !iconEmoji ? offer.icon : null);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProofImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/custom-offers/${offer._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ proofText: proof, proofImage }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: 'success', message: 'Proof submitted! Awaiting admin review.' });
        setOpen(false);
        onRefresh();
      } else {
        setResult({ type: 'error', message: data.error || 'Submission failed.' });
      }
    } catch {
      setResult({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-6 py-4">
      {/* Row header */}
      <div className="flex items-center gap-3">
        {/* Icon / cover thumb */}
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-amber-900/30 to-indigo-900/30 flex-shrink-0 flex items-center justify-center border border-white/[0.07]">
          {iconUrl ? (
            <img src={iconUrl} alt={offer.title} className="w-full h-full object-cover" />
          ) : iconEmoji ? (
            <span className="text-xl">{iconEmoji}</span>
          ) : (
            <FiStar className="text-amber-400/60" />
          )}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{offer.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono text-amber-400">+{offer.rewardAmount?.toLocaleString()} Coins</span>
            {isRejected && (
              <span className="text-[10px] font-semibold text-rose-400 px-1.5 py-0.5 bg-rose-500/10 rounded-full border border-rose-500/20 animate-pulse">
                Rejected — resubmit
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {offer.externalLink && (
            <a
              href={offer.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-300 hover:bg-white/[0.05] transition-colors"
              title="Go to offer"
            >
              <FiExternalLink className="text-sm" />
            </a>
          )}
          <button
            onClick={() => { setOpen(o => !o); setResult(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              open
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-white/[0.05] text-slate-300 border border-white/[0.08] hover:border-amber-500/30 hover:text-amber-300'
            }`}
          >
            <FiSend className="text-[11px]" />
            {isRejected ? 'Resubmit Proof' : 'Submit Proof'}
          </button>
        </div>
      </div>

      {/* Rejection note */}
      {isRejected && offer.adminNote && (
        <p className="mt-2 ml-13 text-xs text-rose-400/80 italic pl-[52px]">
          Admin note: "{offer.adminNote}"
        </p>
      )}

      {/* Result banner */}
      {result && (
        <div className={`mt-3 ml-[52px] p-2.5 rounded-xl border text-xs font-medium ${
          result.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {result.type === 'success' && <FiCheckCircle className="inline mr-1" />}
          {result.message}
        </div>
      )}

      {/* Inline proof form (expandable) */}
      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="overflow-hidden mt-3 ml-[52px]"
          >
            <div className="bg-slate-900/60 border border-white/[0.07] rounded-xl p-4 space-y-3">
              <textarea
                value={proof}
                onChange={e => setProof(e.target.value)}
                placeholder="Describe your completion (transaction ID, username, steps taken…)"
                rows={3}
                className="w-full bg-[#0b101e] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 resize-none"
              />

              {/* Image upload */}
              <label className="cursor-pointer flex items-center gap-2 py-2.5 px-3 border border-dashed border-white/[0.12] rounded-xl bg-[#0b101e] hover:bg-white/[0.03] transition-colors">
                <FiSend className="text-amber-400/60 text-sm" />
                <span className="text-xs text-slate-400 font-medium">
                  {proofImage ? '✓ Image selected — click to change' : 'Attach screenshot (optional)'}
                </span>
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </label>

              {proofImage && (
                <div className="rounded-xl overflow-hidden border border-white/[0.08]">
                  <img src={proofImage} alt="Proof preview" className="max-h-24 object-contain mx-auto" />
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting || (!proof.trim() && !proofImage)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-40 transition-all hover:shadow-amber-500/30"
                >
                  {submitting ? <FiLoader className="animate-spin" /> : <FiSend />}
                  {submitting ? 'Sending…' : 'Send Proof'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] text-slate-400 text-xs font-semibold hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Settings & Delete Account Modal
const SettingsModal = ({ isOpen, onClose, mongoUser, token, setMongoUser, logout }) => {
  const [displayName, setDisplayName] = useState(mongoUser?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(mongoUser?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletePhase, setDeletePhase] = useState(0); 
  const [showMoreAvatars, setShowMoreAvatars] = useState(false);
  const [customStyle, setCustomStyle] = useState('avataaars');
  const [customSeed, setCustomSeed] = useState('');
  const [isPrivate, setIsPrivate] = useState(mongoUser?.isPrivate || false);

  const displayedAvatars = showMoreAvatars ? PREDEFINED_AVATARS : PREDEFINED_AVATARS.slice(0, 20);

  useEffect(() => {
    if (isOpen) {
       setDisplayName(mongoUser?.displayName || '');
       setAvatarUrl(mongoUser?.avatarUrl || '');
       setIsPrivate(mongoUser?.isPrivate || false);
       setDeletePhase(0);
       setError('');
       setSuccess('');
    }
  }, [isOpen, mongoUser]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const nameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!nameRegex.test(displayName)) {
      setError('Invalid username format.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, avatarUrl, isPrivate })
      });
      const data = await res.json();
      if (res.ok) {
        setMongoUser(data.user);
        setSuccess('Profile updated successfully!');
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch {
      setError('Network error.');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (deletePhase === 0) {
      setDeletePhase(1);
      return;
    }
    if (deletePhase === 1) {
      setDeletePhase(2);
      try {
        const res = await fetch(`${API}/auth/account`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
           await logout();
           window.location.href = '/';
        } else {
           const d = await res.json();
           setError(d.error || 'Failed to delete account');
           setDeletePhase(0);
        }
      } catch {
         setError('Network error');
         setDeletePhase(0);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0c101b] border border-white/[0.08] rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative shadow-glow-lg"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full p-2">
          <FiX size={20} />
        </button>

        <div className="p-8 space-y-8">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2 font-display">
              <FiSettings className="text-indigo-400" /> Account Settings
            </h2>
            <p className="text-slate-400 text-sm mt-1">Manage your identity, avatars, and account security</p>
          </div>

          {(error || success) && (
            <div className={`p-4 rounded-xl text-sm font-medium ${error ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {error || success}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#151b2b] border border-white/[0.08] p-4 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FiShield className="text-indigo-400" /> Private Profile
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Hide specific offer details (like survey names) from other users on your public profile and the live earning feed.
                </p>
              </div>
              <button
                onClick={() => setIsPrivate(!isPrivate)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPrivate ? 'bg-indigo-500' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Display Name</h3>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-[#151b2b] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
              placeholder="Username"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Choose Avatar</h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {displayedAvatars.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setAvatarUrl(url)}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all ${avatarUrl === url ? 'border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)] scale-105' : 'border-transparent hover:border-white/20 hover:scale-105'} bg-[#151b2b]`}
                >
                  <img src={url} alt={`Avatar ${i+1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            
            {!showMoreAvatars && PREDEFINED_AVATARS.length > 20 && (
              <div className="flex justify-center mt-3">
                <button 
                  onClick={() => setShowMoreAvatars(true)} 
                  className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                >
                  <FiArrowDownCircle size={14} /> Show more avatars ({PREDEFINED_AVATARS.length - 20} more)
                </button>
              </div>
            )}
            
            <div className="mt-6 border border-white/[0.08] bg-[#151b2b] rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Random Avatar Generator</h4>
                <p className="text-[10px] text-slate-500">Pick out an avatar perfectly unique to you with our custom random generator.</p>
              </div>
              <button
                onClick={() => setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random().toString(36).substring(7)}`)}
                className="px-6 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 text-xs font-bold hover:bg-indigo-500/20 transition-colors flex items-center gap-2"
              >
                <FiRefreshCw size={14} /> Generate Random
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
             <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold hover:shadow-glow transition-all disabled:opacity-50"
             >
                {saving ? <FiLoader className="animate-spin" /> : <FiCheck />}
                {saving ? 'Saving...' : 'Save Profile'}
             </button>
          </div>

          <div className="mt-12 pt-8 border-t border-white/[0.08]">
             <h3 className="text-base font-bold text-rose-400 flex items-center gap-2 mb-2">
               <FiAlertTriangle /> Danger Zone
             </h3>
             <p className="text-slate-400 text-sm mb-4">Deleting your account is permanent. All associated data will be wiped.</p>
             
             {deletePhase === 0 && (
                <button
                  onClick={handleDelete}
                  className="px-5 py-2.5 rounded-xl border border-rose-500/40 text-rose-400 font-semibold hover:bg-rose-500/10 transition-colors text-sm"
                >
                  Delete Account...
                </button>
             )}
             {deletePhase === 1 && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between flex-wrap gap-4">
                   <p className="text-rose-300 font-medium text-sm">Are you absolutely sure?</p>
                   <div className="flex items-center gap-3">
                      <button onClick={() => setDeletePhase(0)} className="text-slate-400 hover:text-white text-sm font-semibold">Cancel</button>
                      <button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-rose-900/50 transition-colors">
                        Yes, delete my account
                      </button>
                   </div>
                </div>
             )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
const Profile = () => {

  const { currentUser, mongoUser, setMongoUser, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab,  setActiveTab]  = useState('started_offers');
  const [token,      setToken]      = useState(null);
  const [customOffers, setCustomOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [profileStats, setProfileStats] = useState({ totalTasksCompleted: 0, earnings30Days: 0 });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  useEffect(() => {
    if (currentUser) currentUser.getIdToken().then(setToken);
  }, [currentUser]);

  useEffect(() => {
    if (token) {
      fetch(`${API}/wallet/dashboard-stats`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setProfileStats({
              totalTasksCompleted: data.totalTasksCompleted,
              earnings30Days: data.earnings30Days
            });
          }
        })
        .catch(console.error);
    }
  }, [token]);

  const fetchCustomOffers = async () => {
    if (!token) return;
    setLoadingOffers(true);
    try {
      const res = await fetch(`${API}/custom-offers`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setCustomOffers(data.offers);
      }
    } catch (err) {
      console.error('Failed to fetch custom offers:', err);
    } finally {
      setLoadingOffers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'started_offers' && token) {
      fetchCustomOffers();
    }
  }, [activeTab, token]);

  // History hooks (only fetches when token is ready)
  const offerRewards = useHistory(activeTab === 'offer_rewards' ? token : null, 'offer_reward');
  const chargebacks = useHistory(activeTab === 'chargebacks' ? token : null, 'chargeback');

  // Completed custom offer submissions (approved)
  const [completedOffers, setCompletedOffers] = useState([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const fetchCompletedOffers = async () => {
    if (!token) return;
    setLoadingCompleted(true);
    try {
      const res = await fetch(`${API}/custom-offers`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setCompletedOffers(data.offers.filter(o => o.submissionStatus === 'approved'));
      }
    } catch (err) {
      console.error('Failed to fetch completed offers:', err);
    } finally {
      setLoadingCompleted(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'completed_offers' && token) fetchCompletedOffers();
  }, [activeTab, token]);



  return (
    <DashboardLayout>
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        mongoUser={mongoUser} 
        token={token} 
        setMongoUser={setMongoUser} 
        logout={logout} 
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto w-full space-y-8"
      >
        {/* ─── HERO HEADER ───────────────────────────────── */}
        <div className="relative rounded-[2rem] overflow-hidden bg-[#0c101b] border border-white/[0.03] shadow-card pb-6">
          {/* Cover Banner */}
          <div className="h-40 sm:h-52 w-full bg-gradient-to-r from-indigo-900 via-indigo-600 to-violet-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0c101b]/90" />
          </div>

          <div className="px-6 sm:px-10 relative">
            {/* Overlapping Avatar & User Info */}
            <div className="flex flex-col sm:flex-row gap-6 sm:items-end -mt-16 sm:-mt-20">
              <div className="relative shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] overflow-hidden border-4 border-[#0c101b] bg-[#111827] shadow-glow-lg z-10 relative">
                  <img
                    src={mongoUser?.avatarUrl || currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${mongoUser?.displayName || 'Avatar'}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* VIP Level Ring / Badge */}
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-amber-400 to-orange-500 text-[#0c101b] font-black text-xs px-3 py-1 rounded-xl border-4 border-[#0c101b] shadow-lg z-20">
                  LVL {mongoUser?.vipLevel || 1}
                </div>
              </div>

              <div className="flex-1 pb-1 sm:pb-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div>
                      <div className="flex items-center gap-3 group">
                        <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight hover:text-indigo-200 transition-colors">
                          {mongoUser?.displayName || 'Anonymous'}
                        </h1>
                        <button
                          onClick={() => setShowSettings(true)}
                          title="Account Settings"
                          className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all flex items-center justify-center opacity-100"
                        >
                          <FiSettings size={18} />
                        </button>
                      </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs sm:text-sm text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5"><FiUser className="text-indigo-400" /> ID: <span className="font-mono">{mongoUser?._id}</span></div>
                      <div className="flex items-center gap-1.5"><FiMail className="text-indigo-400" /> {currentUser?.email}</div>
                      <div className="flex items-center gap-1.5"><FiCalendar className="text-indigo-400" /> Joined {mongoUser?.createdAt ? new Date(mongoUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}</div>
                    </div>
                  </div>
                  {/* Account Status Pill */}
                  <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Verified
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Glass Ribbon Stats ─────────────────────── */}
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Total Earned */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center gap-4 hover:border-indigo-500/30 transition-colors">
                <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)] shrink-0">
                  <FiZap className="text-white text-lg" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-widest uppercase mb-0.5">Total Earned</p>
                  <p className="text-lg sm:text-xl font-black text-white font-mono">{mongoUser?.totalEarned?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
              
              {/* VIP Level */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center gap-4 hover:border-amber-500/30 transition-colors">
                <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0">
                  <FiStar className="text-white text-lg" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-widest uppercase mb-0.5">Platform Rank</p>
                  <p className="text-lg sm:text-xl font-black text-white font-mono">
                    <span className="text-amber-400 text-sm font-semibold mr-1">LVL</span>{mongoUser?.vipLevel || 1}
                  </p>
                </div>
              </div>

              {/* Completed Offers */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
                <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
                  <FiCheckCircle className="text-white text-lg" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-widest uppercase mb-0.5">Total Offers</p>
                  <p className="text-lg sm:text-xl font-black text-white font-mono">{profileStats.totalTasksCompleted} <span className="text-sm font-semibold text-slate-300">Offers</span></p>
                </div>
              </div>

              {/* 30-Day Earnings */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center gap-4 hover:border-violet-500/30 transition-colors">
                <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)] shrink-0">
                  <FiTrendingUp className="text-white text-lg" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-widest uppercase mb-0.5">30-Day Earnings</p>
                  <p className="text-[13px] sm:text-sm font-bold text-emerald-400 font-mono">{profileStats.earnings30Days?.toFixed(2)} <span className="text-sm font-semibold text-slate-300">Coins</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Segmented Pill Navigation ─────────────────── */}
        <div className="flex p-1.5 bg-[#080b14] border border-white/[0.05] rounded-2xl w-full overflow-x-auto custom-scrollbar">
          <div className="flex gap-1 min-w-max">
            <TabBtn active={activeTab === 'started_offers'}   onClick={() => setActiveTab('started_offers')}   icon={FiPlayCircle}   label="Started Offers" />
            <TabBtn active={activeTab === 'completed_offers'} onClick={() => setActiveTab('completed_offers')} icon={FiCheckCircle}  label="Completed Offers" />
            <TabBtn active={activeTab === 'offer_rewards'}    onClick={() => setActiveTab('offer_rewards')}    icon={FiZap}          label="Offerwall Rewards" />
            <TabBtn active={activeTab === 'chargebacks'}      onClick={() => setActiveTab('chargebacks')}      icon={FiShield}       label="Chargebacks" />
          </div>
        </div>

        {/* ─── Tab Content ─────────────────────────────────── */}
        <AnimatePresence mode="wait">

          {/* ══ COMPLETED OFFERS TAB (approved custom offer submissions) ══ */}
          {activeTab === 'completed_offers' && (
            <motion.div
              key="completed_offers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="glass-card overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] bg-gradient-to-r from-emerald-500/[0.04] to-transparent">
                <div>
                  <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                    <FiCheckCircle className="text-emerald-400" /> Completed Offers
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Featured offers approved &amp; rewards received in your wallet</p>
                </div>
                {completedOffers.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <FiCheckCircle className="text-emerald-400 text-xs" />
                    <span className="text-emerald-300 font-mono font-bold text-sm">{completedOffers.length} Completed</span>
                  </div>
                )}
              </div>

              {loadingCompleted ? (
                <div className="flex justify-center py-10"><FiLoader className="animate-spin text-2xl text-emerald-500" /></div>
              ) : completedOffers.length === 0 ? (
                <div className="py-14 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
                    <FiInbox className="text-slate-600 text-xl" />
                  </div>
                  <p className="text-slate-500 text-sm">No completed offers yet. Finish a started offer to earn your reward!</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {completedOffers.map(offer => {
                    const iconEmoji = offer.icon && !offer.icon.startsWith('http') && !offer.icon.includes('/') ? offer.icon : null;
                    const iconUrl   = offer.coverImage || (offer.icon && !iconEmoji ? offer.icon : null);
                    return (
                      <div key={offer._id} className="px-6 py-4 flex items-center gap-3 hover:bg-white/[0.01] transition-colors">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-900/30 to-indigo-900/30 flex-shrink-0 flex items-center justify-center border border-white/[0.07]">
                          {iconUrl ? (
                            <img src={iconUrl} alt={offer.title} className="w-full h-full object-cover" />
                          ) : iconEmoji ? (
                            <span className="text-xl">{iconEmoji}</span>
                          ) : (
                            <FiCheckCircle className="text-emerald-400/60" />
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{offer.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold text-emerald-400 px-1.5 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">✓ Reward Received</span>
                            <span className="text-[10px] text-slate-600">{offer.updatedAt ? new Date(offer.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                          </div>
                        </div>
                        {/* Amount */}
                        <span className="text-sm font-bold font-mono text-emerald-400 flex-shrink-0">+{offer.rewardAmount?.toLocaleString()} Coins</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ══ CHARGEBACKS TAB ══ */}
          {activeTab === 'chargebacks' && (
            <motion.div
              key="chargebacks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="glass-card overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] bg-gradient-to-r from-rose-500/[0.04] to-transparent">
                <div>
                  <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                    <FiShield className="text-rose-400" /> Chargebacks & Reversals
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Reversed transactions due to chargebacks or compliance flags</p>
                </div>
              </div>
              
              <div className="px-6 py-4">
                <HistoryList
                  transactions={chargebacks.dataList}
                  loading={chargebacks.loading}
                  error={chargebacks.error}
                  hasMore={chargebacks.hasMore}
                  onLoadMore={chargebacks.loadMore}
                  loadingMore={chargebacks.loadingMore}
                  emptyMessage="No chargebacks found on your account."
                />
              </div>
            </motion.div>
          )}

          {/* ══ OFFERWALL REWARDS TAB (wallet transactions from offerwalls) ══ */}
          {activeTab === 'offer_rewards' && (
            <motion.div
              key="offer_rewards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="glass-card overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] bg-gradient-to-r from-indigo-500/[0.04] to-transparent">
                <div>
                  <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                    <FiZap className="text-indigo-400" /> Offerwall Rewards
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Credits from offerwall surveys &amp; auto-credited tasks</p>
                </div>
                {offerRewards.totalEarned > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <FiTrendingUp className="text-indigo-400 text-xs" />
                    <span className="text-indigo-300 font-mono font-bold text-sm">
                      +{offerRewards.totalEarned.toLocaleString()} Coins Lifetime
                    </span>
                  </div>
                )}
              </div>

              <div className="px-6 py-4">
                <HistoryList
                  transactions={offerRewards.dataList}
                  loading={offerRewards.loading}
                  error={offerRewards.error}
                  hasMore={offerRewards.hasMore}
                  onLoadMore={offerRewards.loadMore}
                  loadingMore={offerRewards.loadingMore}
                  emptyMessage="No offerwall rewards yet. Complete surveys to start earning!"
                />
              </div>
            </motion.div>
          )}

          {/* ══ STARTED OFFERS (CLICKED OFFERS) TAB ══ */}
          {activeTab === 'started_offers' && (
            <motion.div
              key="started_offers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="glass-card overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] bg-gradient-to-r from-amber-500/[0.04] to-transparent">
                <div>
                  <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                    <FiPlayCircle className="text-amber-400" /> Clicked Offers
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Featured offers you have started — submit proof to earn your reward.</p>
                </div>
              </div>

              {loadingOffers ? (
                <div className="flex justify-center py-10"><FiLoader className="animate-spin text-2xl text-indigo-500" /></div>
              ) : (() => {
                const startedOffers = customOffers.filter(o => o.submissionStatus === 'started' || o.submissionStatus === 'rejected');
                if (startedOffers.length === 0) {
                  return (
                    <div className="py-14 flex flex-col items-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
                        <FiInbox className="text-slate-600 text-xl" />
                      </div>
                      <p className="text-slate-500 text-sm">No clicked offers yet. Browse the Earn page to start new offers!</p>
                    </div>
                  );
                }
                return (
                  <div className="divide-y divide-white/[0.04]">
                    {startedOffers.map(offer => (
                      <ClickedOfferRow
                        key={offer._id}
                        offer={offer}
                        token={token}
                        onRefresh={fetchCustomOffers}
                      />
                    ))}
                  </div>
                );
              })()}
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
