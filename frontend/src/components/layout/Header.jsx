import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { FiLogOut, FiUser, FiSettings, FiZap, FiChevronDown, FiCreditCard, FiGrid, FiLock, FiUnlock, FiClock, FiCheckCircle, FiTrendingUp, FiBell } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DailyBonusChip = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const fetchStatus = async () => {
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/wallet/daily-bonus-status`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setStatus(data);
    } catch (err) { } finally { setLoading(false); }
  };

  useEffect(() => { if (currentUser) fetchStatus(); }, [currentUser]);

  useEffect(() => {
    if (!status?.nextClaimAt || !status.alreadyClaimed) return;
    const target = new Date(status.nextClaimAt).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft('00:00:00');
        fetchStatus();
        return;
      }
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
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
    return (
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] animate-pulse h-[34px] w-24"></div>
    );
  }

  if (status.alreadyClaimed) {
    return (
      <button 
        onClick={() => navigate('/dashboard/daily-bonus')}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm hover:bg-emerald-500/20 transition-all text-left"
      >
        <FiClock className="text-emerald-400 text-xs" />
        <div className="flex flex-col leading-none">
          <span className="text-[9px] text-emerald-500/70 font-semibold uppercase tracking-widest hover:text-emerald-400">Daily Bonus</span>
          <span className="text-emerald-300 text-[11px] font-sans font-medium tracking-widest">{timeLeft || '...'}</span>
        </div>
      </button>
    );
  }

  if (status.gateUnlocked) {
    return (
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-sm hover:bg-amber-500/30 transition-all shadow-glow">
        <FiUnlock className="text-amber-400 text-xs animate-pulse" />
        <div className="flex flex-col leading-none">
          <button onClick={() => navigate('/dashboard/daily-bonus')} className="text-[9px] text-amber-500/70 font-semibold uppercase tracking-widest hover:text-amber-400 text-left">Daily Bonus</button>
          <button onClick={claimBonus} disabled={claiming} className="text-amber-400 text-[11px] font-bold tracking-widest uppercase text-left hover:text-white transition-colors disabled:opacity-50">
            {claiming ? 'WAIT...' : 'CLAIM NOW'}
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.min(100, Math.floor((status.earned / status.required) * 100));

  return (
    <button 
      onClick={() => navigate('/dashboard/daily-bonus')}
      className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm hover:bg-white/10 transition-all group relative text-left"
    >
      <FiLock className="text-slate-400 text-xs flex-shrink-0" />
      <div className="flex flex-col leading-none gap-1">
        <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest group-hover:text-white transition-colors">Daily Bonus</span>
        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="bg-indigo-400 h-full rounded-full transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      
      {/* Tooltip */}
      <div className="absolute top-11 right-0 w-52 p-3 rounded-xl bg-[#0b101e] border border-white/[0.08] shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-left">
        <p className="text-xs text-slate-300 mb-2">Earn <span className="font-bold text-white">{status.required - status.earned}</span> more coins today to unlock your Daily Bonus.</p>
        <div className="flex justify-between items-center text-[10px] font-sans font-medium text-slate-400">
          <span>{status.earned} earned</span>
          <span>{status.required} needed</span>
        </div>
        <p className="text-[9px] text-indigo-400 mt-2 font-bold uppercase text-center w-full">Click for details</p>
      </div>
    </button>
  );
};

const Header = () => {
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
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold font-display text-white tracking-tight">GPT</span>
            <span className="text-[10px] text-slate-500 tracking-widest uppercase font-mono">Platform</span>
          </div>
        </button>



        {/* Right Controls */}
        <div className="flex items-center gap-3 lg:gap-4">

          <DailyBonusChip />

          {/* Earn Button */}
          <button
            id="header-earn-btn"
            onClick={() => navigate('/dashboard/earn')}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/20 hover:border-amber-500/50 transition-all font-bold shadow-[0_0_15px_rgba(245,158,11,0.15)]"
          >
            <FiZap className="text-amber-400 text-xs" />
            <span>Earn</span>
          </button>

          {/* Leaderboard Chip */}
          <button
            id="header-leaderboard-chip"
            onClick={() => navigate('/dashboard/leaderboard')}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm hover:bg-indigo-500/[0.08] hover:border-indigo-500/30 transition-all"
          >
            <FiTrendingUp className="text-indigo-400 text-xs" />
            <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest">Leaderboard</span>
          </button>
          
          {/* Withdraw Button */}
          <button
            id="header-withdraw-btn"
            onClick={() => navigate('/dashboard/wallet')}
            className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all font-bold shadow-glow"
          >
            <FiCreditCard className="text-emerald-400 text-sm" />
            <span>Withdraw</span>
          </button>

          <div className="h-5 w-px bg-white/[0.08] hidden sm:block" />

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
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-[#111827]">
                <img
                  src={mongoUser?.avatarUrl || currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${mongoUser?.displayName || 'Felix'}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden md:flex flex-col items-start leading-none gap-1">
                <span className="text-xs font-semibold text-slate-200">
                  {mongoUser?.displayName || 'User'}
                </span>
                <span className="text-[11px] text-amber-400 font-bold font-sans tracking-widest flex items-center gap-1">
                  {mongoUser?.walletBalance?.toLocaleString() ?? '0'} <img src="/coin.png" className="w-3 h-3 drop-shadow-md" alt="C" onError={(e) => e.target.style.display='none'}/>
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
