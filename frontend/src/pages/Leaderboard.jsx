import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiLock, FiClock } from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';
import PublicProfileModal from '../components/PublicProfileModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const PERIOD_META = {
  daily: { label: 'Daily' },
  weekly: { label: 'Weekly' },
  monthly: { label: 'Monthly' },
};

// Custom wheat image for the title
const LaurelLeft = () => (
  <img src="/wheat.png" alt="Wheat" className="w-8 h-10 md:w-12 md:h-14 object-contain filter brightness-0 invert drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] scale-x-[-1]" />
);

const LaurelRight = () => (
  <img src="/wheat.png" alt="Wheat" className="w-8 h-10 md:w-12 md:h-14 object-contain filter brightness-0 invert drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
);

const PodiumCard = ({ rank, user, onClick }) => {
  if (!user) return <div className="w-full max-w-[320px] hidden md:block opacity-0 pointer-events-none" />; 
  
  const isGold = rank === 1;
  
  const colors = {
    1: 'from-amber-500/10 to-[#0f172a]/80 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]',
    2: 'from-indigo-400/10 to-[#0f172a]/80 border-indigo-400/30 shadow-[0_0_20px_rgba(129,140,248,0.05)]',
    3: 'from-orange-500/10 to-[#0f172a]/80 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.05)]'
  };

  const badgeColors = {
    1: 'bg-amber-500 text-amber-900',
    2: 'bg-slate-300 text-slate-800',
    3: 'bg-orange-500 text-orange-950'
  };

  const textColors = {
    1: 'text-white',
    2: 'text-white',
    3: 'text-white'
  };

  return (
    <div 
      onClick={() => onClick(user.userId)}
      className={`relative flex flex-col items-center bg-gradient-to-b ${colors[rank]} border bg-[#0b101e] rounded-2xl p-5 md:p-6 w-full max-w-[240px] lg:max-w-[280px] cursor-pointer hover:-translate-y-2 transition-all duration-300 ${isGold ? 'scale-110 z-10 mx-2 md:mx-6' : 'z-0 mt-4 md:mt-8'}`}
    >
      {/* Rank Badge */}
      <div 
        className={`absolute -left-3 -top-3 w-10 h-10 ${badgeColors[rank]} flex items-center justify-center font-black text-lg shadow-lg`} 
        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', zIndex: 20 }}
      >
        {rank}
      </div>

      {isGold && (
        <div className="absolute -top-10 text-amber-400 text-5xl drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] z-20">
          <FaCrown />
        </div>
      )}

      {/* Avatar */}
      <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-[3px] border-solid ${rank === 1 ? 'border-amber-400' : rank === 2 ? 'border-slate-300' : 'border-orange-500'} overflow-hidden mb-4 shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
        <img src={user.avatarUrl || user.avatar || `/avatars/avatar1.png`} className="w-full h-full object-cover bg-slate-800" />
      </div>

      <div className="font-bold text-white text-base md:text-lg mb-1 truncate w-full text-center">{user.displayName}</div>
      <div className={`flex flex-col items-center justify-center font-black text-2xl md:text-3xl ${textColors[rank]} leading-none mt-1`}>
        {(user.coinsEarned || 0).toLocaleString()}
        <span className="text-[10px] md:text-xs uppercase tracking-widest text-slate-400 font-bold mt-2">Coins</span>
      </div>
    </div>
  );
};

const LeaderboardCountdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) return;
    
    const calculateTimeLeft = () => {
      const distance = new Date(targetDate).getTime() - Date.now();
      if (distance <= 0) {
        setTimeLeft('0d 00h 00m 00s');
        return;
      }
      
      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeft(`${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-300 font-mono text-sm md:text-base font-bold shadow-[0_0_15px_rgba(99,102,241,0.1)] mb-8">
      <FiClock className="text-indigo-400 text-lg" />
      <span>Resets in: {timeLeft}</span>
    </div>
  );
};

const PeriodPanel = ({ period, data, onProfileClick }) => {
  const rankings = data?.rankings || [];
  
  const top3 = [rankings[1], rankings[0], rankings[2]]; // Order: 2nd, 1st, 3rd
  const others = rankings.slice(3);

  return (
    <div className="flex flex-col items-center w-full">
      
      {/* Countdown Timer */}
      {data?.cycleEnd && <LeaderboardCountdown targetDate={data.cycleEnd} />}
      
      {/* Podium Section */}
      <div className="flex flex-row items-end justify-center w-full gap-2 md:gap-4 mb-20 pt-4">
        <PodiumCard rank={2} user={top3[0]} onClick={onProfileClick} />
        <PodiumCard rank={1} user={top3[1]} onClick={onProfileClick} />
        <PodiumCard rank={3} user={top3[2]} onClick={onProfileClick} />
      </div>

      {/* List Section */}
      <div className="w-full bg-[#0b101e] border border-white/5 rounded-2xl p-4 md:p-8 shadow-2xl">
        <div className="grid grid-cols-[60px_1fr_100px] md:grid-cols-[100px_1fr_160px] text-[12px] md:text-sm font-bold text-slate-500 mb-4 pb-4 border-b border-white/5 uppercase tracking-wider">
          <div className="text-center md:text-left pl-0 md:pl-6">RANK</div>
          <div>USER</div>
          <div className="text-right pr-2 md:pr-6">EARNINGS</div>
        </div>

        {!others.length && rankings.length <= 3 && (
           <div className="text-center py-8 text-slate-500 text-sm">
             No other users on the leaderboard yet.
           </div>
        )}

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-1">
          {others.map((user, idx) => {
            const currentRank = idx + 4;
            return (
              <motion.div 
                variants={item}
                key={user.userId || idx} 
                onClick={() => onProfileClick(user.userId)}
                className="grid grid-cols-[60px_1fr_100px] md:grid-cols-[100px_1fr_160px] items-center py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] rounded-xl px-2 md:px-4 -mx-2 md:-mx-4 transition-colors cursor-pointer group"
              >
                <div className="font-bold text-slate-300 text-base md:text-xl text-center md:text-left pl-0 md:pl-6 group-hover:text-white transition-colors">{currentRank}</div>
                <div className="flex items-center gap-3 md:gap-5 overflow-hidden">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-full overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                     <img src={user.avatarUrl || user.avatar || `/avatars/avatar1.png`} className="w-full h-full object-cover" />
                  </div>
                  <div className="font-bold text-slate-200 text-sm md:text-lg truncate">{user.displayName}</div>
                </div>
                <div className="flex flex-col items-end justify-center font-bold text-emerald-400 text-sm md:text-xl pr-2 md:pr-6 tracking-wide leading-none">
                  {(user.coinsEarned || 0).toLocaleString()}
                  <span className="text-[9px] md:text-[11px] uppercase tracking-widest text-slate-500 font-bold mt-1.5">Coins</span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

    </div>
  );
};

const Leaderboard = () => {
  const { currentUser } = useAuth();
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
        const first = ['daily', 'weekly', 'monthly'].find(p => data.leaderboard[p]?.enabled);
        if (first && !activeTab) setActiveTab(p => p || first);
      }
    } catch (err) {
      console.error('Leaderboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    fetchLeaderboard();
    const id = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(id);
  }, [fetchLeaderboard]);

  const enabledPeriods = leaderboard
    ? ['daily', 'weekly', 'monthly'].filter(p => leaderboard[p]?.enabled)
    : [];

  return (
    <DashboardLayout fullWidth={true}>
      <motion.div variants={container} initial="hidden" animate="show" className="pb-16 px-4 md:px-8 max-w-[1600px] w-full mx-auto">

        {/* Page Header */}
        <motion.div variants={item} className="flex flex-col items-center text-center mt-8 mb-10">
          <div className="flex items-center justify-center gap-4 mb-2">
            <LaurelLeft />
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight font-display">Leaderboard</h1>
            <LaurelRight />
          </div>
          <p className="text-slate-400 font-medium mt-1">Top users ranked by earnings</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : enabledPeriods.length === 0 ? (
          <motion.div variants={item} className="text-center py-20 bg-white/[0.02] border border-white/[0.05] rounded-2xl max-w-2xl mx-auto">
            <FiLock className="text-5xl text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-300 mb-2">Leaderboard Coming Soon</h2>
            <p className="text-slate-500 max-w-md mx-auto">The leaderboard is currently inactive. Check back later!</p>
          </motion.div>
        ) : (
          <>
            {/* Period Toggles */}
            <motion.div variants={item} className="flex justify-center mb-10">
              <div className="flex p-1.5 bg-transparent border border-white/10 rounded-xl gap-2">
                {enabledPeriods.map(period => {
                  const isActive = activeTab === period;
                  const meta = PERIOD_META[period];
                  return (
                    <button
                      key={period}
                      onClick={() => setActiveTab(period)}
                      className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${
                        isActive 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <FiCalendar className={isActive ? 'text-white' : 'text-slate-400'} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Active Period Content */}
            <AnimatePresence mode="wait">
              {activeTab && leaderboard[activeTab]?.enabled && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <PeriodPanel
                    period={activeTab}
                    data={leaderboard[activeTab]}
                    onProfileClick={(uid) => setActiveProfileId(uid)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      {/* Public Profile Modal */}
      <AnimatePresence>
        {activeProfileId && (
          <PublicProfileModal
            userId={activeProfileId}
            onClose={() => setActiveProfileId(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Leaderboard;
