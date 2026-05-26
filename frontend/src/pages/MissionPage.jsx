import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import CoinDisplay from '../components/CoinDisplay';
import toast from 'react-hot-toast';
import {
  FiTarget,
  FiCheckCircle,
  FiClock,
  FiLock,
  FiGift,
  FiCalendar,
  FiTrendingUp,
  FiRepeat,
  FiAward,
} from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Period accent colors & labels ───────────────────────────────────────────
const PERIOD_CONFIG = {
  daily: {
    label: 'Daily',
    icon: FiCalendar,
    color: '#6366f1',       // indigo
    glow: 'rgba(99,102,241,0.35)',
    border: 'rgba(99,102,241,0.3)',
    bg: 'rgba(99,102,241,0.08)',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    badgeBg: 'rgba(99,102,241,0.15)',
    badgeText: '#a5b4fc',
  },
  weekly: {
    label: 'Weekly',
    icon: FiRepeat,
    color: '#10b981',       // emerald
    glow: 'rgba(16,185,129,0.35)',
    border: 'rgba(16,185,129,0.3)',
    bg: 'rgba(16,185,129,0.08)',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
    badgeBg: 'rgba(16,185,129,0.15)',
    badgeText: '#6ee7b7',
  },
  monthly: {
    label: 'Monthly',
    icon: FiTrendingUp,
    color: '#f59e0b',       // amber
    glow: 'rgba(245,158,11,0.35)',
    border: 'rgba(245,158,11,0.3)',
    bg: 'rgba(245,158,11,0.08)',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    badgeBg: 'rgba(245,158,11,0.15)',
    badgeText: '#fcd34d',
  },
};

// ── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(endsAt) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!endsAt) return;
    const target = new Date(endsAt).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setTimeLeft('Resetting…'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 24) {
        const d = Math.floor(h / 24);
        setTimeLeft(`${d}d ${h % 24}h ${m}m`);
      } else {
        setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
      }
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [endsAt]);

  return timeLeft;
}

