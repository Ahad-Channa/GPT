import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMonitor, FiInbox, FiStar, FiClock, FiExternalLink, FiSend, FiCheckCircle, FiLoader } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export const buildProviderUrl = (provider, userId) => {
  const CPX_APP_ID = '32283';
  switch (provider.id) {
    case 'cpx':
      return userId
        ? `https://offers.cpx-research.com/index.php?app_id=${CPX_APP_ID}&ext_user_id=${userId}`
        : null;
    default:
      return provider.iframeUrl || null;
  }
};

export const ProviderCard = ({ provider, onClick }) => (
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

export const OfferwallCard = ({ provider, userId }) => {
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

export const FeaturedOfferCard = ({ offer, userId, token, onSubmitted }) => {
  const [submitting, setSubmitting] = useState(false);
  const [proof, setProof] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [showProofForm, setShowProofForm] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(offer.submissionStatus === 'pending' || offer.submissionStatus === 'approved');
  const [result, setResult] = useState(null);

  const isExpired = offer.expirationDate && new Date(offer.expirationDate) < new Date();
  const isRejected = offer.submissionStatus === 'rejected';

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

  const handleOfferClick = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API}/api/activity/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ actionType: 'click_offer', sourceId: offer._id, sourceType: 'featured_offer' })
      });
    } catch (err) {
      console.error('Failed to log click', err);
    }
    window.open(offer.externalLink, '_blank', 'noopener,noreferrer');
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
                <button
                  onClick={handleOfferClick}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 hover:border-indigo-400/40 text-sm font-semibold transition-all cursor-pointer"
                >
                  <FiExternalLink className="text-xs" />
                  Go to Offer
                </button>
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
                <FiCheckCircle className="text-sm" /> {offer.submissionStatus === 'approved' ? 'Approved' : 'Proof Submitted'}
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
