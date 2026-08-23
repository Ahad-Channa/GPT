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
  const lowerId = id?.toLowerCase()?.trim();

  const localLogos = {
    goodpicks: '/coins/GP.png',
    goodpick: '/coins/GP.png',
    'good-picks': '/coins/GP.png',
    'good picks': '/coins/GP.png',
    gp: '/coins/GP.png',
    lootably: '/coins/LP.png',
    lp: '/coins/LP.png',
    primeearn: '/coins/PS.png',
    'prime-earn': '/coins/PS.png',
    'prime surveys': '/coins/PS.png',
    primesurveys: '/coins/PS.png',
    ps: '/coins/PS.png',
    torox: '/coins/torox.png',
    revu: '/coins/revu.png',
    adtowall: '/coins/aw.png',
    aw: '/coins/aw.png',
    cpx: '/coins/CPR.png',
    'cpx-research': '/coins/CPR.png',
    'cpx research': '/coins/CPR.png',
    cpr: '/coins/CPR.png',
    adgem: '/coins/AD.png',
    ad: '/coins/AD.png',
    ayet: '/coins/AYE copy.png',
    'ayet-studios': '/coins/AYE copy.png',
    'ayet studios': '/coins/AYE copy.png',
    aye: '/coins/AYE copy.png',
    adscend: '/coins/admedia.png',
    adscendmedia: '/coins/admedia.png',
    'adscend media': '/coins/admedia.png',
    admedia: '/coins/admedia.png',
    timewall: '/coins/wall.png',
    notik: '/coins/me.png',
    mmwall: '/coins/mmwakk.png',
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
      className="cursor-pointer flex flex-col items-center justify-center shrink-0"
      style={{
        width: '323px',
        maxWidth: '100%',
        height: '76px',
        borderRadius: '24px',
        background: 'rgba(249, 247, 241, 1)',
        border: '1px solid rgba(223, 225, 209, 1)',
        gap: '10px',
        opacity: 1,
        transform: 'rotate(0deg)',
        boxSizing: 'border-box',
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={provider.label}
          className="w-auto max-w-[170px] h-[36px] object-contain select-none"
        />
      ) : (
        <div
          className="flex items-center justify-center w-[160px] h-[38px]"
        >
          <FiMonitor className="text-3xl text-indigo-400" />
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
  const coverImgSrc = offer.coverImage || (isIconUrl(offer.icon) ? offer.icon : null);
  const emojiIcon = !coverImgSrc && offer.icon ? offer.icon : null;
  const rewardVal = offer.rewardAmount ?? offer.points ?? offer.reward ?? 1250000;

  return (
    <motion.div
      variants={item}
      onClick={onClick}
      className={`cursor-pointer flex flex-col shrink-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 ${
        isExpired ? 'opacity-50' : ''
      }`}
      style={{
        width: '181.14px',
        height: '246.53px',
        borderRadius: '20px',
        paddingTop: '8px',
        paddingBottom: '15px',
        paddingLeft: '7.14px',
        paddingRight: '7.14px',
        gap: '15px',
        background: 'rgba(255, 255, 255, 1)',
        boxSizing: 'border-box',
      }}
    >
      {/* Cover area */}
      <div
        className="relative flex-shrink-0 overflow-hidden rounded-[16px] bg-[#F3F4F6]"
        style={{
          width: '166.86px',
          height: '166.86px',
        }}
      >
        {coverImgSrc ? (
          <img
            src={coverImgSrc}
            alt={offer.title}
            draggable="false"
            className="w-full h-full object-cover pointer-events-none select-none"
          />
        ) : offer.gradient ? (
          <div className={`w-full h-full bg-gradient-to-br ${offer.gradient} flex items-center justify-center`}>
            {offer.iconType === 'percent' && (
              <div className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <span className="text-white font-black text-xl">%</span>
              </div>
            )}
            {offer.iconType === 'game' && (
              <div className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <span className="text-white text-2xl">🎮</span>
              </div>
            )}
            {offer.iconType === 'survey' && (
              <div className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <span className="text-white text-2xl">📋</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400/20 to-pink-500/20">
            {emojiIcon ? (
              <span className="text-3xl select-none">
                {emojiIcon}
              </span>
            ) : (
              <FiStar className="text-3xl text-amber-500" />
            )}
          </div>
        )}

        {/* Top Center Platform Pill — only show selected platforms */}
        {(offer.platforms ? (offer.platforms.desktop || offer.platforms.android || offer.platforms.ios) : true) && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center z-10"
            style={{
              width: '95.7px',
              height: '22.82px',
              paddingTop: '4px',
              paddingRight: '16px',
              paddingBottom: '4px',
              paddingLeft: '16px',
              gap: '8px',
              borderBottomRightRadius: '16px',
              borderBottomLeftRadius: '16px',
              background: 'rgba(255, 255, 255, 1)',
              boxSizing: 'border-box',
              opacity: 1,
            }}
          >
            {(!offer.platforms || offer.platforms.desktop) && (
              <img
                src="/coins/desko.png"
                alt="Desktop"
                style={{ width: '12px', height: '12px', opacity: 1, objectFit: 'contain', flexShrink: 0 }}
              />
            )}
            {(!offer.platforms || offer.platforms.android) && (
              <svg style={{ width: '12px', height: '12px', opacity: 1, flexShrink: 0 }} className="text-[#22C55E]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8533 8.081 12 8.081s-3.5902.33-5.1367.8697L4.841 5.4477a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
              </svg>
            )}
            {(!offer.platforms || offer.platforms.ios) && (
              <svg style={{ width: '12px', height: '12px', opacity: 1, flexShrink: 0 }} className="text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1.01.08 2.03-.49 2.65-1.24z" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col w-full text-left justify-between min-h-0">
        <p
          className="truncate text-[#0E0F0C]"
          title={offer.title}
          style={{
            fontFamily: '"Bricolage Grotesque", sans-serif',
            fontWeight: 700,
            fontSize: '14px',
            lineHeight: '18px',
            letterSpacing: '-0.02em',
          }}
        >
          {offer.title}
        </p>
        <div
          className="flex items-center"
          style={{
            minWidth: '81px',
            width: 'fit-content',
            height: '19.67px',
            borderRadius: '10px',
            paddingTop: '4px',
            paddingRight: '6px',
            paddingBottom: '4px',
            paddingLeft: '6px',
            gap: '2px',
            background: 'rgba(249, 247, 241, 1)',
            boxSizing: 'border-box',
          }}
        >
          <img
            src="/coins/procoinicon.png"
            alt="coin"
            style={{
              width: '9px',
              height: '10px',
              opacity: 1,
              flexShrink: 0,
              objectFit: 'contain',
            }}
          />
          <span
            style={{
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 700,
              fontSize: '12px',
              lineHeight: '1',
              letterSpacing: '0%',
              color: 'rgba(231, 171, 24, 1)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {rewardVal.toLocaleString()}
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
            className="absolute top-[12px] right-[12px] lg:top-[16px] lg:right-[16px] w-[26px] h-[26px] lg:w-[36px] lg:h-[36px] rounded-[8px] lg:rounded-[10px] bg-white/10 text-white flex items-center justify-center cursor-pointer z-10 border-none"
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
                  className="w-full h-auto text-[12px] lg:text-[16px] break-words text-justify"
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
                className="w-full text-[12px] lg:text-[14px] text-[#888888] leading-tight break-words"
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
        <div className="hide-scrollbar" style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>

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
              <div className="w-full flex flex-col gap-2 shrink-0 opacity-100">
                <div className="flex justify-between items-center w-full lg:sticky lg:top-[-1px] lg:z-20 lg:bg-[#242424] lg:pb-2 lg:pt-1">
                  {offer.requirements && offer.requirements.length > 0 ? (
                    <h4
                      className="text-[14px] lg:text-[16px] text-white font-bold leading-normal"
                      style={{ fontFamily: '"Barlow Condensed", sans-serif', margin: 0 }}
                    >
                      Requirements
                    </h4>
                  ) : (
                    <div></div>
                  )}
                  <div className="flex items-center gap-[3px] h-[20px] lg:h-[26px]">
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
                      {(offer.rewardAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                {offer.requirements && offer.requirements.length > 0 && (

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
                )}
              </div>

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
              className={`w-full text-center p-3 rounded-xl text-[18px] lg:text-[16px] font-medium border ${(result?.type === 'success' || alreadySubmitted)
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

