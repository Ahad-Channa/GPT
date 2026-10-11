import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getLevelFromEarned } from '../../utils/vipLevels';
import VipBadge from '../VipBadge';
import { useNotifications } from '../../contexts/NotificationContext';
import { useDailyBonus } from '../../contexts/DailyBonusContext';
import { FiLogOut, FiUser, FiSettings, FiZap, FiChevronDown, FiCreditCard, FiLock, FiClock, FiBell, FiUsers, FiGift, FiDollarSign, FiMessageSquare, FiTarget, FiStar, FiMenu, FiX } from 'react-icons/fi';
import { FaTrophy } from 'react-icons/fa6';
import CoinDisplay from '../CoinDisplay';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import FitText from '../FitText';
import LanguageToggle from '../LanguageToggle';
import UserAvatar from '../UserAvatar';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const NavItem = ({ path, label }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
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
        color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)',
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
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
        color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)',
        background: 'transparent',
        border: 'none',
        padding: 0,
        opacity: 1,
        transform: 'rotate(0deg)',
      }}
    >
      <span>{t('nav.dailyBonus')}</span>
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
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useTheme();
  const isGerman = i18n.language?.startsWith('de');
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
      {/* MOBILE TOP HEADER */}
      <div
        className="lg:hidden w-full flex justify-center bg-transparent"
        style={{
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
          paddingLeft: '8px',
          paddingRight: '8px',
          paddingBottom: '8px',
        }}
      >
        <div
          className="flex items-center justify-between w-full"
          style={{
            maxWidth: '416px',
            height: '48px',
            gap: '6px',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          {/* Brand Logo */}
          <button
            id="header-mobile-brand-logo"
            onClick={() => navigate('/')}
            className="flex items-center cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
            style={{
              width: '88px',
              height: '16px',
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
          >
            <svg
              width="88"
              height="16"
              viewBox="0 0 161 29"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="object-contain"
            >
              <path fillRule="evenodd" clipRule="evenodd" d="M5.26177 0H23.2747C26.1674 0 28.5344 2.36695 28.5344 5.25967V23.2726C28.5344 26.1653 26.1674 28.5344 23.2747 28.5344H5.26177C2.36695 28.5344 0 26.1653 0 23.2726V5.25967C0 2.36695 2.36695 0 5.26177 0ZM13.9124 14.8943C13.2431 14.6071 12.768 13.8935 11.9298 13.6992C10.6904 13.412 10.3631 14.6451 11.0197 15.3335C11.461 15.7917 12.2908 16.2499 12.7892 16.7313C13.1375 17.067 14.2059 18.1079 14.5945 18.3212C14.8922 17.2739 16.0197 15.4792 16.6215 14.6388C18.7372 11.6891 21.4462 10.0759 24.4909 7.99191C24.89 7.71741 26.009 7.11565 26.1843 6.71658C25.4073 6.37663 23.2684 7.18533 21.4398 8.07003C21.0999 7.23178 20.2743 6.63634 19.3199 6.63634H8.6359C7.37746 6.63634 6.34707 7.66674 6.34707 8.92517V19.6092C6.34707 20.8676 7.37746 21.8959 8.6359 21.8959H19.3199C20.363 21.8959 21.2498 21.1865 21.5222 20.2257L16.4483 20.2067H8.6359C8.3044 20.2067 8.03624 19.9386 8.03624 19.6092V8.92517C8.03624 8.59367 8.3044 8.32552 8.6359 8.32552H19.3199C19.6282 8.32552 19.8837 8.55989 19.9153 8.86183C19.4719 9.10887 19.1024 9.33269 18.8512 9.50794C17.2401 10.6186 16.0978 11.7609 14.9766 13.3001C14.605 13.8111 14.3115 14.4044 13.9124 14.8943Z" fill="#00A247"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M155.229 4.91809V9.59077H160.499V10.8767H155.229V20.317C155.229 22.4179 155.668 23.8939 158.084 23.8939C158.836 23.8939 159.684 23.6426 160.468 23.2668L161 24.521C160.029 24.9897 159.057 25.3043 158.084 25.3043C154.79 25.3043 153.724 23.3597 153.724 20.317V10.8767H150.432V9.59077H153.724V5.07434L155.229 4.91809ZM135.816 9.59289V12.3526C137.007 10.22 139.171 9.34162 141.336 9.30995C145.476 9.30995 148.331 11.85 148.331 16.1469V25.0847H146.794V16.1786C146.794 12.6651 144.63 10.7838 141.272 10.8154C138.074 10.8471 135.848 13.2605 135.848 16.4615V25.0847H134.311V9.59289H135.816ZM130.422 4.54225C130.422 6.17231 127.945 6.17231 127.945 4.54225C127.945 2.9122 130.422 2.9122 130.422 4.54225ZM129.921 9.52954V25.0847H128.384V9.52954H129.921ZM122.518 25.0847V15.8027C122.518 12.8234 120.51 10.7204 117.563 10.7204C114.615 10.7204 112.575 12.9163 112.575 15.8956V25.0847H111.038V15.8956C111.038 12.9163 109.001 10.7521 106.053 10.7521C103.103 10.7521 101.098 12.9163 101.098 15.8956V25.0847H99.5604V9.59289H101.003L101.034 12.1647C102.1 10.125 104.077 9.27828 106.085 9.27828C108.437 9.27828 110.914 10.3446 111.824 13.1043C112.763 10.5642 115.179 9.27828 117.563 9.27828C121.357 9.27828 124.055 11.9451 124.055 15.8027V25.0847H122.518ZM86.6699 3.16135V15.8344L91.8768 9.62245H96.4544V9.84204L90.1517 16.8986L97.3328 24.8039V25.0847H92.7234L86.6699 18.0915V25.0847H82.8439V3.16135H86.6699ZM77.637 13.7314C76.5391 12.6967 75.2848 12.3526 73.811 12.3526C71.991 12.3526 70.988 12.9163 70.988 13.8897C70.988 14.8927 71.8981 15.4564 73.8744 15.5831C76.7903 15.771 80.4917 16.4298 80.4917 20.5366C80.4917 23.2668 78.2641 25.6189 73.8427 25.6189C71.3955 25.6189 68.9505 25.2114 66.6912 22.8592L68.5725 20.1291C69.6705 21.3538 72.1789 22.2617 73.9039 22.2934C75.3482 22.325 76.6974 21.5734 76.6974 20.4437C76.6974 19.3774 75.819 18.9382 73.6231 18.8116C70.7051 18.5941 67.2233 17.5257 67.2233 14.0143C67.2233 10.4396 70.9247 9.18537 73.7477 9.18537C76.1632 9.18537 77.9812 9.65412 79.7696 11.2229L77.637 13.7314ZM60.6376 9.62245H64.3073V25.0847H60.7009L60.513 22.8276C59.6347 24.6455 57.2191 25.5239 55.4941 25.5556C50.9164 25.5873 47.5275 22.7642 47.5275 17.3377C47.5275 12.0063 51.0727 9.21493 55.5891 9.2466C57.6583 9.2466 59.6347 10.2179 60.513 11.755L60.6376 9.62245ZM51.3535 17.3377C51.3535 20.2875 53.3932 22.0442 55.9333 22.0442C61.9552 22.0442 61.9552 12.6651 55.9333 12.6651C53.3932 12.6651 51.3535 14.3901 51.3535 17.3377ZM41.2543 5.26438V9.65412H45.5195V12.948H41.2227V19.6287C41.2227 21.1025 42.0398 21.8246 43.2307 21.8246C43.8261 21.8246 44.5166 21.6346 45.0803 21.3538L46.1466 24.6139C45.0508 25.0552 44.1407 25.2431 42.9794 25.2726C39.6243 25.3993 37.4284 23.4863 37.4284 19.6287V12.948H34.542V9.65412H37.4284V5.67189L41.2543 5.26438Z"
                fill={isDarkMode ? "#FFFFFF" : "#383F47"}
              />
            </svg>
          </button>

          {/* Right Actions: Live Chat, Notifications, Profile Pill with Dropdown */}
          <div
            className="flex items-center justify-end shrink-0"
            style={{
              height: '48px',
              gap: '6px',
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
          >
            {/* Language Toggle (Mobile - clean flag & text, no bg/arrow) */}
            <LanguageToggle />

            {/* Group of 2 icons: Notifications (Bell) & Chat */}
            <div
              className="flex items-center"
              style={{
                height: '29px',
                gap: '5px',
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
            >
              {/* Notifications (width: 28, height: 29) */}
              <button
                id="header-mobile-notifications-btn"
                onClick={togglePanel}
                className="relative flex items-center justify-center transition-colors group cursor-pointer hover:opacity-75 shrink-0"
                title={t('notifications.title', 'Notifications')}
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
                  alt={t('notifications.title', 'Notifications')}
                  style={{
                    width: '25px',
                    height: '25px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    objectFit: 'contain',
                    filter: isDarkMode ? 'brightness(0) invert(1)' : 'none',
                  }}
                />
                {unreadCount > 0 && (
                  <span className="absolute top-[3.5px] right-[3px] w-[7.5px] h-[7.5px] bg-[#49B265] rounded-full shadow-[0_0_6px_rgba(73,178,101,0.8)] pointer-events-none" />
                )}
              </button>

              {/* Live Chat (width: 28, height: 29) */}
              <button
                id="header-mobile-livechat-btn"
                onClick={onChatToggle}
                className="relative flex items-center justify-center transition-colors group cursor-pointer hover:opacity-75 shrink-0"
                title={t('chat.liveChat', 'Live Chat')}
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
                  alt={t('chat.liveChat', 'Live Chat')}
                  style={{
                    width: '25px',
                    height: '25px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    objectFit: 'contain',
                    filter: isDarkMode ? 'brightness(0) invert(1)' : 'none',
                  }}
                />
                {hasUnreadChat && (
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
                  height: '48px',
                  gap: '5px',
                  paddingTop: '5px',
                  paddingRight: '10px',
                  paddingBottom: '5px',
                  paddingLeft: '5px',
                  borderRadius: '80px',
                  background: 'rgba(255, 255, 255, 1)',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
              >
                {/* Profile Image, Username & Coin */}
                <div
                  className="flex items-center"
                  style={{
                    height: '38px',
                    gap: '6px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                  }}
                >
                  {/* Profile Picture (width: 38, height: 38) */}
                  <UserAvatar
                    user={mongoUser}
                    size={38}
                    textClassName="text-[17px] font-bold"
                  />

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
                        {t('nav.myProfile')}
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
                        {t('nav.dailyBonus')}
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
                        {t('nav.leaderboard')}
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
                        {t('nav.affiliates')}
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
                        {t('nav.vip')}
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
            <svg
              width="161"
              height="28.53"
              viewBox="0 0 161 29"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="object-contain"
            >
              <path fillRule="evenodd" clipRule="evenodd" d="M5.26177 0H23.2747C26.1674 0 28.5344 2.36695 28.5344 5.25967V23.2726C28.5344 26.1653 26.1674 28.5344 23.2747 28.5344H5.26177C2.36695 28.5344 0 26.1653 0 23.2726V5.25967C0 2.36695 2.36695 0 5.26177 0ZM13.9124 14.8943C13.2431 14.6071 12.768 13.8935 11.9298 13.6992C10.6904 13.412 10.3631 14.6451 11.0197 15.3335C11.461 15.7917 12.2908 16.2499 12.7892 16.7313C13.1375 17.067 14.2059 18.1079 14.5945 18.3212C14.8922 17.2739 16.0197 15.4792 16.6215 14.6388C18.7372 11.6891 21.4462 10.0759 24.4909 7.99191C24.89 7.71741 26.009 7.11565 26.1843 6.71658C25.4073 6.37663 23.2684 7.18533 21.4398 8.07003C21.0999 7.23178 20.2743 6.63634 19.3199 6.63634H8.6359C7.37746 6.63634 6.34707 7.66674 6.34707 8.92517V19.6092C6.34707 20.8676 7.37746 21.8959 8.6359 21.8959H19.3199C20.363 21.8959 21.2498 21.1865 21.5222 20.2257L16.4483 20.2067H8.6359C8.3044 20.2067 8.03624 19.9386 8.03624 19.6092V8.92517C8.03624 8.59367 8.3044 8.32552 8.6359 8.32552H19.3199C19.6282 8.32552 19.8837 8.55989 19.9153 8.86183C19.4719 9.10887 19.1024 9.33269 18.8512 9.50794C17.2401 10.6186 16.0978 11.7609 14.9766 13.3001C14.605 13.8111 14.3115 14.4044 13.9124 14.8943Z" fill="#00A247"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M155.229 4.91809V9.59077H160.499V10.8767H155.229V20.317C155.229 22.4179 155.668 23.8939 158.084 23.8939C158.836 23.8939 159.684 23.6426 160.468 23.2668L161 24.521C160.029 24.9897 159.057 25.3043 158.084 25.3043C154.79 25.3043 153.724 23.3597 153.724 20.317V10.8767H150.432V9.59077H153.724V5.07434L155.229 4.91809ZM135.816 9.59289V12.3526C137.007 10.22 139.171 9.34162 141.336 9.30995C145.476 9.30995 148.331 11.85 148.331 16.1469V25.0847H146.794V16.1786C146.794 12.6651 144.63 10.7838 141.272 10.8154C138.074 10.8471 135.848 13.2605 135.848 16.4615V25.0847H134.311V9.59289H135.816ZM130.422 4.54225C130.422 6.17231 127.945 6.17231 127.945 4.54225C127.945 2.9122 130.422 2.9122 130.422 4.54225ZM129.921 9.52954V25.0847H128.384V9.52954H129.921ZM122.518 25.0847V15.8027C122.518 12.8234 120.51 10.7204 117.563 10.7204C114.615 10.7204 112.575 12.9163 112.575 15.8956V25.0847H111.038V15.8956C111.038 12.9163 109.001 10.7521 106.053 10.7521C103.103 10.7521 101.098 12.9163 101.098 15.8956V25.0847H99.5604V9.59289H101.003L101.034 12.1647C102.1 10.125 104.077 9.27828 106.085 9.27828C108.437 9.27828 110.914 10.3446 111.824 13.1043C112.763 10.5642 115.179 9.27828 117.563 9.27828C121.357 9.27828 124.055 11.9451 124.055 15.8027V25.0847H122.518ZM86.6699 3.16135V15.8344L91.8768 9.62245H96.4544V9.84204L90.1517 16.8986L97.3328 24.8039V25.0847H92.7234L86.6699 18.0915V25.0847H82.8439V3.16135H86.6699ZM77.637 13.7314C76.5391 12.6967 75.2848 12.3526 73.811 12.3526C71.991 12.3526 70.988 12.9163 70.988 13.8897C70.988 14.8927 71.8981 15.4564 73.8744 15.5831C76.7903 15.771 80.4917 16.4298 80.4917 20.5366C80.4917 23.2668 78.2641 25.6189 73.8427 25.6189C71.3955 25.6189 68.9505 25.2114 66.6912 22.8592L68.5725 20.1291C69.6705 21.3538 72.1789 22.2617 73.9039 22.2934C75.3482 22.325 76.6974 21.5734 76.6974 20.4437C76.6974 19.3774 75.819 18.9382 73.6231 18.8116C70.7051 18.5941 67.2233 17.5257 67.2233 14.0143C67.2233 10.4396 70.9247 9.18537 73.7477 9.18537C76.1632 9.18537 77.9812 9.65412 79.7696 11.2229L77.637 13.7314ZM60.6376 9.62245H64.3073V25.0847H60.7009L60.513 22.8276C59.6347 24.6455 57.2191 25.5239 55.4941 25.5556C50.9164 25.5873 47.5275 22.7642 47.5275 17.3377C47.5275 12.0063 51.0727 9.21493 55.5891 9.2466C57.6583 9.2466 59.6347 10.2179 60.513 11.755L60.6376 9.62245ZM51.3535 17.3377C51.3535 20.2875 53.3932 22.0442 55.9333 22.0442C61.9552 22.0442 61.9552 12.6651 55.9333 12.6651C53.3932 12.6651 51.3535 14.3901 51.3535 17.3377ZM41.2543 5.26438V9.65412H45.5195V12.948H41.2227V19.6287C41.2227 21.1025 42.0398 21.8246 43.2307 21.8246C43.8261 21.8246 44.5166 21.6346 45.0803 21.3538L46.1466 24.6139C45.0508 25.0552 44.1407 25.2431 42.9794 25.2726C39.6243 25.3993 37.4284 23.4863 37.4284 19.6287V12.948H34.542V9.65412H37.4284V5.67189L41.2543 5.26438Z"
              fill={isDarkMode ? "#FFFFFF" : "#383F47"}
            />
          </svg>
        </button>
      </div>

      {/* Group 2: Main Links (Desktop) */}
      <div
        className={`hidden lg:flex items-center relative ${isGerman ? '-left-[90px]' : '-left-[70px]'}`}
        style={{
          width: '598px',
          height: '20px',
          gap: '40px',
          opacity: 1,
          transform: 'rotate(0deg)',
        }}
      >
        <NavItem path="/dashboard" label={t('nav.earn')} />
        <NavItem path="/dashboard/leaderboard" label={t('nav.leaderboard')} />
        <NavItem path="/dashboard/affiliates" label={t('nav.affiliates')} />
        <NavItem path="/dashboard/wallet" label={t('nav.withdraw')} />
        <DailyBonusChip />
      </div>

      {/* Group 3: User Actions */}
      <div
        className="flex items-center justify-end shrink-0"
        style={{
          minWidth: '340px',
          width: 'auto',
          height: '49px',
          gap: '6px',
          opacity: 1,
          transform: 'rotate(0deg)',
        }}
      >
        {/* Notification & Chat container (Bell first, Chat second) */}
        <div
          className="flex items-center"
          style={{
            width: '64px',
            height: '20px',
            gap: '24px',
            marginRight: '12px',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          {/* Notifications (Bell) */}
          <button
            id="header-notifications-btn"
            onClick={togglePanel}
            className="relative flex-shrink-0 flex items-center justify-center transition-colors group cursor-pointer hover:opacity-75"
            title={t('notifications.title', 'Notifications')}
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
              alt={t('notifications.title', 'Notifications')}
              style={{
                width: '20px',
                height: '20px',
                opacity: 1,
                transform: 'rotate(0deg)',
                objectFit: 'contain',
                filter: isDarkMode ? 'brightness(0) invert(1)' : 'none',
              }}
            />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#49B265] rounded-full shadow-[0_0_8px_rgba(73,178,101,0.8)]" />
            )}
          </button>

          {/* Live Chat Button → sidebar */}
          <button
            id="header-livechat-btn"
            onClick={onChatToggle}
            className="relative flex-shrink-0 flex items-center justify-center transition-colors group cursor-pointer hover:opacity-75"
            title={t('chat.liveChat', 'Live Chat')}
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
              alt={t('chat.liveChat', 'Live Chat')}
              style={{
                width: '20px',
                height: '20px',
                opacity: 1,
                transform: 'rotate(0deg)',
                objectFit: 'contain',
                filter: isDarkMode ? 'brightness(0) invert(1)' : 'none',
              }}
            />
            {hasUnreadChat && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#49B265] rounded-full shadow-[0_0_8px_rgba(73,178,101,0.8)]" />
            )}
          </button>
        </div>

          {/* Language Toggle (Desktop - positioned directly beside Profile) */}
          <LanguageToggle />

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
                <UserAvatar
                  user={mongoUser}
                  size={38}
                  textClassName="text-[17px] font-bold"
                />

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
                      {t('nav.myProfile')}
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
                      {t('nav.dailyBonus')}
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
                      {t('nav.leaderboard')}
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
                      {t('nav.affiliates')}
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
                      {t('nav.vip')}
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
                      {t('nav.logout')}
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
        className="mobile-bottom-nav fixed left-0 right-0 bottom-0 z-40 lg:hidden pointer-events-auto w-full border-t border-black/5"
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0px -4px 20px 0px rgba(0, 0, 0, 0.06)',
          backdropFilter: 'blur(29px)',
          WebkitBackdropFilter: 'blur(29px)',
          paddingBottom: 'var(--mobile-nav-pb, 2px)',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
      >
        <div
          className="flex items-center justify-center w-full"
          style={{
            width: '100%',
            height: '66px',
            borderRadius: '0px',
            opacity: 1,
          }}
        >
          {/* Inner Tabs Container */}
          <div
            className="flex items-center justify-between w-full px-2"
            style={{
              width: '100%',
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
                className="flex flex-col items-center justify-center transition-all cursor-pointer border-0 w-full max-w-[86px] h-[62px] p-0"
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
                className="flex flex-col items-center justify-center transition-all cursor-pointer border-0 w-[96px] max-w-[96px] h-[62px] p-0"
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
                className="flex flex-col items-center justify-center transition-all cursor-pointer border-0 w-full max-w-[86px] h-[62px] p-0"
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
                className="flex flex-col items-center justify-center transition-all cursor-pointer border-0 w-full max-w-[86px] h-[62px] p-0"
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
              className="mobile-more-popup fixed left-0 right-0 z-50 lg:hidden flex justify-center pointer-events-none px-4"
              style={{
                bottom: 'var(--mobile-more-bottom, calc(74px + env(safe-area-inset-bottom, 0px)))',
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)',
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
