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

const TIER_METADATA = {
  Bronze: { subtext: 'Starter Level', label: 'BRONZE', badgeClass: 'text-[#d97706] border-[#d97706]/30 bg-[#d97706]/10' },
  Silver: { subtext: 'Keep Growing', label: 'SILVER', badgeClass: 'text-[#94a3b8] border-[#94a3b8]/30 bg-[#94a3b8]/10' },
  Gold: { subtext: 'Getting Serious', label: 'GOLD', badgeClass: 'text-[#fbbf24] border-[#fbbf24]/30 bg-[#fbbf24]/10' },
  Platinum: { subtext: 'Almost There', label: 'PLATINUM', badgeClass: 'text-[#22d3ee] border-[#22d3ee]/30 bg-[#22d3ee]/10' },
  Diamond: { subtext: 'Elite Level', label: 'DIAMOND', badgeClass: 'text-[#818cf8] border-[#818cf8]/30 bg-[#818cf8]/10' },
  Opal: { subtext: 'The Highest', label: 'OPAL', badgeClass: 'text-[#a78bfa] border-[#a78bfa]/30 bg-[#a78bfa]/10' }
};

const TIER_COLORS = {
  Bronze: {
    text: '#FF8C00',
    gradient: 'linear-gradient(180deg, #FF8C00 0%, #90540B 100%)',
    shadow: '0px 3px 0px 0px rgba(87, 54, 13, 1)'
  },
  Silver: {
    text: '#DEDEDE',
    gradient: 'linear-gradient(180deg, #DEDEDE 0%, #8B8B8B 100%)',
    shadow: '0px 3px 0px 0px rgba(94, 94, 94, 1)'
  },
  Gold: {
    text: '#FCB91E',
    gradient: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%), linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1))',
    shadow: '0px 3px 0px 0px rgba(163, 115, 10, 1)'
  },
  Platinum: {
    text: '#1FCBE6',
    gradient: 'linear-gradient(180deg, #1FCBE6 0%, #217681 100%)',
    shadow: '0px 3px 0px 0px rgba(18, 75, 83, 1)'
  },
  Diamond: {
    text: '#7F8AF7',
    gradient: 'linear-gradient(180deg, #7F8AF7 0%, #793EB9 100%)',
    shadow: '0px 3px 0px 0px rgba(77, 33, 130, 1)'
  },
  Opal: {
    text: '#E079DD',
    gradient: 'linear-gradient(180deg, #E079DD 0%, #2757A0 100%)',
    shadow: '0px 3px 0px 0px rgba(29, 61, 112, 1)'
  }
};

const VipShieldIcon = ({ tier, size = 32 }) => {
  const colors = {
    Bronze: { primary: '#FCB91E', secondary: '#b45309', fill: 'url(#bronzeGrad)' },
    Silver: { primary: '#cbd5e1', secondary: '#475569', fill: 'url(#silverGrad)' },
    Gold: { primary: '#FCB91E', secondary: '#d97706', fill: 'url(#goldGrad)' },
    Platinum: { primary: '#22d3ee', secondary: '#0e7490', fill: 'url(#platGrad)' },
    Diamond: { primary: '#818cf8', secondary: '#4f46e5', fill: 'url(#diamGrad)' },
    Opal: { primary: '#a78bfa', secondary: '#7c3aed', fill: 'url(#opalGrad)' },
  };

  const c = colors[tier] || colors.Bronze;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="platGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="diamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="opalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* Outer Shield Outline */}
      <path
        d="M12 2L4 5v6c0 5.25 3.8 10.12 8 12 4.2-1.88 8-6.75 8-12V5l-8-3z"
        fill={c.fill}
        stroke={c.primary}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner Star */}
      <path
        d="M12 7.5l1.15 2.33 2.57.37-1.86 1.81.44 2.56-2.3-1.21-2.3 1.21.44-2.56-1.86-1.81 2.57-.37L12 7.5z"
        fill={c.primary}
        opacity="0.9"
      />
    </svg>
  );
};

