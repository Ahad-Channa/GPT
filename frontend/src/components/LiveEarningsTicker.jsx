import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiStar, FiActivity } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const LiveEarningsTicker = () => {
  const [earnings, setEarnings] = useState([]);

  const fetchEarnings = async () => {
    try {
      const res = await fetch(`${API}/api/public/recent-earnings`);
      const data = await res.json();
      if (data.success) {
        setEarnings(data.recentEarnings || []);
      }
    } catch (e) {
      console.error('Failed to fetch recent earnings', e);
    }
  };

  useEffect(() => {
    fetchEarnings();
    const interval = setInterval(fetchEarnings, 30000); // 30 sec polling
    return () => clearInterval(interval);
  }, []);

  if (earnings.length === 0) return null;

  return (
    <div className="hidden lg:flex items-center overflow-hidden bg-white/[0.02] border border-white/[0.05] rounded-xl h-[34px] w-64 md:w-80 relative group flex-shrink-0">
      {/* Icon badge */}
      <div className="absolute left-0 top-0 bottom-0 z-10 bg-[#08080c] px-3 flex items-center border-r border-white/5 shadow-[4px_0_10px_rgba(8,8,12,0.8)]">
        <FiActivity className="text-emerald-400 animate-pulse text-sm" />
      </div>

      {/* Marquee Container */}
      <div className="flex-1 overflow-hidden relative ml-[40px]">
        {/* Gradient fades for smooth entry/exit */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#08080c] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#08080c] to-transparent z-10 pointer-events-none" />

        <div className="flex whitespace-nowrap animate-marquee gap-8 hover:[animation-play-state:paused]">
          {/* Double the list to create a seamless loop */}
          {[...earnings, ...earnings].map((earning, i) => (
            <div key={`${earning._id || i}-${i}`} className="flex items-center gap-2 py-1 text-xs">
              <div className="flex items-center gap-1.5 bg-white/[0.04] px-2 py-1 rounded-md border border-white/[0.04]">
                {earning.user.avatarUrl ? (
                  <img src={earning.user.avatarUrl} alt="User Avatar" className="w-4 h-4 rounded-full" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[8px] font-bold">
                    {earning.user.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="text-slate-300 font-medium truncate max-w-[80px]">
                  {earning.user.displayName || 'Hidden User'}
                </span>
              </div>
              <span className="text-slate-500">earned</span>
              <span className="text-emerald-400 font-bold flex items-center">
                +{earning.amount?.toLocaleString()} <img src="/coin.png" className="w-3 h-3 ml-1 drop-shadow-md" alt="C" onError={(e) => e.target.style.display='none'}/>
              </span>
              <span className="text-slate-500 truncate max-w-[120px]">
                from {earning.title || 'Offer'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveEarningsTicker;
