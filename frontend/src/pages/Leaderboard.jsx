import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiLock, FiClock } from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';
import PublicProfileModal from '../components/PublicProfileModal';
import CoinDisplay from '../components/CoinDisplay';
import CoinIcon from '../components/CoinIcon';
import FitText from '../components/FitText';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const PERIOD_META = {
  daily: { label: 'Daily' },
  weekly: { label: 'Weekly' },
  monthly: { label: 'Monthly' },
};

const LaurelLeft = () => <img src="/coins/leaf.png" alt="" className="w-[50px] h-[60px] md:w-[113px] md:h-[136px] object-contain" />;
const LaurelRight = () => <img src="/coins/leaf.png" alt="" className="w-[50px] h-[60px] md:w-[113px] md:h-[136px] object-contain scale-x-[-1]" />;

/* ── Podium Card ─────────────────────────────────────────────── */
const PodiumCard = ({ rank, user, prize, onClick, className = '' }) => {
  if (!user) return <div className={`w-full max-w-[280px] hidden md:block opacity-0 pointer-events-none ${className}`} />;

  const styles = {
    1: {
      container: 'mt-0 z-10 w-[260px] md:max-w-none md:w-[390px] h-[260px] md:h-[320px] justify-end',
      crown: 'w-[54px] h-[54px] md:w-[54px] md:h-[54px] -top-[45px] md:-top-[45px]',
      ring: 'p-[4px] bg-gradient-to-b from-[#FEDF77] to-[#FCB91E]',
      bg: "bg-[url('/coins/platform.png')] bg-[length:100%_100%] bg-center bg-no-repeat",
      clip: 'none',
      paddingTop: 'pt-10 md:pt-16',
      avatarSize: 'w-[96px] h-[96px] md:w-[112px] md:h-[112px]',
      height: 'h-[140px] md:h-[172px]',
      avatarShadow: 'shadow-[0px_9px_0px_0px_rgba(147,121,10,1)]',
      avatarPosition: 'bottom-[130px] md:bottom-[163px]',
      layoutWrapper: 'flex-col md:flex-row justify-center md:justify-between w-full max-w-full md:max-w-[340px] h-auto md:min-h-[32px] mx-auto mb-1 md:mb-3 items-center md:items-start gap-0.5 md:gap-0',
      nameStyle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, lineHeight: '1.2' },
      nameClass: 'text-white max-w-full md:max-w-[240px] text-center md:text-left leading-[1.1] md:leading-[1.2] text-[24px] md:text-[32px] break-words line-clamp-2',
      rankColorClass: 'text-transparent bg-clip-text bg-gradient-to-b from-[#FEDF77] to-[#FCB91E]',
      scoreClass: 'flex items-center justify-center md:justify-end gap-[4px] md:gap-[8px] w-full md:w-auto',
      scoreStyle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, lineHeight: '1.3' },
      scoreTextClass: 'text-[22px] md:text-[32px] text-transparent bg-clip-text bg-gradient-to-b from-[#FEDF77] to-[#FCB91E]',
      prizeBg: 'bg-[#FFD80C]/[0.13]',
    },
    2: {
      container: 'mt-0 md:mt-[67px] z-0 w-[240px] md:max-w-none md:w-[369px] h-[240px] md:h-[303px] justify-end',
      crown: 'w-[48px] h-[48px] md:w-[54px] md:h-[54px] -top-[35px] md:-top-[45px]',
      crownColor: 'rgba(217, 217, 217, 1)',
      ring: 'p-[4px] bg-gradient-to-b from-[#D9D9D9] to-[#828282]',
      bg: "bg-[url('/coins/platform.png')] bg-[length:100%_100%] bg-center bg-no-repeat",
      clip: 'none',
      paddingTop: 'pt-10 md:pt-16',
      avatarSize: 'w-[80px] h-[80px] md:w-[106px] md:h-[106px]',
      height: 'h-[130px] md:h-[163px]',
      avatarShadow: 'shadow-[0px_9px_0px_0px_rgba(73,73,73,1)]',
      avatarPosition: 'bottom-[120px] md:bottom-[154px]',
      layoutWrapper: 'flex-col md:flex-row justify-center md:justify-between w-full max-w-full md:max-w-[320px] h-auto md:h-[32px] mx-auto mb-1 md:mb-3 items-center gap-0.5 md:gap-0',
      nameStyle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, lineHeight: '1.2' },
      nameClass: 'text-white md:truncate max-w-full md:max-w-[120px] text-center md:text-left leading-[1.1] md:leading-[1.2] text-[20px] md:text-[32px] break-words line-clamp-2 md:line-clamp-none',
      rankColorClass: 'text-transparent bg-clip-text bg-gradient-to-b from-[#D9D9D9] to-[#828282]',
      scoreClass: 'flex items-center justify-center md:justify-end gap-[4px] md:gap-[8px] w-full md:w-auto',
      scoreStyle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, lineHeight: '1.3' },
      scoreTextClass: 'text-[18px] md:text-[32px] text-transparent bg-clip-text bg-gradient-to-b from-[#D9D9D9] to-[#828282]', // actually prize is fixed to gold, but user coins are gold too. original used global styles
      prizeBg: 'bg-white/[0.13]',
    },
    3: {
      container: 'mt-0 md:mt-[67px] z-0 w-[240px] md:max-w-none md:w-[369px] h-[240px] md:h-[303px] justify-end',
      crown: 'w-[48px] h-[48px] md:w-[54px] md:h-[54px] -top-[35px] md:-top-[45px]',
      crownColor: 'rgba(174, 90, 16, 1)',
      ring: 'p-[4px] bg-gradient-to-b from-[#C08965] to-[#AE580E]',
      bg: "bg-[url('/coins/platform.png')] bg-[length:100%_100%] bg-center bg-no-repeat",
      clip: 'none',
      paddingTop: 'pt-10 md:pt-16',
      avatarSize: 'w-[80px] h-[80px] md:w-[106px] md:h-[106px]',
      height: 'h-[130px] md:h-[163px]',
      avatarShadow: 'shadow-[0px_9px_0px_0px_rgba(121,63,23,1)]',
      avatarPosition: 'bottom-[120px] md:bottom-[154px]',
      layoutWrapper: 'flex-col md:flex-row justify-center md:justify-between w-full max-w-full md:max-w-[320px] h-auto md:min-h-[32px] mx-auto mb-1 md:mb-3 items-center md:items-start gap-0.5 md:gap-0',
      nameStyle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, lineHeight: '1.2' },
      nameClass: 'text-white max-w-full md:max-w-[240px] text-center md:text-left leading-[1.1] md:leading-[1.2] text-[20px] md:text-[32px] break-words line-clamp-2',
      rankColorClass: 'text-transparent bg-clip-text bg-gradient-to-b from-[#C08965] to-[#AE580E]',
      scoreClass: 'flex items-center justify-center md:justify-end gap-[4px] md:gap-[8px] w-full md:w-auto',
      scoreStyle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, lineHeight: '1.3' },
      scoreTextClass: 'text-[18px] md:text-[32px] text-transparent bg-clip-text bg-gradient-to-b from-[#C08965] to-[#AE580E]',
      prizeBg: 'bg-[#FF8C00]/[0.15]',
    }
  }[rank];

  return (
    <div className={`relative flex flex-col items-center ${styles.container} ${className}`}>
      {/* Avatar Wrapper */}
      <div className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-20 ${styles.avatarPosition}`}>
        {rank === 1 ? (
          <img src="/coins/crown.png" alt="1st Place Crown" className={`absolute z-30 object-contain drop-shadow-md ${styles.crown}`} />
        ) : (
          <div className={`absolute z-30 ${styles.crown} drop-shadow-md`}>
            <img src="/coins/crown.png" alt="Crown" className="absolute inset-0 w-full h-full object-contain" />
            <div
              className="absolute inset-0 w-full h-full"
              style={{
                backgroundColor: styles.crownColor,
                mixBlendMode: 'color',
                WebkitMaskImage: `url('/coins/crown.png')`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: `url('/coins/crown.png')`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
              }}
            />
          </div>
        )}
        <div className={`${styles.avatarSize} rounded-[20px] ${styles.ring} ${styles.avatarShadow} bg-transparent flex items-center justify-center`}>
          <img src={user.avatarUrl || user.avatar || '/avatars/avatar1.png'} className="w-full h-full object-cover rounded-[16px]" alt={user.displayName} />
        </div>
      </div>

      {/* Podium Block */}
      <div
        onClick={() => onClick(user.userId)}
        className={`w-full ${styles.bg} ${styles.height || ''} ${rank !== 1 ? 'rounded-b-2xl shadow-2xl pb-4' : 'pb-3 md:pb-5'} cursor-pointer hover:brightness-110 transition-all flex flex-col px-3 md:px-5 ${
          prize > 0 ? `${styles.paddingTop} justify-start ${rank === 1 ? 'md:justify-end' : ''}` : 'justify-center pt-[30px] md:pt-[40px]'
        }`}
        style={styles.clip !== 'none' ? { clipPath: styles.clip } : {}}
      >
        <div className={`flex ${styles.layoutWrapper}`}>
          <div className={styles.nameClass} style={styles.nameStyle}>
            <span className={styles.rankColorClass}>#{rank}</span> {user.displayName}
          </div>
          <div className={styles.scoreClass}>
            <img src="/coins/Coin.png" alt="Coin" className="w-[20px] h-[20px] md:w-[32px] md:h-[32px] object-contain" />
            <span className={styles.scoreTextClass} style={styles.scoreStyle}>
              {user.coinsEarned?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        {prize > 0 && (
          <div className={`w-full max-w-[340px] h-[40px] md:h-[52px] ${styles.prizeBg} rounded-[6px] md:rounded-[10px] flex justify-between items-center px-[10px] md:px-[20px] py-[6px] md:py-[10px] mx-auto mt-2 md:mt-0`}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, lineHeight: '1.2' }} className="text-white text-center text-[16px] md:text-[15.15px]">REWARD</span>
            <div className="flex items-center gap-[4px] md:gap-[8px]">
              <img src="/coins/Coin.png" alt="Coin" className="w-[20px] h-[20px] md:w-[32px] md:h-[32px] object-contain" />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#FEDF77] to-[#FCB91E] text-[20px] md:text-[32px]" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, lineHeight: '1.3' }}>
                {prize.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Countdown ───────────────────────────────────────────────── */
const LeaderboardCountdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) return;
    const calc = () => {
      const dist = new Date(targetDate).getTime() - Date.now();
      if (dist <= 0) { setTimeLeft('0d 00h 00m 00s'); return; }
      const d = Math.floor(dist / 86400000);
      const h = Math.floor((dist % 86400000) / 3600000);
      const m = Math.floor((dist % 3600000) / 60000);
      const s = Math.floor((dist % 60000) / 1000);
      setTimeLeft(`${String(d).padStart(2, '0')}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!timeLeft) return null;
  return (
    <div className="flex items-center justify-center gap-[6px] px-[16px] md:px-[20px] py-[8px] md:py-[12px] bg-[#49B265]/[0.23] rounded-[100px] mx-auto mb-6 md:mb-8 w-auto min-w-[200px] md:min-w-[246px] h-[36px] md:h-[48px]">
      <img src="/coins/clock.png" alt="Clock" className="w-[18px] h-[18px] md:w-[24px] md:h-[24px] object-contain shrink-0" />
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }} className="text-[16px] md:text-[20px] leading-[24px] md:leading-[32px] text-white whitespace-nowrap text-center">
        Reset in {timeLeft}
      </span>
    </div>
  );
};

