import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiUsers, FiCheckCircle, FiDollarSign, FiStar, FiMonitor, FiInbox } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProviderCard, OfferwallCard, FeaturedOfferCard, FeaturedOfferModal } from '../components/offers/OfferCards';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

// ── Animated count-up hook ────────────────────────────────────────────────────
const useCountUp = (target, duration = 1800) => {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  const startRef = useRef(null);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === 0) return;
    const from = prevTarget.current;
    prevTarget.current = target;
    const start = performance.now();
    startRef.current = start;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
};

// ── Platform Stats Banner ─────────────────────────────────────────────────────
const PlatformStats = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalPaidOut: 0 });

  useEffect(() => {
    const fetch1 = () =>
      fetch(`${API}/public/stats`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setStats({ totalUsers: d.totalUsers, totalPaidOut: d.totalPaidOut }); })
        .catch(() => {});

    fetch1();
    // Re-poll every 60 seconds so numbers stay fresh
    const interval = setInterval(fetch1, 60_000);
    return () => clearInterval(interval);
  }, []);

  const users  = useCountUp(stats.totalUsers, 1600);
  const paid   = useCountUp(stats.totalPaidOut, 2000);

  const statItems = [
    {
      icon: FiUsers,
      label: 'Registered Users',
      value: users.toLocaleString(),
      accent: 'indigo',
      glow: 'shadow-[0_0_24px_rgba(99,102,241,0.18)]',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
      iconColor: 'text-indigo-400',
      valueColor: 'text-indigo-200',
    },
    {
      icon: FiDollarSign,
      label: 'Total Paid Out',
      value: `$${paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      accent: 'emerald',
      glow: 'shadow-[0_0_24px_rgba(16,185,129,0.15)]',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-200',
    },
  ];

  return (
    <motion.div variants={item} className="grid grid-cols-2 gap-4">
      {statItems.map(({ icon: Icon, label, value, glow, iconBg, iconColor, valueColor }) => (
        <div
          key={label}
          className={`relative flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-sm overflow-hidden ${glow} transition-all hover:border-white/10`}
        >
          {/* Background gradient blob */}
          <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-white to-transparent pointer-events-none" />

          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0 ${iconBg}`}>
            <Icon className={`text-xl ${iconColor}`} />
          </div>

          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium mb-0.5 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold font-display tabular-nums ${valueColor}`}>{value}</p>
          </div>

          {/* Live pulse dot */}
          <div className="absolute top-3 right-3 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      ))}
    </motion.div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
      active
        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
        : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10 hover:bg-white/[0.03]'
    }`}
  >
    <Icon className="text-base" />
    {label}
    {count !== undefined && count > 0 && (
      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
        active ? 'bg-indigo-500/30 text-indigo-200' : 'bg-white/10 text-slate-400'
      }`}>
        {count}
      </span>
    )}
  </button>
);

const Home = () => {
  const { mongoUser, currentUser } = useAuth();
  const navigate = useNavigate();
  const displayName = mongoUser?.displayName || 'User';
  const balance = mongoUser?.walletBalance?.toFixed(2) ?? '0.00';
  const vipLevel = mongoUser?.vipLevel ?? 1;
  const [tasksDone, setTasksDone] = useState('...');
  
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
    if (token) fetchStats();
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
        if (data.success) setCustomOffers(data.offers);
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
    if (filterType === 'all' && ref) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const enabledProviders = settings?.offerwalls || [];
  const surveyProviders = enabledProviders.filter(p => p.category === 'surveys');
  const gamingProviders = enabledProviders.filter(p => p.category === 'gaming' || p.category === 'mixed');

  const tabs = [
    { id: 'all', label: 'All Operations', icon: FiZap },
    { id: 'featured', label: 'Featured Offers', icon: FiStar, count: customOffers.length, ref: featuredRef },
    { id: 'gaming', label: 'Gaming & Apps', icon: FiMonitor, count: gamingProviders.length, ref: gamingRef },
    { id: 'surveys', label: 'Surveys', icon: FiCheckCircle, count: surveyProviders.length, ref: surveysRef },
  ];

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
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-10">



        {/* ─── Platform Trust Stats ──────────────────────── */}
        <PlatformStats />

        {/* ─── Quick Jump Tabs ───────────────────────────── */}
        <motion.div variants={item} className="sticky top-4 z-20">
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl w-fit shadow-2xl">
            {tabs.map(tab => (
              <TabButton
                key={tab.id}
                active={filter === tab.id}
                onClick={() => scrollTo(tab.ref, tab.id)}
                icon={tab.icon}
                label={tab.label}
                count={tab.count}
              />
            ))}
          </div>
        </motion.div>

        {/* ─── MAIN CONTENT ─────────────────────────────────── */}
        <div className="space-y-12">
          
          {/* Section 1: Featured Offers */}
          {(filter === 'all' || filter === 'featured') && customOffers.length > 0 && (
            <motion.section ref={featuredRef} variants={item} className="space-y-4 pt-4">
               <div className="flex items-center gap-3 mb-2">
                 <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <FiStar className="text-amber-400 text-xl" />
                 </div>
                 <div>
                   <h2 className="text-2xl font-bold font-display text-white">Featured Offers</h2>
                   <p className="text-sm text-slate-400">High-reward direct tasks. Manual approval required.</p>
                 </div>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                 {customOffers.map(offer => (
                    <FeaturedOfferCard key={offer._id} offer={offer} onClick={() => setSelectedOffer(offer)} />
                 ))}
               </div>
            </motion.section>
          )}

          {/* Section 2: Gaming or App Offers */}
          {(filter === 'all' || filter === 'gaming') && (
            <motion.section ref={gamingRef} variants={item} className="space-y-4 pt-4">
               <div className="flex items-center gap-3 mb-2">
                 <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                    <FiMonitor className="text-cyan-400 text-xl" />
                 </div>
                 <div>
                   <h2 className="text-2xl font-bold font-display text-white">Gaming & App Offers</h2>
                   <p className="text-sm text-slate-400">Play games to earn large amounts of points.</p>
                 </div>
               </div>
               {loadingSettings ? (
                  <div className="glass-card p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" /></div>
               ) : gamingProviders.length === 0 ? (
                  <div className="glass-card p-8 border border-white/[0.05] flex items-center gap-3 opacity-50"><FiInbox className="text-slate-500" /> <span className="text-slate-400 text-sm">No gaming offerwalls active.</span></div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {gamingProviders.map(provider => (
                      <ProviderCard key={provider.id} provider={provider} onClick={() => setActiveProvider(provider)} />
                    ))}
                 </div>
               )}
            </motion.section>
          )}

          {/* Section 3: Surveys */}
          {(filter === 'all' || filter === 'surveys') && (
            <motion.section ref={surveysRef} variants={item} className="space-y-4 pt-4">
               <div className="flex items-center gap-3 mb-2">
                 <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <FiCheckCircle className="text-indigo-400 text-xl" />
                 </div>
                 <div>
                   <h2 className="text-2xl font-bold font-display text-white">Surveys</h2>
                   <p className="text-sm text-slate-400">Share your opinion for quick and easy rewards.</p>
                 </div>
               </div>
               {loadingSettings ? (
                  <div className="glass-card p-8 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /></div>
               ) : surveyProviders.length === 0 ? (
                  <div className="glass-card p-8 border border-white/[0.05] flex items-center gap-3 opacity-50"><FiInbox className="text-slate-500" /> <span className="text-slate-400 text-sm">No survey offerwalls active.</span></div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {surveyProviders.map(provider => (
                      <ProviderCard key={provider.id} provider={provider} onClick={() => setActiveProvider(provider)} />
                    ))}
                 </div>
               )}
            </motion.section>
          )}
          
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
