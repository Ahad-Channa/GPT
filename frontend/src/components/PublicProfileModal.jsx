import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiChevronLeft, FiChevronRight, FiAlertTriangle
} from 'react-icons/fi';
import { BsPatchCheckFill } from 'react-icons/bs';
import VipBadge from './VipBadge';
import { getLevelFromEarned } from '../utils/vipLevels';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const formatCoins = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  const num = Number(val);
  return num.toLocaleString('de-DE');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getTierBorderColor = (tier) => {
  switch (tier) {
    case 'Bronze': return '#d97706';
    case 'Silver': return '#94a3b8';
    case 'Gold': return '#f59e0b';
    case 'Platinum': return '#22d3ee';
    case 'Diamond': return '#818cf8';
    case 'Opal': return '#c084fc';
    default: return '#818cf8';
  }
};

const getTierGradient = (tier) => {
  switch (tier) {
    case 'Bronze': return 'linear-gradient(180deg, #F3B60A -26.79%, #BE6708 158.93%)';
    case 'Silver': return 'linear-gradient(180deg, #D6D6D6 -26.79%, #929292 158.93%)';
    case 'Gold': return 'linear-gradient(180deg, #FEDD72 -23.08%, #FCBA21 74.64%)';
    case 'Platinum': return 'linear-gradient(180deg, #1FC4DE 0%, #207985 100%)';
    case 'Diamond': return 'linear-gradient(180deg, #7E83F1 0%, #7941BB 100%)';
    case 'Opal': return 'linear-gradient(180deg, #E92BFF 0%, #31BDFF 100%)';
    default: return 'linear-gradient(180deg, #F3B60A -26.79%, #BE6708 158.93%)';
  }
};

const parseOfferDescription = (offer) => {
  const desc = offer.description || '';
  let heading = '';
  let subText = '';

  if (desc.includes(':')) {
    const parts = desc.split(':');
    heading = parts[0].trim();
    subText = 'Task: ' + parts.slice(1).join(':').trim();
  } else if (offer.transactionType === 'custom_offer_reward') {
    heading = 'Reward for custom offer';
    subText = desc ? `Task: ${desc}` : 'Task: custom task';
  } else if (offer.transactionType === 'offer_reward') {
    heading = 'Reward for completing task';
    subText = desc ? `Task: ${desc}` : 'Task: offerwall task';
  } else if (offer.transactionType === 'withdrawal') {
    heading = 'Payout processed';
    subText = desc ? `Method: ${desc}` : 'Withdrawal';
  } else {
    heading = desc || 'Reward for completed offer';
    subText = 'Task: completed';
  }

  return { heading, subText };
};

const ITEMS_PER_PAGE = 2;

/**
 * PublicProfileModal
 * Props:
 *   userId  – MongoDB _id string of the user to show
 *   onClose – callback to close the modal
 */
