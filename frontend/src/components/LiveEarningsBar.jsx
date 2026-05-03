import { useState, useEffect } from 'react';
import { FiActivity } from 'react-icons/fi';

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
    <div className="w-full bg-[#03060d] border-b border-white/[0.05] overflow-hidden whitespace-nowrap h-14 flex items-center relative">
      {/* Background Cyber Details */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(79,70,229,0.03)_1px,transparent_1px)] bg-[size:40px_100%] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent pointer-events-none" />

      {/* Fade Gradients */}
      <div className="absolute left-0 w-40 h-full bg-gradient-to-r from-[#03060d] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 w-40 h-full bg-gradient-to-l from-[#03060d] to-transparent z-10 pointer-events-none" />
      
      {/* LIVE Indicator Box */}
      <div className="flex items-center gap-3 px-6 z-20 bg-[#060a14] border-r border-indigo-500/20 h-full shadow-[20px_0_30px_-10px_rgba(3,6,13,1)] relative group cursor-default">
        <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
        <div className="relative flex items-center justify-center">
          <FiActivity className="text-emerald-400 text-lg animate-pulse drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-[9px] font-mono text-emerald-500/70 uppercase leading-none mb-1 tracking-widest">Network</span>
          <span className="text-[13px] font-black uppercase tracking-[0.1em] text-white leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
            Live Feed
          </span>
        </div>
      </div>

      {/* Marquee Ticker */}
      <div className="flex z-0 hover:[animation-play-state:paused] transition-all" style={{ animation: 'marquee 50s linear infinite' }}>
        {[...earnings, ...earnings, ...earnings].map((tx, idx) => (
          <div key={`${tx._id}-${idx}`} className="inline-flex items-center gap-4 px-8 py-2 group border-r border-white/[0.03]">
            {/* User Avatar */}
            <div className="relative w-8 h-8 rounded-sm overflow-hidden bg-[#0a0f1c] border border-white/10 shrink-0 transform rotate-3 group-hover:rotate-0 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <img 
                src={tx.userId?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tx.userId?.displayName || 'User'}`} 
                className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all" 
                alt="Avatar"
                onError={(e) => e.target.style.display='none'}
              />
            </div>
            
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[13px] font-bold text-slate-200 group-hover:text-white transition-colors tracking-tight">
                  {tx.userId?.displayName || 'User'}
                </span>
                <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">Extracted</span>
                
                {/* Amount */}
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-black text-emerald-400 font-mono tracking-tighter drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                    +{tx.amount?.toLocaleString()}
                  </span>
                  <img src="/coin.png" className="w-3.5 h-3.5 drop-shadow-[0_0_5px_rgba(250,204,21,0.4)]" alt="C" onError={(e) => e.target.style.display='none'}/>
                </div>
              </div>
              
              {/* Source/Description */}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 bg-indigo-500/50 rounded-full" />
                <span className="text-[11px] font-mono text-slate-500 truncate max-w-[200px] group-hover:text-indigo-300 transition-colors uppercase tracking-wider">
                  {tx.description?.replace('Earned from ', '') || 'OFFER'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}} />
    </div>
  );
};

export default LiveEarningsBar;
