import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiLogOut, FiUser, FiSettings, FiZap, FiChevronDown, FiCreditCard } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
  const { currentUser, mongoUser, logout, isAdmin } = useAuth();
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
          onClick={() => navigate('/dashboard')}
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
        <div className="flex items-center gap-4">

          {/* Balance Chip — click to go to Wallet */}
          <button
            id="header-balance-chip"
            onClick={() => navigate('/dashboard/wallet')}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-sm hover:bg-white/[0.07] hover:border-blue-500/30 transition-all"
          >
            <FiZap className="text-indigo-400 text-xs" />
            <span className="text-slate-400 text-[11px] font-mono tracking-widest">BAL</span>
            <span className="font-semibold text-white font-mono text-sm">
              {mongoUser?.walletBalance?.toLocaleString() ?? '0'}
            </span>
            <span className="text-indigo-400 text-[10px] font-mono">PTS</span>
          </button>

          <div className="h-5 w-px bg-white/[0.08] hidden sm:block" />

          {/* Avatar + Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="header-profile-menu"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                <img
                  src={currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${mongoUser?.displayName || 'Felix'}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden md:flex flex-col items-start leading-none">
                <span className="text-xs font-semibold text-slate-200">
                  {mongoUser?.displayName || 'User'}
                </span>
                <span className="text-[10px] text-indigo-400 font-mono tracking-widest">
                  RANK {mongoUser?.vipLevel || 1}
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
                    id="header-profile-link"
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/profile'); }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center gap-3 border-b border-white/[0.04]"
                  >
                    <FiUser className="text-indigo-400" /> Profile
                  </button>

                  <button
                    id="header-wallet-link"
                    onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/wallet'); }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center gap-3 border-b border-white/[0.04]"
                  >
                    <FiCreditCard className="text-blue-400" /> Wallet
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