const VipPage = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/vip/status`, {
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
      const res = await fetch(`${API}/vip/claim/${levelKey}`, {
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
      <DashboardLayout hideStartEarning={true}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 rounded-full border-2 border-[#49B265] border-t-transparent animate-spin" />
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
    <DashboardLayout hideStartEarning={true}>
      <div className="w-full max-w-[1240px] mx-auto space-y-8 pb-20 pt-4">

        {/* Heading Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative w-[1240px] shrink-0">
          <div className="flex flex-col gap-[6px]">
            <h1 className="m-0 p-0 font-bold text-[68px] leading-[120%] text-white font-['Barlow_Condensed'] whitespace-nowrap">VIP Status</h1>
            <p className="m-0 p-0 font-medium text-[26px] leading-[130%] text-[#888888] font-['Barlow_Condensed']">Higher rewards. Bigger perks. More earning power.</p>
          </div>
          <div className="hidden md:block absolute right-[-3px] -top-[36px] opacity-100 pointer-events-none w-[391px] h-[249px] z-0">
            <img
              src="/coins/vip.png"
              alt="VIP Status"
              className="absolute inset-0 w-full h-full object-contain object-right z-10"
            />
            <div
              className="absolute inset-0 z-20 mix-blend-color"
              style={{
                backgroundColor: 'rgba(73, 178, 101, 1)',
                WebkitMaskImage: 'url(/coins/vip.png)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'right',
                maskImage: 'url(/coins/vip.png)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'right'
              }}
            />
          </div>
        </div>

        {/* Top Status Card */}
        <div className="bg-[#242424] rounded-[20px] px-6 md:px-[40px] py-[30px] border border-[#2A2A2E] flex flex-col md:flex-row items-center justify-between gap-[40px] w-[1240px] md:h-[177px] shrink-0 backdrop-blur-[94px]">

          {/* Left Section: Current Rank */}
          <div className="flex flex-col items-start justify-between min-w-[176px] h-[118px] shrink-0 pr-2">
            <div className="flex flex-col gap-0 w-full">
              <h2 className="text-white text-[22px] font-bold font-['Barlow_Condensed'] leading-[130%] m-0 p-0 w-[105px] h-[29px] whitespace-nowrap">Current rank</h2>
              <div className="flex items-center mt-[8px] w-full h-[42px] overflow-visible">
                <span
                  className="font-bold text-[60px] font-['Barlow_Condensed'] leading-[120%] whitespace-nowrap"
                  style={{
                    backgroundImage: currentLevel ? TIER_STYLES[currentLevel.tier]?.gradient : 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent'
                  }}
                >
                  {currentLevel ? getLevelLabel(currentLevel) : 'Non-VIP'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-[6px] w-[116px] h-[15px] shrink-0 mt-auto">
              <span className="text-white text-[16px] font-medium font-['Barlow_Condensed'] leading-[130%] w-[70px] h-[11px] flex items-center whitespace-nowrap">Total Earned</span>
              <div className="flex items-center gap-[4px] h-[15px]">
                <img src="/coins/coinfix.png" alt="Coin" className="w-[15px] h-[15px] shrink-0 object-contain" />
                <span
                  className="font-bold text-[18px] font-['Barlow_Condensed'] leading-none whitespace-nowrap pt-[2px]"
                  style={{
                    backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent'
                  }}
                >
                  {(totalEarned || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-[1px] h-[117px] bg-white/10 shrink-0" />

          {/* Middle Section: Progress */}
          {nextLevel ? (
            <div className="flex flex-col flex-1 max-w-[704px] h-[84px] gap-[20px] justify-center">
              <div className="flex justify-between items-center w-full">
                <span className="text-white text-[22px] font-medium font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap">
                  Progress to {getLevelLabel(nextLevel)}
                </span>
                <span
                  className="font-bold text-[24px] font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap"
                  style={{
                    backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent'
                  }}
                >
                  {progressPct}%
                </span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-[12px] bg-[#3A3A3A] rounded-[30px] overflow-hidden shrink-0">
                <div
                  className="h-full rounded-[30px] transition-all duration-500 ease-out"
                  style={{
                    width: `${progressPct}%`,
                    background: currentLevel ? TIER_STYLES[currentLevel.tier]?.gradient : 'linear-gradient(90deg, #4ade80, #22c55e)'
                  }}
                />
              </div>

              <div className="flex items-center w-full gap-[6px]">
                <span className="text-[#888888] text-[16px] font-medium font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap">Earn</span>
                <div className="flex items-center gap-[3px]">
                  <img src="/coins/coinfix.png" alt="Coin" className="w-[15px] h-[15px] shrink-0" />
                  <span
                    className="font-bold text-[16px] font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap pt-[1px]"
                    style={{
                      backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent'
                    }}
                  >
                    {coinsToNext.toLocaleString()}
                  </span>
                </div>
                <span className="text-[#888888] text-[16px] font-medium font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap">
                  more coins needed - Unlock
                </span>
                <div className="flex items-center gap-[3px]">
                  <img src="/coins/coinfix.png" alt="Coin" className="w-[15px] h-[15px] shrink-0" />
                  <span
                    className="font-bold text-[16px] font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap pt-[1px]"
                    style={{
                      backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent'
                    }}
                  >
                    {nextLevel.rewardAmount.toLocaleString()}
                  </span>
                </div>
                <span className="text-[#888888] text-[16px] font-medium font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap">
                  bonus
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col w-[704px] h-[84px] justify-center items-center shrink-0">
              <span className="text-white text-[24px] font-bold font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap">
                Maximum rank achieved — Opal VIP!
              </span>
            </div>
          )}

          {/* Vertical Divider */}
          <div className="w-[1px] h-[117px] bg-white/10 shrink-0" />

          {/* Right Section: Rank Level */}
          <div className="flex flex-col items-center justify-between w-[120px] h-[89px] shrink-0">
            <span className="text-[#888888] text-[22px] font-bold font-['Barlow_Condensed'] uppercase leading-[130%] w-[87px] h-[29px] text-center whitespace-nowrap">Rank Level</span>
            <div className="flex items-center justify-center w-[120px] h-[42px] mt-[18px] overflow-visible">
              <span
                className="font-bold text-[60px] font-['Barlow_Condensed'] leading-[120%] whitespace-nowrap"
                style={{
                  backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent'
                }}
              >
                {rankLevelDisplay} / {totalRanks}
              </span>
            </div>
          </div>

        </div>

        {/* Level Grid by Tier */}
        <div className="flex flex-col gap-[20px] w-[1240px]">
          {tiers.map(tierName => {
            const tierLevels = levels.filter(l => l.tier === tierName);
            if (tierLevels.length === 0) return null;
            const meta = TIER_METADATA[tierName];
            const ts = TIER_STYLES[tierName];

            return (
              <div key={tierName} className="bg-[#242424] rounded-[20px] pt-[20px] pr-[20px] pb-[20px] pl-[40px] border border-[#2A2A2E] flex flex-col md:flex-row gap-[30px] items-center w-[1240px] md:h-[181px] shrink-0 backdrop-blur-[94px]">

                {/* Left Tier Sidebar */}
                <div className="flex flex-col items-center justify-between text-center w-[110px] shrink-0 h-[141px]">
                  <img
                    src={`/coins/${tierName === 'Diamond' ? 'dimond' : tierName.toLowerCase()}.png`}
                    alt={`${tierName} Shield`}
                    className="w-[43.32px] h-[48.41px] object-contain shrink-0"
                  />

                  {/* Heading & Below Text Wrapper */}
                  <div className="flex flex-col justify-between items-center w-[91px] h-[36px] overflow-visible">
                    {/* Heading */}
                    <h3 className="text-white text-[22px] font-bold font-['Barlow_Condensed'] leading-[130%] text-center m-0 p-0 w-[91px] h-[15px] flex items-center justify-center overflow-visible whitespace-nowrap">
                      {tierName} Tier
                    </h3>
                    {/* Below Text */}
                    <p className="text-white/50 text-[16px] font-medium font-['Barlow_Condensed'] leading-[130%] text-center m-0 p-0 w-[72px] h-[11px] flex items-center justify-center overflow-visible whitespace-nowrap">
                      {meta.subtext}
                    </p>
                  </div>

                  {/* Badge */}
                  <div
                    className="flex items-center justify-center overflow-visible"
                    style={{
                      width: '49px',
                      height: '18px',
                      boxSizing: 'border-box',
                      borderRadius: '30px',
                      background: tierName === 'Bronze'
                        ? 'linear-gradient(180deg, #FF8C00 0%, #90540B 100%)'
                        : tierName === 'Silver'
                          ? 'linear-gradient(180deg, #DEDEDE 0%, #8B8B8B 100%)'
                          : tierName === 'Gold'
                            ? 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%), linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1))'
                            : tierName === 'Platinum'
                              ? 'linear-gradient(180deg, #1FCBE6 0%, #217681 100%)'
                              : tierName === 'Diamond'
                                ? 'linear-gradient(180deg, #7F8AF7 0%, #793EB9 100%)'
                                : 'linear-gradient(180deg, #E079DD 0%, #2757A0 100%)'
                    }}
                  >
                    <span
                      className="text-white font-['Barlow_Condensed'] font-semibold text-[10px] leading-[120%] text-center flex items-center justify-center overflow-visible whitespace-nowrap"
                      style={{
                        width: '25px',
                        height: '7px'
                      }}
                    >
                      {tierName}
                    </span>
                  </div>
                </div>


                {/* Vertical Divider */}
                <div className="w-[1px] h-[120px] bg-white/10 shrink-0" />

                {/* Right Level Cards Grid */}
                <div className="flex gap-[10px] items-center w-[1010px] h-[141px] shrink-0">
                  {tierLevels.map((lvl) => {
                    return (
                      <div
                        key={lvl.key}
                        className={`relative rounded-[20px] p-[16px] border flex flex-col justify-between h-[135px] w-[330px] shrink-0 transition-all duration-300 backdrop-blur-[44px]
                          ${lvl.reached ? 'border-[#2A2A2E]' : 'border-[#2A2A2E]/40 opacity-70'}`}
                        style={{
                          background: 'rgba(0, 0, 0, 0.36)'
                        }}
                      >
                        {/* Top Half of Card (Header & Reached checkmark layout) */}
                        <div className="flex items-center justify-between w-[298px] h-[45px] gap-[16px] shrink-0 overflow-visible">
                          {/* Text block */}
                          <div className="flex flex-col justify-between items-start w-[254px] h-[45px] shrink-0 overflow-visible">
                            {/* Heading */}
                            <h4 className="text-white text-[26px] font-semibold font-['Barlow_Condensed'] leading-[120%] m-0 p-0 w-[75px] h-[18px] flex items-center overflow-visible whitespace-nowrap">
                              {getLevelLabel(lvl)}
                            </h4>
                            {/* Requires text */}
                            <p className="text-[#888888] text-[16px] font-medium font-['Barlow_Condensed'] leading-[130%] m-0 p-0 flex items-center overflow-visible whitespace-nowrap">
                              Requires {lvl.threshold.toLocaleString()} coins
                            </p>
                          </div>

                          {/* Reached Checkmark */}
                          {lvl.reached ? (
                            <img
                              src="/coins/tik1.png"
                              alt="Reached"
                              className="w-[28px] h-[28px] shrink-0 object-contain"
                            />
                          ) : (
                            <div className="w-[28px] h-[28px] shrink-0" />
                          )}
                        </div>

                        {/* Divider */}
                        <div className="w-full h-[1px] bg-white/10 my-2" />

                        {/* Bottom Half of Card */}
                        <div className="flex justify-between items-center w-full">
                          {/* Reward Coins */}
                          <div className="flex items-center gap-[4px] overflow-visible">
                            <img
                              src="/coins/coinfinal.png"
                              alt="Coin"
                              className="w-[26px] h-[26px] shrink-0 object-contain overflow-visible"
                              style={{ filter: 'drop-shadow(0px 0px 14px rgba(254, 198, 53, 0.6))' }}
                            />
                            <span
                              className="text-[28px] font-bold font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap flex items-center shrink-0 pb-[2px]"
                              style={{
                                backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                color: 'transparent',
                                filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.8))'
                              }}
                            >
                              {lvl.rewardAmount.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-end">
                            {lvl.claimable ? (
                              <button
                                onClick={() => handleClaim(lvl.key)}
                                disabled={claiming === lvl.key}
                                className="flex items-center justify-center font-bold font-['Barlow_Condensed'] text-[14px] leading-none text-white transition-all duration-150 cursor-pointer hover:brightness-110 hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none"
                                style={{
                                  width: '80px',
                                  height: '32px',
                                  boxSizing: 'border-box',
                                  borderRadius: '8px',
                                  padding: '10px 30px',
                                  background: TIER_COLORS[tierName]?.gradient,
                                  boxShadow: TIER_COLORS[tierName]?.shadow
                                }}
                              >
                                {claiming === lvl.key ? '...' : 'Claim'}
                              </button>
                            ) : lvl.claimed ? (
                              <span
                                className="font-bold font-['Barlow_Condensed'] text-[20px] leading-[100%] text-right flex items-center justify-end overflow-visible whitespace-nowrap"
                                style={{
                                  width: '58px',
                                  height: '14px',
                                  color: TIER_COLORS[tierName]?.text || '#FF8C00'
                                }}
                              >
                                Claimed
                              </span>
                            ) : (
                              <div className="flex items-center gap-[6px]">
                                <img
                                  src="/coins/lockpe.png"
                                  alt="Locked"
                                  className="w-[24px] h-[24px] shrink-0 object-contain"
                                />
                                <span
                                  className="text-white font-semibold font-['Barlow_Condensed'] text-[20px] leading-[32px] text-center flex items-center justify-center overflow-visible whitespace-nowrap"
                                  style={{
                                    width: '51px',
                                    height: '32px'
                                  }}
                                >
                                  Locked
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
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
