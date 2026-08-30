import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TIER_STYLES, getLevelLabel } from '../utils/vipLevels';
import { FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TIER_METADATA = {
  Bronze: {
    subtext: 'Starter Level',
    badge: '/coins/VIPbronze.png',
    pillGradient: 'linear-gradient(180deg, #F3B60A -26.79%, #BE6708 158.93%)',
    cardGradient: 'linear-gradient(278.68deg, #F3B60A 0%, #BE6708 104.71%)',
    pillText: 'Bronze',
    btnBg: 'bg-[#F59E0B] hover:bg-[#D97706]',
  },
  Silver: {
    subtext: 'Starter level',
    badge: '/coins/VIPsilver.png',
    pillGradient: 'linear-gradient(180deg, #D6D6D6 -26.79%, #929292 158.93%)',
    cardGradient: 'linear-gradient(180deg, #D6D6D6 75.1%, #929292 118.1%)',
    pillText: 'Silver',
    btnBg: 'bg-[#F59E0B] hover:bg-[#D97706]',
  },
  Gold: {
    subtext: 'Getting Serious',
    badge: '/coins/VIPgold.png',
    pillGradient: 'linear-gradient(180deg, #FEDD72 -23.08%, #FCBA21 74.64%)',
    cardGradient: 'linear-gradient(180deg, #FEDD72 57.98%, #FCBA21 99.95%)',
    pillText: 'Gold',
    btnBg: 'bg-[#F59E0B] hover:bg-[#D97706]',
  },
  Platinum: {
    subtext: 'Almost There',
    badge: '/coins/VIPplatinum.png',
    pillGradient: 'linear-gradient(180deg, #1FC4DE 0%, #207985 100%)',
    cardGradient: 'linear-gradient(180deg, #1FC4DE 71.44%, #207985 111.33%)',
    pillText: 'Platinum',
    btnBg: 'bg-[#06B6D4] hover:bg-[#0891B2]',
  },
  Diamond: {
    subtext: 'Elite level',
    badge: '/coins/VIPdimond.png',
    pillGradient: 'linear-gradient(180deg, #7E83F1 0%, #7941BB 100%)',
    cardGradient: 'linear-gradient(180deg, #7E83F1 67.28%, #7941BB 106.65%)',
    pillText: 'Diamond',
    btnBg: 'bg-[#7C3AED] hover:bg-[#6D28D9]',
  },
  Opal: {
    subtext: 'The Highest',
    badge: '/coins/VIPopel.png',
    pillGradient: 'linear-gradient(180deg, #E92BFF 0%, #31BDFF 100%)',
    cardGradient: 'linear-gradient(180deg, #E92BFF 0%, #31BDFF 100%)',
    pillText: 'Opal',
    btnBg: 'bg-[#A855F7] hover:bg-[#9333EA]',
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
  const totalRanks = levels.length || 16;

  return (
    <DashboardLayout hideStartEarning={true} fullWidth={true}>
      <div className="w-full flex flex-col items-center">

        {/* ─── Top Banner Area (Warm Background: rgba(249, 247, 241, 1)) ─── */}
        <div
          className="w-full flex justify-center items-center transition-colors duration-300 py-8 sm:py-10 border-b border-[#EFECE6]/50"
          style={{
            background: 'rgba(249, 247, 241, 1)',
          }}
        >
          <div
            className="w-full max-w-[1328px] mx-auto px-4 md:px-8 lg:px-0 flex flex-col"
            style={{ gap: '31px' }}
          >
            {/* Heading Section */}
            <div
              style={{
                maxWidth: '354px',
                minHeight: '44px',
                gap: '16px',
                opacity: 1,
                transform: 'rotate(0deg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <h1
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: '27px',
                  lineHeight: '18px',
                  letterSpacing: '-0.02em',
                  color: '#000000',
                  margin: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                VIP Status
              </h1>
              <p
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '10px',
                  color: '#000000',
                  margin: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                Higher rewards. Bigger perks. More earning power.
              </p>
            </div>

            {/* Top Status Cards Container */}
            <div
              className="w-full max-w-[1328px] flex flex-col lg:flex-row justify-between items-stretch gap-3.5"
              style={{
                minHeight: '244px',
              }}
            >
              {/* Left Card: Current Rank */}
              <div
                className="w-full lg:w-[354px] shadow-sm flex flex-col items-center justify-between"
                style={{
                  width: '354px',
                  minHeight: '244px',
                  height: '244px',
                  gap: '10px',
                  borderRadius: '30px',
                  paddingTop: '19px',
                  paddingRight: '13px',
                  paddingBottom: '14px',
                  paddingLeft: '14px',
                  background: 'rgba(255, 255, 255, 1)',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    width: '136px',
                    height: '136px',
                    gap: '20px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={currentLevel ? (TIER_METADATA[currentLevel.tier]?.badge || '/coins/VIPbronze.png') : '/coins/VIPbronze.png'}
                    alt="Current Tier Badge"
                    className="object-contain drop-shadow-sm shrink-0"
                    style={{
                      width: '75px',
                      height: '75px',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                    }}
                  />
                  <div className="flex flex-col items-center text-center">
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '18px',
                        letterSpacing: '0%',
                        color: '#000000',
                        textAlign: 'center',
                        margin: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Current rank
                    </span>
                    <h2
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: '27px',
                        lineHeight: '32px',
                        letterSpacing: '-0.02em',
                        color: '#000000',
                        textAlign: 'center',
                        margin: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {currentLevel ? getLevelLabel(currentLevel) : 'Unranked'}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full">
                  {/* Total Earned Box */}
                  <div
                    style={{
                      width: '169px',
                      height: '52px',
                      borderRadius: '17px',
                      paddingTop: '6px',
                      paddingRight: '16px',
                      paddingBottom: '6px',
                      paddingLeft: '16px',
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
                        fontSize: '14px',
                        lineHeight: '16px',
                        letterSpacing: '0%',
                        color: '#000000',
                        textAlign: 'center',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                      }}
                    >
                      Total Earned
                    </span>
                    <div className="flex items-center gap-1">
                      <img src="/coins/VIPcoin1.png" alt="Coin" className="w-3.5 h-3.5 object-contain shrink-0" />
                      <span
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 500,
                          fontSize: '14px',
                          lineHeight: '16px',
                          letterSpacing: '0%',
                          color: 'rgba(231, 171, 24, 1)',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}
                      >
                        {(totalEarned ?? 0).toLocaleString('de-DE')}
                      </span>
                    </div>
                  </div>

                  {/* Rank Level Box */}
                  <div
                    style={{
                      width: '153px',
                      height: '52px',
                      borderRadius: '17px',
                      paddingTop: '6px',
                      paddingRight: '16px',
                      paddingBottom: '6px',
                      paddingLeft: '16px',
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
                        fontSize: '14px',
                        lineHeight: '16px',
                        letterSpacing: '0%',
                        color: '#000000',
                        textAlign: 'center',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
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
                        display: 'inline-block',
                      }}
                    >
                      {rankLevelDisplay} / {totalRanks}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Card: Progress to Next Rank */}
              <div className="w-full lg:w-[948px] flex-1 bg-white rounded-[24px] p-8 shadow-sm flex flex-col justify-center min-h-[244px]">
                {nextLevel ? (
                  <div className="flex flex-col gap-6">
                    <h3
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: '27px',
                        lineHeight: '28px',
                        letterSpacing: '-0.02em',
                        color: '#000000',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        transform: 'translateY(-35px)',
                      }}
                    >
                      Progress to {getLevelLabel(nextLevel)}
                    </h3>

                    {/* Progress Bar and Text Layout (width: 914, gap: 17px) */}
                    <div
                      className="w-full max-w-[914px] flex flex-col"
                      style={{
                        width: '914px',
                        maxWidth: '100%',
                        gap: '17px',
                        opacity: 1,
                        transform: 'translateY(40px)',
                      }}
                    >
                      {/* Progress Bar Container with floating pill badge */}
                      <div
                        className="relative w-full"
                        style={{
                          width: '100%',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                        }}
                      >
                        <div
                          className="w-full rounded-full overflow-hidden"
                          style={{
                            height: '14px',
                            background: 'rgba(222, 218, 208, 1)',
                          }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${Math.min(Math.max(progressPct, 0), 100)}%`,
                              background: 'rgba(36, 50, 77, 1)',
                            }}
                          />
                        </div>
                        {/* Floating percentage tag */}
                        <div
                          className="absolute flex items-center justify-center pointer-events-none transition-all duration-500 ease-out"
                          style={{
                            top: '-36px',
                            left: `clamp(0px, calc(${Math.min(Math.max(progressPct, 0), 100)}% - 7px), calc(100% - 58px))`,
                            width: '58px',
                            height: '31px',
                            borderTopLeftRadius: '30px',
                            borderTopRightRadius: '30px',
                            borderBottomRightRadius: '30px',
                            borderBottomLeftRadius: '0px',
                            padding: '10px',
                            gap: '10px',
                            background: 'rgba(255, 255, 255, 1)',
                            boxShadow: '0px 0px 25px 0px rgba(0, 0, 0, 0.14)',
                            boxSizing: 'border-box',
                            opacity: 1,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: '"Poppins", sans-serif',
                              fontWeight: 700,
                              fontSize: '13px',
                              color: '#000000',
                              lineHeight: '1',
                              margin: 0,
                            }}
                          >
                            {progressPct}%
                          </span>
                        </div>
                      </div>

                      <div
                        className="flex flex-wrap items-center"
                        style={{
                          gap: '5px',
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 500,
                          fontSize: '14px',
                          lineHeight: '18px',
                          letterSpacing: '0%',
                          color: '#000000',
                        }}
                      >
                        <span>Earn</span>
                        <img src="/coins/VIPcoin1.png" alt="Coin" className="w-3.5 h-3.5 object-contain inline-block shrink-0" />
                        <span
                          style={{
                            color: 'rgba(231, 171, 24, 1)',
                            fontWeight: 500,
                          }}
                        >
                          {coinsToNext.toLocaleString('de-DE')}
                        </span>
                        <span>more coins to unlock your</span>
                        <img src="/coins/VIPcoin1.png" alt="Coin" className="w-3.5 h-3.5 object-contain inline-block shrink-0" />
                        <span
                          style={{
                            color: 'rgba(231, 171, 24, 1)',
                            fontWeight: 500,
                          }}
                        >
                          {nextLevel.rewardAmount.toLocaleString('de-DE')}
                        </span>
                        <span>coin bonus.</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    <h3
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: '27px',
                        lineHeight: '28px',
                        letterSpacing: '-0.02em',
                        color: '#000000',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        transform: 'translateY(-35px)',
                      }}
                    >
                      Max Rank Achieved
                    </h3>
                    <div
                      className="relative w-full max-w-[914px] pt-3 pb-1"
                      style={{
                        width: '914px',
                        maxWidth: '100%',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                      }}
                    >
                      <div
                        className="w-full rounded-full overflow-hidden"
                        style={{
                          height: '14px',
                          background: 'rgba(222, 218, 208, 1)',
                        }}
                      >
                        <div
                          className="h-full rounded-full w-full"
                          style={{
                            background: 'rgba(36, 50, 77, 1)',
                          }}
                        />
                      </div>
                      <div
                        className="absolute flex items-center justify-center pointer-events-none"
                        style={{
                          top: '-36px',
                          left: '100%',
                          transform: 'translateX(-100%)',
                          width: '58px',
                          height: '31px',
                          borderTopLeftRadius: '30px',
                          borderTopRightRadius: '30px',
                          borderBottomRightRadius: '30px',
                          borderBottomLeftRadius: '0px',
                          padding: '10px',
                          gap: '10px',
                          background: 'rgba(255, 255, 255, 1)',
                          boxShadow: '0px 0px 25px 0px rgba(0, 0, 0, 0.14)',
                          boxSizing: 'border-box',
                          opacity: 1,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 700,
                            fontSize: '13px',
                            color: '#000000',
                            lineHeight: '1',
                            margin: 0,
                          }}
                        >
                          100%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm font-medium text-[#71717A]">
                      Congratulations! You've reached the highest rank.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Bottom Section (White Background: bg-white / #FFFFFF) ─── */}
        <div className="w-full bg-white flex justify-center py-10 pb-24">
          <div className="w-full max-w-[1328px] mx-auto px-4 md:px-8 lg:px-0 flex flex-col gap-10">
            {tiers.map(tierName => {
              const tierLevels = levels.filter(l => l.tier === tierName);
              if (tierLevels.length === 0) return null;
              const meta = TIER_METADATA[tierName];

              return (
                <div key={tierName} className="flex flex-col gap-4">
                  {/* Tier Header */}
                  <div className="flex items-center gap-2.5">
                    <img
                      src={meta.badge}
                      alt={`${tierName} Badge`}
                      className="object-contain shrink-0"
                      style={{
                        width: '84.03px',
                        height: '84.03px',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                      }}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            minWidth: '58px',
                            height: '22px',
                            borderRadius: '100px',
                            background: meta.pillGradient,
                            paddingTop: '7px',
                            paddingBottom: '7px',
                            paddingLeft: '8px',
                            paddingRight: '8px',
                            gap: '10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 600,
                            fontSize: '12px',
                            lineHeight: '18px',
                            letterSpacing: '0%',
                            textAlign: 'center',
                            boxSizing: 'border-box',
                            opacity: 1,
                          }}
                        >
                          {meta.pillText}
                        </span>
                      </div>
                      <h3
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: '27px',
                          lineHeight: '28px',
                          letterSpacing: '-0.02em',
                          color: '#000000',
                          margin: 0,
                          marginTop: '4px',
                        }}
                      >
                        {tierName} Tier
                      </h3>
                      <p
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 500,
                          fontSize: '14px',
                          lineHeight: '18px',
                          letterSpacing: '0%',
                          color: '#000000',
                          margin: 0,
                          marginTop: '2px',
                        }}
                      >
                        {meta.subtext}
                      </p>
                    </div>
                  </div>

                  {/* Divider line below tier header */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '1329px',
                      height: '0px',
                      borderTop: '1px solid rgba(0, 0, 0, 1)',
                      opacity: 0.1,
                      boxSizing: 'border-box',
                      margin: '4px 0 12px 0',
                    }}
                  />

                  {/* Cards Grid */}
                  <div className={`grid gap-6 ${tierLevels.length === 1 ? 'grid-cols-1 md:max-w-[427px]' : 'grid-cols-1 md:grid-cols-3'}`}>
                    {tierLevels.map(lvl => {
                      const isClaimed = lvl.claimed;
                      const isClaimable = lvl.claimable;
                      const isReached = lvl.reached;
                      const isUnlocked = isReached || isClaimable || isClaimed;

                      return (
                        <div
                          key={lvl.key}
                          style={{
                            width: '100%',
                            maxWidth: '427px',
                            height: '188px',
                            borderRadius: '30px',
                            background: isUnlocked ? meta.cardGradient : 'rgba(239, 239, 239, 1)',
                            paddingBottom: '9px',
                            gap: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxSizing: 'border-box',
                            opacity: 1,
                            transform: 'rotate(0deg)',
                            overflow: 'hidden',
                            boxShadow: '0px 4px 20px 0px rgba(0, 0, 0, 0.05)',
                          }}
                        >
                          {/* Top Inner White Box */}
                          <div
                            style={{
                              width: '100%',
                              height: '156px',
                              borderRadius: '30px',
                              background: 'rgba(255, 255, 255, 1)',
                              padding: '16px 20px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxSizing: 'border-box',
                              opacity: 1,
                              transform: 'rotate(0deg)',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              {/* Coin + Reward Amount */}
                              <div className="flex items-center gap-2">
                                <img
                                  src="/coins/VIPcoin1.png"
                                  alt="Coin"
                                  className="w-5 h-5 object-contain shrink-0"
                                />
                                <span
                                  style={{
                                    fontFamily: '"Poppins", sans-serif',
                                    fontWeight: 700,
                                    fontSize: '20px',
                                    color: 'rgba(231, 171, 24, 1)',
                                    lineHeight: '1',
                                  }}
                                >
                                  {lvl.rewardAmount.toLocaleString('de-DE')}
                                </span>
                              </div>

                              {/* Reached Checkmark */}
                              {isReached && (
                                <div className="w-5 h-5 rounded-full bg-[#3B82F6] flex items-center justify-center text-white shadow-sm shrink-0">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>

                            <div>
                              <h4
                                style={{
                                  fontFamily: '"Bricolage Grotesque", sans-serif',
                                  fontWeight: 700,
                                  fontSize: '18px',
                                  color: '#000000',
                                  margin: 0,
                                  lineHeight: '1.2',
                                }}
                              >
                                {getLevelLabel(lvl)}
                              </h4>
                              <p
                                style={{
                                  fontFamily: '"Poppins", sans-serif',
                                  fontWeight: 500,
                                  fontSize: '13px',
                                  color: '#71717A',
                                  margin: 0,
                                  marginTop: '3px',
                                }}
                              >
                                Requires {lvl.threshold.toLocaleString('de-DE')} coins
                              </p>
                            </div>
                          </div>

                          {/* Bottom Action Area (Claim / Locked / Claimed) */}
                          <div className="w-full flex items-center justify-center px-4">
                            {isClaimed ? (
                              <span
                                style={{
                                  fontFamily: '"Poppins", sans-serif',
                                  fontWeight: 600,
                                  fontSize: '14px',
                                  color: '#FFFFFF',
                                  textAlign: 'center',
                                  display: 'block',
                                }}
                              >
                                Claimed
                              </span>
                            ) : isClaimable || isReached ? (
                              <button
                                onClick={() => handleClaim(lvl.key)}
                                disabled={claiming === lvl.key}
                                style={{
                                  fontFamily: '"Poppins", sans-serif',
                                  fontWeight: 600,
                                  fontSize: '14px',
                                  color: '#FFFFFF',
                                  textAlign: 'center',
                                  width: '100%',
                                  cursor: 'pointer',
                                  background: 'transparent',
                                  border: 'none',
                                  outline: 'none',
                                }}
                              >
                                {claiming === lvl.key ? '...' : 'Claim'}
                              </button>
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                }}
                              >
                                <img
                                  src="/coins/VIPlock.png"
                                  alt="Locked"
                                  className="w-3.5 h-3.5 object-contain shrink-0"
                                />
                                <span
                                  style={{
                                    width: '57px',
                                    fontFamily: '"Poppins", sans-serif',
                                    fontWeight: 500,
                                    fontSize: '16px',
                                    lineHeight: '28px',
                                    letterSpacing: '0%',
                                    color: 'rgba(157, 156, 155, 1)',
                                    textAlign: 'center',
                                    display: 'inline-block',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Locked
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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

