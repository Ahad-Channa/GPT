import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useDailyBonus } from '../contexts/DailyBonusContext';
import { FiGift, FiUnlock, FiLock, FiClock, FiCheckCircle, FiTrendingUp } from 'react-icons/fi';
import CoinIcon from '../components/CoinIcon';
import CoinDisplay from '../components/CoinDisplay';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function useCountdown(target) {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    if (!target) { setDisplay(''); return; }
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setDisplay('00:00:00'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return display;
}

const DAY_LABELS = Array.from({ length: 30 }, (_, i) => i + 1);

export default function DailyBonus() {
  const { currentUser } = useAuth();
  const { status, loading, fetchStatus } = useDailyBonus();
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null);

  // Countdown to next UTC midnight (when the next day cycle opens for everyone)
  const resetTimer = useCountdown(status?.nextClaimAt || status?.cycleResetAt || null);

  useEffect(() => {
    if (resetTimer === '00:00:00') fetchStatus();
  }, [resetTimer, fetchStatus]);

  const claimBonus = async () => {
    setClaiming(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/wallet/daily-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setClaimResult({ coins: data.rewardAmount });
        fetchStatus();
      } else {
        alert(data.error || 'Failed to claim bonus');
      }
    } catch (err) { console.error(err); }
    finally { setClaiming(false); }
  };

  if (loading || !status) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-80">
        <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    </DashboardLayout>
  );

  const progressPercent = Math.min(100, Math.floor((status.earned / status.required) * 100));
  const remainingCoins  = Math.max(0, status.required - status.earned);
  const streak          = status.streak || 0;

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-8">

        {/* ── Hero Header ───────────────────────────────────── */}
        <div className="text-center space-y-5 pt-4">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500/20 to-violet-600/10 flex items-center justify-center border border-indigo-500/25 shadow-[0_0_60px_rgba(99,102,241,0.2)]"
          >
            <FiGift className="text-6xl text-indigo-400" />
          </motion.div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-black font-display text-white tracking-tight">Daily Bonus</h1>
            <p className="text-slate-400 max-w-xl mx-auto mt-3 text-base sm:text-lg">
              Earn coins every day to unlock your bonus. Everyone's day resets at <span className="text-indigo-400 font-bold">midnight UTC</span> — claim it each day to keep your streak alive!
            </p>
          </div>
        </div>

        {/* ── Claim Card ────────────────────────────────────── */}
        <div className="glass-card p-8 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-violet-500/3 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

          <p className="text-slate-500 uppercase text-xs font-bold tracking-widest mb-3">Today's Reward</p>
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className="text-6xl sm:text-7xl font-black text-amber-400 drop-shadow-lg tabular-nums">
              {status.rewardToday}
            </span>
            <div className="flex flex-col items-start">
              <CoinIcon size={40} className="sm:w-12 sm:h-12 drop-shadow-md" />
            </div>
          </div>

          {/* ── Already Claimed ── */}
          {status.alreadyClaimed ? (
            <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
              className="inline-flex flex-col items-center gap-4 p-8 bg-emerald-500/8 rounded-3xl border border-emerald-500/20 min-w-[280px]">
              <FiCheckCircle className="text-5xl text-emerald-400" />
              <div>
                <h3 className="text-emerald-400 font-black text-2xl mb-1">Claimed! 🎉</h3>
                <p className="text-emerald-500/70 text-sm">Next claim unlocks at midnight UTC</p>
              </div>
              <div className="flex items-center gap-3 text-emerald-300 font-mono text-3xl font-black bg-emerald-900/30 px-6 py-3 rounded-2xl border border-emerald-500/20 tracking-widest">
                <FiClock className="text-2xl flex-shrink-0" />
                {resetTimer || '00:00:00'}
              </div>
              <p className="text-slate-600 text-xs">Global reset: midnight UTC daily</p>
            </motion.div>

          /* ── Gate Unlocked ── */
          ) : status.gateUnlocked ? (
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                <FiUnlock /> Goal Reached — Ready to Claim!
              </div>

              {claimResult ? (
                <motion.div initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }}
                  className="inline-flex flex-col items-center gap-3 p-8 rounded-3xl bg-amber-500/10 border border-amber-500/25">
                  <span className="text-6xl">🎉</span>
                  <p className="text-3xl font-black text-amber-400 flex items-center justify-center gap-2">+<CoinDisplay amount={claimResult.coins} size={28} />!</p>
                  <p className="text-slate-400 text-sm">Bonus claimed successfully.</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={claimBonus}
                    disabled={claiming}
                    className="relative inline-flex items-center gap-4 px-14 py-5 rounded-2xl font-black text-2xl text-white
                      bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500
                      border-2 border-amber-300/60
                      shadow-[0_0_40px_rgba(245,158,11,0.7),0_0_80px_rgba(245,158,11,0.25)]
                      hover:shadow-[0_0_60px_rgba(245,158,11,0.9),0_0_100px_rgba(245,158,11,0.4)]
                      hover:scale-105 active:scale-100
                      transition-all duration-200 disabled:opacity-60 overflow-hidden group"
                    style={{ animation: 'bonusPulse 1.8s ease-in-out infinite' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none" />
                    <span className="relative z-10">{claiming ? 'Claiming…' : '🎁 Claim Reward Now'}</span>
                  </button>

                  {status.expiresAt && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                      className="inline-flex items-center gap-2 text-red-400 text-base font-bold bg-red-500/10 py-2.5 px-5 rounded-xl border border-red-500/20">
                      <FiAlertTriangle className="text-lg flex-shrink-0" />
                      Streak expires in: <span className="font-mono text-lg">{expireTimer || '00:00:00'}</span>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

          /* ── Gate Locked ── */
          ) : (
            <div className="max-w-lg mx-auto space-y-6">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400 font-medium">Progress to unlock</span>
                <span className="text-indigo-400 font-bold flex items-center justify-center gap-1.5">{status.earned.toLocaleString()} / <CoinDisplay amount={status.required} size={14} /></span>
              </div>
              <div className="h-5 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                />
                {progressPercent > 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/70">
                    {progressPercent}%
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-base">
                Earn <span className="text-white font-black text-lg ml-1"><CoinDisplay amount={remainingCoins} size={16} /></span> more to unlock your bonus
              </p>
              {/* Show time until global reset so user knows the window */}
              <div className="inline-flex items-center gap-2 text-indigo-400 text-sm font-bold bg-indigo-500/10 py-2 px-4 rounded-xl border border-indigo-500/20">
                <FiClock /> Day resets in: <span className="font-mono">{resetTimer || '00:00:00'}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Streak + Next Goal ────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Streak card */}
          <div className="glass-card p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-1">Current Streak</p>
                <h3 className="text-white font-bold text-lg">Keep it going!</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <FiTrendingUp className="text-2xl text-violet-400" />
              </div>
            </div>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-7xl font-black text-white tabular-nums">{streak}</span>
              <span className="text-2xl text-slate-500 font-normal mb-3">days</span>
            </div>

            {/* Streak active — show time until global reset only when not yet claimed */}
            {!status.alreadyClaimed && streak > 0 && (
              <div className="mt-2 flex items-center gap-2 bg-indigo-500/8 border border-indigo-500/15 rounded-xl p-3">
                <FiClock className="text-indigo-400 text-sm flex-shrink-0" />
                <div>
                  <p className="text-indigo-400 text-xs font-bold uppercase tracking-wide">Claim before day resets</p>
                  <p className="text-indigo-300 font-mono text-xl font-black">{resetTimer || '00:00:00'}</p>
                </div>
              </div>
            )}

            {/* After claiming — next reset countdown */}
            {status.alreadyClaimed && (
              <div className="mt-2 flex items-center gap-2 bg-indigo-500/8 border border-indigo-500/15 rounded-xl p-3">
                <FiClock className="text-indigo-400 text-sm flex-shrink-0" />
                <div>
                  <p className="text-indigo-400 text-xs font-bold uppercase tracking-wide">Next day opens in</p>
                  <p className="text-indigo-300 font-mono text-xl font-black">{resetTimer || '00:00:00'}</p>
                </div>
              </div>
            )}

            {/* Mini day-streak pills */}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                <div key={d} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border transition-all ${
                  d <= streak
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-500 border-indigo-400/50 text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                    : 'bg-white/[0.03] border-white/[0.06] text-slate-600'
                }`}>{d}</div>
              ))}
            </div>
          </div>

          {/* Next Goal card */}
          <div className="glass-card p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-1">Next Reward</p>
                <h3 className="text-white font-bold text-lg">Tomorrow's bonus</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <FiLock className="text-2xl text-amber-400" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-1">Day {(streak % 30) + 1} Reward</p>
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-black text-amber-400">{(status.rewardTomorrow || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-600 text-xs">Earn gate</p>
                <p className="text-slate-400 font-bold text-sm flex items-center gap-1"><CoinDisplay amount={status.required || 0} size={13} /></p>
              </div>
            </div>

            {/* Timing info */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <p className="text-slate-600 text-xs mb-0.5">Reset Cycle</p>
                <p className="text-slate-300 font-bold text-sm">Midnight UTC</p>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <p className="text-slate-600 text-xs mb-0.5">Earn Window</p>
                <p className="text-slate-300 font-bold text-sm">Per UTC day</p>
              </div>
            </div>


          </div>
        </div>

        {/* ── Milestone Rewards ─────────────────────────────── */}
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <FiGift className="text-amber-400 text-lg" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Streak Milestones</h3>
              <p className="text-slate-500 text-xs">Bonus coins for hitting these streaks</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { day: 10, coins: status.rewardDay10 ?? 500, color: '#a5b4fc', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
              { day: 20, coins: status.rewardDay20 ?? 1000, color: '#67e8f9', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)' },
              { day: 30, coins: status.rewardDay30 ?? 2500, color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
            ].map(({ day, coins, color, bg, border }) => {
              const reached = streak >= day;
              return (
                <div key={day} style={{ background: bg, borderColor: border }}
                  className="border rounded-2xl p-6 text-center relative overflow-hidden transition-all hover:scale-[1.02]">
                  {reached && (
                    <div className="absolute top-2 right-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      ✓ Done
                    </div>
                  )}
                  <p className="text-slate-400 text-sm mb-2 font-medium">Day {day}{day === 30 ? ' (Max)' : ''}</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-black" style={{ color }}>{coins.toLocaleString()}</span>
                  </div>
                  {/* Mini progress to this milestone */}
                  <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (streak / day) * 100)}%`, background: color, opacity: 0.7 }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color, opacity: 0.6 }}>{Math.min(streak, day)}/{day} days</p>
                </div>
              );
            })}
          </div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
}