// ── MissionCard component ────────────────────────────────────────────────────
function MissionCard({ mission, periodCfg, onClaim, claiming }) {
  const pct = Math.min(100, Math.floor((mission.progress / mission.targetValue) * 100));
  const isClaiming = claiming === mission.userMissionId;

  let stateLabel = null;
  let stateLabelColor = '#94a3b8';
  if (mission.claimed) {
    stateLabel = '✓ Claimed';
    stateLabelColor = periodCfg.color;
  } else if (mission.completed && !mission.claimable) {
    stateLabel = 'Expired';
    stateLabelColor = '#ef4444';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden"
      style={{
        background: mission.claimed
          ? `${periodCfg.bg}`
          : 'rgba(15, 23, 42, 0.6)',
        border: `1px solid ${mission.completed ? periodCfg.border : 'rgba(51,65,85,0.5)'}`,
        boxShadow: mission.claimable ? `0 0 20px ${periodCfg.glow}` : 'none',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Shimmer for claimable missions */}
      {mission.claimable && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${periodCfg.glow}, transparent)`,
            animation: 'missionShimmer 2.4s ease-in-out infinite',
          }}
        />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: mission.completed ? periodCfg.gradient : 'rgba(30,41,59,0.8)',
              border: `1px solid ${mission.completed ? periodCfg.border : 'rgba(51,65,85,0.5)'}`,
              boxShadow: mission.completed ? `0 0 10px ${periodCfg.glow}` : 'none',
            }}
          >
            {mission.claimed ? (
              <FiCheckCircle className="text-lg" style={{ color: periodCfg.color }} />
            ) : mission.completed ? (
              <FiTarget className="text-lg text-white" />
            ) : (
              <FiTarget className="text-slate-500 text-base" />
            )}
          </div>

          <div className="min-w-0">
            <p className={`font-bold text-sm leading-tight truncate ${mission.completed ? 'text-slate-100' : 'text-slate-300'}`}>
              {mission.label}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{mission.description}</p>
          </div>
        </div>

        {/* State label / reward */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 font-bold text-sm" style={{ color: periodCfg.color }}>
            <CoinDisplay amount={mission.rewardAmount} size={13} />
          </div>
          {stateLabel && (
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: stateLabelColor }}>
              {stateLabel}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-slate-500 font-medium">
            {mission.progress.toLocaleString()} / {mission.targetValue.toLocaleString()}
          </span>
          <span className="text-[11px] font-bold" style={{ color: pct === 100 ? periodCfg.color : '#64748b' }}>
            {pct}%
          </span>
        </div>
        <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: pct === 100 ? periodCfg.gradient : `linear-gradient(90deg, ${periodCfg.color}80, ${periodCfg.color}40)`,
              boxShadow: pct === 100 ? `0 0 8px ${periodCfg.glow}` : 'none',
            }}
          />
        </div>
      </div>

      {/* Claim Button */}
      {mission.claimable && (
        <motion.button
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onClaim(mission.userMissionId)}
          disabled={isClaiming}
          className="relative z-10 w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60 disabled:pointer-events-none"
          style={{
            background: periodCfg.gradient,
            color: '#fff',
            boxShadow: `0 4px 16px ${periodCfg.glow}`,
          }}
        >
          {isClaiming ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Claiming…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Claim {mission.rewardAmount.toLocaleString()} Coins
            </span>
          )}
        </motion.button>
      )}
    </motion.div>
  );
}

// ── Period Section ──────────────────────────────────────────────────────────────────
function PeriodSection({ data, periodKey, periodCfg, bonus, onClaim, onClaimBonus, claiming, claimingBonus }) {
  const timeLeft = useCountdown(data?.endsAt);
  const missions = data?.missions || [];
  const completed = missions.filter(m => m.completed).length;

  // Merge bonus info with mission count for the progress bar
  const bonusWithCount = bonus ? { ...bonus, totalMissions: missions.length, completedMissions: completed } : null;

  return (
    <div className="space-y-4">
      {/* Period header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: periodCfg.gradient, boxShadow: `0 0 12px ${periodCfg.glow}` }}
          >
            <periodCfg.icon className="text-white text-sm" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-base">{periodCfg.label} Missions</h2>
            <p className="text-[11px] text-slate-500">
              {completed}/{missions.length} completed
            </p>
          </div>
        </div>

        {timeLeft && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: periodCfg.badgeBg, color: periodCfg.badgeText, border: `1px solid ${periodCfg.border}` }}
          >
            <FiClock className="text-xs" />
            {timeLeft}
          </div>
        )}
      </div>

      {/* Missions */}
      {missions.length === 0 ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
          style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.4)' }}
        >
          <FiLock className="text-slate-600 text-3xl" />
          <p className="text-slate-500 text-sm font-medium">No {periodCfg.label.toLowerCase()} missions configured yet.</p>
          <p className="text-slate-600 text-xs">Check back later or contact support.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {missions.map(mission => (
            <MissionCard
              key={mission.configId}
              mission={mission}
              periodCfg={periodCfg}
              onClaim={onClaim}
              claiming={claiming}
            />
          ))}
        </div>
      )}

      {/* Period completion bonus card — shown below missions */}
      {missions.length > 0 && bonusWithCount && (
        <PeriodBonusCard
          bonus={bonusWithCount}
          period={periodKey}
          periodCfg={periodCfg}
          onClaim={onClaimBonus}
          claimingBonus={claimingBonus}
        />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const MissionPage = () => {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [periodBonus, setPeriodBonus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [claiming, setClaiming] = useState(null);
  const [claimingBonus, setClaimingBonus] = useState(null);

  const fetchMissions = useCallback(async () => {
    try {
      const token = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [missionsRes, bonusRes] = await Promise.all([
        fetch(`${API}/missions`, { headers }),
        fetch(`${API}/missions/period-bonus`, { headers }),
      ]);
      const [json, bonusJson] = await Promise.all([missionsRes.json(), bonusRes.json()]);
      if (json.success) setData(json);
      if (bonusJson.success) setPeriodBonus(bonusJson.periodBonus);
    } catch {
      toast.error('Failed to load missions');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

  const handleClaim = async (userMissionId) => {
    if (claiming || !userMissionId) return;
    setClaiming(userMissionId);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/missions/claim/${userMissionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`🎯 +${json.rewardAmount.toLocaleString()} coins claimed!`);
        fetchMissions();
      } else if (json.expired) {
        toast.error('⏰ Mission period has expired — reward forfeited.');
        fetchMissions();
      } else {
        toast.error(json.error || 'Failed to claim reward');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setClaiming(null);
    }
  };

  const handleBonusClaim = async (period) => {
    if (claimingBonus) return;
    setClaimingBonus(period);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/missions/period-bonus/claim/${period}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`🏆 +${json.rewardAmount.toLocaleString()} bonus coins claimed!`);
        fetchMissions();
      } else if (json.expired) {
        toast.error('⏰ Period expired — bonus forfeited.');
        fetchMissions();
      } else {
        toast.error(json.error || 'Failed to claim bonus');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setClaimingBonus(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const tabs = ['daily', 'weekly', 'monthly'];

  // Summary stats across all periods
  const allMissions = [
    ...(data?.daily?.missions || []),
    ...(data?.weekly?.missions || []),
    ...(data?.monthly?.missions || []),
  ];
  const totalCompleted = allMissions.filter(m => m.completed).length;
  const totalClaimable = allMissions.filter(m => m.claimable).length;

  return (
    <DashboardLayout>
      {/* Shimmer animation keyframes */}
      <style>{`
        @keyframes missionShimmer {
          0%   { opacity: 0; transform: translateX(-100%); }
          50%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(100%); }
        }
      `}</style>

      <div className="w-full max-w-7xl mx-auto space-y-8 p-4 sm:p-6 pb-20">

        {/* ── Hero Header ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-6 sm:p-8 border border-white/[0.07]"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06), rgba(15,23,42,0.95))' }}
        >
          {/* Background decoration */}
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 30px rgba(99,102,241,0.5)' }}
            >
              <FiTarget className="text-white text-2xl" />
            </div>

            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-1 tracking-tight">
                Missions
              </h1>
              <p className="text-slate-400 text-sm">
                Complete missions to earn bonus coins. Rewards expire at the end of each period.
              </p>
            </div>

            {/* Quick stats */}
            <div className="flex gap-4 flex-shrink-0">
              <div
                className="text-center px-4 py-3 rounded-xl"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <div className="text-2xl font-black text-indigo-400">{totalCompleted}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">Completed</div>
              </div>
              {totalClaimable > 0 && (
                <div
                  className="text-center px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}
                >
                  <div className="text-2xl font-black text-emerald-400">{totalClaimable}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">Claimable</div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Tab Bar ──────────────────────────────────────────── */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}
        >
          {tabs.map(tab => {
            const cfg = PERIOD_CONFIG[tab];
            const tabData = data?.[tab];
            const claimable = (tabData?.missions || []).filter(m => m.claimable).length
              + (periodBonus?.[tab]?.claimable ? 1 : 0);

            return (
              <button
                key={tab}
                id={`missions-tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className="flex-1 relative flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all"
                style={{
                  background: activeTab === tab ? cfg.gradient : 'transparent',
                  color: activeTab === tab ? '#fff' : '#94a3b8',
                  boxShadow: activeTab === tab ? `0 0 16px ${cfg.glow}` : 'none',
                }}
              >
                <cfg.icon className="text-sm" />
                {cfg.label}
                {claimable > 0 && (
                  <span
                    className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                    style={{ background: '#ef4444', color: '#fff', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }}
                  >
                    {claimable}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ──────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
          >
            <PeriodSection
              data={data?.[activeTab]}
              periodKey={activeTab}
              periodCfg={PERIOD_CONFIG[activeTab]}
              bonus={periodBonus?.[activeTab] || null}
              onClaim={handleClaim}
              onClaimBonus={handleBonusClaim}
              claiming={claiming}
              claimingBonus={claimingBonus}
            />
          </motion.div>
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
};

export default MissionPage;
