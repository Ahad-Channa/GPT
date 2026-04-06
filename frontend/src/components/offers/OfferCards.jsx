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

export const FeaturedOfferCard = ({ offer, onClick }) => {
  const isExpired = offer.expirationDate && new Date(offer.expirationDate) < new Date();
  
  return (
    <motion.div
      variants={item}
      onClick={onClick}
      className={`glass-card p-6 cursor-pointer transition-all flex flex-col items-center justify-center gap-4 group h-48 border ${isExpired ? 'opacity-50 border-white/[0.04]' : 'border-amber-500/20 hover:border-amber-500/40 hover:bg-white/[0.03]'}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500/20 transition-all flex-shrink-0 overflow-hidden">
        {offer.icon ? (
          offer.icon.startsWith('http') || offer.icon.startsWith('data:image') || offer.icon.includes('/') || offer.icon.includes('.') ? (
            <img src={offer.icon} alt={offer.title} className="w-full h-full object-cover" />
          ) : (
            <i className={`${offer.icon} text-3xl text-amber-400 group-hover:text-amber-300 transition-colors`}></i>
          )
        ) : (
          <FiStar className="text-3xl text-amber-400 group-hover:text-amber-300 transition-colors" />
        )}
      </div>
      <div className="text-center w-full px-1">
        <h3 className="text-white font-semibold text-sm line-clamp-2 leading-snug" title={offer.title}>{offer.title}</h3>
        <p className="text-amber-400 font-bold font-mono text-xs mt-2">+{offer.rewardAmount?.toLocaleString()} Coins</p>
      </div>
    </motion.div>
  );
};

export const FeaturedOfferModal = ({ offer, token, onClose, onSubmitted }) => {
  const [submitting, setSubmitting] = useState(false);
  const [proof, setProof] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [showProofForm, setShowProofForm] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(offer.submissionStatus);
  const [result, setResult] = useState(null);

  const isExpired = offer.expirationDate && new Date(offer.expirationDate) < new Date();
  const alreadySubmitted = submissionStatus === 'pending' || submissionStatus === 'approved';
  const isRejected = submissionStatus === 'rejected';
  const isStarted = submissionStatus === 'started' || alreadySubmitted || isRejected;

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

  const handleStartOffer = async () => {
    if (isStarted) {
      window.open(offer.externalLink, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const res = await fetch(`${API}/api/custom-offers/${offer._id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubmissionStatus('started');
        window.open(offer.externalLink, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Failed to start offer', err);
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
        setSubmissionStatus('pending');
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0f1728] border border-amber-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header content... wait, missing FiX import if I want close button. Let's make do without or add close button */}
        <div className="relative p-6 border-b border-white/[0.05] bg-gradient-to-br from-amber-500/10 to-transparent flex items-start gap-4 shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 shadow-inner flex items-center justify-center flex-shrink-0 overflow-hidden border border-amber-500/30">
            {offer.icon ? (
              offer.icon.startsWith('http') || offer.icon.startsWith('data:image') || offer.icon.includes('/') || offer.icon.includes('.') ? (
                <img src={offer.icon} alt={offer.title} className="w-full h-full object-cover" />
              ) : (
                <i className={`${offer.icon} text-3xl text-amber-400`}></i>
              )
            ) : (
               <FiStar className="text-3xl text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            )}
          </div>
          <div className="flex-1 pr-6">
            <h2 className="text-xl font-bold text-white font-display leading-tight">{offer.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                +{offer.rewardAmount?.toLocaleString()} Coins
              </span>
              {isExpired && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
                  Expired
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 rounded-full transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
            <div className="text-sm text-slate-300 leading-relaxed space-y-2">
              {offer.description.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </div>

          {offer.expirationDate && !isExpired && (
            <div className="flex items-center gap-2 text-sm text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <FiClock className="flex-shrink-0" />
              <p>Offer closes on <strong className="font-semibold">{new Date(offer.expirationDate).toLocaleDateString()}</strong></p>
            </div>
          )}

          {isRejected && !alreadySubmitted && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-sm">
              <span className="font-semibold flex items-center gap-1.5 mb-1">
                <FiInbox className="text-base" /> Submission Rejected
              </span>
              <p>Please fix the issues and resubmit.</p>
              {offer.adminNote && <p className="italic text-xs opacity-90 mt-2 border-t border-rose-500/20 pt-2">Admin Note: "{offer.adminNote}"</p>}
            </div>
          )}

          {/* Proof Form */}
          <AnimatePresence>
            {showProofForm && !alreadySubmitted && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="overflow-hidden border-t border-white/[0.05] pt-5 mt-2"
              >
                <h4 className="text-sm font-semibold text-white mb-3">Submit Proof</h4>
                <textarea
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  placeholder="Describe your completion or paste a screenshot URL / transaction ID... (Optional if you upload an image)"
                  rows={3}
                  className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30 resize-none"
                />
                
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Upload Image Proof (Optional)
                  </label>
                  <label className="cursor-pointer flex items-center justify-center w-full py-4 px-4 border shadow-inner border-dashed border-white/20 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors">
                    <span className="text-sm text-amber-400/80 font-medium tracking-wide">
                      {proofImage ? "Image selected - click to change" : "+ Select an image file"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {proofImage && (
                    <div className="mt-3 bg-slate-900 p-2 rounded-xl border border-white/10">
                      <img src={proofImage} alt="Proof preview" className="max-h-32 object-contain mx-auto rounded" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-5">
                  <button
                    type="submit"
                    disabled={submitting || (!proof.trim() && !proofImage)}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 disabled:opacity-50 transition-all"
                  >
                    {submitting ? <FiLoader className="animate-spin text-lg" /> : <FiSend className="text-lg" />}
                    {submitting ? 'Submitting...' : 'Send Proof'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProofForm(false)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {result && (
            <div className={`mt-2 p-3 rounded-xl border text-sm font-medium ${result.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
              {result.type === 'success' && <FiCheckCircle className="inline mr-1" />}
              {result.message}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/[0.05] bg-white/[0.01] flex flex-wrap gap-3 mt-auto shrink-0">
          {alreadySubmitted ? (
            <div className="w-full text-center py-2 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm">
              <FiCheckCircle className="inline mr-1.5" /> 
              {submissionStatus === 'approved' ? 'Offer Approved!' : 'Proof Submitted - Awaiting Review'}
            </div>
          ) : (
            <>
              {!isExpired && (
                <button
                  onClick={handleStartOffer}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-500 border border-indigo-500 text-white font-semibold text-sm hover:bg-indigo-400 shadow-lg shadow-indigo-500/20 transition-all font-display tracking-wide"
                >
                  <FiExternalLink className="text-lg" />
                  {isStarted ? 'Resume Offer' : 'Start Offer'}
                </button>
              )}
              
              {!isExpired && isStarted && offer.trackingType === 'manual_approval' && !showProofForm && (
                <button
                  onClick={() => setShowProofForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 font-semibold text-sm transition-all"
                >
                  <FiSend className="text-lg" />
                  Submit Proof
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
