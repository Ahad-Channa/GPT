import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getLevelFromEarned } from '../../utils/vipLevels';
import VipBadge from '../VipBadge';
import { useNotifications } from '../../contexts/NotificationContext';
import { useDailyBonus } from '../../contexts/DailyBonusContext';
import { FiLogOut, FiUser, FiSettings, FiZap, FiChevronDown, FiCreditCard, FiLock, FiClock, FiBell, FiUsers, FiGift, FiDollarSign, FiMessageSquare, FiTarget } from 'react-icons/fi';
import { FaTrophy } from 'react-icons/fa6';
import CoinDisplay from '../CoinDisplay';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DailyBonusChip = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { status, loading, fetchStatus } = useDailyBonus();
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

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
        className="group hidden lg:flex items-center gap-2 px-4 py-1.5 text-sm transition-all font-semibold text-white hover:text-[#49B265] bg-transparent border-none"
      >
        <FiClock className="text-[#49B265] text-sm transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(73,178,101,0.5)]" />
        <span>{timeLeft || '...'}</span>
      </button>
    );
  }

  // Gate unlocked — very prominent pulsing claim button
  if (status.gateUnlocked) {
    return (
      <button
        onClick={claimBonus}
        disabled={claiming}
        className="hidden lg:flex relative items-center gap-2 px-5 py-1.5 rounded-[10px] font-bold text-sm text-white
          bg-[#49B265] hover:brightness-110
          shadow-[0_0_15px_rgba(73,178,101,0.4)]
          hover:shadow-[0_0_25px_rgba(73,178,101,0.6)]
          disabled:opacity-60 overflow-hidden group border-none"
        style={{ animation: 'bonusPulse 1.8s ease-in-out infinite' }}
      >
        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-600" />
        <FiGift className="text-white text-sm relative z-10" />
        <span className="relative z-10 font-bold">{claiming ? 'Claiming…' : '🎁 Claim Bonus!'}</span>
      </button>
    );
  }

  // Gate locked — button with inline progress bar
  const progressPercent = Math.min(100, Math.floor((status.earned / status.required) * 100));

  return (
    <button
      onClick={() => navigate('/dashboard/daily-bonus')}
      className="group hidden lg:flex items-center gap-2 px-4 py-1.5 text-sm transition-all font-semibold text-white hover:text-[#49B265] bg-transparent border-none relative overflow-visible"
    >
      <div className="flex items-center gap-2">
        <FiLock className="text-[#49B265] text-sm transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(73,178,101,0.5)]" />
        <span>Daily Bonus</span>
        <span className="ml-1 text-[10px] bg-[#49B265]/20 text-[#49B265] px-1.5 py-0.5 rounded-full font-bold">{progressPercent}%</span>
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
      .catch(() => {});
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
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] backdrop-blur-xl bg-[#0b1512]/80">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-[84px] flex items-center justify-between">

        {/* Brand */}
        <button
          id="header-brand-logo"
          onClick={() => navigate('/')}
          className="flex items-center gap-3 group"
        >
          <img src="/coins/round.png" alt="TaskMint Logo" className="h-10 w-10 object-contain transition-transform group-hover:scale-105" />
          <span className="text-white font-extrabold text-2xl tracking-tight hidden sm:block">TaskMint</span>
        </button>



        {/* Right Controls */}
        <div className="flex items-center gap-3 lg:gap-4">

          {/* Earn Button (First on left) */}
          <button
            id="header-earn-btn"
            onClick={() => navigate('/dashboard')}
            className="hidden lg:flex items-center gap-2 px-6 py-1.5 rounded-[10px] bg-[#49B265] hover:brightness-110 text-white font-bold text-sm transition-all border-none relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <FiDollarSign className="text-white text-[16px] relative z-10" />
            <span className="relative z-10 tracking-wide text-[15px] font-bold">Earn</span>
          </button>

          <DailyBonusChip />

          {/* Leaderboard Chip */}
          <button
            id="header-leaderboard-chip"
            onClick={() => navigate('/dashboard/leaderboard')}
            className="group hidden lg:flex items-center gap-2 px-4 py-1.5 text-sm transition-all font-semibold text-white hover:text-[#49B265] bg-transparent border-none"
          >
            <FaTrophy className="text-[#49B265] text-sm transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(73,178,101,0.5)]" />
            <span>Leaderboard</span>
          </button>

          {/* Affiliates Button */}
          <button
            id="header-affiliates-btn"
            onClick={() => navigate('/dashboard/affiliates')}
            className="group hidden lg:flex items-center gap-2 px-4 py-1.5 text-sm transition-all font-semibold text-white hover:text-[#49B265] bg-transparent border-none"
          >
            <FiUsers className="text-[#49B265] text-sm transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(73,178,101,0.5)]" />
            <span>Affiliates</span>
          </button>
          
          {/* Withdraw Button */}
          <button
            id="header-withdraw-btn"
            onClick={() => navigate('/dashboard/wallet')}
            className="group hidden sm:flex items-center gap-2 px-4 py-1.5 text-sm transition-all font-semibold text-white hover:text-[#49B265] bg-transparent border-none"
          >
            <FiCreditCard className="text-[#49B265] text-sm transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(73,178,101,0.5)]" />
            <span>Withdraw</span>
          </button>

          <div className="h-5 w-px bg-white/[0.08] hidden sm:block" />

          {/* Live Chat Button → sidebar */}
          <button
            id="header-livechat-btn"
            onClick={onChatToggle}
            className={`relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-[10px] transition-colors group border-none ${
              chatOpen
                ? 'bg-[#49B265]/20'
                : 'bg-[#1a1b1a] hover:bg-[#252625]'
            }`}
          >
            <FiMessageSquare className={`text-sm md:text-base transition-colors ${
              chatOpen ? 'text-[#49B265]' : 'text-slate-300 group-hover:text-[#49B265]'
            }`} />
          </button>

          {/* Notifications */}
          <button
            id="header-notifications-btn"
            onClick={togglePanel}
            className="relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-[10px] bg-[#1a1b1a] hover:bg-[#252625] transition-colors border-none group"
          >
            <FiBell className="text-slate-300 text-sm md:text-base group-hover:text-[#49B265] transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2.5 w-2 h-2 bg-[#49B265] rounded-full shadow-[0_0_8px_rgba(73,178,101,0.8)]" />
            )}
          </button>

          {/* Avatar + Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="header-profile-menu"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors group"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-[#111827]">
                <img
                  src={mongoUser?.avatarUrl || currentUser?.photoURL || `/avatars/avatar1.png`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden md:flex flex-col items-start leading-none gap-1">
                <span className="text-xs font-semibold text-slate-200">
                  {mongoUser?.displayName || 'User'}
                </span>
                <span className="text-[11px] text-amber-400 font-bold font-sans tracking-widest flex items-center gap-1">
                  <CoinDisplay amount={mongoUser?.walletBalance ?? 0} size={14} className="font-bold" />
                </span>
              </div>
              <FiChevronDown
                className={`text-slate-500 text-xs transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-14 w-48 bg-[#0b101e] shadow-card border border-white/[0.08] overflow-hidden z-50 rounded-xl"
                >
                  {/* Balance (mobile) */}
                  <div className="sm:hidden px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                    <FiZap className="text-indigo-400 text-xs" />
                    <span className="text-slate-300 text-xs font-mono">
                      {mongoUser?.walletBalance?.toFixed(2) ?? '0.00'} PTS
                    </span>
                  </div>

                  <button
                    id="header-profile-link-nav"
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/profile'); }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center gap-3 border-b border-white/[0.04]"
                  >
                    <FiUser className="text-indigo-400" /> My Profile
                  </button>

                  <button
                    id="header-vip-link-nav"
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/vip'); }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center gap-3 border-b border-white/[0.04]"
                  >
                    <span style={{ fontSize: '0.7rem' }}>⭐</span>
                    <span>VIP Status</span>
                    {mongoUser?.totalEarned >= 0 && getLevelFromEarned(mongoUser.totalEarned) && (
                      <span style={{ marginLeft: 'auto' }}>
                        <VipBadge
                          tier={getLevelFromEarned(mongoUser.totalEarned).tier}
                          rank={getLevelFromEarned(mongoUser.totalEarned).rank}
                          size="xs"
                        />
                      </span>
                    )}
                  </button>

                  {missionsEnabled && (
                    <button
                      id="header-missions-link-nav"
                      onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/missions'); }}
                      className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center gap-3 border-b border-white/[0.04]"
                    >
                      <FiTarget className="text-indigo-400" />
                      <span>Missions</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      id="header-admin-link"
                      onClick={() => { setIsDropdownOpen(false); navigate('/admin'); }}
                      className="w-full text-left px-4 py-3 text-sm text-amber-400 hover:bg-amber-500/[0.08] hover:text-amber-300 transition-colors flex items-center gap-3 border-b border-white/[0.04]"
                    >
                      <FiSettings className="text-amber-400" /> Admin Panel
                    </button>
                  )}

                  <button
                    id="header-logout-btn"
                    onClick={() => { setIsDropdownOpen(false); logout(); }}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/[0.08] hover:text-red-300 transition-colors flex items-center gap-3"
                  >
                    <FiLogOut /> Sign Out
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
