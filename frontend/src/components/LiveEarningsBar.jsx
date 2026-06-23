import { useState, useEffect, useRef } from 'react';
import { FiActivity } from 'react-icons/fi';
import CoinIcon from './CoinIcon';
import { motion, AnimatePresence } from 'framer-motion';
import PublicProfileModal from './PublicProfileModal';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

const LiveEarningsBar = () => {
  const [earnings, setEarnings] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const socketRef = useRef(null);

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
    // Polling as fallback for historical data
    const intv = setInterval(fetchEarnings, 15000);

    // ── Real-time socket listener for instant live feed updates ──────────────
    // When a leaderboard reward (or other major earning) fires server-side,
    // the backend emits 'newEarning' globally so ALL users see it immediately.
    socketRef.current = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current.on('newEarning', (newTx) => {
      setEarnings(prev => {
        // Prepend the new transaction and cap the list at 20 items
        const updated = [newTx, ...prev.filter(t => t._id !== newTx._id)].slice(0, 20);
        return updated;
      });
    });

    return () => {
      clearInterval(intv);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
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
        color: 'text-[#49B265]' // Different color for withdrawals
      };
    }
    
    // Earnings
    let offerwall = 'System';
    let task = 'Completed Task';
    let taskCategory = 'Task: System Bonus';
    
    if (tx.transactionType === 'daily_bonus') { task = 'Daily Bonus'; offerwall = 'Rewards'; taskCategory = 'Task: Claimed Daily Bonus'; }
    else if (tx.transactionType === 'leaderboard_reward') { task = 'Leaderboard Prize'; offerwall = 'Rewards'; taskCategory = 'Task: Leaderboard Prize'; }
    else if (tx.transactionType === 'vip_reward') { task = 'VIP Reward'; offerwall = 'Rewards'; taskCategory = 'Task: VIP Reward'; }
    else if (tx.transactionType === 'mission_reward') { task = 'Mission Reward'; offerwall = 'Rewards'; taskCategory = 'Task: Completed Mission'; }
    else if (tx.transactionType === 'admin_adjustment') { task = 'Admin Bonus'; offerwall = 'System'; taskCategory = 'Task: Admin Adjustment'; }
    else if (tx.transactionType === 'promo_code') { task = 'Promo Code'; offerwall = 'Rewards'; taskCategory = 'Task: Redeemed Promo Code'; }
    else {
      if (tx.metadata?.offerwall) {
        offerwall = tx.metadata.offerwall;
        taskCategory = `Task: Completed ${tx.metadata.offerwall} offer`;
      } else {
        taskCategory = 'Task: Completed offer';
      }
      if (tx.description) task = tx.description;
    }

    return {
      amountStr: `+${Math.abs(tx.amount).toLocaleString()}`,
      isCoin: true,
      isWithdrawal: false,
      offerwall,
      task,
      taskCategory,
      color: 'text-[#FACC15]'
    };
  };

  return (
    <>
      {/* Removed overflow-hidden so the tooltip dropdown is visible */}
      <div 
        className="w-full bg-black whitespace-nowrap flex items-center relative shadow-sm z-30 mx-auto"
        style={{
          maxWidth: '1511px',
          height: '88px',
          borderTop: '1px solid rgba(255, 255, 255, 0.4)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.4)'
        }}
      >
        
        {/* Fade Gradients for smooth edges */}
        <div className="absolute right-0 w-32 h-full bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
        
        {/* LIVE Indicator Box */}
        <div className="flex items-center px-6 z-20 bg-black h-full relative cursor-default shrink-0">
          <div 
            className="flex items-center"
            style={{
              width: 'auto',
              minWidth: '112px',
              height: 'auto',
              minHeight: '20px',
              gap: '6px',
              background: 'transparent',
              padding: '2px 8px'
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#49B265] animate-pulse drop-shadow-[0_0_8px_rgba(73,178,101,0.8)] shrink-0" />
            <span style={{
              width: 'auto',
              minWidth: '96px',
              height: 'auto',
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              fontSize: '28px',
              lineHeight: '120%',
              color: 'rgba(73, 178, 101, 1)',
              display: 'block',
              textShadow: '0px 0px 10px rgba(41, 253, 152, 0.2)'
            }}>
              Live Feed
            </span>
          </div>
        </div>

        {/* Live Items Container - Scrollable */}
        <div className="relative flex-1 h-full z-0">
          <style>{`
            .hide-scroll::-webkit-scrollbar { display: none; }
          `}</style>
          <div 
            className="absolute inset-0 flex items-center gap-[6px] overflow-x-auto whitespace-nowrap hide-scroll px-4" 
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              paddingTop: '150px',
              paddingBottom: '150px',
              marginTop: '-150px',
              marginBottom: '-150px',
              pointerEvents: 'none'
            }}
          >
            <AnimatePresence initial={false}>
              {earnings.map((tx, index) => {
                const details = getDetails(tx);
                const coinId = (index % 2) + 1;
                
                return (
                  <motion.div 
                    key={tx._id}
                    layout
                    initial={{ opacity: 0, x: -30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                    className="inline-flex items-center group cursor-pointer transition-transform hover:scale-[1.02] relative shrink-0" 
                    style={{
                      width: 'auto',
                      minWidth: 'fit-content',
                      height: '46px',
                      borderRadius: '50px',
                      gap: '8px',
                      padding: '10px 16px',
                      background: 'rgba(255, 255, 255, 0.14)',
                      pointerEvents: 'auto'
                    }}
                    onClick={() => tx.userId?._id && setSelectedUserId(tx.userId._id)}
                  >
                    
                    {/* User Avatar */}
                    <div 
                      className="relative rounded-full overflow-hidden shrink-0 transition-transform group-hover:scale-105"
                      style={{ width: '26px', height: '26px' }}
                    >
                      <img 
                        src={tx.userId?.avatarUrl || `/avatars/avatar1.png`} 
                        className="w-full h-full object-cover" 
                        alt="Avatar"
                        onError={(e) => e.target.style.display='none'}
                      />
                    </div>
                    
                    {/* Base View (Username + Amount) */}
                    <div 
                      className="flex items-center gap-[12px]"
                      style={{ height: '18px' }}
                    >
                      <span 
                        className="text-left shrink-0"
                        style={{
                          height: 'auto',
                          fontFamily: '"Barlow Condensed", sans-serif',
                          fontWeight: 600,
                          fontSize: '22px',
                          lineHeight: '120%',
                          color: 'rgba(255, 255, 255, 1)'
                        }}
                      >
                        {tx.userId?.displayName || 'User'}
                      </span>
                      <div 
                        className="flex items-center shrink-0"
                        style={{ height: '18px', gap: '3px' }}
                      >
                        {details.isCoin && (
                          <img 
                            src="/coins/coinfinal.png"
                            alt="Coin"
                            style={{ width: '18px', height: '18px' }}
                          />
                        )}
                        {!details.isCoin && details.isWithdrawal && (
                          <img 
                            src="/coins/paisa.png"
                            alt="Paisa"
                            style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                          />
                        )}
                        <span 
                          style={details.isWithdrawal ? {
                            height: 'auto',
                            fontFamily: '"Barlow Condensed", sans-serif',
                            fontWeight: 700,
                            fontSize: '16px',
                            lineHeight: '130%',
                            color: '#49B265'
                          } : {
                            height: 'auto',
                            fontFamily: '"Barlow Condensed", sans-serif',
                            fontWeight: 700,
                            fontSize: '16px',
                            lineHeight: '130%',
                            backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            color: 'transparent'
                          }}
                        >
                          {details.amountStr}
                        </span>
                      </div>
                    </div>

                    {/* Tooltip Box (Hover) */}
                    <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 pointer-events-none opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-[100] drop-shadow-2xl">
                      <div 
                        className="flex flex-col relative shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
                        style={{
                          width: 'auto',
                          minWidth: '167px',
                          height: 'auto',
                          minHeight: '97px',
                          borderRadius: '12px',
                          gap: '10px',
                          padding: '12px',
                          background: 'rgba(36, 36, 36, 1)',
                          backdropFilter: 'blur(44px)',
                          WebkitBackdropFilter: 'blur(44px)',
                          boxSizing: 'border-box'
                        }}
                      >
                        {details.isWithdrawal ? (
                          <div className="flex flex-col relative z-10 h-full justify-between gap-[8px]">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '143px', height: 'auto' }}>
                              <span style={{
                                fontFamily: '"Barlow Condensed", sans-serif',
                                fontWeight: 700,
                                fontSize: '15px',
                                lineHeight: '120%',
                                color: 'rgba(255, 255, 255, 1)',
                                whiteSpace: 'nowrap'
                              }}>
                                Withdrawal Completed
                              </span>
                              <span style={{
                                fontFamily: '"Barlow Condensed", sans-serif',
                                fontWeight: 500,
                                fontSize: '12px',
                                lineHeight: '130%',
                                color: 'rgba(136, 136, 136, 1)'
                              }}>
                                Method: {details.method}
                              </span>
                            </div>
                            <div style={{ width: '143px', height: '0px', borderTop: '1px solid rgba(255, 255, 255, 0.12)', flexShrink: 0 }} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '143px', height: '18px' }}>
                              <span style={{ 
                                fontFamily: '"Barlow Condensed", sans-serif', 
                                fontWeight: 500, 
                                fontSize: '13px', 
                                lineHeight: '130%', 
                                color: 'rgba(255, 255, 255, 1)',
                                whiteSpace: 'nowrap'
                              }}>
                                Amount
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <img src="/coins/paisa.png" alt="Paisa" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                                <span style={{ 
                                  fontFamily: '"Barlow Condensed", sans-serif', 
                                  fontWeight: 700, 
                                  fontSize: '16px', 
                                  lineHeight: '130%', 
                                  color: '#49B265',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}>
                                  {details.amountStr}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col relative z-10 h-full justify-between gap-[10px]">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '143px', height: 'auto' }}>
                              <span style={{
                                width: '143px', height: 'auto',
                                fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '14px', lineHeight: '120%', color: 'rgba(255, 255, 255, 1)',
                                whiteSpace: 'normal', wordBreak: 'break-word'
                              }}>
                                {details.task}
                              </span>
                              <span style={{
                                width: '143px', height: '14px',
                                fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontSize: '11px', lineHeight: '130%', color: 'rgba(136, 136, 136, 1)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                              }}>
                                {details.taskCategory}
                              </span>
                            </div>
                            <div style={{ width: '143px', height: '0px', borderTop: '1px solid rgba(255, 255, 255, 0.12)', flexShrink: 0 }} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '143px', height: '18px' }}>
                              <span style={{ 
                                width: '32px', 
                                height: '17px', 
                                fontFamily: '"Barlow Condensed", sans-serif', 
                                fontWeight: 500, 
                                fontSize: '13px', 
                                lineHeight: '130%', 
                                textAlign: 'right', 
                                color: 'rgba(255, 255, 255, 1)',
                                whiteSpace: 'nowrap'
                              }}>
                                Earned
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', width: '50px', height: '18px', gap: '3px' }}>
                                <img src="/coins/coinfinal.png" alt="coin" style={{ width: '18px', height: '18px' }} />
                                <span style={{ 
                                  width: '29px', 
                                  height: '11px', 
                                  fontFamily: '"Barlow Condensed", sans-serif', 
                                  fontWeight: 700, 
                                  fontSize: '16px', 
                                  lineHeight: '130%', 
                                  backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)', 
                                  WebkitBackgroundClip: 'text', 
                                  color: 'transparent',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}>
                                  {details.amountStr}
                                </span>
                              </div>
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
