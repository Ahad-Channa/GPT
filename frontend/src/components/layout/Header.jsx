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
        border: isActive ? 'none' : '1px solid rgba(73, 178, 101, 0.3)',
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
      background: 'black',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      boxShadow: '0px 4px 44px 0px rgba(0, 0, 0, 0.25)'
    }}>
      <div className={`relative left-0 lg:left-[10px] ${fullWidth ? 'max-w-[1600px]' : 'max-w-[1240px]'} mx-auto flex items-center justify-between px-2 lg:px-4 md:px-8 xl:px-0 w-full h-[44px] lg:h-[84px]`}>

        {/* Group 1: Brand */}
        <button
          id="header-brand-logo"
          onClick={() => navigate('/')}
          className="flex items-center cursor-pointer transition-transform hover:scale-105 ml-0 lg:ml-1"
          style={{ gap: '4px', border: 'none', background: 'transparent', padding: 0 }}
        >
          <img
            src="/coins/logo copy.png"
            alt="TaskMint Logo"
            className="w-[22px] h-[22px] lg:w-[46px] lg:h-[46px] object-contain"
          />
          <span
            className="text-white font-bold flex items-center"
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              lineHeight: '30.15px',
              letterSpacing: '1.5px'
            }}
          >
            <span className="text-[14px] lg:text-[36px]">TaskMint</span>
          </span>
        </button>

        {/* Mobile inline nav: Earn & Withdraw */}
        <div className="flex lg:hidden items-center" style={{ gap: '3px' }}>
          <MobileHeaderNavItem path="/dashboard" icon="/coins/paisa.png" label="Earn" />
          <MobileHeaderNavItem path="/dashboard/wallet" icon="/coins/wallet1.png" label="Withdraw" />
        </div>

        {/* Group 2: Main Links (Desktop) */}
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
          className="relative right-0 lg:right-[-7px] flex items-center shrink-0 h-[30px] lg:h-[48px]"
          style={{ gap: '3px' }}
        >
          {/* Mobile Hamburger Button - visible only below lg */}
          <button
            id="header-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden relative flex-shrink-0 flex items-center justify-center bg-transparent hover:bg-white/5 transition-colors w-[30px] h-[30px]"
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(73, 178, 101, 0.4)',
            }}
          >
            {mobileMenuOpen ? (
              <FiX style={{ width: '16px', height: '16px', color: '#49B265' }} />
            ) : (
              <FiMenu style={{ width: '16px', height: '16px', color: '#49B265' }} />
            )}
          </button>
          {/* Live Chat Button → sidebar */}
          <button
            id="header-livechat-btn"
            onClick={onChatToggle}
            className={`relative flex-shrink-0 flex items-center justify-center transition-colors group w-[30px] h-[30px] lg:w-[48px] lg:h-[48px] ${chatOpen
              ? 'bg-[#49B265]/20'
              : 'bg-transparent hover:bg-white/5'
              }`}
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(73, 178, 101, 0.4)'
            }}
          >
            <img
              src="/coins/chat.png"
              alt="Chat"
              className="w-[16px] h-[16px] lg:w-[24px] lg:h-[24px] object-contain"
              style={{
                filter: 'brightness(0) saturate(100%) invert(59%) sepia(33%) saturate(1030%) hue-rotate(86deg) brightness(93%) contrast(87%)'
              }}
            />
            {hasUnreadChat && (
              <span className="absolute top-0.5 right-0.5 lg:top-2 lg:right-2.5 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-[#49B265] rounded-full shadow-[0_0_8px_rgba(73,178,101,0.8)]" />
            )}
          </button>

          {/* Notifications */}
          <button
            id="header-notifications-btn"
            onClick={togglePanel}
            className="relative flex-shrink-0 flex items-center justify-center bg-transparent hover:bg-white/5 transition-colors group w-[30px] h-[30px] lg:w-[48px] lg:h-[48px]"
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(73, 178, 101, 0.4)'
            }}
          >
            <img
              src="/coins/noti.png"
              alt="Notifications"
              className="w-[16px] h-[16px] lg:w-[24px] lg:h-[24px] object-contain"
            />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 lg:top-2 lg:right-2.5 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-[#49B265] rounded-full shadow-[0_0_8px_rgba(73,178,101,0.8)]" />
            )}
          </button>

          {/* Avatar + Dropdown */}
          <div className="relative mr-0 lg:mr-[5px]" ref={dropdownRef}>
            <button
              id="header-profile-menu"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center hover:bg-white/[0.05] transition-colors group flex-shrink-0 h-[30px] lg:h-[48px]"
              style={{
                minWidth: 'auto',
                width: 'auto',
                borderRadius: '6px',
                padding: '2px 4px 2px 2px',
                gap: '2px',
                border: '1px solid rgba(73, 178, 101, 0.4)'
              }}
            >
              <div
                className="rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-[#111827] w-[22px] h-[22px] lg:w-[31px] lg:h-[31px]"
              >
                <img
                  src={mongoUser?.avatarUrl || currentUser?.photoURL || `/avatars/avatar1.png`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="hidden lg:flex flex-col items-start justify-center flex-1 overflow-visible"
                style={{ gap: 4 }}
              >
                <span
                  className="text-white text-left whitespace-nowrap flex-shrink-0 text-[14px] leading-[14px]"
                  style={{
                    width: '100%',
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 600,
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
                    src="/coins/Coin.png"
                    alt="Coin"
                    className="w-[12px] h-[12px] object-contain flex-shrink-0"
                  />
                  <span className="text-[12px]" style={{
                    minWidth: '24px',
                    width: 'auto',
                    height: 'auto',
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 700,
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
              {/* Mobile: show coin balance inline */}
              <div className="flex lg:hidden items-center" style={{ gap: '2px' }}>
                <img
                  src="/coins/Coin.png"
                  alt="Coin"
                  className="w-[10px] h-[10px] object-contain flex-shrink-0"
                />
                <span className="text-[10px]" style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  lineHeight: '130%',
                  background: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'transparent',
                  whiteSpace: 'nowrap'
                }}>
                  {mongoUser?.walletBalance?.toLocaleString() ?? 0}
                </span>
              </div>
              <img
                src="/coins/arrow.png"
                alt="Dropdown Arrow"
                className={`transition-transform duration-200 flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
                style={{
                  width: '12px',
                  height: '12px',
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

                  {/* Missions */}
                  {missionsEnabled && (
                    <>
                      <button
                        id="header-missions-link-nav"
                        onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/missions'); }}
                        className="text-left text-white/95 hover:text-white transition-colors flex items-center shrink-0 cursor-pointer w-full h-[20px] lg:h-[22px] gap-[6px] lg:gap-[8px]"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: 1
                    }}
                      >
                        <img
                          src="/coins/target.png"
                          alt="Missions"
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

      {/* Mobile Collapsible Nav Menu - only visible below lg */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden overflow-hidden"
            style={{
              background: 'rgba(10, 10, 10, 0.98)',
              borderTop: '1px solid rgba(73, 178, 101, 0.15)',
              boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div className="flex flex-col gap-1 px-3 py-2">
              <MobileDailyBonusChip onClose={() => setMobileMenuOpen(false)} />
              <MobileNavItem path="/dashboard/leaderboard" icon="/coins/cup.png" label="Leaderboard" onClose={() => setMobileMenuOpen(false)} />
              <MobileNavItem path="/dashboard/affiliates" icon="/coins/person1.png" label="Affiliates" onClose={() => setMobileMenuOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
