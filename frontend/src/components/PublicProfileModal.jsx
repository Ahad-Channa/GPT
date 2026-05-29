import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiStar, FiClock, FiShield, FiAlertTriangle,
  FiAward, FiTrendingUp, FiZap, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import CoinIcon from './CoinIcon';

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
          style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'linear-gradient(160deg, #0c101b 0%, #111624 100%)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '24px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)',
            position: 'relative',
            zIndex: 9001,
          }}
        >
          {/* ── Close button ── */}
          <button
            onClick={onClose}
            aria-label="Close profile popup"
            style={{
              position: 'absolute', top: '16px', right: '16px',
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#94a3b8',
              transition: 'background 0.2s, color 0.2s',
              zIndex: 2,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <FiX size={16} />
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
            <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Profile Header Card */}
              <div style={{
                borderRadius: '18px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Decorative glows */}
                <div style={{
                  position: 'absolute', top: '-20px', right: '-20px',
                  width: '120px', height: '120px',
                  background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent)',
                  borderRadius: '50%', pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', bottom: '-20px', left: '-20px',
                  width: '80px', height: '80px',
                  background: 'radial-gradient(circle, rgba(168,85,247,0.12), transparent)',
                  borderRadius: '50%', pointerEvents: 'none',
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                  {/* Avatar */}
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    overflow: 'hidden', flexShrink: 0,
                    border: '2px solid rgba(99,102,241,0.25)',
                    background: '#1a2235',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}>
                    <img
                      src={profile.avatarUrl || `/avatars/avatar1.png`}
                      alt={profile.displayName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: '0' }}>
                    <div style={{
                      fontSize: '22px', fontWeight: 800, color: '#fff',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: '10px',
                    }}>
                      {profile.displayName}
                    </div>

                    {/* Badge row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {/* Total Earned — public only */}
                      {!profile.isPrivate && typeof profile.totalEarned !== 'undefined' && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '4px 10px', borderRadius: '8px',
                          background: 'rgba(245,158,11,0.10)',
                          border: '1px solid rgba(245,158,11,0.25)',
                          color: '#fbbf24', fontSize: '12px', fontWeight: 600,
                        }}>
                          <FiZap size={11} /> {(profile.totalEarned || 0).toLocaleString()} earned
                        </span>
                      )}

                      {/* Joined */}
                      {profile.createdAt && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          color: '#64748b', fontSize: '12px', fontWeight: 500,
                        }}>
                          <FiClock size={11} /> Joined {new Date(profile.createdAt).getFullYear()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Private — earnings & history hidden */}
              {profile.isPrivate ? (
                <div style={{
                  borderRadius: '18px', padding: '32px 24px',
                  background: 'rgba(99,102,241,0.04)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '12px', textAlign: 'center',
                }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: 'rgba(99,102,241,0.10)',
                    border: '1px solid rgba(99,102,241,0.20)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FiShield size={22} color="#818cf8" />
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Earnings are private</div>
                  <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '260px' }}>
                    This user has chosen to keep their offer history and earnings private.
                  </div>
                </div>
              ) : (
                /* Recent Activity — public profiles only */
                <div style={{
                  borderRadius: '18px',
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  padding: '20px',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    marginBottom: '16px',
                    fontSize: '14px', fontWeight: 700, color: '#fff',
                  }}>
                    <FiAward size={15} color="#fbbf24" /> Recent Activity
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pageOffers.map((offer) => (
                          <div
                            key={offer._id}
                            style={{
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between', gap: '12px',
                              padding: '10px 14px', borderRadius: '12px',
                              background: 'rgba(255,255,255,0.025)',
                              border: '1px solid rgba(255,255,255,0.05)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                              <div style={{
                                width: '34px', height: '34px', borderRadius: '10px',
                                background: 'rgba(16,185,129,0.10)',
                                border: '1px solid rgba(16,185,129,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}>
                                <FiTrendingUp size={14} color="#34d399" />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{
                                  fontSize: '13px', fontWeight: 600, color: '#e2e8f0',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {offer.description}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                  {timeAgo(offer.createdAt)}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', fontFamily: 'monospace' }}>
                                +{(offer.amount || 0).toLocaleString()}
                              </div>
                              <CoinIcon size={12} />
                            </div>
                          </div>
                        ))}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginTop: '8px', paddingTop: '8px',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                          }}>
                            <button
                              onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                              disabled={activityPage === 1}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '5px 10px', borderRadius: '8px',
                                background: activityPage === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.10)',
                                border: '1px solid ' + (activityPage === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.25)'),
                                color: activityPage === 1 ? '#374151' : '#818cf8',
                                fontSize: '12px', fontWeight: 600, cursor: activityPage === 1 ? 'default' : 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              <FiChevronLeft size={13} /> Prev
                            </button>

                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                              Page {activityPage} of {totalPages}
                            </span>

                            <button
                              onClick={() => setActivityPage(p => Math.min(totalPages, p + 1))}
                              disabled={activityPage === totalPages}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '5px 10px', borderRadius: '8px',
                                background: activityPage === totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.10)',
                                border: '1px solid ' + (activityPage === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.25)'),
                                color: activityPage === totalPages ? '#374151' : '#818cf8',
                                fontSize: '12px', fontWeight: 600, cursor: activityPage === totalPages ? 'default' : 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              Next <FiChevronRight size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PublicProfileModal;
