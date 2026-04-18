import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiSettings, FiPercent, FiDollarSign, FiToggleLeft,
  FiToggleRight, FiSave, FiRefreshCw, FiLoader,
  FiAlertCircle, FiCheckCircle, FiInfo, FiEdit2, FiLock,
} from 'react-icons/fi';

/* ─────────────────────────────────────────────────────────────────
   AdminSettings.jsx — Platform Fee & Withdrawal Settings
   Only accessible to the Primary Admin.
   Uses GET /api/admin/settings and PUT /api/admin/settings
────────────────────────────────────────────────────────────────── */

const METHOD_ICONS = {
  litecoin: { icon: 'Ł', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  paypal:   { icon: '💳', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  giftcard: { icon: '🎁', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)' },
};

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
      {label}
    </label>
    {children}
    {hint && (
      <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <FiInfo style={{ flexShrink: 0 }} /> {hint}
      </p>
    )}
  </div>
);

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

const AdminSettings = () => {
  const { currentUser, isPrimaryAdmin } = useAuth();

  // Raw settings from backend
  const [settings, setSettings] = useState(null);
  const [loading,  setLoading]  = useState(true);

  // Local editable state — separate from settings so we can cancel
  const [cpusd,   setCpusd]   = useState('');
  const [methods, setMethods] = useState([]);
  const [refHoldDays, setRefHoldDays] = useState('');
  const [refGlobalPct, setRefGlobalPct] = useState('');

  const [saving,   setSaving]  = useState(false);
  const [dirty,    setDirty]   = useState(false);
  const [error,    setError]   = useState('');
  const [success,  setSuccess] = useState('');

  /* ── Fetch current settings ─────────────────── */
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSettings(data.settings);
      // Populate local edit state
      setCpusd(String(data.settings.coinsPerUSD));
      setMethods(JSON.parse(JSON.stringify(data.settings.withdrawalMethods))); // deep copy
      setRefHoldDays(String(data.settings.referralConfig?.holdDays ?? 30));
      setRefGlobalPct(String(data.settings.referralConfig?.globalPercentage ?? 5));
      setDirty(false);
    } catch (err) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  /* ── Dirty tracking ─────────────────────────── */
  const markDirty = () => { setDirty(true); setSuccess(''); setError(''); };

  /* ── Method helpers ─────────────────────────── */
  const updateMethod = (id, field, value) => {
    setMethods((prev) => prev.map((m) => m.id === id ? { ...m, [field]: value } : m));
    markDirty();
  };

  /* ── Save ───────────────────────────────────── */
  const handleSave = async () => {
    setError('');
    setSuccess('');

    const cpusdNum = Number(cpusd);

    if (isNaN(cpusdNum) || cpusdNum <= 0)                return setError('Coins per USD must be a positive number.');
    if (isNaN(Number(refHoldDays)) || Number(refHoldDays) < 0) return setError('Referral Hold Days must be 0 or greater.');
    if (isNaN(Number(refGlobalPct)) || Number(refGlobalPct) < 0 || Number(refGlobalPct) > 100) return setError('Referral Global Percentage must be between 0 and 100.');

    for (const m of methods) {
      if (isNaN(Number(m.minUSD)) || Number(m.minUSD) <= 0) {
        return setError(`Minimum for "${m.label}" must be a positive number.`);
      }
      if (isNaN(Number(m.feePercent)) || Number(m.feePercent) < 0 || Number(m.feePercent) > 100) {
        return setError(`Fee % for "${m.label}" must be between 0 and 100.`);
      }
    }

    setSaving(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/settings`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coinsPerUSD: cpusdNum,
          withdrawalMethods: methods.map((m) => ({ ...m, minUSD: Number(m.minUSD), feePercent: Number(m.feePercent) })),
          referralConfig: {
            holdDays: Number(refHoldDays),
            globalPercentage: Number(refGlobalPct)
          }
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSettings(data.settings);
      setDirty(false);
      setSuccess('Settings saved successfully!');
      toast.success('Platform settings updated!');
    } catch (err) {
      setError(err.message || 'Failed to save settings');
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  /* ── Cancel / discard changes ───────────────── */
  const handleDiscard = () => {
    if (!settings) return;
    setCpusd(String(settings.coinsPerUSD));
    setMethods(JSON.parse(JSON.stringify(settings.withdrawalMethods)));
    setRefHoldDays(String(settings.referralConfig?.holdDays ?? 30));
    setRefGlobalPct(String(settings.referralConfig?.globalPercentage ?? 5));
    setDirty(false);
    setError('');
    setSuccess('');
  };

  /* ── Guard: primary admin only ──────────────── */
  if (!isPrimaryAdmin) {
    return (
      <div>
        <h1 className="admin-page-title">Platform Settings</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', marginTop: '1rem' }}>
          <FiLock style={{ color: '#f87171', fontSize: '1.25rem', flexShrink: 0 }} />
          <div>
            <p style={{ color: '#f87171', fontWeight: 600, fontSize: '0.9rem' }}>Access Restricted</p>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Platform settings are only accessible to the Primary Admin account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading skeleton ───────────────────────── */
  if (loading) {
    return (
      <div>
        <h1 className="admin-page-title">Platform Settings</h1>
        <p className="admin-page-sub">Fee rates, payout methods, and economy configuration.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#475569', padding: '3rem', textAlign: 'center', justifyContent: 'center' }}>
          <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '1.1rem' }} />
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Page Header ──────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FiSettings style={{ color: '#fbbf24' }} />
          Platform Settings
        </h1>
        <p className="admin-page-sub" style={{ marginBottom: 0 }}>
          Adjust withdrawal fees, payout method minimums, and economy rates. Changes take effect immediately for all users.
        </p>
      </div>

      {/* ── Primary Admin Notice ─────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.18)', borderRadius: '12px', marginBottom: '1.5rem' }}>
        <FiInfo style={{ color: '#fbbf24', flexShrink: 0 }} />
        <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          You are editing as <span style={{ color: '#fbbf24', fontWeight: 600 }}>Primary Admin</span>. All changes are logged in the Audit Log.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>

        {/* ── Section 1: Fee & Economy ────────────── */}
        <div className="admin-card" style={{ marginBottom: 0 }}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#d97706,#b45309)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiPercent style={{ color: 'white', fontSize: 14 }} />
            </div>
            <div>
              <h3 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Fee & Economy</h3>
              <p style={{ color: '#64748b', fontSize: '0.72rem', margin: 0 }}>Controls how Coins map to real-world value</p>
            </div>
          </div>

          {/* (Global fee removed, now per-method) */}

          {/* Coins per USD */}
          <Field
            label="Coins per USD"
            hint="How many platform Coins equal $1 USD. Affects minimum withdrawal calculations."
          >
            <NumberInput
              value={cpusd}
              onChange={(v) => { setCpusd(v); markDirty(); }}
              min={1}
              suffix="per $1"
            />
            {cpusd && !isNaN(Number(cpusd)) && (
              <div style={{ marginTop: '0.6rem', padding: '0.6rem 0.9rem', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: '10px', fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                1,000 Coins = <span style={{ color: '#60a5fa', fontWeight: 600 }}>${(1000 / Number(cpusd)).toFixed(2)} USD</span>
              </div>
            )}
          </Field>
        </div>

      {/* ── Section 3: Referrals ────────────── */}
      <div className="admin-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#c026d3,#86198f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiPercent style={{ color: 'white', fontSize: 14 }} />
          </div>
          <div>
            <h3 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Referral System</h3>
            <p style={{ color: '#64748b', fontSize: '0.72rem', margin: 0 }}>Settings for global referral tracking</p>
          </div>
        </div>

        <Field
          label="Global Referral Percentage"
          hint="The default percentage of earnings users make from their active referrals."
        >
          <NumberInput
            value={refGlobalPct}
            onChange={(v) => { setRefGlobalPct(v); markDirty(); }}
            min={0}
            max={100}
            suffix="%"
          />
        </Field>

        <Field
          label="Holds Duration (Days)"
          hint="Number of days before referral earnings are officially credited to wallet."
        >
          <NumberInput
            value={refHoldDays}
            onChange={(v) => { setRefHoldDays(v); markDirty(); }}
            min={0}
            suffix="Days"
          />
        </Field>
      </div>

      {/* ── Section 2: Withdrawal Methods ──────── */}
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#059669,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiDollarSign style={{ color: 'white', fontSize: 14 }} />
            </div>
            <div>
              <h3 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Payout Methods</h3>
              <p style={{ color: '#64748b', fontSize: '0.72rem', margin: 0 }}>Per-method minimums & on/off switches</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {methods.map((m) => {
              const cfg = METHOD_ICONS[m.id] || { icon: '💰', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };
              const minCoins = Number(m.minUSD) * Number(cpusd);

              return (
                <motion.div
                  key={m.id}
                  layout
                  style={{
                    padding: '1rem 1.1rem',
                    background: m.enabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                    border: `1px solid ${m.enabled ? cfg.border : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '14px',
                    transition: 'all 0.2s',
                    opacity: m.enabled ? 1 : 0.55,
                  }}
                >
                  {/* Method header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{
                        width: 30, height: 30, borderRadius: 8, background: cfg.bg,
                        border: `1px solid ${cfg.border}`, display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                      }}>
                        {cfg.icon}
                      </span>
                      <div>
                        <p style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>{m.label}</p>
                        {!isNaN(minCoins) && Number(cpusd) > 0 && (
                          <p style={{ color: '#475569', fontSize: '0.68rem', margin: 0, fontFamily: 'monospace' }}>
                            Min: {Math.round(minCoins).toLocaleString()} Coins
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Enable/Disable toggle */}
                    <button
                      id={`toggle-${m.id}`}
                      onClick={() => updateMethod(m.id, 'enabled', !m.enabled)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      title={m.enabled ? 'Click to disable' : 'Click to enable'}
                    >
                      {m.enabled
                        ? <FiToggleRight style={{ fontSize: '1.5rem', color: '#34d399' }} />
                        : <FiToggleLeft  style={{ fontSize: '1.5rem', color: '#475569' }} />
                      }
                      <span style={{ fontSize: '0.7rem', color: m.enabled ? '#34d399' : '#475569', fontWeight: 600 }}>
                        {m.enabled ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {/* Minimum USD input */}
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>
                        Minimum USD
                      </label>
                      <NumberInput
                        value={m.minUSD}
                        onChange={(v) => updateMethod(m.id, 'minUSD', v)}
                        min={0.01}
                        step={0.5}
                        prefix="$"
                        disabled={!m.enabled}
                      />
                    </div>
                    {/* Fee % input */}
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>
                        Processing Fee %
                      </label>
                      <NumberInput
                        value={m.feePercent}
                        onChange={(v) => updateMethod(m.id, 'feePercent', v)}
                        min={0}
                        max={100}
                        step={0.5}
                        suffix="%"
                        disabled={!m.enabled}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Error / Success Banners ──────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1.25rem', padding: '0.85rem 1.1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '0.82rem' }}
          >
            <FiAlertCircle style={{ flexShrink: 0 }} /> {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1.25rem', padding: '0.85rem 1.1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', color: '#34d399', fontSize: '0.82rem' }}
          >
            <FiCheckCircle style={{ flexShrink: 0 }} /> {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action Bar ──────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {dirty && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <FiEdit2 style={{ fontSize: '0.7rem' }} /> Unsaved changes
            </motion.span>
          )}
          {!dirty && settings && (
            <span style={{ fontSize: '0.75rem', color: '#475569' }}>
              Last saved: {new Date(settings.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            id="settings-refresh-btn"
            className="action-btn"
            onClick={fetchSettings}
            disabled={loading || saving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} /> Discard & Refresh
          </button>

          {dirty && (
            <button
              id="settings-discard-btn"
              className="action-btn"
              onClick={handleDiscard}
              disabled={saving}
            >
              Cancel
            </button>
          )}

          <button
            id="settings-save-btn"
            onClick={handleSave}
            disabled={!dirty || saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 1.1rem', borderRadius: '10px',
              background: dirty ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${dirty ? 'rgba(37,99,235,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: dirty ? 'white' : '#475569',
              cursor: dirty && !saving ? 'pointer' : 'not-allowed',
              fontSize: '0.82rem', fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif',
              transition: 'all 0.2s',
              boxShadow: dirty ? '0 4px 14px rgba(37,99,235,0.25)' : 'none',
            }}
          >
            {saving
              ? <><FiLoader style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
              : <><FiSave /> Save Settings</>
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminSettings;