const PublicProfileModal = ({ userId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [recentOffers, setRecentOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityPage, setActivityPage] = useState(1);

  // Close on ESC key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API}/public/user/${userId}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setRecentOffers(data.recentActiveOffers || []);
        setActivityPage(1);
      } else {
        setError(data.error || 'User not found');
      }
    } catch {
      setError('Network error loading profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const vipLevel = profile && typeof profile.totalEarned !== 'undefined'
    ? getLevelFromEarned(profile.totalEarned)
    : null;
  const tierName = vipLevel?.tier || 'Diamond';
  const tierBorderColor = getTierBorderColor(tierName);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* Main Outer Panel: width 626px, background pure white */}
        <motion.div
          key="panel"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-[95vw] sm:w-[626px] max-w-[626px]"
          style={{
            background: 'rgba(255, 255, 255, 1)',
            borderRadius: '24px',
            padding: '10px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
            maxHeight: '92vh',
            overflowY: 'auto',
            position: 'relative',
            zIndex: 9001,
            boxSizing: 'border-box',
          }}
        >
          {/* ── Loading State ── */}
          {loading && (
            <div className="flex flex-col justify-center items-center py-24 gap-3">
              <div className="w-10 h-10 rounded-full border-3 border-amber-200 border-t-amber-500 animate-spin" />
              <span className="text-sm font-medium text-neutral-500">Loading profile...</span>
            </div>
          )}

          {/* ── Error State ── */}
          {!loading && (error || !profile) && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-500">
                <FiAlertTriangle size={24} />
              </div>
              <div className="text-lg font-bold text-black">Profile Not Found</div>
              <div className="text-sm text-neutral-500 max-w-[280px]">
                {error || 'This user does not exist or has been removed.'}
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 rounded-xl bg-black text-white font-semibold text-sm hover:bg-neutral-800 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* ── Profile Content ── */}
          {!loading && profile && (
            profile.isPrivate ? (
              /* ── Private Profile View ── */
              <div
                style={{
                  width: '100%',
                  minHeight: '382px',
                  borderRadius: '20px',
                  background: 'rgba(248, 245, 239, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Bottom Right Corner Rainbow Background Graphic */}
                <img
                  src="/coins/confirmbottom.png"
                  alt=""
                  className="absolute bottom-0 right-0 pointer-events-none z-0 select-none"
                  style={{
                    maxWidth: '240px',
                    objectFit: 'contain',
                  }}
                />

                {/* Close Button Top Right */}
                <button
                  onClick={onClose}
                  aria-label="Close profile popup"
                  className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center cursor-pointer hover:opacity-80 active:scale-95 transition-all z-20 shadow-sm"
                >
                  <FiX size={14} className="text-white" strokeWidth={3} />
                </button>

                {/* Center White Card */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '28px 32px 28px 32px',
                    minWidth: '240px',
                    maxWidth: '280px',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    zIndex: 10,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: `2px solid ${tierBorderColor}`,
                      boxSizing: 'border-box',
                    }}
                    className="bg-neutral-100 shadow-sm"
                  >
                    <img
                      src={profile.avatarUrl || '/avatars/avatar1.png'}
                      alt={profile.displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/avatars/avatar1.png';
                      }}
                    />
                  </div>

                  {/* Display Name */}
                  <h3
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '24px',
                      lineHeight: '1.2',
                      letterSpacing: '-0.02em',
                      color: '#000000',
                      margin: '14px 0 0 0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}
                  >
                    {profile.displayName}
                  </h3>

                  {/* Joined Date */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: '8px',
                      marginBottom: '0',
                    }}
                  >
                    <img
                      src="/coins/userprofiledate.png"
                      alt="calendar"
                      style={{
                        width: '13px',
                        height: '13px',
                        objectFit: 'contain',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '13px',
                        lineHeight: '1.2',
                        letterSpacing: '0%',
                        color: '#1E293B',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Joined {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '2026'}
                    </span>
                  </div>

                  {/* Private Profile Pill Badge Inside Card */}
                  <div
                    style={{
                      marginTop: '16px',
                      background: 'rgba(36, 50, 77, 1)',
                      borderRadius: '100px',
                      padding: '6px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    <img
                      src="/coins/privteprfoile.png"
                      alt="private"
                      style={{
                        width: '15px',
                        height: '15px',
                        objectFit: 'contain',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '12px',
                        lineHeight: '1',
                        letterSpacing: '0%',
                        color: '#FFFFFF',
                      }}
                    >
                      This profile is private.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col w-full">
                {/* Inner Top Card: width 606px, min-height 224px, background rgba(248, 245, 239, 1), border-radius 16px */}
                <div
                  style={{
                    width: '100%',
                    minHeight: '224px',
                    borderRadius: '16px',
                    background: 'rgba(248, 245, 239, 1)',
                    padding: '16px 6px 6px 6px',
                    position: 'relative',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Close Button inside top-right of inner card */}
                  <button
                    onClick={onClose}
                    aria-label="Close profile popup"
                    className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center cursor-pointer hover:opacity-80 active:scale-95 transition-all z-10 shadow-sm"
                  >
                    <FiX size={14} className="text-white" strokeWidth={3} />
                  </button>

                  {/* Profile Header: height 70px, gap 20px */}
                  <div
                    style={{
                      height: '70px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      paddingLeft: '10px',
                      paddingRight: '36px',
                    }}
                  >
                    {/* Avatar: width 70px, height 70px, border-width 2px, color same as rank */}
                    <div
                      style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: `2px solid ${tierBorderColor}`,
                        boxSizing: 'border-box',
                      }}
                      className="bg-neutral-200 shadow-sm"
                    >
                      <img
                        src={profile.avatarUrl || '/avatars/avatar1.png'}
                        alt={profile.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/avatars/avatar1.png';
                        }}
                      />
                    </div>

                    {/* Info Layout: width 212px, height 54px, gap 15px */}
                    <div
                      style={{
                        width: '212px',
                        height: '54px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Username Layout: width 212px, height 18px, Bricolage Grotesque 700, 27px, -2% */}
                      <div
                        style={{
                          width: '212px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          overflow: 'visible',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: '"Bricolage Grotesque", sans-serif',
                            fontWeight: 700,
                            fontSize: '27px',
                            lineHeight: '1',
                            letterSpacing: '-0.02em',
                            color: '#000000',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block',
                          }}
                        >
                          {profile.displayName}
                        </span>
                      </div>

                      {/* Badges Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {/* Joined Date Pill: width 111px, height 21px, gap 4px, border-radius 100px, padding: 4px 7px, background: white */}
                        <div
                          style={{
                            width: '111px',
                            height: '21px',
                            gap: '4px',
                            borderRadius: '100px',
                            padding: '4px 7px',
                            background: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          }}
                        >
                          <img
                            src="/coins/userprofiledate.png"
                            alt="calendar"
                            style={{
                              width: '13px',
                              height: '13px',
                              objectFit: 'contain',
                              flexShrink: 0,
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div
                            style={{
                              width: '80px',
                              height: '9px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'visible',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: '"Poppins", sans-serif',
                                fontWeight: 500,
                                fontSize: '13px',
                                lineHeight: '28px',
                                letterSpacing: '0%',
                                textAlign: 'center',
                                color: '#1E293B',
                                whiteSpace: 'nowrap',
                                display: 'block',
                              }}
                            >
                              Joined {profile.createdAt ? new Date(profile.createdAt).getFullYear() : '2026'}
                            </span>
                          </div>
                        </div>

                        {/* VIP Tier Rank Badge: width 75px (auto-adjust), height 21px, padding: 6px 7px, border-radius 100px */}
                        <div
                          style={{
                            minWidth: '75px',
                            width: 'auto',
                            height: '21px',
                            gap: '4px',
                            borderRadius: '100px',
                            paddingTop: '6px',
                            paddingRight: '7px',
                            paddingBottom: '6px',
                            paddingLeft: '7px',
                            background: getTierGradient(tierName),
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          }}
                        >
                          <div
                            style={{
                              minWidth: '61px',
                              width: 'auto',
                              height: '9px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'visible',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: '"Poppins", sans-serif',
                                fontWeight: 500,
                                fontSize: '13px',
                                lineHeight: '28px',
                                letterSpacing: '0%',
                                textAlign: 'center',
                                color: '#FFFFFF',
                                whiteSpace: 'nowrap',
                                display: 'block',
                              }}
                            >
                              {tierName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Stats Boxes inside the cream card with pure white background: width 100%, gap: 5px, sitting lower */}
                  <div
                    style={{
                      width: '100%',
                      minHeight: '105px',
                      gap: '5px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                      boxSizing: 'border-box',
                      marginTop: '16px',
                    }}
                    className="grid-cols-2 sm:grid-cols-4"
                  >
                    {/* Box 1: Coin's Earned */}
                    <div
                      style={{
                        minHeight: '105px',
                        borderRadius: '13px',
                        paddingTop: '14px',
                        paddingRight: '11px',
                        paddingBottom: '14px',
                        paddingLeft: '11px',
                        background: 'rgba(255, 255, 255, 1)',
                        gap: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <img
                          src="/coins/userprofilecoin.png"
                          alt="coin"
                          style={{ width: '15px', height: '15px', objectFit: 'contain', flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontFamily: '"Bricolage Grotesque", sans-serif',
                            fontWeight: 700,
                            fontSize: '20px',
                            lineHeight: '1',
                            letterSpacing: '-0.02em',
                            color: '#C59114',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                          }}
                        >
                          {formatCoins(profile.earningsThisMonth || 0)}
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '36px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '13px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'visible',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: '"Bricolage Grotesque", sans-serif',
                              fontWeight: 700,
                              fontSize: '14px',
                              lineHeight: '1',
                              letterSpacing: '-0.02em',
                              color: '#000000',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            Coin's Earned
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'visible',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: '"Poppins", sans-serif',
                              fontWeight: 400,
                              fontSize: '12px',
                              lineHeight: '1',
                              letterSpacing: '0%',
                              color: '#000000',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            This Month
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Box 2: Total Earning */}
                    <div
                      style={{
                        minHeight: '105px',
                        borderRadius: '13px',
                        paddingTop: '14px',
                        paddingRight: '11px',
                        paddingBottom: '14px',
                        paddingLeft: '11px',
                        background: 'rgba(255, 255, 255, 1)',
                        gap: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <img
                          src="/coins/userprofilecoin.png"
                          alt="coin"
                          style={{ width: '15px', height: '15px', objectFit: 'contain', flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontFamily: '"Bricolage Grotesque", sans-serif',
                            fontWeight: 700,
                            fontSize: '20px',
                            lineHeight: '1',
                            letterSpacing: '-0.02em',
                            color: '#C59114',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                          }}
                        >
                          {formatCoins(profile.totalEarned || 0)}
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '36px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '13px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'visible',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: '"Bricolage Grotesque", sans-serif',
                              fontWeight: 700,
                              fontSize: '14px',
                              lineHeight: '1',
                              letterSpacing: '-0.02em',
                              color: '#000000',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            Total Earning
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'visible',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: '"Poppins", sans-serif',
                              fontWeight: 400,
                              fontSize: '12px',
                              lineHeight: '1',
                              letterSpacing: '0%',
                              color: '#000000',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            All Time
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Box 3: Referred Affiliates */}
                    <div
                      style={{
                        minHeight: '105px',
                        borderRadius: '13px',
                        paddingTop: '14px',
                        paddingRight: '11px',
                        paddingBottom: '14px',
                        paddingLeft: '11px',
                        background: 'rgba(255, 255, 255, 1)',
                        gap: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span
                          style={{
                            fontFamily: '"Bricolage Grotesque", sans-serif',
                            fontWeight: 700,
                            fontSize: '20px',
                            lineHeight: '1',
                            letterSpacing: '-0.02em',
                            color: '#1E293B',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                          }}
                        >
                          {(profile.referredCount || 0).toLocaleString('de-DE')}
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '36px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '13px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'visible',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: '"Bricolage Grotesque", sans-serif',
                              fontWeight: 700,
                              fontSize: '14px',
                              lineHeight: '1',
                              letterSpacing: '-0.02em',
                              color: '#000000',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            Referred Affiliates
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'visible',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: '"Poppins", sans-serif',
                              fontWeight: 400,
                              fontSize: '12px',
                              lineHeight: '1',
                              letterSpacing: '0%',
                              color: '#000000',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            All Time
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Box 4: Task Completed */}
                    <div
                      style={{
                        minHeight: '105px',
                        borderRadius: '13px',
                        paddingTop: '14px',
                        paddingRight: '11px',
                        paddingBottom: '14px',
                        paddingLeft: '11px',
                        background: 'rgba(255, 255, 255, 1)',
                        gap: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span
                          style={{
                            fontFamily: '"Bricolage Grotesque", sans-serif',
                            fontWeight: 700,
                            fontSize: '20px',
                            lineHeight: '1',
                            letterSpacing: '-0.02em',
                            color: '#1E293B',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                          }}
                        >
                          {(profile.tasksCompletedCount || 0).toLocaleString('de-DE')}
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '36px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '13px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'visible',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: '"Bricolage Grotesque", sans-serif',
                              fontWeight: 700,
                              fontSize: '14px',
                              lineHeight: '1',
                              letterSpacing: '-0.02em',
                              color: '#000000',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            Task Completed
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'visible',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: '"Poppins", sans-serif',
                              fontWeight: 400,
                              fontSize: '12px',
                              lineHeight: '1',
                              letterSpacing: '0%',
                              color: '#000000',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            All Time
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Recent Activity Section */}
              <div className="pt-4 pb-2 w-full" style={{ width: '100%' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '12px',
                      overflow: 'visible',
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: '20px',
                        lineHeight: '1',
                        letterSpacing: '-0.02em',
                        color: '#000000',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      Recent Activity
                    </h3>
                  </div>

                  {recentOffers.length === 0 ? (
                    <div
                      style={{
                        background: 'rgba(248, 245, 239, 1)',
                        borderRadius: '16px',
                      }}
                      className="p-4 text-center text-[#64748B] text-[13px] font-medium"
                    >
                      No recent activity found.
                    </div>
                  ) : (() => {
                    const totalPages = Math.ceil(recentOffers.length / ITEMS_PER_PAGE);
                    const start = (activityPage - 1) * ITEMS_PER_PAGE;
                    const pageOffers = recentOffers.slice(start, start + ITEMS_PER_PAGE);

                    return (
                      <div className="flex flex-col gap-2">
                        {pageOffers.map((offer) => {
                          const { heading, subText } = parseOfferDescription(offer);

                          return (
                            <div
                              key={offer._id}
                              style={{
                                background: 'rgba(248, 245, 239, 1)',
                                borderRadius: '16px',
                              }}
                              className="p-3.5 px-4 flex items-center justify-between gap-4"
                            >
                              {/* Left: Combined layout height 31px, gap 13px */}
                              <div
                                style={{
                                  height: '31px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  gap: '13px',
                                  boxSizing: 'border-box',
                                  flex: '1',
                                  minWidth: '0',
                                }}
                              >
                                <div
                                  style={{
                                    height: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    overflow: 'visible',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: '"Bricolage Grotesque", sans-serif',
                                      fontWeight: 700,
                                      fontSize: '15px',
                                      lineHeight: '1',
                                      letterSpacing: '-0.02em',
                                      color: '#000000',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: 'block',
                                    }}
                                  >
                                    {heading}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    height: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    overflow: 'visible',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: '"Poppins", sans-serif',
                                      fontWeight: 500,
                                      fontSize: '12px',
                                      lineHeight: '1',
                                      letterSpacing: '0%',
                                      color: '#000000',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: 'block',
                                    }}
                                  >
                                    {subText}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Combined layout height 31px, gap 13px, anchored to right */}
                              <div
                                style={{
                                  height: '31px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  justifyContent: 'space-between',
                                  gap: '13px',
                                  boxSizing: 'border-box',
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  style={{
                                    height: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    overflow: 'visible',
                                  }}
                                >
                                  <img
                                    src="/coins/userprofilecoin.png"
                                    alt="coin"
                                    style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }}
                                  />
                                  <div
                                    style={{
                                      width: 'auto',
                                      height: '13px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      overflow: 'visible',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontFamily: '"Bricolage Grotesque", sans-serif',
                                        fontWeight: 700,
                                        fontSize: '20px',
                                        lineHeight: '1',
                                        letterSpacing: '-0.02em',
                                        color: '#B8860B',
                                        whiteSpace: 'nowrap',
                                        display: 'block',
                                      }}
                                    >
                                      {offer.amount > 0 ? '+' : ''}{formatCoins(offer.amount)}
                                    </span>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    width: 'auto',
                                    height: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    overflow: 'visible',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: '"Poppins", sans-serif',
                                      fontWeight: 400,
                                      fontSize: '12px',
                                      lineHeight: '1',
                                      letterSpacing: '0%',
                                      color: '#000000',
                                      whiteSpace: 'nowrap',
                                      display: 'block',
                                    }}
                                  >
                                    {formatDate(offer.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 mt-2 pt-1">
                            <button
                              onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                              disabled={activityPage === 1}
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-white border border-[#E2E8F0] text-[#1E293B] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all text-xs font-bold"
                            >
                              <FiChevronLeft size={14} />
                            </button>
                            {Array.from({ length: totalPages }).map((_, idx) => (
                              <button
                                key={idx + 1}
                                onClick={() => setActivityPage(idx + 1)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                  activityPage === idx + 1
                                    ? 'bg-[#1E293B] text-white shadow-sm'
                                    : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#1E293B]'
                                }`}
                              >
                                {idx + 1}
                              </button>
                            ))}
                            <button
                              onClick={() => setActivityPage((p) => Math.min(totalPages, p + 1))}
                              disabled={activityPage === totalPages}
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-white border border-[#E2E8F0] text-[#1E293B] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all text-xs font-bold"
                            >
                              <FiChevronRight size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PublicProfileModal;
