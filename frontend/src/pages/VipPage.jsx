import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TIER_STYLES, getLevelLabel, LEVEL_BADGES } from '../utils/vipLevels';
import { FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TIER_METADATA = {
  Bronze: {
    subtext: 'Starter Level',
    badge: '/coins/VIPbronze.png',
    sectionBadge: '/coins/BronzeSection.png',
    miniBadge: '/coins/bronze.png',
    pillGradient: 'linear-gradient(180deg, #F3B60A -26.79%, #BE6708 158.93%)',
    cardGradient: 'linear-gradient(278.68deg, #F3B60A 0%, #BE6708 104.71%)',
    normalBoxBg: 'rgba(249, 247, 241, 1)',
    claimedBoxBg: 'linear-gradient(98.68deg, #FFF0C7 -4.71%, #FFDFBD 100%)',
    pillText: 'Bronze',
    btnBg: 'bg-[#F59E0B] hover:bg-[#D97706]',
    barColor: 'repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.45) 0px, rgba(255, 255, 255, 0.45) 3px, transparent 3px, transparent 6px), linear-gradient(98.68deg, #FFF0C7 -4.71%, #FFDFBD 100%)',
    sectionBg: 'rgba(249, 247, 241, 1)',
  },
  Silver: {
    subtext: 'Starter level',
    badge: '/coins/VIPsilver.png',
    sectionBadge: '/coins/SilverSection.png',
    miniBadge: '/coins/silver.png',
    pillGradient: 'linear-gradient(180deg, #D6D6D6 -26.79%, #929292 158.93%)',
    cardGradient: 'linear-gradient(180deg, #D6D6D6 75.1%, #929292 118.1%)',
    normalBoxBg: 'rgba(249, 247, 241, 1)',
    claimedBoxBg: 'linear-gradient(278.8deg, #F5F5F5 3.45%, #E2E2E2 109.81%)',
    pillText: 'Silver',
    btnBg: 'bg-[#F59E0B] hover:bg-[#D97706]',
    barColor: 'repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.45) 0px, rgba(255, 255, 255, 0.45) 3px, transparent 3px, transparent 6px), linear-gradient(98.68deg, #DBDBDB -4.71%, #CBCBCB 100%)',
    sectionBg: 'rgba(246, 246, 246, 1)',
  },
  Gold: {
    subtext: 'Getting Serious',
    badge: '/coins/VIPgold.png',
    sectionBadge: '/coins/Goldsection.png',
    miniBadge: '/coins/gold.png',
    pillGradient: 'linear-gradient(180deg, #FEDD72 -23.08%, #FCBA21 74.64%)',
    cardGradient: 'linear-gradient(180deg, #FEDD72 57.98%, #FCBA21 99.95%)',
    normalBoxBg: 'rgba(249, 247, 241, 1)',
    claimedBoxBg: 'linear-gradient(104.31deg, #FFF7DF 5.4%, #FFDE92 120.91%)',
    pillText: 'Gold',
    btnBg: 'bg-[#F59E0B] hover:bg-[#D97706]',
    barColor: 'repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.45) 0px, rgba(255, 255, 255, 0.45) 3px, transparent 3px, transparent 6px), linear-gradient(98.68deg, #FBE5A3 -4.71%, #FFC000 100%)',
    sectionBg: 'rgba(255, 250, 235, 1)',
  },
  Platinum: {
    subtext: 'Almost There',
    badge: '/coins/VIPplatinum.png',
    sectionBadge: '/coins/PlatSection.png',
    miniBadge: '/coins/platinum.png',
    pillGradient: 'linear-gradient(180deg, #1FC4DE 0%, #207985 100%)',
    cardGradient: 'linear-gradient(180deg, #1FC4DE 71.44%, #207985 111.33%)',
    normalBoxBg: 'rgba(249, 247, 241, 1)',
    claimedBoxBg: 'linear-gradient(105.59deg, #F8FEFF -10.99%, #BCE1E6 116.1%)',
    pillText: 'Platinum',
    btnBg: 'bg-[#06B6D4] hover:bg-[#0891B2]',
    barColor: 'repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.45) 0px, rgba(255, 255, 255, 0.45) 3px, transparent 3px, transparent 6px), linear-gradient(98.68deg, #79D4E2 -4.71%, #79BBC5 100%)',
    sectionBg: 'rgba(227, 244, 246, 1)',
  },
  Diamond: {
    subtext: 'Elite level',
    badge: '/coins/VIPdimond.png',
    sectionBadge: '/coins/DimSection.png',
    miniBadge: '/coins/dimond.png',
    pillGradient: 'linear-gradient(180deg, #7E83F1 0%, #7941BB 100%)',
    cardGradient: 'linear-gradient(180deg, #7E83F1 67.28%, #7941BB 106.65%)',
    normalBoxBg: 'rgba(249, 247, 241, 1)',
    claimedBoxBg: 'linear-gradient(103.08deg, #F0F1FF -14.97%, #E8D5FF 100.01%)',
    pillText: 'Diamond',
    btnBg: 'bg-[#7C3AED] hover:bg-[#6D28D9]',
    barColor: 'repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.45) 0px, rgba(255, 255, 255, 0.45) 3px, transparent 3px, transparent 6px), linear-gradient(98.68deg, #B2B2F4 -4.71%, #7D6EE0 100%)',
    sectionBg: 'rgba(241, 241, 255, 1)',
  },
  Opal: {
    subtext: 'The Highest',
    badge: '/coins/VIPopel.png',
    sectionBadge: '/coins/OpalSection.png',
    miniBadge: '/coins/opal.png',
    pillGradient: 'linear-gradient(180deg, #E92BFF 0%, #31BDFF 100%)',
    cardGradient: 'linear-gradient(180deg, #E92BFF 0%, #31BDFF 100%)',
    normalBoxBg: 'rgba(249, 247, 241, 1)',
    claimedBoxBg: 'linear-gradient(180deg, #7E83F1 0%, #7941BB 100%), linear-gradient(180deg, #E92BFF 0%, #31BDFF 100%)',
    pillText: 'Opal',
    btnBg: 'bg-[#A855F7] hover:bg-[#9333EA]',
    barColor: 'repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.45) 0px, rgba(255, 255, 255, 0.45) 3px, transparent 3px, transparent 6px), linear-gradient(98.68deg, #749DEF -4.71%, #3858B6 100%)',
    sectionBg: 'rgba(241, 246, 255, 1)',
  },
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
        toast.success(`🎉 Claimed ${data.rewardAmount.toLocaleString('de-DE')} coins!`);
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

  const { currentLevel, nextLevel, progressPct = 0, coinsToNext = 0, levels = [], totalEarned = 0 } = status || {};

  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Opal'];
  const currentLevelIdx = currentLevel ? levels.findIndex(l => l.key === currentLevel.key) : -1;
  const rankLevelDisplay = currentLevelIdx >= 0 ? currentLevelIdx + 1 : 0;
  const totalRanks = levels.length || 18;
  const isMaxLevel = currentLevel?.key === 'opal_3' || (rankLevelDisplay >= totalRanks && totalRanks > 0);

  return (
    <DashboardLayout hideStartEarning={true} fullWidth={true}>
      <div className="w-full min-h-screen bg-[#FAFAFA] flex flex-col items-center">

        {/* ─── Top Banner Area (rgba(249, 247, 241, 1)) ─── */}
        <div
          className="w-full flex justify-center items-center transition-colors duration-300 py-6 sm:py-10"
          style={{
            background: 'rgba(249, 247, 241, 1)',
            minHeight: '220px',
          }}
        >
          {/* Grouped Container for VIP Status & Status Card */}
          <div
            className="w-full max-w-[782px] mx-auto px-3 sm:px-4 md:px-0 flex flex-col items-start justify-center gap-4 sm:gap-[30px]"
          >
            {/* VIP Status Text */}
            <h1
              className="text-[22px] sm:text-[27px] font-bold text-black"
              style={{
                fontFamily: '"Bricolage Grotesque", sans-serif',
                lineHeight: '1.2',
                letterSpacing: '-0.02em',
                margin: 0,
                textAlign: 'left',
              }}
            >
              VIP Status
            </h1>

            {/* Top Status Card */}
            <div
              className="w-full shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-[24px] sm:rounded-[30px] p-3.5 sm:pt-[10px] sm:pr-[10px] sm:pb-[10px] sm:pl-[15px] gap-3.5 sm:gap-0 box-border bg-white min-h-[105px] sm:min-h-[114px]"
            >
              {/* Left Side: Badge & Rank info */}
              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <img
                  src={currentLevel ? (LEVEL_BADGES[currentLevel.key] || TIER_METADATA[currentLevel.tier]?.badge || '/coins/VIPbronze.png') : '/coins/image copy 8.png'}
                  alt="Rank Badge"
                  className="w-[72px] h-[72px] sm:w-[94px] sm:h-[94px] object-contain drop-shadow-sm shrink-0"
                />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1 sm:flex-initial">
                  <span
                    className="text-[12px] sm:text-[13px] text-black font-medium"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      lineHeight: '16px',
                      margin: 0,
                    }}
                  >
                    Current rank
                  </span>
                  <h2
                    className="text-[19px] sm:text-[22px] font-bold text-black"
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      lineHeight: '1.2',
                      letterSpacing: '-0.02em',
                      margin: 0,
                    }}
                  >
                    {currentLevel ? getLevelLabel(currentLevel) : (
                      <>
                        Earn coins<br />for Bronze Tier
                      </>
                    )}
                  </h2>
                  {isMaxLevel && (
                    <div
                      className="flex items-center gap-1.5 rounded-full py-1 px-3 bg-[#EAF1FF] mt-1 w-fit"
                    >
                      <img
                        src="/coins/image copy 11.png"
                        alt="Max Level"
                        className="w-4 h-4 object-contain shrink-0"
                      />
                      <span
                        className="text-[11px] sm:text-[12px] font-medium text-black whitespace-nowrap"
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                        }}
                      >
                        You have reached max level
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Total Earned & Rank Level Boxes */}
              <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
                {/* Total Earned Box */}
                <div
                  className="flex-1 sm:flex-initial sm:w-[136px] h-[52px] rounded-[17px] py-1.5 px-3 flex flex-col items-center justify-center gap-0.5 box-border"
                  style={{
                    background: 'rgba(249, 247, 241, 1)',
                  }}
                >
                  <span
                    className="text-[11px] sm:text-[12px] font-medium text-black text-center whitespace-nowrap"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      lineHeight: '14px',
                      margin: 0,
                    }}
                  >
                    Total Earned
                  </span>
                  <div className="flex items-center gap-1">
                    <img src="/coins/VIPcoin1.png" alt="Coin" className="w-3.5 h-3.5 object-contain shrink-0" />
                    <span
                      className="text-[12px] sm:text-[13px] font-semibold whitespace-nowrap"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        color: 'rgba(231, 171, 24, 1)',
                        lineHeight: '16px',
                        margin: 0,
                      }}
                    >
                      {(totalEarned ?? 0).toLocaleString('de-DE')}
                    </span>
                  </div>
                </div>

                {/* Rank Level Box */}
                <div
                  className="flex-1 sm:flex-initial sm:w-[109px] h-[52px] rounded-[17px] py-1.5 px-3 flex flex-col items-center justify-center gap-0.5 box-border"
                  style={{
                    background: 'rgba(249, 247, 241, 1)',
                  }}
                >
                  <span
                    className="text-[11px] sm:text-[12px] font-medium text-black text-center whitespace-nowrap"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      lineHeight: '14px',
                      margin: 0,
                    }}
                  >
                    Rank Level
                  </span>
                  <span
                    className="text-[13px] sm:text-[14px] font-bold text-center whitespace-nowrap"
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      letterSpacing: '-0.02em',
                      color: 'rgba(36, 50, 77, 1)',
                      lineHeight: '16px',
                      margin: 0,
                    }}
                  >
                    {rankLevelDisplay} / {totalRanks}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Bottom Section (Background: #FAFAFA) ─── */}
        <div className="w-full bg-[#FAFAFA] flex justify-center py-6 sm:py-10 pb-20 sm:pb-24">
          <div className="w-full max-w-[1329px] mx-auto px-3 sm:px-4 md:px-8 lg:px-0 flex flex-col gap-6 sm:gap-8">
            {tiers.map(tierName => {
              const tierLevels = levels.filter(l => l.tier === tierName);
              if (tierLevels.length === 0) return null;
              const meta = TIER_METADATA[tierName];
              const lastTierLevel = tierLevels[tierLevels.length - 1];

              return (
                <div
                  key={tierName}
                  className="w-full max-w-[1329px] shadow-sm flex flex-col justify-between rounded-[25px] p-4 sm:pt-[24px] sm:pr-[28px] sm:pb-[18px] sm:pl-[28px] box-border gap-4 sm:gap-4"
                  style={{
                    minHeight: '315px',
                    background: meta.sectionBg || 'rgba(255, 255, 255, 1)',
                  }}
                >
                  {/* Upper Row: Left Tier Info & Right 3 Cards */}
                  <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-5 sm:gap-6 w-full">
                    {/* Left Tier Header */}
                    <div className="flex flex-col items-center justify-center min-w-[130px] gap-2 shrink-0 w-full lg:w-auto">
                      <img
                        src={meta.sectionBadge || meta.badge}
                        alt={`${tierName} Badge`}
                        className="w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] object-contain shrink-0"
                      />
                      <span
                        className="min-w-[58px] h-[20px] rounded-full px-2.5 py-0.5 inline-flex items-center justify-center text-white text-[11px] font-semibold text-center box-border"
                        style={{
                          background: meta.pillGradient,
                          fontFamily: '"Poppins", sans-serif',
                        }}
                      >
                        {meta.pillText}
                      </span>
                      <h3
                        className="font-bold text-[18px] sm:text-[18px] leading-[22px] text-black text-center m-0"
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {tierName} Tier
                      </h3>
                    </div>

                    {/* Right Content: 3 Level Cards + Progress Row */}
                    <div className="flex-1 flex flex-col justify-between gap-3 w-full min-w-0">
                      {/* 3 Level Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 w-full">
                        {tierLevels.map(lvl => {
                          const earned = totalEarned ?? 0;
                          const isReached = lvl.reached || (lvl.threshold > 0 && earned >= lvl.threshold);
                          const isClaimed = lvl.claimed || (isReached && (lvl.rewardAmount === 0 || lvl.key === 'bronze_1'));
                          const isClaimable = lvl.claimable || (isReached && !isClaimed && lvl.rewardAmount > 0);

                          let levelProgressPct = 0;
                          if (isReached || isClaimed) {
                            levelProgressPct = 100;
                          } else if (lvl.threshold > 0) {
                            levelProgressPct = Math.min(Math.max(Math.round((earned / lvl.threshold) * 100), 0), 100);
                          }

                          return (
                            <div
                              key={lvl.key}
                              className="bg-white flex flex-col justify-between shadow-sm w-full rounded-[16px] p-4 sm:pt-[20px] sm:pr-[15px] sm:pb-[20px] sm:pl-[16px] gap-2.5 min-h-[235px] sm:min-h-[242px] box-border"
                            >
                              {/* Card Top: Title and Mini Badge */}
                              <div className="flex items-start justify-between">
                                <h4
                                  className="font-bold text-[21px] sm:text-[23px] leading-[28px] text-black m-0 tracking-[-0.02em]"
                                  style={{
                                    fontFamily: '"Bricolage Grotesque", sans-serif',
                                  }}
                                >
                                  {getLevelLabel(lvl)}
                                </h4>
                                {(LEVEL_BADGES[lvl.key] || meta.miniBadge) ? (
                                  <img
                                    src={LEVEL_BADGES[lvl.key] || meta.miniBadge}
                                    alt={`${getLevelLabel(lvl)} mini badge`}
                                    className={`${(lvl.tier === 'Opal' || lvl.key.startsWith('opal')) ? 'w-12 h-12 sm:w-14 sm:h-14 -my-2.5 -mr-1.5' : 'w-8 h-8 sm:w-9 sm:h-9'} object-contain shrink-0`}
                                  />
                                ) : (
                                  <div className="w-8 h-8 sm:w-9 sm:h-9" />
                                )}
                              </div>

                              {/* Require Coins & Reward Amount Container */}
                              <div className="flex flex-col gap-2 w-full">
                                {/* Requires Coin Text */}
                                <p
                                  className="text-[12px] sm:text-[13px] font-normal text-black/60 m-0 leading-[16px]"
                                  style={{
                                    fontFamily: '"Poppins", sans-serif',
                                  }}
                                >
                                  Requires {lvl.threshold.toLocaleString('de-DE')} coins
                                </p>

                                {/* Coin and Amount Row */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <img
                                      src="/coins/image copy 9.png"
                                      alt="Coin"
                                      className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0"
                                    />
                                    <span
                                      className="font-bold text-[22px] sm:text-[25px] leading-none tracking-[-0.02em]"
                                      style={{
                                        fontFamily: '"Bricolage Grotesque", sans-serif',
                                        color: 'rgba(190, 146, 0, 1)',
                                      }}
                                    >
                                      {lvl.rewardAmount.toLocaleString('de-DE')}
                                    </span>
                                  </div>
                                  {levelProgressPct > 0 && (
                                    <span
                                      className="font-semibold text-[12px] sm:text-[13px] text-[#71717A]"
                                      style={{
                                        fontFamily: '"Poppins", sans-serif',
                                      }}
                                    >
                                      {levelProgressPct}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div
                                className="overflow-hidden w-full h-[36px] sm:h-[40px] rounded-l-[10px] rounded-r-[5px] bg-[#DEDAD0]"
                              >
                                <div
                                  className="h-full transition-all duration-500 rounded-l-[10px]"
                                  style={{
                                    width: `${levelProgressPct}%`,
                                    background: meta.barColor || 'rgba(36, 50, 77, 1)',
                                    backgroundSize: meta.barSize || 'auto',
                                    borderTopRightRadius: levelProgressPct >= 99 ? '5px' : '0px',
                                    borderBottomRightRadius: levelProgressPct >= 99 ? '5px' : '0px',
                                  }}
                                />
                              </div>

                              {/* Card Bottom: Action Button / Status */}
                              <div>
                                {isClaimed ? (
                                  <div className="flex items-center justify-center min-h-[38px] sm:min-h-[40px] w-full">
                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                      <img
                                        src="/coins/image copy 10.png"
                                        alt="Congrats"
                                        className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0"
                                      />
                                      <span
                                        className="font-medium text-[13px] sm:text-[14px] text-[#24324D] whitespace-nowrap"
                                        style={{
                                          fontFamily: '"Poppins", sans-serif',
                                        }}
                                      >
                                        Congrats, Claimed successfully
                                      </span>
                                    </div>
                                  </div>
                                ) : isClaimable || isReached ? (
                                  <button
                                    onClick={() => handleClaim(lvl.key)}
                                    disabled={claiming === lvl.key}
                                    className="w-full py-2 sm:py-2.5 bg-[#24324D] hover:bg-[#1E293B] text-white rounded-full font-semibold text-sm transition-all cursor-pointer"
                                    style={{
                                      fontFamily: '"Poppins", sans-serif',
                                    }}
                                  >
                                    {claiming === lvl.key ? '...' : 'Claim'}
                                  </button>
                                ) : (
                                  <div
                                    className="w-full py-2 sm:py-2.5 bg-[#EFEFEF] text-[#9CA3AF] rounded-full flex items-center justify-center gap-2 text-sm font-medium"
                                    style={{
                                      fontFamily: '"Poppins", sans-serif',
                                    }}
                                  >
                                    <img
                                      src="/coins/VIPlock.png"
                                      alt="Locked"
                                      className="w-3.5 h-3.5 object-contain opacity-50"
                                    />
                                    <span>Locked</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom Row: Progress & Coin Bonus info */}
                      <div
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 w-full text-left pt-1.5 sm:pt-1"
                      >
                        <span
                          className="font-bold text-[14px] sm:text-[14px] text-[#1E2538] text-left"
                          style={{
                            fontFamily: '"Bricolage Grotesque", sans-serif',
                          }}
                        >
                          Progress to {lastTierLevel ? getLevelLabel(lastTierLevel) : `${tierName} III`}
                        </span>
                        <div
                          className="flex flex-wrap items-center justify-start sm:justify-end gap-1 text-[12px] sm:text-[13px] font-medium text-black text-left"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                          }}
                        >
                          <span>Earn</span>
                          <img src="/coins/VIPcoin1.png" alt="Coin" className="w-3.5 h-3.5 object-contain inline-block shrink-0" />
                          <span style={{ color: 'rgba(231, 171, 24, 1)', fontWeight: 600 }}>
                            {coinsToNext.toLocaleString('de-DE')}
                          </span>
                          <span>more coins to unlock your</span>
                          <span className="basis-full h-0 sm:hidden" />
                          <img src="/coins/VIPcoin1.png" alt="Coin" className="w-3.5 h-3.5 object-contain inline-block shrink-0" />
                          <span style={{ color: 'rgba(231, 171, 24, 1)', fontWeight: 600 }}>
                            {(lastTierLevel?.rewardAmount || 250000).toLocaleString('de-DE')}
                          </span>
                          <span>coin bonus.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VipPage;

