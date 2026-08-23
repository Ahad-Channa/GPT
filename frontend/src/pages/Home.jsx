import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiGift, FiDollarSign, FiClipboard, FiMonitor, FiInbox } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProviderCard, OfferwallCard, FeaturedOfferCard, FeaturedOfferModal } from '../components/offers/OfferCards';
import { DirectOfferCard, DirectOfferModal } from '../components/offers/DirectOfferCard';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const FeaturedOfferBadge = () => (
  <img
    src="/coins/FETUOFF.png"
    alt="Featured Offers"
    className="flex-shrink-0 object-contain select-none"
    style={{
      width: '67.19999694824219px',
      height: '67.19999694824219px',
      opacity: 1,
      transform: 'rotate(0deg)',
    }}
  />
);



const TabButton = ({ active, onClick, iconSrc, label }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative z-10 flex items-center justify-center transition-all duration-200 cursor-pointer whitespace-nowrap select-none shrink-0 ${
        active
          ? 'bg-[#1E2538] text-white shadow-sm'
          : 'text-[#0E0F0C] hover:bg-black/5'
      }`}
      style={{
        width: '154px',
        height: '37px',
        borderRadius: '40px',
        opacity: 1,
        transform: 'rotate(0deg)',
        gap: '8px',
        padding: '11px',
        boxSizing: 'border-box',
      }}
    >
      <img
        src={iconSrc}
        alt={label}
        className="pointer-events-none object-contain shrink-0 transition-all duration-200"
        style={{
          width: '16px',
          height: '16px',
          filter: active ? 'brightness(0) invert(1)' : 'brightness(0)',
          opacity: active ? 1 : 0.9,
        }}
      />
      <span
        className="pointer-events-none"
        style={{
          fontFamily: '"Bricolage Grotesque", sans-serif',
          fontWeight: 700,
          fontStyle: 'normal',
          fontSize: '14px',
          lineHeight: '100%',
          letterSpacing: '0%',
          opacity: 1,
          transform: 'rotate(0deg)',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {label}
      </span>
    </button>
  );
};

// In-memory cache across route transitions for instantaneous page loading
const homeCache = {
  settings: null,
  customOffers: null,
  directOffers: null,
  tasksDone: null,
  globalStats: null,
};

const Home = () => {
  const { mongoUser, currentUser } = useAuth();
  const navigate = useNavigate();
  const displayName = mongoUser?.displayName || 'User';
  const balance = mongoUser?.walletBalance?.toFixed(2) ?? '0.00';
  const [tasksDone, setTasksDone] = useState(() => homeCache.tasksDone || '...');
  const [globalStats, setGlobalStats] = useState(() => homeCache.globalStats || { totalUsers: 0, totalPaidOut: 0, show: false });
  const [chatOpen, setChatOpen] = useState(() => localStorage.getItem('chatOpen') === 'true');

  useEffect(() => {
    const handleChatToggle = () => setChatOpen(localStorage.getItem('chatOpen') === 'true');
    window.addEventListener('chatToggle', handleChatToggle);
    return () => window.removeEventListener('chatToggle', handleChatToggle);
  }, []);

  const [settings, setSettings] = useState(() => homeCache.settings);
  const [customOffers, setCustomOffers] = useState(() => homeCache.customOffers || []);
  const [directOffers, setDirectOffers] = useState(() => homeCache.directOffers || []);
  const [loadingSettings, setLoadingSettings] = useState(() => !homeCache.settings);
  const [loadingOffers, setLoadingOffers] = useState(() => !homeCache.customOffers && !homeCache.directOffers);
  const [token, setToken] = useState(null);

  const [activeProvider, setActiveProvider] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [selectedDirectOffer, setSelectedDirectOffer] = useState(null);

  // Merge both offer types for the featured carousel
  const allFeaturedOffers = [
    ...directOffers.map(o => ({ ...o, _isDirectOffer: true })),
    ...customOffers,
  ];

  useEffect(() => {
    if (activeProvider || selectedOffer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeProvider, selectedOffer]);


  const featuredRef = useRef(null);
  const gamingRef = useRef(null);
  const surveysRef = useRef(null);

  const featuredScrollRef = useRef(null);
  const isDraggingFeatured = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const hasMovedRef = useRef(false);
  const [hasMovedDrag, setHasMovedDrag] = useState(false);
  const [visibleFeaturedCount, setVisibleFeaturedCount] = useState(14);

  const handleFeaturedScroll = () => {
    if (!featuredScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = featuredScrollRef.current;
    if (scrollLeft + clientWidth >= scrollWidth - 250) {
      setVisibleFeaturedCount(prev => {
        if (prev < allFeaturedOffers.length) {
          return Math.min(prev + 7, allFeaturedOffers.length);
        }
        return prev;
      });
    }
  };

  const handleFeaturedMouseDown = (e) => {
    if (!featuredScrollRef.current) return;
    isDraggingFeatured.current = true;
    hasMovedRef.current = false;
    dragStartX.current = e.pageX - featuredScrollRef.current.offsetLeft;
    dragScrollLeft.current = featuredScrollRef.current.scrollLeft;
  };

  const handleFeaturedMouseMove = (e) => {
    if (!isDraggingFeatured.current || !featuredScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - featuredScrollRef.current.offsetLeft;
    const walk = (x - dragStartX.current) * 1.5;
    if (Math.abs(x - dragStartX.current) > 5) {
      hasMovedRef.current = true;
      setHasMovedDrag(true);
    }
    featuredScrollRef.current.scrollLeft = dragScrollLeft.current - walk;
    handleFeaturedScroll();
  };

  const handleFeaturedMouseUpOrLeave = () => {
    isDraggingFeatured.current = false;
    setTimeout(() => {
      hasMovedRef.current = false;
      setHasMovedDrag(false);
    }, 50);
  };

  const handleFeaturedWheel = (e) => {
    if (!featuredScrollRef.current) return;
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      featuredScrollRef.current.scrollLeft += e.deltaY;
      handleFeaturedScroll();
    }
  };

  useEffect(() => {
    if (currentUser) {
      currentUser.getIdToken().then(setToken);
    }
  }, [currentUser]);

  // Parallel background fetching & caching for ultra-fast instant transitions
  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const fetchPublicStats = fetch(`${API}/public/stats`).then(r => r.json()).catch(() => null);
        const fetchDashboardStats = token ? fetch(`${API}/wallet/dashboard-stats`, { headers }).then(r => r.json()).catch(() => null) : Promise.resolve(null);
        const fetchWalletSettings = token ? fetch(`${API}/wallet/settings`, { headers }).then(r => r.json()).catch(() => null) : Promise.resolve(null);
        const fetchCustomOffers = token ? fetch(`${API}/custom-offers`, { headers }).then(r => r.json()).catch(() => null) : Promise.resolve(null);
        const fetchDirectOffers = token ? fetch(`${API}/direct-offers`, { headers }).then(r => r.json()).catch(() => null) : Promise.resolve(null);

        const [publicStatsData, dashStatsData, settingsData, customData, directData] = await Promise.all([
          fetchPublicStats,
          fetchDashboardStats,
          fetchWalletSettings,
          fetchCustomOffers,
          fetchDirectOffers,
        ]);

        if (!isMounted) return;

        if (publicStatsData?.success) {
          const gs = {
            totalUsers: publicStatsData.totalUsers,
            totalPaidOut: publicStatsData.totalPaidOut,
            show: publicStatsData.showGlobalStats,
          };
          homeCache.globalStats = gs;
          setGlobalStats(gs);
        }

        if (dashStatsData?.success) {
          const td = dashStatsData.totalTasksCompleted?.toString() || '0';
          homeCache.tasksDone = td;
          setTasksDone(td);
        }

        if (settingsData?.success) {
          homeCache.settings = settingsData;
          setSettings(settingsData);
        }

        if (customData?.success) {
          const now = new Date();
          const visibleOffers = customData.offers.filter(o => {
            const isApproved = o.submissionStatus === 'approved';
            const isExpired = o.expirationDate && new Date(o.expirationDate) < now;
            return !isApproved && !isExpired;
          });
          homeCache.customOffers = visibleOffers;
          setCustomOffers(visibleOffers);
        }

        if (directData?.success) {
          homeCache.directOffers = directData.offers;
          setDirectOffers(directData.offers);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (isMounted) {
          setLoadingOffers(false);
          setLoadingSettings(false);
        }
      }
    };

    fetchAll();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const scrollTo = (ref, filterType) => {
    setFilter(filterType);
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (filterType === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const enabledProviders = settings?.offerwalls || [];

  const defaultSurveyList = [
    { id: 'cpx', label: 'CPX Research', category: 'surveys', enabled: true },
    { id: 'primeearn', label: 'Prime Surveys', category: 'surveys', enabled: true },
    { id: 'adscend', label: 'AdscendMedia', category: 'surveys', enabled: true },
  ];

  const surveyProviders = defaultSurveyList;

  const defaultBase8 = [
    { id: 'adgem', label: 'AdGem', category: 'gaming', enabled: true },
    { id: 'torox', label: 'Torox', category: 'gaming', enabled: true },
    { id: 'lootably', label: 'Lootably', category: 'mixed', enabled: true },
    { id: 'cpx', label: 'CPX Research', category: 'surveys', enabled: true },
    { id: 'primeearn', label: 'Prime Surveys', category: 'surveys', enabled: true },
    { id: 'ayet', label: 'Ayet Studios', category: 'mixed', enabled: true },
    { id: 'adtowall', label: 'AdToWall', category: 'mixed', enabled: true },
    { id: 'revu', label: 'Revu', category: 'mixed', enabled: true },
  ];

  const baseProviders = enabledProviders.filter(p => p.id !== 'goodpicks');
  const combinedBase = [...baseProviders];
  for (const def of defaultBase8) {
    if (!combinedBase.some(p => p.id === def.id)) {
      combinedBase.push(def);
    }
  }

  const goodpicksItem = enabledProviders.find(p => p.id === 'goodpicks') || {
    id: 'goodpicks',
    label: 'Goodpicks',
    category: 'gaming',
    enabled: true
  };

  // 9 items total: 4 on line 1, 4 on line 2, and Goodpicks as the 9th at start of line 3
  const gamingProviders = [...combinedBase.slice(0, 8), goodpicksItem];

  const tabs = [
    {
      id: 'all',
      label: 'All Operations',
      iconSrc: '/coins/alloffer.png',
    },
    {
      id: 'featured',
      label: 'Featured Offers',
      ref: featuredRef,
      iconSrc: '/coins/foff.png',
    },
    {
      id: 'gaming',
      label: 'Gaming & App',
      ref: gamingRef,
      iconSrc: '/coins/gameingoff.png',
    },
    {
      id: 'surveys',
      label: 'Surveys',
      ref: surveysRef,
      iconSrc: '/coins/survyfoo.png',
    },
  ];

  const displayFeaturedOffers = allFeaturedOffers.slice(0, visibleFeaturedCount);

  const getItemsPerPage = () => {
    if (window.innerWidth < 480) return 2;
    if (window.innerWidth < 768) return 3;
    if (window.innerWidth < 1024) return 5;
    return 7;
  };
  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage());

  useEffect(() => {
    const handleResize = () => setItemsPerPage(getItemsPerPage());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const gridColsClass = 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6';


  return (
    <DashboardLayout showLiveBar={true}>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-3 lg:space-y-8 pb-4 lg:pb-10">

        {/* ─── Platform Stats (Top Count Pill) ───────────────────────────── */}
        <motion.div
          variants={item}
          className="flex items-center justify-center w-full mx-auto -mt-[8px] mb-4 lg:mb-8 px-4"
        >
          <div
            className="flex items-center justify-between sm:justify-around w-full max-w-[520px] lg:max-w-[580px] px-8 sm:px-14 lg:px-16 py-3 sm:py-4 gap-6 sm:gap-12 lg:gap-16 transition-all"
            style={{
              width: '100%',
              maxWidth: '580px',
              borderRadius: '0px 0px 70px 70px',
              background: 'rgba(255, 255, 255, 1)',
              boxShadow: '0px 10px 30px -5px rgba(0, 0, 0, 0.06)',
            }}
          >
            {/* Total Users */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
              <img
                src="/coins/total user.png"
                alt="Users"
                className="w-[32px] h-[32px] sm:w-[38px] sm:h-[38px] lg:w-[44px] lg:h-[44px] object-contain flex-shrink-0 -translate-y-[5px]"
              />
              <div className="flex flex-col justify-center min-w-0">
                <span
                  className="uppercase"
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '12px',
                    lineHeight: '18px',
                    color: 'rgba(14, 15, 12, 1)',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    display: 'flex',
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  TOTAL USERS:
                </span>
                <span
                  className="text-[18px] sm:text-[22px] lg:text-[28px] font-bold text-[#0E0F0C] leading-tight whitespace-nowrap"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                    width: 'auto',
                  }}
                >
                  {(globalStats.totalUsers ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Total Paid */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
              <img
                src="/coins/total paid.png"
                alt="Paid"
                className="w-[32px] h-[32px] sm:w-[38px] sm:h-[38px] lg:w-[44px] lg:h-[44px] object-contain flex-shrink-0"
              />
              <div className="flex flex-col justify-center min-w-0">
                <span
                  className="uppercase"
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '12px',
                    lineHeight: '18px',
                    color: 'rgba(14, 15, 12, 1)',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    display: 'flex',
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  TOTAL PAID:
                </span>
                <span
                  className="text-[18px] sm:text-[22px] lg:text-[28px] font-bold text-[#0E0F0C] leading-tight whitespace-nowrap"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                    width: 'auto',
                  }}
                >
                  ${(globalStats.totalPaidOut ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── MAIN CONTENT WRAPPER ─────────────────── */}
        <div
          className="flex flex-col shrink-0 w-full gap-[20px] lg:gap-[36px]"
        >
          {/* Header Row: Title & Subtitle on left, Filter Tabs on right (Always Visible) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 md:gap-4 w-full">
            {/* Left: Orange Scalloped Badge + Title + Subtitle */}
            <div
              className="flex items-center"
              style={{
                gap: '5.25px',
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
            >
              <FeaturedOfferBadge />
              <div
                className="flex flex-col justify-center"
                style={{
                  maxWidth: '371px',
                  minHeight: '44px',
                  gap: '16px',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
              >
                <h2
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '27px',
                    lineHeight: '18px',
                    letterSpacing: '-0.02em',
                    color: '#0E0F0C',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Featured Offers
                </h2>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '14px',
                    letterSpacing: '0%',
                    color: 'rgba(14, 15, 12, 0.7)',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  High-reward direct tasks. Manual approval required.
                </p>
              </div>
            </div>

            {/* Right: Inline Filter Tabs */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {tabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  active={filter === tab.id}
                  onClick={() => scrollTo(tab.ref, tab.id)}
                  iconSrc={tab.iconSrc}
                  label={tab.label}
                />
              ))}
            </div>
          </div>

          {/* Section 1: Featured Offers Cards */}
          {(filter === 'all' || filter === 'featured') && (
            <motion.section
              ref={featuredRef}
              variants={item}
              className="flex flex-col shrink-0 w-full"
            >
              {displayFeaturedOffers.length === 0 ? (
                <div className="w-full py-8 text-center bg-white rounded-[20px] border border-gray-100/80 shadow-sm text-gray-400 text-sm font-medium">
                  No featured offers available right now.
                </div>
              ) : (
                <div className="w-full">
                  <div
                    ref={featuredScrollRef}
                    onMouseDown={handleFeaturedMouseDown}
                    onMouseMove={handleFeaturedMouseMove}
                    onMouseUp={handleFeaturedMouseUpOrLeave}
                    onMouseLeave={handleFeaturedMouseUpOrLeave}
                    onWheel={handleFeaturedWheel}
                    onScroll={handleFeaturedScroll}
                    className="flex overflow-x-auto gap-[15px] w-full scrollbar-none cursor-grab active:cursor-grabbing select-none pb-2"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {displayFeaturedOffers.map((offer) => (
                      <div key={offer._id} className="shrink-0 w-[181.14px]">
                        {offer._isDirectOffer ? (
                          <DirectOfferCard
                            offer={offer}
                            onClick={() => {
                              if (!hasMovedRef.current && !hasMovedDrag) setSelectedDirectOffer(offer);
                            }}
                          />
                        ) : (
                          <FeaturedOfferCard
                            offer={offer}
                            onClick={() => {
                              if (!hasMovedRef.current && !hasMovedDrag) setSelectedOffer(offer);
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {/* ─── MAIN CONTENT ─────────────────────────────────── */}
          <div className="flex flex-col gap-[20px] lg:gap-[30px] w-full">

            {/* Section 2: Gaming or App Offers */}
            {(filter === 'all' || filter === 'gaming') && (
              <motion.section
                ref={gamingRef}
                variants={item}
                className="flex flex-col shrink-0 w-full max-w-[1328px] gap-[20px]"
                style={{
                  minHeight: '337px',
                }}
              >
                {/* Header with icon and typography */}
                <div className="flex items-center" style={{ gap: '5.25px' }}>
                  <img
                    src="/coins/gameseciton.png"
                    alt="Gaming Offers"
                    className="flex-shrink-0 object-contain select-none"
                    style={{
                      width: '67.19999694824219px',
                      height: '67.19999694824219px',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                    }}
                  />
                  <div
                    className="flex flex-col justify-center"
                    style={{
                      maxWidth: '371px',
                      minHeight: '46px',
                      opacity: 1,
                    }}
                  >
                    <h2
                      className="text-[#0E0F0C] m-0"
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: '30px',
                        lineHeight: '1',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Gaming & App Offers
                    </h2>
                    <p
                      className="text-[#0E0F0C] m-0 mt-[4px]"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '1.2',
                        letterSpacing: '0%',
                      }}
                    >
                      Play games to earn large amounts of points.
                    </p>
                  </div>
                </div>

                {loadingSettings ? (
                  <div className="p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" /></div>
                ) : gamingProviders.length === 0 ? (
                  <div className="p-8 border border-gray-100 flex justify-center rounded-[20px] bg-white text-gray-400 text-sm">No gaming offerwalls active.</div>
                ) : (
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full gap-[12px]"
                  >
                    {gamingProviders.map(provider => (
                      <div key={provider.id} className="w-full flex justify-center">
                        <ProviderCard provider={provider} onClick={() => setActiveProvider(provider)} />
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>
            )}

            {/* Section 3: Surveys */}
            {(filter === 'all' || filter === 'surveys') && (
              <motion.section
                ref={surveysRef}
                variants={item}
                className="flex flex-col shrink-0 w-full max-w-[1328px] gap-[20px]"
              >
                <div className="flex items-center" style={{ gap: '5.25px' }}>
                  <img
                    src="/coins/survay section.png"
                    alt="Surveys"
                    className="flex-shrink-0 object-contain select-none"
                    style={{
                      width: '67.19999694824219px',
                      height: '67.19999694824219px',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                    }}
                  />
                  <div
                    className="flex flex-col justify-center"
                    style={{
                      maxWidth: '371px',
                      minHeight: '46px',
                      opacity: 1,
                    }}
                  >
                    <h2
                      className="text-[#0E0F0C] m-0"
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: '30px',
                        lineHeight: '1',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Surveys
                    </h2>
                    <p
                      className="text-[#0E0F0C] m-0 mt-[4px]"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '1.2',
                        letterSpacing: '0%',
                      }}
                    >
                      Share your opinion for quick and easy rewards.
                    </p>
                  </div>
                </div>
                {loadingSettings ? (
                  <div className="p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /></div>
                ) : surveyProviders.length === 0 ? (
                  <div className="p-8 border border-gray-100 flex justify-center rounded-[20px] bg-white text-gray-400 text-sm">No survey offerwalls active.</div>
                ) : (
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full gap-[12px]"
                  >
                    {surveyProviders.map(provider => (
                      <div key={provider.id} className="w-full flex justify-center">
                        <ProviderCard provider={provider} onClick={() => setActiveProvider(provider)} />
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>
            )}

          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {activeProvider && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            onClick={() => setActiveProvider(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex flex-col gap-3 lg:gap-4 p-3 lg:p-4 rounded-[16px] lg:rounded-[20px] bg-[#242424] w-[90%] lg:w-[1000px] h-[70vh] lg:h-[90vh] box-border overflow-hidden"
            >
              <div className="flex items-center justify-between shrink-0 relative h-[36px] lg:h-auto">
                <div className="flex items-center gap-3 max-w-[30%] lg:max-w-none z-10">
                  <span className="text-[14px] lg:text-[22px] font-bold text-white tracking-wide truncate" style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>{activeProvider.label}</span>
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 lg:gap-2 pointer-events-none z-0">
                  <img src="/coins/logo copy.png" alt="TaskMint Logo" className="w-[16px] h-[16px] lg:w-[32px] lg:h-[32px] object-contain" />
                  <span className="text-white font-bold tracking-widest text-[16px] lg:text-[24px]" style={{ fontFamily: '"Barlow Condensed", sans-serif', lineHeight: '1' }}>TaskMint</span>
                </div>
                <button
                  onClick={() => setActiveProvider(null)}
                  className="w-[36px] h-[36px] rounded-[10px] bg-white/10 text-white flex items-center justify-center cursor-pointer border-none hover:bg-white/20 transition-all z-10"
                >
                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="16" width="16" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="flex-1 rounded-[10px] overflow-hidden min-h-0 relative">
                <OfferwallCard provider={activeProvider} userId={mongoUser?._id} />
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedOffer && (
          <FeaturedOfferModal
            offer={selectedOffer}
            token={token}
            onClose={() => setSelectedOffer(null)}
          />
        )}

        {selectedDirectOffer && (
          <DirectOfferModal
            offer={selectedDirectOffer}
            token={token}
            onClose={() => setSelectedDirectOffer(null)}
            onClicked={(offerId) => {
              setDirectOffers(prev =>
                prev.map(o => o._id === offerId ? { ...o, clickStatus: 'clicked' } : o)
              );
            }}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Home;
