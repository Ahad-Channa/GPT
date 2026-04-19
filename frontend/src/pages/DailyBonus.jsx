import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { FiGift, FiUnlock, FiLock, FiClock, FiCheckCircle } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DailyBonus() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const fetchStatus = async () => {
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/wallet/daily-bonus-status`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setStatus(data);
    } catch (err) {
      console.error(err);
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
        fetchStatus();
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
      const res = await fetch(`${API}/wallet/daily-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
            <FiGift className="text-4xl text-indigo-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-white">Daily Bonus</h1>
          <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
            Complete offers and earn coins every day to unlock your daily reward. Maintain your streak to earn more!
          </p>
        </div>

        {/* Claim Card Section */}
        <div className="glass-card p-6 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
          
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Today&apos;s Reward</h2>
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-4xl sm:text-5xl font-black text-amber-400 drop-shadow-lg">{status.rewardToday}</span>
            <img src="/coin.png" alt="Coins" className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-md" onError={(e) => e.target.style.display='none'}/>
          </div>

          {status.alreadyClaimed ? (
            <div className="inline-flex flex-col items-center p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <FiCheckCircle className="text-3xl text-emerald-400 mb-2" />
              <h3 className="text-emerald-400 font-bold text-lg mb-1">Claimed Successfully</h3>
              <p className="text-emerald-500/70 text-sm mb-4">Come back tomorrow for your next reward!</p>
              <div className="flex items-center gap-2 text-emerald-300 font-sans text-xl bg-emerald-900/40 px-4 py-2 rounded-xl">
                <FiClock /> {timeLeft}
              </div>
            </div>
          ) : status.gateUnlocked ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
                <FiUnlock /> Goal Reached!
              </div>
              <div>
                <button
                  onClick={claimBonus}
                  disabled={claiming}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-lg transition-all shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] disabled:opacity-50"
                >
                  {claiming ? 'Claiming...' : 'Claim Reward Now'}
                </button>
              </div>
            </div>
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
                Earn <span className="text-white font-bold">{remainingCoins}</span> more coins today to unlock your bonus!
              </p>
            </div>
          )}
        </div>

        {/* Streak System Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Your Streak</h3>
            <div className="flex items-end gap-4">
              <div className="text-5xl font-black text-white">{status.streak} <span className="text-2xl text-slate-500 font-normal">days</span></div>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Don&apos;t miss a day! If you don&apos;t claim your bonus tomorrow, your streak will reset to 0.
            </p>
          </div>
          
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Next Goal</h3>
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <p className="text-sm text-slate-400">Tomorrow&apos;s Reward</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-2xl font-bold text-amber-400">{status.rewardTomorrow}</span>
                  <img src="/coin.png" className="w-5 h-5" alt="Coins" onError={(e) => e.target.style.display='none'}/>
                </div>
              </div>
              <FiLock className="text-3xl text-slate-600" />
            </div>
          </div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
}
