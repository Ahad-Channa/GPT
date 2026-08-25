import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PublicProfileModal from './PublicProfileModal';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : 'http://localhost:5000';

// Global cache in memory so navigating across pages has ZERO delay and NO fake flash
let cachedEarningsGlobal = [];

// Avatar color palette for letter badges
const AVATAR_COLORS = [
  'bg-[#F59E0B]', // Amber
  'bg-[#22C55E]', // Green
  'bg-[#6366F1]', // Indigo
  'bg-[#06B6D4]', // Cyan
  'bg-[#8B5CF6]', // Purple
  'bg-[#EC4899]', // Pink
  'bg-[#10B981]', // Emerald
  'bg-[#3B82F6]', // Blue
];

const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

const LiveEarningsBar = () => {
  const [earnings, setEarnings] = useState(() => cachedEarningsGlobal);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hoveredData, setHoveredData] = useState(null);
  const socketRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isFetchingMoreRef = useRef(false);

  // Sync state with global cache
  const updateEarnings = useCallback((updater) => {
    setEarnings((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cachedEarningsGlobal = next;
      return next;
    });
  }, []);

  // Initial fetch on mount (only replaces if cache is empty or refreshes)
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await fetch(`${API}/public/recent-earnings?limit=20&skip=0`);
        const data = await res.json();
        if (data.success && Array.isArray(data.earnings)) {
          updateEarnings(data.earnings);
          if (data.earnings.length < 20) setHasMore(false);
        }
      } catch (err) {
        console.error('Failed to load recent earnings', err);
      }
    };

    if (cachedEarningsGlobal.length === 0) {
      fetchInitial();
    }

    // Socket listener for real-time live feed updates
    try {
      socketRef.current = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
      socketRef.current.on('newEarning', (newTx) => {
        updateEarnings((prev) => {
          const updated = [newTx, ...prev.filter((t) => t._id !== newTx._id)];
          return updated;
        });
      });
    } catch (err) {
      console.warn('Socket connection error:', err);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [updateEarnings]);

  // Load more when scrolled near the end
  const loadMore = useCallback(async () => {
    if (isFetchingMoreRef.current || !hasMore) return;
    isFetchingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const currentCount = cachedEarningsGlobal.length;
      const res = await fetch(`${API}/public/recent-earnings?limit=20&skip=${currentCount}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.earnings)) {
        if (data.earnings.length === 0) {
          setHasMore(false);
        } else {
          updateEarnings((prev) => {
            const existingIds = new Set(prev.map((e) => e._id));
            const newItems = data.earnings.filter((e) => !existingIds.has(e._id));
            return [...prev, ...newItems];
          });
          if (data.earnings.length < 20) {
            setHasMore(false);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load more earnings', err);
    } finally {
      isFetchingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, updateEarnings]);

  // Scroll event handler for horizontal infinite scroll + wheel support
  const handleScroll = () => {
    if (hoveredData) setHoveredData(null);
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, clientWidth, scrollWidth } = el;
    if (scrollWidth - (scrollLeft + clientWidth) < 250) {
      loadMore();
    }
  };

  const handleWheel = (e) => {
    if (scrollContainerRef.current) {
      if (e.deltaY !== 0) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
        handleScroll();
      }
    }
  };

  // Format details helper - absolutely no negative numbers or minus signs
  const getDetails = (tx) => {
    const rawAmount = Math.abs(Number(tx.amount) || 0);

    if (tx.isWithdrawal || tx.transactionType === 'withdrawal') {
      const method = tx.method ? tx.method.charAt(0).toUpperCase() + tx.method.slice(1) : 'Withdrawal';
      const usdValue = rawAmount >= 1000 
        ? (rawAmount / 1000).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        : rawAmount.toLocaleString();

      return {
        amountStr: `$${usdValue}`,
        isCoin: false,
        isWithdrawal: true,
        method,
        color: 'rgba(2, 121, 64, 1)',
      };
    }

    // Earnings
    let offerwall = 'System';
    let task = 'Completed Task';
    let taskCategory = 'Task: System Bonus';

    if (tx.transactionType === 'daily_bonus') {
      task = 'Daily Bonus';
      offerwall = 'Rewards';
      taskCategory = 'Task: Claimed Daily Bonus';
    } else if (tx.transactionType === 'leaderboard_reward') {
      task = 'Leaderboard Prize';
      offerwall = 'Rewards';
      taskCategory = 'Task: Leaderboard Prize';
    } else if (tx.transactionType === 'vip_reward') {
      task = 'VIP Reward';
      offerwall = 'Rewards';
      taskCategory = 'Task: VIP Reward';
    } else if (tx.transactionType === 'mission_reward') {
      task = 'Mission Reward';
      offerwall = 'Rewards';
      taskCategory = 'Task: Completed Mission';
    } else if (tx.transactionType === 'admin_adjustment') {
      task = 'Admin Bonus';
      offerwall = 'System';
      taskCategory = 'Task: Admin Adjustment';
    } else if (tx.transactionType === 'promo_code') {
      task = 'Promo Code';
      offerwall = 'Rewards';
      taskCategory = 'Task: Redeemed Promo Code';
    } else {
      if (tx.metadata?.offerwall) {
        offerwall = tx.metadata.offerwall;
        taskCategory = `Task: Completed ${tx.metadata.offerwall} offer`;
      } else {
        taskCategory = 'Task: Completed offer';
      }
      if (tx.description) task = tx.description;
    }

    const amountStr = rawAmount.toLocaleString();

    return {
      amountStr,
      isCoin: true,
      isWithdrawal: false,
      offerwall,
      task,
      taskCategory,
      color: 'rgba(231, 171, 24, 1)',
    };
  };

  return (
    <>
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        .hide-scroll {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>

      {/* Main Container */}
      <section
        id="live-feed-bar"
        className="w-full relative z-30 flex items-center transition-all select-none overflow-hidden"
        style={{
          height: '52px',
          background: 'rgba(222, 223, 247, 1)',
          paddingTop: '8px',
          paddingBottom: '8px',
          opacity: 1,
          transform: 'rotate(0deg)',
        }}
      >
        {/* Left Section: "• Live Feed" Title & Live Pulse (Fixed on left) */}
        <div
          className="flex items-center shrink-0 z-20 pl-4 md:pl-8 lg:pl-[56px] pr-2 h-full relative"
          style={{
            background: 'rgba(222, 223, 247, 1)',
            gap: '8px',
          }}
        >
          <div className="flex items-center gap-[8px]">
            {/* Live Indicator Dot with subtle ambient glow */}
            <span className="relative flex h-[10px] w-[10px] items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-[8px] w-[8px] bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
            </span>

            {/* Live Feed Title - Exact Spec */}
            <span
              style={{
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: '18px',
                lineHeight: '100%',
                letterSpacing: '-0.02em',
                color: '#0E0F0C',
                opacity: 1,
                transform: 'rotate(0deg)',
                display: 'inline-flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              Live Feed
            </span>
          </div>

          {/* Natural 20px Edge Fade */}
          <div
            className="absolute left-full top-0 bottom-0 w-5 pointer-events-none z-20"
            style={{
              background: 'linear-gradient(to right, rgba(222, 223, 247, 1) 0%, rgba(222, 223, 247, 0) 100%)',
            }}
          />
        </div>

        {/* Right Fade Mask */}
        <div
          className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to left, rgba(222, 223, 247, 1) 0%, rgba(222, 223, 247, 0) 100%)',
          }}
        />

        {/* Scrollable Container */}
        <div className="relative flex-1 h-full z-0 overflow-hidden">
          <div
            ref={scrollContainerRef}
            onWheel={handleWheel}
            onScroll={handleScroll}
            className="absolute inset-0 flex items-center gap-[6px] overflow-x-auto overflow-y-hidden whitespace-nowrap hide-scroll pl-1 pr-6 cursor-grab active:cursor-grabbing pointer-events-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              scrollBehavior: 'smooth',
            }}
          >
            {earnings.length === 0 ? (
              /* Subtle loading skeleton chips if first visit has 0 cache */
              <div className="flex items-center gap-[6px]">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={`skel-${n}`}
                    className="animate-pulse flex items-center shrink-0"
                    style={{
                      width: '120px',
                      height: '36px',
                      borderRadius: '30px',
                      background: 'rgba(255, 255, 255, 0.6)',
                      gap: '8.57px',
                      padding: '6px 14px 6px 6px',
                    }}
                  >
                    <div className="w-[24px] h-[24px] rounded-full bg-black/10 shrink-0" />
                    <div className="h-3 w-12 bg-black/10 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {earnings.map((tx, idx) => {
                  const details = getDetails(tx);
                  const displayName = tx.userId?.displayName || 'User';
                  const initialLetter = (displayName.charAt(0) || 'U').toUpperCase();
                  const avatarColor = getAvatarColor(displayName);
                  const key = tx._id || `item-${idx}`;

                  return (
                    <motion.div
                      key={key}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => tx.userId?._id && setSelectedUserId(tx.userId._id)}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredData({
                          tx,
                          details,
                          top: rect.bottom + 8,
                          left: rect.left + rect.width / 2,
                        });
                      }}
                      onMouseLeave={() => setHoveredData(null)}
                      className="relative inline-flex items-center shrink-0 transition-transform hover:scale-[1.02] cursor-pointer shadow-sm pointer-events-auto"
                      style={{
                        width: 'auto',
                        minWidth: 'fit-content',
                        height: '36px',
                        borderRadius: '30px',
                        opacity: 1,
                        transform: 'rotate(0deg)',
                        gap: '8.57px',
                        paddingTop: '6px',
                        paddingRight: '14px',
                        paddingBottom: '6px',
                        paddingLeft: '6px',
                        background: 'rgba(255, 255, 255, 1)',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Avatar Circle: 24px x 24px, border-radius: 25.71px */}
                      <div
                        className="shrink-0 overflow-hidden flex items-center justify-center shadow-inner"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '25.71px',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                        }}
                      >
                        {tx.userId?.avatarUrl ? (
                          <img
                            src={tx.userId.avatarUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div
                            className={`w-full h-full ${avatarColor} text-white flex items-center justify-center text-[11px] font-bold uppercase select-none`}
                          >
                            {initialLetter}
                          </div>
                        )}
                      </div>

                      {/* Username & Amount Container */}
                      <div className="flex items-center gap-[6px] shrink-0 whitespace-nowrap">
                        {/* Username - Exact Spec */}
                        <span
                          style={{
                            fontFamily: '"Bricolage Grotesque", sans-serif',
                            fontWeight: 700,
                            fontSize: '18px',
                            lineHeight: '100%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(14, 15, 12, 1)',
                            opacity: 1,
                            transform: 'rotate(0deg)',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          {displayName}
                        </span>

                        {/* Amount & Coin / Currency */}
                        <div className="flex items-center gap-[3px] shrink-0">
                          {details.isCoin ? (
                            <>
                              <img
                                src="/coins/procoinicon.png"
                                alt="Coin"
                                style={{
                                  width: '9px',
                                  height: '10px',
                                  opacity: 1,
                                  transform: 'rotate(0deg)',
                                  objectFit: 'contain',
                                  flexShrink: 0,
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                              <span
                                style={{
                                  fontFamily: 'Poppins, sans-serif',
                                  fontWeight: 500,
                                  fontSize: '14px',
                                  lineHeight: '100%',
                                  letterSpacing: '0%',
                                  color: 'rgba(231, 171, 24, 1)',
                                  opacity: 1,
                                  transform: 'rotate(0deg)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {details.amountStr}
                              </span>
                            </>
                          ) : (
                            <span
                              style={{
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 500,
                                fontSize: '14px',
                                lineHeight: '100%',
                                letterSpacing: '0%',
                                color: 'rgba(2, 121, 64, 1)',
                                opacity: 1,
                                transform: 'rotate(0deg)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {details.amountStr}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Loading indicator when scrolling loads more items */}
                {loadingMore && (
                  <div className="flex items-center gap-2 pl-2 pr-4 shrink-0">
                    <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  </div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </section>

      {/* Floating Hover Tooltip: Rendered outside the scroll container directly below the hovered item */}
      {hoveredData && (
        <div
          className="fixed z-[9999] pointer-events-none transition-opacity duration-150"
          style={{
            top: `${hoveredData.top}px`,
            left: `${hoveredData.left}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div
            className="flex flex-col min-w-[150px] lg:min-w-[170px] rounded-[12px] p-[10px] lg:p-[12px] gap-[8px] shadow-2xl border border-white/10"
            style={{
              background: 'rgba(36, 36, 36, 0.96)',
              backdropFilter: 'blur(44px)',
              WebkitBackdropFilter: 'blur(44px)',
              boxSizing: 'border-box',
            }}
          >
            {hoveredData.details.isWithdrawal ? (
              <div className="flex flex-col relative z-10 h-full justify-between gap-[8px]">
                <div className="flex flex-col gap-[2px] w-full">
                  <span
                    className="text-[13px] lg:text-[14px]"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      lineHeight: '120%',
                      color: 'rgba(255, 255, 255, 1)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Withdrawal Completed
                  </span>
                  <span
                    className="text-[11px]"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500,
                      lineHeight: '130%',
                      color: 'rgba(170, 170, 170, 1)',
                    }}
                  >
                    Method: {hoveredData.details.method}
                  </span>
                </div>
                <div className="w-full h-0 border-t border-white/10 shrink-0" />
                <div className="flex items-center justify-between w-full min-w-max gap-4 h-[18px]">
                  <span
                    className="text-[12px]"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 1)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Amount
                  </span>
                  <div className="flex items-center gap-1">
                    <img
                      src="/coins/paisa.png"
                      alt="Paisa"
                      className="w-[14px] h-[14px] object-contain"
                    />
                    <span
                      className="text-[13px] lg:text-[15px]"
                      style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontWeight: 700,
                        color: '#49B265',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {hoveredData.details.amountStr}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col relative z-10 h-full justify-between gap-[8px]">
                <div className="flex flex-col gap-[3px] w-full">
                  <span
                    className="text-[13px] lg:text-[14px]"
                    style={{
                      width: '100%',
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      lineHeight: '120%',
                      color: 'rgba(255, 255, 255, 1)',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                  >
                    {hoveredData.details.task}
                  </span>
                  <span
                    className="text-[10px] lg:text-[11px]"
                    style={{
                      width: '100%',
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500,
                      lineHeight: '130%',
                      color: 'rgba(170, 170, 170, 1)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {hoveredData.details.taskCategory}
                  </span>
                </div>
                <div className="w-full h-0 border-t border-white/10 shrink-0" />
                <div className="flex items-center justify-between w-full min-w-max gap-4 h-[18px]">
                  <span
                    className="text-[12px]"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 1)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Earned
                  </span>
                  <div className="flex items-center gap-1">
                    <img
                      src="/coins/Coin.png"
                      alt="Coin"
                      className="w-[14px] h-[14px] object-contain"
                    />
                    <span
                      className="text-[13px] lg:text-[15px]"
                      style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontWeight: 700,
                        backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {hoveredData.details.amountStr}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
