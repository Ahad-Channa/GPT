import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useDailyBonus } from '../contexts/DailyBonusContext';
import { FiCheck, FiLock } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function useCountdown(target) {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    if (!target) {
      setDisplay('');
      return;
    }
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setDisplay('00 : 00 : 00');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(
        `${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return display;
}

export default function DailyBonus() {
  const { currentUser } = useAuth();
  const { status, loading, fetchStatus } = useDailyBonus();
  const [claiming, setClaiming] = useState(false);

  const resetTimer = useCountdown(status?.nextClaimAt || status?.cycleResetAt || null);

  useEffect(() => {
    if (resetTimer === '00 : 00 : 00') fetchStatus();
  }, [resetTimer, fetchStatus]);

  const claimBonus = async () => {
    if (claiming || !status?.gateUnlocked || status?.alreadyClaimed) return;
    setClaiming(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/wallet/daily-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      } else {
        alert(data.error || 'Failed to claim bonus');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClaiming(false);
    }
  };

  if (loading || !status) {
    return (
      <DashboardLayout showLiveBar={true} fullWidth={true}>
        <div className="flex items-center justify-center h-80">
          <div className="w-10 h-10 rounded-full border-2 border-[#1E2538] border-t-transparent animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const streak = status.streak || 0;
  const longestStreak = status.longestStreak !== undefined ? status.longestStreak : streak;
  const earned = status.earned || 0;
  const required = status.required || 50000;
  const progressPercent = Math.min(100, Math.max(0, (earned / required) * 100));
  const isUnlocked = status.gateUnlocked || earned >= required;
  const remainingToUnlock = Math.max(0, required - earned);

  const cycleBase = Math.floor((streak === 0 ? 0 : streak - 1) / 10) * 10;
  const displayDays = Array.from({ length: 10 }, (_, i) => cycleBase + i + 1);
  const cycleStreak = streak % 10 === 0 && streak > 0 ? 10 : streak % 10;
  const progressLinePercent = Math.min(100, Math.max(0, ((cycleStreak) / 9) * 100));

  return (
    <DashboardLayout showLiveBar={true} fullWidth={true}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full flex flex-col"
      >
        {/* ─── Top Banner Area (Warm Background: rgba(249, 247, 241, 1)) ─── */}
        <div
          className="w-full transition-colors duration-300"
          style={{ background: 'rgba(249, 247, 241, 1)' }}
        >
          <div className="w-full max-w-[1328px] mx-auto px-4 md:px-8 lg:px-0 py-6 sm:py-8">
            {/* Top 2 Cards: Daily Bonus + Streak Action */}
            <div className="flex flex-col lg:flex-row items-stretch gap-4 w-full">
              {/* Left Card: Daily Bonus */}
              <div
                className="bg-white border border-gray-100/90 shadow-sm flex flex-col justify-between shrink-0"
                style={{
                  width: '100%',
                  maxWidth: '915px',
                  height: '222px',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                  gap: '50px',
                  borderRadius: '30px',
                  paddingTop: '19px',
                  paddingRight: '23px',
                  paddingBottom: '20px',
                  paddingLeft: '20px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Top Row inside Left Card */}
                <div className="flex items-start justify-between gap-4 w-full">
                  <div
                    className="flex flex-col justify-center"
                    style={{
                      maxWidth: '371px',
                      minHeight: '44px',
                      gap: '16px',
                      opacity: 1,
                    }}
                  >
                    <h1
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: '27px',
                        lineHeight: '18px',
                        letterSpacing: '-0.02em',
                        color: '#0E0F0C',
                        margin: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Daily Bonus
                    </h1>
                    <p
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '14px',
                        letterSpacing: '0%',
                        color: '#0E0F0C',
                        margin: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Claim your daily reward and keep your streak going!
                    </p>
                  </div>

                  {/* Today's Reward Pill */}
                  <div
                    className="flex flex-col items-center justify-center shrink-0"
                    style={{
                      width: '155px',
                      height: '57px',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                      gap: '4px',
                      borderRadius: '1000px',
                      paddingTop: '10px',
                      paddingRight: '22px',
                      paddingBottom: '10px',
                      paddingLeft: '22px',
                      background: 'rgba(249, 247, 241, 1)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      style={{
                        width: '111px',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '14px',
                        letterSpacing: '0%',
                        color: '#0E0F0C',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Today's Reward
                    </span>
                    <div
                      className="flex items-center justify-center gap-1.5"
                      style={{
                        minWidth: '78px',
                        height: '16px',
                        opacity: 1,
                      }}
                    >
                      <img
                        src="/coins/coinbonushero.png"
                        alt="Coin"
                        style={{
                          width: '14.4px',
                          height: '16px',
                          objectFit: 'contain',
                        }}
                        className="shrink-0"
                      />
                      <span
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 600,
                          fontSize: '18px',
                          lineHeight: '18px',
                          letterSpacing: '0%',
                          color: '#E5A00D',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {status.rewardToday || 800} Coins
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Progress Area inside Left Card */}
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between mb-2 w-full">
                    <span
                      style={{
                        width: '130px',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '14px',
                        letterSpacing: '0%',
                        color: '#0E0F0C',
                        opacity: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Progress to unlock
                    </span>
                    <div
                      className="flex items-center gap-1.5"
                      style={{
                        opacity: 1,
                      }}
                    >
                      <img
                        src="/coins/procoinicon.png"
                        alt="Coin"
                        style={{
                          width: '11px',
                          height: '12.22px',
                          objectFit: 'contain',
                          opacity: 1,
                        }}
                        className="shrink-0"
                      />
                      <span
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 500,
                          fontSize: '16px',
                          lineHeight: '16px',
                          letterSpacing: '0%',
                          color: '#E5A00D',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {earned.toLocaleString()} / {required.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div
                    className="w-full overflow-hidden"
                    style={{
                      width: '100%',
                      maxWidth: '872px',
                      height: '14.78px',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                      borderRadius: '30px',
                      background: 'rgba(249, 247, 241, 1)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${progressPercent}%`,
                        borderRadius: '30px',
                        background: 'rgba(36, 50, 77, 1)',
                      }}
                    />
                  </div>

                  {isUnlocked ? (
                    <span
                      className="mt-2"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '14px',
                        letterSpacing: '0%',
                        color: '#0E0F0C',
                        opacity: 1,
                      }}
                    >
                      You have unlocked your bonus
                    </span>
                  ) : (
                    <div
                      className="flex items-center mt-2"
                      style={{
                        maxWidth: '337px',
                        minHeight: '12.22px',
                        gap: '4px',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '14px',
                        letterSpacing: '0%',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: '#0E0F0C' }}>Earn</span>
                      <img
                        src="/coins/coinbonushero.png"
                        alt="Coin"
                        style={{
                          width: '12.22px',
                          height: '12.22px',
                          objectFit: 'contain',
                        }}
                        className="shrink-0"
                      />
                      <span style={{ color: 'rgba(231, 171, 24, 1)' }}>
                        {remainingToUnlock.toLocaleString()} Coins
                      </span>
                      <span style={{ color: '#0E0F0C' }}>more to unlock your bonus</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Card: Streak Stats & Claim Action */}
              <div
                className="w-full lg:flex-1 bg-white border border-gray-100/90 shadow-sm flex flex-col justify-between"
                style={{
                  height: '222px',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                  gap: '16px',
                  borderRadius: '30px',
                  paddingTop: '19px',
                  paddingRight: '20px',
                  paddingBottom: '18px',
                  paddingLeft: '19px',
                  background: 'rgba(255, 255, 255, 1)',
                  boxSizing: 'border-box',
                }}
              >
                {/* Stats Row */}
                <div
                  className="flex items-center justify-between mx-auto"
                  style={{
                    width: '322px',
                    maxWidth: '100%',
                    height: '48px',
                    gap: '59px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    className="flex flex-col"
                    style={{ width: '102px', opacity: 1 }}
                  >
                    <span
                      style={{
                        width: '102px',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '18px',
                        letterSpacing: '0%',
                        color: '#0E0F0C',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Current streak
                    </span>
                    <span
                      style={{
                        width: '102px',
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: '27px',
                        lineHeight: '27px',
                        letterSpacing: '-0.02em',
                        color: '#0E0F0C',
                        marginTop: '4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Day {streak}
                    </span>
                  </div>

                  <div
                    style={{
                      width: '0px',
                      height: '48px',
                      opacity: 0.2,
                      borderLeft: '1px solid rgba(0, 0, 0, 1)',
                    }}
                  />

                  <div
                    className="flex flex-col text-left items-start"
                    style={{ width: '102px', opacity: 1 }}
                  >
                    <span
                      style={{
                        width: '102px',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '18px',
                        letterSpacing: '0%',
                        color: '#0E0F0C',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Longest streak
                    </span>
                    <span
                      style={{
                        width: '102px',
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: '27px',
                        lineHeight: '27px',
                        letterSpacing: '-0.02em',
                        color: '#0E0F0C',
                        marginTop: '4px',
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {longestStreak} days
                    </span>
                  </div>
                </div>

                {/* Horizontal Divider Line */}
                <div
                  className="mx-auto"
                  style={{
                    width: '362px',
                    maxWidth: '100%',
                    height: '0px',
                    opacity: 0.1,
                    borderTop: '1px solid rgba(0, 0, 0, 1)',
                  }}
                />

                {/* Next Reward Tomorrow */}
                <div className="flex items-center justify-between w-full">
                  <span
                    style={{
                      width: '164px',
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: '18px',
                      letterSpacing: '0%',
                      color: '#0E0F0C',
                      opacity: 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Next Reward Tomorrow
                  </span>
                  <div
                    className="flex items-center gap-1.5"
                    style={{
                      height: '12.22px',
                      opacity: 1,
                    }}
                  >
                    <img
                      src="/coins/coinbonushero.png"
                      alt="Coin"
                      style={{
                        width: '11px',
                        height: '12.22px',
                        opacity: 1,
                        objectFit: 'contain',
                      }}
                      className="shrink-0"
                    />
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '14px',
                        letterSpacing: '0%',
                        color: '#E5A00D',
                        opacity: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {status.rewardTomorrow || 1000} Coins
                    </span>
                  </div>
                </div>

                {/* Claim Button & Timer */}
                <div className="flex flex-col items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={claimBonus}
                    disabled={claiming || !isUnlocked || status.alreadyClaimed}
                    className={`w-full mx-auto flex items-center justify-center select-none transition-all ${
                      !isUnlocked || status.alreadyClaimed
                        ? 'cursor-not-allowed'
                        : 'hover:opacity-90 active:scale-[0.99] cursor-pointer shadow-sm'
                    }`}
                    style={{
                      width: '100%',
                      maxWidth: '364px',
                      height: '52px',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                      gap: '10px',
                      borderRadius: '80px',
                      paddingTop: '16px',
                      paddingRight: '28px',
                      paddingBottom: '16px',
                      paddingLeft: '28px',
                      background:
                        !isUnlocked || status.alreadyClaimed
                          ? 'rgba(249, 247, 241, 1)'
                          : 'rgba(36, 50, 77, 1)',
                      border: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    {(!isUnlocked || status.alreadyClaimed) && (
                      <img
                        src="/coins/lock1.png"
                        alt="Locked"
                        style={{
                          width: '17px',
                          height: '20px',
                          opacity: 1,
                          objectFit: 'contain',
                        }}
                        className="shrink-0"
                      />
                    )}
                    <span
                      style={{
                        width: '114px',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '16px',
                        lineHeight: '28px',
                        letterSpacing: '0%',
                        color:
                          !isUnlocked || status.alreadyClaimed
                            ? 'rgba(0, 0, 0, 1)'
                            : '#FFFFFF',
                        opacity: !isUnlocked || status.alreadyClaimed ? 0.4 : 1,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {claiming
                        ? 'Claiming...'
                        : status.alreadyClaimed
                        ? 'Claimed'
                        : 'Claim Reward'}
                    </span>
                  </button>

                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span
                      style={{
                        width: '63px',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '18px',
                        letterSpacing: '0%',
                        color: '#0E0F0C',
                        opacity: 1,
                        whiteSpace: 'nowrap',
                        textAlign: 'right',
                      }}
                    >
                      Resets in
                    </span>
                    <span
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: '16px',
                        lineHeight: '16px',
                        letterSpacing: '-0.02em',
                        color: 'rgba(36, 50, 77, 1)',
                        opacity: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {resetTimer || '12 : 40 : 45'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Lower Main Content Area (With Spacing) ─────────────────────── */}
        <div className="w-full pt-8 sm:pt-10 lg:pt-12 pb-12 sm:pb-16">
          <div className="w-full max-w-[1328px] mx-auto px-4 md:px-8 lg:px-0 flex flex-col gap-6 sm:gap-8">
            {/* ─── Middle Section: Current Streak (10-Day Timeline Card) ──── */}
            <div
              className="w-full shadow-sm flex flex-col justify-between"
              style={{
                width: '100%',
                maxWidth: '1328px',
                minHeight: '176px',
                opacity: 1,
                transform: 'rotate(0deg)',
                borderRadius: '30px',
                background: 'rgba(249, 247, 241, 1)',
                padding: '24px 32px',
                boxSizing: 'border-box',
                gap: '24px',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between w-full">
                <h2
                  style={{
                    width: '189px',
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '27px',
                    lineHeight: '27px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    margin: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Current Streak
                </h2>
                <span
                  style={{
                    minWidth: '86px',
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    lineHeight: '20px',
                    letterSpacing: '-0.02em',
                    color: 'rgba(36, 50, 77, 1)',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cycleStreak}/10Days
                </span>
              </div>

              {/* Timeline Bar & Nodes */}
              <div className="w-full overflow-x-auto scrollbar-none py-3">
                <div className="relative min-w-[720px] w-full max-w-[1259px] mx-auto flex items-center justify-between px-6">
                  {/* Background Connecting Line */}
                  <div
                    className="absolute left-0 right-0 top-[19px] -translate-y-1/2 z-0 overflow-hidden flex items-center"
                    style={{
                      height: '19px',
                      borderRadius: '30px',
                      background: 'rgba(237, 234, 225, 1)',
                      boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.05) inset',
                      paddingLeft: '3px',
                      paddingRight: '3px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      className="transition-all duration-500"
                      style={{
                        height: '11px',
                        width:
                          cycleStreak === 0
                            ? '0%'
                            : cycleStreak >= 10
                            ? '100%'
                            : `${6.95 + (cycleStreak - 1) * 9.567}%`,
                        borderRadius: '30px',
                        background: 'rgba(36, 50, 77, 1)',
                      }}
                    />
                  </div>

                  {/* 10 Step Nodes */}
                  {displayDays.map((day) => {
                    const isClaimed = day <= cycleStreak && cycleStreak > 0;
                    const isTodayActive = day === cycleStreak + 1 && isUnlocked && !status.alreadyClaimed;

                    return (
                      <div
                        key={day}
                        className="relative z-10 flex flex-col items-center justify-start"
                        style={{
                          width: '126.9px',
                          maxWidth: '127px',
                          gap: '8px',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                        }}
                      >
                        {/* Circle Node Container */}
                        <div className="w-[38px] h-[38px] flex items-center justify-center shrink-0">
                          {isClaimed ? (
                            <div
                              className="flex items-center justify-center shrink-0"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '30px',
                                background: 'rgba(237, 234, 225, 1)',
                              }}
                            >
                              <div
                                className="flex items-center justify-center shrink-0"
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '30px',
                                  background: 'linear-gradient(180deg, #586A8C 0%, #24324D 100%)',
                                  padding: '6px',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <img
                                  src="/coins/tikstre.png"
                                  alt="Claimed"
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    objectFit: 'contain',
                                  }}
                                  className="shrink-0"
                                />
                              </div>
                            </div>
                          ) : isTodayActive ? (
                            <div
                              className="flex items-center justify-center shrink-0"
                              style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '30px',
                                background: 'rgba(237, 234, 225, 1)',
                              }}
                            >
                              <div
                                className="flex items-center justify-center shrink-0"
                                style={{
                                  width: '38.32px',
                                  height: '38.32px',
                                  borderRadius: '30px',
                                  background: 'linear-gradient(180deg, #586A8C 0%, #24324D 100%)',
                                  padding: '6px',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <div className="flex items-center gap-[3px]">
                                  <span className="w-[4px] h-[4px] rounded-full bg-white block" />
                                  <span className="w-[4px] h-[4px] rounded-full bg-white block" />
                                  <span className="w-[4px] h-[4px] rounded-full bg-white block" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="flex items-center justify-center shrink-0"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '30px',
                                background: 'rgba(237, 234, 225, 1)',
                                boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.05) inset',
                                paddingTop: '10px',
                                paddingRight: '11px',
                                paddingBottom: '10px',
                                paddingLeft: '12px',
                                boxSizing: 'border-box',
                              }}
                            >
                              <img
                                src="/coins/lock1.png"
                                alt="Locked"
                                style={{
                                  width: '15px',
                                  height: '17.61px',
                                  objectFit: 'contain',
                                  opacity: 0.35,
                                  filter: 'grayscale(1) brightness(0.8)',
                                }}
                                className="shrink-0"
                              />
                            </div>
                          )}
                        </div>

                        {/* Day Label */}
                        <span
                          className="text-[12px] font-medium"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            color: isClaimed || isTodayActive ? '#0E0F0C' : '#8E8E93',
                            fontWeight: isClaimed || isTodayActive ? 600 : 500,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Day {day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── Lower Section: Streak Milestones ───────────────────────── */}
            <div
              className="flex flex-col w-full"
              style={{
                width: '100%',
                maxWidth: '1326px',
                minHeight: '219px',
                gap: '40px',
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
            >
              <div className="flex flex-col gap-1">
                <h2
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '27px',
                    lineHeight: '27px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    margin: 0,
                  }}
                >
                  Streak Milestones
                </h2>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '28px',
                    letterSpacing: '0%',
                    color: '#000000',
                    margin: 0,
                  }}
                >
                  Bonus coins for hitting these streaks
                </p>
              </div>

              {/* 3 Milestone Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5 w-full">
                {[
                  {
                    badgeSrc: '/coins/streak (2).png',
                    title: '10 Day Streak',
                    sub: 'Keep going!',
                    target: 10,
                    reward: status.rewardDay10 ?? 500,
                    barColor: '#F97316', // Orange
                  },
                  {
                    badgeSrc: '/coins/streak (3).png',
                    title: '20 Day Streak',
                    sub: 'Almost there!',
                    target: 20,
                    reward: status.rewardDay20 ?? 2498,
                    barColor: '#10B981', // Emerald/Teal
                  },
                  {
                    badgeSrc: '/coins/streak (1).png',
                    title: '30 Day Streak',
                    sub: 'Ultimate champion!',
                    target: 30,
                    reward: status.rewardDay30 ?? 5000,
                    barColor: '#3B82F6', // Blue
                  },
                ].map((milestone) => {
                  const currentProgress = Math.min(streak, milestone.target);
                  const milestonePercent = Math.min(100, Math.max(0, (currentProgress / milestone.target) * 100));

                  return (
                    <div
                      key={milestone.target}
                      className="shadow-sm flex flex-row items-center justify-between"
                      style={{
                        width: '100%',
                        maxWidth: '426px',
                        minHeight: '135px',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                        borderRadius: '20px',
                        gap: '19px',
                        paddingTop: '30px',
                        paddingRight: '20px',
                        paddingBottom: '30px',
                        paddingLeft: '15px',
                        background: 'rgba(249, 247, 241, 1)',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Left Badge Image */}
                      <img
                        src={milestone.badgeSrc}
                        alt={milestone.title}
                        style={{
                          width: '75px',
                          height: '75px',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          objectFit: 'contain',
                        }}
                        className="shrink-0"
                      />

                      {/* Right Content */}
                      <div
                        className="flex-1 flex flex-col justify-between min-w-0"
                        style={{
                          width: '100%',
                          maxWidth: '304px',
                          height: '75px',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          gap: '18px',
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Top: Title & Sub + Reward Pill */}
                        <div className="flex items-start justify-between gap-2">
                          <div
                            style={{
                              width: '140px',
                              height: '37px',
                              opacity: 1,
                              transform: 'rotate(0deg)',
                              gap: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            }}
                          >
                            <h3
                              style={{
                                width: '140px',
                                fontFamily: '"Bricolage Grotesque", sans-serif',
                                fontWeight: 700,
                                fontSize: '22px',
                                lineHeight: '22px',
                                letterSpacing: '-0.02em',
                                color: '#000000',
                                margin: 0,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {milestone.title}
                            </h3>
                            <p
                              style={{
                                width: '140px',
                                fontFamily: '"Poppins", sans-serif',
                                fontWeight: 500,
                                fontSize: '14px',
                                lineHeight: '18px',
                                letterSpacing: '0%',
                                color: '#000000',
                                margin: 0,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {milestone.sub}
                            </p>
                          </div>

                          {/* Reward Pill */}
                          <div
                            className="flex items-center justify-center shrink-0"
                            style={{
                              minWidth: '94px',
                              height: '20px',
                              opacity: 1,
                              transform: 'rotate(0deg)',
                              borderRadius: '50px',
                              gap: '2px',
                              paddingTop: '5px',
                              paddingRight: '7px',
                              paddingBottom: '5px',
                              paddingLeft: '7px',
                              background: 'rgba(255, 255, 255, 1)',
                              boxSizing: 'border-box',
                            }}
                          >
                            <img
                              src="/coins/coinbonushero.png"
                              alt="Coin"
                              style={{
                                width: '9px',
                                height: '10px',
                                opacity: 1,
                                transform: 'rotate(0deg)',
                                objectFit: 'contain',
                              }}
                              className="shrink-0"
                            />
                            <span
                              style={{
                                width: '69px',
                                fontFamily: '"Poppins", sans-serif',
                                fontWeight: 500,
                                fontSize: '14px',
                                lineHeight: '14px',
                                letterSpacing: '0%',
                                color: 'rgba(231, 171, 24, 1)',
                                whiteSpace: 'nowrap',
                                textAlign: 'center',
                              }}
                            >
                              {milestone.reward} coins
                            </span>
                          </div>
                        </div>

                        {/* Bottom: Progress Bar + Days Count */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 h-[8px] bg-[#E8E6DF] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${milestonePercent}%`,
                                backgroundColor: milestone.barColor,
                              }}
                            />
                          </div>
                          <span
                            className="text-[12px] font-bold text-gray-700 shrink-0 whitespace-nowrap"
                            style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                          >
                            {currentProgress} / {milestone.target} Days
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
