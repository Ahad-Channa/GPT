import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMonitor, FiInbox, FiStar, FiZap, FiExternalLink, FiCheckCircle, FiSend, FiLoader, FiX } from 'react-icons/fi';

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
      className="cursor-pointer hover:border-indigo-500/40 transition-all flex flex-col items-center justify-center gap-2 group"
      style={{
        width: '188px',
        height: '132px',
        borderRadius: '20px',
        background: 'rgba(0, 0, 0, 0.36)',
        backdropFilter: 'blur(44px)',
        WebkitBackdropFilter: 'blur(44px)'
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={provider.label}
          className="group-hover:scale-110 transition-all"
          style={{ width: '160px', height: '39px', objectFit: 'contain' }}
        />
      ) : (
        <div
          className="group-hover:scale-110 transition-all flex items-center justify-center"
          style={{ width: '160px', height: '39px' }}
        >
          <FiMonitor className="text-4xl text-indigo-400 group-hover:text-amber-400 transition-colors" />
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
      className={`cursor-pointer transition-all flex flex-col group ${isExpired ? 'opacity-50' : 'hover:scale-[1.02]'
        }`}
      style={{
        height: '291px',
        borderRadius: '20px',
        gap: '16px',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.36)',
        backdropFilter: 'blur(44px)',
        WebkitBackdropFilter: 'blur(44px)',
        width: '100%'
      }}
    >
      {/* Cover area */}
      <div
        className="w-full relative flex-shrink-0 overflow-hidden"
        style={{ height: '135px', borderRadius: '10px' }}
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
      <div
        className="flex flex-col w-full"
        style={{ height: '108px', gap: '16px' }}
      >
        <div
          className="flex flex-col w-full"
          style={{ height: '66px', gap: '6px' }}
        >
          <p
            className="line-clamp-1 truncate"
            title={offer.title}
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 600,
              fontSize: '26px',
              lineHeight: '120%',
              color: 'rgba(255, 255, 255, 1)',
              margin: 0,
              display: 'flex'
            }}
          >
            {offer.title}
          </p>
          <p
            className="line-clamp-2"
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 500,
              fontSize: '16px',
              lineHeight: '130%',
              color: 'rgba(136, 136, 136, 1)',
              margin: 0,
              height: '42px'
            }}
          >
            {offer.description || 'Complete this offer to earn rewards.'}
          </p>
        </div>
        <div
          className="flex items-center mt-auto"
          style={{ height: '26px', gap: '3px' }}
        >
          <img
            src="/coins/coinfinal.png"
            alt="Coin"
            style={{
              width: '26px',
              height: '26px',
              objectFit: 'contain',
              filter: 'drop-shadow(0px 0px 14px rgba(254, 198, 53, 0.6))'
            }}
          />
          <span
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              fontSize: '22px',
              lineHeight: '130%',
              background: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            +<CoinDisplay amount={offer.rewardAmount} />
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
        style={{
          width: '500px',
          minHeight: '526px',
          height: 'auto',
          maxHeight: '90vh',
          background: 'rgba(36, 36, 36, 1)',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Close Button - Moved out of the image container to sit at top right of modal */}
        {!showProofForm && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '26px', left: '438px',
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.11)',
              border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 10
            }}
          >
            <FiX size={16} />
          </button>
        )}

        {/* Header Section */}
        {!showProofForm ? (
          <>
            {/* Modal Header / Image */}
            <div style={{
              width: '468px', height: '159px', borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', flexShrink: 0, overflow: 'hidden'
            }}>
              {(() => {
                const coverImgSrc = offer.coverImage || (isIconUrl(offer.icon) ? offer.icon : null);
                const emojiIcon = !coverImgSrc && offer.icon ? offer.icon : '🏆';
                if (coverImgSrc) {
                  return <img src={coverImgSrc} alt={offer.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />;
                }
                return <span style={{ fontSize: '48px', filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.5))' }}>{emojiIcon}</span>;
              })()}
            </div>

            {/* Title, Description, and Coin Pill */}
            <div style={{ width: '468px', minHeight: '108px', height: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0, opacity: 1 }}>
              {/* Heading and Description Wrapper */}
              <div style={{ width: '468px', height: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', opacity: 1 }}>
                <h2 style={{
                  width: '100%', height: 'auto', opacity: 1,
                  fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontStyle: 'normal', fontSize: '26px',
                  color: 'rgba(255, 255, 255, 1)', margin: 0, lineHeight: '1.2'
                }}>
                  {offer.title}
                </h2>
                <div style={{
                  width: '468px', height: 'auto', opacity: 1,
                  fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontStyle: 'normal', fontSize: '16px',
                  color: 'rgba(136, 136, 136, 1)', lineHeight: '1.3'
                }}>
                  {offer.description.split('\n').map((line, i) => <p key={i} style={{ margin: 0, padding: 0 }}>{line}</p>)}
                </div>
              </div>
              <div style={{
                width: 'auto', height: '26px', opacity: 1,
                display: 'flex', alignItems: 'center', gap: '3px',
                alignSelf: 'flex-start'
              }}>
                <img src="/coins/coinfinal.png" alt="coin" style={{
                  width: '26px', height: '26px', opacity: 1,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0px 0px 14px rgba(254, 198, 53, 0.6))'
                }} />
                <span style={{
                  width: 'auto', minWidth: '40px', height: 'auto', opacity: 1,
                  fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontStyle: 'normal', fontSize: '22px',
                  lineHeight: '1.3',
                  background: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'transparent',
                  display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap'
                }}>
                  +{(offer.rewardAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ width: '468px', height: '66px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, opacity: 1 }}>
            {/* Small Image */}
            <div style={{ width: '99px', height: '66px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: 'rgba(255, 255, 255, 0.05)' }}>
              {(() => {
                const coverImgSrc = offer.coverImage || (isIconUrl(offer.icon) ? offer.icon : null);
                const emojiIcon = !coverImgSrc && offer.icon ? offer.icon : '🏆';
                if (coverImgSrc) {
                  return <img src={coverImgSrc} alt={offer.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                }
                return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{emojiIcon}</div>;
              })()}
            </div>
            {/* Title and Description */}
            <div style={{ width: '333px', height: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', opacity: 1 }}>
              <h2 style={{
                width: '333px', height: 'auto', opacity: 1,
                fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontStyle: 'normal', fontSize: '28px',
                color: 'rgba(255, 255, 255, 1)', margin: 0, lineHeight: '1',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {offer.title}
              </h2>
              <div style={{
                width: '333px', height: '17px', opacity: 1,
                fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontStyle: 'normal', fontSize: '13px',
                color: 'rgba(136, 136, 136, 1)', lineHeight: '1.3'
              }}>
                <p style={{ margin: 0, padding: 0 }}>Follow the steps below to submit your proof of completion for review.</p>
              </div>
            </div>
            {/* Inline Close Button for Proof Form */}
            <button
              onClick={onClose}
              style={{
                width: '24px', height: '66px', gap: '10px',
                background: 'transparent', opacity: 1,
                border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, padding: 0
              }}
            >
              <FiX size={20} />
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
                    <span style={{ padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      {submissionStatus === 'approved' ? '✓ Approved' : 'Submitted'}
                    </span>
                  )}
                  {isRejected && !alreadySubmitted && (
                    <div style={{ width: '100%', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '12px', borderRadius: '12px', color: '#fb7185', fontSize: '13px' }}>
                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><FiInbox /> Submission Rejected</div>
                      {offer.adminNote && <div style={{ fontStyle: 'italic', opacity: 0.8 }}>Admin Note: "{offer.adminNote}"</div>}
                    </div>
                  )}
                </div>
              )}

              {/* Requirements Section ALWAYS VISIBLE AND STICKY */}
              {!isStarted && offer.requirements && offer.requirements.length > 0 && (
                <div style={{ 
                  width: '468px', display: 'flex', flexDirection: 'column', gap: '8px', opacity: 1, flexShrink: 0,
                  position: 'sticky', top: '-1px', zIndex: 20, background: 'rgba(36, 36, 36, 1)', paddingBottom: '8px'
                }}>
                    <h4 style={{ 
                      fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontStyle: 'normal', fontSize: '16px', 
                      color: 'rgba(255, 255, 255, 1)', margin: 0, lineHeight: '1.2' 
                    }}>
                      Requirements
                    </h4>
                    <div style={{ 
                      width: '468px', boxSizing: 'border-box', height: 'auto', flexShrink: 0,
                      borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', 
                      background: 'rgba(0, 0, 0, 0.36)', backdropFilter: 'blur(44px)', WebkitBackdropFilter: 'blur(44px)',
                      opacity: 1 
                    }}>
                      {offer.requirements.map((req, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <img 
                            src="/coins/retik.png" 
                            alt="bullet" 
                            style={{ width: '14px', height: '14px', flexShrink: 0, marginTop: '2px' }} 
                          />
                          <p style={{ 
                            fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontSize: '16px', 
                            lineHeight: '120%', color: 'rgba(255, 255, 255, 1)', margin: 0 
                          }}>
                            {req}
                          </p>
                        </div>
                      ))}
                    </div>
                </div>
              )}

              {/* Boxes when started */}
              {isStarted && !alreadySubmitted && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '468px', height: '155px', flexShrink: 0 }}>
                  <div style={{
                    width: '468px', height: '62px', borderRadius: '12px', padding: '12px', gap: '16px',
                    background: 'rgba(0, 0, 0, 0.36)', backdropFilter: 'blur(44px)',
                    display: 'flex', alignItems: 'center', boxSizing: 'border-box'
                  }}>
                    <div style={{ width: '214px', height: '37px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ 
                        width: '214px', height: '17px', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, 
                        fontSize: '14px', lineHeight: '120%', color: 'var(--S3, rgba(255, 255, 255, 1))', display: 'block'
                      }}>
                        Offer link clicked
                      </span>
                      <span style={{ 
                        width: '214px', height: '14px', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, 
                        fontSize: '11px', lineHeight: '130%', color: 'var(--Text-text-sheen, rgba(136, 136, 136, 1))', display: 'block'
                      }}>
                        Complete the offer requirements
                      </span>
                    </div>
                    <button
                      onClick={handleStartOffer}
                      style={{
                        width: '214px', height: '38px', borderRadius: '10px', padding: '10px 30px', gap: '10px',
                        background: 'rgba(39, 112, 58, 1)', border: 'none', cursor: 'pointer',
                        boxShadow: '0px 4px 0px 0px rgba(35, 80, 47, 1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box'
                      }}
                    >
                      <span style={{
                        width: '79px', height: '11px', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700,
                        fontSize: '16px', lineHeight: '32px', color: 'rgba(255, 255, 255, 1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        Resume Offer
                      </span>
                    </button>
                  </div>

                  {/* Submit Proof Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '468px', height: '41px', flexShrink: 0 }}>
                    <span style={{ 
                      width: '468px', height: '19px', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, 
                      fontSize: '14px', lineHeight: '120%', color: 'rgba(255, 255, 255, 1)', display: 'block'
                    }}>
                      Submit Proof
                    </span>
                    <span style={{ 
                      width: '468px', height: '14px', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, 
                      fontSize: '11px', lineHeight: '130%', color: 'rgba(136, 136, 136, 1)', display: 'block'
                    }}>
                      Follow the requirements above, then submit proof of completion for review.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {result && (
            <div style={{ padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 500, background: result.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', border: `1px solid ${result.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`, color: result.type === 'success' ? '#34d399' : '#fb7185' }}>
              {result.type === 'success' && <FiCheckCircle style={{ display: 'inline', marginRight: '4px' }} />}
              {result.message}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: 'auto', flexShrink: 0 }}>
          {alreadySubmitted ? (
            <div style={{ width: '100%', textAlign: 'center', padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600, fontSize: '14px' }}>
              <FiCheckCircle style={{ display: 'inline', marginRight: '6px' }} />
              {submissionStatus === 'approved' ? 'Offer Approved! Reward granted.' : 'Proof Submitted — Awaiting Review'}
            </div>
          ) : (
            !isExpired && (
              <>
                {!isStarted ? (
                  <button
                    onClick={handleStartOffer}
                    style={{
                      width: '100%', height: '48px', borderRadius: '10px',
                      padding: '10px 30px',
                      background: 'rgba(73, 178, 101, 1)', color: 'rgba(255, 255, 255, 1)', border: 'none',
                      fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer',
                      boxShadow: '0px 4px 0px 0px rgba(39, 109, 58, 1)'
                    }}
                  >
                    Start Offer
                    <img src="/coins/image.png" alt="arrow" style={{ width: '24px', height: '24px' }} />
                  </button>
                ) : (
                  !showProofForm && (
                    <button
                      onClick={() => { setShowProofForm(true); setResult(null); }}
                      style={{
                        width: '100%', height: '48px', borderRadius: '10px',
                        padding: '10px 30px',
                        background: 'rgba(73, 178, 101, 1)', color: 'rgba(255, 255, 255, 1)', border: 'none',
                        fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer',
                        boxShadow: '0px 4px 0px 0px rgba(39, 109, 58, 1)'
                      }}
                    >
                      <img src="/coins/upload.png" alt="upload" style={{ width: '24px', height: '24px' }} />
                      Submit Proof
                    </button>
                  )
                )}
              </>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

