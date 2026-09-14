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

export const getProviderLogo = (id) => {
  const lowerId = id?.toLowerCase()?.trim();

  const localLogos = {
    goodpicks: '/coins/image copy 6.png',
    goodpick: '/coins/image copy 6.png',
    'good-picks': '/coins/image copy 6.png',
    'good picks': '/coins/image copy 6.png',
    gp: '/coins/image copy 6.png',
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
      className="cursor-pointer flex flex-col items-center justify-center shrink-0 w-full md:w-[323px]"
      style={{
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
      className={`cursor-pointer flex flex-col shrink-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 ${isExpired ? 'opacity-50' : ''
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
            width: 'fit-content',
            height: '19.67px',
            borderRadius: '10px',
            paddingTop: '4px',
            paddingRight: '8px',
            paddingBottom: '4px',
            paddingLeft: '6px',
            gap: '4px',
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
            {rewardVal.toLocaleString('de-DE')}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export const FeaturedOfferModal = ({ offer, token, onClose, onSubmitted }) => {
  const [loading, setLoading] = useState(false);
  const isExpired = offer.expirationDate && new Date(offer.expirationDate) < new Date();
  const rewardVal = offer.rewardAmount ?? offer.points ?? offer.reward ?? 0;
  const coverImgSrc = offer.coverImage || (isIconUrl(offer.icon) ? offer.icon : null);
  const emojiIcon = !coverImgSrc && offer.icon ? offer.icon : '🎮';

  const handleStartOffer = async () => {
    if (isExpired) return;
    setLoading(true);
    try {
      if (token) {
        await fetch(`${API}/custom-offers/${offer._id}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
      if (offer.externalLink) {
        window.open(offer.externalLink, '_blank', 'noopener,noreferrer');
      }
      if (onSubmitted) onSubmitted();
    } catch (err) {
      console.error('Failed to start offer', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '626px',
          maxWidth: '96vw',
          height: '687px',
          maxHeight: '94vh',
          background: '#FFFFFF',
          borderRadius: '25px',
          padding: '8px',
          boxSizing: 'border-box',
          fontFamily: '"Poppins", sans-serif',
          color: '#0E0F0C',
          opacity: 1,
          transform: 'rotate(0deg)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px',
        }}
        className="relative shadow-2xl overflow-y-auto hide-scrollbar"
      >
        {/* Top Header Card */}
        <div
          style={{
            width: '100%',
            maxWidth: '610px',
            height: '197px',
            background: 'rgba(248, 245, 239, 1)',
            borderRadius: '16px',
            padding: '16px 20px',
            boxSizing: 'border-box',
            position: 'relative',
            opacity: 1,
            transform: 'rotate(0deg)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          className="shrink-0"
        >
          {/* Top Close Button */}
          <button
            onClick={onClose}
            style={{
              width: '24px',
              height: '24px',
              background: '#000000',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              position: 'absolute',
              top: '14px',
              right: '14px',
              zIndex: 20,
            }}
            className="text-white hover:opacity-80 transition-opacity"
          >
            <FiX size={13} strokeWidth={2.5} />
          </button>

          {/* Top Section: Icon + Title + Description */}
          <div className="flex items-center gap-4 pr-8">
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '11px',
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
              className="bg-[#EDE8DE] overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm"
            >
              {coverImgSrc ? (
                <img src={coverImgSrc} alt={offer.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">{emojiIcon}</span>
              )}
            </div>
            <div
              style={{
                width: '345px',
                maxWidth: '100%',
                opacity: 1,
                transform: 'rotate(0deg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '8px',
              }}
              className="min-w-0"
            >
              <h2
                style={{
                  width: '345px',
                  maxWidth: '100%',
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: '20px',
                  lineHeight: '27px',
                  letterSpacing: '0%',
                  color: '#000000',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {offer.title}
              </h2>
              <p
                style={{
                  width: '345px',
                  maxWidth: '100%',
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '20px',
                  letterSpacing: '0%',
                  color: '#000000',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {offer.description || 'Complete this offer by sending it to your Android device from here'}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              width: '100%',
              maxWidth: '575px',
              height: '0px',
              opacity: 0.1,
              borderTop: '1px solid rgba(0, 0, 0, 1)',
              transform: 'rotate(0deg)',
            }}
          />

          {/* Platform & Reward Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {offer.platforms?.ios && (
                <FaApple
                  style={{
                    width: '21px',
                    height: '21px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    color: '#000000',
                  }}
                />
              )}
              {offer.platforms?.android && (
                <FaAndroid
                  style={{
                    width: '21px',
                    height: '21px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    color: '#22C55E',
                  }}
                />
              )}
              {(!offer.platforms || offer.platforms?.desktop) && (
                <FaDesktop
                  style={{
                    width: '21px',
                    height: '21px',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    color: '#334155',
                  }}
                />
              )}
            </div>

            {/* Reward Amount */}
            <div
              style={{
                minWidth: 'fit-content',
                height: '22.22px',
                borderRadius: '100px',
                gap: '5px',
                paddingTop: '5px',
                paddingRight: '10px',
                paddingBottom: '5px',
                paddingLeft: '10px',
                background: '#FFFFFF',
                opacity: 1,
                transform: 'rotate(0deg)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <img
                src="/coins/procoinicon.png"
                alt="Coin"
                style={{
                  width: '13px',
                  height: '13px',
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '1',
                  letterSpacing: '0%',
                  color: 'rgba(231, 171, 24, 1)',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                  whiteSpace: 'nowrap',
                }}
              >
                {rewardVal.toLocaleString('de-DE')}
              </span>
            </div>
          </div>
        </div>

        {/* Requirements Section */}
        <div className="w-full flex flex-col gap-2 shrink-0">
          <h3
            style={{
              width: '100%',
              maxWidth: '610px',
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              lineHeight: '27px',
              letterSpacing: '0%',
              color: '#000000',
              opacity: 1,
              transform: 'rotate(0deg)',
              margin: 0,
            }}
          >
            Requirements
          </h3>

          {/* Requirements Content */}
          <div className="w-full flex flex-col gap-[5px]">
            {offer.requirementType === 'paragraph' ? (
              <div
                style={{
                  width: '100%',
                  maxWidth: '610px',
                  minHeight: '43px',
                  background: 'rgba(248, 245, 239, 1)',
                  borderRadius: '16px',
                  paddingTop: '8px',
                  paddingRight: '12px',
                  paddingBottom: '8px',
                  paddingLeft: '12px',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
              >
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '0%',
                    color: '#000000',
                    margin: 0,
                  }}
                >
                  {Array.isArray(offer.requirements) && offer.requirements.length > 0
                    ? offer.requirements.join(' ')
                    : typeof offer.requirements === 'string'
                    ? offer.requirements
                    : 'Complete the requirements to earn rewards.'}
                </p>
              </div>
            ) : offer.requirements && offer.requirements.length > 0 ? (
              offer.requirements.map((req, i) => {
                const isCompleted = i === 0;
                return (
                  <div
                    key={i}
                    style={{
                      width: '100%',
                      maxWidth: '610px',
                      minHeight: '43px',
                      background: 'rgba(248, 245, 239, 1)',
                      borderRadius: '16px',
                      paddingTop: '8px',
                      paddingRight: '12px',
                      paddingBottom: '8px',
                      paddingLeft: '12px',
                      opacity: 1,
                      transform: 'rotate(0deg)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {isCompleted ? (
                      <div
                        style={{
                          width: '27px',
                          height: '27px',
                          borderRadius: '100px',
                          background: 'rgba(36, 50, 77, 1)',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxSizing: 'border-box',
                        }}
                      >
                        <img
                          src="/coins/image copy 5.png"
                          alt="Checked"
                          style={{
                            width: '12px',
                            height: '10px',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '27px',
                          height: '27px',
                          borderRadius: '100px',
                          background: '#FFFFFF',
                          border: '1px solid rgba(0, 0, 0, 0.2)',
                          opacity: 1,
                          transform: 'rotate(0deg)',
                          flexShrink: 0,
                          boxSizing: 'border-box',
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '0%',
                        color: '#000000',
                      }}
                    >
                      {req}
                    </span>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  width: '100%',
                  maxWidth: '610px',
                  minHeight: '43px',
                  background: 'rgba(248, 245, 239, 1)',
                  borderRadius: '16px',
                  paddingTop: '8px',
                  paddingRight: '12px',
                  paddingBottom: '8px',
                  paddingLeft: '12px',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    width: '27px',
                    height: '27px',
                    borderRadius: '100px',
                    background: 'rgba(36, 50, 77, 1)',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <img
                    src="/coins/image copy 5.png"
                    alt="Checked"
                    style={{
                      width: '12px',
                      height: '10px',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '0%',
                    color: '#000000',
                  }}
                >
                  Complete the required tasks → receive rewards
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Start Offer Button */}
        <button
          onClick={handleStartOffer}
          disabled={loading || isExpired}
          style={{
            width: '100%',
            maxWidth: '610px',
            height: '46px',
            background: 'rgba(36, 50, 77, 1)',
            borderRadius: '40px',
            gap: '10px',
            paddingTop: '18px',
            paddingRight: '12px',
            paddingBottom: '18px',
            paddingLeft: '12px',
            opacity: 1,
            transform: 'rotate(0deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
          className="shadow-md hover:opacity-95 transition-all disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <FiLoader className="animate-spin text-lg text-white" />
          ) : (
            <span
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '1',
                letterSpacing: '-0.02em',
                textTransform: 'capitalize',
                color: '#FFFFFF',
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
            >
              {isExpired ? 'Offer Expired' : 'Start Offer'}
            </span>
          )}
        </button>

        {/* General Offer Rules Box */}
        <div
          style={{
            width: '100%',
            maxWidth: '610px',
            minHeight: '208px',
            background: 'rgba(248, 245, 239, 1)',
            borderRadius: '16px',
            gap: '10px',
            paddingTop: '25px',
            paddingRight: '10px',
            paddingBottom: '25px',
            paddingLeft: '15px',
            opacity: 1,
            transform: 'rotate(0deg)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
          className="shrink-0"
        >
          <h4
            style={{
              width: '100%',
              maxWidth: '585px',
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontWeight: 700,
              fontSize: '16px',
              lineHeight: '27px',
              letterSpacing: '0%',
              color: '#000000',
              opacity: 1,
              transform: 'rotate(0deg)',
              margin: 0,
            }}
          >
            General Offer Rules
          </h4>
          <div className="flex flex-col gap-0.5">
            {[
              'Use a genuine device. Emulators are not allowed.',
              'VPNs and proxies are not allowed. Your real location must be used.',
              'Complete the offer yourself and follow the stated requirements.',
              'Offers may be limited to new users/customers where specified. Existing users may not be eligible.',
              'Follow the individual offer requirements and any stated completion deadline.',
              'Rewards are only granted when the offer requirements are successfully verified.',
            ].map((rule, idx) => (
              <div key={idx} className="flex items-start gap-[6px]">
                <div
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: 'rgba(63, 76, 99, 1)',
                    opacity: 1,
                    transform: 'rotate(0deg)',
                    flexShrink: 0,
                    marginTop: '8px',
                  }}
                />
                <span
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '12px',
                    lineHeight: '21px',
                    letterSpacing: '0.01em',
                    color: '#000000',
                  }}
                >
                  {rule}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

