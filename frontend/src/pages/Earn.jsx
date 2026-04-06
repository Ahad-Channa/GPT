import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheckCircle, FiZap, FiMonitor, FiStar, FiExternalLink,
  FiClock, FiLoader, FiInbox, FiSend
} from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

// --- Offerwall iframe provider IDs to CPX URL builder
const buildProviderUrl = (provider, userId) => {
  const CPX_APP_ID = '32283';
  switch (provider.id) {
    case 'cpx':
      return userId
        ? `https://offers.cpx-research.com/index.php?app_id=${CPX_APP_ID}&ext_user_id=${userId}`
        : null;
    // Add other providers here as they get integrated
    default:
      return provider.iframeUrl || null; // fallback to stored URL if any
  }
};

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

// --- Provider Grid Card Component
const ProviderCard = ({ provider, onClick }) => (
  <motion.div
    variants={item}
    onClick={onClick}
    className="glass-card p-6 cursor-pointer hover:border-indigo-500/40 hover:bg-white/[0.03] transition-all flex flex-col items-center justify-center gap-4 group h-48"
  >
    <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all">
      {provider.imageUrl ? (
        <img src={provider.imageUrl} alt={provider.label} className="w-10 h-10 object-contain" />
      ) : (
        <FiMonitor className="text-3xl text-indigo-400 group-hover:text-amber-400 transition-colors" />
      )}
    </div>
    <div className="text-center">
      <h3 className="text-white font-semibold text-lg">{provider.label}</h3>
      <p className="text-slate-400 text-xs mt-1">Earn Coins</p>
    </div>
  </motion.div>
);

