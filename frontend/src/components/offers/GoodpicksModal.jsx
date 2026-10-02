import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiChevronDown, FiExternalLink, FiLoader } from 'react-icons/fi';
import { FaAndroid, FaApple, FaDesktop } from 'react-icons/fa';
import { BsQrCode } from 'react-icons/bs';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Default mock offers matching the screenshot if DB is empty
const defaultGoodpicksOffers = [
  {
    _id: 'gp_1',
    title: 'Treehouse Fishing',
    description: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nullam posuere nulla at varius commodo.',
    rewardAmount: 7000000,
    externalLink: 'https://example.com/treehouse-fishing',
    icon: '/coins/Mask group.png',
    platforms: { android: true, ios: false, desktop: false },
    requirements: [
      'Register → receive 10 coins',
      'Deposit €50 → receive 50,000 coins',
      'Deposit €50 → receive 50,000 coins',
      'Generate €200 in revenue → receive 10,000 coins',
    ],
    requirementType: 'bullets',
  },
  {
    _id: 'gp_2',
    title: 'Treehouse Fishing',
    description: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nullam posuere nulla at varius commodo.',
    rewardAmount: 7000000,
    externalLink: 'https://example.com/treehouse-fishing',
    icon: '/coins/Mask group.png',
    platforms: { android: true, ios: false, desktop: false },
    requirements: [
      'Register → receive 10 coins',
      'Deposit €50 → receive 50,000 coins',
      'Generate €200 in revenue → receive 10,000 coins',
    ],
    requirementType: 'bullets',
  },
  {
    _id: 'gp_3',
    title: 'Treehouse Fishing',
    description: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nullam posuere nulla at varius commodo.',
    rewardAmount: 7000000,
    externalLink: 'https://example.com/treehouse-fishing',
    icon: '/coins/Mask group.png',
    platforms: { android: true, ios: false, desktop: false },
    requirements: [
      'Register → receive 10 coins',
      'Deposit €50 → receive 50,000 coins',
      'Generate €200 in revenue → receive 10,000 coins',
    ],
    requirementType: 'bullets',
  },
  {
    _id: 'gp_4',
    title: 'Treehouse Fishing',
    description: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nullam posuere nulla at varius commodo.',
    rewardAmount: 7000000,
    externalLink: 'https://example.com/treehouse-fishing',
    icon: '/coins/Mask group.png',
    platforms: { android: true, ios: false, desktop: false },
    requirements: [
      'Register → receive 10 coins',
      'Deposit €50 → receive 50,000 coins',
    ],
    requirementType: 'bullets',
  },
  {
    _id: 'gp_5',
    title: 'Treehouse Fishing',
    description: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nullam posuere nulla at varius commodo.',
    rewardAmount: 7000000,
    externalLink: 'https://example.com/treehouse-fishing',
    icon: '/coins/Mask group.png',
    platforms: { android: true, ios: false, desktop: false },
    requirements: [
      'Register → receive 10 coins',
      'Deposit €50 → receive 50,000 coins',
    ],
    requirementType: 'bullets',
  },
  {
    _id: 'gp_6',
    title: 'Treehouse Fishing',
    description: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nullam posuere nulla at varius commodo.',
    rewardAmount: 7000000,
    externalLink: 'https://example.com/treehouse-fishing',
    icon: '/coins/Mask group.png',
    platforms: { android: true, ios: false, desktop: false },
    requirements: [
      'Register → receive 10 coins',
      'Deposit €50 → receive 50,000 coins',
    ],
    requirementType: 'bullets',
  },
  {
    _id: 'gp_7',
    title: 'Treehouse Fishing',
    description: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nullam posuere nulla at varius commodo.',
    rewardAmount: 7000000,
    externalLink: 'https://example.com/treehouse-fishing',
    icon: '/coins/Mask group.png',
    platforms: { android: true, ios: false, desktop: false },
    requirements: [
      'Register → receive 10 coins',
    ],
    requirementType: 'bullets',
  },
  {
    _id: 'gp_8',
    title: 'Treehouse Fishing',
    description: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nullam posuere nulla at varius commodo.',
    rewardAmount: 7000000,
    externalLink: 'https://example.com/treehouse-fishing',
    icon: '/coins/Mask group.png',
    platforms: { android: true, ios: false, desktop: false },
    requirements: [
      'Register → receive 10 coins',
    ],
    requirementType: 'bullets',
  },
  {
    _id: 'gp_9',
    title: 'Treehouse Fishing',
    description: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nullam posuere nulla at varius commodo.',
    rewardAmount: 7000000,
    externalLink: 'https://example.com/treehouse-fishing',
    icon: '/coins/Mask group.png',
    platforms: { android: true, ios: false, desktop: false },
    requirements: [
      'Register → receive 10 coins',
    ],
    requirementType: 'bullets',
  },
];

