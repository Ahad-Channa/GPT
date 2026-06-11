import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import CoinDisplay from '../CoinDisplay';
import {
  FiZap, FiStar, FiUsers, FiArrowDownCircle, FiShield,
  FiTag, FiAward, FiFilter, FiRefreshCw, FiLoader,
  FiInbox, FiChevronDown, FiChevronLeft, FiChevronRight, FiSettings
} from 'react-icons/fi';

/* ─── Transaction type config ─────────────────────────────────────
   Maps each backend enum value to:
   - label  : human-readable display name (client-approved list)
   - icon   : react-icon component
   - color  : text colour for amount + icon
   - badge  : CSS class name (defined in index.css)
───────────────────────────────────────────────────────────────── */
const TX_TYPES = {
  offer_reward:       { label: 'Offer Reward',       icon: FiZap,            color: 'text-indigo-400',  badge: 'badge-indigo',   sign: '+' },
  custom_offer_reward:{ label: 'Custom Offer',       icon: FiZap,            color: 'text-indigo-400',  badge: 'badge-indigo',   sign: '+' },
  daily_bonus:        { label: 'Daily Bonus',         icon: FiStar,           color: 'text-amber-400',   badge: 'badge-amber',    sign: '+' },
  referral_reward:    { label: 'Referral Reward',     icon: FiUsers,          color: 'text-cyan-400',    badge: 'badge-cyan',     sign: '+' },
  withdrawal:         { label: 'Withdrawal',          icon: FiArrowDownCircle,color: 'text-red-400',     badge: 'badge-red',      sign:  '' },
  admin_adjustment:   { label: 'Admin Adjustment',    icon: FiSettings,       color: 'text-orange-400',  badge: 'badge-orange',   sign: '' },
  promo_code:         { label: 'Promo Code',          icon: FiTag,            color: 'text-emerald-400', badge: 'badge-emerald',  sign: '+' },
  leaderboard_reward: { label: 'Leaderboard Reward',  icon: FiAward,          color: 'text-violet-400',  badge: 'badge-violet',   sign: '+' },
  vip_reward:         { label: 'VIP Reward',           icon: FiStar,           color: 'text-yellow-400',  badge: 'badge-amber',    sign: '+' },
  mission_reward:     { label: 'Mission Reward',       icon: FiShield,         color: 'text-sky-400',     badge: 'badge-cyan',     sign: '+' },
  chargeback:         { label: 'Chargeback',           icon: FiSettings,       color: 'text-rose-400',    badge: 'badge-red',      sign: '' },
};

const STATUS_COLORS = {
  completed: { text: 'text-emerald-400', dot: 'bg-emerald-400' },
  pending:   { text: 'text-amber-400',   dot: 'bg-amber-400 animate-pulse' },
  failed:    { text: 'text-red-400',     dot: 'bg-red-400' },
  rejected:  { text: 'text-red-400',     dot: 'bg-red-400' },
  reversed:  { text: 'text-slate-400',   dot: 'bg-slate-400' },
};

const FILTER_OPTIONS = [
  { value: 'all',                 label: 'All Activity' },
  { value: 'offer_reward',        label: 'Offer Rewards' },
  { value: 'custom_offer_reward', label: 'Custom Offers' },
  { value: 'daily_bonus',         label: 'Daily Bonus' },
  { value: 'referral_reward',     label: 'Referrals' },
  { value: 'withdrawal',          label: 'Withdrawals' },
  { value: 'admin_adjustment',    label: 'Adjustments' },
  { value: 'promo_code',          label: 'Promo Codes' },
  { value: 'leaderboard_reward',  label: 'Leaderboard' },
  { value: 'vip_reward',          label: 'VIP Rewards' },
  { value: 'mission_reward',      label: 'Missions' },
  { value: 'chargeback',          label: 'Chargebacks' },
];

