import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { FiUsers, FiTrendingUp, FiCopy, FiInbox, FiLoader, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import CoinDisplay from '../components/CoinDisplay';
import CoinIcon from '../components/CoinIcon';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TX_TYPE_LABEL = {
  referral_reward: { label: 'Referral', color: 'text-cyan-400' },
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
          const cfg = TX_TYPE_LABEL[tx.transactionType] || { label: tx.transactionType, color: 'text-slate-400' };
          const label = cfg.label;
          const color = cfg.color;
          const isDebit = tx.amount < 0;
          const dotClass = STATUS_DOT[tx.status] || STATUS_DOT.completed;
          const description = tx.description;
          const amountStr = `${isDebit ? '' : '+'}${Math.abs(tx.amount).toLocaleString()}`;

          return (
            <div key={tx._id} className="flex items-center gap-3 py-3 hover:bg-white/[0.01] transition-colors">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 font-medium truncate">{description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-semibold ${color}`}>{label}</span>
                  <span className="text-[10px] text-slate-600">{timeAgo(tx.createdAt)}</span>
                </div>
              </div>
              <span className={`text-sm font-bold flex-shrink-0 ${isDebit ? 'text-rose-400' : 'text-emerald-400'}`}>
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
      const params = new URLSearchParams({ page: pg, limit: 5 });
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

const useAffiliateStats = (token) => {
  const [stats, setStats] = useState({ totalAffiliates: 0, totalAffiliateEarnings: 0, last30DaysEarnings: 0, referralPercentage: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API}/wallet/affiliate-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setStats({
            totalAffiliates: data.totalAffiliates,
            totalAffiliateEarnings: data.totalAffiliateEarnings,
            last30DaysEarnings: data.last30DaysEarnings,
            referralPercentage: data.referralPercentage ?? null,
          });
        }
      } catch (err) {
        console.error('Failed to fetch affiliate stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  return { stats, loading };
};

const Affiliates = () => {
  const { currentUser, mongoUser } = useAuth();
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (currentUser) currentUser.getIdToken().then(setToken);
  }, [currentUser]);

  const referrals = useHistory(token, 'referral_reward');
  const { stats, loading: statsLoading } = useAffiliateStats(token);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto w-full space-y-8"
      >
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <FiUsers className="text-4xl text-cyan-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-white">Affiliate Program</h1>
          <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
            Invite friends and earn{' '}
            {statsLoading ? (
              <span className="inline-block w-8 h-3.5 bg-white/10 rounded animate-pulse align-middle" />
            ) : (
              <span className="text-cyan-400 font-bold">
                {stats.referralPercentage != null ? `${stats.referralPercentage}%` : '5%'}
              </span>
            )}{' '}
            of their earnings — forever! The more you invite, the more you earn.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Affiliates</h3>
            <div className="text-4xl font-black text-white">
              {statsLoading ? <span className="animate-pulse">...</span> : stats.totalAffiliates}
            </div>
            <p className="text-xs text-slate-500 mt-2">Active referred users</p>
          </div>

          <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Lifetime Earnings</h3>
            <div className="flex items-center gap-2">
              <div className="text-4xl font-black text-emerald-400">
                {statsLoading ? <span className="animate-pulse">...</span> : <CoinDisplay amount={stats.totalAffiliateEarnings} size={24} />}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Total coins earned from referrals</p>
          </div>

          <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">30-Day Earnings</h3>
            <div className="flex items-center gap-2">
              <div className="text-4xl font-black text-indigo-400">
                {statsLoading ? <span className="animate-pulse">...</span> : <CoinDisplay amount={stats.last30DaysEarnings} size={24} />}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Coins earned in the last 30 days</p>
          </div>
        </div>

        {/* Referral Link Section */}
        <div className="glass-card p-6 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
          
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 relative z-10">Your Unique Referral Link</h2>
          <p className="text-slate-400 text-sm mb-6 relative z-10">Share this link anywhere to start earning passive income.</p>
          
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center w-full bg-[#0b101e] border border-white/[0.08] rounded-xl overflow-hidden relative z-10 shadow-lg">
            <p className="text-sm sm:text-base text-cyan-200 font-mono truncate px-4 py-4 flex-1 select-all w-full text-center sm:text-left">
              {window.location.origin}/r/{mongoUser?.referralCode}
            </p>
            <button 
              onClick={() => copyToClipboard(`${window.location.origin}/r/${mongoUser?.referralCode}`)}
              className="w-full sm:w-auto px-8 py-4 flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold text-sm transition-all shrink-0 gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
            >
              <FiCopy size={18} /> <span>Copy Link</span>
            </button>
          </div>
        </div>

        {/* Earnings History */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.06] bg-white/[0.02]">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FiTrendingUp className="text-emerald-400" /> Recent Referral Earnings
            </h3>
          </div>
          <div className="px-6 py-2">
            <HistoryList
              transactions={referrals.dataList}
              loading={referrals.loading}
              error={referrals.error}
              hasMore={referrals.hasMore}
              onLoadMore={referrals.loadMore}
              loadingMore={referrals.loadingMore}
              emptyMessage="No referral earnings yet. Share your link to start earning!"
            />
          </div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
};

export default Affiliates;
