import { useState, useEffect } from 'react';
import { FiActivity } from 'react-icons/fi';
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
        hoverText: `Payout Method: ${method}`,
        color: 'text-brand-cyan' // Different color for withdrawals
      };
    }
    
    // Earnings
    let hoverText = 'Completed Offer';
    if (tx.transactionType === 'daily_bonus') hoverText = 'Daily Bonus';
    else if (tx.transactionType === 'admin_adjustment') hoverText = 'Admin Bonus';
    else if (tx.transactionType === 'promo_code') hoverText = 'Promo Code';
    else if (tx.metadata?.offerwall) hoverText = tx.metadata.offerwall;
    else if (tx.description) hoverText = tx.description;

    return {
      amountStr: `+${Math.abs(tx.amount).toLocaleString()}`,
      isCoin: true,
      hoverText: hoverText,
      color: 'text-brand-accent'
    };
  };

  return (
    <>
      <div className="w-full bg-brand-darker border-b border-brand-border overflow-hidden whitespace-nowrap h-14 flex items-center relative shadow-sm">
        
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
              <div key={`${tx._id}-${idx}`} className="inline-flex items-center gap-4 px-6 py-2 border-r border-brand-border/50 group cursor-pointer transition-colors hover:bg-white/[0.02]" onClick={() => tx.userId?._id && setSelectedUserId(tx.userId._id)}>
                
                {/* User Avatar */}
                <div className="relative w-8 h-8 rounded-md overflow-hidden bg-brand-card border border-brand-border shrink-0 transition-transform group-hover:scale-105">
                  <img 
                    src={tx.userId?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tx.userId?.displayName || 'User'}`} 
                    className="w-full h-full object-cover" 
                    alt="Avatar"
                    onError={(e) => e.target.style.display='none'}
                  />
                </div>
                
                {/* Display Stack */}
                <div className="flex flex-col justify-center relative min-w-[120px] h-8">
                  
                  {/* First View: Username & Amount */}
                  <div className="absolute inset-0 flex items-center gap-2 transition-all duration-300 transform group-hover:-translate-y-2 group-hover:opacity-0 md:group-hover:opacity-0 md:group-hover:-translate-y-2">
                    <span className="text-[13px] font-bold text-slate-200 tracking-tight">
                      {tx.userId?.displayName || 'User'}
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                      <span className={`text-[13px] font-black font-mono tracking-tighter ${details.color}`}>
                        {details.amountStr}
                      </span>
                      {details.isCoin && (
                        <img src="/coin.png" className="w-3.5 h-3.5 drop-shadow-[0_0_5px_rgba(250,204,21,0.4)]" alt="C" onError={(e) => e.target.style.display='none'}/>
                      )}
                    </div>
                  </div>
                  
                  {/* Hover/Tap View: Details */}
                  <div className="absolute inset-0 flex items-center gap-2 transition-all duration-300 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                    <span className="text-[12px] font-bold text-white uppercase tracking-wider truncate">
                      {details.hoverText}
                    </span>
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
