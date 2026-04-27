import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiTrendingUp, FiToggleLeft, FiToggleRight, FiSave, FiRotateCcw, FiClock, FiChevronDown, FiChevronUp, FiAlertCircle, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PERIOD_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const PERIOD_COLORS = {
  daily:   { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)',  accent: '#818cf8' },
  weekly:  { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)', accent: '#34d399' },
  monthly: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', accent: '#fbbf24' },
};

const PERIOD_DESCRIPTIONS = {
  daily:   'Resets every day at midnight UTC. Ranks users by coins earned that day.',
  weekly:  'Resets every Monday at midnight UTC. Ranks users by coins earned that week.',
  monthly: 'Resets on the 1st of each month at midnight UTC. Ranks users by coins earned that month.',
};

function PeriodCard({ period, config, onSave, onReset, saving, resetting }) {
  const [local, setLocal] = useState({ ...config });
  const colors = PERIOD_COLORS[period];
  const isDirty = JSON.stringify(local) !== JSON.stringify(config);

  useEffect(() => setLocal({ ...config }), [config]);

  const set = (key, val) => setLocal(prev => ({ ...prev, [key]: val }));

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: '16px',
      padding: '24px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: colors.accent, margin: 0 }}>
            {PERIOD_LABELS[period]} Leaderboard
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', maxWidth: '360px', lineHeight: 1.5 }}>
            {PERIOD_DESCRIPTIONS[period]}
          </p>
        </div>
        {/* Toggle */}
        <button
          onClick={() => {
            const newVal = !local.enabled;
            set('enabled', newVal);
            onSave(period, { ...local, enabled: newVal });
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: local.enabled ? colors.accent : '#374151',
            fontSize: '36px', transition: 'color 0.2s', padding: 0,
            display: 'flex', alignItems: 'center',
          }}
          title={local.enabled ? 'Click to disable' : 'Click to enable'}
        >
          {local.enabled ? <FiToggleRight /> : <FiToggleLeft />}
        </button>
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: '20px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
          background: local.enabled ? `${colors.accent}20` : 'rgba(100,116,139,0.15)',
          color: local.enabled ? colors.accent : '#64748b',
          border: `1px solid ${local.enabled ? `${colors.accent}40` : 'rgba(100,116,139,0.2)'}`,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {local.enabled ? '● ACTIVE' : '○ DISABLED'}
        </span>
      </div>

      {/* Visible Slots control */}
      <div style={{ marginBottom: '20px', maxWidth: '280px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <FiEye style={{ fontSize: '13px' }} /> Visible Ranks
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 12px' }}>
          <input
            type="number"
            min="5"
            max="100"
            value={local.visibleSlots || 25}
            onChange={e => set('visibleSlots', Number(e.target.value))}
            style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', fontWeight: 600, width: '100%', fontFamily: "'Inter', system-ui, sans-serif", fontFeatureSettings: "'zero' 0", fontVariantNumeric: 'normal' }}
          />
          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>RANKS</span>
        </div>
        <p style={{ fontSize: '10px', color: '#475569', margin: '4px 0 0' }}>How many ranks users will see on the leaderboard (e.g. 5, 20, 25)</p>
      </div>

      {/* Rewarded Ranks control */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🏆 Rewarded Ranks
        </label>
        <div style={{ maxWidth: '280px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 12px', marginBottom: '12px' }}>
          <input
            type="number"
            min="0"
            max="100"
            value={local.rewardedRanks !== undefined ? local.rewardedRanks : 3}
            onChange={e => {
              const count = Number(e.target.value);
              set('rewardedRanks', count);
              // Ensure rewardTiers array size matches
              const newTiers = [...(local.rewardTiers || [])];
              if (newTiers.length < count) {
                while (newTiers.length < count) newTiers.push(0);
              } else if (newTiers.length > count) {
                newTiers.length = count;
              }
              set('rewardTiers', newTiers);
            }}
            style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', fontWeight: 600, width: '100%', fontFamily: "'Inter', system-ui, sans-serif", fontFeatureSettings: "'zero' 0", fontVariantNumeric: 'normal' }}
          />
          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>RANKS</span>
        </div>
        
        {/* Dynamic Reward Tiers */}
        {(local.rewardedRanks || 0) > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {Array.from({ length: local.rewardedRanks || 0 }).map((_, idx) => (
              <div key={idx}>
                <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Rank #{idx + 1} Reward</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 10px' }}>
                  <input
                    type="number"
                    min="0"
                    value={local.rewardTiers?.[idx] || 0}
                    onChange={e => {
                      const newTiers = [...(local.rewardTiers || [])];
                      newTiers[idx] = Number(e.target.value);
                      set('rewardTiers', newTiers);
                    }}
                    style={{ background: 'none', border: 'none', outline: 'none', color: '#fbbf24', fontSize: '13px', fontWeight: 600, width: '100%', fontFamily: "'Inter', system-ui, sans-serif", fontFeatureSettings: "'zero' 0", fontVariantNumeric: 'normal' }}
                  />
                  <span style={{ fontSize: '9px', color: '#64748b' }}>COINS</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onSave(period, local)}
          disabled={!isDirty || saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
            background: isDirty && !saving ? colors.accent : 'rgba(255,255,255,0.05)',
            color: isDirty && !saving ? '#fff' : '#475569',
            border: 'none', cursor: isDirty && !saving ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          <FiSave style={{ fontSize: '14px' }} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <button
          onClick={() => onReset(period)}
          disabled={resetting}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
            background: 'rgba(239,68,68,0.08)', color: resetting ? '#475569' : '#f87171',
            border: '1px solid rgba(239,68,68,0.2)', cursor: resetting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <FiRotateCcw style={{ fontSize: '14px', animation: resetting ? 'spin 1s linear infinite' : 'none' }} />
          {resetting ? 'Resetting…' : 'Manual Reset'}
        </button>
      </div>
    </div>
  );
}

function HistoryTable({ history, loading }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading history…</div>
  );
  if (!history.length) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>
      No completed cycles yet. Enable a period and wait for the reset.
    </div>
  );

  const periodColor = { daily: '#818cf8', weekly: '#34d399', monthly: '#fbbf24' };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Period', 'Cycle End', 'Top Earner', 'Participants', 'Details'].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map(cycle => {
            const topWinner = cycle.winners?.[0];
            const isExpanded = expanded[cycle._id];

            return (
              <tr key={cycle._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top' }}>
                <td style={{ padding: '12px', color: periodColor[cycle.period], fontWeight: 700, textTransform: 'capitalize' }}>{cycle.period}</td>
                <td style={{ padding: '12px', color: '#94a3b8', fontFamily: "'Inter', system-ui, sans-serif", fontFeatureSettings: "'zero' 0", fontSize: '12px' }}>
                  {new Date(cycle.cycleEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC
                </td>
                <td style={{ padding: '12px', color: '#e2e8f0' }}>
                  {topWinner ? (
                    <div>
                      <div style={{ fontWeight: 600 }}>🥇 {topWinner.displayName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontFamily: "'Inter', system-ui, sans-serif", fontFeatureSettings: "'zero' 0" }}>{topWinner.coinsEarned?.toLocaleString()} coins</div>
                    </div>
                  ) : <span style={{ color: '#374151' }}>—</span>}
                </td>
                <td style={{ padding: '12px', color: '#94a3b8' }}>{cycle.winners?.length || 0}</td>
                <td style={{ padding: '12px' }}>
                  <button
                    onClick={() => toggle(cycle._id)}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
                      color: '#94a3b8', fontSize: '11px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    {isExpanded ? 'Hide' : 'View'} {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  {isExpanded && cycle.winners?.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {cycle.winners.map(w => (
                        <div key={w.rank} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <span style={{ fontWeight: 700, color: periodColor[cycle.period], minWidth: '24px' }}>#{w.rank}</span>
                          <span style={{ color: '#e2e8f0', flex: 1 }}>{w.displayName}</span>
                          <span style={{ color: '#64748b', fontFamily: "'Inter', system-ui, sans-serif", fontFeatureSettings: "'zero' 0" }}>{w.coinsEarned?.toLocaleString()} coins</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const AdminLeaderboard = () => {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [resetting, setResetting] = useState({});
  const [showHistory, setShowHistory] = useState(false);

  const getToken = useCallback(() => currentUser?.getIdToken(), [currentUser]);

  const fetchConfig = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/admin/leaderboard-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setConfig(data.leaderboardConfig);
    } catch (err) {
      toast.error('Failed to load leaderboard config');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/admin/leaderboard-history?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setHistory(data.cycles);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchConfig(); fetchHistory(); }, [fetchConfig, fetchHistory]);

  const handleSave = async (period, values) => {
    setSaving(prev => ({ ...prev, [period]: true }));
    try {
      const token = await getToken();
      const res = await fetch(`${API}/admin/leaderboard-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [period]: values }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.leaderboardConfig);
        toast.success(`${PERIOD_LABELS[period]} leaderboard saved`);
      } else toast.error(data.error || 'Save failed');
    } catch (err) {
      toast.error('Network error');
    } finally {
      setSaving(prev => ({ ...prev, [period]: false }));
    }
  };

  const handleReset = async (period) => {
    if (!window.confirm(`Manually reset the ${period} leaderboard? This will snapshot current rankings and start a new cycle.`)) return;
    setResetting(prev => ({ ...prev, [period]: true }));
    try {
      const token = await getToken();
      const res = await fetch(`${API}/admin/leaderboard-reset/${period}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${PERIOD_LABELS[period]} leaderboard reset`);
        fetchHistory();
      } else toast.error(data.result?.reason || data.error || 'Reset failed');
    } catch (err) {
      toast.error('Network error');
    } finally {
      setResetting(prev => ({ ...prev, [period]: false }));
    }
  };

  return (
    <div style={{ padding: '0 0 60px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiTrendingUp style={{ color: '#818cf8' }} />
          Leaderboard Management
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
          Enable/disable leaderboard periods and control how many ranks users see.
        </p>
      </div>

      {/* Info banner */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '14px 18px', marginBottom: '28px' }}>
        <FiAlertCircle style={{ color: '#818cf8', marginTop: '2px', flexShrink: 0 }} />
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
          Rankings are based on total coins earned during each period. <strong style={{ color: '#c7d2fe' }}>Daily</strong> resets every midnight UTC, <strong style={{ color: '#c7d2fe' }}>Weekly</strong> every Monday, <strong style={{ color: '#c7d2fe' }}>Monthly</strong> on the 1st. Use <strong style={{ color: '#c7d2fe' }}>Visible Ranks</strong> to control how many positions users see.
        </p>
      </div>

      {/* Period cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading configuration…</div>
      ) : (
        <div style={{ display: 'grid', gap: '20px', marginBottom: '40px' }}>
          {['daily', 'weekly', 'monthly'].map(period => (
            <PeriodCard
              key={period}
              period={period}
              config={config?.[period] || { enabled: false, visibleSlots: 25 }}
              onSave={handleSave}
              onReset={handleReset}
              saving={saving[period]}
              resetting={resetting[period]}
            />
          ))}
        </div>
      )}

      {/* History toggle */}
      <button
        onClick={() => setShowHistory(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 20px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#94a3b8', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px', width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiClock style={{ color: '#fbbf24' }} />
          Past Cycle History
        </span>
        {showHistory ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      {showHistory && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
          <HistoryTable history={history} loading={historyLoading} />
        </div>
      )}
    </div>
  );
};

export default AdminLeaderboard;
