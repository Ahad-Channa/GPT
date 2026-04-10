import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMonitor, FiInbox, FiStar, FiZap, FiExternalLink, FiCheckCircle, FiSend, FiLoader } from 'react-icons/fi';

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

// Helper to detect if an icon value is a URL/image path vs an emoji/text preset
const isIconUrl = (icon) => icon && (icon.startsWith('http') || icon.startsWith('data:') || icon.includes('/') || icon.startsWith('fa-'));

export const FeaturedOfferCard = ({ offer, onClick }) => {
  const isExpired = offer.expirationDate && new Date(offer.expirationDate) < new Date();

  // Priority: coverImage > icon URL > emoji icon > nothing
  const coverImgSrc = offer.coverImage || (isIconUrl(offer.icon) ? offer.icon : null);
  const emojiIcon = !coverImgSrc && offer.icon ? offer.icon : null;

  return (
    <motion.div
      variants={item}
      onClick={onClick}
      className={`glass-card cursor-pointer transition-all flex flex-col overflow-hidden group border ${
        isExpired ? 'opacity-50 border-white/[0.04]' : 'border-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)]'
      }`}
    >
      {/* Cover area */}
      <div className="h-28 w-full overflow-hidden relative flex-shrink-0">
        {coverImgSrc ? (
          <img
            src={coverImgSrc}
            alt={offer.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 via-[#131a2e] to-indigo-900/30">
            {emojiIcon ? (
              <span className="text-5xl select-none group-hover:scale-110 transition-transform duration-300">
                {emojiIcon}
              </span>
            ) : (
              <FiStar className="text-4xl text-amber-400/40 group-hover:text-amber-400/60 transition-colors" />
            )}
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1728]/80 to-transparent" />
      </div>

      {/* Text info */}
      <div className="px-3 py-2.5 flex flex-col gap-1">
        <p className="text-white font-semibold text-[13px] leading-snug line-clamp-1" title={offer.title}>
          {offer.title}
        </p>
        <div className="flex items-center gap-1.5">
          <FiZap className="text-amber-400 text-[11px] flex-shrink-0" />
          <span className="text-amber-400 font-bold font-mono text-[12px]">
            {offer.rewardAmount?.toLocaleString()} Coins
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export const FeaturedOfferModal = ({ offer, token, onClose, onSubmitted }) => {
  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(offer.submissionStatus);
  const [result, setResult] = useState(null);
  const [showProofForm, setShowProofForm] = useState(false);
  const [proof, setProof] = useState('');
  const [proofImage, setProofImage] = useState(null);

  const isExpired = offer.expirationDate && new Date(offer.expirationDate) < new Date();
  const alreadySubmitted = submissionStatus === 'pending' || submissionStatus === 'approved';
  const isRejected = submissionStatus === 'rejected';
  const isStarted = submissionStatus === 'started' || alreadySubmitted || isRejected;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProofImage(reader.result);
    reader.readAsDataURL(file);
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
        {/* Modal Header */}
        <div className="relative border-b border-white/[0.05] bg-gradient-to-br from-amber-500/10 to-transparent flex-shrink-0">
          {(() => {
            const coverImgSrc = offer.coverImage || (isIconUrl(offer.icon) ? offer.icon : null);
            const emojiIcon = !coverImgSrc && offer.icon ? offer.icon : null;
            return (
              <>
                {coverImgSrc ? (
                  <div className="h-32 w-full overflow-hidden relative">
                    <img src={coverImgSrc} alt={offer.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f1728]/80" />
                  </div>
                ) : emojiIcon ? (
                  <div className="h-20 w-full flex items-center justify-center bg-gradient-to-br from-amber-900/20 via-[#131a2e] to-indigo-900/20">
                    <span className="text-5xl select-none">{emojiIcon}</span>
                  </div>
                ) : null}
              </>
            );
          })()}
          <div className="flex items-start gap-4 p-6">
            {/* Fallback icon box only when truly nothing */}
            {!offer.coverImage && !offer.icon && (
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 shadow-inner flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                <FiStar className="text-2xl text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              </div>
            )}
            <div className="flex-1 pr-6">
              <h2 className="text-xl font-bold text-white font-display leading-tight">{offer.title}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <FiZap className="text-[10px]" /> {offer.rewardAmount?.toLocaleString()} Coins
                </span>
                {isExpired && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
                    Expired
                  </span>
                )}
                {alreadySubmitted && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    {submissionStatus === 'approved' ? '✓ Approved' : 'Submitted'}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 rounded-full transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
            <div className="text-sm text-slate-300 leading-relaxed space-y-2">
              {offer.description.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </div>

          {/* Rejection notice — compact, no redirect */}
          {isRejected && !alreadySubmitted && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl text-rose-400 text-sm">
              <span className="font-semibold flex items-center gap-1.5 mb-1">
                <FiInbox className="text-base" /> Submission Rejected
              </span>
              {offer.adminNote && <p className="italic text-xs opacity-80">Admin Note: "{offer.adminNote}"</p>}
            </div>
          )}

          {/* Inline proof form */}
          <AnimatePresence>
            {showProofForm && !alreadySubmitted && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="overflow-hidden"
              >
                <div className="border-t border-white/[0.05] pt-5 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Submit Proof</h4>
                  <textarea
                    value={proof}
                    onChange={(e) => setProof(e.target.value)}
                    placeholder="Transaction ID, username, screenshot URL, or describe what you completed…"
                    rows={3}
                    className="w-full bg-slate-900 border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30 resize-none"
                  />
                  {/* Image upload */}
                  <label className="cursor-pointer flex items-center gap-2 py-3 px-4 border border-dashed border-white/[0.12] rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors">
                    <FiSend className="text-amber-400/60 text-sm flex-shrink-0" />
                    <span className="text-sm text-slate-400 font-medium">
                      {proofImage ? '✓ Image selected — click to change' : 'Attach screenshot (optional)'}
                    </span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {proofImage && (
                    <div className="rounded-xl overflow-hidden border border-white/[0.08]">
                      <img src={proofImage} alt="Proof preview" className="max-h-28 object-contain mx-auto" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting || (!proof.trim() && !proofImage)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-40 transition-all"
                    >
                      {submitting ? <FiLoader className="animate-spin" /> : <FiSend />}
                      {submitting ? 'Sending…' : 'Send Proof'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProofForm(false)}
                      className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm font-semibold hover:text-white hover:bg-white/[0.05] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {result && (
            <div className={`p-3 rounded-xl border text-sm font-medium ${result.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
              {result.type === 'success' && <FiCheckCircle className="inline mr-1" />}
              {result.message}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/[0.05] bg-white/[0.01] flex flex-wrap gap-3 mt-auto flex-shrink-0">
          {alreadySubmitted ? (
            <div className="w-full text-center py-2 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm">
              <FiCheckCircle className="inline mr-1.5" />
              {submissionStatus === 'approved' ? 'Offer Approved! Reward granted.' : 'Proof Submitted — Awaiting Review'}
            </div>
          ) : (
            !isExpired && (
              <>
                {/* Resume / Start */}
                <button
                  onClick={handleStartOffer}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-500 border border-indigo-500 text-white font-semibold text-sm hover:bg-indigo-400 shadow-lg shadow-indigo-500/20 transition-all font-display tracking-wide"
                >
                  <FiExternalLink className="text-lg" />
                  {isStarted ? 'Resume Offer' : 'Start Offer'}
                </button>

                {/* Submit Proof — only after offer has been started */}
                {isStarted && !showProofForm && (
                  <button
                    onClick={() => { setShowProofForm(true); setResult(null); }}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 font-semibold text-sm transition-all"
                  >
                    <FiSend className="text-base" />
                    {isRejected ? 'Resubmit' : 'Submit Proof'}
                  </button>
                )}
              </>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

