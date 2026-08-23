import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getLevelFromEarned } from '../../utils/vipLevels';
import VipBadge from '../VipBadge';
import { useNotifications } from '../../contexts/NotificationContext';
import { useDailyBonus } from '../../contexts/DailyBonusContext';
import { FiLogOut, FiUser, FiSettings, FiZap, FiChevronDown, FiCreditCard, FiLock, FiClock, FiBell, FiUsers, FiGift, FiDollarSign, FiMessageSquare, FiTarget, FiStar, FiMenu, FiX } from 'react-icons/fi';
import { FaTrophy } from 'react-icons/fa6';
import CoinDisplay from '../CoinDisplay';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FitText from '../FitText';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const NavItem = ({ path, label }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === path;

  return (
    <button
      onClick={() => navigate(path)}
      className="hidden lg:flex items-center justify-center transition-all cursor-pointer hover:opacity-75"
      style={{
        fontFamily: 'Poppins, sans-serif',
        fontWeight: 500,
        fontSize: '16px',
        lineHeight: '28px',
        letterSpacing: '0%',
        color: 'rgba(14, 15, 12, 1)',
        background: 'transparent',
        border: 'none',
        padding: 0,
        opacity: 1,
        transform: 'rotate(0deg)',
      }}
    >
      {label}
    </button>
  );
};

// --- Mobile Header Inline Nav Item (compact, visible only below lg in header bar)
const MobileHeaderNavItem = ({ path, icon, label }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === path;

  return (
    <button
      onClick={() => navigate(path)}
      className="lg:hidden flex items-center justify-center transition-all cursor-pointer"
      style={{
        height: '26px',
        padding: '3px 7px',
        borderRadius: '6px',
        gap: '3px',
        background: isActive ? 'rgba(73, 178, 101, 1)' : 'transparent',
        boxShadow: isActive ? '0px 2px 0px 0px rgba(39, 109, 58, 1)' : 'none',
        border: 'none',
      }}
    >
      <img
        src={icon}
        alt={label}
        className="w-[12px] h-[12px] object-contain"
        style={isActive ? { filter: 'brightness(0) invert(1)' } : {}}
      />
      <span
        className="text-white"
        style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 600,
          fontSize: '11px',
          lineHeight: '14px',
        }}
      >
        {label}
      </span>
    </button>
  );
};

// --- Mobile Nav Item (visible only in mobile collapsible menu)
const MobileNavItem = ({ path, icon, label, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === path;

  return (
    <button
      onClick={() => { navigate(path); onClose(); }}
      className="flex items-center w-full transition-all cursor-pointer"
      style={{
        height: '36px',
        padding: '6px 14px',
        borderRadius: '8px',
        gap: '8px',
        background: isActive ? 'rgba(73, 178, 101, 1)' : 'transparent',
        boxShadow: isActive ? '0px 2px 0px 0px rgba(39, 109, 58, 1)' : 'none',
        border: 'none',
      }}
    >
      <img
        src={icon}
        alt={label}
        className="w-[16px] h-[16px] object-contain"
        style={isActive ? { filter: 'brightness(0) invert(1)' } : {}}
      />
      <span
        className="text-white"
        style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 600,
          fontSize: '14px',
          lineHeight: '20px',
        }}
      >
        {label}
      </span>
    </button>
  );
};

