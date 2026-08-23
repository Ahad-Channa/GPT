import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheckCircle, FiZap, FiMonitor, FiStar, FiExternalLink,
  FiClock, FiLoader, FiInbox, FiSend
} from 'react-icons/fi';
import { ProviderCard, OfferwallCard, FeaturedOfferCard, FeaturedOfferModal } from '../components/offers/OfferCards';
import { DirectOfferCard, DirectOfferModal } from '../components/offers/DirectOfferCard';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };


// --- Tab Button Component
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


// === MAIN EARN PAGE ===
const Earn = () => {
  const { mongoUser, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('surveys');
  const [activeProvider, setActiveProvider] = useState(null);
  const [settings, setSettings] = useState(null);
  const [customOffers, setCustomOffers] = useState([]);
  const [directOffers, setDirectOffers] = useState([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingCustomOffers, setLoadingCustomOffers] = useState(true);
  const [loadingDirectOffers, setLoadingDirectOffers] = useState(true);
  const [token, setToken] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [selectedDirectOffer, setSelectedDirectOffer] = useState(null);

  // Combined loading state for featured tab
  const loadingOffers = loadingCustomOffers || loadingDirectOffers;

  // Clear active provider when changing tabs
  useEffect(() => {
    setActiveProvider(null);
  }, [activeTab]);

  // Fetch token once
  useEffect(() => {
    if (currentUser) {
      currentUser.getIdToken().then(setToken);
    }
  }, [currentUser]);

  // Fetch wallet settings (includes enabled providers)
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

  // Fetch active custom (featured) offers
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
        setLoadingCustomOffers(false);
      }
    };
    fetchOffers();
  }, [token]);

  // Fetch active direct offers (S2S auto-tracked)
  useEffect(() => {
    if (!token) return;
    const fetchDirectOffers = async () => {
      try {
        const res = await fetch(`${API}/direct-offers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setDirectOffers(data.offers);
      } catch (err) {
        console.error('Failed to load direct offers:', err);
      } finally {
        setLoadingDirectOffers(false);
      }
    };
    fetchDirectOffers();
  }, [token]);

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
    { id: 'surveys',  label: 'Surveys',        icon: FiCheckCircle, count: surveyProviders.length },
    { id: 'gaming',   label: 'Gaming & Apps',   icon: FiMonitor,     count: gamingProviders.length },
    { id: 'featured', label: 'Featured Offers', icon: FiStar,        count: customOffers.length + directOffers.length },
  ];

  const renderEmptyState = (label) => (
    <div className="glass-card p-16 text-center flex flex-col items-center gap-4">
      <div>
        <p className="text-slate-300 font-semibold mb-1">No {label} Available</p>
        <p className="text-slate-500 text-sm">Check back soon — new earning opportunities are added regularly.</p>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Page Header */}
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-white tracking-tight flex items-center gap-3">
              <FiZap className="text-indigo-400" /> Earn Points
            </h1>
            <p className="text-slate-400 mt-2">
              Complete surveys, play games, and discover featured offers to earn coins.
            </p>
          </div>
        </motion.div>


        {/* Tab Bar */}
        <motion.div variants={item}>
          <div className="flex flex-wrap gap-2 p-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl w-fit">
            {tabs.map(tab => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                icon={tab.icon}
                label={tab.label}
                count={tab.count}
              />
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {activeProvider ? (
              <div className="space-y-4">
                <button
                  onClick={() => setActiveProvider(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition-all font-semibold text-sm w-fit"
                >
                  <span className="text-lg">←</span> Back to Providers
                </button>
                <OfferwallCard provider={activeProvider} userId={mongoUser?._id} />
              </div>
            ) : (
              <>
            {/* ─── SURVEYS TAB ─── */}
            {activeTab === 'surveys' && (
              <>
                {loadingSettings ? (
                  <div className="glass-card p-12 text-center flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    <p className="text-slate-400 text-sm">Loading survey providers...</p>
                  </div>
                ) : surveyProviders.length === 0 ? (
                  renderEmptyState('Surveys')
                ) : (
                  <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                    {surveyProviders.map(provider => (
                      <ProviderCard key={provider.id} provider={provider} onClick={() => setActiveProvider(provider)} />
                    ))}
                  </motion.div>
                  )}
              </>
            )}

            {/* ─── GAMING & APPS TAB ─── */}
            {activeTab === 'gaming' && (
              <>
                {loadingSettings ? (
                  <div className="glass-card p-12 text-center flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                    <p className="text-slate-400 text-sm">Loading gaming providers...</p>
                  </div>
                ) : gamingProviders.length === 0 ? (
                  renderEmptyState('Gaming & App Offers')
                ) : (
                  <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                    {gamingProviders.map(provider => (
                      <ProviderCard key={provider.id} provider={provider} onClick={() => setActiveProvider(provider)} />
                    ))}
                  </motion.div>
                  )}
              </>
            )}

            {/* ─── FEATURED OFFERS TAB ─── */}
            {activeTab === 'featured' && (
              <>
                {loadingOffers ? (
                  <div className="glass-card p-12 text-center flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                    <p className="text-slate-400 text-sm">Loading featured offers...</p>
                  </div>
                ) : (customOffers.length === 0 && directOffers.length === 0) ? (
                  <div className="glass-card p-16 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/[0.06] border border-amber-500/[0.15] flex items-center justify-center">
                      <FiStar className="text-amber-500/50 text-2xl" />
                    </div>
                    <div>
                      <p className="text-slate-300 font-semibold mb-1">No Featured Offers Right Now</p>
                      <p className="text-slate-500 text-sm">
                        Our team is working on exclusive partnership offers. Check back soon!
                      </p>
                    </div>
                  </div>
                ) : (
                  <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
                    {/* Direct Offers (S2S Auto-tracked) */}
                    {directOffers.length > 0 && (
                      <>
                        <p className="text-xs text-indigo-400/70 font-semibold tracking-wide uppercase mb-2">
                          ⚡ {directOffers.length} Auto-Tracked {directOffers.length === 1 ? 'Offer' : 'Offers'} — Reward credited instantly on completion
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(156px,1fr))] gap-3 lg:gap-4">
                          {directOffers.map(offer => (
                            <DirectOfferCard
                              key={offer._id}
                              offer={offer}
                              onClick={() => setSelectedDirectOffer(offer)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    {/* Manual Proof Offers */}
                    {customOffers.length > 0 && (
                      <>
                        <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase mb-2 mt-4">
                          📋 {customOffers.length} Manual {customOffers.length === 1 ? 'Offer' : 'Offers'} — Requires proof submission
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(156px,1fr))] gap-3 lg:gap-4">
                          {customOffers.map(offer => (
                            <FeaturedOfferCard
                              key={offer._id}
                              offer={offer}
                              onClick={() => setSelectedOffer(offer)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </>
            )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {selectedOffer && (
            <FeaturedOfferModal
              offer={selectedOffer}
              token={token}
              onClose={() => setSelectedOffer(null)}
              onSubmitted={() => {}}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedDirectOffer && (
            <DirectOfferModal
              offer={selectedDirectOffer}
              token={token}
              onClose={() => setSelectedDirectOffer(null)}
              onClicked={(offerId) => {
                // Update the local click status so the card reflects 'In Progress'
                setDirectOffers(prev =>
                  prev.map(o => o._id === offerId ? { ...o, clickStatus: 'clicked' } : o)
                );
              }}
            />
          )}
        </AnimatePresence>

      </motion.div>
    </DashboardLayout>
  );
};

export default Earn;

