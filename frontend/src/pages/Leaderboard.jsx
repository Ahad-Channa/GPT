import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLock } from 'react-icons/fi';
import PublicProfileModal from '../components/PublicProfileModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PERIOD_META = {
  daily: { label: 'Daily' },
  weekly: { label: 'Weekly' },
  monthly: { label: 'Monthly' },
};

/* ── Medal Badge ─────────────────────────────────────────────── */
const MedalBadge = ({ rank }) => {
  if (rank === 2) {
    return (
      <img
        src="/coins/leder2.png"
        alt="2nd Place Badge"
        style={{
          width: '35px',
          height: '35px',
          opacity: 1,
          bottom: '-18px',
          transform: 'translateX(-50%)',
        }}
        className="absolute left-1/2 z-20 object-contain pointer-events-none drop-shadow-md"
      />
    );
  }

  if (rank === 3) {
    return (
      <img
        src="/coins/leder3.png"
        alt="3rd Place Badge"
        style={{
          width: '37px',
          height: '37px',
          opacity: 1,
          bottom: '-19px',
          transform: 'translateX(-50%)',
        }}
        className="absolute left-1/2 z-20 object-contain pointer-events-none drop-shadow-md"
      />
    );
  }

  return null;
};

/* ── Podium Card ─────────────────────────────────────────────── */
const PodiumCard = ({ rank, user, prize, onClick, isCenter = false }) => {
  if (!user) {
    return (
      <div className={`w-full max-w-[247px] opacity-0 pointer-events-none hidden sm:block ${isCenter ? 'order-1 sm:order-2' : ''}`} />
    );
  }

  const borderGradient = isCenter
    ? 'linear-gradient(349.82deg, #FFEE88 -16.97%, #F7BD23 129.3%)'
    : rank === 2
    ? 'linear-gradient(349.82deg, #E5E7EB -16.97%, #9CA3AF 129.3%)'
    : 'linear-gradient(349.82deg, #FED7AA -16.97%, #D97706 129.3%)';

  return (
    <div
      className={`flex flex-col items-center select-none ${
        isCenter ? 'order-1 sm:order-2 z-10' : rank === 2 ? 'order-2 sm:order-1' : 'order-3 sm:order-3'
      }`}
      style={{
        width: '247px',
        height: '161px',
        opacity: 1,
        transform: isCenter ? 'translateY(-32px)' : 'none',
        gap: '16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Avatar + Medal Badge */}
      <div className="relative flex flex-col items-center shrink-0">
        <div
          style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            padding: '2px',
            background: borderGradient,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
          className="shadow-md"
          onClick={() => onClick(user.userId)}
        >
          <img
            src={user.avatarUrl || user.avatar || '/avatars/avatar1.png'}
            alt={user.displayName}
            className="w-full h-full object-cover rounded-full bg-white"
          />
        </div>

        {/* Badge */}
        {isCenter ? (
          <img
            src="/coins/leder1.png"
            alt="1st Place Badge"
            style={{
              width: '49px',
              height: '49px',
              opacity: 1,
              bottom: '-25px',
              transform: 'translateX(-50%)',
            }}
            className="absolute left-1/2 z-20 object-contain pointer-events-none drop-shadow-md"
          />
        ) : (
          <MedalBadge rank={rank} />
        )}
      </div>

      {/* Both Boxes Layout (247x75, gap: 3px) */}
      <div
        className="flex items-center justify-center select-none"
        style={{
          width: '247px',
          height: '75px',
          opacity: 1,
          transform: 'rotate(0deg)',
          gap: '3px',
          boxSizing: 'border-box',
        }}
      >
        {/* Box 1: User & Coins (122x75) */}
        <div
          onClick={() => onClick(user.userId)}
          className="flex flex-col justify-center overflow-hidden"
          style={{
            width: '122px',
            height: '75px',
            opacity: 1,
            transform: 'rotate(0deg)',
            borderRadius: '20px',
            paddingTop: '16px',
            paddingRight: '12px',
            paddingBottom: '16px',
            paddingLeft: '12px',
            gap: '8px',
            background: 'rgba(255, 255, 255, 1)',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              width: '100%',
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontWeight: 700,
              fontSize:
                (user.displayName?.length || 0) <= 5
                  ? '17px'
                  : (user.displayName?.length || 0) <= 7
                  ? '15px'
                  : (user.displayName?.length || 0) <= 9
                  ? '13px'
                  : (user.displayName?.length || 0) <= 12
                  ? '11.5px'
                  : (user.displayName?.length || 0) <= 15
                  ? '10px'
                  : '9px',
              lineHeight: '1.2',
              letterSpacing: '-0.02em',
              color: '#0E0F0C',
              margin: 0,
              display: 'block',
              whiteSpace: 'nowrap',
            }}
            title={user.displayName}
          >
            {user.displayName}
          </span>
          <div className="flex items-center gap-1">
            <img
              src="/coins/ledcoin.png"
              alt="Coin"
              className="w-[14px] h-[14px] object-contain shrink-0"
            />
            <span
              style={{
                width: 'auto',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '1.2',
                letterSpacing: '0%',
                color: 'rgba(190, 146, 0, 1)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {user.coinsEarned?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '0.0'}
            </span>
          </div>
        </div>

        {/* Box 2: Reward (122x75) */}
        <div
          onClick={() => onClick(user.userId)}
          className="flex flex-col justify-center overflow-hidden"
          style={{
            width: '122px',
            height: '75px',
            opacity: 1,
            transform: 'rotate(0deg)',
            borderRadius: '20px',
            paddingTop: '16px',
            paddingRight: '12px',
            paddingBottom: '16px',
            paddingLeft: '12px',
            gap: '8px',
            background: 'rgba(255, 255, 255, 1)',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              width: '100%',
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontWeight: 700,
              fontSize: '18px',
              lineHeight: '1.2',
              letterSpacing: '-0.02em',
              color: '#0E0F0C',
              margin: 0,
              display: 'block',
              whiteSpace: 'nowrap',
            }}
          >
            Reward
          </span>
          <div className="flex items-center gap-1">
            <img
              src="/coins/ledcoin.png"
              alt="Coin"
              className="w-[14px] h-[14px] object-contain shrink-0"
            />
            <span
              style={{
                width: 'auto',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '1.2',
                letterSpacing: '0%',
                color: 'rgba(190, 146, 0, 1)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {prize?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '0.0'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Split Box Countdown ─────────────────────────────────────── */
const LeaderboardCountdown = ({ targetDate }) => {
  const [time, setTime] = useState({ d: '00', h: '00', m: '00', s: '00' });

  useEffect(() => {
    if (!targetDate) return;
    const calc = () => {
      const dist = new Date(targetDate).getTime() - Date.now();
      if (dist <= 0) {
        setTime({ d: '00', h: '00', m: '00', s: '00' });
        return;
      }
      const d = Math.floor(dist / 86400000);
      const h = Math.floor((dist % 86400000) / 3600000);
      const m = Math.floor((dist % 3600000) / 60000);
      const s = Math.floor((dist % 60000) / 1000);

      setTime({
        d: String(d).padStart(2, '0'),
        h: String(h).padStart(2, '0'),
        m: String(m).padStart(2, '0'),
        s: String(s).padStart(2, '0'),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return (
    <div
      className="flex flex-col items-center select-none"
      style={{
        width: '232px',
        height: '77px',
        opacity: 1,
        transform: 'rotate(0deg)',
        gap: '12px',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          width: '232px',
          height: '10px',
          opacity: 1,
          transform: 'rotate(0deg)',
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 500,
          fontSize: '14px',
          lineHeight: '18px',
          letterSpacing: '0%',
          textAlign: 'center',
          color: '#0E0F0C',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Resets in
      </span>

      <div className="flex items-center justify-between w-full">
        {/* Days */}
        <div className="flex flex-col items-center">
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: 'rgba(36, 50, 77, 0.1)',
              opacity: 1,
              transform: 'rotate(0deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: '19px',
                lineHeight: '1.2',
                letterSpacing: '-0.02em',
                color: 'rgba(36, 50, 77, 1)',
                opacity: 1,
                transform: 'rotate(0deg)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {time.d}
            </span>
          </div>
          <span
            style={{
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 500,
              fontSize: '12px',
              lineHeight: '18px',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#000000',
              opacity: 1,
              transform: 'rotate(0deg)',
              marginTop: '4px',
              userSelect: 'none',
              display: 'block',
            }}
          >
            Days
          </span>
        </div>

        <span style={{ color: 'rgba(36, 50, 77, 1)', fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '-20px' }}>:</span>

        {/* Hours */}
        <div className="flex flex-col items-center">
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: 'rgba(36, 50, 77, 0.1)',
              opacity: 1,
              transform: 'rotate(0deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: '19px',
                lineHeight: '1.2',
                letterSpacing: '-0.02em',
                color: 'rgba(36, 50, 77, 1)',
                opacity: 1,
                transform: 'rotate(0deg)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {time.h}
            </span>
          </div>
          <span
            style={{
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 500,
              fontSize: '12px',
              lineHeight: '18px',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#000000',
              opacity: 1,
              transform: 'rotate(0deg)',
              marginTop: '4px',
              userSelect: 'none',
              display: 'block',
            }}
          >
            Hours
          </span>
        </div>

        <span style={{ color: 'rgba(36, 50, 77, 1)', fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '-20px' }}>:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: 'rgba(36, 50, 77, 0.1)',
              opacity: 1,
              transform: 'rotate(0deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: '19px',
                lineHeight: '1.2',
                letterSpacing: '-0.02em',
                color: 'rgba(36, 50, 77, 1)',
                opacity: 1,
                transform: 'rotate(0deg)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {time.m}
            </span>
          </div>
          <span
            style={{
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 500,
              fontSize: '12px',
              lineHeight: '18px',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#000000',
              opacity: 1,
              transform: 'rotate(0deg)',
              marginTop: '4px',
              userSelect: 'none',
              display: 'block',
            }}
          >
            Minutes
          </span>
        </div>

        <span style={{ color: 'rgba(36, 50, 77, 1)', fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '-20px' }}>:</span>

        {/* Seconds */}
        <div className="flex flex-col items-center">
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              background: 'rgba(36, 50, 77, 0.1)',
              opacity: 1,
              transform: 'rotate(0deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: '19px',
                lineHeight: '1.2',
                letterSpacing: '-0.02em',
                color: 'rgba(36, 50, 77, 1)',
                opacity: 1,
                transform: 'rotate(0deg)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {time.s}
            </span>
          </div>
          <span
            style={{
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 500,
              fontSize: '12px',
              lineHeight: '18px',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#000000',
              opacity: 1,
              transform: 'rotate(0deg)',
              marginTop: '4px',
              userSelect: 'none',
              display: 'block',
            }}
          >
            Second
          </span>
        </div>
      </div>
    </div>
  );
};

/* ── Main Leaderboard Page ───────────────────────────────────── */
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
        const first = ['daily', 'weekly', 'monthly'].find((p) => data.leaderboard[p]?.enabled);
        if (first) setActiveTab((p) => p || first);
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
    ? ['daily', 'weekly', 'monthly'].filter((p) => leaderboard[p]?.enabled)
    : [];

  const currentData = activeTab && leaderboard ? leaderboard[activeTab] : null;
  const rankings = currentData?.rankings || [];
  const rewardTiers = currentData?.rewardTiers || [];
  const rewardedRanks = currentData?.rewardedRanks || 0;

  const top3 = [rankings[1], rankings[0], rankings[2]]; // Rank 2 (Left), Rank 1 (Middle), Rank 3 (Right)
  const others = rankings.slice(3);

  const getPrize = (rank) => {
    if (rank > rewardedRanks) return 0;
    return rewardTiers[rank - 1] || 0;
  };

  const renderUserRow = (user, rankNumber, isCurrent = false) => {
    const prize = getPrize(rankNumber);

    return (
      <div
        key={user.userId || rankNumber}
        onClick={() => setActiveProfileId(user.userId)}
        className="w-full max-w-[1102px] rounded-[20px] flex items-center justify-between hover:bg-[#F3EFE6] transition-colors cursor-pointer select-none"
        style={{
          width: '100%',
          maxWidth: '1102px',
          height: '72px',
          opacity: 1,
          transform: 'rotate(0deg)',
          borderRadius: '20px',
          paddingTop: '10px',
          paddingRight: '20px',
          paddingBottom: '10px',
          paddingLeft: '20px',
          background: 'rgba(249, 247, 241, 1)',
          boxSizing: 'border-box',
        }}
      >
        {/* Left: Rank + Avatar + Name */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {rankNumber ? (
            <span
              style={{
                width: '25px',
                height: '12px',
                opacity: 1,
                transform: 'rotate(0deg)',
                fontFamily: '"Baloo 2", cursive, sans-serif',
                fontWeight: 600,
                fontSize: '19.6px',
                lineHeight: '100%',
                letterSpacing: '-0.04em',
                textAlign: 'center',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              #{rankNumber}
            </span>
          ) : (
            <div style={{ width: '25px', height: '12px', flexShrink: 0 }} />
          )}

          <div
            style={{
              width: '52px',
              height: '52px',
              opacity: 1,
              transform: 'rotate(0deg)',
              borderRadius: '50%',
              overflow: 'hidden',
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
            className="bg-white shadow-sm"
          >
            <img
              src={user.avatarUrl || user.avatar || '/avatars/avatar1.png'}
              alt={user.displayName}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span
              style={{
                fontFamily: '"Baloo 2", cursive, sans-serif',
                fontWeight: 600,
                fontSize: '19.6px',
                lineHeight: '1.2',
                letterSpacing: '-0.04em',
                color: '#0E0F0C',
                opacity: 1,
                transform: 'rotate(0deg)',
                margin: 0,
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={user.displayName}
            >
              {user.displayName}
            </span>
            {isCurrent && (
              <span
                className="text-gray-500 font-medium text-[12px] sm:text-[13px] shrink-0"
                style={{ fontFamily: '"Poppins", sans-serif' }}
              >
                (you)
              </span>
            )}
          </div>
        </div>

        {/* Right: Earning + Prize */}
        <div className="flex items-center gap-8 sm:gap-14 shrink-0">
          {/* Earning */}
          <div className="flex flex-col items-start" style={{ width: '107.35px' }}>
            <span
              style={{
                width: '107.35px',
                height: '10px',
                opacity: 1,
                transform: 'rotate(0deg)',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '18px',
                letterSpacing: '0%',
                color: '#000000',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Earning
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <img
                src="/coins/ledcoin.png"
                alt="Coin"
                className="w-[14px] h-[14px] object-contain shrink-0"
              />
              <span
                style={{
                  width: 'auto',
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 600,
                  fontSize: '20px',
                  lineHeight: '1.2',
                  letterSpacing: '0%',
                  color: 'rgba(190, 146, 0, 1)',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.coinsEarned?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '0.0'}
              </span>
            </div>
          </div>

          {/* Prize */}
          <div className="flex flex-col items-start" style={{ width: '107.35px' }}>
            <span
              style={{
                width: '107.35px',
                height: '10px',
                opacity: 1,
                transform: 'rotate(0deg)',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '18px',
                letterSpacing: '0%',
                color: '#000000',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Prize
            </span>
            <div className="flex items-center gap-1.5 mt-1 min-h-[24px]">
              {prize > 0 ? (
                <>
                  <img
                    src="/coins/ledcoin.png"
                    alt="Coin"
                    className="w-[14px] h-[14px] object-contain shrink-0"
                  />
                  <span
                    style={{
                      width: 'auto',
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 600,
                      fontSize: '20px',
                      lineHeight: '1.2',
                      letterSpacing: '0%',
                      color: 'rgba(190, 146, 0, 1)',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {prize.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </>
              ) : (
                <span className="text-gray-300 text-[14px] font-medium">-</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout fullWidth={true} showLiveBar={true}>
      <div className="w-full flex flex-col items-center">
        {/* Top Hero Banner Section */}
        <div
          className="w-full flex justify-center items-center"
          style={{
            background: 'rgba(249, 247, 241, 1)',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          <div
            className="w-full max-w-[1440px] px-4 sm:px-8 pt-8 sm:pt-10 pb-8 sm:pb-10 flex flex-col items-center justify-center relative"
            style={{
              minHeight: '531px',
              opacity: 1,
              transform: 'rotate(0deg)',
              boxSizing: 'border-box',
            }}
          >
            {/* Header + Tabs Section (Whole Layout 387x110, gap 25px) */}
            <div
              className="flex flex-col items-center justify-center select-none"
              style={{
                width: '100%',
                maxWidth: '387px',
                minHeight: '110px',
                opacity: 1,
                transform: 'rotate(0deg)',
                gap: '25px',
                marginBottom: '32px',
                boxSizing: 'border-box',
              }}
            >
              {/* Heading and Text Wrapper (387x44, gap 16px) */}
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  width: '100%',
                  maxWidth: '387px',
                  height: '44px',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                  gap: '16px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Heading (163x18, 27px Bricolage Grotesque 700) */}
                <h1
                  style={{
                    width: '163px',
                    height: '18px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '27px',
                    lineHeight: '18px',
                    letterSpacing: '-0.02em',
                    textAlign: 'center',
                    color: '#000000',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Leaderboard
                </h1>

                {/* Subtitle (387x10, 14px Poppins 500) */}
                <p
                  style={{
                    width: '100%',
                    maxWidth: '387px',
                    height: '10px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '10px',
                    letterSpacing: '0%',
                    textAlign: 'center',
                    color: '#000000',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Top users ranked by earnings — win prizes every cycle!
                </p>
              </div>

              {/* Period Switcher Tabs */}
              {enabledPeriods.length > 0 && (
                <div
                  className="inline-flex items-center p-1 bg-white rounded-full border border-black/[0.06] shadow-sm"
                  style={{
                    borderRadius: '50px',
                    boxSizing: 'border-box',
                  }}
                >
                  {enabledPeriods.map((period) => {
                    const isActive = activeTab === period;
                    return (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setActiveTab(period)}
                        className="transition-all duration-200 cursor-pointer flex items-center justify-center select-none"
                        style={{
                          minWidth: '71px',
                          height: '31px',
                          borderRadius: '40px',
                          paddingTop: '11px',
                          paddingRight: '18px',
                          paddingBottom: '11px',
                          paddingLeft: '18px',
                          gap: '8px',
                          background: isActive ? 'rgba(36, 50, 77, 1)' : 'transparent',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: '"Bricolage Grotesque", sans-serif',
                            fontWeight: 700,
                            fontSize: '14px',
                            lineHeight: '100%',
                            letterSpacing: '0%',
                            color: isActive ? 'rgba(255, 255, 255, 1)' : '#000000',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {PERIOD_META[period]?.label || period}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Loading or Inactive or Podium Section */}
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
              </div>
            ) : enabledPeriods.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-[20px] max-w-md w-full border border-gray-100 shadow-sm">
                <FiLock className="text-4xl text-gray-400 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-gray-800 mb-1">Leaderboard Inactive</h2>
                <p className="text-gray-500 text-xs">Check back later for active cycles!</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab && currentData?.enabled && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="w-full flex flex-col items-center"
                  >
                    {/* Top 3 Podium Row (Whole Layout 801x190) */}
                    <div
                      className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 sm:gap-6 w-full relative select-none"
                      style={{
                        width: '100%',
                        maxWidth: '801px',
                        minHeight: '190px',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Rank 2 (Left) */}
                      <PodiumCard
                        rank={2}
                        user={top3[0]}
                        prize={getPrize(2)}
                        onClick={(uid) => setActiveProfileId(uid)}
                      />

                      {/* Rank 1 (Center) */}
                      <PodiumCard
                        rank={1}
                        user={top3[1]}
                        prize={getPrize(1)}
                        onClick={(uid) => setActiveProfileId(uid)}
                        isCenter={true}
                      />

                      {/* Rank 3 (Right) */}
                      <PodiumCard
                        rank={3}
                        user={top3[2]}
                        prize={getPrize(3)}
                        onClick={(uid) => setActiveProfileId(uid)}
                      />
                    </div>

                    {/* Countdown Timer Below Podium */}
                    {currentData?.cycleEnd && (
                      <div className="mt-2 sm:mt-3">
                        <LeaderboardCountdown targetDate={currentData.cycleEnd} />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Lower Section: Ranks #4 and below list */}
        {!loading && enabledPeriods.length > 0 && currentData?.enabled && (
          <div className="w-full max-w-[1102px] mx-auto mt-8 sm:mt-12 mb-12 sm:mb-16 flex flex-col gap-2.5 sm:gap-3 px-4 md:px-0 items-center">
            {!others.length && rankings.length <= 3 && (
              <div className="text-center py-10 text-gray-400 text-sm font-medium bg-white rounded-[20px] border border-gray-100">
                No other users on the leaderboard yet.
              </div>
            )}

            {others.map((user, idx) => {
              const currentRank = idx + 4;
              return (
                <React.Fragment key={user.userId || idx}>
                  {renderUserRow(user, currentRank)}

                  {/* Current user injected after position #5 if not in top list */}
                  {idx === 1 &&
                    currentData?.currentUser &&
                    !rankings.some((r) => String(r.userId) === String(currentData.currentUser.userId)) &&
                    renderUserRow(currentData.currentUser, null, true)}
                </React.Fragment>
              );
            })}

            {/* Current user at bottom if others list has fewer than 2 items */}
            {others.length < 2 &&
              currentData?.currentUser &&
              !rankings.some((r) => String(r.userId) === String(currentData.currentUser.userId)) &&
              renderUserRow(currentData.currentUser, null, true)}
          </div>
        )}
      </div>

      {/* User Public Profile Modal */}
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