function formatRelativeTime(dateStr) {
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

const TransactionHistory = ({ refreshKey = 0, onStatsLoaded }) => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [pagination,   setPagination]   = useState({ page: 1, hasMore: false, total: 0 });
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [filter,       setFilter]       = useState('all');
  const [error,        setError]        = useState('');

  const fetchTransactions = useCallback(async (page = 1, type = 'all') => {
    try {
      setLoading(true);
      setError('');

      const token = await currentUser.getIdToken();
      const params = new URLSearchParams({ page, limit: 5, type });
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/wallet/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      setTransactions(data.transactions);
      setPagination(data.pagination);

      // Get actual stats from the backend for the first page
      if (page === 1 && onStatsLoaded && data.stats) {
        onStatsLoaded(data.stats);
      }
    } catch (err) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [currentUser, onStatsLoaded]);

  // Refetch when refreshKey changes (e.g. after a withdrawal) or filter changes
  useEffect(() => {
    fetchTransactions(1, filter);
  }, [filter, refreshKey, fetchTransactions]);

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchTransactions(pagination.page - 1, filter);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      fetchTransactions(pagination.page + 1, filter);
    }
  };

  const handleFilterChange = (val) => {
    setFilter(val);
    setTransactions([]);
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-white/[0.06]">
        <div>
          <h2 className="text-base font-bold font-display text-white">Transaction History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {pagination.total > 0 ? `${pagination.total.toLocaleString()} total transactions` : 'All your activity in one place'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <div className="relative">
            <select
              id="tx-filter"
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 pr-8 text-xs text-slate-300 font-medium outline-none focus:border-blue-500/50 cursor-pointer"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0d1628]">
                  {opt.label}
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
          </div>

          {/* Refresh button */}
          <button
            id="tx-refresh-btn"
            onClick={() => fetchTransactions(1, filter, false)}
            disabled={loading}
            className="w-8 h-8 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-slate-500 hover:text-slate-300 flex items-center justify-center transition-all disabled:opacity-40"
            title="Refresh"
          >
            <FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="divide-y divide-white/[0.04]">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-white/[0.05] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/[0.05] rounded-full w-1/3" />
                <div className="h-2.5 bg-white/[0.04] rounded-full w-1/2" />
              </div>
              <div className="h-3 bg-white/[0.05] rounded-full w-16" />
            </div>
          ))
        ) : error ? (
          <div className="px-5 py-12 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => fetchTransactions(1, filter)} className="mt-3 text-xs text-blue-400 hover:underline">
              Try again
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-5 py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
              <FiInbox className="text-slate-600 text-2xl" />
            </div>
            <p className="text-slate-500 text-sm font-medium">No transactions yet</p>
            <p className="text-slate-600 text-xs text-center max-w-xs">
              {filter !== 'all'
                ? `No "${FILTER_OPTIONS.find(f => f.value === filter)?.label}" entries found. Try a different filter.`
                : 'Complete tasks, claim bonuses, or refer friends to start earning!'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {transactions.map((tx, i) => {
              const config  = TX_TYPES[tx.transactionType] || TX_TYPES.admin_adjustment;
              const Icon    = config.icon;
              const isDebit = tx.amount < 0;
              const statusC = STATUS_COLORS[tx.status] || STATUS_COLORS.completed;

              return (
                <motion.div
                  key={tx._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Label + description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-slate-200 leading-none">{config.label}</p>
                      {tx.status !== 'completed' && (
                        <span className={`${statusC.text} text-[10px] font-mono flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusC.dot}`} />
                          {tx.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{tx.description}</p>
                    {tx.fee > 0 && (
                      <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">Fee: <CoinDisplay amount={tx.fee} size={10} /></p>
                    )}
                  </div>

                  {/* Amount + time */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${isDebit ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isDebit ? '-' : '+'}{Math.abs(tx.amount).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{formatRelativeTime(tx.createdAt)}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────── */}
      {!loading && transactions.length > 0 && (pagination.hasMore || pagination.page > 1) && (
        <div className="p-4 border-t border-white/[0.04] flex justify-between items-center">
          <button
            onClick={handlePrevPage}
            disabled={pagination.page <= 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FiChevronLeft className="text-base" />
          </button>
          
          <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
            Page {pagination.page} of {pagination.totalPages}
          </p>

          <button
            onClick={handleNextPage}
            disabled={!pagination.hasMore}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FiChevronRight className="text-base" />
          </button>
        </div>
      )}

      {/* ── Footer summary ─────────────────────────────────── */}
      {!loading && transactions.length > 0 && !pagination.hasMore && pagination.page === 1 && (
        <div className="p-4 border-t border-white/[0.04] text-center">
          <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">
            All {pagination.total} transactions shown
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
