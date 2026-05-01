import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useDailyBonus } from '../contexts/DailyBonusContext';
import { FiGift, FiUnlock, FiLock, FiClock, FiCheckCircle, FiZap } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DailyBonus() {
  const { currentUser } = useAuth();
  // Use shared context — data is already loaded by the Header, so page is instant
  const { status, loading, fetchStatus } = useDailyBonus();
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null); // { coins }
  const [timeLeft, setTimeLeft] = useState('');

  // Countdown timer
  useEffect(() => {
    if (!status?.nextClaimAt || !status.alreadyClaimed) return;
    const target = new Date(status.nextClaimAt).getTime();
    const interval = setInterval(() => {
      const distance = target - Date.now();
      if (distance < 0) { clearInterval(interval); setTimeLeft('00:00:00'); fetchStatus(); return; }
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
      const res = await fetch(`${API}/wallet/daily-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setClaimResult({ coins: data.rewardAmount });
        fetchStatus(); // refresh shared context
      } else {
        alert(data.error || 'Failed to claim bonus');
      }
    } catch (err) {
      console.error('Failed to claim bonus', err);
    } finally {
      setClaiming(false);
    }
  };

  if (loading || !status) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const progressPercent = Math.min(100, Math.floor((status.earned / status.required) * 100));
  const remainingCoins = Math.max(0, status.required - status.earned);

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
            <FiGift className="text-4xl text-indigo-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-white">Daily Bonus</h1>
          <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
            Complete offers and earn coins every day to unlock your daily reward. Maintain your streak to earn more!
          </p>
        </div>

        {/* Claim Card */}
        <div className="glass-card p-6 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Today&apos;s Reward</h2>
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-4xl sm:text-5xl font-black text-amber-400 drop-shadow-lg">{status.rewardToday}</span>
            <img src="/coin.png" alt="Coins" className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-md" onError={(e) => e.target.style.display='none'} />
          </div>

          {/* ── Already Claimed ── */}
          {status.alreadyClaimed ? (
            <div className="inline-flex flex-col items-center p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <FiCheckCircle className="text-3xl text-emerald-400 mb-2" />
              <h3 className="text-emerald-400 font-bold text-lg mb-1">Claimed Successfully</h3>
              <p className="text-emerald-500/70 text-sm mb-4">Come back tomorrow for your next reward!</p>
              <div className="flex items-center gap-2 text-emerald-300 font-sans text-xl bg-emerald-900/40 px-4 py-2 rounded-xl">
                <FiClock /> {timeLeft}
              </div>
            </div>

          /* ── Gate Unlocked — CLAIM NOW ── */
          ) : status.gateUnlocked ? (
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
                <FiUnlock /> Goal Reached — Ready to Claim!
              </div>

              {claimResult ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex flex-col items-center gap-2 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/25"
                >
                  <span className="text-5xl">🎉</span>
                  <p className="text-2xl font-black text-amber-400">+{claimResult.coins} Coins!</p>
                  <p className="text-slate-400 text-sm">Bonus claimed successfully.</p>
                </motion.div>
              ) : (
                <div>
                  {/* Big, pulsing, unmissable claim button */}
                  <button
                    onClick={claimBonus}
                    disabled={claiming}
                    className="relative inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-xl text-white
                      bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500
                      border-2 border-amber-300/60
                      shadow-[0_0_30px_rgba(245,158,11,0.7),0_0_60px_rgba(245,158,11,0.3)]
                      hover:shadow-[0_0_45px_rgba(245,158,11,0.9),0_0_90px_rgba(245,158,11,0.5)]
                      hover:scale-105 active:scale-100
                      transition-all duration-200
                      disabled:opacity-60 disabled:cursor-not-allowed
                      overflow-hidden group"
                    style={{ animation: 'bonusPulse 1.8s ease-in-out infinite' }}
                  >
                    {/* shimmer sweep */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none" />
                    <FiZap className="text-2xl relative z-10 drop-shadow" />
                    <span className="relative z-10 drop-shadow">
                      {claiming ? 'Claiming…' : '🎁 Claim Reward Now'}
                    </span>
                  </button>
                  <p className="text-slate-500 text-xs mt-3">You've earned enough — tap to collect!</p>
                </div>
              )}
            </div>

          /* ── Gate Locked — progress ── */
          ) : (
            <div className="max-w-md mx-auto space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Progress to unlock</span>
                <span className="text-indigo-400 font-bold">{status.earned} / {status.required} Coins</span>
              </div>
              <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-sm text-slate-500">
                Earn <span className="text-white font-bold">{remainingCoins.toLocaleString()}</span> more coins today to unlock your bonus!
              </p>
            </div>
          )}
        </div>

        {/* Streak + Next Goal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Your Streak</h3>
            <div className="flex items-end gap-4">
              <div className="text-5xl font-black text-white">{status.streak} <span className="text-2xl text-slate-500 font-normal">days</span></div>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Don&apos;t miss a day! If you don&apos;t claim your bonus within 24 hours, your streak resets to 1. The streak runs up to 30 days and resets after completion.
            </p>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Next Goal</h3>
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <p className="text-sm text-slate-400">Tomorrow&apos;s Reward</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-2xl font-bold text-amber-400">{status.rewardTomorrow?.toLocaleString()}</span>
                  <img src="/coin.png" className="w-5 h-5" alt="Coins" onError={(e) => e.target.style.display='none'} />
                </div>
              </div>
              <FiLock className="text-3xl text-slate-600" />
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4">Special Streak Rewards</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center flex flex-col items-center">
              <div className="text-sm text-slate-400 mb-1">Day 10</div>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-amber-400">{status.rewardDay10?.toLocaleString() ?? 500}</span>
                <img src="/coin.png" className="w-5 h-5 drop-shadow-sm" alt="Coins" onError={(e) => e.target.style.display='none'} />
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center flex flex-col items-center">
              <div className="text-sm text-slate-400 mb-1">Day 20</div>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-amber-400">{status.rewardDay20?.toLocaleString() ?? '1,000'}</span>
                <img src="/coin.png" className="w-5 h-5 drop-shadow-sm" alt="Coins" onError={(e) => e.target.style.display='none'} />
              </div>
            </div>
            <div className="bg-white/[0.02] border border-amber-500/20 rounded-xl p-4 text-center flex flex-col items-center relative overflow-hidden">
              <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
              <div className="text-sm text-amber-300/80 mb-1 font-semibold">Day 30 (Max)</div>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-amber-400 drop-shadow-md">{status.rewardDay30?.toLocaleString() ?? '2,500'}</span>
                <img src="/coin.png" className="w-5 h-5 drop-shadow-sm" alt="Coins" onError={(e) => e.target.style.display='none'} />
              </div>
            </div>
          </div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
}