// --- Mobile Daily Bonus Chip (visible only in mobile collapsible menu)
const MobileDailyBonusChip = ({ onClose }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { status, loading, fetchStatus } = useDailyBonus();
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const location = useLocation();
  const isActive = location.pathname === '/dashboard/daily-bonus';

  const baseStyle = {
    height: '36px',
    padding: '6px 14px',
    borderRadius: '8px',
    gap: '8px',
    background: isActive ? 'rgba(73, 178, 101, 1)' : 'transparent',
    boxShadow: isActive ? '0px 2px 0px 0px rgba(39, 109, 58, 1)' : 'none',
    border: 'none',
    width: '100%',
  };

  useEffect(() => {
    if (!status?.nextClaimAt || !status.alreadyClaimed) return;
    const target = new Date(status.nextClaimAt).getTime();
    const interval = setInterval(() => {
      const distance = target - Date.now();
      if (distance < 0) { clearInterval(interval); setTimeLeft('00:00:00'); fetchStatus(); return; }
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
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
    return <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] animate-pulse h-[36px] w-full" />;
  }

  if (status.alreadyClaimed) {
    return (
      <button
        onClick={() => { navigate('/dashboard/daily-bonus'); onClose(); }}
        className="flex items-center w-full transition-all cursor-pointer"
        style={baseStyle}
      >
        <img src="/coins/gift1.png" alt="Daily Bonus" className="w-[16px] h-[16px] object-contain" style={isActive ? { filter: 'brightness(0) invert(1)' } : {}} />
        <span className="text-white" style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontSize: '14px', lineHeight: '20px' }}>
          {timeLeft || '...'}
        </span>
      </button>
    );
  }

  if (status.gateUnlocked) {
    return (
      <button
        onClick={() => { claimBonus(); }}
        disabled={claiming}
        className="flex items-center w-full font-bold text-white disabled:opacity-60 overflow-hidden relative border-none"
        style={{ ...baseStyle, background: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)', boxShadow: '0px 4px 10px 0px rgba(252, 185, 30, 0.5)' }}
      >
        <img src="/coins/gift1.png" alt="Daily Bonus" className="w-[16px] h-[16px] object-contain relative z-10" style={{ filter: 'brightness(0) invert(1)' }} />
        <span className="relative z-10 text-white" style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontSize: '14px', lineHeight: '20px' }}>
          {claiming ? 'Claiming…' : 'Claim Bonus!'}
        </span>
      </button>
    );
  }

  const progressPercent = Math.min(100, Math.floor((status.earned / status.required) * 100));
  return (
    <button
      onClick={() => { navigate('/dashboard/daily-bonus'); onClose(); }}
      className="flex items-center w-full transition-all cursor-pointer relative overflow-visible"
      style={baseStyle}
    >
      <img src="/coins/gift1.png" alt="Daily Bonus" className="w-[16px] h-[16px] object-contain" style={isActive ? { filter: 'brightness(0) invert(1)' } : {}} />
      <span className="text-white" style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontSize: '14px', lineHeight: '20px' }}>
        Daily Bonus
      </span>
      <div className="relative flex items-center justify-center shrink-0 ml-auto" style={{ width: '24px', height: '24px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" className="absolute inset-0 transform -rotate-90">
          <circle cx="12" cy="12" r="10" fill="black" stroke="#222" strokeWidth="3" />
          <circle cx="12" cy="12" r="10" fill="transparent" stroke="#49B265" strokeWidth="3" strokeDasharray={2 * Math.PI * 10} strokeDashoffset={2 * Math.PI * 10 * (1 - progressPercent / 100)} strokeLinecap="round" />
        </svg>
        <span className="relative z-10 text-[8px] text-[#49B265] font-bold leading-none">{progressPercent}%</span>
      </div>
    </button>
  );
};

