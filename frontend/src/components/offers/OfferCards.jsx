import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMonitor, FiInbox, FiStar, FiZap, FiExternalLink, FiCheckCircle, FiSend, FiLoader, FiX } from 'react-icons/fi';
import { FaApple, FaAndroid, FaDesktop } from 'react-icons/fa';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
import CoinDisplay from '../CoinDisplay';
import CoinIcon from '../CoinIcon';
import { ProofUploadView } from './ProofUploadView';
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

const getProviderLogo = (id) => {
  const lowerId = id?.toLowerCase();

  const localLogos = {
    lootably: '/coins/lotablily.png',
    revu: '/coins/revu.png',
    torox: '/coins/torox.png',
    ayet: '/coins/aye.png',
    'ayet-studios': '/coins/aye.png',
    'ayet studios': '/coins/aye.png',
    timewall: '/coins/wall.png',
    notik: '/coins/me.png',
    mmwall: '/coins/mmwakk.png',
    cpx: '/coins/CPXR.png',
    'cpx-research': '/coins/CPXR.png',
    'cpx research': '/coins/CPXR.png',
    adgem: '/coins/adgem.png',
    primeearn: '/coins/primesur.png',
    'prime-earn': '/coins/primesur.png',
    'prime surveys': '/coins/primesur.png',
    primesurveys: '/coins/primesur.png',
    adtowall: '/coins/adtowall.png',
    adscend: '/coins/adsendm.png',
    adscendmedia: '/coins/adsendm.png',
    'adscend media': '/coins/adsendm.png'
  };

  if (localLogos[lowerId]) {
    return localLogos[lowerId];
  }

  return null;
};

export const ProviderCard = ({ provider, onClick }) => {
  const fallbackLogo = getProviderLogo(provider.id);
  const logoUrl = provider.imageUrl || fallbackLogo;

  return (
    <motion.div
      variants={item}
      onClick={onClick}
      className="cursor-pointer hover:border-indigo-500/40 transition-all flex flex-col items-center justify-center gap-2 group w-full h-[90px] lg:w-[188px] lg:h-[132px] rounded-[10px] lg:rounded-[20px]"
      style={{
        background: 'rgba(0, 0, 0, 0.36)',
        backdropFilter: 'blur(44px)',
        WebkitBackdropFilter: 'blur(44px)'
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={provider.label}
          className="group-hover:scale-110 transition-all w-[70%] h-auto max-h-[50px] lg:max-h-none lg:w-[160px] lg:h-[39px] object-contain"
        />
      ) : (
        <div
          className="group-hover:scale-110 transition-all flex items-center justify-center w-[70%] h-auto lg:w-[160px] lg:h-[39px]"
        >
          <FiMonitor className="text-3xl lg:text-4xl text-indigo-400 group-hover:text-amber-400 transition-colors" />
        </div>
      )}
    </motion.div>
  );
};

