import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiZap, FiStar, FiMail, FiCalendar, FiEdit2, FiCheck, FiX, FiShield,
  FiActivity, FiUser, FiArrowDownCircle, FiCheckCircle, FiClock,
  FiInbox, FiLoader, FiTrendingUp, FiChevronDown, FiPlayCircle
} from 'react-icons/fi';
import { FeaturedOfferCard, FeaturedOfferModal } from '../components/offers/OfferCards';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
const useHistory = (token, type, endpoint = '/api/wallet/history') => {
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

// ══════════════════════════════════════════════════════════════════
const Profile = () => {
  const { currentUser, mongoUser, setMongoUser } = useAuth();
  const [isEditing,  setIsEditing]  = useState(false);
  const [editName,   setEditName]   = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [activeTab,  setActiveTab]  = useState('profile'); // 'profile' | 'started_offers' | 'offers' | 'withdrawals'
  const [token,      setToken]      = useState(null);
  const [customOffers, setCustomOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [selectedStartedOffer, setSelectedStartedOffer] = useState(null);

  useEffect(() => {
    if (currentUser) currentUser.getIdToken().then(setToken);
  }, [currentUser]);

  const fetchCustomOffers = async () => {
    if (!token) return;
    setLoadingOffers(true);
    try {
      const res = await fetch(`${API}/api/custom-offers`, { headers: { Authorization: `Bearer ${token}` } });
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
  const offers = useHistory(activeTab === 'offers' ? token : null, 'offer_reward');
  const chargebacks = useHistory(activeTab === 'chargebacks' ? token : null, 'chargeback');
  const clicks = useHistory(activeTab === 'clicks' ? token : null, null, '/api/activity/history');

  const handleEditClick = () => {
    setEditName(mongoUser?.displayName || '');
    setError('');
    setIsEditing(true);
  };

  const handleSave = async () => {
    const nameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!nameRegex.test(editName)) {
      setError('3–20 characters: letters, numbers, dashes, underscores only.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const tok = await currentUser.getIdToken();
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: editName }),
      });
      const data = await res.json();
      if (res.ok) { setMongoUser(data.user); setIsEditing(false); }
      else { setError(data.error || 'Failed to update profile'); }
    } catch {
      setError('An error occurred while saving.');
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto w-full space-y-6"
      >
        {/* Page Header */}
        <div>
          <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-1">Account</p>
          <h1 className="text-3xl font-bold font-display text-white">Your Profile</h1>
        </div>

        {/* ─── Tab Bar ─────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 p-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl w-fit">
          <TabBtn active={activeTab === 'profile'}     onClick={() => setActiveTab('profile')}     icon={FiUser}           label="Profile" />
          <TabBtn active={activeTab === 'started_offers'} onClick={() => setActiveTab('started_offers')} icon={FiPlayCircle} label="Started Offers" />
          <TabBtn active={activeTab === 'clicks'}      onClick={() => setActiveTab('clicks')}      icon={FiZap}            label="Click History" />
          <TabBtn active={activeTab === 'offers'}      onClick={() => setActiveTab('offers')}      icon={FiCheckCircle}    label="Offer History" />
          <TabBtn active={activeTab === 'chargebacks'} onClick={() => setActiveTab('chargebacks')} icon={FiShield}         label="Chargebacks" />
        </div>

        {/* ─── Tab Content ─────────────────────────────────── */}
        <AnimatePresence mode="wait">

          {/* ══ PROFILE TAB ══ */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-6"
            >
              {/* ─── Identity Card ──────────────────────────── */}
              <div className="md:col-span-4 glass-card p-7 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-transparent" />

                {/* Avatar */}
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10 mb-6 shadow-glow">
                  <img
                    src={currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${mongoUser?.displayName || 'Felix'}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>

                <p className="text-[10px] font-semibold text-slate-600 tracking-widest uppercase mb-2">Username</p>

                {isEditing ? (
                  <div className="flex flex-col mb-4">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-white/[0.04] border border-white/[0.12] rounded-xl px-3 py-2 text-slate-100 text-sm outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                        placeholder="USERNAME"
                        disabled={loading}
                        autoFocus
                      />
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        title="Save"
                        className="w-9 h-9 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 transition-all flex items-center justify-center"
                      >
                        <FiCheck size={15} />
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        disabled={loading}
                        title="Cancel"
                        className="w-9 h-9 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-red-500/20 hover:border-red-500/40 text-red-400 transition-all flex items-center justify-center"
                      >
                        <FiX size={15} />
                      </button>
                    </div>
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                  </div>
                ) : (
                  <div className="flex items-center justify-between group mb-4">
                    <h2 className="text-xl font-bold font-display text-white">
                      {mongoUser?.displayName || 'Anonymous'}
                    </h2>
                    <button
                      onClick={handleEditClick}
                      title="Edit Username"
                      className="w-8 h-8 rounded-xl border border-white/[0.08] bg-transparent hover:bg-white/[0.05] hover:border-indigo-500/30 text-slate-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                    >
                      <FiEdit2 size={13} />
                    </button>
                  </div>
                )}

                <div className="h-px bg-white/[0.05] my-5" />

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-600 tracking-widest uppercase mb-1">Email</p>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <FiMail className="text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{currentUser?.email}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-600 tracking-widest uppercase mb-1">Member Since</p>
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <FiCalendar className="text-indigo-400 flex-shrink-0" />
                      <span>
                        {mongoUser?.createdAt
                          ? new Date(mongoUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Stats Panel ────────────────────────────── */}
              <div className="md:col-span-8 flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Balance */}
                  <div className="stat-card group">
                    <div className="flex items-start justify-between mb-6">
                      <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Liquid Balance</p>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-glow">
                        <FiZap className="text-white text-sm" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white font-mono">
                      {mongoUser?.walletBalance?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-indigo-400 text-xs font-mono tracking-widest mt-1">PLATFORM POINTS</p>
                  </div>

                  {/* VIP */}
                  <div className="stat-card group">
                    <div className="flex items-start justify-between mb-6">
                      <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Platform Rank</p>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center" style={{ boxShadow: '0 6px 16px rgba(245,158,11,0.2)' }}>
                        <FiStar className="text-white text-sm" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white font-mono">
                      <span className="text-sm text-amber-400 font-semibold mr-1">LVL</span>
                      {mongoUser?.vipLevel || 1}
                    </p>
                    <p className="text-amber-400/70 text-xs font-mono tracking-widest mt-1">VIP STATUS</p>
                  </div>
                </div>

                {/* Streak */}
                <div className="glass-card p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center" style={{ boxShadow: '0 6px 16px rgba(124,58,237,0.2)' }}>
                    <FiActivity className="text-white text-base" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-0.5">Daily Streak</p>
                    <p className="text-base font-bold text-white">
                      {mongoUser?.dailyBonusStreak || 0} Day{(mongoUser?.dailyBonusStreak || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    (mongoUser?.dailyBonusStreak || 0) >= 7
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                  }`}>
                    {(mongoUser?.dailyBonusStreak || 0) >= 7 ? '🔥 Max Streak' : 'Active'}
                  </span>
                </div>

                {/* Account Status */}
                <div className="glass-card p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center" style={{ boxShadow: '0 6px 16px rgba(16,185,129,0.2)' }}>
                      <FiShield className="text-white text-base" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-0.5">Account Status</p>
                      <p className="text-sm font-semibold text-white">Verified & Active</p>
                    </div>
                  </div>
                  <span className="badge-emerald">Active</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ MOUSE CLICKS TAB ══ */}
          {activeTab === 'clicks' && (
            <motion.div
              key="clicks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="glass-card overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] bg-gradient-to-r from-cyan-500/[0.04] to-transparent">
                <div>
                  <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                    <FiZap className="text-cyan-400" /> Click History
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Your recent interactions with offers and features</p>
                </div>
              </div>

              <div className="px-6 py-4">
                <HistoryList
                  transactions={clicks.dataList}
                  loading={clicks.loading}
                  error={clicks.error}
                  hasMore={clicks.hasMore}
                  onLoadMore={clicks.loadMore}
                  loadingMore={clicks.loadingMore}
                  emptyMessage="No click history yet. Start exploring offers!"
                />
              </div>
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

          {/* ══ OFFER HISTORY TAB ══ */}
          {activeTab === 'offers' && (
            <motion.div
              key="offers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="glass-card overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] bg-gradient-to-r from-indigo-500/[0.04] to-transparent">
                <div>
                  <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                    <FiCheckCircle className="text-indigo-400" /> Offer History
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">All completed offerwall and featured offer rewards</p>
                </div>
                {offers.totalEarned > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <FiTrendingUp className="text-indigo-400 text-xs" />
                    <span className="text-indigo-300 font-mono font-bold text-sm">
                      +{offers.totalEarned.toLocaleString()} Coins Lifetime
                    </span>
                  </div>
                )}
              </div>

              <div className="px-6 py-4">
                <HistoryList
                  transactions={offers.dataList}
                  loading={offers.loading}
                  error={offers.error}
                  hasMore={offers.hasMore}
                  onLoadMore={offers.loadMore}
                  loadingMore={offers.loadingMore}
                  emptyMessage="No offer rewards yet. Complete surveys or featured offers to start earning!"
                />
              </div>
            </motion.div>
          )}


          {/* ══ STARTED OFFERS TAB ══ */}
          {activeTab === 'started_offers' && (
            <motion.div
              key="started_offers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                    <FiPlayCircle className="text-amber-400" /> Active Offers
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Submit proof for featured offers you have started.</p>
                </div>
              </div>

              {loadingOffers ? (
                <div className="flex justify-center py-10"><FiLoader className="animate-spin text-2xl text-indigo-500" /></div>
              ) : (
                (() => {
                  const startedOffers = customOffers.filter(o => o.submissionStatus === 'started' || o.submissionStatus === 'rejected');
                  if (startedOffers.length === 0) {
                    return (
                      <div className="py-14 flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
                          <FiInbox className="text-slate-600 text-xl" />
                        </div>
                        <p className="text-slate-500 text-sm">No active offers. Browse the Earn page to start new offers!</p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {startedOffers.map(offer => (
                        <FeaturedOfferCard
                          key={offer._id}
                          offer={offer}
                          onClick={() => setSelectedStartedOffer(offer)}
                        />
                      ))}
                    </div>
                  );
                })()
              )}
            </motion.div>
          )}

        </AnimatePresence>

        <AnimatePresence>
          {selectedStartedOffer && (
            <FeaturedOfferModal
              offer={selectedStartedOffer}
              onClose={() => setSelectedStartedOffer(null)}
              onProofSubmitted={() => {
                fetchCustomOffers();
                setSelectedStartedOffer(null);
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
