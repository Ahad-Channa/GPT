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
          className="w-full flex justify-center items-center transition-colors duration-300 py-8 sm:py-10"
          style={{
            background: 'rgba(249, 247, 241, 1)',
            minHeight: '275px',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          {/* Grouped Container for VIP Status & Status Card (width: 782px, height: 162px, gap: 30px, centered) */}
          <div
            className="w-full max-w-[782px] mx-auto px-4 sm:px-0 flex flex-col items-start justify-center"
            style={{
              width: '782px',
              minHeight: '162px',
              gap: '30px',
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
          >
            {/* VIP Status Text */}
            <h1
              style={{
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: '27px',
                lineHeight: '18px',
                letterSpacing: '-0.02em',
                color: '#000000',
                margin: 0,
                opacity: 1,
                transform: 'rotate(0deg)',
                textAlign: 'left',
              }}
            >
              VIP Status
            </h1>

            {/* Top Status Card (width: 782px, height: 114px) */}
            <div
              className="w-full shadow-sm flex items-center justify-between"
              style={{
                width: '782px',
                minHeight: '114px',
                height: isMaxLevel ? 'auto' : '114px',
                opacity: 1,
                transform: 'rotate(0deg)',
                borderRadius: '30px',
                paddingTop: '10px',
                paddingRight: '10px',
                paddingBottom: '10px',
                paddingLeft: '15px',
                background: 'rgba(255, 255, 255, 1)',
                boxSizing: 'border-box',
              }}
            >
              {/* Left Side: Badge & Rank info */}
              <div className="flex items-center gap-4">
                <img
                  src={currentLevel ? (LEVEL_BADGES[currentLevel.key] || TIER_METADATA[currentLevel.tier]?.badge || '/coins/VIPbronze.png') : '/coins/image copy 8.png'}
                  alt="Rank Badge"
                  className="object-contain drop-shadow-sm shrink-0"
                  style={{
                    width: '94px',
                    height: '94px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                  }}
                />
                <div className="flex flex-col gap-0.5">
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '13px',
                      lineHeight: '16px',
                      letterSpacing: '0%',
                      color: '#000000',
                      margin: 0,
                    }}
                  >
                    Current rank
                  </span>
                  <h2
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '22px',
                      lineHeight: '26px',
                      letterSpacing: '-0.02em',
                      color: '#000000',
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
                      style={{
                        width: '219px',
                        maxWidth: '100%',
                        height: '24px',
                        minHeight: '24px',
                        gap: '5px',
                        borderRadius: '60px',
                        paddingTop: '5px',
                        paddingRight: '14px',
                        paddingBottom: '5px',
                        paddingLeft: '14px',
                        background: 'rgba(234, 241, 255, 1)',
                        opacity: 1,
                        display: 'flex',
                        alignItems: 'center',
                        boxSizing: 'border-box',
                        marginTop: '2px',
                      }}
                    >
                      <img
                        src="/coins/image copy 11.png"
                        alt="Max Level"
                        className="w-4 h-4 object-contain shrink-0"
                      />
                      <span
                        style={{
                          width: '172px',
                          maxWidth: '100%',
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 500,
                          fontSize: '12px',
                          lineHeight: '18px',
                          letterSpacing: '0%',
                          color: '#000000',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        You have reached max level
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Total Earned & Rank Level Boxes */}
              <div className="flex items-center gap-2.5">
                {/* Total Earned Box */}
                <div
                  style={{
                    width: '136px',
                    height: '52px',
                    borderRadius: '17px',
                    paddingTop: '6px',
                    paddingRight: '12px',
                    paddingBottom: '6px',
                    paddingLeft: '12px',
                    background: 'rgba(249, 247, 241, 1)',
                    gap: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '12px',
                      lineHeight: '14px',
                      letterSpacing: '0%',
                      color: '#000000',
                      textAlign: 'center',
                      margin: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Total Earned
                  </span>
                  <div className="flex items-center gap-1">
                    <img src="/coins/VIPcoin1.png" alt="Coin" className="w-3.5 h-3.5 object-contain shrink-0" />
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 600,
                        fontSize: '13px',
                        lineHeight: '16px',
                        letterSpacing: '0%',
                        color: 'rgba(231, 171, 24, 1)',
                        margin: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {(totalEarned ?? 0).toLocaleString('de-DE')}
                    </span>
                  </div>
                </div>

                {/* Rank Level Box */}
                <div
                  style={{
                    width: '109px',
                    height: '52px',
                    borderRadius: '17px',
                    paddingTop: '6px',
                    paddingRight: '12px',
                    paddingBottom: '6px',
                    paddingLeft: '12px',
                    background: 'rgba(249, 247, 241, 1)',
                    gap: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '12px',
                      lineHeight: '14px',
                      letterSpacing: '0%',
                      color: '#000000',
                      textAlign: 'center',
                      margin: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Rank Level
                  </span>
                  <span
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '14px',
                      lineHeight: '16px',
                      letterSpacing: '-0.02em',
                      color: 'rgba(36, 50, 77, 1)',
                      textAlign: 'center',
                      margin: 0,
                      whiteSpace: 'nowrap',
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
        <div className="w-full bg-[#FAFAFA] flex justify-center py-10 pb-24">
          <div className="w-full max-w-[1329px] mx-auto px-4 md:px-8 lg:px-0 flex flex-col gap-8">
            {tiers.map(tierName => {
              const tierLevels = levels.filter(l => l.tier === tierName);
              if (tierLevels.length === 0) return null;
              const meta = TIER_METADATA[tierName];
              const lastTierLevel = tierLevels[tierLevels.length - 1];

              return (
                <div
                  key={tierName}
                  className="w-full max-w-[1329px] shadow-sm flex flex-col justify-between"
                  style={{
                    width: '1329px',
                    minHeight: '315px',
                    borderRadius: '25px',
                    background: meta.sectionBg || 'rgba(255, 255, 255, 1)',
                    padding: '24px 28px 18px 28px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    boxSizing: 'border-box',
                    gap: '16px',
                  }}
                >
                  {/* Upper Row: Left Tier Info & Right 3 Cards */}
                  <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-6 w-full">
                    {/* Left Tier Header */}
                    <div className="flex flex-col items-center justify-center min-w-[130px] gap-2 shrink-0">
                      <img
                        src={meta.sectionBadge || meta.badge}
                        alt={`${tierName} Badge`}
                        className="object-contain shrink-0"
                        style={{
                          width: '84px',
                          height: '84px',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                        }}
                      />
                      <span
                        style={{
                          minWidth: '58px',
                          height: '20px',
                          borderRadius: '100px',
                          background: meta.pillGradient,
                          padding: '2px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 600,
                          fontSize: '11px',
                          textAlign: 'center',
                          boxSizing: 'border-box',
                        }}
                      >
                        {meta.pillText}
                      </span>
                      <h3
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: '18px',
                          lineHeight: '22px',
                          letterSpacing: '-0.02em',
                          color: '#000000',
                          margin: 0,
                          textAlign: 'center',
                        }}
                      >
                        {tierName} Tier
                      </h3>
                    </div>

                    {/* Right Content: 3 Level Cards + Progress Row */}
                    <div className="flex-1 flex flex-col justify-between gap-3 w-full">
                      {/* 3 Level Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
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
                              className="bg-white flex flex-col justify-between shadow-sm"
                              style={{
                                width: '359px',
                                maxWidth: '100%',
                                height: '242.88px',
                                minHeight: '242.88px',
                                borderRadius: '16px',
                                paddingTop: '20px',
                                paddingRight: '15px',
                                paddingBottom: '20px',
                                paddingLeft: '16px',
                                gap: '10px',
                                background: 'rgba(255, 255, 255, 1)',
                                opacity: 1,
                                transform: 'rotate(0deg)',
                                boxSizing: 'border-box',
                              }}
                            >
                              {/* Card Top: Title and Mini Badge */}
                              <div className="flex items-start justify-between">
                                <h4
                                  style={{
                                    fontFamily: '"Bricolage Grotesque", sans-serif',
                                    fontWeight: 700,
                                    fontSize: '23px',
                                    lineHeight: '28px',
                                    letterSpacing: '-0.02em',
                                    color: '#000000',
                                    margin: 0,
                                    opacity: 1,
                                  }}
                                >
                                  {getLevelLabel(lvl)}
                                </h4>
                                {(LEVEL_BADGES[lvl.key] || meta.miniBadge) ? (
                                  <img
                                    src={LEVEL_BADGES[lvl.key] || meta.miniBadge}
                                    alt={`${getLevelLabel(lvl)} mini badge`}
                                    className={`${(lvl.tier === 'Opal' || lvl.key.startsWith('opal')) ? 'w-14 h-14 -my-2.5 -mr-1.5' : 'w-9 h-9'} object-contain shrink-0`}
                                  />
                                ) : (
                                  <div className="w-9 h-9" />
                                )}
                              </div>

                              {/* Require Coins & Reward Amount Container (width: 328px, height: 38.88px, gap: 11px) */}
                              <div
                                style={{
                                  width: '328px',
                                  maxWidth: '100%',
                                  minHeight: '38.88px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '11px',
                                  opacity: 1,
                                  transform: 'rotate(0deg)',
                                }}
                              >
                                {/* Requires Coin Text */}
                                <p
                                  style={{
                                    width: '328px',
                                    maxWidth: '100%',
                                    fontFamily: '"Poppins", sans-serif',
                                    fontWeight: 400,
                                    fontSize: '13px',
                                    lineHeight: '16px',
                                    letterSpacing: '0%',
                                    color: 'rgba(14, 15, 12, 1)',
                                    opacity: 0.6,
                                    margin: 0,
                                    transform: 'rotate(0deg)',
                                  }}
                                >
                                  Requires {lvl.threshold.toLocaleString('de-DE')} coins
                                </p>

                                {/* Coin and Amount Row */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src="/coins/image copy 9.png"
                                      alt="Coin"
                                      className="w-5 h-5 object-contain shrink-0"
                                    />
                                    <span
                                      style={{
                                        fontFamily: '"Bricolage Grotesque", sans-serif',
                                        fontWeight: 700,
                                        fontSize: '25px',
                                        lineHeight: '1',
                                        letterSpacing: '-0.02em',
                                        color: 'rgba(190, 146, 0, 1)',
                                        opacity: 1,
                                        transform: 'rotate(0deg)',
                                      }}
                                    >
                                      {lvl.rewardAmount.toLocaleString('de-DE')}
                                    </span>
                                  </div>
                                  {levelProgressPct > 0 && (
                                    <span
                                      style={{
                                        fontFamily: '"Poppins", sans-serif',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        color: '#71717A',
                                      }}
                                    >
                                      {levelProgressPct}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Progress Bar (width: 325px, height: 40px, border-radius: 10px 5px 5px 10px, unfilled: rgba(222, 218, 208, 1)) */}
                              <div
                                className="overflow-hidden"
                                style={{
                                  width: '325px',
                                  maxWidth: '100%',
                                  height: '40px',
                                  borderTopLeftRadius: '10px',
                                  borderTopRightRadius: '5px',
                                  borderBottomRightRadius: '5px',
                                  borderBottomLeftRadius: '10px',
                                  background: 'rgba(222, 218, 208, 1)',
                                  opacity: 1,
                                  transform: 'rotate(0deg)',
                                }}
                              >
                                <div
                                  className="h-full transition-all duration-500"
                                  style={{
                                    width: `${levelProgressPct}%`,
                                    background: meta.barColor || 'rgba(36, 50, 77, 1)',
                                    backgroundSize: meta.barSize || 'auto',
                                    borderTopLeftRadius: '10px',
                                    borderBottomLeftRadius: '10px',
                                    borderTopRightRadius: levelProgressPct >= 99 ? '5px' : '0px',
                                    borderBottomRightRadius: levelProgressPct >= 99 ? '5px' : '0px',
                                  }}
                                />
                              </div>

                              {/* Card Bottom: Action Button / Status */}
                              <div>
                                {isClaimed ? (
                                  <div className="flex items-center justify-center min-h-[40px] w-full">
                                    <div
                                      className="flex items-center justify-center gap-2"
                                      style={{
                                        width: '223px',
                                        maxWidth: '100%',
                                        minHeight: '10px',
                                        opacity: 1,
                                        transform: 'rotate(0deg)',
                                      }}
                                    >
                                      <img
                                        src="/coins/image copy 10.png"
                                        alt="Congrats"
                                        className="w-5 h-5 object-contain shrink-0"
                                      />
                                      <span
                                        style={{
                                          fontFamily: '"Poppins", sans-serif',
                                          fontWeight: 500,
                                          fontSize: '14px',
                                          lineHeight: '28px',
                                          letterSpacing: '0%',
                                          color: 'rgba(36, 50, 77, 1)',
                                          whiteSpace: 'nowrap',
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
                                    className="w-full py-2.5 bg-[#24324D] hover:bg-[#1E293B] text-white rounded-full font-semibold text-sm transition-all"
                                    style={{
                                      fontFamily: '"Poppins", sans-serif',
                                    }}
                                  >
                                    {claiming === lvl.key ? '...' : 'Claim'}
                                  </button>
                                ) : (
                                  <div
                                    className="w-full py-2.5 bg-[#EFEFEF] text-[#9CA3AF] rounded-full flex items-center justify-center gap-2 text-sm font-medium"
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

                      {/* Bottom Row: Progress & Coin Bonus info (aligned under 3 cards, shifted 5px down) */}
                      <div
                        className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full"
                        style={{ marginTop: '5px' }}
                      >
                        <span
                          style={{
                            fontFamily: '"Bricolage Grotesque", sans-serif',
                            fontWeight: 700,
                            fontSize: '14px',
                            color: '#000000',
                          }}
                        >
                          Progress to {lastTierLevel ? getLevelLabel(lastTierLevel) : `${tierName} III`}
                        </span>
                        <div
                          className="flex flex-wrap items-center gap-1"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 500,
                            fontSize: '13px',
                            color: '#000000',
                          }}
                        >
                          <span>Earn</span>
                          <img src="/coins/VIPcoin1.png" alt="Coin" className="w-3.5 h-3.5 object-contain inline-block shrink-0" />
                          <span style={{ color: 'rgba(231, 171, 24, 1)', fontWeight: 600 }}>
                            {coinsToNext.toLocaleString('de-DE')}
                          </span>
                          <span>more coins to unlock your</span>
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