// Mock clicked and completed Goodpicks offers for History view
const defaultGoodpicksHistory = [
  {
    _id: 'gp_hist_1',
    title: 'Treehouse Fishing',
    titleDe: 'Treehouse Fishing',
    description: 'In mollis, enim eu sollicitudin sodales, libero dolor condimentum sem.',
    descriptionDe: 'In mollis, enim eu sollicitudin sodales, libero dolor condimentum sem.',
    rewardAmount: 7000000,
    status: 'completed',
    externalLink: 'https://example.com/treehouse-fishing',
    icon: '/coins/Mask group.png',
    platforms: { android: true, ios: false, desktop: false },
    requirements: [
      'Register → receive 10 coins',
      'Deposit €50 → receive 50,000 coins',
      'Deposit €50 → receive 50,000 coins',
      'Generate €200 in revenue → receive 10,000 coins',
    ],
    requirementsDe: [
      'Registrieren → 10 Coins erhalten',
      '50 € einzahlen → 50.000 Coins erhalten',
      '50 € einzahlen → 50.000 Coins erhalten',
      '200 € Umsatz generieren → 10.000 Coins erhalten',
    ],
    requirementType: 'bullets',
  },
  {
    _id: 'gp_hist_2',
    title: 'Treehouse Fishing',
    titleDe: 'Treehouse Fishing',
    description: 'In mollis, enim eu sollicitudin sodales, libero dolor condimentum sem.',
    descriptionDe: 'In mollis, enim eu sollicitudin sodales, libero dolor condimentum sem.',
    rewardAmount: 7000000,
    status: 'clicked',
    externalLink: 'https://example.com/treehouse-fishing',
    icon: '/coins/Mask group.png',
    platforms: { android: true, ios: false, desktop: false },
    requirements: [
      'Register → receive 10 coins',
      'Deposit €50 → receive 50,000 coins',
      'Deposit €50 → receive 50,000 coins',
      'Generate €200 in revenue → receive 10,000 coins',
    ],
    requirementsDe: [
      'Registrieren → 10 Coins erhalten',
      '50 € einzahlen → 50.000 Coins erhalten',
      '50 € einzahlen → 50.000 Coins erhalten',
      '200 € Umsatz generieren → 10.000 Coins erhalten',
    ],
    requirementType: 'bullets',
  },
];

const isIconUrl = (icon) => icon && (icon.startsWith('http') || icon.startsWith('data:') || icon.includes('/') || icon.startsWith('fa-'));

const renderOfferCover = (offer) => {
  const imgSrc = offer?.coverImage || (isIconUrl(offer?.icon) ? offer?.icon : null);
  const emoji = !imgSrc && offer?.icon ? offer?.icon : null;

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={offer?.title || 'Offer'}
        className="w-full h-full object-cover select-none"
        onError={(e) => {
          e.currentTarget.src = '/coins/Mask group.png';
        }}
      />
    );
  }

  if (emoji) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-400/20 to-blue-500/20 text-3xl select-none">
        {emoji}
      </div>
    );
  }

  return (
    <img
      src="/coins/Mask group.png"
      alt={offer?.title || 'Offer'}
      className="w-full h-full object-cover select-none"
    />
  );
};

