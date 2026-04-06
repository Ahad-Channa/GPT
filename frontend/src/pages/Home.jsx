import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiTrendingUp, FiCheckCircle, FiClock, FiStar, FiArrowRight, FiLock, FiUnlock, FiMonitor, FiInbox } from 'react-icons/fi';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProviderCard, OfferwallCard, FeaturedOfferCard } from '../components/offers/OfferCards';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const DailyBonusCard = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const fetchStatus = async () => {
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/api/wallet/daily-bonus-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch daily bonus status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchStatus();
  }, [currentUser]);

  useEffect(() => {
    if (!status?.nextClaimAt || !status.alreadyClaimed) return;
    
    const target = new Date(status.nextClaimAt).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft('00:00:00');
        fetchStatus();
        return;
      }
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const claimBonus = async () => {
    setClaiming(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/api/wallet/daily-bonus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to claim bonus', err);
    } finally {
      setClaiming(false);
    }
  };

  if (loading || !status) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-white/10 rounded w-1/2 mb-4"></div>
      </div>
    );
  }

  if (status.alreadyClaimed) {
    return (
      <motion.div variants={item} className="glass-card p-6 border border-emerald-500/20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
              <FiClock className="text-emerald-400" /> Come back in {timeLeft || '...'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Streak: Day {status.streak} | Claimed today ✓
            </p>
            <p className="text-sm text-indigo-300 mt-1">
              Next bonus: {status.rewardTomorrow} coins (Day {status.dayIndex + 2 > 7 ? 1 : status.dayIndex + 2})
            </p>
          </div>
          <div className="flex-shrink-0">
             <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
               <FiCheckCircle className="text-emerald-400 text-2xl" />
             </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (status.gateUnlocked) {
    return (
      <motion.div variants={item} className="glass-card p-6 border border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
              <FiUnlock className="text-amber-400" /> Daily Requirement Met!
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Streak Day {status.streak}
            </p>
            <p className="text-sm text-amber-300 font-medium mt-1">
              Tomorrow: Day {status.dayIndex + 2 > 7 ? 1 : status.dayIndex + 2} will be {status.rewardTomorrow} coins
            </p>
          </div>
          <button
            onClick={claimBonus}
            disabled={claiming}
            className="flex-shrink-0 btn-primary px-8 py-3 text-lg animate-pulse"
            style={{ boxShadow: '0 0 20px rgba(245,158,11,0.4)' }}
          >
            {claiming ? 'Claiming...' : `Claim ${status.rewardToday} Coins!`}
          </button>
        </div>
      </motion.div>
    );
  }

  const progressPercent = Math.min(100, Math.floor((status.earned / status.required) * 100));
  
  return (
    <motion.div variants={item} className="glass-card p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <FiLock className="text-slate-400" /> Daily Bonus Locked
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Earn {status.earned} / {status.required} coins today to unlock
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">Streak: Day {status.streak}</p>
          <p className="text-sm text-indigo-300 font-medium mt-1">
            Today's bonus: {status.rewardToday} coins
          </p>
        </div>
      </div>
      <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/10">
        <div 
          className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-1000"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="text-xs text-right mt-2 text-indigo-400 font-mono font-bold">
        {progressPercent}%
      </p>
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
        const res = await fetch(`${API}/api/wallet/dashboard-stats`, {
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
        const res = await fetch(`${API}/api/wallet/settings`, {
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
        const res = await fetch(`${API}/api/custom-offers`, {
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

        {/* ─── Greeting Banner ──────────────────────────────── */}
        <motion.div variants={item} className="glass-card p-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-2">Dashboard Overview</p>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-white mb-2">
                Welcome back, <span className="gradient-text">{displayName}</span> 👋
              </h1>
              <p className="text-slate-400 text-sm">Discover top earnings opportunities and track your progress.</p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-start sm:items-end">
              <span className="badge-violet mb-2">Rank {vipLevel}</span>
              <p className="text-3xl font-bold font-mono text-white">{balance}</p>
              <p className="text-indigo-400 text-xs font-mono tracking-widest">PTS BALANCE</p>
            </div>
          </div>
        </motion.div>

        {/* ─── Daily Bonus ──────────────────────────────────── */}
        <DailyBonusCard />

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
               <div className="space-y-4">
                 {customOffers.map(offer => (
                    <FeaturedOfferCard key={offer._id} offer={offer} userId={mongoUser?._id} token={token} />
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
    </DashboardLayout>
  );
};

export default Home;
