import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { TIER_STYLES, getLevelLabel } from '../utils/vipLevels';
import VipBadge from '../components/VipBadge';
import CoinDisplay from '../components/CoinDisplay';
import { FiLock, FiCheckCircle, FiGift, FiTrendingUp, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VipPage = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch(`${API}/vip/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStatus(data);
    } catch {
      toast.error('Failed to load VIP status');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleClaim = async (levelKey) => {
    if (claiming) return;
    setClaiming(levelKey);
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch(`${API}/vip/claim/${levelKey}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`🎉 Claimed ${data.rewardAmount.toLocaleString()} coins!`);
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to claim');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setClaiming(null);
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

  const { currentLevel, nextLevel, progressPct, coinsToNext, levels = [], totalEarned } = status || {};
  const tierStyle = TIER_STYLES[currentLevel?.tier] || TIER_STYLES.Bronze;

  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Opal'];
  const currentLevelIdx = currentLevel ? levels.findIndex(l => l.key === currentLevel.key) : -1;
  const rankLevelDisplay = currentLevelIdx >= 0 ? currentLevelIdx + 1 : 0;
  const totalRanks = levels.length || 16;

  return (
    <DashboardLayout>
      <div className="w-full max-w-7xl mx-auto space-y-8 p-4 sm:p-6 pb-20">
        
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-6 sm:p-10 border"
          style={{
            background: `linear-gradient(135deg, ${tierStyle.bg}, rgba(255,255,255,0.02))`,
            borderColor: `${tierStyle.border}40`,
          }}
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
            {/* Big badge */}
            <div className="flex-shrink-0">
              {currentLevel ? (
                <VipBadge tier={currentLevel.tier} rank={currentLevel.rank} size="lg" />
              ) : (
                <div className="px-6 py-4 rounded-xl border-2 border-white/10 bg-white/5 text-slate-400 font-extrabold tracking-wider">
                  NON-VIP
                </div>
              )}
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
                Current Rank
              </div>
              <h1 
                className="text-4xl sm:text-5xl font-black mb-2 leading-tight"
                style={{ 
                  background: currentLevel ? tierStyle.gradient : '#e2e8f0', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent' 
                }}
              >
                {currentLevel ? getLevelLabel(currentLevel) : 'Non-VIP'}
              </h1>
              <div className="flex flex-col gap-2">
                <span className="text-slate-400 text-sm font-semibold inline-flex items-center gap-1.5 bg-white/[0.03] w-fit px-3 py-1.5 rounded-lg border border-white/5 shadow-inner">
                  Total earned: <CoinDisplay amount={totalEarned || 0} size={16} />
                </span>
            </div>
            </div>

            {/* Stats */}
            <div className="flex-shrink-0 bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 text-center min-w-[120px]">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Rank Level</div>
              <div className="text-3xl font-black text-slate-100">
                {rankLevelDisplay}
                <span className="text-sm text-slate-500 font-bold">/{totalRanks}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {nextLevel && (
            <div className="mt-10 relative z-10">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-slate-400">
                  Progress to <strong className="text-slate-200">{getLevelLabel(nextLevel)}</strong>
                </span>
                <span className="text-sm font-bold" style={{ color: tierStyle.text }}>
                  {progressPct}%
                </span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: tierStyle.gradient, boxShadow: `0 0 10px ${tierStyle.glow}80` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
                <span className="flex items-center gap-1.5">
                  <FiTrendingUp className="text-slate-500" />
                  <CoinDisplay amount={coinsToNext} size={12} /> more coins needed
                </span>
                {nextLevel.rewardAmount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-600">—</span> 
                    Unlock <span className="font-bold ml-1" style={{ color: tierStyle.text }}><CoinDisplay amount={nextLevel.rewardAmount} size={12} /></span> bonus
                  </span>
                )}
              </div>
            </div>
          )}

          {!nextLevel && (
            <div className="mt-8 flex items-center gap-2 text-sm font-bold" style={{ color: tierStyle.text }}>
              <FiStar /> Maximum rank achieved — Opal VIP!
            </div>
          )}
        </motion.div>

        {/* Level Grid by Tier */}
        <div className="space-y-12">
          {tiers.map(tierName => {
            const tierLevels = levels.filter(l => l.tier === tierName);
            if (tierLevels.length === 0) return null;
            const ts = TIER_STYLES[tierName];
            
            return (
              <div key={tierName} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                  <VipBadge tier={tierName} rank={tierLevels[0]?.rank || ''} size="xs" />
                  <h2 className="text-lg font-bold text-slate-300 uppercase tracking-wider">{tierName} Tier</h2>
                </div>

                <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
                  {tierLevels.map((lvl, i) => {
                    const isCurrent = lvl.key === currentLevel?.key;
                    
                    return (
                      <motion.div
                        key={lvl.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="relative w-full sm:w-[280px] md:w-[300px] rounded-xl p-5 transition-all duration-200 flex flex-col"
                        style={{
                          background: lvl.reached ? `${ts.bg}` : 'rgba(30, 41, 59, 0.4)',
                          border: isCurrent
                            ? `1.5px solid ${ts.border}`
                            : lvl.reached
                              ? `1px solid ${ts.border}40`
                              : '1px solid rgba(51, 65, 85, 0.4)',
                          boxShadow: isCurrent ? `0 0 15px ${ts.glow}40` : 'none',
                        }}
                      >
                        {isCurrent && (
                          <div 
                            className="absolute -top-px right-4 px-3 py-1 rounded-b-md text-[0.65rem] font-bold tracking-widest uppercase shadow-sm"
                            style={{ background: ts.gradient, color: ts.text }}
                          >
                            Current
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            {lvl.reached
                              ? <VipBadge tier={lvl.tier} rank={lvl.rank} size="xs" />
                              : <FiLock className="w-4 h-4 text-slate-500" />
                            }
                            <span className={`font-bold ${lvl.reached ? 'text-slate-200' : 'text-slate-500'}`}>
                              {getLevelLabel(lvl)}
                            </span>
                          </div>
                          {lvl.claimed && (
                            <FiCheckCircle className="w-4 h-4" style={{ color: ts.border }} />
                          )}
                        </div>

                        <div className={`text-xs font-medium mb-3 flex-grow ${lvl.reached ? 'text-slate-400' : 'text-slate-600'}`}>
                          {lvl.threshold === 0 ? 'Starting rank' : <span className="flex items-center gap-1">Requires <CoinDisplay amount={lvl.threshold} size={12} /></span>}
                        </div>

                        {lvl.rewardAmount > 0 && (
                          <div className="flex items-center justify-between pt-3 border-t border-slate-700/30 mt-auto">
                            <div className="flex items-center gap-1.5 font-bold" style={{ color: ts.text }}>
                              <CoinDisplay amount={lvl.rewardAmount} size={12} />
                            </div>

                            {lvl.claimable && (
                              <button
                                onClick={() => handleClaim(lvl.key)}
                                disabled={claiming === lvl.key}
                                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                style={{
                                  background: ts.gradient,
                                  color: ts.text,
                                  boxShadow: `0 0 10px ${ts.glow}60`,
                                }}
                              >
                                {claiming === lvl.key ? '...' : 'Claim'}
                              </button>
                            )}

                            {lvl.claimed && (
                              <span className="text-xs font-medium italic text-slate-500">Claimed</span>
                            )}
                            {!lvl.reached && (
                              <span className="text-xs font-medium text-slate-600">Locked</span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VipPage;