export const OfferwallCard = ({ provider, userId }) => {
  const url = buildProviderUrl(provider, userId);

  if (!url) {
    return (
      <div className="glass-card p-10 text-center flex flex-col items-center gap-3">
        <p className="text-slate-500 text-sm">This offerwall is not yet configured with an embed URL.</p>
      </div>
    );
  }

  return (
    <div 
      className="glass-card overflow-y-auto overflow-x-hidden border border-white/[0.05] w-full h-full"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <iframe
        src={url}
        title={`${provider.label} Offerwall`}
        className="w-full h-full border-none block"
        style={{ minHeight: '100%' }}
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
      className={`cursor-pointer transition-all flex flex-col group h-auto rounded-[10px] lg:rounded-[10px] gap-2 lg:gap-2 p-2 lg:p-2 w-full lg:w-[156px] shrink-0 ${isExpired ? 'opacity-50' : 'hover:scale-[1.02]'
        }`}
      style={{
        background: 'rgba(0, 0, 0, 0.36)',
        backdropFilter: 'blur(44px)',
        WebkitBackdropFilter: 'blur(44px)'
      }}
    >
      {/* Cover area */}
      <div
        className="w-full aspect-square lg:w-[140px] lg:h-[140px] relative flex-shrink-0 overflow-hidden rounded-[10px]"
      >
        {coverImgSrc ? (
          <img
            src={coverImgSrc}
            alt={offer.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 via-[#131a2e] to-indigo-900/30">
            {emojiIcon ? (
              <span className="text-4xl lg:text-3xl select-none group-hover:scale-110 transition-transform duration-300">
                {emojiIcon}
              </span>
            ) : (
              <FiStar className="text-2xl lg:text-3xl text-amber-400/40 group-hover:text-amber-400/60 transition-colors" />
            )}
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1728]/80 to-transparent" />

        {/* Platform Icons */}
        {offer.platforms && (
          <div className="absolute top-1 lg:top-1.5 left-1 lg:left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 lg:px-1.5 py-1 rounded-md border border-white/10 z-10">
            {offer.platforms.desktop && <FaDesktop className="text-white text-[8px] lg:text-[9px]" title="Desktop" />}
            {offer.platforms.android && <FaAndroid className="text-emerald-400 text-[8px] lg:text-[9px]" title="Android" />}
            {offer.platforms.ios && <FaApple className="text-white text-[8px] lg:text-[9px]" title="iOS" />}
          </div>
        )}
      </div>

      {/* Text info */}
      <div
        className="flex flex-col w-full flex-1 gap-[8px] lg:gap-[6px] items-start"
      >
        <div
          className="flex flex-col w-full gap-[4px] lg:gap-[4px] text-left"
        >
          <p
            className="line-clamp-1 truncate text-[14px] lg:text-[18px] pb-[2px]"
            title={offer.title}
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 600,
              lineHeight: '120%',
              color: 'rgba(255, 255, 255, 1)',
              margin: 0
            }}
          >
            {offer.title}
          </p>
          <p
            className="hidden line-clamp-2 text-[10px] lg:text-[13px] h-[26px] lg:h-[32px]"
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 500,
              lineHeight: '130%',
              color: 'rgba(136, 136, 136, 1)',
              margin: 0
            }}
          >
            {offer.description || 'Complete this offer to earn rewards.'}
          </p>
        </div>
        <div
          className="flex items-center justify-start w-full mt-auto relative -top-[3px] lg:top-0 h-[16px] lg:h-[18px] gap-[3px] lg:gap-[4px]"
        >
          <img
            src="/coins/Coin.png"
            alt="Coin"
            className="w-[12px] h-[12px] lg:w-[15px] lg:h-[15px] object-contain"
          />
          <span
            className="text-[12px] lg:text-[15px] flex items-center"
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              lineHeight: '130%',
              background: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            +<CoinDisplay amount={offer.rewardAmount} showIcon={false} />
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
      const res = await fetch(`${API}/custom-offers/${offer._id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubmissionStatus('started');
        if (offer.externalLink) {
          window.open(offer.externalLink, '_blank', 'noopener,noreferrer');
        }
      } else {
        setResult({ type: 'error', message: data.error || 'Failed to start offer.' });
      }
    } catch (err) {
      console.error('Failed to start offer', err);
      setResult({ type: 'error', message: 'Network error. Please try again.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/custom-offers/${offer._id}/submit`, {
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
        className="relative flex flex-col gap-3 lg:gap-4 p-3 lg:p-4 rounded-[20px] bg-[#242424] w-[95%] lg:w-[500px] h-auto lg:h-auto max-h-[85vh] lg:max-h-[90vh] box-border overflow-hidden"
      >
        {/* Close Button - Moved out of the image container to sit at top right of modal */}
        {!showProofForm && (
          <button
            onClick={onClose}
            className="absolute top-[12px] right-[12px] lg:top-[26px] lg:right-[16px] w-[26px] h-[26px] lg:w-[36px] lg:h-[36px] rounded-[8px] lg:rounded-[10px] bg-white/10 text-white flex items-center justify-center cursor-pointer z-10 border-none"
          >
            <FiX className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
          </button>
        )}

        {/* Header Section */}
        {/* Header Section */}
        {!showProofForm ? (
          <div className="flex flex-row gap-3 lg:gap-4 shrink-0">
            {/* Modal Header / Image */}
            <div className="w-[80px] h-[80px] lg:w-[159px] lg:h-[159px] rounded-[8px] lg:rounded-[10px] bg-white/5 flex items-center justify-center relative shrink-0 overflow-hidden">
              {(() => {
                const coverImgSrc = offer.coverImage || (isIconUrl(offer.icon) ? offer.icon : null);
                const emojiIcon = !coverImgSrc && offer.icon ? offer.icon : '🏆';
                if (coverImgSrc) {
                  return <img src={coverImgSrc} alt={offer.title} className="w-full h-full object-cover rounded-[10px]" />;
                }
                return <span className="text-[36px] lg:text-[48px] select-none" style={{ filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.5))' }}>{emojiIcon}</span>;
              })()}
            </div>

            {/* Title, Description, and Coin Pill */}
            <div className="flex-1 min-h-0 lg:min-h-[108px] h-auto flex flex-col gap-1 lg:gap-4 shrink opacity-100 min-w-0 pr-4 lg:pr-0">
              {/* Heading and Description Wrapper */}
              <div className="w-full h-auto flex flex-col gap-1 lg:gap-[6px] opacity-100">
                <h2
                  className="w-full h-auto text-[18px] lg:text-[26px] break-words"
                  style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 1)',
                    margin: 0,
                    lineHeight: '1.1'
                  }}
                >
                  {offer.title}
                </h2>
                <div
                  className="w-full h-auto text-[12px] lg:text-[16px] break-words line-clamp-2 lg:line-clamp-none"
                  style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 500,
                    color: 'rgba(136, 136, 136, 1)',
                    lineHeight: '1.2'
                  }}
                >
                  {offer.description.split('\n').map((line, i) => <p key={i} style={{ margin: 0, padding: 0 }}>{line}</p>)}
                </div>
              </div>
              <div className="flex items-center gap-[3px] self-start h-[20px] lg:h-[26px] mt-1 lg:mt-auto">
                <img src="/coins/Coin.png" alt="coin" className="w-[20px] h-[20px] lg:w-[26px] lg:h-[26px] object-contain" />
                <span
                  className="text-[18px] lg:text-[22px] inline-flex items-center"
                  style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 700,
                    background: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'transparent',
                    whiteSpace: 'nowrap'
                  }}
                >
                  +{(offer.rewardAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-row items-center gap-3 shrink-0 opacity-100">
            {/* Small Image */}
            <div className="w-[70px] h-[70px] lg:w-[99px] lg:h-[66px] rounded-[8px] overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
              {(() => {
                const coverImgSrc = offer.coverImage || (isIconUrl(offer.icon) ? offer.icon : null);
                const emojiIcon = !coverImgSrc && offer.icon ? offer.icon : '🏆';
                if (coverImgSrc) {
                  return <img src={coverImgSrc} alt={offer.title} className="w-full h-full object-cover" />;
                }
                return <div className="w-full h-full flex items-center justify-center text-2xl select-none">{emojiIcon}</div>;
              })()}
            </div>
            {/* Title and Description */}
            <div className="flex-1 flex flex-col gap-1 lg:gap-2 opacity-100 min-w-0 pr-2 lg:pr-0">
              <h2
                className="w-full text-[18px] lg:text-[28px] text-white font-semibold leading-none truncate"
                style={{ fontFamily: '"Barlow Condensed", sans-serif', margin: 0 }}
              >
                {offer.title}
              </h2>
              <div
                className="w-full text-[12px] lg:text-[14px] text-[#888888] leading-tight break-words line-clamp-2 lg:line-clamp-none"
                style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
              >
                <p style={{ margin: 0, padding: 0 }}>Follow the steps below to submit your proof of completion for review.</p>
              </div>
            </div>
            {/* Inline Close Button for Proof Form */}
            <button
              onClick={onClose}
              className="w-6 h-auto self-start mt-1 lg:mt-0 lg:h-[66px] lg:self-center bg-transparent opacity-100 border-none text-white flex items-center justify-center cursor-pointer shrink-0 p-0"
            >
              <FiX className="w-[16px] h-[16px] lg:w-[20px] lg:h-[20px]" />
            </button>
          </div>
        )}

        {/* Modal Body (Scrollable) */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>

          {showProofForm ? (
            <ProofUploadView
              offer={offer}
              token={token}
              API={API}
              onSubmitted={() => {
                setSubmissionStatus('pending');
                setShowProofForm(false);
                if (onSubmitted) onSubmitted();
              }}
              onCancel={() => setShowProofForm(false)}
              setResult={setResult}
            />
          ) : (
            <>
              {/* Status Markers */}
              {(isExpired || alreadySubmitted || isRejected) && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {isExpired && (
                    <span style={{ padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                      Expired
                    </span>
                  )}
                  {alreadySubmitted && (
                    <span 
                      className="px-[10px] py-[4px] rounded-[16px] text-[12px] font-bold border bg-white/10 text-white border-white/10"
                      style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                    >
                      {submissionStatus === 'approved' ? '✓ Approved' : 'Submitted'}
                    </span>
                  )}
                  {isRejected && !alreadySubmitted && (
                    <div style={{ width: '100%', background: 'rgba(244, 63, 94, 0.1)', border: 'none', padding: '12px', borderRadius: '12px', color: '#fb7185', fontSize: '13px' }}>
                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><FiInbox /> Submission Rejected</div>
                      {offer.adminNote && <div style={{ fontStyle: 'italic', opacity: 0.8 }}>Admin Note: "{offer.adminNote}"</div>}
                    </div>
                  )}
                </div>
              )}

              {/* Requirements Section ALWAYS VISIBLE AND STICKY */}
              {!isStarted && offer.requirements && offer.requirements.length > 0 && (
                <div className="w-full flex flex-col gap-2 shrink-0 sticky top-[-1px] z-20 bg-[#242424] pb-2 opacity-100">
                  <h4
                    className="text-[14px] lg:text-[16px] text-white font-bold leading-normal"
                    style={{ fontFamily: '"Barlow Condensed", sans-serif', margin: 0 }}
                  >
                    Requirements
                  </h4>
                  <div
                    className="w-full box-border h-auto shrink-0"
                    style={{
                      borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
                      background: 'rgba(0, 0, 0, 0.36)', backdropFilter: 'blur(44px)', WebkitBackdropFilter: 'blur(44px)',
                      opacity: 1
                    }}
                  >
                    {offer.requirements.map((req, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <img
                          src="/coins/retik.png"
                          alt="bullet"
                          style={{ width: '14px', height: '14px', flexShrink: 0, marginTop: '2px' }}
                        />
                        <p
                          className="text-[13px] lg:text-[16px] text-white font-medium leading-tight"
                          style={{ fontFamily: '"Barlow Condensed", sans-serif', margin: 0 }}
                        >
                          {req}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Boxes when started */}
              {isStarted && !alreadySubmitted && (
                <div className="w-full flex flex-col gap-4 shrink-0">
                  <div
                    className="w-full h-auto"
                    style={{
                      borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
                      background: 'rgba(0, 0, 0, 0.36)', backdropFilter: 'blur(44px)', WebkitBackdropFilter: 'blur(44px)',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <span
                        className="text-[14px] lg:text-[14px] text-white font-bold leading-tight block truncate"
                        style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                      >
                        Offer link clicked
                      </span>
                      <span
                        className="text-[11px] lg:text-[11px] text-[#888888] font-medium leading-tight block truncate"
                        style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                      >
                        Complete the offer requirements
                      </span>
                    </div>
                    <button
                      onClick={handleStartOffer}
                      className="h-[36px] lg:h-[38px] rounded-[8px] lg:rounded-[10px] px-4 lg:px-6 py-2 bg-[#27703a] border-none cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_0_#23502f] shrink-0"
                    >
                      <span
                        className="text-[14px] lg:text-[16px] text-white font-bold leading-none flex items-center justify-center"
                        style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                      >
                        Resume Offer
                      </span>
                    </button>
                  </div>

                  {/* Submit Proof Details */}
                  <div className="w-full flex flex-col gap-1 lg:gap-2 shrink-0">
                    <span
                      className="text-[14px] lg:text-base font-bold text-white leading-normal"
                      style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                    >
                      Submit Proof
                    </span>
                    <span
                      className="text-xs font-medium text-[#888888] leading-tight"
                      style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                    >
                      Follow the requirements above, then submit proof of completion for review.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {(result || alreadySubmitted) && (
            <div
              className={`w-full text-center p-3 rounded-xl text-[18px] lg:text-[16px] font-medium border ${
                (result?.type === 'success' || alreadySubmitted)
                  ? 'bg-white/5 border-white/10 text-white'
                  : 'bg-[#f43f5e1a] border-[#f43f5e33] text-[#fb7185]'
              }`}
              style={{
                fontFamily: '"Barlow Condensed", sans-serif'
              }}
            >
              {result?.message || (submissionStatus === 'approved' ? 'Offer Approved! Reward granted.' : 'Proof submitted! Awaiting admin review.')}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: 'auto', flexShrink: 0 }}>
          {!alreadySubmitted && !isExpired && (
              <>
                {!isStarted ? (
                  <button
                    onClick={handleStartOffer}
                    className="w-full h-[48px] rounded-[8px] lg:rounded-[10px] bg-[#49b265] text-white border-none font-bold text-[18px] leading-none flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_4px_0_#276d3a]"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      padding: '10px 30px'
                    }}
                  >
                    Start Offer
                    <img
                      src="/coins/image.png"
                      alt="arrow"
                      className="w-[24px] h-[24px] object-contain"
                    />
                  </button>
                ) : (
                  !showProofForm && (
                    <button
                      onClick={() => { setShowProofForm(true); setResult(null); }}
                      className="w-full h-[48px] rounded-[8px] lg:rounded-[10px] bg-[#49b265] text-white border-none font-bold text-[18px] leading-none flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_4px_0_#276d3a]"
                      style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        padding: '10px 30px'
                      }}
                    >
                      <img
                        src="/coins/upload.png"
                        alt="upload"
                        className="w-[24px] h-[24px] object-contain"
                      />
                      Submit Proof
                    </button>
                  )
                )}
              </>
            )}
        </div>
      </motion.div>
    </motion.div>
  );
};