// ─── Goodpicks Offer Details Modal (Screenshot 2) ───────────────────────────
export const GoodpicksDetailModal = ({ offer, onClose, token }) => {
  const { t, i18n } = useTranslation();
  const isDe = i18n.language?.startsWith('de');
  const title = (isDe && offer.titleDe) ? offer.titleDe : offer.title;
  const description = (isDe && offer.descriptionDe) ? offer.descriptionDe : (offer.description || t('goodpicks.defaultDescription'));
  const requirementsList = (isDe && offer.requirementsDe && offer.requirementsDe.length > 0)
    ? offer.requirementsDe
    : offer.requirements;

  const [loading, setLoading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  if (!offer) return null;

  const rewardFormatted = (offer.rewardAmount || 0).toLocaleString('de-DE');

  const handleStartOffer = () => {
    if (offer.externalLink) {
      window.open(offer.externalLink, '_blank', 'noopener,noreferrer');
    }
  };

  const generalRules = [
    t('goodpicks.rule1'),
    t('goodpicks.rule2'),
    t('goodpicks.rule3'),
    t('goodpicks.rule4'),
    t('goodpicks.rule5'),
    t('goodpicks.rule6'),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-1.5 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '94vh',
          background: '#BEE3F2',
          borderRadius: '24px',
          boxSizing: 'border-box',
          color: '#000000',
          position: 'relative',
        }}
        className="shadow-2xl flex flex-col gap-2.5 sm:gap-3 p-1.5 sm:p-3.5 pb-2 sm:pb-4.5 overflow-y-auto hide-scrollbar"
      >
        {/* Top White Card: Icon + Title/Description + Reward + Platform */}
        <div
          style={{
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            boxSizing: 'border-box',
            position: 'relative',
          }}
          className="p-3 sm:p-4 flex flex-col gap-3 shrink-0"
        >
          {/* Top Actions: Support Button & Close Button */}
          <div className="absolute top-[12px] right-[12px] z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowSupportModal(true);
              }}
              style={{
                width: '24px',
                height: '24px',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              className="hover:opacity-80 transition-opacity"
              title="Support"
            >
              <img
                src="/coins/image copy 13.png"
                alt="Support"
                className="w-[24px] h-[24px] object-contain"
              />
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#000000',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                margin: 0,
                lineHeight: 0,
                flexShrink: 0,
              }}
              className="hover:opacity-80 transition-opacity"
              aria-label="Close"
            >
              <svg
                style={{ width: '12px', height: '12px', display: 'block' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Row 1: Image + Title (Elevated above bottom of image) */}
          <div className="flex items-center justify-between gap-3 sm:gap-4 w-full pr-14">
            {/* Left: Image + Title */}
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
              {/* 58x58 Image on mobile, 84x84 on desktop */}
              <div
                className="w-[58px] h-[58px] sm:w-[84px] sm:h-[84px] rounded-[10px] sm:rounded-[12px] overflow-hidden flex-shrink-0 bg-[#F1F5F9] flex items-center justify-center shadow-sm"
              >
                {renderOfferCover(offer)}
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0" style={{ transform: 'translateY(10px)' }}>
                <h3
                  style={{
                    fontFamily: '"Bricolage Grotesque", "Poppins", Georgia, serif',
                    letterSpacing: '0%',
                    color: '#0F172A',
                    margin: 0,
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                  className="w-full text-[15px] sm:text-[18px] leading-[20px] sm:leading-[24px] font-bold sm:font-semibold"
                >
                  {title}
                </h3>
              </div>
            </div>
          </div>

          {/* Row 2: Full-width Description (Starts BELOW Image and spans 100% full width) */}
          <div className="w-full">
            <p
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 400,
                color: '#000000',
                letterSpacing: '0%',
                opacity: 0.75,
                margin: 0,
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                textAlign: 'justify',
              }}
              className="w-full text-[12px] sm:text-[13px] leading-[18px] sm:leading-[20px]"
            >
              {description}
            </p>
          </div>

          {/* Row 3: Coin Reward + Platform Icons (Bottom on both Mobile and Desktop) */}
          <div className="flex items-center justify-between gap-3 w-full pt-1.5 border-t border-slate-100/80">
            {/* Coins */}
            <div className="flex items-center gap-1.5">
              <img
                src="/coins/image copy 7.png"
                alt="Coins"
                style={{ width: '18px', height: '18px', objectFit: 'contain' }}
              />
              <span
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 600,
                  fontSize: '18px',
                  letterSpacing: '-0.02em',
                  color: 'rgba(77, 116, 191, 1)',
                  lineHeight: '1',
                }}
              >
                {rewardFormatted}
              </span>
            </div>

            {/* Platform Icon Badges */}
            <div className="flex items-center gap-1.5">
              {offer.platforms?.desktop && (
                <div
                  style={{
                    background: '#000000',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  className="w-[28px] h-[28px] rounded-[8px] flex-shrink-0"
                  title="Desktop / PC"
                >
                  <img
                    src="/coins/desko.png"
                    alt="Desktop"
                    className="w-[14px] h-[14px] object-contain brightness-0 invert"
                  />
                </div>
              )}
              {offer.platforms?.android && (
                <div
                  style={{
                    background: '#000000',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  className="w-[28px] h-[28px] rounded-[8px] flex-shrink-0"
                  title="Android"
                >
                  <svg className="w-[14px] h-[14px] text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8533 8.081 12 8.081s-3.5902.33-5.1367.8697L4.841 5.4477a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                  </svg>
                </div>
              )}
              {offer.platforms?.ios && (
                <div
                  style={{
                    background: '#000000',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  className="w-[28px] h-[28px] rounded-[8px] flex-shrink-0"
                  title="iOS"
                >
                  <svg className="w-[14px] h-[14px] text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1.01.08 2.03-.49 2.65-1.24z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Requirements Heading */}
        <h2
          style={{
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 700,
            fontSize: '18px',
            color: '#000000',
            margin: 0,
          }}
          className="shrink-0"
        >
          {t('goodpicks.requirements')}
        </h2>

        {/* White Requirements Card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          className="shrink-0 divide-y divide-slate-100"
        >
          {offer.requirementType === 'paragraph' ? (
            <p
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0F172A',
                margin: 0,
                lineHeight: '22px',
              }}
            >
              {Array.isArray(requirementsList) && requirementsList.length > 0
                ? requirementsList.join(' ')
                : typeof requirementsList === 'string'
                  ? requirementsList
                  : t('goodpicks.defaultRequirement')}
            </p>
          ) : requirementsList && requirementsList.length > 0 ? (
            requirementsList.map((req, i) => (
              <div
                key={i}
                className={`flex items-center gap-3.5 ${i > 0 ? 'pt-3' : ''}`}
              >
                {i === 0 ? (
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#1E293B',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FiCheck size={14} strokeWidth={3} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      flexShrink: 0,
                    }}
                  />
                )}
                <span
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#0F172A',
                  }}
                >
                  {req}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-3.5">
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#1E293B',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FiCheck size={14} strokeWidth={3} />
              </div>
              <span
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#0F172A',
                }}
              >
                {t('goodpicks.defaultRequirement')}
              </span>
            </div>
          )}
        </div>

        {/* Start Offer Button */}
        <button
          onClick={handleStartOffer}
          style={{
            width: '100%',
            height: '48px',
            borderRadius: '12px',
            background: '#1E2530',
            color: '#FFFFFF',
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 600,
            fontSize: '15px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          className="hover:bg-[#151B24] transition-all shadow-md shrink-0"
        >
          {t('goodpicks.startOffer')}
        </button>

        {/* General Offer Rules Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '4px 0 0',
          }}
          className="w-full max-w-[381px] sm:max-w-none gap-2 sm:gap-2.5 shrink-0"
        >
          <h4
            style={{
              fontFamily: '"Bricolage Grotesque", "Poppins", sans-serif',
              fontWeight: 700,
              letterSpacing: '0%',
              color: '#000000',
              margin: 0,
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
            className="w-full max-w-[381px] sm:max-w-none min-h-[12px] text-[15px] sm:text-[17px] leading-[20px] sm:leading-[27px]"
          >
            {t('goodpicks.generalRules')}
          </h4>
          <div
            className="flex flex-col w-full max-w-[381px] sm:max-w-none gap-[5px] sm:gap-1.5"
            style={{
              transform: 'rotate(0deg)',
              opacity: 1,
            }}
          >
            {generalRules.map((rule, idx) => (
              <div
                key={idx}
                className="w-full max-w-[381px] sm:max-w-none min-h-[8px] flex items-start gap-[5px] sm:gap-2"
                style={{
                  transform: 'rotate(0deg)',
                  opacity: 1,
                }}
              >
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: 'rgba(63, 76, 99, 1)',
                    flexShrink: 0,
                    opacity: 1,
                    transform: 'rotate(0deg)',
                  }}
                  className="mt-[4px] sm:mt-[6px]"
                />
                <span
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    letterSpacing: '0%',
                    color: '#000000',
                    opacity: 1,
                  }}
                  className="text-[11px] sm:text-[12px] leading-[15px] sm:leading-[21px]"
                >
                  {rule}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Smartphone QR Code Section (Whole layout: width: 100%, minHeight: 116px, padding: 16px 20px, borderRadius: 20px, gap: 30px) */}
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            minHeight: '116px',
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '16px 20px',
            transform: 'rotate(0deg)',
            opacity: 1,
            gap: '24px',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
          className="w-full shrink-0"
        >
          {/* QR Box: width: 76px, height: 76px, angle: 0deg, opacity: 1, borderRadius: 10px */}
          <div
            style={{
              width: '76px',
              height: '76px',
              transform: 'rotate(0deg)',
              opacity: 1,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <BsQrCode size={76} className="text-[#000000]" />
          </div>

          {/* Text Layout: width: 230px, height: 38px, angle: 0deg, opacity: 1 */}
          <div
            style={{
              width: '230px',
              maxWidth: '100%',
              minHeight: '38px',
              transform: 'rotate(0deg)',
              opacity: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <p
              style={{
                fontFamily: '"IBM Plex Sans", "Poppins", sans-serif',
                fontWeight: 500,
                fontSize: '13px',
                lineHeight: '18px',
                letterSpacing: '0%',
                color: '#000000',
                margin: 0,
                padding: 0,
                whiteSpace: 'pre-line',
              }}
            >
              {t('goodpicks.scanQrCode')}
            </p>
          </div>
        </div>

        {/* Support Popup Modal */}
        {showSupportModal && (
          <GoodpicksSupportModal
            onClose={() => setShowSupportModal(false)}
          />
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── Goodpicks Support Popup Modal ──────────────────────────────────────────
export const GoodpicksSupportModal = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          minHeight: '300px',
          background: 'rgba(249, 247, 241, 1)',
          borderRadius: '26px',
          border: '4px solid #FFFFFF',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '44px 28px 40px 28px',
          boxSizing: 'border-box',
          position: 'relative',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.28)',
        }}
      >
        {/* Decorative rainbow arches graphic in bottom-right corner */}
        <img
          src="/coins/image copy 15.png"
          alt="Decoration"
          className="absolute bottom-0 right-0 w-[170px] sm:w-[210px] max-w-none pointer-events-none select-none z-0 object-contain object-bottom-right"
        />

        {/* Close Button at top right */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#000000',
            color: '#FFFFFF',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            margin: 0,
            lineHeight: 0,
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 20,
            flexShrink: 0,
          }}
          className="hover:opacity-80 transition-opacity"
          aria-label="Close"
        >
          <svg
            style={{ width: '12px', height: '12px', display: 'block' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Headset / Live Support Icon */}
        <div className="relative z-10 flex items-center justify-center mb-5">
          <img
            src="/coins/image copy 14.png"
            alt="Taskmint Support"
            style={{
              width: '60px',
              height: '60px',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Centered Message */}
        <p
          className="relative z-10"
          style={{
            fontFamily: '"Poppins", "Bricolage Grotesque", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '18px',
            lineHeight: '28px',
            color: '#1E293B',
            fontWeight: 400,
            textAlign: 'center',
            maxWidth: '480px',
            margin: 0,
            padding: 0,
          }}
        >
          {t('goodpicks.supportPopupPart1') || 'For any queries or assistance, please contact '}
          <strong style={{ fontWeight: 700, color: '#0F172A' }}>
            {t('goodpicks.supportPopupHighlight') || 'Taskmint Live Support'}
          </strong>
          {t('goodpicks.supportPopupPart2') || '. Our support team will be happy to assist you with your concerns.'}
        </p>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Goodpicks Offerwall Modal (Screenshot 1 & History View) ───────────
export const GoodpicksOfferwallModal = ({ onClose, token }) => {
  const { t, i18n } = useTranslation();
  const isDe = i18n.language?.startsWith('de');
  const [offers, setOffers] = useState([]);
  const [historyOffers, setHistoryOffers] = useState(defaultGoodpicksHistory);
  const [currentView, setCurrentView] = useState('offers'); // 'offers' | 'history'
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // 'All' | 'Android' | 'IOS' | 'PC'
  const [sortBy, setSortBy] = useState('highest'); // 'highest' | 'lowest' | 'newest'
  const [selectedOffer, setSelectedOffer] = useState(null);

  // Fetch Goodpicks offers from API (fall back to mock items)
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await fetch(`${API}/goodpicks-offers`);
        const data = await res.json();
        if (data.success && data.offers && data.offers.length > 0) {
          setOffers(data.offers);
        } else {
          setOffers(defaultGoodpicksOffers);
        }
      } catch (err) {
        console.warn('Using default Goodpicks offers:', err);
        setOffers(defaultGoodpicksOffers);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  // Filter offers by platform
  const filteredOffers = offers.filter((offer) => {
    if (filter === 'All') return true;
    if (filter === 'Android') return offer.platforms?.android;
    if (filter === 'IOS') return offer.platforms?.ios;
    if (filter === 'PC') return offer.platforms?.desktop;
    return true;
  });

  // Sort offers
  const sortedOffers = [...filteredOffers].sort((a, b) => {
    if (sortBy === 'highest') return (b.rewardAmount || 0) - (a.rewardAmount || 0);
    if (sortBy === 'lowest') return (a.rewardAmount || 0) - (b.rewardAmount || 0);
    if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    return 0;
  });

  const filterTabs = [
    { id: 'All', label: t('goodpicks.tabAll') },
    { id: 'Android', label: t('goodpicks.tabAndroid') },
    { id: 'IOS', label: t('goodpicks.tabIos') },
    { id: 'PC', label: t('goodpicks.tabPc') },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[1300px] h-[95vh] sm:h-[92vh] max-h-[880px] rounded-[18px] sm:rounded-[24px] bg-white shadow-[0px_25px_60px_0px_rgba(0,0,0,0.28)] border border-[rgba(223,225,209,0.7)] flex flex-col gap-1 sm:gap-2 p-1 sm:p-2.5 overflow-hidden box-border relative"
        >
          {/* Top Brand Header Bar */}
          <div
            className="w-full h-[52px] sm:h-[64px] bg-white px-2 sm:px-4 flex items-center justify-between box-border shrink-0 relative"
          >
            {/* Left: Goodpicks Logo */}
            <div
              className="flex items-center cursor-pointer select-none shrink-0"
              onClick={() => setCurrentView('offers')}
              title="Goodpicks"
              style={{
                width: '95px',
                height: '22.8px',
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
            >
              <img
                src="/coins/image copy 6.png"
                alt="Goodpicks"
                style={{
                  width: '95px',
                  height: '22.8px',
                  objectFit: 'contain',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
                className="select-none"
              />
            </div>

            {/* Center / Middle: Taskmint logo */}
            <div className="flex-1 flex items-center justify-center pointer-events-none px-2 -translate-x-3 sm:-translate-x-2">
              <img
                src="/coins/logo final.svg"
                alt="taskmint"
                className="h-[22.8px] max-w-[120px] object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/coins/logo copy.png';
                }}
              />
            </div>

            {/* Right: Black Circular Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#000000',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                margin: 0,
                lineHeight: 0,
                flexShrink: 0,
              }}
              className="hover:opacity-80 transition-opacity"
              aria-label="Close"
            >
              <svg
                style={{ width: '12px', height: '12px', display: 'block' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Main Sky Blue Body Container */}
          <div
            className="flex-1 w-full bg-[#BEE3F2] rounded-[14px] sm:rounded-[16px] p-2.5 sm:p-5 lg:p-6 box-border overflow-y-auto flex flex-col gap-3 sm:gap-4.5 hide-scrollbar"
          >
            {/* Subheader: Goodpicks Big Logo + Support & History Buttons */}
            <div className="flex items-center justify-between shrink-0">
              <div
                className="flex items-center cursor-pointer"
                onClick={() => setCurrentView('offers')}
                title="Goodpicks"
              >
                <img
                  src="/coins/image copy 6.png"
                  alt="Goodpicks"
                  className="h-[36px] w-auto object-contain select-none"
                />
              </div>

              {/* Support & History / Offers Switch Buttons */}
              <div className="flex items-center gap-2">
                {currentView === 'history' && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('offers')}
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 600,
                      fontSize: '11px',
                      letterSpacing: '0.05em',
                    }}
                    className="px-4 py-1.5 rounded-full bg-white text-slate-700 hover:bg-slate-50 transition-all border border-slate-200/80 shadow-sm uppercase cursor-pointer"
                  >
                    {t('goodpicks.offers') || 'OFFERS'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 600,
                    fontSize: '11px',
                    letterSpacing: '0.05em',
                  }}
                  className="px-4 py-1.5 rounded-full bg-white text-slate-700 hover:bg-slate-50 transition-all border border-slate-200/80 shadow-sm uppercase cursor-pointer"
                >
                  {t('goodpicks.support')}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView(currentView === 'history' ? 'offers' : 'history')}
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 600,
                    fontSize: '11px',
                    letterSpacing: '0.05em',
                    background: currentView === 'history' ? '#0F172A' : '#FFFFFF',
                    color: currentView === 'history' ? '#FFFFFF' : '#334155',
                  }}
                  className="px-4 py-1.5 rounded-full transition-all border border-slate-200/80 shadow-sm uppercase cursor-pointer"
                >
                  {t('goodpicks.history')}
                </button>
              </div>
            </div>

            {/* Content View Switching */}
            {currentView === 'history' ? (
              /* ─── HISTORY VIEW (2 Rows matching user layout specifications) ─── */
              <div className="flex-1 flex flex-col gap-2 pb-4 w-full">
                {historyOffers && historyOffers.length > 0 ? (
                  historyOffers.map((item) => {
                    const itemTitle = (isDe && item.titleDe) ? item.titleDe : item.title;
                    const itemDesc = (isDe && item.descriptionDe) ? item.descriptionDe : (item.description || t('goodpicks.defaultDescription'));
                    const rewardStr = (item.rewardAmount || 0).toLocaleString('de-DE');

                    return (
                      <div
                        key={item._id}
                        style={{
                          width: '100%',
                          maxWidth: '1248px',
                          background: '#FFFFFF',
                          borderRadius: '16px',
                          padding: '12px 14px',
                          boxSizing: 'border-box',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        }}
                        className="hover:shadow-md transition-shadow flex flex-col md:grid md:grid-cols-[minmax(280px,380px)_1fr_1fr_auto] md:h-[88px] md:items-center gap-3 md:gap-3"
                      >
                        {/* 1. Top (Mobile) / Left (Desktop): Image + Title & description */}
                        <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
                          <div
                            style={{
                              width: '58px',
                              height: '58px',
                              transform: 'rotate(0deg)',
                              opacity: 1,
                              borderRadius: '10px',
                              overflow: 'hidden',
                              background: '#F1F5F9',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            className="shadow-sm"
                          >
                            {renderOfferCover(item)}
                          </div>

                          <div className="flex flex-col justify-center min-w-0 flex-1">
                            <h4
                              style={{
                                fontFamily: '"IBM Plex Sans", "Poppins", sans-serif',
                                fontWeight: 600,
                                fontSize: '15px',
                                lineHeight: '20px',
                                color: '#000000',
                                margin: 0,
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                              }}
                            >
                              {itemTitle}
                            </h4>
                            <p
                              style={{
                                fontFamily: '"IBM Plex Sans", "Poppins", sans-serif',
                                fontWeight: 400,
                                fontSize: '11px',
                                lineHeight: '16px',
                                color: 'rgba(0, 0, 0, 0.7)',
                                margin: '2px 0 0',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                whiteSpace: 'normal',
                                textAlign: 'justify',
                              }}
                            >
                              {itemDesc}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Row on Mobile (Coins + Platform + Button) / direct grid items on Desktop */}
                        <div className="flex items-center justify-between w-full pt-1.5 md:pt-0 md:contents">
                          {/* 2. Coins */}
                          <div className="flex items-center md:justify-center gap-1.5 shrink-0">
                            <img
                              src="/coins/image copy 7.png"
                              alt="Coins"
                              style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                            />
                            <span
                              style={{
                                fontFamily: '"Poppins", sans-serif',
                                fontWeight: 600,
                                fontSize: '18px',
                                letterSpacing: '-0.02em',
                                color: 'rgba(77, 116, 191, 1)',
                                lineHeight: '1',
                              }}
                            >
                              {rewardStr}
                            </span>
                          </div>

                          {/* 3. Platform Icon Badge */}
                          <div className="shrink-0 flex items-center md:justify-center">
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: '#000000',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title={item.platforms?.desktop ? 'Desktop' : item.platforms?.ios ? 'iOS' : 'Android'}
                            >
                              {item.platforms?.desktop ? (
                                <img
                                  src="/coins/desko.png"
                                  alt="Desktop"
                                  style={{ width: '16px', height: '16px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                                />
                              ) : item.platforms?.ios ? (
                                <svg style={{ width: '16px', height: '16px' }} className="text-white" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1.01.08 2.03-.49 2.65-1.24z" />
                                </svg>
                              ) : (
                                <svg style={{ width: '16px', height: '16px' }} className="text-white" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8533 8.081 12 8.081s-3.5902.33-5.1367.8697L4.841 5.4477a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                                </svg>
                              )}
                            </div>
                          </div>

                          {/* 4. Button */}
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedOffer(item)}
                              style={{
                                width: '105px',
                                height: '36px',
                                borderRadius: '10px',
                                background: '#00A3FF',
                                color: '#FFFFFF',
                                fontFamily: '"Poppins", sans-serif',
                                fontWeight: 600,
                                fontSize: '13px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                              className="hover:bg-[#0094EA] active:scale-[0.98] transition-all shadow-sm"
                            >
                              {t('goodpicks.seeDetails')}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-slate-700 font-bold text-base">{t('goodpicks.historyEmpty')}</p>
                    <p className="text-slate-500 text-xs mt-1">{t('goodpicks.historyEmptySub')}</p>
                  </div>
                )}
              </div>
            ) : (
              /* ─── OFFERS BROWSE VIEW ─── */
              <>
                {/* Filter Tabs + Sort Bar */}
                <div className="flex flex-nowrap items-center justify-between gap-1.5 sm:gap-3 shrink-0 w-full overflow-x-auto hide-scrollbar pb-0.5 pr-1.5 sm:pr-0">
                  {/* Platform Filter Tabs */}
                  <div className="flex items-center gap-2 sm:gap-6 shrink-0">
                    {filterTabs.map((tab) => {
                      const isActive = filter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setFilter(tab.id)}
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? '#0F172A' : '#475569',
                          }}
                          className={`relative py-1 text-[11.5px] sm:text-[14px] whitespace-nowrap cursor-pointer transition-colors bg-transparent border-none ${isActive ? 'text-slate-900' : 'hover:text-slate-900'
                            }`}
                        >
                          {tab.label}
                          {isActive && (
                            <motion.div
                              layoutId="gpFilterUnderline"
                              className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#00A3FF] rounded-full"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sort By Dropdown */}
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0 mr-1 sm:mr-0">
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        color: '#334155',
                      }}
                      className="text-[11px] sm:text-[13px] whitespace-nowrap"
                    >
                      {t('goodpicks.sort')}
                    </span>
                    <div className="relative shrink-0">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 600,
                          background: '#FFFFFF',
                          borderRadius: '100px',
                          border: '1px solid rgba(203, 213, 225, 0.8)',
                          color: '#0F172A',
                          cursor: 'pointer',
                          appearance: 'none',
                        }}
                        className="shadow-sm outline-none text-[10px] sm:text-[13px] py-1 pl-2.5 pr-6 sm:py-1.5 sm:pl-4 sm:pr-8 whitespace-nowrap"
                      >
                        <option value="highest">{t('goodpicks.highestReward')}</option>
                        <option value="lowest">{t('goodpicks.lowestReward')}</option>
                        <option value="newest">{t('goodpicks.newest')}</option>
                      </select>
                      <FiChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-700 text-[10px] sm:text-xs" />
                    </div>
                  </div>
                </div>

                {/* Offers Grid */}
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                    <FiLoader className="w-8 h-8 text-[#00A3FF] animate-spin" />
                    <p className="text-slate-600 text-sm font-medium">{t('goodpicks.loading')}</p>
                  </div>
                ) : sortedOffers.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-slate-700 font-bold text-base">{t('goodpicks.noOffers')}</p>
                    <p className="text-slate-500 text-xs mt-1">{t('goodpicks.tryAnotherPlatform')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-start gap-2 md:gap-2.5 pb-4 w-full">
                    {sortedOffers.map((offer) => {
                      const rewardStr = (offer.rewardAmount || 0).toLocaleString('de-DE');
                      const cardTitle = (isDe && offer.titleDe) ? offer.titleDe : offer.title;
                      const cardDesc = (isDe && offer.descriptionDe) ? offer.descriptionDe : (offer.description || t('goodpicks.defaultDescription'));

                      return (
                        <div
                          key={offer._id}
                          style={{
                            width: '100%',
                            minHeight: '191px',
                            height: 'fit-content',
                            background: '#FFFFFF',
                            borderRadius: '16px',
                            padding: '8px 12px 10px 8px',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '8px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.8)',
                            opacity: 1,
                          }}
                          className="hover:shadow-md transition-shadow self-start"
                        >
                          <div className="flex flex-col gap-1.5 w-full">
                            {/* Top Row: 84x84 Image + Right Info Column */}
                            <div className="flex items-start gap-3">
                              {/* 84x84 Image */}
                              <div
                                style={{
                                  width: '84px',
                                  height: '84px',
                                  borderRadius: '12px',
                                  overflow: 'hidden',
                                  background: '#F1F5F9',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  opacity: 1,
                                }}
                                className="shadow-sm"
                              >
                                {renderOfferCover(offer)}
                              </div>

                              {/* Right Info Column: Platforms & Coins on Line 1, Title on Line 2 */}
                              <div className="flex-1 min-w-0 flex flex-col justify-start gap-1.5" style={{ minHeight: '84px' }}>
                                {/* Line 1: Platforms + Coin Reward */}
                                <div className="flex items-center justify-between gap-2 pt-1.5">
                                  {/* Platform Icon Badges */}
                                  <div className="flex items-center shrink-0" style={{ gap: '6px' }}>
                                    {offer.platforms?.desktop && (
                                      <div
                                        style={{
                                          width: '22px',
                                          height: '22px',
                                          borderRadius: '50%',
                                          background: '#000000',
                                          color: '#FFFFFF',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          opacity: 1,
                                        }}
                                        title="Desktop / PC"
                                      >
                                        <img
                                          src="/coins/desko.png"
                                          alt="Desktop"
                                          style={{ width: '11px', height: '11px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                                        />
                                      </div>
                                    )}
                                    {offer.platforms?.android && (
                                      <div
                                        style={{
                                          width: '22px',
                                          height: '22px',
                                          borderRadius: '50%',
                                          background: '#000000',
                                          color: '#FFFFFF',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          opacity: 1,
                                        }}
                                        title="Android"
                                      >
                                        <svg style={{ width: '11px', height: '11px', flexShrink: 0 }} className="text-white" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8533 8.081 12 8.081s-3.5902.33-5.1367.8697L4.841 5.4477a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                                        </svg>
                                      </div>
                                    )}
                                    {offer.platforms?.ios && (
                                      <div
                                        style={{
                                          width: '22px',
                                          height: '22px',
                                          borderRadius: '50%',
                                          background: '#000000',
                                          color: '#FFFFFF',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          opacity: 1,
                                        }}
                                        title="iOS"
                                      >
                                        <svg style={{ width: '11px', height: '11px', flexShrink: 0 }} className="text-white" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1.01.08 2.03-.49 2.65-1.24z" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>

                                  {/* Blue Coin Reward Amount */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <img
                                      src="/coins/image copy 7.png"
                                      alt="Coins"
                                      style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                                    />
                                    <span
                                      style={{
                                        fontFamily: '"Poppins", sans-serif',
                                        fontWeight: 600,
                                        fontSize: '20px',
                                        letterSpacing: '-0.02em',
                                        color: 'rgba(77, 116, 191, 1)',
                                        lineHeight: '1',
                                        opacity: 1,
                                      }}
                                    >
                                      {rewardStr}
                                    </span>
                                  </div>
                                </div>

                                {/* Line 2: Title */}
                                <h3
                                  style={{
                                    width: '100%',
                                    fontFamily: '"Albra", "Bricolage Grotesque", Georgia, serif',
                                    fontWeight: 500,
                                    fontSize: '16px',
                                    lineHeight: '22px',
                                    letterSpacing: '0%',
                                    color: '#0F172A',
                                    marginTop: '8px',
                                    marginBottom: 0,
                                    opacity: 1,
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                  }}
                                >
                                  {cardTitle}
                                </h3>
                              </div>
                            </div>

                            {/* Middle: Description Text */}
                            <p
                              style={{
                                width: '100%',
                                fontFamily: '"Poppins", sans-serif',
                                fontWeight: 400,
                                fontSize: '11px',
                                lineHeight: '16px',
                                letterSpacing: '0%',
                                color: '#000000',
                                opacity: 0.7,
                                margin: 0,
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                whiteSpace: 'normal',
                                textAlign: 'justify',
                              }}
                            >
                              {cardDesc}
                            </p>
                          </div>

                          {/* Bottom: See Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedOffer(offer)}
                            style={{
                              width: '100%',
                              height: '38px',
                              borderRadius: '12px',
                              background: '#00A3FF',
                              color: '#FFFFFF',
                              fontFamily: '"Poppins", sans-serif',
                              fontWeight: 600,
                              fontSize: '14px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            className="hover:bg-[#0094EA] active:scale-[0.99] transition-all shadow-sm shrink-0 mt-auto"
                          >
                            {t('goodpicks.seeDetails')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Offer Detail Popup Modal */}
      {selectedOffer && (
        <GoodpicksDetailModal
          offer={selectedOffer}
          onClose={() => setSelectedOffer(null)}
          token={token}
        />
      )}

      {/* Support Popup Modal */}
      {showSupportModal && (
        <GoodpicksSupportModal
          onClose={() => setShowSupportModal(false)}
        />
      )}
    </AnimatePresence>
  );
};

export default GoodpicksOfferwallModal;

