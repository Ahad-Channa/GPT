import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getLevelFromEarned } from '../../utils/vipLevels';
import VipBadge from '../VipBadge';
import { useNotifications } from '../../contexts/NotificationContext';
import { useDailyBonus } from '../../contexts/DailyBonusContext';
import { FiLogOut, FiUser, FiSettings, FiZap, FiChevronDown, FiCreditCard, FiLock, FiClock, FiBell, FiUsers, FiGift, FiDollarSign, FiMessageSquare, FiTarget, FiStar } from 'react-icons/fi';
import { FaTrophy } from 'react-icons/fa6';
import CoinDisplay from '../CoinDisplay';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const NavItem = ({ path, icon, label }) => {
  const location = useLocation();
  const navigate = useNavigate();
  // Consider /dashboard exact match or sub-paths appropriately. Let's do exact match.
  const isActive = location.pathname === path;

  return (
    <button
      onClick={() => navigate(path)}
      className="hidden lg:flex items-center justify-center transition-all cursor-pointer group"
      style={{
        height: '48px',
        padding: '10px 18px',
        borderRadius: '10px',
        gap: '10px',
        background: isActive ? 'rgba(73, 178, 101, 1)' : 'transparent',
        boxShadow: isActive ? '0px 4px 0px 0px rgba(39, 109, 58, 1)' : 'none',
        border: 'none',
        minWidth: '104px'
      }}
    >
      <img
        src={icon}
        alt={label}
        className="w-[18px] h-[18px] object-contain transition-all"
        style={isActive ? { filter: 'brightness(0) invert(1)' } : {}}
      />
      <span
        className="text-white"
        style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 600,
          fontSize: '20px',
          lineHeight: '32px',
          height: '32px',
        }}
      >
        {label}
      </span>
    </button>
  );
};

const DailyBonusChip = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { status, loading, fetchStatus } = useDailyBonus();
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const location = useLocation();
  const isActive = location.pathname === '/dashboard/daily-bonus';

  const baseStyle = {
    height: '48px',
    padding: '10px 18px',
    borderRadius: '10px',
    gap: '10px',
    background: isActive ? 'rgba(73, 178, 101, 1)' : 'transparent',
    boxShadow: isActive ? '0px 4px 0px 0px rgba(39, 109, 58, 1)' : 'none',
    border: 'none',
    minWidth: '104px'
  };

  useEffect(() => {
    if (!status?.nextClaimAt || !status.alreadyClaimed) return;
    const target = new Date(status.nextClaimAt).getTime();
    const Barlowval = setInterval(() => {
      const distance = target - Date.now();
      if (distance < 0) { clearInterval(Barlowval); setTimeLeft('00:00:00'); fetchStatus(); return; }
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(Barlowval);
  }, [status]);

  const claimBonus = async () => {
    setClaiming(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/wallet/daily-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchStatus();
    } catch (err) {
      console.error('Failed to claim bonus', err);
    } finally {
      setClaiming(false);
    }
  };

  if (loading || !status) {
    return <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] animate-pulse h-[34px] w-28" />;
  }

  // Already claimed — countdown
  if (status.alreadyClaimed) {
    return (
      <button
        onClick={() => navigate('/dashboard/daily-bonus')}
        className="hidden lg:flex items-center justify-center transition-all cursor-pointer group"
        style={baseStyle}
      >
        <img
          src="/coins/gift1.png"
          alt="Daily Bonus"
          className="w-[18px] h-[18px] object-contain transition-all"
          style={isActive ? { filter: 'brightness(0) invert(1)' } : {}}
        />
        <span
          className="text-white"
          style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 600,
            fontSize: '20px',
            lineHeight: '32px',
            height: '32px',
          }}
        >
          {timeLeft || '...'}
        </span>
      </button>
    );
  }

  // Gate unlocked — very prominent pulsing claim button
  if (status.gateUnlocked) {
    return (
      <button
        onClick={claimBonus}
        disabled={claiming}
        className="hidden lg:flex relative items-center justify-center font-bold text-[15px] text-white disabled:opacity-60 overflow-hidden group border-none"
        style={{ ...baseStyle, background: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)', boxShadow: '0px 4px 10px 0px rgba(252, 185, 30, 0.5)', animation: 'bonusPulse 1.8s ease-in-out infinite' }}
      >
        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-600" />
        <img
          src="/coins/gift1.png"
          alt="Daily Bonus"
          className="w-[18px] h-[18px] object-contain relative z-10"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        <span
          className="relative z-10 text-white"
          style={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 600,
            fontSize: '20px',
            lineHeight: '32px',
            height: '32px',
          }}
        >
          {claiming ? 'Claiming…' : 'Claim Bonus!'}
        </span>
      </button>
    );
  }

  // Gate locked — button with inline progress bar
  const progressPercent = Math.min(100, Math.floor((status.earned / status.required) * 100));

  return (
    <button
      onClick={() => navigate('/dashboard/daily-bonus')}
      className="hidden lg:flex items-center justify-center transition-all cursor-pointer group relative overflow-visible"
      style={baseStyle}
    >
      <img
        src="/coins/gift1.png"
        alt="Daily Bonus"
        className="w-[18px] h-[18px] object-contain transition-all"
        style={isActive ? { filter: 'brightness(0) invert(1)' } : {}}
      />
      <span
        className="text-white"
        style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 600,
          fontSize: '20px',
          lineHeight: '32px',
          height: '32px',
        }}
      >
        Daily Bonus
      </span>
      <div className="relative flex items-center justify-center shrink-0 ml-1" style={{ width: '30px', height: '30px' }}>
        <svg width="30" height="30" viewBox="0 0 30 30" className="absolute inset-0 transform -rotate-90">
          <circle cx="15" cy="15" r="13" fill="black" stroke="#222" strokeWidth="4" />
          <circle
            cx="15" cy="15" r="13"
            fill="transparent"
            stroke="#49B265"
            strokeWidth="4"
            strokeDasharray={2 * Math.PI * 13}
            strokeDashoffset={2 * Math.PI * 13 * (1 - progressPercent / 100)}
            strokeLinecap="round"
          />
        </svg>
        <span className="relative z-10 text-[9px] text-[#49B265] font-bold leading-none">{progressPercent}%</span>
      </div>

      {/* Hover tooltip */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-52 p-3 rounded-xl bg-[#0b101e] border border-[#49B265]/30 shadow-[0_0_15px_rgba(73,178,101,0.15)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-left">
        <p className="text-xs text-slate-300 mb-2">
          Earn <span className="font-bold text-white"><CoinDisplay amount={status.required - status.earned} showIcon={true} size={12} /></span> more to unlock.
        </p>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
          <div className="bg-[#49B265] h-full rounded-full" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{status.earned.toLocaleString()} earned</span>
          <span>{status.required.toLocaleString()} needed</span>
        </div>
      </div>
    </button>
  );
};

