import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiStar, FiClock, FiShield, FiAlertTriangle,
  FiAward, FiTrendingUp, FiZap, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import CoinIcon from './CoinIcon';
import VipBadge from './VipBadge';
import { getLevelFromEarned } from '../utils/vipLevels';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * PublicProfileModal
 * Props:
 *   userId  – MongoDB _id string of the user to show
 *   onClose – callback to close the modal
 */
const ITEMS_PER_PAGE = 5;

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
          position: 'fixed', inset: 0,
          background: 'rgba(5, 8, 18, 0.80)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* Panel – stop propagation so clicking inside doesn't close */}
        <motion.div
          key="panel"
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-[92vw] sm:w-[500px]"
          style={{
            height: profile?.isPrivate ? '235px' : 'auto',
            maxHeight: '90vh',
            borderRadius: '20px',
            gap: '16px',
            padding: '16px',
            background: 'rgba(36, 36, 36, 1)',
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
            zIndex: 9001,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}
        >
          {/* ── Close button ── */}
          <button
            onClick={onClose}
            aria-label="Close profile popup"
            style={{
              position: 'absolute', top: '16px', right: '16px',
              width: '24px', height: '24px',
              background: 'transparent',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              opacity: 0.7,
              zIndex: 2,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
          >
            <FiX size={24} color="rgba(255, 255, 255, 0.4)" />
          </button>

          {/* ── Loading State ── */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                border: '3px solid rgba(99,102,241,0.2)',
                borderTopColor: '#818cf8',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          )}

          {/* ── Error State ── */}
          {!loading && (error || !profile) && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '60px 32px', textAlign: 'center', gap: '12px',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FiAlertTriangle size={22} color="#f87171" />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Profile Not Found</div>
              <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '280px' }}>
                {error || 'This user does not exist or has been removed.'}
              </div>
              <button
                onClick={onClose}
                style={{
                  marginTop: '8px', padding: '8px 20px', borderRadius: '12px',
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                  color: '#818cf8', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          )}

          {/* ── Profile Content ── */}
          {!loading && profile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>

              {/* Profile Header Card */}
              <div style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                  {/* Avatar */}
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '10px',
                    overflow: 'hidden', flexShrink: 0,
                    border: '1px solid var(--S1, rgba(73, 178, 101, 1))',
                  }}>
                    <img
                      src={profile.avatarUrl || `/avatars/avatar1.png`}
                      alt={profile.displayName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0' }}>
                    <div style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '2px'
                    }}>
                      <span style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontWeight: 600,
                        fontSize: '28px',
                        lineHeight: '120%',
                        color: 'rgba(255, 255, 255, 1)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%',
                        display: 'block'
                      }}>
                        {profile.displayName}
                      </span>
                    </div>

                    {/* Badge row */}
                    <div style={{ width: '100%', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Rank — public only */}
                      {!profile.isPrivate && typeof profile.totalEarned !== 'undefined' && (() => {
                        const level = getLevelFromEarned(profile.totalEarned);
                        return level ? (
                          <VipBadge tier={level.tier} rank="" size="sm" style={{ width: '49px', height: '18px', padding: '0', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', boxSizing: 'border-box' }} />
                        ) : null;
                      })()}

                      {/* Joined */}
                      {profile.createdAt && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <img
                            src="/coins/caledar.png"
                            alt="calendar"
                            style={{
                              width: '15px',
                              height: '15px',
                              objectFit: 'contain'
                            }}
                          />
                          <div style={{
                            width: '71px',
                            height: '11px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <span style={{
                              fontFamily: '"Barlow Condensed", sans-serif',
                              fontWeight: 700,
                              fontSize: '16px',
                              lineHeight: '130%',
                              color: 'rgba(255, 255, 255, 1)',
                              whiteSpace: 'nowrap',
                              display: 'block'
                            }}>
                              Joined {new Date(profile.createdAt).getFullYear()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              {/* Private — earnings & history hidden */}
              {profile.isPrivate ? (
                <div style={{
                  width: '100%',
                  height: '131px',
                  borderRadius: '12px',
                  gap: '16px',
                  padding: '22px 12px',
                  background: 'rgba(0, 0, 0, 0.36)',
                  backdropFilter: 'blur(44px)',
                  WebkitBackdropFilter: 'blur(44px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}>
                  {/* Green Shield Icon */}
                  <img
                    src="/coins/privatesheild.png"
                    alt="Private Shield"
                    style={{
                      width: '54px',
                      height: '54px',
                      objectFit: 'contain'
                    }}
                  />
                  {/* Text */}
                  <div style={{
                    width: '444px',
                    height: '17px',
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 700,
                    fontSize: '14px',
                    lineHeight: '120%',
                    color: 'var(--S3, rgba(255, 255, 255, 1))',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    This profile is private.
                  </div>
                </div>
              ) : (
                <>
                  {/* Four Stats Boxes */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full flex-shrink-0">
                    {/* Box 1: Coin's Earned */}
                    <div className="flex flex-col justify-between items-start box-border rounded-[12px] p-3" style={{
                      background: 'rgba(0, 0, 0, 0.36)',
                      backdropFilter: 'blur(44px)',
                      WebkitBackdropFilter: 'blur(44px)',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{
                          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontSize: '13px', lineHeight: '110%', color: 'rgba(255, 255, 255, 0.9)', whiteSpace: 'nowrap',
                        }}>
                          Coin's Earned
                        </span>
                        <span style={{
                          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontSize: '10px', lineHeight: '110%', color: 'rgba(136, 136, 136, 1)', whiteSpace: 'nowrap', marginTop: '-2px',
                        }}>
                          This Month
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                        <img src="/coins/Coin.png" alt="coin" style={{ width: '16px', height: '16px' }} />
                        <div style={{
                          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '16px', lineHeight: '120%', backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)', WebkitBackgroundClip: 'text', color: 'transparent', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'visible',
                        }}>
                          {(profile.earningsThisMonth || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Box 2: Total Earning */}
                    <div className="flex flex-col justify-between items-start box-border rounded-[12px] p-3" style={{
                      background: 'rgba(0, 0, 0, 0.36)',
                      backdropFilter: 'blur(44px)',
                      WebkitBackdropFilter: 'blur(44px)',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{
                          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontSize: '13px', lineHeight: '110%', color: 'rgba(255, 255, 255, 0.9)', whiteSpace: 'nowrap',
                        }}>
                          Total Earning
                        </span>
                        <span style={{
                          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontSize: '10px', lineHeight: '110%', color: 'rgba(136, 136, 136, 1)', whiteSpace: 'nowrap', marginTop: '-2px',
                        }}>
                          All Time
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                        <img src="/coins/Coin.png" alt="coin" style={{ width: '16px', height: '16px' }} />
                        <div style={{
                          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '16px', lineHeight: '120%', backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)', WebkitBackgroundClip: 'text', color: 'transparent', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'visible',
                        }}>
                          {(profile.totalEarned || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Box 3: Referred Affiliates */}
                    <div className="flex flex-col justify-between items-start box-border rounded-[12px] p-3" style={{
                      background: 'rgba(0, 0, 0, 0.36)',
                      backdropFilter: 'blur(44px)',
                      WebkitBackdropFilter: 'blur(44px)',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                        <span className="truncate w-full" style={{
                          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontSize: '13px', lineHeight: '110%', color: 'rgba(255, 255, 255, 0.9)',
                        }}>
                          Referred Affiliates
                        </span>
                        <span style={{
                          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontSize: '10px', lineHeight: '110%', color: 'rgba(136, 136, 136, 1)', whiteSpace: 'nowrap', marginTop: '-2px',
                        }}>
                          All Time
                        </span>
                      </div>
                      <span style={{
                        fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '16px', lineHeight: '120%', color: 'rgba(73, 178, 101, 1)', display: 'flex', alignItems: 'center', marginTop: '8px',
                      }}>
                        {(profile.referredCount || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Box 4: Task Completed */}
                    <div className="flex flex-col justify-between items-start box-border rounded-[12px] p-3" style={{
                      background: 'rgba(0, 0, 0, 0.36)',
                      backdropFilter: 'blur(44px)',
                      WebkitBackdropFilter: 'blur(44px)',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                        <span className="truncate w-full" style={{
                          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontSize: '13px', lineHeight: '110%', color: 'rgba(255, 255, 255, 0.9)',
                        }}>
                          Task Completed
                        </span>
                        <span style={{
                          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontSize: '10px', lineHeight: '110%', color: 'rgba(136, 136, 136, 1)', whiteSpace: 'nowrap', marginTop: '-2px',
                        }}>
                          All Time
                        </span>
                      </div>
                      <span style={{
                        fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '16px', lineHeight: '120%', color: 'rgba(73, 178, 101, 1)', display: 'flex', alignItems: 'center', marginTop: '8px',
                      }}>
                        {(profile.tasksCompletedCount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Recent Activity — public profiles only */}
                  <div style={{
                    width: '100%',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    background: 'rgba(36, 36, 36, 1)',
                    border: 'none',
                    minHeight: 0
                  }}>
                    <div style={{
                      width: '100%', height: '19px',
                      fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '16px', lineHeight: '120%', color: 'rgba(255, 255, 255, 1)',
                      display: 'flex', alignItems: 'center'
                    }}>
                      Recent Activity
                    </div>

                    {recentOffers.length === 0 ? (
                      <div style={{
                        textAlign: 'center', padding: '32px 0',
                        color: '#64748b', fontSize: '13px',
                      }}>
                        No recent activity found.
                      </div>
                    ) : (() => {
                      const totalPages = Math.ceil(recentOffers.length / ITEMS_PER_PAGE);
                      const start = (activityPage - 1) * ITEMS_PER_PAGE;
                      const pageOffers = recentOffers.slice(start, start + ITEMS_PER_PAGE);
                      return (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                            {pageOffers.map((offer) => {
                            const desc = offer.description || '';
                            let heading = desc;
                            let subText = '';
                            if (desc.includes(':')) {
                              const parts = desc.split(':');
                              heading = parts[0].trim();
                              subText = 'Task: ' + parts.slice(1).join(':').trim();
                            } else {
                              heading = offer.amount < 0 ? 'Payout processed' : 'Reward for completing task';
                              subText = desc ? `Task: ${desc}` : (offer.amount < 0 ? 'PayPal' : 'System bonus');
                            }

                            return (
                              <div
                                key={offer._id}
                                style={{
                                  width: '100%', height: 'auto',
                                  display: 'flex', alignItems: 'center',
                                  justifyContent: 'space-between', gap: '8px',
                                  padding: '10px 12px', borderRadius: '12px',
                                  background: 'rgba(0, 0, 0, 0.36)',
                                  backdropFilter: 'blur(44px)',
                                  border: 'none',
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{
                                    width: '100%',
                                    fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '14px', lineHeight: '120%', color: 'rgba(255, 255, 255, 1)',
                                    letterSpacing: '0.5px',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {heading}
                                  </div>
                                  <div style={{
                                    width: '100%',
                                    fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontSize: '11px', lineHeight: '130%', color: 'rgba(136, 136, 136, 1)',
                                    letterSpacing: '0.5px',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {subText}
                                  </div>
                                </div>
                                <div style={{ width: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <img src="/coins/Coin.png" alt="coin" style={{ width: '16px', height: '16px' }} />
                                    <div style={{
                                      fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '15px', lineHeight: '130%',
                                      backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                                      WebkitBackgroundClip: 'text', color: 'transparent'
                                    }}>
                                      {offer.amount > 0 ? '+' : ''}{(offer.amount || 0).toLocaleString()}
                                    </div>
                                  </div>
                                  <div style={{
                                    width: 'auto',
                                    fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 500, fontSize: '10px', lineHeight: '130%', textAlign: 'right', color: 'rgba(136, 136, 136, 1)',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {timeAgo(offer.createdAt)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          </div>

                          {/* Pagination Controls */}
                          {totalPages > 1 && (() => {
                            const visiblePages = [];
                            if (totalPages <= 3) {
                              for (let i = 1; i <= totalPages; i++) visiblePages.push(i);
                            } else {
                              let start = Math.min(activityPage, totalPages - 2);
                              visiblePages.push(start, start + 1, start + 2);
                            }

                            const CircleBtn = ({ active, disabled, onClick, children, isArrow }) => {
                              const isGreen = active;
                              return (
                                <button
                                  onClick={onClick}
                                  disabled={disabled}
                                  style={{
                                    width: '32px', height: '32px', borderRadius: '32px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    background: isGreen ? 'rgba(73, 178, 101, 1)' : (isArrow ? 'transparent' : 'rgba(255, 255, 255, 0.15)'),
                                    border: isArrow ? '1px solid rgba(73, 178, 101, 1)' : '1px solid transparent',
                                    color: isGreen || !isArrow ? '#fff' : 'rgba(73, 178, 101, 1)',
                                    fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '14px',
                                    cursor: disabled ? 'default' : 'pointer',
                                    opacity: disabled ? 0.3 : 1,
                                    padding: '10px',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  {children}
                                </button>
                              );
                            };

                            return (
                              <div style={{
                                width: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                marginTop: '12px', paddingBottom: '8px'
                              }}>
                                <CircleBtn
                                  isArrow
                                  disabled={activityPage === 1}
                                  onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                                >
                                  <div style={{
                                    width: '16px', height: '16px',
                                    backgroundColor: 'rgba(73, 178, 101, 1)',
                                    WebkitMaskImage: 'url(/coins/leftarrow.png)',
                                    WebkitMaskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center',
                                    transform: 'rotate(180deg)'
                                  }} />
                                </CircleBtn>

                                {visiblePages.map(p => (
                                  <CircleBtn
                                    key={p}
                                    active={activityPage === p}
                                    onClick={() => setActivityPage(p)}
                                  >
                                    {p}
                                  </CircleBtn>
                                ))}

                                <CircleBtn
                                  isArrow
                                  disabled={activityPage === totalPages}
                                  onClick={() => setActivityPage(p => Math.min(totalPages, p + 1))}
                                >
                                  <div style={{
                                    width: '16px', height: '16px',
                                    backgroundColor: 'rgba(73, 178, 101, 1)',
                                    WebkitMaskImage: 'url(/coins/leftarrow.png)',
                                    WebkitMaskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center',
                                    transform: 'rotate(0deg)'
                                  }} />
                                </CircleBtn>
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}

            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PublicProfileModal;
