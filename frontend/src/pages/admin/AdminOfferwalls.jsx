import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiBox, FiToggleLeft, FiToggleRight, FiSave,
  FiAlertCircle, FiCheckCircle, FiLoader, FiAlertTriangle
} from 'react-icons/fi';

const NumberInput = ({ value, onChange, min, max, step = 1, prefix, suffix, disabled }) => (
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    {prefix && (
      <span style={{ position: 'absolute', left: '0.75rem', color: '#64748b', fontSize: '0.85rem', pointerEvents: 'none' }}>
        {prefix}
      </span>
    )}
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className="admin-input"
      style={{
        paddingLeft: prefix ? '2rem' : '1rem',
        paddingRight: suffix ? '3rem' : '1rem',
        width: '100%',
        fontFamily: 'ui-monospace, monospace',
        fontSize: '1rem',
        fontWeight: 600,
        color: '#e2e8f0',
      }}
    />
    {suffix && (
      <span style={{ position: 'absolute', right: '0.75rem', color: '#64748b', fontSize: '0.82rem', pointerEvents: 'none', fontFamily: 'monospace' }}>
        {suffix}
      </span>
    )}
  </div>
);

const ProviderCard = ({ provider, onUpdate, loadingProvider }) => {
  const [enabled, setEnabled] = useState(provider.enabled);
  const [ratio, setRatio] = useState(String(provider.conversionRatio || 1.0));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setEnabled(provider.enabled);
    setRatio(String(provider.conversionRatio || 1.0));
    setDirty(false);
  }, [provider]);

  const handleRatioChange = (val) => {
    setRatio(val);
    setDirty(Number(val) !== provider.conversionRatio);
  };

  const handleToggle = () => {
    onUpdate(provider.id, !enabled, Number(ratio));
  };

  const handleSaveRatio = () => {
    if (isNaN(Number(ratio)) || Number(ratio) <= 0) {
      toast.error('Conversion ratio must be a positive number');
      return;
    }
    onUpdate(provider.id, enabled, Number(ratio));
  };

  const isLoading = loadingProvider === provider.id;

  return (
    <motion.div
      layout
      style={{
        padding: '1rem 1.1rem',
        background: enabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
        border: `1px solid ${enabled ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: '14px',
        transition: 'all 0.2s',
        opacity: enabled || isLoading ? 1 : 0.6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8, background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.25)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#8b5cf6'
          }}>
            <FiBox />
          </span>
          <div>
            <p style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', margin: 0, textTransform: 'capitalize' }}>
              {provider.name || provider.id}
            </p>
            {!provider.secretConfigured && (
              <p style={{ color: '#ef4444', fontSize: '0.7rem', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiAlertTriangle /> Missing Secret in .env
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading}
          style={{ background: 'none', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          {enabled
            ? <FiToggleRight style={{ fontSize: '1.5rem', color: '#34d399' }} />
            : <FiToggleLeft style={{ fontSize: '1.5rem', color: '#475569' }} />
          }
          <span style={{ fontSize: '0.7rem', color: enabled ? '#34d399' : '#475569', fontWeight: 600 }}>
            {enabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>
            User Split Ratio
          </label>
          <NumberInput
            value={ratio}
            onChange={handleRatioChange}
            min={0.1}
            step={0.1}
            disabled={!enabled || isLoading}
          />
        </div>
        {dirty && (
          <button
            onClick={handleSaveRatio}
            disabled={isLoading}
            style={{
              height: '42px',
              padding: '0 1rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
              border: 'none',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? <FiLoader className="spin" /> : 'Save'}
          </button>
        )}
      </div>
      {Number(ratio) > 0 && enabled && (
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem', fontFamily: 'monospace' }}>
          <strong>Formula:</strong> 1.00 Network Unit &times; {Number(ratio) || 1} = <span style={{ color: '#60a5fa' }}>{Math.round(1 * (Number(ratio) || 1))} Coins given to user</span>.
        </div>
      )}
    </motion.div>
  );
};

const AdminOfferwalls = () => {
  const { currentUser, isPrimaryAdmin, mongoUser } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState('');

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setProviders(data.settings.offerwallProviders || []);
    } catch (err) {
      setError(err.message || 'Failed to loaded offerwalls');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const updateProvider = async (providerId, enabled, conversionRatio) => {
    try {
      setLoadingProvider(providerId);
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/offerwalls/${providerId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, conversionRatio })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setProviders(prev => prev.map(p => p.id === providerId ? { ...p, enabled, conversionRatio } : p));
      toast.success(`${providerId} updated!`);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setLoadingProvider(null);
    }
  };

  const canManage = isPrimaryAdmin || mongoUser?.adminPermissions?.includes('manage_offerwalls');

  if (!canManage) {
    return (
      <div>
        <h1 className="admin-page-title">Offerwalls</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', marginTop: '1rem' }}>
          <FiAlertCircle style={{ color: '#f87171', fontSize: '1.25rem' }} />
          <p style={{ color: '#f87171', fontWeight: 600 }}>Access Restricted. You need 'manage_offerwalls' permission.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h1 className="admin-page-title">Offerwalls Management</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#475569', padding: '3rem', justifyContent: 'center' }}>
          <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '1.1rem' }} /> Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FiBox style={{ color: '#8b5cf6' }} />
          Offerwalls Management
        </h1>
        <p className="admin-page-sub">
          Enable or disable providers, and adjust the conversion ratio (User Split) for each network.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171' }}>
          <FiAlertCircle style={{ flexShrink: 0, marginRight: '0.5rem' }} /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {providers.map(provider => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onUpdate={updateProvider}
            loadingProvider={loadingProvider}
          />
        ))}
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminOfferwalls;
