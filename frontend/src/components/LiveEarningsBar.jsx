import { useState, useEffect } from 'react';
import { FiActivity } from 'react-icons/fi';
import { FaCoins } from 'react-icons/fa6';
import PublicProfileModal from './PublicProfileModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LiveEarningsBar = () => {
  const [earnings, setEarnings] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

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

  // Helper to determine display details
  const getDetails = (tx) => {
    if (tx.transactionType === 'withdrawal') {
      const method = tx.method ? tx.method.charAt(0).toUpperCase() + tx.method.slice(1) : 'Withdrawal';
      return {
        amountStr: `$${(Math.abs(tx.amount) / 1000).toFixed(2)}`,
        isCoin: false,
        isWithdrawal: true,
        method: method,
        color: 'text-brand-cyan' // Different color for withdrawals
      };
    }
    
    // Earnings
    let offerwall = 'System';
    let task = 'Completed Task';
    
    if (tx.transactionType === 'daily_bonus') { task = 'Daily Bonus'; offerwall = 'Rewards'; }
    else if (tx.transactionType === 'admin_adjustment') { task = 'Admin Bonus'; offerwall = 'System'; }
    else if (tx.transactionType === 'promo_code') { task = 'Promo Code'; offerwall = 'Rewards'; }
    else {
      if (tx.metadata?.offerwall) offerwall = tx.metadata.offerwall;
      if (tx.description) task = tx.description;
    }

    return {
      amountStr: `+${Math.abs(tx.amount).toLocaleString()}`,
      isCoin: true,
      isWithdrawal: false,
      offerwall,
      task,
      color: 'text-brand-accent'
    };
  };

  return (
    <>
      {/* Removed overflow-hidden so the tooltip dropdown is visible */}
      <div className="w-full bg-brand-darker border-b border-brand-border whitespace-nowrap h-14 flex items-center relative shadow-sm z-30">
        
        {/* Fade Gradients for smooth edges */}
        <div className="absolute left-0 w-32 h-full bg-gradient-to-r from-brand-darker to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 w-32 h-full bg-gradient-to-l from-brand-darker to-transparent z-10 pointer-events-none" />
        
        {/* LIVE Indicator Box */}
        <div className="flex items-center gap-3 px-6 z-20 bg-brand-darker border-r border-brand-border h-full relative cursor-default">
          <div className="relative flex items-center justify-center">
            <FiActivity className="text-brand-cyan text-lg animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>
          <div className="flex flex-col justify-center mt-0.5">
            <span className="text-[13px] font-display font-bold uppercase tracking-[0.1em] text-white leading-none">
              Live Feed
            </span>
          </div>
        </div>

        {/* Marquee Ticker */}
        <div className="flex z-0 hover:[animation-play-state:paused] transition-all" style={{ animation: 'marquee 50s linear infinite' }}>
          {[...earnings, ...earnings, ...earnings].map((tx, idx) => {
            const details = getDetails(tx);
            
            return (
              <div 
                key={`${tx._id}-${idx}`} 
                className="inline-flex items-center gap-3 px-6 py-2 border-r border-brand-border/50 group cursor-pointer transition-colors hover:bg-white/[0.02] relative" 
                onClick={() => tx.userId?._id && setSelectedUserId(tx.userId._id)}
              >
                
                {/* User Avatar */}
                <div className="relative w-8 h-8 rounded-md overflow-hidden bg-brand-card border border-brand-border shrink-0 transition-transform group-hover:scale-105">
                  <img 
                    src={tx.userId?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tx.userId?.displayName || 'User'}`} 
                    className="w-full h-full object-cover" 
                    alt="Avatar"
                    onError={(e) => e.target.style.display='none'}
                  />
                </div>
                
                {/* Base View (Username + Amount) */}
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-slate-200 tracking-tight">
                    {tx.userId?.displayName || 'User'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[13px] font-black font-mono tracking-tighter ${details.color}`}>
                      {details.amountStr}
                    </span>
                    {details.isCoin && (
                      <FaCoins className="w-3.5 h-3.5 text-yellow-500 drop-shadow-[0_0_5px_rgba(250,204,21,0.4)]" />
                    )}
                  </div>
                </div>

                {/* Tooltip Box (Hover) */}
                <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 pointer-events-none opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-[100] drop-shadow-2xl">
                  <div className="bg-[#0a0d14] border border-brand-border rounded-xl p-3.5 flex flex-col gap-2 min-w-[180px] shadow-[0_10px_40px_rgba(0,0,0,0.6)] relative before:content-[''] before:absolute before:-top-[7px] before:left-1/2 before:-translate-x-1/2 before:w-3.5 before:h-3.5 before:bg-[#0a0d14] before:border-t before:border-l before:border-brand-border before:rotate-45 before:rounded-tl-sm">
                    
                    {details.isWithdrawal ? (
                      <div className="flex flex-col relative z-10">
                        <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-widest mb-1.5">Withdrawal</span>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-display font-bold text-white">{details.method}</span>
                          <span className="text-sm font-black font-mono text-brand-cyan">{details.amountStr}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col relative z-10">
                        <span className="text-[10px] font-bold text-brand-accent uppercase tracking-widest mb-1.5">{details.offerwall}</span>
                        <span className="text-sm font-display font-bold text-white mb-2 truncate max-w-[220px]">{details.task}</span>
                        <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5 w-fit border border-white/5">
                          <span className="text-sm font-black font-mono text-brand-accent">{details.amountStr}</span>
                          <FaCoins className="w-3.5 h-3.5 text-yellow-500 drop-shadow-[0_0_5px_rgba(250,204,21,0.4)]" />
                        </div>
                      </div>
                    )}
                    
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-33.33%); }
          }
        `}} />
      </div>

      {/* Public Profile Modal */}
      {selectedUserId && (
        <PublicProfileModal
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  );
};

export default LiveEarningsBar;
