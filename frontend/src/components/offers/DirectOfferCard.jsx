import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiExternalLink, FiCheckCircle, FiClock, FiLoader, FiXCircle, FiZap } from 'react-icons/fi';
import { FaApple, FaAndroid, FaDesktop } from 'react-icons/fa';
import CoinDisplay from '../CoinDisplay';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

// Helper: is the value a URL/image path or an emoji?
const isIconUrl = (icon) =>
  icon && (icon.startsWith('http') || icon.startsWith('data:') || icon.includes('/') || icon.startsWith('fa-'));

// Status badge config
const STATUS_CONFIG = {
  clicked: { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/10  border-amber-500/20' },
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10  border-amber-500/20' },
  approved: { label: 'Approved ✓', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  rejected: { label: 'Rejected', color: 'text-rose-400', bg: 'bg-rose-500/10   border-rose-500/20' },
};

// ─── Small Card shown in the grid ────────────────────────────────────────────
export const DirectOfferCard = ({ offer, onClick }) => {
  const isExpired = offer.expirationDate && new Date(offer.expirationDate) < new Date();
  const coverImgSrc = offer.coverImage || (isIconUrl(offer.icon) ? offer.icon : null);
  const emojiIcon = !coverImgSrc && offer.icon ? offer.icon : null;
  const statusCfg = offer.clickStatus ? STATUS_CONFIG[offer.clickStatus] : null;
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
            {emojiIcon ? (
              <span className="text-3xl select-none">
                {emojiIcon}
              </span>
            ) : (
              <FiZap className="text-3xl text-indigo-500" />
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

      {/* Text info */}
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

        {/* Status OR reward */}
        {statusCfg ? (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border mt-1 w-fit ${statusCfg.color} ${statusCfg.bg}`}
            style={{ fontFamily: '"Poppins", sans-serif' }}>
            {statusCfg.label}
          </span>
        ) : (
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
              alt="Coin"
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
        )}
      </div>
    </motion.div>
  );
};

// ─── Modal shown when user clicks a card ─────────────────────────────────────
export const DirectOfferModal = ({ offer, token, onClose, onClicked }) => {
  const [loading, setLoading] = useState(false);
  const [clickStatus, setClickStatus] = useState(offer.clickStatus);
  const [result, setResult] = useState(null);

  const isExpired = offer.expirationDate && new Date(offer.expirationDate) < new Date();
  const isApproved = clickStatus === 'approved';
  const statusCfg = clickStatus ? STATUS_CONFIG[clickStatus] : null;

  const coverImgSrc = offer.coverImage || (isIconUrl(offer.icon) ? offer.icon : null);
  const emojiIcon = !coverImgSrc && offer.icon ? offer.icon : '⚡';

  const handleGoToOffer = async () => {
    if (isApproved || isExpired) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/direct-offers/click/${offer._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success && data.url) {
        // Open the tracked URL in a new tab
        window.open(data.url, '_blank', 'noopener,noreferrer');
        if (!data.alreadyApproved) {
          setClickStatus('clicked');
          if (onClicked) onClicked(offer._id);
        }
      } else {
        setResult({ type: 'error', message: data.error || 'Failed to start offer.' });
      }
    } catch (err) {
      console.error('Failed to process click:', err);
      setResult({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
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
        className="relative flex flex-col gap-3 lg:gap-4 p-3 lg:p-4 rounded-[20px] bg-[#242424] w-[95%] lg:w-[500px] max-h-[85vh] lg:max-h-[90vh] box-border overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-[12px] right-[12px] lg:top-[16px] lg:right-[16px] w-[26px] h-[26px] lg:w-[36px] lg:h-[36px] rounded-[8px] lg:rounded-[10px] bg-white/10 text-white flex items-center justify-center cursor-pointer z-10 border-none"
        >
          <FiX className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" />
        </button>

        {/* Header */}
        <div className="flex flex-row gap-3 lg:gap-4 shrink-0">
          <div className="w-[80px] h-[80px] lg:w-[120px] lg:h-[120px] rounded-[8px] lg:rounded-[10px] bg-white/5 flex items-center justify-center relative shrink-0 overflow-hidden">
            {coverImgSrc ? (
              <img src={coverImgSrc} alt={offer.title} className="w-full h-full object-cover rounded-[10px]" />
            ) : (
              <span className="text-[36px] lg:text-[48px] select-none" style={{ filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.5))' }}>
                {emojiIcon}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-1 lg:gap-3 shrink opacity-100 min-w-0 pr-4 lg:pr-0">
            <h2
              className="w-full text-[18px] lg:text-[26px] break-words"
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, color: 'rgba(255,255,255,1)', margin: 0, lineHeight: '1.1' }}
            >
              {offer.title}
            </h2>
            <div
              className="w-full text-[12px] lg:text-[16px] break-words text-justify"
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, color: 'rgba(136,136,136,1)', lineHeight: '1.2' }}
            >
              {(offer.description || '').split('\n').map((line, i) => <p key={i} style={{ margin: 0, padding: 0 }}>{line}</p>)}
            </div>

            {/* AUTO tracking badge */}
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold px-2 py-0.5 rounded-md"
                style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                <FiZap className="text-[10px]" /> Auto-Tracked
              </span>
              <span className="text-slate-500 text-[11px]" style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                No proof needed
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="hide-scrollbar" style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>

          {/* Status Badge */}
          {statusCfg && (
            <div className={`w-full p-3 rounded-xl border flex items-center gap-2 text-sm font-semibold ${statusCfg.bg} ${statusCfg.color}`}
              style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
              {clickStatus === 'approved' && <FiCheckCircle />}
              {clickStatus === 'clicked' && <FiClock />}
              {clickStatus === 'pending' && <FiClock />}
              {clickStatus === 'rejected' && <FiXCircle />}
              {clickStatus === 'approved' ? 'Reward credited automatically!' :
                clickStatus === 'clicked' ? 'Offer started — complete the requirements below.' :
                  clickStatus === 'pending' ? 'Awaiting advertiser confirmation...' :
                    'Conversion not confirmed by advertiser.'}
            </div>
          )}

          {/* Reward Display */}
          <div
            className="w-full flex items-center justify-between"
            style={{ borderRadius: '12px', padding: '12px', background: 'rgba(0,0,0,0.36)', backdropFilter: 'blur(44px)' }}
          >
            <span className="text-white text-[14px] font-bold" style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>Your Reward</span>
            <div className="flex items-center gap-[4px]">
              <img src="/coins/Coin.png" alt="coin" className="w-[20px] h-[20px] object-contain" />
              <span
                className="text-[20px] inline-flex items-center"
                style={{
                  fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700,
                  background: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}
              >
                {(offer.rewardAmount || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Requirements */}
          {offer.requirements && offer.requirements.length > 0 && (
            <div className="w-full flex flex-col gap-2 shrink-0">
              <h4 className="text-[14px] lg:text-[16px] text-white font-bold leading-normal" style={{ fontFamily: '"Barlow Condensed", sans-serif', margin: 0 }}>
                Requirements
              </h4>
              <div
                style={{ borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.36)', backdropFilter: 'blur(44px)' }}
              >
                {offer.requirements.map((req, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <img src="/coins/retik.png" alt="bullet" style={{ width: '14px', height: '14px', flexShrink: 0, marginTop: '2px' }} />
                    <p className="text-[13px] lg:text-[16px] text-white font-medium leading-tight" style={{ fontFamily: '"Barlow Condensed", sans-serif', margin: 0 }}>
                      {req}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How tracking works info */}
          <div
            style={{ borderRadius: '12px', padding: '12px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}
          >
            <p className="text-[12px] text-indigo-300/70 leading-relaxed" style={{ fontFamily: '"Barlow Condensed", sans-serif', margin: 0 }}>
              💡 Your reward is credited <strong>automatically</strong> once the advertiser confirms your completion. No manual proof needed.
            </p>
          </div>

          {/* Error message */}
          {result && (
            <div className={`w-full text-center p-3 rounded-xl text-[14px] font-medium border ${result.type === 'error' ? 'bg-[#f43f5e1a] border-[#f43f5e33] text-[#fb7185]' : 'bg-white/5 border-white/10 text-white'
              }`} style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
              {result.message}
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div style={{ marginTop: 'auto', flexShrink: 0 }}>
          {isExpired ? (
            <div className="w-full h-[48px] rounded-[10px] bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 font-bold text-[16px]"
              style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
              Offer Expired
            </div>
          ) : isApproved ? (
            <div className="w-full h-[48px] rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-[18px] gap-2"
              style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
              <FiCheckCircle /> Reward Credited!
            </div>
          ) : (
            <button
              onClick={handleGoToOffer}
              disabled={loading}
              className="w-full h-[48px] rounded-[8px] lg:rounded-[10px] bg-[#49b265] text-white border-none font-bold text-[18px] leading-none flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_4px_0_#276d3a] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontFamily: '"Barlow Condensed", sans-serif', padding: '10px 30px' }}
            >
              {loading ? (
                <FiLoader className="animate-spin text-xl" />
              ) : (
                <>
                  {clickStatus === 'clicked' ? 'Resume Offer' : 'Go to Offer'}
                  <FiExternalLink />
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