// --- Single Offerwall Iframe Card
const OfferwallCard = ({ provider, userId }) => {
  const url = buildProviderUrl(provider, userId);

  if (!url) {
    return (
      <div className="glass-card p-10 text-center flex flex-col items-center gap-3">
        <FiInbox className="text-slate-600 text-3xl" />
        <p className="text-slate-500 text-sm">This offerwall is not yet configured with an embed URL.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden border border-white/[0.05]" style={{ height: '800px' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
        <span className="text-sm font-semibold text-slate-300">{provider.label}</span>
        <span className="text-xs text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
          Live
        </span>
      </div>
      <iframe
        src={url}
        title={`${provider.label} Offerwall`}
        className="w-full border-none"
        style={{ height: 'calc(100% - 44px)' }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
      />
    </div>
  );
};

// --- Featured Offer Card (Custom Offers)
const FeaturedOfferCard = ({ offer, userId, token, onSubmitted }) => {
  const [submitting, setSubmitting] = useState(false);
  const [proof, setProof] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [showProofForm, setShowProofForm] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(offer.submissionStatus === 'pending' || offer.submissionStatus === 'approved');
  const [result, setResult] = useState(null);

  const isExpired = offer.expirationDate && new Date(offer.expirationDate) < new Date();
  const isRejected = offer.submissionStatus === 'rejected';

  // Convert uploaded image to Base64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/custom-offers/${offer._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ proofText: proof, proofImage }),
      });
      const data = await res.json();
      if (data.success) {
        setAlreadySubmitted(true);
        setResult({ type: 'success', message: 'Proof submitted! Awaiting admin review.' });
        setShowProofForm(false);
        if (onSubmitted) onSubmitted();
      } else {
        setResult({ type: 'error', message: data.error || 'Submission failed.' });
      }
    } catch {
      setResult({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={item}
      className={`glass-card p-6 border ${isExpired ? 'opacity-50 border-white/[0.04]' : 'border-amber-500/20 hover:border-amber-500/40'} transition-all`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <FiStar className="text-amber-400 text-xl" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-white font-display">{offer.title}</h3>
            {isExpired && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20 uppercase tracking-wide">
                Expired
              </span>
            )}
            {offer.trackingType === 'manual_approval' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                Manual Approval
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mb-3 leading-relaxed">{offer.description}</p>

          {offer.expirationDate && !isExpired && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
              <FiClock className="text-[11px]" />
              Expires {new Date(offer.expirationDate).toLocaleDateString()}
            </p>
          )}

          {/* Reward + Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-sm">
              +{offer.rewardAmount.toLocaleString()} Coins
            </span>

            {!isExpired && !alreadySubmitted && (
              <>
                <a
                  href={offer.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 hover:border-indigo-400/40 text-sm font-semibold transition-all"
                >
                  <FiExternalLink className="text-xs" />
                  Go to Offer
                </a>
                {offer.trackingType === 'manual_approval' && (
                  <button
                    onClick={() => setShowProofForm(!showProofForm)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:text-amber-300 hover:border-amber-400/40 text-sm font-semibold transition-all"
                  >
                    <FiSend className="text-xs" />
                    Submit Proof
                  </button>
                )}
              </>
            )}

            {alreadySubmitted && (
              <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
                <FiCheckCircle className="text-sm" /> Proof Submitted
              </span>
            )}
            
            {isRejected && !alreadySubmitted && (
              <span className="flex flex-col gap-1 text-sm bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-rose-400 max-w-sm">
                <span className="font-semibold flex items-center gap-1.5">
                  <FiInbox className="text-sm" /> Submission Rejected. Please fix and resubmit.
                </span>
                {offer.adminNote && <span className="italic text-xs opacity-90 mt-1">"{offer.adminNote}"</span>}
              </span>
            )}
          </div>

          {/* Proof Form */}
          <AnimatePresence>
            {showProofForm && !alreadySubmitted && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="mt-4 overflow-hidden"
              >
                <textarea
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  placeholder="Describe your completion or paste a screenshot URL / transaction ID... (Optional if you upload an image)"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30 resize-none"
                />
                
                <div className="mt-3">
                  <label className="block text-sm font-semibold text-slate-300 mb-1">
                    Upload Image Proof (Optional)
                  </label>
                  <label className="cursor-pointer flex items-center justify-center w-full py-3 px-4 border border-dashed border-white/20 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <span className="text-sm text-slate-400">
                      {proofImage ? "Image selected" : "Click to select image"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {proofImage && (
                    <div className="mt-2 text-center">
                      <img src={proofImage} alt="Proof preview" className="h-20 object-contain mx-auto rounded" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="submit"
                    disabled={submitting || (!proof.trim() && !proofImage)}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-sm hover:bg-amber-500/30 disabled:opacity-50 transition-all"
                  >
                    {submitting ? <FiLoader className="animate-spin text-sm" /> : <FiSend className="text-sm" />}
                    {submitting ? 'Submitting...' : 'Send Proof'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                        setShowProofForm(false);
                        setProofImage('');
                    }}
                    className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {result && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-3 text-sm font-medium ${result.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {result.message}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// === MAIN EARN PAGE ===
const Earn = () => {
  const { mongoUser, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('surveys');
  const [activeProvider, setActiveProvider] = useState(null);
  const [settings, setSettings] = useState(null);
  const [customOffers, setCustomOffers] = useState([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [token, setToken] = useState(null);

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

  // Fetch active custom (featured) offers
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

  const enabledProviders = settings?.offerwalls || [];
  const surveyProviders = enabledProviders.filter(p => p.category === 'surveys');
  const gamingProviders = enabledProviders.filter(p => p.category === 'gaming' || p.category === 'mixed');

  const tabs = [
    { id: 'surveys',  label: 'Surveys',        icon: FiCheckCircle, count: surveyProviders.length },
    { id: 'gaming',   label: 'Gaming & Apps',   icon: FiMonitor,     count: gamingProviders.length },
    { id: 'featured', label: 'Featured Offers', icon: FiStar,        count: customOffers.length },
  ];

  const renderEmptyState = (label) => (
    <div className="glass-card p-16 text-center flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
        <FiInbox className="text-slate-600 text-2xl" />
      </div>
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
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <FiCheckCircle className="text-emerald-400" />
            <span className="text-emerald-400 font-medium text-sm">Rewards sent instantly</span>
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
                  <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                ) : customOffers.length === 0 ? (
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
                    <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">
                      {customOffers.length} Active {customOffers.length === 1 ? 'Offer' : 'Offers'} — Manual approval required after completion
                    </p>
                    {customOffers.map(offer => (
                      <FeaturedOfferCard
                        key={offer._id}
                        offer={offer}
                        userId={mongoUser?._id}
                        token={token}
                      />
                    ))}
                  </motion.div>
                )}
              </>
            )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

      </motion.div>
    </DashboardLayout>
  );
};

export default Earn;

