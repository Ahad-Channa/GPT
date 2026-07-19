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
  const activeStyle = {
    flex: 1,
    height: '48px',
    borderRadius: '10px',
    padding: '10px 20px',
    gap: '10px',
    background: 'rgba(73, 178, 101, 1)',
    boxShadow: '0px 4px 0px 0px rgba(39, 109, 58, 1)',
    whiteSpace: 'nowrap'
  };

  const inactiveStyle = {
    flex: 1,
    height: '48px',
    padding: '10px 20px',
    gap: '10px',
    whiteSpace: 'nowrap'
  };

  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center text-white transition-all duration-200"
      style={active ? activeStyle : inactiveStyle}
    >
      {iconSrc && (
        <img 
          src={iconSrc} 
          alt="" 
          className={`w-[24px] h-[24px] object-contain ${
            active ? 'brightness-0 invert' : ''
          }`}
          style={!active && iconSrc.includes('dodo') ? { filter: 'invert(58%) sepia(34%) saturate(760%) hue-rotate(85deg) brightness(96%) contrast(88%)' } : {}}
        />
      )}
      <span style={{
        fontFamily: '"Barlow Condensed", sans-serif',
        fontWeight: active ? 700 : 600,
        fontSize: '20px',
        lineHeight: '32px',
        letterSpacing: '0.5px'
      }}>
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

  const itemsPerPage = 4;
  const gridColsClass = 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6';

  if (activeProvider) {
    return (
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <button
            onClick={() => setActiveProvider(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition-all font-semibold text-sm w-fit"
          >
            <span className="text-lg">←</span> Back to Dashboard
          </button>
          <OfferwallCard provider={activeProvider} userId={mongoUser?._id} />
        </motion.div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout showLiveBar={true}>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-10">

        {/* ─── Platform Stats ───────────────────────────── */}
        {globalStats.show && (
          <motion.div
            variants={item}
            className="grid grid-cols-1 lg:grid-cols-2 gap-[10px] w-full lg:w-[1240px] px-4 lg:px-0 mx-auto lg:h-[103px] shrink-0"
          >
            {/* Total Users Card */}
            <div
              className="relative overflow-hidden group w-full h-[140px] lg:h-[103px] max-w-full lg:max-w-[615px]"
              style={{
                borderRadius: '20px',
                background: 'rgba(26, 27, 26, 1)',
                backdropFilter: 'blur(74px)',
                WebkitBackdropFilter: 'blur(74px)'
              }}
            >
              <div className="relative z-10 w-full h-full flex items-center pl-[15px]">
                <div
                  className="flex items-center justify-center shrink-0 w-[92px] h-[92px] lg:w-[72px] lg:h-[72px]"
                  style={{
                    borderRadius: '10px',
                    background: 'rgba(73, 178, 101, 0.13)'
                  }}
                >
                  <img src="/coins/people.png" alt="Members" className="w-[50px] h-[50px] lg:w-[42px] lg:h-[42px] object-contain" />
                </div>
                <div className="flex flex-col justify-center gap-0 ml-[18px]">
                  <p 
                    className="text-[20px] lg:text-[14px] leading-[130%]"
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
                    className="text-[60px] lg:text-[44px] leading-[120%]"
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
                className="h-full lg:h-[103px] w-auto absolute bottom-0 right-0 opacity-100 pointer-events-none object-contain" 
              />
            </div>

            {/* Paid Out Card */}
            <div
              className="relative overflow-hidden group w-full h-[140px] lg:h-[103px] max-w-full lg:max-w-[615px]"
              style={{
                borderRadius: '20px',
                background: 'rgba(26, 27, 26, 1)',
                backdropFilter: 'blur(74px)',
                WebkitBackdropFilter: 'blur(74px)'
              }}
            >
              <div className="relative z-10 w-full h-full flex items-center pl-[15px]">
                <div
                  className="flex items-center justify-center shrink-0 w-[92px] h-[92px] lg:w-[72px] lg:h-[72px]"
                  style={{
                    borderRadius: '10px',
                    background: 'rgba(73, 178, 101, 0.13)'
                  }}
                >
                  <img src="/coins/paisa.png" alt="Paid" className="w-[50px] h-[50px] lg:w-[42px] lg:h-[42px] object-contain" />
                </div>
                <div className="flex flex-col justify-center gap-0 ml-[18px]">
                  <p 
                    className="text-[20px] lg:text-[14px] leading-[130%]"
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
                    className="text-[60px] lg:text-[44px] leading-[120%]"
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
                className="h-full lg:h-[103px] w-auto absolute bottom-0 right-0 opacity-100 pointer-events-none object-contain" 
              />
            </div>
          </motion.div>
        )}

        {/* ─── Tabs & MAIN CONTENT WRAPPER ─────────────────── */}
        <div
          className="mx-auto flex flex-col shrink-0 px-4 lg:px-0 w-full lg:w-[1240px]"
          style={{ gap: '30px' }}
        >
          {/* ─── Quick Jump Tabs ───────────────────────────── */}
          <motion.div variants={item} className="sticky top-4 z-20">
            <div
              className="flex items-center justify-center overflow-x-auto w-full lg:w-[1240px]"
              style={{
                height: '84px',
                borderRadius: '10px',
                padding: '18px',
                background: 'rgba(44, 45, 44, 1)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0px 4px 44px 0px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div
                className="flex items-center justify-between"
                style={{
                  width: '100%',
                  height: '48px',
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
          <div className="flex flex-col gap-[30px]">

            {/* Section 1: Featured Offers */}
            {(filter === 'all' || filter === 'featured') && customOffers.length > 0 && (
              <motion.section 
                ref={featuredRef} 
                variants={item} 
                className="flex flex-col shrink-0 w-full lg:w-[1240px]"
                style={{
                  minHeight: '512px',
                  borderRadius: '20px',
                  gap: '18px',
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.14)'
                }}
              >
                <div 
                  className="flex items-center justify-between w-full"
                  style={{ height: '133px', gap: '16px' }}
                >
                  <div className="flex items-center" style={{ gap: '16px' }}>
                  <div 
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: '88px',
                      height: '88px',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      gap: '6px',
                      background: 'rgba(41, 253, 152, 0.1)'
                    }}
                  >
                    <img 
                      src="/coins/gift.png" 
                      alt="Featured Offers" 
                      style={{ width: '44px', height: '44px', objectFit: 'contain' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h2 style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: '42px',
                      lineHeight: '120%',
                      color: 'rgba(255, 255, 255, 1)',
                      margin: 0
                    }}>
                      Featured Offers
                    </h2>
                    <p style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500,
                      fontSize: '22px',
                      lineHeight: '130%',
                      color: 'rgba(136, 136, 136, 1)',
                      margin: 0
                    }}>
                      High-reward direct tasks. Manual approval required.
                    </p>
                  </div>
                  </div>
                  <img 
                    src="/coins/feature%20offer.png" 
                    alt="Featured Offers Graphic" 
                    style={{ width: '332px', height: '133px', objectFit: 'contain', flexShrink: 0 }}
                  />
                </div>
                <div className="relative mt-2">
                  <div 
                    ref={featuredScrollRef}
                    onScroll={handleFeaturedScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {Array.from({ length: Math.ceil(customOffers.length / itemsPerPage) }).map((_, pageIndex) => (
                      <div key={pageIndex} className="min-w-full shrink-0 snap-start flex gap-4">
                        {customOffers.slice(pageIndex * itemsPerPage, pageIndex * itemsPerPage + itemsPerPage).map(offer => (
                          <div key={offer._id} style={{ width: `calc(${100 / itemsPerPage}% - ${(itemsPerPage - 1) * 16 / itemsPerPage}px)` }}>
                            <FeaturedOfferCard offer={offer} onClick={() => setSelectedOffer(offer)} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Dot Pagination */}
                  <div className="flex justify-center mt-6">
                    <div 
                      className="flex items-center" 
                      style={{ height: '12px', gap: '6px' }}
                    >
                      {Array.from({ length: Math.ceil(customOffers.length / itemsPerPage) }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => scrollFeaturedToPage(idx)}
                          className="transition-all duration-300 hover:opacity-80"
                          style={{
                            height: '12px',
                            borderRadius: '30px',
                            width: featuredActiveIndex === idx ? '42px' : '12px',
                            background: featuredActiveIndex === idx ? 'rgba(73, 178, 101, 1)' : 'rgba(255, 255, 255, 0.2)'
                          }}
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
                className="shrink-0 w-full lg:w-[1240px]"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '469px',
                  borderRadius: '20px',
                  gap: '18px',
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.14)'
                }}
              >
                <div 
                  className="flex items-center justify-between w-full"
                  style={{ height: '133px', gap: '16px' }}
                >
                  <div className="flex items-center" style={{ gap: '16px' }}>
                  <div 
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: '88px',
                      height: '88px',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      gap: '6px',
                      background: 'rgba(41, 253, 152, 0.1)'
                    }}
                  >
                    <img 
                      src="/coins/game.png" 
                      alt="Gaming Offers" 
                      style={{ width: '44px', height: '44px', objectFit: 'contain' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h2 style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: '42px',
                      lineHeight: '120%',
                      color: 'rgba(255, 255, 255, 1)',
                      margin: 0
                    }}>
                      Gaming & App Offers
                    </h2>
                    <p style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500,
                      fontSize: '22px',
                      lineHeight: '130%',
                      color: 'rgba(136, 136, 136, 1)',
                      margin: 0
                    }}>
                      Play games to earn large amounts of points.
                    </p>
                  </div>
                  </div>
                  <img 
                    src="/coins/appimage.png" 
                    alt="Gaming & App Offers Graphic" 
                    style={{ width: '332px', height: '133px', objectFit: 'contain', flexShrink: 0 }}
                  />
                </div>
                {loadingSettings ? (
                  <div className="glass-card p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" /></div>
                ) : gamingProviders.length === 0 ? (
                  <div className="glass-card p-8 border border-white/[0.05] flex justify-center opacity-50"><span className="text-slate-400 text-sm">No gaming offerwalls active.</span></div>
                ) : (
                  <div className={`grid ${gridColsClass} w-full`} style={{ gap: '14px' }}>
                    {gamingProviders.map(provider => (
                      <ProviderCard key={provider.id} provider={provider} onClick={() => setActiveProvider(provider)} />
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
                className="flex flex-col shrink-0 w-full lg:w-[1240px]"
                style={{
                  minHeight: '323px',
                  borderRadius: '20px',
                  gap: '18px',
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.14)'
                }}
              >
                <div 
                  className="flex items-center justify-between w-full"
                  style={{ height: '133px', gap: '16px' }}
                >
                  <div className="flex items-center" style={{ gap: '16px' }}>
                    <div 
                      className="flex items-center justify-center shrink-0"
                      style={{ 
                        width: '88px', 
                        height: '88px', 
                        borderRadius: '10px', 
                        padding: '10px 12px',
                        gap: '6px',
                        background: 'rgba(41, 253, 152, 0.1)' 
                      }}
                    >
                      <img src="/coins/clicl.png" alt="Surveys" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <h2 className="font-bold text-white uppercase tracking-wider" style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '42px', lineHeight: '1.2' }}>Surveys</h2>
                      <p className="text-slate-400" style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '22px' }}>Share your opinion for quick and easy rewards.</p>
                    </div>
                  </div>
                  <img src="/coins/survay.png" alt="Graphic" style={{ width: '332px', height: '133px', objectFit: 'contain' }} />
                </div>
                {loadingSettings ? (
                  <div className="glass-card p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /></div>
                ) : surveyProviders.length === 0 ? (
                  <div className="glass-card p-8 border border-white/[0.05] flex justify-center opacity-50"><span className="text-slate-400 text-sm">No survey offerwalls active.</span></div>
                ) : (
                  <div className={`grid ${gridColsClass} w-full`} style={{ gap: '14px' }}>
                    {surveyProviders.map(provider => (
                      <ProviderCard key={provider.id} provider={provider} onClick={() => setActiveProvider(provider)} />
                    ))}
                  </div>
                )}
              </motion.section>
            )}

          </div>
        </div>
      </motion.div>

      <AnimatePresence>
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
