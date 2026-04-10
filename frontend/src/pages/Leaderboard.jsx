import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiTrendingUp, FiAward, FiLock, FiRefreshCw
} from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const PERIOD_META = {
  daily: {
    label: 'Daily',
    color: '#818cf8',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.2)',
    description: 'Resets every midnight UTC',
  },
  weekly: {
    label: 'Weekly',
    color: '#34d399',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    description: 'Resets every Monday midnight UTC',
  },
  monthly: {
    label: 'Monthly',
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    description: 'Resets on the 1st of each month',
  },
  allTime: {
    label: 'All Time',
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.2)',
    description: 'Top earners of all time',
  },
};

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#fbbf24', '#94a3b8', '#cd7c3f'];

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(targetIso) {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    if (!targetIso) return;
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) { setDisplay('Resetting…'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(
        d > 0
          ? `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`
          : `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return display;
}

// ─── Single leaderboard row ───────────────────────────────────────────────────
function RankRow({ entry, rank, currentUserId, color }) {
  const isMe = entry.userId === currentUserId || entry.userId?.toString() === currentUserId?.toString();
  const medal = rank <= 3 ? MEDALS[rank - 1] : null;
  const medalColor = rank <= 3 ? MEDAL_COLORS[rank - 1] : color;

  return (
    <motion.div
      variants={item}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '12px 16px', borderRadius: '12px',
        background: isMe ? `${color}12` : rank <= 3 ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: isMe ? `1px solid ${color}30` : rank <= 3 ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'background 0.2s',
      }}
    >
      {/* Rank badge */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        background: rank <= 3 ? `${medalColor}15` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${rank <= 3 ? `${medalColor}30` : 'rgba(255,255,255,0.06)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: rank <= 3 ? '18px' : '13px',
        color: rank <= 3 ? medalColor : '#64748b', fontWeight: 700,
      }}>
        {medal || `#${rank}`}
      </div>

      {/* Avatar */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        background: `${color}20`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        <img
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.displayName}`}
          alt={entry.displayName}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>

      {/* Name + coins */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: 600,
          color: isMe ? color : '#e2e8f0',
          display: 'flex', alignItems: 'center', gap: '6px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {entry.displayName}
          {isMe && (
            <span style={{
              fontSize: '10px', padding: '1px 8px', borderRadius: '20px',
              background: `${color}20`, color, border: `1px solid ${color}30`,
              fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0,
            }}>YOU</span>
          )}
        </div>
      </div>

      {/* Coins earned */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: rank <= 3 ? medalColor : '#e2e8f0', fontFamily: 'monospace' }}>
          {entry.coinsEarned.toLocaleString()}
        </div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>coins</div>
      </div>
    </motion.div>
  );
}

// ─── Period panel ─────────────────────────────────────────────────────────────
function PeriodPanel({ period, data, currentUserId }) {
  const meta = PERIOD_META[period];
  const countdown = useCountdown(data?.cycleEnd);
  const rankings = data?.rankings || [];
  const myRankIdx = rankings.findIndex(r => r.userId === currentUserId || r.userId?.toString() === currentUserId?.toString());

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Period header */}
      <div style={{
        background: meta.bg, border: `1px solid ${meta.border}`,
        borderRadius: '16px 16px 0 0', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: meta.color }}>{meta.label} Leaderboard</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{meta.description}</div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Countdown */}
          {period !== 'allTime' && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Resets in</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: meta.color, fontFamily: 'monospace' }}>{countdown || '...'}</div>
            </div>
          )}

          {/* My rank */}
          {myRankIdx >= 0 && (
            <div style={{
              padding: '6px 16px', borderRadius: '10px',
              background: `${meta.color}15`, border: `1px solid ${meta.color}30`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Rank</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: meta.color }}>#{myRankIdx + 1}</div>
            </div>
          )}
        </div>
      </div>

      {/* Rankings list */}
      <div style={{
        background: 'rgba(255,255,255,0.015)', border: `1px solid ${meta.border}`,
        borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '16px',
      }}>
        {!rankings.length ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>
            No entries yet this period. Start earning to get on the board!
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {rankings.map((entry, i) => (
              <RankRow
                key={entry.userId}
                entry={entry}
                rank={i + 1}
                currentUserId={currentUserId}
                color={meta.color}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Main Leaderboard page ────────────────────────────────────────────────────
const Leaderboard = () => {
  const { currentUser, mongoUser } = useAuth();
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/api/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
        const first = ['allTime', 'daily', 'weekly', 'monthly'].find(p => data.leaderboard[p]?.enabled);
        if (first && !activeTab) setActiveTab(p => p || first);
      }
    } catch (err) {
      console.error('Leaderboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    fetchLeaderboard();
    const id = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(id);
  }, [fetchLeaderboard]);

  const enabledPeriods = leaderboard
    ? ['allTime', 'daily', 'weekly', 'monthly'].filter(p => leaderboard[p]?.enabled)
    : [];

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" style={{ paddingBottom: '60px' }}>

        {/* Page Header */}
        <motion.div variants={item} style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                border: '1px solid rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FiTrendingUp style={{ fontSize: '22px', color: '#818cf8' }} />
              </div>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: 0 }}>Leaderboard</h1>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Earn more coins to climb higher. Rankings refresh every period.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => { setLoading(true); fetchLeaderboard(); }}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '8px 16px', borderRadius: '12px', color: '#e2e8f0',
                fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <FiRefreshCw style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#818cf8',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : enabledPeriods.length === 0 ? (
          <motion.div variants={item} style={{
            textAlign: 'center', padding: '80px 40px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px',
          }}>
            <FiLock style={{ fontSize: '48px', color: '#374151', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#94a3b8', margin: '0 0 8px' }}>
              Leaderboard Coming Soon
            </h2>
            <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
              The leaderboard is not active yet. Check back soon!
            </p>
          </motion.div>
        ) : (
          <>
            {/* Period tabs */}
            <motion.div variants={item} style={{ marginBottom: '28px' }}>
              <div style={{
                display: 'flex', gap: '8px', padding: '6px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px', width: 'fit-content',
              }}>
                {enabledPeriods.map(period => {
                  const meta = PERIOD_META[period];
                  const isActive = activeTab === period;
                  return (
                    <button
                      key={period}
                      onClick={() => setActiveTab(period)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        background: isActive ? meta.bg : 'transparent',
                        color: isActive ? meta.color : '#64748b',
                        fontWeight: 700, fontSize: '14px', transition: 'all 0.2s',
                        outline: isActive ? `1px solid ${meta.border}` : 'none',
                      }}
                    >
                      <FiAward style={{ fontSize: '14px' }} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Active period content */}
            <AnimatePresence mode="wait">
              {activeTab && leaderboard[activeTab]?.enabled && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <PeriodPanel
                    period={activeTab}
                    data={leaderboard[activeTab]}
                    currentUserId={mongoUser?._id}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Leaderboard;
