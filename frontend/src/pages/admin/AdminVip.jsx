import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TIER_STYLES, getLevelLabel } from '../../utils/vipLevels';
import VipBadge from '../../components/VipBadge';
import CoinDisplay from '../../components/CoinDisplay';
import { FiSave, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminVip = () => {
  const { currentUser } = useAuth();
  const [levels, setLevels]   = useState([]);
  const [inputs, setInputs]   = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch(`${API}/vip/admin/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLevels(data.levels);
        const init = {};
        for (const l of data.levels) {
          init[l.key] = {
            rewardAmount: l.rewardAmount ?? 0,
            threshold: l.threshold ?? 0,
          };
        }
        setInputs(init);
      }
    } catch {
      toast.error('Failed to load VIP config');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch(`${API}/vip/admin/config`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: inputs }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('VIP configuration saved!');
        fetchConfig();
      } else {
        toast.error(data.error || 'Save failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Opal'];

  const handleInputChange = (levelKey, field, value) => {
    setInputs(prev => ({
      ...prev,
      [levelKey]: { ...prev[levelKey], [field]: Number(value) }
    }));
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9' }}>VIP Rank Configuration</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Configure the required threshold and coin reward for each VIP level.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchConfig}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#94a3b8', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
            }}
          >
            <FiRefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 10,
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              border: '1px solid rgba(99,102,241,0.4)',
              color: 'white', cursor: saving ? 'wait' : 'pointer',
              fontSize: '0.82rem', fontWeight: 700,
              boxShadow: '0 0 16px rgba(99,102,241,0.35)',
            }}
          >
            <FiSave size={13} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading…</div>
      ) : (
        tiers.map(tierName => {
          const ts = TIER_STYLES[tierName];
          const tierLevels = levels.filter(l => l.tier === tierName);
          return (
            <div key={tierName} style={{
              marginBottom: 24,
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${ts.border}30`,
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              {/* Tier header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 20px',
                borderBottom: `1px solid ${ts.border}20`,
                background: `${ts.bg}`,
              }}>
                <VipBadge tier={tierName} rank={tierLevels[0]?.rank || ''} size="xs" />
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: ts.text, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {tierName} Tier
                </span>
              </div>

              {/* Level rows */}
              <div>
                {tierLevels.map((lvl, i) => (
                  <div key={lvl.key} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '14px 20px',
                    borderBottom: i < tierLevels.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <div style={{ width: 140, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <VipBadge tier={lvl.tier} rank={lvl.rank} size="xs" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>
                        {getLevelLabel(lvl)}
                      </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>Threshold:</label>
                      <input
                        id={`vip-threshold-${lvl.key}`}
                        type="number"
                        min={0}
                        step={1000}
                        value={inputs[lvl.key]?.threshold ?? 0}
                        onChange={e => handleInputChange(lvl.key, 'threshold', e.target.value)}
                        style={{
                          width: 120,
                          padding: '7px 12px',
                          borderRadius: 9,
                          border: `1px solid ${ts.border}40`,
                          background: `${ts.bg}`,
                          color: ts.text,
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          outline: 'none',
                          appearance: 'textfield',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>Reward coins:</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          id={`vip-reward-${lvl.key}`}
                          type="number"
                          min={0}
                          step={100}
                          value={inputs[lvl.key]?.rewardAmount ?? 0}
                          onChange={e => handleInputChange(lvl.key, 'rewardAmount', e.target.value)}
                          style={{
                            width: 120,
                            padding: '7px 12px',
                            borderRadius: 9,
                            border: `1px solid ${ts.border}40`,
                            background: `${ts.bg}`,
                            color: ts.text,
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            outline: 'none',
                            appearance: 'textfield',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#475569', minWidth: 60 }}>
                        {(inputs[lvl.key]?.rewardAmount > 0) ? `= $${((inputs[lvl.key]?.rewardAmount || 0) / 1000).toFixed(2)}` : '(none)'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminVip;
