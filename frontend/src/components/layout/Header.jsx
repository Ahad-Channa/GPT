import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useDailyBonus } from '../../contexts/DailyBonusContext';
import { FiLogOut, FiUser, FiSettings, FiZap, FiChevronDown, FiCreditCard, FiLock, FiClock, FiBell, FiUsers, FiGift, FiDollarSign, FiMessageSquare } from 'react-icons/fi';
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
    return <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] animate-pulse h-[34px] w-28" />;
  }

  // Already claimed — countdown
  if (status.alreadyClaimed) {
    return (
      <button
        onClick={() => navigate('/dashboard/daily-bonus')}
        className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm hover:bg-white/[0.08] transition-all font-semibold text-slate-400"
      >
        <FiClock className="text-slate-500 text-sm" />
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
        className="hidden lg:flex relative items-center gap-2 px-5 py-1.5 rounded-xl font-bold text-sm text-white
          bg-gradient-to-r from-amber-400 to-orange-500
          border border-amber-300/60
          shadow-[0_0_18px_rgba(245,158,11,0.7),0_0_40px_rgba(245,158,11,0.3)]
          hover:shadow-[0_0_28px_rgba(245,158,11,0.9),0_0_60px_rgba(245,158,11,0.5)]
          disabled:opacity-60 overflow-hidden group"
        style={{ animation: 'bonusPulse 1.8s ease-in-out infinite' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-600" />
        <FiGift className="text-white text-sm relative z-10" />
        <span className="relative z-10">{claiming ? 'Claiming…' : '🎁 Claim Bonus!'}</span>
      </button>
    );
  }

  // Gate locked — button with inline progress bar
  const progressPercent = Math.min(100, Math.floor((status.earned / status.required) * 100));

  return (
    <button
      onClick={() => navigate('/dashboard/daily-bonus')}
      className="hidden lg:flex flex-col justify-center px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all group relative overflow-visible"
      style={{ minWidth: '128px', height: '34px' }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <FiLock className="text-slate-500 text-[10px] flex-shrink-0" />
        <span className="font-semibold text-slate-300 text-xs">Daily Bonus</span>
        <span className="ml-auto text-[10px] text-indigo-400 font-bold">{progressPercent}%</span>
      </div>
      <div className="w-full h-1 bg-white/[0.07] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full transition-all duration-700"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {/* Hover tooltip */}
      <div className="absolute top-11 right-0 w-52 p-3 rounded-xl bg-[#0b101e] border border-white/[0.08] shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-left">
        <p className="text-xs text-slate-300 mb-2">
          Earn <span className="font-bold text-white"><CoinDisplay amount={status.required - status.earned} showIcon={true} size={12} /></span> more to unlock.
        </p>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
          <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${progressPercent}%` }} />
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
  const dropdownRef = useRef(null);

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
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] backdrop-blur-xl bg-[#080b14]/80">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-[66px] flex items-center justify-between">

        {/* Brand */}
        <button
          id="header-brand-logo"
          onClick={() => navigate('/')}
          className="flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow">
            <FiZap className="text-white text-sm" />
          </div>
          <div className="flex flex-col leading-none text-left">
            <span className="text-sm font-bold font-display text-white tracking-tight">GPT</span>
            <span className="text-[10px] text-slate-500 tracking-widest uppercase font-mono">Platform</span>
          </div>
        </button>



        {/* Right Controls */}
        <div className="flex items-center gap-3 lg:gap-4">

          {/* Earn Button (First on left) */}
          <button
            id="header-earn-btn"
            onClick={() => navigate('/dashboard')}
            className="hidden lg:flex items-center gap-2 px-6 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] border border-cyan-400/50 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <FiDollarSign className="text-white text-[16px] relative z-10" />
            <span className="relative z-10 tracking-wide text-[15px]">Earn</span>
          </button>

          <DailyBonusChip />

          {/* Leaderboard Chip */}
          <button
            id="header-leaderboard-chip"
            onClick={() => navigate('/dashboard/leaderboard')}
            className="group hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm hover:bg-white/[0.08] hover:border-white/[0.15] hover:shadow-[0_0_15px_rgba(251,191,36,0.15)] transition-all font-semibold text-slate-300 hover:text-amber-50"
          >
            <FaTrophy className="text-slate-400 text-sm transition-all duration-300 group-hover:text-amber-400 group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <span>Leaderboard</span>
          </button>

          {/* Affiliates Button */}
          <button
            id="header-affiliates-btn"
            onClick={() => navigate('/dashboard/affiliates')}
            className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm hover:bg-white/[0.08] hover:border-white/[0.15] transition-all font-semibold text-slate-300"
          >
            <FiUsers className="text-slate-400 text-sm" />
            <span>Affiliates</span>
          </button>
          
          {/* Withdraw Button */}
          <button
            id="header-withdraw-btn"
            onClick={() => navigate('/dashboard/wallet')}
            className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all font-bold"
          >
            <FiCreditCard className="text-emerald-400 text-sm" />
            <span>Withdraw</span>
          </button>

          <div className="h-5 w-px bg-white/[0.08] hidden sm:block" />

          {/* Live Chat Button → sidebar */}
          <button
            id="header-livechat-btn"
            onClick={onChatToggle}
            className={`relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl border transition-colors group ${
              chatOpen
                ? 'bg-indigo-500/20 border-indigo-500/40'
                : 'bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.08]'
            }`}
          >
            <FiMessageSquare className={`text-sm md:text-base transition-colors ${
              chatOpen ? 'text-indigo-400' : 'text-slate-300 group-hover:text-indigo-400'
            }`} />
          </button>

          {/* Notifications */}
          <button
            id="header-notifications-btn"
            onClick={togglePanel}
            className="relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-colors"
          >
            <FiBell className="text-slate-300 text-sm md:text-base" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2.5 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
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
