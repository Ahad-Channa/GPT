import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { FiZap, FiTrendingUp, FiCheckCircle, FiClock, FiStar, FiArrowRight } from 'react-icons/fi';

const quickActions = [
  { icon: FiCheckCircle, label: 'Complete a Survey', color: 'from-indigo-500 to-violet-600', glow: 'rgba(99,102,241,0.2)' },
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

const Home = () => {
  const { mongoUser } = useAuth();
  const displayName = mongoUser?.displayName || 'User';
  const balance = mongoUser?.walletBalance?.toFixed(2) ?? '0.00';
  const vipLevel = mongoUser?.vipLevel ?? 1;

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
            { label: 'Tasks Done', value: '12', unit: 'Today', color: 'text-cyan-400', icon: FiCheckCircle },
            { label: 'Streak',  value: '7',   unit: 'Days',  color: 'text-amber-400', icon: FiTrendingUp },
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
