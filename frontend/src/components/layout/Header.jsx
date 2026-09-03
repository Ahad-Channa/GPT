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
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

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
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target)) {
        setIsMobileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full transition-all" style={{
      background: 'transparent',
    }}>
      {/* MOBILE TOP HEADER (Figma specs: w: 416, h: 48, top: 16, left: 12, gap: 26) */}
      <div
        className="lg:hidden w-full flex justify-center bg-transparent"
        style={{
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
          paddingLeft: '12px',
          paddingRight: '12px',
          paddingBottom: '8px',
        }}
      >
        <div
          className="flex items-center justify-between w-full"
          style={{
            maxWidth: '416px',
            height: '48px',
            gap: '8px',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          {/* Brand Logo */}
          <button
            id="header-mobile-brand-logo"
            onClick={() => navigate('/')}
            className="flex items-center cursor-pointer border-0 bg-transparent p-0 shrink"
            style={{
              maxWidth: '148.0008544921875px',
              height: '26.230356216430664px',
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
          >
            <img
              src="/coins/logo final.svg"
              alt="TaskMint Logo"
              style={{
                width: '100%',
                maxWidth: '148.0008544921875px',
                height: '26.230356216430664px',
                objectFit: 'contain',
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
            />
          </button>

          {/* Right Actions: Live Chat, Notifications, Profile Pill with Dropdown */}
          <div
            className="flex items-center justify-end shrink-0"
            style={{
              maxWidth: '243px',
              height: '48px',
              gap: '12px',
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
          >
            {/* Group of 2 icons: Chat & Notifications */}
            <div
              className="flex items-center"
              style={{
                height: '29px',
                gap: '12px',
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
            >
              {/* Live Chat (width: 28, height: 29) */}
              <button
                id="header-mobile-livechat-btn"
                onClick={onChatToggle}
                className="relative flex items-center justify-center transition-colors group cursor-pointer hover:opacity-75 shrink-0"
                style={{
                  width: '28px',
                  height: '29px',
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
                    width: '25px',
                    height: '25px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    objectFit: 'contain',
                  }}
                />
                {hasUnreadChat && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-[#49B265] rounded-full shadow-[0_0_8px_rgba(73,178,101,0.8)]" />
                )}
              </button>

              {/* Notifications (width: 28, height: 29) */}
              <button
                id="header-mobile-notifications-btn"
                onClick={togglePanel}
                className="relative flex items-center justify-center transition-colors group cursor-pointer hover:opacity-75 shrink-0"
                style={{
                  width: '28px',
                  height: '29px',
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
                    width: '25px',
                    height: '25px',
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

            {/* Avatar + Dropdown on Mobile */}
            <div className="relative" ref={mobileDropdownRef}>
              <button
                id="header-mobile-profile-menu"
                onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
                className="flex items-center cursor-pointer flex-shrink-0"
                style={{
                  width: '150px',
                  height: '48px',
                  gap: '5px',
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
                        {mongoUser?.walletBalance ? Number(mongoUser.walletBalance).toLocaleString('de-DE') : '0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dropdown Arrow */}
                <img
                  src="/coins/arrow.png"
                  alt="Dropdown Arrow"
                  className={`transition-transform duration-200 flex-shrink-0 ${isMobileDropdownOpen ? 'rotate-180' : ''}`}
                  style={{
                    width: '18px',
                    height: '12px',
                    opacity: 1,
                    transform: isMobileDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    objectFit: 'contain',
                    filter: 'brightness(0)',
                  }}
                />
              </button>

              <AnimatePresence>
                {isMobileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 z-50 flex flex-col"
                    style={{
                      width: '210px',
                      borderRadius: '12px',
                      padding: '14px 15px 18px 13px',
                      gap: '12px',
                      background: 'rgba(255, 255, 255, 1)',
                      boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.15)',
                      border: '1px solid rgba(223, 225, 209, 0.8)',
                      top: '48px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* My Profile */}
                    <button
                      id="header-mobile-profile-link-nav"
                      onClick={() => { setIsMobileDropdownOpen(false); navigate('/dashboard/profile'); }}
                      className="text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full bg-transparent border-0 p-0"
                    >
                      <span
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: '15px',
                          lineHeight: '16px',
                          color: '#000000',
                        }}
                      >
                        My Profile
                      </span>
                    </button>

                    <div style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', flexShrink: 0 }} />

                    {/* Daily Bonus */}
                    <button
                      onClick={() => { setIsMobileDropdownOpen(false); navigate('/dashboard/daily-bonus'); }}
                      className="text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full bg-transparent border-0 p-0"
                    >
                      <span
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: '15px',
                          lineHeight: '16px',
                          color: '#000000',
                        }}
                      >
                        Daily Bonus
                      </span>
                    </button>

                    <div style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', flexShrink: 0 }} />

                    {/* Leaderboard */}
                    <button
                      onClick={() => { setIsMobileDropdownOpen(false); navigate('/dashboard/leaderboard'); }}
                      className="text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full bg-transparent border-0 p-0"
                    >
                      <span
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: '15px',
                          lineHeight: '16px',
                          color: '#000000',
                        }}
                      >
                        Leaderboard
                      </span>
                    </button>

                    <div style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', flexShrink: 0 }} />

                    {/* Affiliates */}
                    <button
                      onClick={() => { setIsMobileDropdownOpen(false); navigate('/dashboard/affiliates'); }}
                      className="text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full bg-transparent border-0 p-0"
                    >
                      <span
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: '15px',
                          lineHeight: '16px',
                          color: '#000000',
                        }}
                      >
                        Affiliates
                      </span>
                    </button>

                    <div style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', flexShrink: 0 }} />

                    {/* VIP Status */}
                    <button
                      id="header-mobile-vip-link-nav"
                      onClick={() => { setIsMobileDropdownOpen(false); navigate('/dashboard/vip'); }}
                      className="text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full bg-transparent border-0 p-0"
                    >
                      <span
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: '15px',
                          lineHeight: '16px',
                          color: '#000000',
                        }}
                      >
                        VIP Status
                      </span>
                    </button>

                    <div style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', flexShrink: 0 }} />

                    {/* Admin Panel */}
                    {isAdmin && (
                      <>
                        <button
                          id="header-mobile-admin-link"
                          onClick={() => { setIsMobileDropdownOpen(false); navigate('/admin'); }}
                          className="text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full bg-transparent border-0 p-0"
                        >
                          <span
                            style={{
                              fontFamily: '"Bricolage Grotesque", sans-serif',
                              fontWeight: 700,
                              fontSize: '15px',
                              lineHeight: '16px',
                              color: '#F59E0B',
                            }}
                          >
                            Admin Panel
                          </span>
                        </button>
                        <div style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', flexShrink: 0 }} />
                      </>
                    )}

                    {/* Sign Out */}
                    <button
                      id="header-mobile-logout-btn"
                      onClick={() => { setIsMobileDropdownOpen(false); logout(); }}
                      className="text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full bg-transparent border-0 p-0"
                    >
                      <span
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: '15px',
                          lineHeight: '16px',
                          color: '#000000',
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
      </div>

      {/* DESKTOP HEADER (Untouched desktop layout, only shown on lg screens) */}
      <div
        className="hidden lg:flex mx-auto items-center justify-between px-4 md:px-8 lg:px-0 w-full"
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
                      {mongoUser?.walletBalance ? Number(mongoUser.walletBalance).toLocaleString('de-DE') : '0'}
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
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-50 flex flex-col"
                  style={{
                    width: '214px',
                    borderRadius: '12px',
                    padding: '14px 15px 18px 13px',
                    gap: '12px',
                    background: 'rgba(255, 255, 255, 1)',
                    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.12)',
                    border: '1px solid rgba(223, 225, 209, 0.8)',
                    top: '54px',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* My Profile */}
                  <button
                    id="header-profile-link-nav"
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/profile'); }}
                    className="text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: '15px',
                        lineHeight: '16px',
                        letterSpacing: '0%',
                        color: '#000000',
                      }}
                    >
                      My Profile
                    </span>
                  </button>

                  <div style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', flexShrink: 0 }} />

                  {/* Daily Bonus (Mobile only) */}
                  <button
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/daily-bonus'); }}
                    className="lg:hidden text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: '15px',
                        lineHeight: '16px',
                        letterSpacing: '0%',
                        color: '#000000',
                      }}
                    >
                      Daily Bonus
                    </span>
                  </button>
                  <div className="lg:hidden" style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', flexShrink: 0 }} />

                  {/* Leaderboard (Mobile only) */}
                  <button
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/leaderboard'); }}
                    className="lg:hidden text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: '15px',
                        lineHeight: '16px',
                        letterSpacing: '0%',
                        color: '#000000',
                      }}
                    >
                      Leaderboard
                    </span>
                  </button>
                  <div className="lg:hidden" style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', flexShrink: 0 }} />

                  {/* Affiliates (Mobile only) */}
                  <button
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/affiliates'); }}
                    className="lg:hidden text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: '15px',
                        lineHeight: '16px',
                        letterSpacing: '0%',
                        color: '#000000',
                      }}
                    >
                      Affiliates
                    </span>
                  </button>
                  <div className="lg:hidden" style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', flexShrink: 0 }} />

                  {/* VIP Status */}
                  <button
                    id="header-vip-link-nav"
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/vip'); }}
                    className="text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: '15px',
                        lineHeight: '16px',
                        letterSpacing: '0%',
                        color: '#000000',
                      }}
                    >
                      VIP Status
                    </span>
                  </button>

                  <div style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', flexShrink: 0 }} />

                  {/* Admin Panel */}
                  {isAdmin && (
                    <>
                      <button
                        id="header-admin-link"
                        onClick={() => { setIsDropdownOpen(false); navigate('/admin'); }}
                        className="text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          opacity: 1,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: '"Bricolage Grotesque", sans-serif',
                            fontWeight: 700,
                            fontStyle: 'normal',
                            fontSize: '15px',
                            lineHeight: '16px',
                            letterSpacing: '0%',
                            color: '#F59E0B',
                          }}
                        >
                          Admin Panel
                        </span>
                      </button>
                      <div style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)', flexShrink: 0 }} />
                    </>
                  )}

                  {/* Sign Out */}
                  <button
                    id="header-logout-btn"
                    onClick={() => { setIsDropdownOpen(false); logout(); }}
                    className="text-left hover:opacity-75 transition-opacity flex items-center shrink-0 cursor-pointer w-full"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: '15px',
                        lineHeight: '16px',
                        letterSpacing: '0%',
                        color: '#000000',
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

      {/* MOBILE STICKY BOTTOM NAVIGATION */}
      <div
        className="fixed left-0 right-0 z-40 lg:hidden pointer-events-auto flex justify-center px-[14px]"
        style={{
          bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div
          className="flex items-center justify-center w-full"
          style={{
            maxWidth: '412px',
            height: '68px',
            borderRadius: '100px',
            background: 'rgba(255, 255, 255, 0.96)',
            boxShadow: '0px 0px 64px 0px rgba(0, 0, 0, 0.13)',
            backdropFilter: 'blur(29px)',
            WebkitBackdropFilter: 'blur(29px)',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          {/* Inner Tabs Container (width: 360, height: 42, justify-content: space-between) */}
          <div
            className="flex items-center justify-between w-full"
            style={{
              maxWidth: '360px',
              height: '62px',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
          >
            {/* 1. Earn */}
            <div className="flex-1 flex items-center justify-center">
              <button
                onClick={() => { setMobileMoreOpen(false); navigate('/dashboard'); }}
                className="flex flex-col items-center justify-center transition-all cursor-pointer border-0 w-full max-w-[78px] h-[62px] p-0"
                style={{
                  borderRadius: '60px',
                  background: location.pathname === '/dashboard' && !mobileMoreOpen ? 'rgba(247, 245, 238, 1)' : 'transparent',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
              >
                <div
                  className="flex flex-col items-center justify-center"
                  style={{
                    height: '42px',
                    gap: '6px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                  }}
                >
                  <div
                    className="shrink-0"
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: location.pathname === '/dashboard' && !mobileMoreOpen ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                      WebkitMaskImage: 'url("/coins/mhearnn.png")',
                      maskImage: 'url("/coins/mhearnn.png")',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: 500,
                      fontStyle: 'normal',
                      fontSize: '11px',
                      lineHeight: '13px',
                      letterSpacing: '0%',
                      textAlign: 'center',
                      color: location.pathname === '/dashboard' && !mobileMoreOpen ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                      display: 'block',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Earn
                  </span>
                </div>
              </button>
            </div>

            {/* 2. Leaderboard */}
            <div className="flex-1 flex items-center justify-center">
              <button
                onClick={() => { setMobileMoreOpen(false); navigate('/dashboard/leaderboard'); }}
                className="flex flex-col items-center justify-center transition-all cursor-pointer border-0 w-full max-w-[78px] h-[62px] p-0"
                style={{
                  borderRadius: '60px',
                  background: location.pathname === '/dashboard/leaderboard' && !mobileMoreOpen ? 'rgba(247, 245, 238, 1)' : 'transparent',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
              >
                <div
                  className="flex flex-col items-center justify-center"
                  style={{
                    height: '42px',
                    gap: '6px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                  }}
                >
                  <div
                    className="shrink-0"
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: location.pathname === '/dashboard/leaderboard' && !mobileMoreOpen ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                      WebkitMaskImage: 'url("/coins/mhleader.png")',
                      maskImage: 'url("/coins/mhleader.png")',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: 500,
                      fontStyle: 'normal',
                      fontSize: '11px',
                      lineHeight: '13px',
                      letterSpacing: '0%',
                      textAlign: 'center',
                      color: location.pathname === '/dashboard/leaderboard' && !mobileMoreOpen ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                      display: 'block',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Leaderboard
                  </span>
                </div>
              </button>
            </div>

            {/* 3. Withdraw */}
            <div className="flex-1 flex items-center justify-center">
              <button
                onClick={() => { setMobileMoreOpen(false); navigate('/dashboard/wallet'); }}
                className="flex flex-col items-center justify-center transition-all cursor-pointer border-0 w-full max-w-[78px] h-[62px] p-0"
                style={{
                  borderRadius: '60px',
                  background: location.pathname === '/dashboard/wallet' && !mobileMoreOpen ? 'rgba(247, 245, 238, 1)' : 'transparent',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
              >
                <div
                  className="flex flex-col items-center justify-center"
                  style={{
                    height: '42px',
                    gap: '6px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                  }}
                >
                  <div
                    className="shrink-0"
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: location.pathname === '/dashboard/wallet' && !mobileMoreOpen ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                      WebkitMaskImage: 'url("/coins/mhwidhtaw.png")',
                      maskImage: 'url("/coins/mhwidhtaw.png")',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: 500,
                      fontStyle: 'normal',
                      fontSize: '11px',
                      lineHeight: '13px',
                      letterSpacing: '0%',
                      textAlign: 'center',
                      color: location.pathname === '/dashboard/wallet' && !mobileMoreOpen ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                      display: 'block',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Withdraw
                  </span>
                </div>
              </button>
            </div>

            {/* 4. More */}
            <div className="flex-1 flex items-center justify-center">
              <button
                onClick={() => setMobileMoreOpen(prev => !prev)}
                className="flex flex-col items-center justify-center transition-all cursor-pointer border-0 w-full max-w-[78px] h-[62px] p-0"
                style={{
                  borderRadius: '60px',
                  background: mobileMoreOpen ? 'rgba(247, 245, 238, 1)' : 'transparent',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
              >
                <div
                  className="flex flex-col items-center justify-center"
                  style={{
                    height: '42px',
                    gap: '6px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                  }}
                >
                  <div
                    className="shrink-0"
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: mobileMoreOpen ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                      WebkitMaskImage: 'url("/coins/mhemore.png")',
                      maskImage: 'url("/coins/mhemore.png")',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: 500,
                      fontStyle: 'normal',
                      fontSize: '11px',
                      lineHeight: '13px',
                      letterSpacing: '0%',
                      textAlign: 'center',
                      color: mobileMoreOpen ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                      display: 'block',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    More
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MORE POPUP MODAL (Screenshot 2) */}
      <AnimatePresence>
        {mobileMoreOpen && (
          <>
            {/* Backdrop (clean transparent click-outside without blur or dark tint) */}
            <div
              onClick={() => setMobileMoreOpen(false)}
              className="fixed inset-0 z-40 lg:hidden bg-transparent"
            />
            {/* Popup Content Wrapper */}
            <div
              className="fixed left-0 right-0 z-50 lg:hidden flex justify-center pointer-events-none px-4"
              style={{
                bottom: 'calc(86px + env(safe-area-inset-bottom, 0px))',
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.96 }}
                transition={{ duration: 0.16 }}
                className="flex items-end justify-center gap-2 pointer-events-auto"
              >
                {/* White Card (width: 267, height: 224, border-radius: 30px) */}
                <div
                  className="bg-white flex items-center justify-center"
                  style={{
                    width: '267px',
                    height: '224px',
                    borderRadius: '30px',
                    boxShadow: '0px 12px 40px rgba(0,0,0,0.14)',
                    border: '1px solid #EFECE4',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Inner Container (width: 234, height: 186, gap: 24px) */}
                  <div
                    className="grid grid-cols-3 justify-items-center items-center"
                    style={{
                      width: '234px',
                      height: '186px',
                      rowGap: '24px',
                      columnGap: '24px',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                    }}
                  >
                    {/* 1. Affiliates */}
                    <button
                      onClick={() => { setMobileMoreOpen(false); navigate('/dashboard/affiliates'); }}
                      className="flex flex-col items-center justify-center cursor-pointer border-0 bg-transparent group p-0 shrink-0"
                      style={{
                        width: '62px',
                        height: '81px',
                        gap: '11px',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                      }}
                    >
                      <div
                        className="group-active:scale-95 transition-transform flex items-center justify-center shrink-0"
                        style={{
                          width: '62px',
                          height: '62px',
                          gap: '10px',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          borderRadius: '60px',
                          padding: '19px',
                          background: 'rgba(247, 245, 238, 1)',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          className="shrink-0"
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: location.pathname === '/dashboard/affiliates' ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                            WebkitMaskImage: 'url("/coins/mhaffliation.png")',
                            maskImage: 'url("/coins/mhaffliation.png")',
                            WebkitMaskSize: 'contain',
                            maskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskPosition: 'center',
                            opacity: 1,
                            transform: 'rotate(0deg)',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          height: '8px',
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: 500,
                          fontStyle: 'normal',
                          fontSize: '12px',
                          lineHeight: '20px',
                          letterSpacing: '0%',
                          textAlign: 'center',
                          color: location.pathname === '/dashboard/affiliates' ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Affiliates
                      </span>
                    </button>

                    {/* 2. Daily Bonus */}
                    <button
                      onClick={() => { setMobileMoreOpen(false); navigate('/dashboard/daily-bonus'); }}
                      className="flex flex-col items-center justify-center cursor-pointer border-0 bg-transparent group p-0 shrink-0"
                      style={{
                        width: '62px',
                        height: '81px',
                        gap: '11px',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                      }}
                    >
                      <div
                        className="group-active:scale-95 transition-transform flex items-center justify-center shrink-0"
                        style={{
                          width: '62px',
                          height: '62px',
                          gap: '10px',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          borderRadius: '60px',
                          padding: '19px',
                          background: 'rgba(247, 245, 238, 1)',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          className="shrink-0"
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: location.pathname === '/dashboard/daily-bonus' ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                            WebkitMaskImage: 'url("/coins/mhdaily.png")',
                            maskImage: 'url("/coins/mhdaily.png")',
                            WebkitMaskSize: 'contain',
                            maskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskPosition: 'center',
                            opacity: 1,
                            transform: 'rotate(0deg)',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          height: '8px',
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: 500,
                          fontStyle: 'normal',
                          fontSize: '12px',
                          lineHeight: '20px',
                          letterSpacing: '0%',
                          textAlign: 'center',
                          color: location.pathname === '/dashboard/daily-bonus' ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Daily Bonus
                      </span>
                    </button>

                    {/* 3. VIP Status */}
                    <button
                      onClick={() => { setMobileMoreOpen(false); navigate('/dashboard/vip'); }}
                      className="flex flex-col items-center justify-center cursor-pointer border-0 bg-transparent group p-0 shrink-0"
                      style={{
                        width: '62px',
                        height: '81px',
                        gap: '11px',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                      }}
                    >
                      <div
                        className="group-active:scale-95 transition-transform flex items-center justify-center shrink-0"
                        style={{
                          width: '62px',
                          height: '62px',
                          gap: '10px',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          borderRadius: '60px',
                          padding: '19px',
                          background: 'rgba(247, 245, 238, 1)',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          className="shrink-0"
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: location.pathname === '/dashboard/vip' ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                            WebkitMaskImage: 'url("/coins/mhvip.png")',
                            maskImage: 'url("/coins/mhvip.png")',
                            WebkitMaskSize: 'contain',
                            maskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskPosition: 'center',
                            opacity: 1,
                            transform: 'rotate(0deg)',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          height: '8px',
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: 500,
                          fontStyle: 'normal',
                          fontSize: '12px',
                          lineHeight: '20px',
                          letterSpacing: '0%',
                          textAlign: 'center',
                          color: location.pathname === '/dashboard/vip' ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        VIP Status
                      </span>
                    </button>

                    {/* 4. Profile */}
                    <button
                      onClick={() => { setMobileMoreOpen(false); navigate('/dashboard/profile'); }}
                      className="flex flex-col items-center justify-center cursor-pointer border-0 bg-transparent group p-0 shrink-0"
                      style={{
                        width: '62px',
                        height: '81px',
                        gap: '11px',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                      }}
                    >
                      <div
                        className="group-active:scale-95 transition-transform flex items-center justify-center shrink-0"
                        style={{
                          width: '62px',
                          height: '62px',
                          gap: '10px',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          borderRadius: '60px',
                          padding: '19px',
                          background: 'rgba(247, 245, 238, 1)',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          className="shrink-0"
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: location.pathname === '/dashboard/profile' ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                            WebkitMaskImage: 'url("/coins/mhprofile.png")',
                            maskImage: 'url("/coins/mhprofile.png")',
                            WebkitMaskSize: 'contain',
                            maskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskPosition: 'center',
                            opacity: 1,
                            transform: 'rotate(0deg)',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          height: '8px',
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: 500,
                          fontStyle: 'normal',
                          fontSize: '12px',
                          lineHeight: '20px',
                          letterSpacing: '0%',
                          textAlign: 'center',
                          color: location.pathname === '/dashboard/profile' ? 'rgba(36, 50, 77, 1)' : 'rgba(134, 134, 134, 1)',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Profile
                      </span>
                    </button>

                    {/* 5. Sign Out */}
                    <button
                      onClick={() => { setMobileMoreOpen(false); logout(); }}
                      className="flex flex-col items-center justify-center cursor-pointer border-0 bg-transparent group p-0 shrink-0"
                      style={{
                        width: '62px',
                        height: '81px',
                        gap: '11px',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                      }}
                    >
                      <div
                        className="group-active:scale-95 transition-transform flex items-center justify-center shrink-0"
                        style={{
                          width: '62px',
                          height: '62px',
                          gap: '10px',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          borderRadius: '60px',
                          padding: '19px',
                          background: 'rgba(247, 245, 238, 1)',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          className="shrink-0"
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: 'rgba(134, 134, 134, 1)',
                            WebkitMaskImage: 'url("/coins/mhsignout.png")',
                            maskImage: 'url("/coins/mhsignout.png")',
                            WebkitMaskSize: 'contain',
                            maskSize: 'contain',
                            WebkitMaskRepeat: 'no-repeat',
                            maskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            maskPosition: 'center',
                            opacity: 1,
                            transform: 'rotate(0deg)',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          height: '8px',
                          fontFamily: 'Poppins, sans-serif',
                          fontWeight: 500,
                          fontStyle: 'normal',
                          fontSize: '12px',
                          lineHeight: '20px',
                          letterSpacing: '0%',
                          textAlign: 'center',
                          color: 'rgba(134, 134, 134, 1)',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Sign Out
                      </span>
                    </button>

                    {/* 6. Admin Panel (if admin) or empty slot */}
                    {isAdmin ? (
                      <button
                        onClick={() => { setMobileMoreOpen(false); navigate('/admin'); }}
                        className="flex flex-col items-center justify-center cursor-pointer border-0 bg-transparent group p-0 shrink-0"
                        style={{
                          width: '62px',
                          height: '81px',
                          gap: '11px',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                        }}
                      >
                        <div
                          className="group-active:scale-95 transition-transform flex items-center justify-center shrink-0"
                          style={{
                            width: '62px',
                            height: '62px',
                            gap: '10px',
                            opacity: 1,
                            transform: 'rotate(0deg)',
                            borderRadius: '60px',
                            padding: '19px',
                            background: 'rgba(247, 245, 238, 1)',
                            boxSizing: 'border-box',
                            color: location.pathname.startsWith('/admin') ? 'rgba(36, 50, 77, 1)' : '#D97706',
                          }}
                        >
                          <FiSettings className="w-[24px] h-[24px]" />
                        </div>
                        <span
                          style={{
                            width: '62px',
                            height: '8px',
                            fontFamily: 'Poppins, sans-serif',
                            fontWeight: 500,
                            fontStyle: 'normal',
                            fontSize: '12px',
                            lineHeight: '20px',
                            letterSpacing: '0%',
                            textAlign: 'center',
                            color: location.pathname.startsWith('/admin') ? 'rgba(36, 50, 77, 1)' : '#D97706',
                            opacity: 1,
                            transform: 'rotate(0deg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Admin
                        </span>
                      </button>
                    ) : (
                      <div className="w-[62px]" />
                    )}
                  </div>
                </div>

                {/* Close Button 'X' on right (width: 54, height: 54, border-radius: 100px, bigger X icon) */}
                <button
                  onClick={() => setMobileMoreOpen(false)}
                  className="bg-white flex items-center justify-center cursor-pointer shrink-0 mb-1 active:scale-95 transition-transform border-0"
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '100px',
                    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
                    border: '1px solid #EFECE4',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    boxSizing: 'border-box',
                    padding: 0,
                  }}
                >
                  <FiX className="w-[20px] h-[20px] text-black shrink-0" strokeWidth={2.6} />
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
