import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiGift, FiDollarSign, FiClipboard, FiMonitor, FiInbox } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProviderCard, OfferwallCard, FeaturedOfferCard, FeaturedOfferModal } from '../components/offers/OfferCards';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const TabButton = ({ active, onClick, iconSrc, label }) => {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-row items-center justify-center text-white transition-all duration-200 flex-1 h-[26px] lg:h-[48px] px-[2px] lg:px-[20px] gap-[3px] lg:gap-[10px] whitespace-nowrap ${active
        ? 'bg-[#49B265] rounded-[4px] lg:rounded-[10px] shadow-[0px_2px_0px_0px_#276D3A] lg:shadow-[0px_4px_0px_0px_#276D3A]'
        : 'bg-transparent'
        }`}
    >
      {iconSrc && (
        <img
          src={iconSrc}
          alt=""
          className={`w-[10px] h-[10px] lg:w-[24px] lg:h-[24px] object-contain shrink-0 ${active ? 'brightness-0 invert' : ''
            }`}
          style={!active && iconSrc.includes('dodo') ? { filter: 'invert(58%) sepia(34%) saturate(760%) hue-rotate(85deg) brightness(96%) contrast(88%)' } : {}}
        />
      )}
      <span
        className="font-barlow font-semibold text-[8px] lg:text-[20px] leading-[1] lg:leading-[32px] tracking-[0.2px] lg:tracking-[0.5px]"
        style={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: active ? 700 : 600,
        }}
      >
        {label}
      </span>
    </button>
  );
};

const Home = () => {
  const { mongoUser, currentUser } = useAuth();
  const navigate = useNavigate();
  const displayName = mongoUser?.displayName || 'User';
  const balance = mongoUser?.walletBalance?.toFixed(2) ?? '0.00';
  const [tasksDone, setTasksDone] = useState('...');
  const [globalStats, setGlobalStats] = useState({ totalUsers: 0, totalPaidOut: 0, show: false });
  const [chatOpen, setChatOpen] = useState(() => localStorage.getItem('chatOpen') === 'true');

  useEffect(() => {
    const handleChatToggle = () => setChatOpen(localStorage.getItem('chatOpen') === 'true');
    window.addEventListener('chatToggle', handleChatToggle);
    return () => window.removeEventListener('chatToggle', handleChatToggle);
  }, []);

  const [settings, setSettings] = useState(null);
  const [customOffers, setCustomOffers] = useState([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [token, setToken] = useState(null);

  const [activeProvider, setActiveProvider] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedOffer, setSelectedOffer] = useState(null);

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
  const [featuredActiveIndex, setFeaturedActiveIndex] = useState(0);

  const handleFeaturedScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    const index = Math.round(scrollLeft / width);
    setFeaturedActiveIndex(index);
  };

  const scrollFeaturedToPage = (index) => {
    if (featuredScrollRef.current) {
      const width = featuredScrollRef.current.clientWidth;
      featuredScrollRef.current.scrollTo({ left: width * index, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (currentUser) {
      currentUser.getIdToken().then(setToken);
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!token) return;
        const res = await fetch(`${API}/wallet/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setTasksDone(data.totalTasksCompleted.toString());
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      }
    };
    const fetchGlobalStats = async () => {
      try {
        const res = await fetch(`${API}/public/stats`);
        const data = await res.json();
        if (data.success) {
          setGlobalStats({ totalUsers: data.totalUsers, totalPaidOut: data.totalPaidOut, show: data.showGlobalStats });
        }
      } catch (err) {
        console.error('Failed to fetch global stats', err);
      }
    };
    if (token) fetchStats();
    fetchGlobalStats();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API}/wallet/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setSettings(data);
      } catch (err) {
        console.error('Failed to load earn settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const fetchOffers = async () => {
      try {
        const res = await fetch(`${API}/custom-offers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          const now = new Date();
          const visibleOffers = data.offers.filter(o => {
            const isApproved = o.submissionStatus === 'approved';
            const isExpired = o.expirationDate && new Date(o.expirationDate) < now;
            return !isApproved && !isExpired;
          });
          setCustomOffers(visibleOffers);
        }
      } catch (err) {
        console.error('Failed to load featured offers:', err);
      } finally {
        setLoadingOffers(false);
      }
    };
    fetchOffers();
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
  let surveyProviders = enabledProviders.filter(p => p.category === 'surveys');
  if (surveyProviders.length === 0) {
    surveyProviders = [
      { id: 'cpx', label: 'CPX Research', category: 'surveys' },
      { id: 'primeearn', label: 'Prime Surveys', category: 'surveys' },
      { id: 'adscend', label: 'AdscendMedia', category: 'surveys' }
    ];
  }
  const gamingProviders = enabledProviders.filter(p => p.category === 'gaming' || p.category === 'mixed');

  const tabs = [
    { id: 'all', label: 'All Operations', iconSrc: '/coins/dodo.png' },
    { id: 'featured', label: 'Featured Offers', iconSrc: '/coins/gift.png', count: customOffers.length, ref: featuredRef },
    { id: 'gaming', label: 'Gaming & Apps', iconSrc: '/coins/game.png', count: gamingProviders.length, ref: gamingRef },
    { id: 'surveys', label: 'Surveys', iconSrc: '/coins/clipboard.png', count: surveyProviders.length, ref: surveysRef },
  ];

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

        {/* ─── Platform Stats ───────────────────────────── */}
        {globalStats.show && (
          <motion.div
            variants={item}
            className="grid grid-cols-2 gap-[10px] w-full lg:w-[1240px] px-1 lg:px-0 mx-auto lg:h-[103px] shrink-0"
          >
            <div
              className="relative overflow-hidden group w-full h-[55px] lg:h-[103px] max-w-full lg:max-w-[615px] rounded-[10px] lg:rounded-[20px]"
              style={{
                background: 'rgba(26, 27, 26, 1)',
                backdropFilter: 'blur(74px)',
                WebkitBackdropFilter: 'blur(74px)'
              }}
            >
              <div className="relative z-10 w-full h-full flex items-center justify-start pl-[8px] lg:pl-[15px]">
                <div
                  className="flex items-center justify-center shrink-0 w-[36px] h-[36px] sm:w-[42px] sm:h-[42px] lg:w-[72px] lg:h-[72px]"
                  style={{
                    borderRadius: '10px',
                    background: 'rgba(73, 178, 101, 0.13)'
                  }}
                >
                  <img src="/coins/people.png" alt="Members" className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] lg:w-[42px] lg:h-[42px] object-contain" />
                </div>
                <div className="flex flex-col justify-center gap-0 ml-1 sm:ml-2 lg:ml-[18px]">
                  <p
                    className="text-[10px] lg:text-[14px] leading-[130%]"
                    style={{
                      width: 'auto',
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.53)',
                      margin: 0
                    }}
                  >
                    Total Members
                  </p>
                  <div
                    className="text-[18px] sm:text-[24px] lg:text-[44px] leading-[120%]"
                    style={{
                      width: 'auto',
                      height: 'auto',
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 1)'
                    }}
                  >
                    {globalStats.totalUsers.toLocaleString()}
                  </div>
                </div>
              </div>
              <img
                src="/coins/1000337345.png"
                alt="Graphic"
                className="hidden lg:block h-full lg:h-[103px] w-auto absolute bottom-0 right-0 opacity-100 pointer-events-none object-contain"
              />
            </div>

            <div
              className="relative overflow-hidden group w-full h-[55px] lg:h-[103px] max-w-full lg:max-w-[615px] rounded-[10px] lg:rounded-[20px]"
              style={{
                background: 'rgba(26, 27, 26, 1)',
                backdropFilter: 'blur(74px)',
                WebkitBackdropFilter: 'blur(74px)'
              }}
            >
              <div className="relative z-10 w-full h-full flex items-center justify-start pl-[8px] lg:pl-[15px]">
                <div
                  className="flex items-center justify-center shrink-0 w-[36px] h-[36px] sm:w-[42px] sm:h-[42px] lg:w-[72px] lg:h-[72px]"
                  style={{
                    borderRadius: '10px',
                    background: 'rgba(73, 178, 101, 0.13)'
                  }}
                >
                  <img src="/coins/paisa.png" alt="Paid" className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] lg:w-[42px] lg:h-[42px] object-contain" />
                </div>
                <div className="flex flex-col justify-center gap-0 ml-1 sm:ml-2 lg:ml-[18px]">
                  <p
                    className="text-[10px] lg:text-[14px] leading-[130%]"
                    style={{
                      width: 'auto',
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.53)',
                      margin: 0
                    }}
                  >
                    Total Paid Out
                  </p>
                  <div
                    className="text-[18px] sm:text-[24px] lg:text-[44px] leading-[120%]"
                    style={{
                      width: 'auto',
                      height: 'auto',
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 1)'
                    }}
                  >
                    ${globalStats.totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <img
                src="/coins/1000337344.png"
                alt="Graphic"
                className="hidden lg:block h-full lg:h-[103px] w-auto absolute bottom-0 right-0 opacity-100 pointer-events-none object-contain"
              />
            </div>
          </motion.div>
        )}

        {/* ─── Tabs & MAIN CONTENT WRAPPER ─────────────────── */}
        <div
          className="mx-auto flex flex-col shrink-0 px-1 lg:px-0 w-full lg:w-[1240px] gap-[12px] lg:gap-[30px]"
        >
          {/* ─── Quick Jump Tabs ───────────────────────────── */}
          <motion.div variants={item} className="sticky top-4 z-20">
            <div
              className="flex items-center justify-center overflow-x-auto w-full lg:w-[1240px] h-auto lg:h-[84px] p-1.5 lg:p-[18px]"
              style={{
                borderRadius: '10px',
                background: 'rgba(44, 45, 44, 1)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0px 4px 44px 0px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div
                className="flex items-center justify-between w-full h-[32px] lg:h-[48px] gap-1 lg:gap-4"
                style={{
                  borderRadius: '100px',
                  opacity: 1
                }}
              >
                {tabs.map(tab => (
                  <TabButton
                    key={tab.id}
                    active={filter === tab.id}
                    onClick={() => scrollTo(tab.ref, tab.id)}
                    iconSrc={tab.iconSrc}
                    label={tab.label}
                    count={tab.count}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* ─── MAIN CONTENT ─────────────────────────────────── */}
          <div className="flex flex-col gap-[20px] lg:gap-[30px]">

            {/* Section 1: Featured Offers */}
            {(filter === 'all' || filter === 'featured') && customOffers.length > 0 && (
              <motion.section
                ref={featuredRef}
                variants={item}
                className="flex flex-col shrink-0 w-full lg:w-[1240px] min-h-[320px] lg:min-h-[250px] rounded-[10px] lg:rounded-[20px] p-[10px] lg:p-[20px] gap-[10px] lg:gap-[18px]"
                style={{
                  background: 'rgba(255, 255, 255, 0.14)'
                }}
              >
                <div
                  className="flex items-center justify-between w-full relative overflow-hidden lg:overflow-visible h-[60px] lg:h-[133px] gap-2 lg:gap-4"
                >
                  <div className="flex items-center gap-2 lg:gap-4 z-10">
                    <div
                      className="flex items-center justify-center shrink-0 w-[44px] h-[44px] lg:w-[88px] lg:h-[88px] rounded-[8px] lg:rounded-[10px] bg-[rgba(41,253,152,0.1)] p-1.5 lg:p-[10px_12px]"
                    >
                      <img
                        src="/coins/gift.png"
                        alt="Featured Offers"
                        className="w-[24px] h-[24px] lg:w-[44px] lg:h-[44px] object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 lg:gap-1.5">
                      <h2 className="font-barlow font-bold text-[18px] lg:text-[42px] leading-[1.1] text-white m-0">
                        Featured Offers
                      </h2>
                      <p className="font-barlow font-medium text-[11px] lg:text-[22px] leading-[1.2] text-[#888888] m-0 max-w-[140px] lg:max-w-none">
                        High-reward direct tasks. Manual approval required.
                      </p>
                    </div>
                  </div>
                  <img
                    src="/coins/feature%20offer.png"
                    alt="Featured Offers Graphic"
                    className="hidden lg:block absolute right-[-40px] lg:relative lg:right-auto w-[140px] h-[60px] lg:w-[332px] lg:h-[133px] object-contain shrink-0 opacity-100 pointer-events-none"
                  />
                </div>
                <div className="relative mt-2">
                  <div
                    ref={featuredScrollRef}
                    onScroll={handleFeaturedScroll}
                    className="flex flex-col lg:flex-row overflow-visible lg:overflow-x-auto lg:snap-x lg:snap-mandatory gap-4 lg:gap-0"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {Array.from({ length: Math.ceil(customOffers.length / itemsPerPage) }).map((_, pageIndex) => (
                      <div key={pageIndex} className="min-w-full shrink-0 lg:snap-start flex gap-4">
                        {customOffers.slice(pageIndex * itemsPerPage, pageIndex * itemsPerPage + itemsPerPage).map(offer => (
                          <div key={offer._id} className="w-[calc(50%-8px)] lg:w-auto shrink-0">
                            <FeaturedOfferCard offer={offer} onClick={() => setSelectedOffer(offer)} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Dot Pagination */}
                  <div className="hidden lg:flex justify-center mt-4 lg:mt-6">
                    <div
                      className="flex items-center h-[6px] lg:h-[12px] gap-[4px] lg:gap-[6px]"
                    >
                      {Array.from({ length: Math.ceil(customOffers.length / itemsPerPage) }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => scrollFeaturedToPage(idx)}
                          className={`transition-all duration-300 hover:opacity-80 rounded-[30px] h-[6px] lg:h-[12px] ${featuredActiveIndex === idx
                              ? 'w-[18px] lg:w-[42px] bg-[#49B265]'
                              : 'w-[6px] lg:w-[12px] bg-white/20'
                            }`}
                          aria-label={`Go to page ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Section 2: Gaming or App Offers */}
            {(filter === 'all' || filter === 'gaming') && (
              <motion.section
                ref={gamingRef}
                variants={item}
                className="flex flex-col shrink-0 w-full lg:w-[1240px] lg:min-h-[469px] rounded-[10px] lg:rounded-[20px] p-[10px] lg:p-[20px] gap-[10px] lg:gap-[18px]"
                style={{
                  background: 'rgba(255, 255, 255, 0.14)'
                }}
              >
                <div
                  className="flex items-center justify-between w-full relative overflow-hidden lg:overflow-visible h-[60px] lg:h-[133px] gap-2 lg:gap-4"
                >
                  <div className="flex items-center gap-2 lg:gap-4 z-10">
                    <div
                      className="flex items-center justify-center shrink-0 w-[44px] h-[44px] lg:w-[88px] lg:h-[88px] rounded-[8px] lg:rounded-[10px] bg-[rgba(41,253,152,0.1)] p-1.5 lg:p-[10px_12px]"
                    >
                      <img
                        src="/coins/game.png"
                        alt="Gaming Offers"
                        className="w-[24px] h-[24px] lg:w-[44px] lg:h-[44px] object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 lg:gap-1.5">
                      <h2 className="font-barlow font-bold text-[18px] lg:text-[42px] leading-[1.1] text-white m-0">
                        Gaming & App Offers
                      </h2>
                      <p className="font-barlow font-medium text-[11px] lg:text-[22px] leading-[1.2] text-[#888888] m-0 max-w-[140px] lg:max-w-none">
                        Play games to earn large amounts of points.
                      </p>
                    </div>
                  </div>
                  <img
                    src="/coins/appimage.png"
                    alt="Gaming & App Offers Graphic"
                    className="hidden lg:block absolute right-[-40px] lg:relative lg:right-auto w-[140px] h-[60px] lg:w-[332px] lg:h-[133px] object-contain shrink-0 opacity-100 pointer-events-none"
                  />
                </div>
                {loadingSettings ? (
                  <div className="glass-card p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" /></div>
                ) : gamingProviders.length === 0 ? (
                  <div className="glass-card p-8 border border-white/[0.05] flex justify-center opacity-50"><span className="text-slate-400 text-sm">No gaming offerwalls active.</span></div>
                ) : (
                  <div
                    className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 w-full"
                    style={{ gap: '14px' }}
                  >
                    {gamingProviders.map(provider => (
                      <div key={provider.id} className="snap-start w-full h-full">
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
                className="flex flex-col shrink-0 w-full lg:w-[1240px] lg:min-h-[323px] rounded-[10px] lg:rounded-[20px] p-[10px] lg:p-[20px] gap-[10px] lg:gap-[18px]"
                style={{
                  background: 'rgba(255, 255, 255, 0.14)'
                }}
              >
                <div
                  className="flex items-center justify-between w-full relative overflow-hidden lg:overflow-visible h-[60px] lg:h-[133px] gap-2 lg:gap-4"
                >
                  <div className="flex items-center gap-2 lg:gap-4 z-10">
                    <div
                      className="flex items-center justify-center shrink-0 w-[44px] h-[44px] lg:w-[88px] lg:h-[88px] rounded-[8px] lg:rounded-[10px] bg-[rgba(41,253,152,0.1)] p-1.5 lg:p-[10px_12px]"
                    >
                      <img
                        src="/coins/clicl.png"
                        alt="Surveys"
                        className="w-[24px] h-[24px] lg:w-[44px] lg:h-[44px] object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 lg:gap-1.5">
                      <h2 className="font-barlow font-bold text-[18px] lg:text-[42px] leading-[1.1] text-white m-0 uppercase tracking-wider">
                        Surveys
                      </h2>
                      <p className="font-barlow font-medium text-[11px] lg:text-[22px] leading-[1.2] text-[#888888] m-0 max-w-[140px] lg:max-w-none">
                        Share your opinion for quick<br className="lg:hidden" /><span className="hidden lg:inline"> </span>and easy rewards.
                      </p>
                    </div>
                  </div>
                  <img
                    src="/coins/survay.png"
                    alt="Graphic"
                    className="hidden lg:block absolute right-[-40px] lg:relative lg:right-auto w-[140px] h-[60px] lg:w-[332px] lg:h-[133px] object-contain shrink-0 opacity-100 pointer-events-none"
                  />
                </div>
                {loadingSettings ? (
                  <div className="glass-card p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /></div>
                ) : surveyProviders.length === 0 ? (
                  <div className="glass-card p-8 border border-white/[0.05] flex justify-center opacity-50"><span className="text-slate-400 text-sm">No survey offerwalls active.</span></div>
                ) : (
                  <div
                    className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 w-full"
                    style={{ gap: '14px' }}
                  >
                    {surveyProviders.map(provider => (
                      <div key={provider.id} className="snap-start w-full h-full">
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
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
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Home;