/* ── Period Panel ────────────────────────────────────────────── */
const PeriodPanel = ({ data, periodName, onProfileClick }) => {
  const { currentUser } = useAuth();
  const rankings = data?.rankings || [];
  const rewardTiers = data?.rewardTiers || [];
  const rewardedRanks = data?.rewardedRanks || 0;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const top3 = [rankings[1], rankings[0], rankings[2]]; // 2nd, 1st, 3rd display order
  const others = rankings.slice(3);

  const getPrize = (rank) => {
    if (rank > rewardedRanks) return 0;
    return rewardTiers[rank - 1] || 0;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResult(null);
      setSearchError('');
      return;
    }
    setIsSearching(true);
    setSearchError('');
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/leaderboard/search?q=${encodeURIComponent(searchQuery)}&period=${periodName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setSearchResult(data.user);
      } else {
        setSearchResult(null);
        setSearchError('User not found');
      }
    } catch (err) {
      setSearchError('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const renderCurrentUserRow = () => (
    <motion.div
      variants={item}
      key={data.currentUser.userId}
      onClick={() => onProfileClick(data.currentUser.userId)}
      className="grid grid-cols-[40px_1fr_60px_60px] md:grid-cols-[74px_521px_1fr_1fr] gap-[6px] md:gap-[50px] items-center w-full min-h-[50px] md:h-[119px] bg-[#1a1a1a] rounded-[10px] md:rounded-[20px] py-[10px] md:py-0 px-[10px] md:pl-[40px] md:pr-[10px] md:pr-[95px] cursor-pointer hover:brightness-110 transition-all"
    >
      <div className="text-white text-[20px] md:text-[32px] text-center md:text-left" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, lineHeight: '1.2' }}>
        {/* No rank text */}
      </div>
      <div className="flex items-center gap-[8px] md:gap-[16px] overflow-hidden min-w-0">
        <div className="w-[36px] h-[36px] md:w-[60px] md:h-[60px] rounded-[8px] md:rounded-[10px] overflow-hidden bg-transparent shrink-0">
          <img src={data.currentUser.avatarUrl || data.currentUser.avatar || '/avatars/avatar1.png'} className="w-full h-full object-cover" alt={data.currentUser.displayName} />
        </div>
        <div className="text-white text-[18px] md:text-[32px] min-w-0 flex-1 flex" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, lineHeight: '1.2' }}>
          <FitText>{data.currentUser.displayName} <span className="text-[14px] md:text-base text-white/50 ml-1">(You)</span></FitText>
        </div>
      </div>
      <div className="flex items-center gap-[4px] md:gap-[8px]">
        <img src="/coins/Coin.png" alt="Coin" className="w-[16px] h-[16px] md:w-[32px] md:h-[32px] object-contain shrink-0" />
        <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#FEDF77] to-[#FCB91E] text-[16px] md:text-[32px] truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, lineHeight: '1.3' }}>
          {data.currentUser.coinsEarned?.toLocaleString() || 0}
        </span>
      </div>
      <div className="flex items-center gap-[4px] md:gap-[8px]">
        <span className="text-slate-600 text-[16px] md:text-sm">—</span>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col items-center w-full mt-4 md:mt-8">
      {/* Podium */}
      <div className="flex flex-col md:flex-row items-center md:items-start justify-center w-full gap-2 md:gap-4 mb-4 md:mb-0">
        <PodiumCard rank={2} user={top3[0]} prize={getPrize(2)} onClick={onProfileClick} className="order-2 md:order-1" />
        <PodiumCard rank={1} user={top3[1]} prize={getPrize(1)} onClick={onProfileClick} className="order-1 md:order-2" />
        <PodiumCard rank={3} user={top3[2]} prize={getPrize(3)} onClick={onProfileClick} className="order-3 md:order-3" />
      </div>

      {data?.cycleEnd && <LeaderboardCountdown targetDate={data.cycleEnd} />}

      {/* List rows 4+ */}
      <div className="w-full max-w-[1240px] mx-auto bg-[#242424] rounded-[16px] md:rounded-[30px] p-[10px] md:p-[30px] shadow-2xl mt-4 flex flex-col gap-[10px]">

        <div
          className="grid grid-cols-[40px_1fr_60px_60px] md:grid-cols-[74px_521px_1fr_1fr] gap-[6px] md:gap-[50px] w-full h-auto md:h-[62px] pt-[10px] pb-[10px] md:pb-[30px] pl-[10px] md:pl-[40px] pr-[10px] md:pr-[95px] rounded-[10px] md:rounded-[20px] text-white/40 text-[16px] md:text-[32px]"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, lineHeight: '1.2' }}
        >
          <div className="text-center md:text-left">Rank</div>
          <div>User</div>
          <div>Earning</div>
          <div>Prize</div>
        </div>

        {!others.length && rankings.length <= 3 && (
          <div className="text-center py-8 text-slate-500 text-sm">No other users on the leaderboard yet.</div>
        )}

        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-[10px]">
          {others.map((user, idx) => {
            const currentRank = idx + 4;
            const prize = getPrize(currentRank);
            return (
              <React.Fragment key={user.userId || idx}>
                <motion.div
                  variants={item}
                  onClick={() => onProfileClick(user.userId)}
                  className="grid grid-cols-[40px_1fr_60px_60px] md:grid-cols-[74px_521px_1fr_1fr] gap-[6px] md:gap-[50px] items-center w-full min-h-[50px] md:h-[119px] bg-[#171717] rounded-[10px] md:rounded-[20px] py-[10px] md:py-0 px-[10px] md:pl-[40px] md:pr-[10px] md:pr-[95px] cursor-pointer hover:brightness-110 transition-all"
                >
                  <div
                    className="text-white text-[20px] md:text-[32px] text-center md:text-left"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, lineHeight: '1.2' }}
                  >
                    #{currentRank}
                  </div>
                  <div className="flex items-center gap-[8px] md:gap-[16px] overflow-hidden min-w-0">
                    <div className="w-[36px] h-[36px] md:w-[60px] md:h-[60px] rounded-[8px] md:rounded-[10px] overflow-hidden bg-transparent shrink-0">
                      <img src={user.avatarUrl || user.avatar || '/avatars/avatar1.png'} className="w-full h-full object-cover" alt={user.displayName} />
                    </div>
                    <div
                      className="text-white text-[18px] md:text-[32px] min-w-0 flex-1 flex"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, lineHeight: '1.2' }}
                    >
                      <FitText>{user.displayName}</FitText>
                    </div>
                  </div>
                  <div className="flex items-center gap-[4px] md:gap-[8px]">
                    <img src="/coins/Coin.png" alt="Coin" className="w-[16px] h-[16px] md:w-[32px] md:h-[32px] object-contain shrink-0" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#FEDF77] to-[#FCB91E] text-[16px] md:text-[32px] truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, lineHeight: '1.3' }}>
                      {user.coinsEarned?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-[4px] md:gap-[8px]">
                    {prize > 0 ? (
                      <>
                        <img src="/coins/Coin.png" alt="Coin" className="w-[16px] h-[16px] md:w-[32px] md:h-[32px] object-contain shrink-0" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#FEDF77] to-[#FCB91E] text-[16px] md:text-[32px] truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, lineHeight: '1.3' }}>
                          {prize.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-600 text-[16px] md:text-sm">—</span>
                    )}
                  </div>
                </motion.div>

                {/* Current User extra row inserted after #5 (which is idx === 1) */}
                {idx === 1 && data?.currentUser && !rankings.some(r => String(r.userId) === String(data.currentUser.userId)) && renderCurrentUserRow()}
              </React.Fragment>
            );
          })}
          
          {/* Current User extra row at bottom if they aren't in the list AND there were less than 2 others */}
          {others.length < 2 && data?.currentUser && !rankings.some(r => String(r.userId) === String(data.currentUser.userId)) && renderCurrentUserRow()}
        </motion.div>
      </div>
    </div>
  );
};