const DailyBonusChip = () => {
  const navigate = useNavigate();
  const { status, loading } = useDailyBonus();

  const progressPercent = (!loading && status && status.required > 0)
    ? Math.min(100, Math.floor(((status.earned || 0) / status.required) * 100))
    : 0;

  const displayPercent = status?.alreadyClaimed
    ? 100
    : status?.gateUnlocked
      ? 100
      : progressPercent;

  return (
    <button
      onClick={() => navigate('/dashboard/daily-bonus')}
      className="hidden lg:flex items-center gap-[8px] transition-all cursor-pointer hover:opacity-75"
      style={{
        fontFamily: 'Poppins, sans-serif',
        fontWeight: 500,
        fontSize: '16px',
        lineHeight: '28px',
        letterSpacing: '0%',
        color: 'rgba(14, 15, 12, 1)',
        background: 'transparent',
        border: 'none',
        padding: 0,
        opacity: 1,
        transform: 'rotate(0deg)',
      }}
    >
      <span>Daily Bonus</span>
      <div
        className="flex flex-col items-center justify-center"
        style={{
          gap: '1px',
          opacity: 1,
          transform: 'rotate(0deg)',
        }}
      >
        <span
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 600,
            fontSize: '13px',
            lineHeight: '14px',
            color: 'rgba(0, 162, 71, 1)',
          }}
        >
          {displayPercent}%
        </span>
        <div
          className="rounded-full overflow-hidden relative"
          style={{
            width: '46px',
            height: '4px',
            background: 'rgba(223, 225, 209, 1)',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${displayPercent}%`,
              background: 'rgba(0, 162, 71, 1)',
            }}
          />
        </div>
      </div>
    </button>
  );
};

const Header = ({ onChatToggle, chatOpen, fullWidth }) => {
  const { currentUser, mongoUser, logout, isAdmin } = useAuth();
  const { unreadCount, togglePanel, hasUnreadChat, setHasUnreadChat } = useNotifications();

  useEffect(() => {
    if (chatOpen) {
      setHasUnreadChat(false);
    }
  }, [chatOpen, setHasUnreadChat]);
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/public/stats`)
      .then(r => r.json())
      .then(d => {
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
      background: 'transparent',
    }}>
      <div
        className="mx-auto flex items-center justify-between px-4 md:px-8 lg:px-0 w-full"
        style={{
          maxWidth: '1328px',
          height: '77px',
          justifyContent: 'space-between',
          paddingTop: '12px',
          paddingBottom: '12px',
          opacity: 1,
          transform: 'rotate(0deg)',
        }}
      >

        {/* Group 1: Brand / Logo */}
        <div
          className="flex items-center max-w-[350px] w-auto lg:w-[350px]"
          style={{
            height: '29.952091217041016px',
            gap: '10px',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          <button
            id="header-brand-logo"
            onClick={() => navigate('/')}
            className="flex items-center cursor-pointer"
            style={{ border: 'none', background: 'transparent', padding: 0 }}
          >
            <img
              src="/coins/logo final.svg"
              alt="TaskMint Logo"
              style={{
                width: '168.99993896484375px',
                height: '29.952091217041016px',
                opacity: 1,
                transform: 'rotate(0deg)',
                objectFit: 'contain',
              }}
            />
          </button>
        </div>

        {/* Mobile inline nav: Earn & Withdraw */}
        <div className="flex lg:hidden items-center ml-[4px]" style={{ gap: '0px' }}>
          <div>
            <MobileHeaderNavItem path="/dashboard" icon="/coins/paisa.png" label="Earn" />
          </div>
          <div style={{ marginLeft: '-2px' }}>
            <MobileHeaderNavItem path="/dashboard/wallet" icon="/coins/wallet1.png" label="Withdraw" />
          </div>
        </div>

        {/* Group 2: Main Links (Desktop) */}
        <div
          className="hidden lg:flex items-center relative -left-[70px]"
          style={{
            width: '598px',
            height: '20px',
            gap: '40px',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          <NavItem path="/dashboard" label="Earn" />
          <NavItem path="/dashboard/leaderboard" label="Leaderboard" />
          <NavItem path="/dashboard/affiliates" label="Affiliates" />
          <NavItem path="/dashboard/wallet" label="Withdraw" />
          <DailyBonusChip />
        </div>

        {/* Group 3: User Actions */}
        <div
          className="flex items-center justify-end shrink-0"
          style={{
            width: '282px',
            height: '48px',
            gap: '24px',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >

          {/* Notification & Chat container (width: 64, height: 20, gap: 24px) */}
          <div
            className="flex items-center"
            style={{
              width: '64px',
              height: '20px',
              gap: '24px',
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
          >
            {/* Live Chat Button → sidebar */}
            <button
              id="header-livechat-btn"
              onClick={onChatToggle}
              className="relative flex-shrink-0 flex items-center justify-center transition-colors group cursor-pointer hover:opacity-75"
              style={{
                width: '20px',
                height: '20px',
                border: 'none',
                background: 'transparent',
                padding: 0,
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
            >
              <img
                src="/coins/chatonew.png"
                alt="Chat"
                style={{
                  width: '20px',
                  height: '20px',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                  objectFit: 'contain',
                }}
              />
              {hasUnreadChat && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-[#49B265] rounded-full shadow-[0_0_8px_rgba(73,178,101,0.8)]" />
              )}
            </button>

            {/* Notifications */}
            <button
              id="header-notifications-btn"
              onClick={togglePanel}
              className="relative flex-shrink-0 flex items-center justify-center transition-colors group cursor-pointer hover:opacity-75"
              style={{
                width: '20px',
                height: '20px',
                border: 'none',
                background: 'transparent',
                padding: 0,
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
            >
              <img
                src="/coins/notinew.png"
                alt="Notifications"
                style={{
                  width: '20px',
                  height: '20px',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                  objectFit: 'contain',
                }}
              />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-[#49B265] rounded-full shadow-[0_0_8px_rgba(73,178,101,0.8)]" />
              )}
            </button>
          </div>

          {/* Avatar + Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="header-profile-menu"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center cursor-pointer flex-shrink-0"
              style={{
                width: '150px',
                height: '48px',
                gap: '6px',
                paddingTop: '5px',
                paddingRight: '11px',
                paddingBottom: '5px',
                paddingLeft: '6px',
                borderRadius: '80px',
                background: 'rgba(255, 255, 255, 1)',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
            >
              {/* Profile Image, Username & Coin (width: 113, height: 38, gap: 8px) */}
              <div
                className="flex items-center"
                style={{
                  width: '113px',
                  height: '38px',
                  gap: '8px',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
              >
                {/* Profile Picture (width: 38, height: 38) */}
                <div
                  className="rounded-full overflow-hidden flex-shrink-0 bg-[#F3F4F6] flex items-center justify-center"
                  style={{
                    width: '38px',
                    height: '38px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                  }}
                >
                  <img
                    src={mongoUser?.avatarUrl || currentUser?.photoURL || `/avatars/avatar1.png`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Username and Coin */}
                <div
                  className="flex flex-col items-start justify-center flex-1 overflow-visible"
                  style={{ gap: '2px' }}
                >
                  <div
                    className="text-left whitespace-nowrap overflow-hidden text-ellipsis flex items-center"
                    style={{
                      width: '66px',
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: 500,
                      fontSize: '16px',
                      lineHeight: '18px',
                      letterSpacing: '0%',
                      color: 'rgba(14, 15, 12, 1)',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                    }}
                  >
                    <FitText>{mongoUser?.displayName || 'User'}</FitText>
                  </div>
                  <div
                    className="flex items-center translate-y-[2px]"
                    style={{
                      gap: '3px',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                      overflow: 'visible',
                    }}
                  >
                    <img
                      src="/coins/procoinicon.png"
                      alt="Coin"
                      className="object-contain flex-shrink-0"
                      style={{
                        width: '9px',
                        height: '10px',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                      }}
                    />
                    <span
                      className="whitespace-nowrap"
                      style={{
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 500,
                        fontSize: '15px',
                        lineHeight: '16px',
                        letterSpacing: '0%',
                        color: 'rgba(231, 171, 24, 1)',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                        overflow: 'visible',
                        display: 'inline-block',
                      }}
                    >
                      {mongoUser?.walletBalance?.toLocaleString() ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dropdown Arrow */}
              <img
                src="/coins/arrow.png"
                alt="Dropdown Arrow"
                className={`transition-transform duration-200 flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
                style={{
                  width: '18px',
                  height: '12px',
                  opacity: 1,
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  objectFit: 'contain',
                  filter: 'brightness(0)',
                }}
              />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-50 flex flex-col backdrop-blur-[44px] w-[160px] lg:w-[171px] p-[10px] lg:p-[12px] gap-[8px] lg:gap-[12px] top-[46px] lg:top-[58px]"
                  style={{
                    background: 'rgba(36, 36, 36, 1)',
                    borderRadius: '10px',
                    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  {/* Balance (mobile) - hidden since we show it inline now */}

                  {/* My Profile */}
                  <button
                    id="header-profile-link-nav"
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/profile'); }}
                    className="text-left text-white/95 hover:text-white transition-colors flex items-center shrink-0 cursor-pointer w-full h-[20px] lg:h-[22px] gap-[6px] lg:gap-[8px]"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1
                    }}
                  >
                    <img
                      src="/coins/profile.png"
                      alt="Profile"
                      className="shrink-0 object-contain w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]"
                      style={{ opacity: 1 }}
                    />
                    <span
                      className="font-['Barlow_Condensed'] flex items-center overflow-visible whitespace-nowrap text-[13px] lg:text-[16px] text-white"
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
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

                  {/* Daily Bonus (Mobile only) */}
                  <button
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/daily-bonus'); }}
                    className="lg:hidden text-left text-white/95 hover:text-white transition-colors flex items-center shrink-0 cursor-pointer w-full h-[20px] lg:h-[22px] gap-[6px] lg:gap-[8px]"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1
                    }}
                  >
                    <img
                      src="/coins/gift1.png"
                      alt="Daily Bonus"
                      className="shrink-0 object-contain w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]"
                    />
                    <span
                      className="font-['Barlow_Condensed'] flex items-center overflow-visible whitespace-nowrap text-[13px] lg:text-[16px] text-white"
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
                        lineHeight: '120%'
                      }}
                    >
                      Daily Bonus
                    </span>
                  </button>
                  <div className="lg:hidden w-full h-[1px] bg-white/5 shrink-0" />

                  {/* Leaderboard (Mobile only) */}
                  <button
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/leaderboard'); }}
                    className="lg:hidden text-left text-white/95 hover:text-white transition-colors flex items-center shrink-0 cursor-pointer w-full h-[20px] lg:h-[22px] gap-[6px] lg:gap-[8px]"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1
                    }}
                  >
                    <img
                      src="/coins/cup.png"
                      alt="Leaderboard"
                      className="shrink-0 object-contain w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]"
                    />
                    <span
                      className="font-['Barlow_Condensed'] flex items-center overflow-visible whitespace-nowrap text-[13px] lg:text-[16px] text-white"
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
                        lineHeight: '120%'
                      }}
                    >
                      Leaderboard
                    </span>
                  </button>
                  <div className="lg:hidden w-full h-[1px] bg-white/5 shrink-0" />

                  {/* Affiliates (Mobile only) */}
                  <button
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/affiliates'); }}
                    className="lg:hidden text-left text-white/95 hover:text-white transition-colors flex items-center shrink-0 cursor-pointer w-full h-[20px] lg:h-[22px] gap-[6px] lg:gap-[8px]"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1
                    }}
                  >
                    <img
                      src="/coins/person1.png"
                      alt="Affiliates"
                      className="shrink-0 object-contain w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]"
                    />
                    <span
                      className="font-['Barlow_Condensed'] flex items-center overflow-visible whitespace-nowrap text-[13px] lg:text-[16px] text-white"
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
                        lineHeight: '120%'
                      }}
                    >
                      Affiliates
                    </span>
                  </button>
                  <div className="lg:hidden w-full h-[1px] bg-white/5 shrink-0" />

                  {/* VIP Status */}
                  <button
                    id="header-vip-link-nav"
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/vip'); }}
                    className="text-left text-white/95 hover:text-white transition-colors flex items-center shrink-0 cursor-pointer w-full h-[20px] lg:h-[22px] gap-[6px] lg:gap-[8px]"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1
                    }}
                  >
                    <img
                      src="/coins/vipstar.png"
                      alt="VIP Status"
                      className="shrink-0 object-contain w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]"
                      style={{ opacity: 1 }}
                    />
                    <span
                      className="font-['Barlow_Condensed'] flex items-center overflow-visible whitespace-nowrap text-[13px] lg:text-[16px] text-white"
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
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


                  {/* Admin Panel */}
                  {isAdmin && (
                    <>
                      <button
                        id="header-admin-link"
                        onClick={() => { setIsDropdownOpen(false); navigate('/admin'); }}
                        className="text-left text-amber-400 hover:text-amber-300 transition-colors flex items-center shrink-0 cursor-pointer w-full h-[20px] lg:h-[22px] gap-[6px] lg:gap-[8px]"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          opacity: 1
                        }}
                      >
                        <div
                          className="flex items-center justify-center shrink-0 w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]"
                          style={{ opacity: 1 }}
                        >
                          <FiSettings className="text-amber-400 text-[13px] lg:text-sm" />
                        </div>
                        <span
                          className="font-['Barlow_Condensed'] flex items-center overflow-visible whitespace-nowrap text-[13px] lg:text-[16px] text-amber-400"
                          style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 600,
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
                    className="text-left text-red-400 hover:text-red-300 transition-colors flex items-center shrink-0 cursor-pointer w-full h-[20px] lg:h-[22px] gap-[6px] lg:gap-[8px]"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1
                    }}
                  >
                    <img
                      src="/coins/logout.png"
                      alt="Sign Out"
                      className="shrink-0 object-contain w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]"
                      style={{ opacity: 1 }}
                    />
                    <span
                      className="font-['Barlow_Condensed'] flex items-center overflow-visible whitespace-nowrap text-[13px] lg:text-[16px] text-red-400"
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
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
