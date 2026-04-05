import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { FiZap, FiTrendingUp, FiCheckCircle, FiClock, FiStar, FiArrowRight, FiLock, FiUnlock } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const quickActions = [
  { icon: FiCheckCircle, label: 'Complete a Survey', color: 'from-indigo-500 to-violet-600', glow: 'rgba(99,102,241,0.2)', path: '/dashboard/earn' },
  { icon: FiTrendingUp, label: 'Watch a Video', color: 'from-cyan-500 to-blue-600', glow: 'rgba(6,182,212,0.2)' },
  { icon: FiStar,       label: 'Daily Bonus',    color: 'from-amber-500 to-orange-600', glow: 'rgba(245,158,11,0.2)' },
  { icon: FiZap,        label: 'Refer a Friend', color: 'from-violet-500 to-fuchsia-600', glow: 'rgba(124,58,237,0.2)' },
];

const recentActivity = [
  { action: 'Survey Completed', pts: '+50', time: '2m ago', status: 'success' },
  { action: 'Daily Login Bonus', pts: '+10', time: '1h ago', status: 'success' },
  { action: 'Video Watched', pts: '+25', time: '3h ago', status: 'success' },
  { action: 'Referral Reward', pts: '+100', time: '1d ago', status: 'success' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const DailyBonusCard = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const fetchStatus = async () => {
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/wallet/daily-bonus-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch daily bonus status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchStatus();
  }, [currentUser]);

  useEffect(() => {
    if (!status?.nextClaimAt || !status.alreadyClaimed) return;
    
    const target = new Date(status.nextClaimAt).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft('00:00:00');
        fetchStatus(); // re-fetch when timer hits 0
        return;
      }
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const claimBonus = async () => {
    setClaiming(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/wallet/daily-bonus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        // Optional: you could dispatch an event or refresh context balance here
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to claim bonus', err);
    } finally {
      setClaiming(false);
    }
  };

  if (loading || !status) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-white/10 rounded w-1/2 mb-4"></div>
      </div>
    );
  }

  // State 3: Already Claimed
  if (status.alreadyClaimed) {
    return (
      <motion.div variants={item} className="glass-card p-6 border border-emerald-500/20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
              <FiClock className="text-emerald-400" /> Come back in {timeLeft || '...'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Streak: Day {status.streak} | Claimed today ✓
            </p>
            <p className="text-sm text-indigo-300 mt-1">
              Next bonus: {status.rewardTomorrow} coins (Day {status.dayIndex + 2 > 7 ? 1 : status.dayIndex + 2})
            </p>
          </div>
          <div className="flex-shrink-0">
             <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
               <FiCheckCircle className="text-emerald-400 text-2xl" />
             </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // State 2: Gate Met (Claimable)
  if (status.gateUnlocked) {
    return (
      <motion.div variants={item} className="glass-card p-6 border border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
              <FiUnlock className="text-amber-400" /> Daily Requirement Met!
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Streak Day {status.streak}
            </p>
            <p className="text-sm text-amber-300 font-medium mt-1">
              Tomorrow: Day {status.dayIndex + 2 > 7 ? 1 : status.dayIndex + 2} will be {status.rewardTomorrow} coins
            </p>
          </div>
          <button
            onClick={claimBonus}
            disabled={claiming}
            className="flex-shrink-0 btn-primary px-8 py-3 text-lg animate-pulse"
            style={{ boxShadow: '0 0 20px rgba(245,158,11,0.4)' }}
          >
            {claiming ? 'Claiming...' : `Claim ${status.rewardToday} Coins!`}
          </button>
        </div>
      </motion.div>
    );
  }

  // State 1: Gate Not Met
  const progressPercent = Math.min(100, Math.floor((status.earned / status.required) * 100));
  
  return (
    <motion.div variants={item} className="glass-card p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <FiLock className="text-slate-400" /> Daily Bonus Locked
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Earn {status.earned} / {status.required} coins today to unlock
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">Streak: Day {status.streak}</p>
          <p className="text-sm text-indigo-300 font-medium mt-1">
            Today's bonus: {status.rewardToday} coins
          </p>
        </div>
      </div>
      {/* Progress Bar */}
      <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/10">
        <div 
          className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-1000"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="text-xs text-right mt-2 text-indigo-400 font-mono font-bold">
        {progressPercent}%
      </p>
    </motion.div>
  );
};

const Home = () => {
  const { mongoUser, currentUser } = useAuth();
  const navigate = useNavigate();
  const displayName = mongoUser?.displayName || 'User';
  const balance = mongoUser?.walletBalance?.toFixed(2) ?? '0.00';
  const vipLevel = mongoUser?.vipLevel ?? 1;
  const [tasksDone, setTasksDone] = useState('...');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/wallet/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setTasksDone(data.totalTasksCompleted.toString());
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      }
    };
    if (currentUser) fetchStats();
  }, [currentUser]);

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

        {/* ─── Greeting Banner ──────────────────────────────── */}
        <motion.div variants={item} className="glass-card p-8 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-2">Dashboard</p>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-white mb-2">
                Welcome back, <span className="gradient-text">{displayName}</span> 👋
              </h1>
              <p className="text-slate-400 text-sm">Here's what's happening with your account today.</p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-start sm:items-end">
              <span className="badge-violet mb-2">Rank {vipLevel}</span>
              <p className="text-3xl font-bold font-mono text-white">{balance}</p>
              <p className="text-indigo-400 text-xs font-mono tracking-widest">PTS BALANCE</p>
            </div>
          </div>
        </motion.div>

        {/* ─── Stats Row ────────────────────────────────────── */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Balance', value: balance, unit: 'PTS', color: 'text-indigo-400', icon: FiZap },
            { label: 'Tasks Done', value: tasksDone, unit: 'Lifetime', color: 'text-cyan-400', icon: FiCheckCircle },
            { label: 'Streak',  value: mongoUser?.dailyBonusStreak || '0',   unit: 'Days',  color: 'text-amber-400', icon: FiTrendingUp },
            { label: 'VIP Rank', value: `Lvl ${vipLevel}`, unit: 'Status', color: 'text-violet-400', icon: FiStar },
          ].map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">{stat.label}</p>
                <stat.icon className={`${stat.color} text-sm`} />
              </div>
              <p className={`text-2xl font-bold ${stat.color} font-mono`}>{stat.value}</p>
              <p className="text-xs text-slate-600 mt-1">{stat.unit}</p>
            </div>
          ))}
        </motion.div>

        {/* ─── Daily Bonus Card ───────────────────────────── */}
        <DailyBonusCard />

        {/* ─── Quick Actions + Recent Activity ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Quick Actions */}
          <motion.div variants={item} className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold font-display text-white">Quick Actions</h2>
              <span className="badge-cyan">Earn More</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => action.path && navigate(action.path)}
                  className="group flex flex-col items-start gap-3 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all text-left"
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center transition-transform group-hover:-translate-y-0.5`}
                    style={{ boxShadow: `0 6px 16px ${action.glow}` }}
                  >
                    <action.icon className="text-white text-sm" />
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors leading-snug">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={item} className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold font-display text-white">Recent Activity</h2>
              <button className="text-indigo-400 text-xs font-semibold flex items-center gap-1 hover:text-indigo-300 transition-colors">
                View All <FiArrowRight className="text-xs" />
              </button>
            </div>
            <div className="space-y-3">
              {recentActivity.map((act, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-sm text-slate-200 font-medium">{act.action}</p>
                      <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                        <FiClock className="text-[10px]" /> {act.time}
                      </p>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold text-sm">{act.pts}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
};

export default Home;
