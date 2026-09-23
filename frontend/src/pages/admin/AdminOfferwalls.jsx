import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiBox, FiToggleLeft, FiToggleRight,
  FiAlertCircle, FiLoader, FiAlertTriangle
} from 'react-icons/fi';

const NumberInput = ({ value, onChange, min, max, step = 1, prefix, suffix, disabled }) => (
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    {prefix && (
      <span style={{ position: 'absolute', left: '0.75rem', color: '#6B7280', fontSize: '0.85rem', pointerEvents: 'none' }}>
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
        paddingLeft: prefix ? '2rem' : '0.875rem',
        paddingRight: suffix ? '3rem' : '0.875rem',
        width: '100%',
        fontFamily: "'Barlow', system-ui, sans-serif",
        fontFeatureSettings: "'zero' 0",
        fontVariantNumeric: 'normal',
        fontSize: '0.95rem',
        fontWeight: 600,
        color: '#0E0F0C',
        background: '#FFFFFF',
        border: '1px solid #D1D5DB',
        borderRadius: '10px',
      }}
    />
    {suffix && (
      <span style={{ position: 'absolute', right: '0.75rem', color: '#6B7280', fontSize: '0.82rem', pointerEvents: 'none', fontFamily: "'Barlow', system-ui, sans-serif" }}>
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
        padding: '1.25rem',
        background: '#FFFFFF',
        border: `1px solid ${enabled ? '#CBD5E1' : '#E5E7EB'}`,
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        transition: 'all 0.2s',
        opacity: enabled || isLoading ? 1 : 0.65,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10, background: '#F5F3FF',
            border: '1px solid #DDD6FE', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#7C3AED'
          }}>
            <FiBox />
          </span>
          <div>
            <p style={{ color: '#0E0F0C', fontWeight: 700, fontSize: '0.95rem', margin: 0, textTransform: 'capitalize', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {provider.name || provider.id}
            </p>
            {!provider.secretConfigured && (
              <p style={{ color: '#DC2626', fontSize: '0.75rem', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
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
            ? <FiToggleRight style={{ fontSize: '1.75rem', color: '#10B981' }} />
            : <FiToggleLeft style={{ fontSize: '1.75rem', color: '#9CA3AF' }} />
          }
          <span style={{ fontSize: '0.75rem', color: enabled ? '#059669' : '#6B7280', fontWeight: 700 }}>
            {enabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
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
              height: '40px',
              padding: '0 1.25rem',
              borderRadius: '10px',
              background: '#1E2538',
              border: 'none',
              color: 'white',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            {isLoading ? <FiLoader className="spin" /> : 'Save'}
          </button>
        )}
      </div>
      {Number(ratio) > 0 && enabled && (
        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: '8px', fontFamily: "'Barlow', system-ui, sans-serif", fontFeatureSettings: "'zero' 0" }}>
          <strong style={{ color: '#374151' }}>Formula:</strong> 1.00 Network Unit &times; {Number(ratio) || 1} = <span style={{ color: '#2563EB', fontWeight: 600 }}>{Math.round(1 * (Number(ratio) || 1))} Coins to user</span>.
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/settings`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/offerwalls/${providerId}`, {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', marginTop: '1rem' }}>
          <FiAlertCircle style={{ color: '#DC2626', fontSize: '1.25rem' }} />
          <p style={{ color: '#B91C1C', fontWeight: 600 }}>Access Restricted. You need 'manage_offerwalls' permission.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <h1 className="admin-page-title">Offerwalls Management</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#6B7280', padding: '3rem', justifyContent: 'center' }}>
          <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '1.1rem' }} /> Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FiBox style={{ color: '#7C3AED' }} />
          Offerwalls Management
        </h1>
        <p className="admin-page-sub">
          Enable or disable providers, and adjust the conversion ratio (User Split) for each network.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', display: 'flex', alignItems: 'center' }}>
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

