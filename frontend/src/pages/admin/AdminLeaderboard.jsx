import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiTrendingUp, FiToggleLeft, FiToggleRight, FiSave, FiRotateCcw, FiClock, FiChevronDown, FiChevronUp, FiAlertCircle, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CoinDisplay from '../../components/CoinDisplay';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PERIOD_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const PERIOD_COLORS = {
  daily:   { bg: '#F8FAFC', border: '#E2E8F0', accent: '#4F46E5', lightAccent: '#EEF2FF' },
  weekly:  { bg: '#F8FAFC', border: '#E2E8F0', accent: '#059669', lightAccent: '#ECFDF5' },
  monthly: { bg: '#F8FAFC', border: '#E2E8F0', accent: '#D97706', lightAccent: '#FFFBEB' },
};

const PERIOD_DESCRIPTIONS = {
  daily:   'Resets every day at midnight UTC. Ranks users by coins earned that day.',
  weekly:  'Resets every Monday at midnight UTC. Ranks users by coins earned that week.',
  monthly: 'Resets on the 1st of each month at midnight UTC. Ranks users by coins earned that month.',
};

function PeriodCard({ period, config, onSave, onReset, saving, resetting }) {
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'next'
  const colors = PERIOD_COLORS[period];

  const [liveLocal, setLiveLocal] = useState({
    enabled: config.enabled,
    visibleSlots: config.visibleSlots,
    rewardedRanks: config.rewardedRanks,
    rewardTiers: config.rewardTiers,
  });

  const [nextLocal, setNextLocal] = useState({
    isScheduled: config.nextConfig?.isScheduled || false,
    visibleSlots: config.nextConfig?.visibleSlots || config.visibleSlots,
    rewardedRanks: config.nextConfig?.rewardedRanks || config.rewardedRanks,
    rewardTiers: config.nextConfig?.rewardTiers || config.rewardTiers,
  });

  useEffect(() => {
    setLiveLocal({
      enabled: config.enabled,
      visibleSlots: config.visibleSlots,
      rewardedRanks: config.rewardedRanks,
      rewardTiers: config.rewardTiers,
    });
    setNextLocal({
      isScheduled: config.nextConfig?.isScheduled || false,
      visibleSlots: config.nextConfig?.visibleSlots || config.visibleSlots,
      rewardedRanks: config.nextConfig?.rewardedRanks || config.rewardedRanks,
      rewardTiers: config.nextConfig?.rewardTiers || config.rewardTiers,
    });
  }, [config]);

  const isLiveDirty = JSON.stringify(liveLocal) !== JSON.stringify({
    enabled: config.enabled,
    visibleSlots: config.visibleSlots,
    rewardedRanks: config.rewardedRanks,
    rewardTiers: config.rewardTiers,
  });
  
  const isNextDirty = JSON.stringify(nextLocal) !== JSON.stringify({
    isScheduled: config.nextConfig?.isScheduled || false,
    visibleSlots: config.nextConfig?.visibleSlots || config.visibleSlots,
    rewardedRanks: config.nextConfig?.rewardedRanks || config.rewardedRanks,
    rewardTiers: config.nextConfig?.rewardTiers || config.rewardTiers,
  });

  const local = activeTab === 'live' ? liveLocal : nextLocal;
  const setLocal = activeTab === 'live' ? setLiveLocal : setNextLocal;
  const set = (key, val) => setLocal(prev => ({ ...prev, [key]: val }));
  
  const isDirty = activeTab === 'live' ? isLiveDirty : isNextDirty;

  const handleSaveClick = () => {
    if (activeTab === 'live') {
      onSave(period, { ...liveLocal });
    } else {
      const updatedNext = { ...nextLocal, isScheduled: true };
      setNextLocal(updatedNext);
      onSave(period, { nextConfig: updatedNext });
    }
  };

  const handleCancelNext = () => {
    if (window.confirm('Cancel the scheduled next cycle update?')) {
      const updatedNext = { ...nextLocal, isScheduled: false };
      setNextLocal(updatedNext);
      onSave(period, { nextConfig: updatedNext });
    }
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0E0F0C', fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.accent }} />
            {PERIOD_LABELS[period]} Leaderboard
          </h3>
          <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0', maxWidth: '360px', lineHeight: 1.5 }}>
            {PERIOD_DESCRIPTIONS[period]}
          </p>
        </div>
        {/* Toggle (Always affects live config) */}
        <button
          onClick={() => {
            const newVal = !liveLocal.enabled;
            setLiveLocal(prev => ({ ...prev, enabled: newVal }));
            onSave(period, { ...liveLocal, enabled: newVal });
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: liveLocal.enabled ? colors.accent : '#9CA3AF',
            fontSize: '36px', transition: 'color 0.2s', padding: 0,
            display: 'flex', alignItems: 'center',
          }}
          title={liveLocal.enabled ? 'Click to disable' : 'Click to enable'}
        >
          {liveLocal.enabled ? <FiToggleRight /> : <FiToggleLeft />}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #F3F4F6', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('live')}
          style={{
            background: 'none', border: 'none', color: activeTab === 'live' ? '#1E2538' : '#6B7280',
            fontSize: '13px', fontWeight: 700, padding: '8px 4px', cursor: 'pointer',
            borderBottom: activeTab === 'live' ? '2px solid #1E2538' : '2px solid transparent',
          }}
        >
          Live Setup
        </button>
        <button
          onClick={() => setActiveTab('next')}
          style={{
            background: 'none', border: 'none', color: activeTab === 'next' ? '#1E2538' : '#6B7280',
            fontSize: '13px', fontWeight: 700, padding: '8px 4px', cursor: 'pointer',
            borderBottom: activeTab === 'next' ? '2px solid #1E2538' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          Next Cycle Setup
          {config.nextConfig?.isScheduled && (
            <span style={{ background: '#1E2538', color: '#FFFFFF', padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: 800 }}>SCHEDULED</span>
          )}
        </button>
      </div>

      {activeTab === 'live' && (
        <div style={{ marginBottom: '20px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
            background: liveLocal.enabled ? '#ECFDF5' : '#F3F4F6',
            color: liveLocal.enabled ? '#059669' : '#6B7280',
            border: `1px solid ${liveLocal.enabled ? '#A7F3D0' : '#E5E7EB'}`,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {liveLocal.enabled ? '● ACTIVE' : '○ DISABLED'}
          </span>
        </div>
      )}

      {activeTab === 'next' && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: '#4B5563', background: '#F9FAFB', padding: '12px', borderRadius: '10px', border: '1px solid #E5E7EB', margin: 0 }}>
            These settings will automatically become active on the next <strong>{PERIOD_LABELS[period]}</strong> reset.
          </p>
        </div>
      )}

      {/* Visible Slots control */}
      <div style={{ marginBottom: '20px', maxWidth: '280px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6B7280', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <FiEye style={{ fontSize: '13px' }} /> Visible Ranks
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '10px', padding: '8px 12px' }}>
          <input
            type="number"
            min="5"
            max="100"
            value={local.visibleSlots || 25}
            onChange={e => set('visibleSlots', Number(e.target.value))}
            style={{ background: 'none', border: 'none', outline: 'none', color: '#0E0F0C', fontSize: '14px', fontWeight: 600, width: '100%', fontFamily: "'Barlow', system-ui, sans-serif", fontFeatureSettings: "'zero' 0", fontVariantNumeric: 'normal' }}
          />
          <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 700, whiteSpace: 'nowrap' }}>RANKS</span>
        </div>
        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0' }}>How many ranks users will see on the leaderboard</p>
      </div>

      {/* Rewarded Ranks control */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6B7280', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          🏆 Rewarded Ranks
        </label>
        <div style={{ maxWidth: '280px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '10px', padding: '8px 12px', marginBottom: '12px' }}>
          <input
            type="number"
            min="0"
            max="100"
            value={local.rewardedRanks !== undefined ? local.rewardedRanks : 3}
            onChange={e => {
              const count = Number(e.target.value);
              set('rewardedRanks', count);
              const newTiers = [...(local.rewardTiers || [])];
              if (newTiers.length < count) {
                while (newTiers.length < count) newTiers.push(0);
              } else if (newTiers.length > count) {
                newTiers.length = count;
              }
              set('rewardTiers', newTiers);
            }}
            style={{ background: 'none', border: 'none', outline: 'none', color: '#0E0F0C', fontSize: '14px', fontWeight: 600, width: '100%', fontFamily: "'Barlow', system-ui, sans-serif", fontFeatureSettings: "'zero' 0", fontVariantNumeric: 'normal' }}
          />
          <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 700, whiteSpace: 'nowrap' }}>RANKS</span>
        </div>
        
        {/* Dynamic Reward Tiers */}
        {(local.rewardedRanks || 0) > 0 && (
          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {Array.from({ length: local.rewardedRanks || 0 }).map((_, idx) => (
              <div key={idx}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4B5563', fontWeight: 600, marginBottom: '4px' }}>Rank #{idx + 1} Reward</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '6px 10px' }}>
                  <input
                    type="number"
                    min="0"
                    value={local.rewardTiers?.[idx] || 0}
                    onChange={e => {
                      const newTiers = [...(local.rewardTiers || [])];
                      newTiers[idx] = Number(e.target.value);
                      set('rewardTiers', newTiers);
                    }}
                    style={{ background: 'none', border: 'none', outline: 'none', color: '#0E0F0C', fontSize: '13px', fontWeight: 700, width: '100%', fontFamily: "'Barlow', system-ui, sans-serif", fontFeatureSettings: "'zero' 0", fontVariantNumeric: 'normal' }}
                  />
                  <CoinDisplay amount={local.rewardTiers?.[idx] || 0} size={10} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={handleSaveClick}
          disabled={!isDirty || saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
            background: isDirty && !saving ? '#1E2538' : '#F3F4F6',
            color: isDirty && !saving ? '#FFFFFF' : '#9CA3AF',
            border: 'none', cursor: isDirty && !saving ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            boxShadow: isDirty && !saving ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
          }}
        >
          <FiSave style={{ fontSize: '14px' }} />
          {saving ? 'Saving…' : activeTab === 'live' ? 'Apply Instantly' : 'Schedule for Next Period'}
        </button>

        {activeTab === 'next' && config.nextConfig?.isScheduled && (
          <button
            onClick={handleCancelNext}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
              background: '#FEF2F2', color: '#DC2626',
              border: '1px solid #FECACA', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Cancel Scheduled Update
          </button>
        )}

        {activeTab === 'live' && (
          <button
            onClick={() => onReset(period)}
            disabled={resetting}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
              background: '#FEF2F2', color: resetting ? '#9CA3AF' : '#DC2626',
              border: '1px solid #FECACA', cursor: resetting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <FiRotateCcw style={{ fontSize: '14px', animation: resetting ? 'spin 1s linear infinite' : 'none' }} />
            {resetting ? 'Resetting…' : 'Manual Reset'}
          </button>
        )}
      </div>
    </div>
  );
}

function HistoryTable({ history, loading }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Loading history…</div>
  );
  if (!history.length) return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280', fontSize: '14px' }}>
      No completed cycles yet. Enable a period and wait for the reset.
    </div>
  );

  const periodColor = { daily: '#4F46E5', weekly: '#059669', monthly: '#D97706' };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {['Period', 'Cycle End', 'Top Earner', 'Participants', 'Details'].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map(cycle => {
            const topWinner = cycle.winners?.[0];
            const isExpanded = expanded[cycle._id];

            return (
              <tr key={cycle._id} style={{ verticalAlign: 'top' }}>
                <td style={{ color: periodColor[cycle.period], fontWeight: 700, textTransform: 'capitalize' }}>{cycle.period}</td>
                <td style={{ color: '#6B7280', fontFamily: "'Barlow', system-ui, sans-serif", fontFeatureSettings: "'zero' 0", fontSize: '12px' }}>
                  {new Date(cycle.cycleEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC
                </td>
                <td style={{ color: '#0E0F0C' }}>
                  {topWinner ? (
                    <div>
                      <div style={{ fontWeight: 600 }}>🥇 {topWinner.displayName}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><CoinDisplay amount={topWinner.coinsEarned || 0} size={11} /></div>
                    </div>
                  ) : <span style={{ color: '#9CA3AF' }}>—</span>}
                </td>
                <td style={{ color: '#6B7280' }}>{cycle.winners?.length || 0}</td>
                <td>
                  <button
                    onClick={() => toggle(cycle._id)}
                    style={{
                      background: '#F3F4F6', border: '1px solid #E5E7EB',
                      borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
                      color: '#374151', fontSize: '11px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    {isExpanded ? 'Hide' : 'View'} {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  {isExpanded && cycle.winners?.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {cycle.winners.map(w => (
                        <div key={w.rank} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', padding: '4px 8px', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: '6px' }}>
                          <span style={{ fontWeight: 700, color: periodColor[cycle.period], minWidth: '24px' }}>#{w.rank}</span>
                          <span style={{ color: '#0E0F0C', flex: 1, fontWeight: 500 }}>{w.displayName}</span>
                          <span style={{ color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><CoinDisplay amount={w.coinsEarned || 0} size={11} /></span>
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
        <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiTrendingUp style={{ color: '#4F46E5' }} />
          Leaderboard Management
        </h1>
        <p className="admin-page-sub">
          Enable/disable leaderboard periods and control how many ranks users see.
        </p>
      </div>

      {/* Info banner */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '14px', padding: '14px 18px', marginBottom: '28px' }}>
        <FiAlertCircle style={{ color: '#4F46E5', marginTop: '2px', flexShrink: 0 }} />
        <p style={{ color: '#3730A3', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
          Rankings are based on total coins earned during each period. <strong style={{ color: '#1E1B4B' }}>Daily</strong> resets every midnight UTC, <strong style={{ color: '#1E1B4B' }}>Weekly</strong> every Monday, <strong style={{ color: '#1E1B4B' }}>Monthly</strong> on the 1st. Use <strong style={{ color: '#1E1B4B' }}>Visible Ranks</strong> to control how many positions users see.
        </p>
      </div>

      {/* Period cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>Loading configuration…</div>
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
          padding: '12px 20px', borderRadius: '14px',
          background: '#FFFFFF', border: '1px solid #E5E7EB',
          color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px', width: '100%',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiClock style={{ color: '#D97706' }} />
          Past Cycle History
        </span>
        {showHistory ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      {showHistory && (
        <div className="admin-table-container">
          <HistoryTable history={history} loading={historyLoading} />
        </div>
      )}
    </div>
  );
};

export default AdminLeaderboard;

