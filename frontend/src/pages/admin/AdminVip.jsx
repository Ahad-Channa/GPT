import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TIER_STYLES, getLevelLabel } from '../../utils/vipLevels';
import VipBadge from '../../components/VipBadge';
import { FiSave, FiRefreshCw, FiAward } from 'react-icons/fi';
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
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiAward style={{ color: '#EAB308' }} />
            VIP Rank Configuration
          </h1>
          <p className="admin-page-sub">
            Configure the required threshold and coin reward for each VIP level.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchConfig}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all border border-gray-200 shadow-sm"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 12,
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
            }}
          >
            <FiRefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="admin-btn-primary"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 12,
              cursor: saving ? 'wait' : 'pointer',
              fontSize: '0.82rem', fontWeight: 700,
            }}
          >
            <FiSave size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>Loading…</div>
      ) : (
        tiers.map(tierName => {
          const ts = TIER_STYLES[tierName];
          const tierLevels = levels.filter(l => l.tier === tierName);
          return (
            <div key={tierName} style={{
              marginBottom: 24,
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
            }}>
              {/* Tier header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 20px',
                borderBottom: '1px solid #F3F4F6',
                background: '#F9FAFB',
              }}>
                <VipBadge tier={tierName} rank={tierLevels[0]?.rank || ''} size="xs" />
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0E0F0C', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {tierName} Tier
                </span>
              </div>

              {/* Level rows */}
              <div>
                {tierLevels.map((lvl, i) => (
                  <div key={lvl.key} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '14px 20px',
                    borderBottom: i < tierLevels.length - 1 ? '1px solid #F3F4F6' : 'none',
                    background: '#FFFFFF',
                  }}>
                    <div style={{ width: 150, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <VipBadge tier={lvl.tier} rank={lvl.rank} size="xs" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0E0F0C' }}>
                        {getLevelLabel(lvl)}
                      </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Threshold:</label>
                      <input
                        id={`vip-threshold-${lvl.key}`}
                        type="number"
                        min={0}
                        step={1000}
                        value={inputs[lvl.key]?.threshold ?? 0}
                        onChange={e => handleInputChange(lvl.key, 'threshold', e.target.value)}
                        style={{
                          width: 140,
                          padding: '7px 12px',
                          borderRadius: 10,
                          border: '1px solid #D1D5DB',
                          background: '#FFFFFF',
                          color: '#0E0F0C',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          outline: 'none',
                          appearance: 'textfield',
                          fontFamily: "'Barlow', system-ui, sans-serif",
                          fontFeatureSettings: "'zero' 0",
                          fontVariantNumeric: 'normal',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Reward coins:</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          id={`vip-reward-${lvl.key}`}
                          type="number"
                          min={0}
                          step={100}
                          value={inputs[lvl.key]?.rewardAmount ?? 0}
                          onChange={e => handleInputChange(lvl.key, 'rewardAmount', e.target.value)}
                          style={{
                            width: 140,
                            padding: '7px 12px',
                            borderRadius: 10,
                            border: '1px solid #D1D5DB',
                            background: '#FFFFFF',
                            color: '#0E0F0C',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            outline: 'none',
                            appearance: 'textfield',
                            fontFamily: "'Barlow', system-ui, sans-serif",
                            fontFeatureSettings: "'zero' 0",
                            fontVariantNumeric: 'normal',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500, minWidth: 65 }}>
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

