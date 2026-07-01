import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import toast from 'react-hot-toast';
import {
  FiClock,
  FiLock,
  FiCalendar,
  FiTrendingUp,
  FiRepeat,
} from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Period configurations ───────────────────────────────────────────────────
const PERIOD_CONFIG = {
  daily: {
    label: 'Daily',
    icon: FiCalendar,
  },
  weekly: {
    label: 'Weekly',
    icon: FiRepeat,
  },
  monthly: {
    label: 'Monthly',
    icon: FiTrendingUp,
  },
};

// ── Countdown hook (Figma format: 01d 14h 09m 06s) ──────────────────────────
function useCountdown(endsAt) {
  const calc = () => {
    if (!endsAt) return { timeLeft: '', isExpired: false };
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { timeLeft: '00h 00m 00s', isExpired: true };
    const totalSec = Math.floor(diff / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const fmt = (n) => String(n).padStart(2, '0');
    const timeLeft = d > 0
      ? `${fmt(d)}d ${fmt(h)}h ${fmt(m)}m ${fmt(s)}s`
      : `${fmt(h)}h ${fmt(m)}m ${fmt(s)}s`;
    return { timeLeft, isExpired: false };
  };

  const [state, setState] = useState(calc);

  useEffect(() => {
    setState(calc());
    if (!endsAt) return;
    const iv = setInterval(() => setState(calc()), 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);

  return state;
}

// ── MissionCard component ────────────────────────────────────────────────────
function MissionCard({ mission, onClaim, claiming }) {
  const pct = Math.min(100, Math.floor((mission.progress / mission.targetValue) * 100));
  const isClaiming = claiming === mission.userMissionId;

  // Icon selection helper
  const getMissionIcon = (label) => {
    const l = label.toLowerCase();
    if (l.includes('affiliate')) return '/coins/people.png';
    if (l.includes('featured')) return '/coins/gift.png';
    if (l.includes('survey')) return '/coins/clipboard.png';
    if (l.includes('visit')) return '/coins/globe.png';
    if (l.includes('invite')) return '/coins/person1.png';
    if (l.includes('check-in') || l.includes('daily')) return '/coins/calender.png';
    return '/coins/target.png';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => {
        if (mission.claimable && !isClaiming) {
          onClaim(mission.userMissionId);
        }
      }}
      className={`relative flex flex-col justify-between overflow-hidden transition-all duration-150 border border-white/[0.08] shrink-0 ${mission.claimable ? 'cursor-pointer hover:scale-[1.02] hover:border-[#49B265]/50 shadow-[0_0_15px_rgba(73,178,101,0.15)]' : ''
        }`}
      style={{
        width: '390.6666564941406px',
        height: '168px',
        gap: '16px',
        borderRadius: '20px',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.36)',
        backdropFilter: 'blur(44px)',
        boxShadow: '0px 4px 44px 0px rgba(0, 0, 0, 0.25)',
        opacity: 1
      }}
    >
      {/* Top row: Icon, title, description */}
      <div
        className="flex items-start shrink-0"
        style={{
          width: '358.6666564941406px',
          height: '70px',
          gap: '16px',
          opacity: 1
        }}
      >


        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <span
            className="text-white m-0 p-0"
            style={{
              width: '100%',
              height: 'auto',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              fontSize: '24px',
              lineHeight: '120%',
              letterSpacing: '0%',
              opacity: 1
            }}
          >
            {mission.label}
          </span>
          <span
            className="text-[#888888] m-0 p-0"
            style={{
              width: '100%',
              height: 'auto',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 500,
              fontSize: '17px',
              lineHeight: '120%',
              letterSpacing: '0%',
              opacity: 1,
              marginTop: '8px'
            }}
          >
            {mission.description}
          </span>
        </div>
      </div>

      {/* Bottom Block: Reward + Progress Info */}
      <div
        className="flex flex-col shrink-0"
        style={{
          width: '358.6666564941406px',
          height: '50px',
          gap: '12px',
          opacity: 1
        }}
      >
        <div
          className="flex items-center justify-between shrink-0"
          style={{
            width: '358.6666564941406px',
            height: '26px',
            opacity: 1
          }}
        >
          <div
            className="flex items-center shrink-0"
            style={{
              width: '59px',
              height: '26px',
              gap: '3px',
              opacity: 1
            }}
          >
            <img
              src="/coins/coinfinal.png"
              alt="Reward"
              className="shrink-0 object-contain overflow-visible"
              style={{
                width: '26px',
                height: '26px',
                opacity: 1,
                filter: 'drop-shadow(0px 0px 14px rgba(254, 198, 53, 0.6))'
              }}
            />
            <span
              className="font-bold text-[#FCB91E] flex items-center shrink-0 p-0 m-0"
              style={{
                width: '30px',
                height: '15px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '18px',
                lineHeight: '1',
                opacity: 1
              }}
            >
              {mission.rewardAmount}
            </span>
          </div>

          {mission.claimed ? (
            <span
              className="text-[#49B265] m-0 p-0"
              style={{
                width: 'auto',
                minWidth: '35px',
                height: 'auto',
                minHeight: '15px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '22px',
                lineHeight: '130%',
                letterSpacing: '0%',
                opacity: 1
              }}
            >
              Claimed
            </span>
          ) : mission.claimable ? (
            <button
              onClick={(e) => { e.stopPropagation(); onClaim(mission.userMissionId); }}
              disabled={isClaiming}
              className="flex items-center justify-center transition-all m-0 hover:bg-[#3da156] active:translate-y-[2px] active:shadow-none"
              style={{
                width: '85px',
                height: '24px',
                gap: '4px',
                borderRadius: '6px',
                padding: '0px',
                background: 'rgba(73, 178, 101, 1)',
                boxShadow: '0px 2px 0px 0px rgba(39, 109, 58, 1)',
                border: 'none',
                cursor: isClaiming ? 'not-allowed' : 'pointer',
                opacity: isClaiming ? 0.7 : 1
              }}
            >
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: '15px',
                  lineHeight: '100%',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap'
                }}
              >
                {isClaiming ? 'Claiming...' : 'Claim Reward'}
              </span>
            </button>
          ) : (
            <span
              className="text-white m-0 p-0 text-right"
              style={{
                width: 'auto',
                minWidth: '35px',
                height: 'auto',
                minHeight: '15px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '22px',
                lineHeight: '130%',
                letterSpacing: '0%',
                opacity: 1,
                whiteSpace: 'nowrap'
              }}
            >
              {mission.progress} / {mission.targetValue}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div
          className="bg-white/5 overflow-hidden shrink-0"
          style={{
            width: '358.6666564941406px',
            height: '12px',
            borderRadius: '30px',
            opacity: 1
          }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              background: '#49B265',
              borderRadius: '30px'
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ── Period Bonus Card ───────────────────────────────────────────────────────────────
function PeriodBonusCard({ bonus, period, onClaim, claimingBonus }) {
  if (!bonus) return null;

  const {
    enabled = true,
    bonusAmount = 0,
    totalMissions = 0,
    completedMissions = 0,
    claimed = false,
    claimable = false,
  } = bonus;

  if (!enabled || !bonusAmount) return null;

  // Since we only display up to 3 missions, let's clamp total to 3 in UI if needed
  const displayTotal = Math.min(3, totalMissions);
  const displayCompleted = Math.min(displayTotal, completedMissions);
  const pct = displayTotal > 0 ? Math.min(100, Math.round((displayCompleted / displayTotal) * 100)) : 0;
  const isClaiming = claimingBonus === period;

  return (
    <div
      className="flex flex-col md:flex-row items-center transition-all border border-white/[0.08]"
      style={{
        width: '100%',
        maxWidth: '1240px',
        height: '152px',
        gap: '40px',
        borderRadius: '20px',
        padding: '30px 40px',
        background: 'rgba(36, 36, 36, 1)',
        backdropFilter: 'blur(94px)',
        opacity: 1
      }}
    >
      {/* Left: Complete All Missions & Reward */}
      <div
        className="flex flex-col shrink-0"
        style={{
          width: '252px',
          height: '92px',
          justifyContent: 'space-between',
          opacity: 1
        }}
      >
        <span
          className="text-white font-bold m-0 p-0"
          style={{
            width: '172px',
            height: '29px',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '22px',
            lineHeight: '130%',
            letterSpacing: '0%',
            opacity: 1
          }}
        >
          Complete All Missions
        </span>
        <div
          className="flex items-end"
          style={{
            width: '142px',
            height: '52px',
            gap: '6px',
            opacity: 1
          }}
        >
          <img
            src="/coins/coinfix.png"
            alt="Coin"
            className="shrink-0 object-contain"
            style={{
              width: '52px',
              height: '52px',
              opacity: 1,
              marginBottom: '8px'
            }}
          />
          <span
            className="font-bold m-0 p-0 flex items-end shrink-0"
            style={{
              width: 'auto',
              minWidth: '84px',
              height: 'auto',
              minHeight: '49px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '70px',
              lineHeight: '120%',
              background: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {bonusAmount}
          </span>
        </div>
      </div>

      {/* Vertical Divider */}
      <div
        className="hidden md:block shrink-0"
        style={{
          width: '1px',
          height: '92px',
          background: 'rgba(255, 255, 255, 0.1)',
          opacity: 1
        }}
      />

      {/* Middle: Progress Text & Bar */}
      <div
        className="flex flex-col shrink-0"
        style={{
          width: '565px',
          height: '49px',
          gap: '20px',
          opacity: 1
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            width: '100%',
            height: '17px',
            opacity: 1
          }}
        >
          <span
            className="m-0 p-0 text-white"
            style={{
              width: 'auto',
              height: 'auto',
              minHeight: '15px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 500,
              fontSize: '22px',
              lineHeight: '130%',
              letterSpacing: '0%',
              whiteSpace: 'nowrap'
            }}
          >
            Complete all {displayTotal} missions to unlock this reward
          </span>
          <span
            className="m-0 p-0 text-[#FCB91E] text-right"
            style={{
              width: 'auto',
              height: 'auto',
              minHeight: '17px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '24px',
              lineHeight: '130%',
              letterSpacing: '0%',
              whiteSpace: 'nowrap'
            }}
          >
            {displayCompleted} / {displayTotal}
          </span>
        </div>
        <div
          className="bg-white/5 overflow-hidden shrink-0"
          style={{
            width: '565px',
            height: '12px',
            borderRadius: '30px',
            opacity: 1
          }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              background: '#49B265',
              borderRadius: '30px'
            }}
          />
        </div>
      </div>

      {/* Vertical Divider 2 */}
      <div
        className="hidden md:block shrink-0"
        style={{
          width: '1px',
          height: '92px',
          background: 'rgba(255, 255, 255, 0.1)',
          opacity: 1
        }}
      />

      {/* Right: Claim Button */}
      <div className="shrink-0">
        {claimed ? (
          <div
            className="flex items-center justify-center font-bold text-white"
            style={{
              width: '183px',
              height: '48px',
              gap: '10px',
              borderRadius: '10px',
              padding: '10px 30px',
              background: 'rgba(73, 178, 101, 1)',
              boxShadow: '0px 4px 0px 0px rgba(39, 109, 58, 1)',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '18px',
              opacity: 0.6
            }}
          >
            ✓ Claimed
          </div>
        ) : (
          <button
            onClick={() => { if (claimable) onClaim(period); }}
            disabled={!claimable || isClaiming}
            className={`transition-all flex items-center justify-center border-none ${claimable
                ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                : 'cursor-not-allowed opacity-80'
              }`}
            style={{
              width: '183px',
              height: '48px',
              gap: '10px',
              borderRadius: '10px',
              padding: '10px 30px',
              background: 'rgba(73, 178, 101, 1)',
              boxShadow: '0px 4px 0px 0px rgba(39, 109, 58, 1)',
              mixBlendMode: 'luminosity',
              opacity: 1,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '18px',
              color: 'white'
            }}
          >
            {!claimable && (
              <img
                src="/coins/lockpe.png"
                alt="Locked"
                className="shrink-0 object-contain"
                style={{
                  width: '24px',
                  height: '24px',
                  opacity: 1,
                  filter: 'brightness(0) invert(1)'
                }}
              />
            )}
            <span style={{ m: 0, p: 0 }}>
              {isClaiming ? 'Claiming...' : 'Claim Reward'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Period Section ──────────────────────────────────────────────────────────────────
function PeriodSection({ data, periodKey, periodCfg, bonus, onClaim, onClaimBonus, claiming, claimingBonus, onExpired }) {
  const { timeLeft, isExpired } = useCountdown(data?.endsAt);
  const missions = data?.missions || [];

  // Show exactly 3 missions (the user specified to show exactly three missions)
  const displayedMissions = missions.slice(0, 3);
  const completed = displayedMissions.filter(m => m.completed).length;

  useEffect(() => {
    if (isExpired && onExpired) onExpired();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpired]);

  return (
    <div className="flex flex-col w-[1240px] gap-[24px] shrink-0">
      <div
        className="flex flex-col gap-[18px] w-[1240px] h-auto p-[20px] shrink-0"
        style={{
          background: 'rgba(255, 255, 255, 0.14)',
          borderRadius: '20px',
        }}
      >
        {/* ── Period header ─────────────────────────────────── */}
        <div
          className="flex items-center justify-between w-full"
          style={{
            maxWidth: '1200px',
            height: '88px',
            gap: '16px',
            opacity: 1
          }}
        >
          <div className="flex items-center gap-[16px] h-full">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: '88px',
                height: '88px',
                gap: '6px',
                borderRadius: '10px',
                padding: '10px 12px',
                background: 'rgba(41, 253, 152, 0.1)',
                opacity: 1
              }}
            >
              <img
                src="/coins/target.png"
                alt="Missions"
                style={{
                  width: '44px',
                  height: '44px',
                  opacity: 1
                }}
                className="object-contain shrink-0"
              />
            </div>
            <div
              className="flex flex-col"
              style={{
                width: '100%',
                maxWidth: '834px',
                height: '85px',
                gap: '6px',
                opacity: 1
              }}
            >
              <h2
                className="text-white m-0 p-0"
                style={{
                  width: '100%',
                  maxWidth: '834px',
                  height: '50px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: '42px',
                  lineHeight: '120%',
                  letterSpacing: '0%',
                  opacity: 1
                }}
              >
                {periodCfg.label} Missions
              </h2>
              {!isExpired && (
                <p
                  className="m-0"
                  style={{
                    width: '100%',
                    maxWidth: '834px',
                    height: '29px',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 500,
                    fontSize: '22px',
                    lineHeight: '130%',
                    letterSpacing: '0%',
                    color: 'rgba(136, 136, 136, 1)',
                    opacity: 1
                  }}
                >
                  {completed}/{Math.min(3, displayedMissions.length)} completed
                </p>
              )}
            </div>
          </div>

          {/* Timer */}
          {!isExpired && timeLeft && (
            <div
              className="flex items-center shrink-0"
              style={{
                width: 'auto',
                minWidth: '246px',
                height: '48px',
                gap: '6px',
                borderRadius: '100px',
                padding: '12px 20px',
                background: 'rgba(73, 178, 101, 0.23)',
                opacity: 1
              }}
            >
              <img
                src="/coins/clock.png"
                alt="Clock"
                className="shrink-0 object-contain"
                style={{
                  width: '24px',
                  height: '24px',
                  opacity: 1
                }}
              />
              <span
                className="text-white m-0 p-0"
                style={{
                  width: 'auto',
                  height: '32px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600,
                  fontSize: '20px',
                  lineHeight: '32px',
                  letterSpacing: '0%',
                  whiteSpace: 'nowrap',
                  opacity: 1
                }}
              >
                Reset in {timeLeft}
              </span>
            </div>
          )}
        </div>

        {/* ── Expired state ── */}
        {isExpired ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center border border-white/[0.08]"
            style={{ background: 'rgba(0, 0, 0, 0.36)', backdropFilter: 'blur(44px)' }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
              style={{ background: 'rgba(73, 178, 101, 0.15)', border: '1px solid rgba(73, 178, 101, 0.4)' }}
            >
              <FiClock className="text-[#49B265] text-2xl" />
            </div>
            <p className="font-bold text-slate-100 text-base">{periodCfg.label} missions are refreshing…</p>
            <p className="text-slate-500 text-sm max-w-xs">
              The {periodCfg.label.toLowerCase()} period has ended. New missions will appear shortly.
            </p>
            <div
              className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#49B265]/10 text-[#49B265] border border-[#49B265]/20"
            >
              Refreshing automatically…
            </div>
          </motion.div>
        ) : displayedMissions.length === 0 ? (
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center border border-white/[0.08]"
            style={{ background: 'rgba(0, 0, 0, 0.36)', backdropFilter: 'blur(44px)' }}
          >
            <FiLock className="text-slate-600 text-3xl" />
            <p className="text-slate-500 text-sm font-medium">No {periodCfg.label.toLowerCase()} missions configured yet.</p>
            <p className="text-slate-600 text-xs">Check back later or contact support.</p>
          </div>
        ) : (
          <div
            className="flex items-center overflow-x-auto md:overflow-visible"
            style={{
              width: '100%',
              maxWidth: '1200px',
              height: '168px',
              gap: '14px',
              opacity: 1
            }}
          >
            {displayedMissions.map(mission => (
              <MissionCard
                key={mission.configId}
                mission={mission}
                onClaim={onClaim}
                claiming={claiming}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completion Bonus Footer */}
      {!isExpired && displayedMissions.length > 0 && (
        <PeriodBonusCard
          bonus={{ ...bonus, completedMissions: Math.max(bonus?.completedMissions || 0, completed) }}
          period={periodKey}
          onClaim={onClaimBonus}
          claimingBonus={claimingBonus}
        />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const MissionPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [periodBonus, setPeriodBonus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [claiming, setClaiming] = useState(null);
  const [claimingBonus, setClaimingBonus] = useState(null);

  const fetchMissions = useCallback(async () => {
    try {
      const token = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [missionsRes, bonusRes] = await Promise.all([
        fetch(`${API}/missions`, { headers }),
        fetch(`${API}/missions/period-bonus`, { headers }),
      ]);
      const [json, bonusJson] = await Promise.all([missionsRes.json(), bonusRes.json()]);

      if (json.disabled) {
        toast.error(json.error || 'Missions are currently disabled');
        navigate('/dashboard');
        return;
      }

      if (json.success) setData(json);
      if (bonusJson.success) setPeriodBonus(bonusJson.periodBonus);
    } catch {
      toast.error('Failed to load missions');
    } finally {
      setLoading(false);
    }
  }, [currentUser, navigate]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

  const handleClaim = async (userMissionId) => {
    if (claiming || !userMissionId) return;
    setClaiming(userMissionId);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/missions/claim/${userMissionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`🎯 +${json.rewardAmount.toLocaleString()} coins claimed!`);
        fetchMissions();
      } else if (json.expired) {
        toast.error('⏰ Mission period has expired — reward forfeited.');
        fetchMissions();
      } else {
        toast.error(json.error || 'Failed to claim reward');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setClaiming(null);
    }
  };

  const handleBonusClaim = async (period) => {
    if (claimingBonus) return;
    setClaimingBonus(period);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/missions/period-bonus/claim/${period}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`🏆 +${json.rewardAmount.toLocaleString()} bonus coins claimed!`);
        fetchMissions();
      } else if (json.expired) {
        toast.error('⏰ Period expired — bonus forfeited.');
        fetchMissions();
      } else {
        toast.error(json.error || 'Failed to claim bonus');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setClaimingBonus(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-[#49B265]/30 border-t-[#49B265] rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const tabs = ['daily', 'weekly', 'monthly'];

  return (
    <DashboardLayout>
      <div className="w-full max-w-[1240px] mx-auto space-y-8 pb-20 pt-4">

        {/* Heading Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative w-[1240px] h-[122px] shrink-0">
          <div
            className="flex flex-col justify-start"
            style={{
              width: '745px',
              height: '122px',
              gap: '6px'
            }}
          >
            <h1
              className="m-0 p-0 text-white"
              style={{
                width: '745px',
                height: '82px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '68px',
                lineHeight: '120%',
                letterSpacing: '0%'
              }}
            >
              Missions
            </h1>
            <p
              className="m-0 p-0"
              style={{
                width: '745px',
                height: '34px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 500,
                fontSize: '26px',
                lineHeight: '130%',
                letterSpacing: '0%',
                color: 'rgba(136, 136, 136, 1)'
              }}
            >
              Complete missions to earn bonus coins. Rewards expire at the end of each period.
            </p>
          </div>

          {/* Right side illustration */}
          <div
            className="hidden md:block absolute pointer-events-none"
            style={{
              width: '392px',
              height: '200px',
              right: '-13px',
              bottom: '-38px',
              opacity: 1,
              zIndex: 0,
              transform: 'scale(1.15)',
              transformOrigin: 'right bottom',
              WebkitMaskImage: 'linear-gradient(180deg, #D9D9D9 65%, rgba(115, 115, 115, 0) 100%)',
              maskImage: 'linear-gradient(180deg, #D9D9D9 65%, rgba(115, 115, 115, 0) 100%)'
            }}
          >
            <img
              src="/coins/missionpage.png"
              alt="Missions"
              className="absolute inset-0 w-full h-full object-contain object-right z-10"
            />
            <div
              className="absolute inset-0 z-20 mix-blend-color"
              style={{
                backgroundColor: 'rgba(73, 178, 101, 1)',
                WebkitMaskImage: 'url(/coins/missionpage.png)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'right',
                maskImage: 'url(/coins/missionpage.png)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'right'
              }}
            />
          </div>
        </div>

        {/* Tab Layout Container (width: 1240, height: auto, gap: 20) */}
        <div 
          className="flex flex-col gap-[20px] w-[1240px] md:h-auto shrink-0"
        >
          {/* ── Tab Bar ──────────────────────────────────────────── */}
          <div
            className="flex items-center shrink-0 w-[1240px]"
            style={{
              background: 'rgba(44, 45, 44, 1)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0px 4px 44px 0px rgba(0, 0, 0, 0.25)',
              borderRadius: '10px',
              padding: '18px',
              height: '84px',
              opacity: 1
            }}
          >
            <div
              className="flex items-center w-full h-full"
              style={{
                borderRadius: '100px',
                width: '100%',
                maxWidth: '1204px',
                height: '48px',
              }}
            >
              {tabs.map(tab => {
                const cfg = PERIOD_CONFIG[tab];
                const isActive = activeTab === tab;
                const tabData = data?.[tab];
                const claimableCount = (tabData?.missions || []).filter(m => m.claimable).length
                  + (periodBonus?.[tab]?.claimable ? 1 : 0);

                return (
                  <button
                    key={tab}
                    id={`missions-tab-${tab}`}
                    onClick={() => setActiveTab(tab)}
                    className="relative flex items-center justify-center transition-all border-none cursor-pointer flex-1"
                    style={{
                      height: '48px',
                      background: isActive ? 'rgba(73, 178, 101, 1)' : 'transparent',
                      color: 'rgba(255, 255, 255, 1)',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: '20px',
                      fontWeight: 700,
                      lineHeight: '32px',
                      letterSpacing: '0%',
                      borderRadius: isActive ? '10px' : '0px',
                      boxShadow: isActive ? '0px 4px 0px 0px rgba(39, 109, 58, 1)' : 'none',
                      padding: '10px 20px',
                      gap: '10px'
                    }}
                  >
                    {cfg.label}
                    {claimableCount > 0 && (
                      <span
                        className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white"
                        style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.6)' }}
                      >
                        {claimableCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Tab Content ──────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="w-[1240px] shrink-0"
            >
              <PeriodSection
                data={data?.[activeTab]}
                periodKey={activeTab}
                periodCfg={PERIOD_CONFIG[activeTab]}
                bonus={periodBonus?.[activeTab] || null}
                onClaim={handleClaim}
                onClaimBonus={handleBonusClaim}
                claiming={claiming}
                claimingBonus={claimingBonus}
                onExpired={fetchMissions}
              />
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default MissionPage;
