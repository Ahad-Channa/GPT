import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);

  if (!offer) return null;

  const rewardFormatted = (offer.rewardAmount || 0).toLocaleString('de-DE');

  const handleStartOffer = () => {
    if (offer.externalLink) {
      window.open(offer.externalLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
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
          padding: '10px 10px 18px 10px',
          boxSizing: 'border-box',
          color: '#000000',
          position: 'relative',
        }}
        className="shadow-2xl flex flex-col gap-3 overflow-y-auto hide-scrollbar"
      >
        {/* Top White Card: Icon + Title/Description + Reward + Platform */}
        <div
          style={{
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            boxSizing: 'border-box',
            position: 'relative',
          }}
          className="shrink-0"
        >
          {/* Top Close Button inside the white card */}
          <button
            onClick={onClose}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#000000',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 20,
            }}
            className="hover:opacity-80 transition-opacity"
          >
            <FiX size={10} strokeWidth={2.5} />
          </button>

          {/* 84x84 Image layout (width: 84, height: 84, borderRadius: 12px, opacity: 1) */}
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '12px',
              overflow: 'hidden',
              flexShrink: 0,
              background: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 1,
            }}
          >
            {renderOfferCover(offer)}
          </div>

          {/* Title & Short Description */}
          <div className="flex-1 min-w-0">
            <h3
              style={{
                width: '100%',
                maxWidth: '300px',
                fontFamily: '"Albra", "Bricolage Grotesque", Georgia, serif',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '27px',
                letterSpacing: '0%',
                color: '#0F172A',
                margin: 0,
                opacity: 1,
              }}
            >
              {offer.title}
            </h3>
            <p
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 400,
                fontSize: '11px',
                color: '#000000',
                opacity: 0.7,
                marginTop: '4px',
                marginBottom: 0,
                lineHeight: '16px',
                letterSpacing: '0%',
              }}
              className="line-clamp-2"
            >
              {offer.description || 'Complete this offer by sending it to your Android device from here'}
            </p>
          </div>

          {/* Right: Coin Reward + Platform Icon */}
          <div className="flex items-center gap-3 shrink-0">
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
                  fontSize: '20px',
                  letterSpacing: '-0.02em',
                  color: 'rgba(77, 116, 191, 1)',
                  lineHeight: '1',
                  opacity: 1,
                }}
              >
                {rewardFormatted}
              </span>
            </div>

            {/* Platform Icon Badges — show all selected platforms */}
            <div className="flex items-center" style={{ gap: '6px' }}>
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
          Requirements
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
              {Array.isArray(offer.requirements) && offer.requirements.length > 0
                ? offer.requirements.join(' ')
                : typeof offer.requirements === 'string'
                ? offer.requirements
                : 'Complete all in-app milestones to earn rewards.'}
            </p>
          ) : offer.requirements && offer.requirements.length > 0 ? (
            offer.requirements.map((req, i) => (
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
                Complete all requirements to earn rewards
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
          Start Offer
        </button>

        {/* General Offer Rules Section */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '4px 2px 0',
          }}
          className="shrink-0"
        >
          <h4
            style={{
              fontFamily: '"Bricolage Grotesque", Georgia, serif',
              fontWeight: 700,
              fontSize: '16px',
              lineHeight: '27px',
              letterSpacing: '0%',
              color: '#000000',
              margin: 0,
            }}
          >
            GENERAL OFFER RULES
          </h4>
          <div className="flex flex-col gap-1.5">
            {[
              'Use a genuine device. Emulators are not allowed.',
              'VPNs and proxies are not allowed. Your real location must be used.',
              'Complete the offer yourself and follow the stated requirements.',
              'Offers may be limited to new users/customers where specified. Existing users may not be eligible.',
              'Follow the individual offer requirements and any stated completion deadline.',
              'Rewards are only granted when the offer requirements are successfully verified.',
            ].map((rule, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'rgba(63, 76, 99, 1)',
                    flexShrink: 0,
                    marginTop: '7px',
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

        {/* Smartphone QR Code Section (Whole layout: 336px x 76px, gap: 30px) */}
        <div
          style={{
            width: '336px',
            maxWidth: '100%',
            height: '76px',
            transform: 'rotate(0deg)',
            opacity: 1,
            gap: '30px',
            display: 'flex',
            alignItems: 'center',
            margin: '0 auto',
            paddingTop: '6px',
            paddingBottom: '4px',
            boxSizing: 'border-box',
          }}
          className="shrink-0"
        >
          {/* QR Box: 76px x 76px, angle: 0deg, opacity: 1, borderRadius: 10px */}
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
            }}
          >
            <BsQrCode size={76} className="text-[#000000]" />
          </div>

          {/* Text Layout: 230px x 38px, angle: 0deg, opacity: 1 */}
          <div
            style={{
              width: '230px',
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
                fontSize: '16px',
                lineHeight: '20px',
                letterSpacing: '0%',
                color: '#000000',
                margin: 0,
                padding: 0,
              }}
            >
              Scan the QR code to start
              <br />
              directly on your smartphone.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Goodpicks Offerwall Modal (Screenshot 1) ──────────────────────────
export const GoodpicksOfferwallModal = ({ onClose, token }) => {
  const [offers, setOffers] = useState([]);
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '1080px',
            height: '92vh',
            maxHeight: '880px',
            borderRadius: '24px',
            background: '#FFFFFF',
            boxShadow: '0px 25px 60px 0px rgba(0, 0, 0, 0.28)',
            border: '1px solid rgba(223, 225, 209, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px 10px 10px',
            overflow: 'hidden',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {/* Top Brand Header Bar */}
          <div
            style={{
              width: '100%',
              height: '64px',
              background: '#FFFFFF',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            {/* Left: Goodpicks Logo (compact header size) */}
            <div className="flex items-center">
              <img
                src="/coins/image copy 6.png"
                alt="Goodpicks"
                className="h-[24px] w-auto object-contain select-none"
              />
            </div>

            {/* Center: Taskmint logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              <img
                src="/coins/logo final.svg"
                alt="taskmint"
                className="h-7 max-w-[130px] object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/coins/logo copy.png';
                }}
              />
            </div>

            {/* Right: Black Circular Close Button */}
            <button
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
              }}
              className="hover:opacity-80 transition-opacity"
            >
              <FiX size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Main Sky Blue Body Container */}
          <div
            style={{
              flex: 1,
              width: '100%',
              background: '#BEE3F2',
              borderRadius: '16px',
              padding: '20px 24px',
              boxSizing: 'border-box',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
            className="hide-scrollbar"
          >
            {/* Subheader: Goodpicks Big Logo (larger size matching screenshot) + Support & History Buttons */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center">
                <img
                  src="/coins/image copy 6.png"
                  alt="Goodpicks"
                  className="h-[36px] w-auto object-contain select-none"
                />
              </div>

              {/* Support & History Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 600,
                    fontSize: '11px',
                    letterSpacing: '0.05em',
                  }}
                  className="px-4 py-1.5 rounded-full bg-white text-slate-700 hover:bg-slate-50 transition-all border border-slate-200/80 shadow-sm uppercase cursor-pointer"
                >
                  SUPPORT
                </button>
                <button
                  type="button"
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 600,
                    fontSize: '11px',
                    letterSpacing: '0.05em',
                  }}
                  className="px-4 py-1.5 rounded-full bg-white text-slate-700 hover:bg-slate-50 transition-all border border-slate-200/80 shadow-sm uppercase cursor-pointer"
                >
                  HISTORY
                </button>
              </div>
            </div>

            {/* Filter Tabs + Sort Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Platform Filter Tabs */}
              <div className="flex items-center gap-6">
                {['All', 'Android', 'IOS', 'PC'].map((tab) => {
                  const isActive = filter === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFilter(tab)}
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '14px',
                        color: isActive ? '#0F172A' : '#475569',
                      }}
                      className={`relative py-1 cursor-pointer transition-colors bg-transparent border-none ${
                        isActive ? 'text-slate-900' : 'hover:text-slate-900'
                      }`}
                    >
                      {tab}
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
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '13px',
                    color: '#334155',
                  }}
                >
                  Sort:
                </span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 600,
                      fontSize: '13px',
                      background: '#FFFFFF',
                      borderRadius: '100px',
                      padding: '6px 32px 6px 16px',
                      border: '1px solid rgba(203, 213, 225, 0.8)',
                      color: '#0F172A',
                      cursor: 'pointer',
                      appearance: 'none',
                    }}
                    className="shadow-sm outline-none"
                  >
                    <option value="highest">Highest Reward</option>
                    <option value="lowest">Lowest Reward</option>
                    <option value="newest">Newest</option>
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-700" />
                </div>
              </div>
            </div>

            {/* Offers Grid */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                <FiLoader className="w-8 h-8 text-[#00A3FF] animate-spin" />
                <p className="text-slate-600 text-sm font-medium">Loading Goodpicks offers...</p>
              </div>
            ) : sortedOffers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                <p className="text-slate-700 font-bold text-base">No offers available for this filter</p>
                <p className="text-slate-500 text-xs mt-1">Try selecting another platform or check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4 justify-items-start">
                {sortedOffers.map((offer) => {
                  const rewardStr = (offer.rewardAmount || 0).toLocaleString('de-DE');

                  return (
                    <div
                      key={offer._id}
                      style={{
                        width: '100%',
                        maxWidth: '416px',
                        minHeight: '191px',
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
                      className="hover:shadow-md transition-shadow"
                    >
                      {/* Top Row: 84x84 Image + Right Info Column */}
                      <div className="flex items-start gap-3">
                        {/* 84x84 Image (width: 84, height: 84, borderRadius: 12px, opacity: 1) */}
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
                          {/* Line 1: Platforms + Coin Reward (moved little down with paddingTop) */}
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

                          {/* Line 2: Title (Albra 16px/27px 500) */}
                          <h3
                            style={{
                              width: '100%',
                              maxWidth: '300px',
                              fontFamily: '"Albra", "Bricolage Grotesque", Georgia, serif',
                              fontWeight: 500,
                              fontSize: '16px',
                              lineHeight: '27px',
                              letterSpacing: '0%',
                              color: '#0F172A',
                              marginTop: '14px',
                              marginBottom: 0,
                              opacity: 1,
                            }}
                            className="truncate"
                          >
                            {offer.title}
                          </h3>
                        </div>
                      </div>

                      {/* Middle: Description Text */}
                      <p
                        style={{
                          width: '100%',
                          maxWidth: '398px',
                          minHeight: '24px',
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 400,
                          fontSize: '11px',
                          lineHeight: '16px',
                          letterSpacing: '0%',
                          color: '#000000',
                          opacity: 0.7,
                          margin: '4px 0 0 0',
                        }}
                        className="line-clamp-2"
                      >
                        {offer.description}
                      </p>

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
                        className="hover:bg-[#0094EA] active:scale-[0.99] transition-all shadow-sm shrink-0"
                      >
                        See Details
                      </button>
                    </div>
                  );
                })}
              </div>
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
    </AnimatePresence>
  );
};

export default GoodpicksOfferwallModal;