const Header = ({ onChatToggle, chatOpen }) => {
  const { currentUser, mongoUser, logout, isAdmin } = useAuth();
  const { unreadCount, togglePanel } = useNotifications();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [missionsEnabled, setMissionsEnabled] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/public/stats`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setMissionsEnabled(d.missionsEnabled ?? true);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full transition-all" style={{
      height: '84px',
      background: 'black',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      boxShadow: '0px 4px 44px 0px rgba(0, 0, 0, 0.25)'
    }}>
      <div className="h-full max-w-[1240px] mx-auto flex items-center justify-between px-6 md:px-8 w-full">

        {/* Group 1: Brand */}
        <button
          id="header-brand-logo"
          onClick={() => navigate('/')}
          className="flex items-center cursor-pointer transition-transform hover:scale-105"
          style={{ width: '191.5026397705078px', height: '53.98556137084961px', gap: '7.28px', border: 'none', background: 'transparent', padding: 0 }}
        >
          <img
            src="/coins/logo copy.png"
            alt="TaskMint Logo"
            style={{ width: '53.9856071472168px', height: '53.98556137084961px', objectFit: 'contain' }}
          />
          <span
            className="text-white font-bold hidden sm:flex items-center"
            style={{
              width: '130.2213897705078px',
              height: '30.150362014770508px',
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: '36px',
              lineHeight: '30.15px',
              letterSpacing: '1.5px'
            }}
          >
            TaskMint
          </span>
        </button>



        {/* Group 2: Main Links */}
        <div
          className="hidden lg:flex items-center justify-between"
          style={{ width: '708.0146484375px', height: '48px', borderRadius: '100px' }}
        >

          <NavItem path="/dashboard" icon="/coins/paisa.png" label="Earn" />
          <DailyBonusChip />
          <NavItem path="/dashboard/leaderboard" icon="/coins/cup.png" label="Leaderboard" />
          <NavItem path="/dashboard/affiliates" icon="/coins/person1.png" label="Affiliates" />
          <NavItem path="/dashboard/wallet" icon="/coins/wallet1.png" label="Withdraw" />

        </div>

        {/* Group 3: User Actions */}
        <div
          className="flex items-center"
          style={{ width: '245.5px', height: '48px', gap: '8px' }}
        >
          {/* Live Chat Button → sidebar */}
          <button
            id="header-livechat-btn"
            onClick={onChatToggle}
            className={`relative flex-shrink-0 flex items-center justify-center transition-colors group ${chatOpen
              ? 'bg-[#49B265]/20'
              : 'bg-transparent hover:bg-white/5'
              }`}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              border: '1px solid rgba(73, 178, 101, 0.4)'
            }}
          >
            <img
              src={chatOpen ? '/coins/chatOn.png' : '/coins/chat.png'}
              alt="Chat"
              style={{
                width: '24px',
                height: '24px',
                objectFit: 'contain',
                filter: !chatOpen ? 'brightness(0) saturate(100%) invert(59%) sepia(33%) saturate(1030%) hue-rotate(86deg) brightness(93%) contrast(87%)' : 'none'
              }}
            />
          </button>

          {/* Notifications */}
          <button
            id="header-notifications-btn"
            onClick={togglePanel}
            className="relative flex-shrink-0 flex items-center justify-center bg-transparent hover:bg-white/5 transition-colors group"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              border: '1px solid rgba(73, 178, 101, 0.4)'
            }}
          >
            <img
              src="/coins/noti.png"
              alt="Notifications"
              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
            />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#49B265] rounded-full shadow-[0_0_8px_rgba(73,178,101,0.8)]" />
            )}
          </button>

          {/* Avatar + Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="header-profile-menu"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center hover:bg-white/[0.05] transition-colors group flex-shrink-0"
              style={{
                minWidth: '133.5px',
                width: 'auto',
                height: '48px',
                borderRadius: '10px',
                padding: '12px 16px 12px 8.5px',
                gap: '6px',
                border: '1px solid rgba(73, 178, 101, 0.4)'
              }}
            >
              <div
                className="rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-[#111827]"
                style={{ width: '31px', height: '31px' }}
              >
                <img
                  src={mongoUser?.avatarUrl || currentUser?.photoURL || `/avatars/avatar1.png`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="hidden md:flex flex-col items-start justify-center flex-1 overflow-visible"
                style={{ minWidth: '42px', width: 'auto', height: '26px', gap: '4px' }}
              >
                <span
                  className="text-white text-left"
                  style={{
                    width: '43px',
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 600,
                    fontSize: '14px',
                    lineHeight: '1',
                    display: 'block'
                  }}
                >
                  {mongoUser?.displayName || 'User'}
                </span>
                <span
                  className="flex items-center"
                  style={{ minWidth: '39px', width: 'auto', height: 'auto', gap: '3px' }}
                >
                  <img
                    src="/coins/coinfinal.png"
                    alt="Coin"
                    style={{ width: '12px', height: '12px', objectFit: 'contain', flexShrink: 0 }}
                  />
                  <span style={{
                    minWidth: '24px',
                    width: 'auto',
                    height: 'auto',
                    paddingTop: '2px',
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 700,
                    fontSize: '12px',
                    lineHeight: '130%',
                    background: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'visible',
                    whiteSpace: 'nowrap'
                  }}>
                    {mongoUser?.walletBalance?.toLocaleString() ?? 0}
                  </span>
                </span>
              </div>
              <img
                src="/coins/arrow.png"
                alt="Dropdown Arrow"
                className={`transition-transform duration-200 flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
                style={{
                  width: '24px',
                  height: '24px',
                  objectFit: 'contain',
                  filter: 'brightness(0) saturate(100%) invert(59%) sepia(33%) saturate(1030%) hue-rotate(86deg) brightness(93%) contrast(87%)'
                }}
              />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-50 flex flex-col backdrop-blur-[44px]"
                  style={{
                    width: '171px',
                    top: '58px',
                    background: 'rgba(36, 36, 36, 1)',
                    borderRadius: '12px',
                    padding: '12px',
                    gap: '12px',
                    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  {/* Balance (mobile) */}
                  <div className="sm:hidden px-1 pb-1 flex items-center gap-2 border-b border-white/5">
                    <FiZap className="text-indigo-400 text-xs" />
                    <span className="text-slate-300 text-xs font-mono">
                      {mongoUser?.walletBalance?.toFixed(2) ?? '0.00'} PTS
                    </span>
                  </div>

                  {/* My Profile */}
                  <button
                    id="header-profile-link-nav"
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/profile'); }}
                    className="text-left text-white/95 hover:text-white transition-colors flex items-center shrink-0 cursor-pointer"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      width: '147px',
                      height: '22px',
                      gap: '8px',
                      opacity: 1
                    }}
                  >
                    <img
                      src="/coins/profile.png"
                      alt="Profile"
                      className="shrink-0 object-contain"
                      style={{
                        width: '22px',
                        height: '22px',
                        opacity: 1
                      }}
                    />
                    <span
                      className="font-['Barlow_Condensed'] flex items-center overflow-visible whitespace-nowrap text-white"
                      style={{
                        width: '47px',
                        height: '19px',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
                        fontSize: '16px',
                        lineHeight: '120%',
                        letterSpacing: '0%',
                        verticalAlign: 'middle',
                        opacity: 1
                      }}
                    >
                      My Profile
                    </span>
                  </button>

                  <div className="w-full h-[1px] bg-white/5 shrink-0" />

                  {/* VIP Status */}
                  <button
                    id="header-vip-link-nav"
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/vip'); }}
                    className="text-left text-white/95 hover:text-white transition-colors flex items-center shrink-0 cursor-pointer"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      width: '147px',
                      height: '22px',
                      gap: '8px',
                      opacity: 1
                    }}
                  >
                    <img
                      src="/coins/vipstar.png"
                      alt="VIP Status"
                      className="shrink-0 object-contain"
                      style={{
                        width: '22px',
                        height: '22px',
                        opacity: 1
                      }}
                    />
                    <span
                      className="font-['Barlow_Condensed'] flex items-center overflow-visible whitespace-nowrap text-white"
                      style={{
                        width: '47px',
                        height: '19px',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
                        fontSize: '16px',
                        lineHeight: '120%',
                        letterSpacing: '0%',
                        verticalAlign: 'middle',
                        opacity: 1
                      }}
                    >
                      VIP Status
                    </span>
                  </button>

                  <div className="w-full h-[1px] bg-white/5 shrink-0" />

                  {/* Missions */}
                  {missionsEnabled && (
                    <>
                      <button
                        id="header-missions-link-nav"
                        onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/missions'); }}
                        className="text-left text-white/95 hover:text-white transition-colors flex items-center shrink-0 cursor-pointer"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          width: '147px',
                          height: '22px',
                          gap: '8px',
                          opacity: 1
                        }}
                      >
                        <img
                          src="/coins/target.png"
                          alt="Missions"
                          className="shrink-0 object-contain"
                          style={{
                            width: '22px',
                            height: '22px',
                            opacity: 1
                          }}
                        />
                        <span
                          className="font-['Barlow_Condensed'] flex items-center overflow-visible whitespace-nowrap text-white"
                          style={{
                            width: '47px',
                            height: '19px',
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 600,
                            fontSize: '16px',
                            lineHeight: '120%',
                            letterSpacing: '0%',
                            verticalAlign: 'middle',
                            opacity: 1
                          }}
                        >
                          Missions
                        </span>
                      </button>
                      <div className="w-full h-[1px] bg-white/5 shrink-0" />
                    </>
                  )}

                  {/* Admin Panel */}
                  {isAdmin && (
                    <>
                      <button
                        id="header-admin-link"
                        onClick={() => { setIsDropdownOpen(false); navigate('/admin'); }}
                        className="text-left text-amber-400 hover:text-amber-300 transition-colors flex items-center shrink-0 cursor-pointer"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          width: '147px',
                          height: '22px',
                          gap: '8px',
                          opacity: 1
                        }}
                      >
                        <div
                          className="flex items-center justify-center shrink-0"
                          style={{
                            width: '22px',
                            height: '22px',
                            opacity: 1
                          }}
                        >
                          <FiSettings className="text-amber-400 text-sm" />
                        </div>
                        <span
                          className="font-['Barlow_Condensed'] flex items-center overflow-visible whitespace-nowrap text-amber-400"
                          style={{
                            width: '47px',
                            height: '19px',
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 600,
                            fontSize: '16px',
                            lineHeight: '120%',
                            letterSpacing: '0%',
                            verticalAlign: 'middle',
                            opacity: 1
                          }}
                        >
                          Admin Panel
                        </span>
                      </button>
                      <div className="w-full h-[1px] bg-white/5 shrink-0" />
                    </>
                  )}

                  {/* Sign Out */}
                  <button
                    id="header-logout-btn"
                    onClick={() => { setIsDropdownOpen(false); logout(); }}
                    className="text-left text-red-400 hover:text-red-300 transition-colors flex items-center shrink-0 cursor-pointer"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      width: '147px',
                      height: '22px',
                      gap: '8px',
                      opacity: 1
                    }}
                  >
                    <img
                      src="/coins/logout.png"
                      alt="Sign Out"
                      className="shrink-0 object-contain"
                      style={{
                        width: '22px',
                        height: '22px',
                        opacity: 1
                      }}
                    />
                    <span
                      className="font-['Barlow_Condensed'] flex items-center overflow-visible whitespace-nowrap text-red-400"
                      style={{
                        width: '47px',
                        height: '19px',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
                        fontSize: '16px',
                        lineHeight: '120%',
                        letterSpacing: '0%',
                        verticalAlign: 'middle',
                        opacity: 1
                      }}
                    >
                      Sign Out
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
