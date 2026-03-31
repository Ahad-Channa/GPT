import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiLogOut, FiHexagon, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { currentUser, mongoUser, logout } = useAuth();
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
    <header className="h-[90px] bg-black/20 backdrop-blur-2xl border-b border-white/[0.04] flex items-center justify-between px-8 sticky top-0 z-40">
      
      {/* Mobile Brand Placeholder */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
            <span className="font-bold text-white text-sm">N</span>
        </div>
      </div>

      <div className="hidden md:block">
         {/* Blank space where title used to be, to maintain distribution */}
      </div>

      {/* Right Side Tools */}
      <div className="flex items-center gap-6">
        
        {/* Wallet Balance Pill */}
        <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-full pl-2 pr-5 py-1.5 hover:bg-white/[0.06] hover:border-cyan-500/30 transition-all cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
             <FiHexagon className="text-sm fill-cyan-400/20" />
          </div>
          <span className="font-bold text-slate-100 tracking-wide">
            {mongoUser?.walletBalance?.toFixed(2) || '0.00'}
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-8 bg-white/10"></div>

        {/* Profile Details */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
             <span className="text-sm font-semibold text-slate-200">
               {mongoUser?.displayName || 'Authorized User'}
             </span>
             <span className="text-[11px] font-bold text-violet-400 tracking-widest uppercase">
               VIP Level {mongoUser?.vipLevel || 1}
             </span>
          </div>

          <div className="relative inline-flex" ref={dropdownRef}>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 p-[2px] shadow-lg cursor-pointer hover:scale-105 transition-transform"
            >
              <img 
                src={currentUser?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} 
                alt="Avatar" 
                className="w-full h-full rounded-2xl object-cover bg-[#08080c]"
              />
            </div>

            {/* Profile & Logout Dropdown Menu */}
            <div 
              className={`absolute right-0 top-14 transition-all duration-300 bg-[#12121a] border border-white/10 text-slate-300 text-sm font-semibold p-2.5 rounded-2xl shadow-2xl flex flex-col min-w-[160px] ${
                isDropdownOpen ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'
              }`}
            >
               <div onClick={() => { setIsDropdownOpen(false); navigate('/dashboard/profile'); }} className="px-3 py-2.5 hover:bg-white/5 hover:text-cyan-400 cursor-pointer rounded-lg flex items-center gap-3 transition-colors mb-1">
                  <FiUser className="text-lg" /> Profile
               </div>
               <div onClick={() => { setIsDropdownOpen(false); logout(); }} className="px-3 py-2.5 hover:bg-red-500/10 hover:text-red-400 cursor-pointer rounded-lg flex items-center gap-3 transition-colors">
                  <FiLogOut className="text-lg" /> Disconnect
               </div>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};

export default Header;