/* ── Page ────────────────────────────────────────────────────── */
const Leaderboard = () => {
  const { currentUser } = useAuth();
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/leaderboard`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
        const first = ['daily', 'weekly', 'monthly'].find(p => data.leaderboard[p]?.enabled);
        if (first) setActiveTab(p => p || first);
      }
    } catch (err) {
      console.error('Leaderboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

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

        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-center gap-1 md:gap-2 mt-2 md:mt-8 mb-4 md:mb-8">
          <LaurelLeft />
          <div className="flex flex-col items-center text-center gap-[2px] md:gap-[6px]">
            <h1
              className="text-white text-center font-bold text-[36px] md:text-[68px]"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", lineHeight: '120%' }}
            >
              Leaderboard
            </h1>
            <p
              className="text-[#888888] font-medium text-[12px] whitespace-nowrap md:whitespace-normal md:text-[26px]"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", lineHeight: '130%' }}
            >
              Top users ranked by earnings — win prizes every cycle!
            </p>
          </div>
          <LaurelRight />
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
            {/* Period tabs */}
            <motion.div variants={item} className="flex justify-center mb-6">
              <div className="w-[90%] max-w-[355px] h-auto md:h-[84px] bg-[#2C2D2C] backdrop-blur-[24px] shadow-[0_4px_44px_rgba(0,0,0,0.25)] rounded-[10px] p-2 md:p-[18px] flex">
                <div className="w-full flex gap-1 md:gap-2 justify-center">
                  {enabledPeriods.map(period => {
                    const isActive = activeTab === period;
                    return (
                      <button
                        key={period}
                        onClick={() => setActiveTab(period)}
                        className={`flex-1 h-[40px] md:h-[48px] flex items-center justify-center rounded-[8px] md:rounded-[10px] py-[6px] md:py-[10px] px-[10px] md:px-[20px] transition-all duration-200 ${isActive
                          ? 'bg-[#49B265] text-white shadow-[0px_2px_0px_0px_rgba(39,109,58,1)] md:shadow-[0px_4px_0px_0px_rgba(39,109,58,1)]'
                          : 'text-[#888888] hover:text-white'
                          }`}
                      >
                        <span className="text-[14px] md:text-[20px]" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, lineHeight: '32px' }}>
                          {PERIOD_META[period].label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Content */}
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
                    data={leaderboard[activeTab]}
                    onProfileClick={(uid) => setActiveProfileId(uid)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {activeProfileId && (
          <PublicProfileModal userId={activeProfileId} onClose={() => setActiveProfileId(null)} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Leaderboard;
