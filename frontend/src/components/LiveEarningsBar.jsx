import { useState, useEffect } from 'react';
import { FiActivity } from 'react-icons/fi';
import CoinIcon from './CoinIcon';
import { motion, AnimatePresence } from 'framer-motion';
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
    // Fetch slightly more frequently to show new actions as they happen
    const intv = setInterval(fetchEarnings, 15000);
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
    else if (tx.transactionType === 'leaderboard_reward') { task = 'Leaderboard Prize'; offerwall = 'Rewards'; }
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
      <div className="w-full bg-brand-darker border-b border-brand-border whitespace-nowrap h-10 flex items-center relative shadow-sm z-30">
        
        {/* Fade Gradients for smooth edges */}
        <div className="absolute right-0 w-32 h-full bg-gradient-to-l from-brand-darker to-transparent z-10 pointer-events-none" />
        
        {/* LIVE Indicator Box */}
        <div className="flex items-center gap-3 px-6 z-20 bg-brand-darker border-r border-brand-border h-full relative cursor-default shrink-0">
          <div className="relative flex items-center justify-center">
            <FiActivity className="text-brand-cyan text-lg animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>
          <div className="flex flex-col justify-center mt-0.5">
            <span className="text-[13px] font-display font-bold uppercase tracking-[0.1em] text-white leading-none">
              Live Feed
            </span>
          </div>
        </div>

        {/* Live Items Container - Absolute positioned to avoid layout stretching and scrollbars */}
        <div className="relative flex-1 h-full z-0">
          <div className="absolute inset-0 flex items-center">
            <AnimatePresence initial={false}>
              {earnings.map((tx, index) => {
                const details = getDetails(tx);
                const coinId = (index % 6) + 1;
                
                return (
                  <motion.div 
                    key={tx._id}
                    layout
                    initial={{ opacity: 0, x: -30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                    className="inline-flex items-center gap-3 px-6 h-full border-r border-brand-border/50 group cursor-pointer transition-colors hover:bg-white/[0.02] relative shrink-0" 
                    onClick={() => tx.userId?._id && setSelectedUserId(tx.userId._id)}
                  >
                    
                    {/* User Avatar */}
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-brand-card border border-brand-border shrink-0 transition-transform group-hover:scale-105">
                      <img 
                        src={tx.userId?.avatarUrl || `/avatars/avatar1.png`} 
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
                          <CoinIcon size={17} coinId={coinId} />
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
                            <span className="text-sm font-display font-bold text-white mb-2 line-clamp-2 whitespace-normal break-words leading-snug max-w-[220px]">{details.task}</span>
                            <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5 w-fit border border-white/5">
                              <span className="text-sm font-black font-mono text-brand-accent">{details.amountStr}</span>
                              <CoinIcon size={17} coinId={coinId} />
                            </div>
                          </div>
                        )}
                        
                      </div>
                    </div>
                    
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
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
