import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LiveEarningsBar = () => {
  const [earnings, setEarnings] = useState([]);
  
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await fetch(`${API}/public/recent-earnings`);
        const data = await res.json();
        if (data.success && data.earnings?.length > 0) {
          setEarnings(data.earnings);
        }
      } catch (err) {
        console.error('Failed to load recent earnings frontend', err);
      }
    };
    fetchEarnings();
    const intv = setInterval(fetchEarnings, 30000);
    return () => clearInterval(intv);
  }, []);

  if (earnings.length === 0) return null;

  return (
    <div className="w-full bg-indigo-900/10 border-b border-white/[0.05] overflow-hidden whitespace-nowrap h-10 flex items-center shadow-[inset_0_-1px_0_rgba(255,255,255,0.02)] relative">
      <div className="absolute left-0 w-24 h-full bg-gradient-to-r from-[#080b14] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 w-24 h-full bg-gradient-to-l from-[#080b14] to-transparent z-10 pointer-events-none" />
      
      <div className="flex items-center gap-2 px-4 z-20 bg-[#080b14] border-r border-white/[0.05] h-full shadow-[20px_0_20px_rgba(8,11,20,0.8)]">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Live Feed</span>
      </div>

      <div className="flex z-0" style={{ animation: 'marquee 40s linear infinite' }}>
        {/* Double the array for seamless infinite scrolling */}
        {[...earnings, ...earnings].map((tx, idx) => (
          <div key={`${tx._id}-${idx}`} className="inline-flex items-center gap-3 mx-6">
            <div className="w-5 h-5 rounded-md overflow-hidden bg-white/5 border border-white/10 shrink-0">
              <img 
                src={tx.userId?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tx.userId?.displayName || 'User'}`} 
                className="w-full h-full object-cover" 
                alt="Avatar"
                onError={(e) => e.target.style.display='none'}
              />
            </div>
            <span className="text-[13px] font-semibold text-slate-300">{tx.userId?.displayName || 'User'}</span>
            <span className="text-[13px] text-slate-500">just earned</span>
            <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <span className="text-[13px] font-bold text-amber-400">+{tx.amount?.toLocaleString()}</span>
              <img src="/coin.png" className="w-3.5 h-3.5" alt="C" onError={(e) => e.target.style.display='none'}/>
            </div>
            <span className="text-[12px] text-slate-600 truncate max-w-[200px]">from {tx.description?.replace('Earned from ', '') || 'offer'}</span>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
};

export default LiveEarningsBar;
