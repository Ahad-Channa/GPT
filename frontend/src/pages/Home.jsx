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

const TabButton = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
      active
        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
        : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10 hover:bg-white/[0.03]'
    }`}
  >
    {Icon && <Icon className="text-base" />}
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
  const [tasksDone, setTasksDone] = useState('...');
  const [globalStats, setGlobalStats] = useState({ totalUsers: 0, totalPaidOut: 0, show: false });
  
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
    if (filterType === 'all' && ref) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const enabledProviders = settings?.offerwalls || [];
  const surveyProviders = enabledProviders.filter(p => p.category === 'surveys');
  const gamingProviders = enabledProviders.filter(p => p.category === 'gaming' || p.category === 'mixed');

  const tabs = [
    { id: 'all', label: 'All Operations' },
    { id: 'featured', label: 'Featured Offers', icon: FiGift, count: customOffers.length, ref: featuredRef },
    { id: 'gaming', label: 'Gaming & Apps', icon: FiMonitor, count: gamingProviders.length, ref: gamingRef },
    { id: 'surveys', label: 'Surveys', icon: FiClipboard, count: surveyProviders.length, ref: surveysRef },
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
    <DashboardLayout showLiveBar={true}>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-10">

        {/* ─── Platform Stats ───────────────────────────── */}
        {globalStats.show && (
          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {/* Total Users Card */}
             <div className="relative overflow-hidden p-[20px] md:p-[30px] flex items-center justify-between group rounded-[20px] bg-[#1a1b1a] shadow-[0px_4px_80px_0px_rgba(0,0,0,0.15)] backdrop-blur-[44px] border border-white/[0.05]">
               <div className="relative z-10 flex flex-col gap-2">
                  <div className="w-[44px] h-[44px] rounded-[10px] bg-[#49B265]/10 flex items-center justify-center">
                    <img src="/coins/people.png" alt="Members" className="w-[24px] h-[24px] object-contain" />
                  </div>
                  <p className="text-[12px] text-white/50 font-semibold uppercase tracking-widest mb-0.5">Total Members</p>
                  <div className="text-[32px] md:text-[40px] font-bold text-white font-sans tracking-tight leading-none">
                    {globalStats.totalUsers.toLocaleString()}
                  </div>
               </div>
               <img src="/coins/persons.png" alt="Graphic" className="absolute right-0 top-1/2 -translate-y-1/2 h-full object-contain opacity-50 group-hover:opacity-80 transition-opacity" />
             </div>

             {/* Paid Out Card */}
             <div className="relative overflow-hidden p-[20px] md:p-[30px] flex items-center justify-between group rounded-[20px] bg-[#1a1b1a] shadow-[0px_4px_80px_0px_rgba(0,0,0,0.15)] backdrop-blur-[44px] border border-white/[0.05]">
               <div className="relative z-10 flex flex-col gap-2">
                  <div className="w-[44px] h-[44px] rounded-[10px] bg-[#49B265]/10 flex items-center justify-center">
                    <img src="/coins/doller.png" alt="Paid" className="w-[24px] h-[24px] object-contain" />
                  </div>
                  <p className="text-[12px] text-white/50 font-semibold uppercase tracking-widest mb-0.5">Total Paid Out</p>
                  <div className="text-[32px] md:text-[40px] font-bold text-[#49B265] font-sans tracking-tight leading-none">
                    ${globalStats.totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
               </div>
               <img src="/coins/live.png" alt="Graphic" className="absolute right-0 top-1/2 -translate-y-1/2 h-[120%] object-contain opacity-50 group-hover:opacity-80 transition-opacity" />
             </div>
          </motion.div>
        )}

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
                    <FiGift className="text-amber-400 text-xl" />
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
                    <FiClipboard className="text-indigo-400 text-xl" />
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
