import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import WithdrawalModal from '../components/wallet/WithdrawalModal';
import TransactionHistory from '../components/wallet/TransactionHistory';
import { CURRENCY_NAME, CURRENCY_SYMBOL, formatCoins } from '../config/platform';
import {
  FiArrowDownCircle,
  FiTrendingUp,
  FiClock,
  FiCheckCircle,
  FiRefreshCw,
  FiInfo,
  FiGift,
} from 'react-icons/fi';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item      = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.38 } } };

const PromoCodeRedeem = ({ onSuccess }) => {
  const { currentUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/wallet/redeem-promo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ text: `+${data.coinsEarned} Coins added to your wallet!`, type: 'success' });
        setCode('');
        if (onSuccess) onSuccess(data.newBalance);
      } else {
        setMessage({ text: data.error || 'Failed to redeem code', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error. Try again later.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div variants={item} className="glass-card p-6 border border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/5 to-transparent">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-500/20">
          <FiGift className="text-fuchsia-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-display text-white">Redeem Promo Code</h2>
          <p className="text-sm text-slate-400">Have a code? Enter it below to claim free coins.</p>
        </div>
      </div>
      
      <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ENTER CODE HERE"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 flex-1 uppercase font-sans tracking-wider"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="btn-primary bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 px-6 py-3 rounded-xl font-semibold disabled:opacity-50"
          style={{ boxShadow: '0 0 15px rgba(217,70,239,0.2)' }}
        >
          {loading ? 'Redeeming...' : 'Redeem'}
        </button>
      </form>
      
      {message.text && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className={`mt-3 text-sm font-medium ${message.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}
        >
          {message.text}
        </motion.p>
      )}
    </motion.div>
  );
};

const Wallet = () => {
  const { currentUser, mongoUser, setMongoUser } = useAuth();
  const [showWithdraw, setShowWithdraw]   = useState(false);
  const [settings,     setSettings]       = useState(null);
  const [txRefresh,    setTxRefresh]      = useState(0); // bump to refresh history
  const [settingsLoad, setSettingsLoad]   = useState(true);
  const [historyStats, setHistoryStats]   = useState({ totalEarned: 0, totalWithdrawn: 0, pendingCount: 0 });

  // Load wallet settings (fee %, methods, live rate)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setSettingsLoad(true);
        const token = await currentUser.getIdToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/wallet/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setSettings(data);
      } catch (err) {
        console.error('Failed to load wallet settings:', err);
      } finally {
        setSettingsLoad(false);
      }
    };
    if (currentUser) fetchSettings();
  }, [currentUser]);

  // After successful withdrawal, refresh balance in header
  const handleWithdrawSuccess = useCallback((newBalance) => {
    if (setMongoUser) {
      setMongoUser((prev) => ({ ...prev, walletBalance: newBalance }));
    }
    setTxRefresh((n) => n + 1);
  }, [setMongoUser]);

  const balance = mongoUser?.walletBalance ?? 0;

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 max-w-5xl mx-auto w-full">

        {/* ── Page Header ───────────────────────────────────────── */}
        <motion.div variants={item}>
          <h1 className="text-3xl font-bold font-display text-white">Your Wallet</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your {CURRENCY_NAME}, track activity, and request payouts.</p>
        </motion.div>

        {/* ── Balance Hero Card ─────────────────────────────────── */}
        <motion.div variants={item} className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0d1628] via-[#0f1e3a] to-[#091020] p-8">
          {/* Background glow orbs */}
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <p className="text-blue-400/80 text-xs font-semibold tracking-widest uppercase mb-3 flex items-center gap-1.5">
                <span className="text-base">{CURRENCY_SYMBOL}</span> Available Balance
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-6xl font-bold font-sans text-white tracking-tighter">
                  {balance.toLocaleString()}
                </p>
                <span className="text-blue-400 font-sans text-lg font-semibold">{CURRENCY_NAME}</span>
              </div>

            </div>

            <button
              id="wallet-withdraw-btn"
              onClick={() => setShowWithdraw(true)}
              disabled={balance <= 0 || settingsLoad}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm btn-glow disabled:opacity-40 disabled:cursor-not-allowed shrink-0 self-start sm:self-auto"
            >
              <FiArrowDownCircle className="text-base" />
              Withdraw Funds
            </button>
          </div>

          {/* Live Rate Chip */}
          {settings && (
            <div className="relative z-10 mt-6 pt-5 border-t border-white/[0.06] flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-1.5">
                <span className="text-xs font-sans text-slate-400">1 USD =</span>
                <span className="text-xs font-sans font-bold text-blue-400">{settings.coinsPerUSD} {CURRENCY_NAME}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Quick Stats Row ───────────────────────────────────── */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Total Earned',
              value: formatCoins(historyStats.totalEarned, true),
              icon: FiTrendingUp,
              color: 'text-emerald-400',
              bg: 'from-emerald-500/10 to-emerald-600/5',
              border: 'border-emerald-500/15',
            },
            {
              label: 'Total Withdrawn',
              value: formatCoins(historyStats.totalWithdrawn, true),
              icon: FiArrowDownCircle,
              color: 'text-blue-400',
              bg: 'from-blue-500/10 to-blue-600/5',
              border: 'border-blue-500/15',
            },
            {
              label: 'Pending Payouts',
              value: historyStats.pendingCount,
              suffix: 'requests',
              icon: FiClock,
              color: 'text-amber-400',
              bg: 'from-amber-500/10 to-amber-600/5',
              border: 'border-amber-500/15',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`relative overflow-hidden bg-gradient-to-br ${stat.bg} border ${stat.border} rounded-xl p-5`}
            >
              <div className="flex items-start justify-between mb-4">
                <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">{stat.label}</p>
                <stat.icon className={`${stat.color} text-sm`} />
              </div>
              <p className={`text-2xl font-bold font-sans ${stat.color}`}>{stat.value}</p>
              {stat.suffix && <p className="text-xs text-slate-600 mt-1">{stat.suffix}</p>}
            </div>
          ))}
        </motion.div>

        {/* ── How Withdrawals Work (Info Banner) ───────────────── */}
        {settings && (
          <motion.div variants={item} className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/[0.06] border border-blue-500/[0.15]">
            <FiInfo className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-400 space-y-0.5 leading-relaxed">
              <p>
                <span className="text-white font-semibold">How payouts work: </span>
                Submit a request for a supported method. <span className="text-orange-400 font-semibold">Processing fees apply based on the payout method</span>.
                Payouts are reviewed and processed by our team within 1–3 business days.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Transaction History ───────────────────────────────── */}
        <motion.div variants={item}>
          <TransactionHistory
            refreshKey={txRefresh}
            onStatsLoaded={setHistoryStats}
          />
        </motion.div>

        {/* ── Promo Code Redeemer ───────────────────────────────── */}
        <PromoCodeRedeem onSuccess={handleWithdrawSuccess} />

      </motion.div>

      {/* ── Withdrawal Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showWithdraw && settings && (
          <WithdrawalModal
            settings={settings}
            balance={balance}
            onClose={() => setShowWithdraw(false)}
            onSuccess={handleWithdrawSuccess}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Wallet;
