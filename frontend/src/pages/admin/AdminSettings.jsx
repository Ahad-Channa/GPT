import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FiSettings, FiPercent, FiDollarSign, FiToggleLeft,
  FiToggleRight, FiSave, FiRefreshCw, FiLoader,
  FiAlertCircle, FiCheckCircle, FiInfo, FiEdit2, FiLock, FiZap, FiShield,
} from 'react-icons/fi';
import CoinDisplay from '../../components/CoinDisplay';

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
        fontFamily: "'Barlow', system-ui, sans-serif",
        fontFeatureSettings: "'zero' 0",
        fontVariantNumeric: 'normal',
        fontSize: '1rem',
        fontWeight: 600,
        color: '#e2e8f0',
      }}
    />
    {suffix && (
      <span style={{ position: 'absolute', right: '0.75rem', color: '#64748b', fontSize: '0.82rem', pointerEvents: 'none', fontFamily: "'Barlow', system-ui, sans-serif" }}>
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
  const [earnGate, setEarnGate] = useState([]);
  const [earnReward, setEarnReward] = useState([]);
  const [showGlobalStats, setShowGlobalStats] = useState(false);
  const [missionsEnabled, setMissionsEnabled] = useState(true);
  const [earnHoldEnabled, setEarnHoldEnabled] = useState(false);
  const [earnHoldThreshold, setEarnHoldThreshold] = useState('');
  const [earnHoldDays, setEarnHoldDays] = useState('');

  const [saving,   setSaving]  = useState(false);
  const [dirty,    setDirty]   = useState(false);
  const [error,    setError]   = useState('');
  const [success,  setSuccess] = useState('');
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseEarningsLoading, setReleaseEarningsLoading] = useState(false);

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
      setEarnGate(data.settings.rewardEngine?.dailyBonusEarnGate ?? Array(30).fill(1000));
      setEarnReward(data.settings.rewardEngine?.dailyBonusReward ?? Array.from({length: 30}, (_, i) => {
        if (i+1===10) return 500; if(i+1===20) return 1000; if(i+1===30) return 2500; return 100+(i*10);
      }));
      setEarnHoldEnabled(Boolean(data.settings.earningHoldConfig?.enabled));
      setEarnHoldThreshold(String(data.settings.earningHoldConfig?.threshold ?? 5000));
      setEarnHoldDays(String(data.settings.earningHoldConfig?.holdDays ?? 30));
      setShowGlobalStats(Boolean(data.settings.showGlobalStats));
      setMissionsEnabled(data.settings.missionsEnabled ?? true);
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
    
    if (earnHoldEnabled) {
      if (isNaN(Number(earnHoldThreshold)) || Number(earnHoldThreshold) < 0) return setError('Earning Hold Threshold must be 0 or greater.');
      if (isNaN(Number(earnHoldDays)) || Number(earnHoldDays) < 0) return setError('Earning Hold Days must be 0 or greater.');
    }

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
          },
          earningHoldConfig: {
            enabled: earnHoldEnabled,
            threshold: Number(earnHoldThreshold),
            holdDays: Number(earnHoldDays)
          },
          rewardEngine: {
            dailyBonusEarnGate: earnGate.map(Number),
            dailyBonusReward: earnReward.map(Number),
          },
          showGlobalStats,
          missionsEnabled
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

  /* ── Manual Referral Hold Release ──────────────── */
  const handleReleaseHolds = async () => {
    if (releaseLoading) return;
    setReleaseLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/referral-holds/release-now`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (data.releasedCount === 0) {
        toast('No referral holds found to release.', { icon: '💡' });
      } else {
        toast.success(`✅ Released ${data.releasedCount} referral hold(s)! Wallets updated.`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to release holds');
    } finally {
      setReleaseLoading(false);
    }
  };

  /* ── Manual Earnings Hold Release ──────────────── */
  const handleReleaseEarningsHolds = async () => {
    if (releaseEarningsLoading) return;
    setReleaseEarningsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/earnings-holds/release-now`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (data.releasedCount === 0) {
        toast('No earnings holds found to release.', { icon: '💡' });
      } else {
        toast.success(`✅ Released ${data.releasedCount} earning hold(s)! Wallets updated.`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to release earnings holds');
    } finally {
      setReleaseEarningsLoading(false);
    }
  };

  /* ── Cancel / discard changes ───────────────── */
  const handleDiscard = () => {
    if (!settings) return;
    setCpusd(String(settings.coinsPerUSD));
    setMethods(JSON.parse(JSON.stringify(settings.withdrawalMethods)));
    setRefHoldDays(String(settings.referralConfig?.holdDays ?? 30));
    setRefGlobalPct(String(settings.referralConfig?.globalPercentage ?? 5));
    setEarnGate(settings.rewardEngine?.dailyBonusEarnGate ?? Array(30).fill(1000));
    setEarnReward(settings.rewardEngine?.dailyBonusReward ?? Array.from({length: 30}, (_, i) => {
      if (i+1===10) return 500; if(i+1===20) return 1000; if(i+1===30) return 2500; return 100+(i*10);
    }));
    setEarnHoldEnabled(Boolean(settings.earningHoldConfig?.enabled));
    setEarnHoldThreshold(String(settings.earningHoldConfig?.threshold ?? 5000));
    setEarnHoldDays(String(settings.earningHoldConfig?.holdDays ?? 30));
    setShowGlobalStats(Boolean(settings.showGlobalStats));
    setMissionsEnabled(settings.missionsEnabled ?? true);
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', padding: '0.6rem 0.9rem', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: '10px', fontSize: '0.75rem', color: '#94a3b8', fontFamily: "'Barlow', system-ui, sans-serif", fontFeatureSettings: "'zero' 0" }}>
                <CoinDisplay amount={1000} size={13} compact={false} /> = <span style={{ color: '#60a5fa', fontWeight: 600 }}>${(1000 / Number(cpusd)).toFixed(2)} USD</span>
              </div>
            )}
          </Field>

          {/* Show Global Stats Toggle */}
          <div style={{ marginTop: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Show Global Stats
            </label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <p style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>Homepage Statistics</p>
                <p style={{ color: '#64748b', fontSize: '0.7rem', margin: 0 }}>Show "Total Users" and "Total Cashout" on the homepage</p>
              </div>
              <button
                onClick={() => { setShowGlobalStats(!showGlobalStats); markDirty(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {showGlobalStats
                  ? <FiToggleRight style={{ fontSize: '1.75rem', color: '#34d399' }} />
                  : <FiToggleLeft  style={{ fontSize: '1.75rem', color: '#475569' }} />
                }
              </button>
            </div>
          </div>

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

        {/* Release Holds Now Button */}
        <div style={{ marginTop: '0.5rem' }}>
          <button
            onClick={handleReleaseHolds}
            disabled={releaseLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              background: releaseLoading
                ? 'rgba(16,185,129,0.05)'
                : 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.2))',
              border: '1px solid rgba(16,185,129,0.3)',
              color: releaseLoading ? '#475569' : '#34d399',
              cursor: releaseLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              fontFamily: 'Barlow, system-ui, sans-serif',
              transition: 'all 0.2s',
              letterSpacing: '0.02em',
            }}
          >
            {releaseLoading
              ? <><FiLoader style={{ animation: 'spin 1s linear infinite' }} /> Releasing...</>
              : <><FiZap style={{ fontSize: '0.9rem' }} /> Force Release All Referral Holds Now</>
            }
          </button>
          <p style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <FiInfo style={{ flexShrink: 0 }} />
            Instantly credits all referral commissions to user wallets.
          </p>
        </div>
      </div>

      {/* ── Section: Real Earnings Hold ────────────── */}
      <div className="admin-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiShield style={{ color: 'white', fontSize: 14 }} />
          </div>
          <div>
            <h3 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Earnings Hold System</h3>
            <p style={{ color: '#64748b', fontSize: '0.72rem', margin: 0 }}>Lock large earnings to protect the economy</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>Enable Earnings Hold</p>
            <p style={{ color: '#64748b', fontSize: '0.7rem', margin: 0 }}>Place large offerwall/custom earnings on hold automatically</p>
          </div>
          <button
            onClick={() => { setEarnHoldEnabled(!earnHoldEnabled); markDirty(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {earnHoldEnabled
              ? <FiToggleRight style={{ fontSize: '1.75rem', color: '#34d399' }} />
              : <FiToggleLeft  style={{ fontSize: '1.75rem', color: '#475569' }} />
            }
          </button>
        </div>

        <Field
          label="Hold Threshold (Coins)"
          hint="Any single earning equal to or above this amount will be placed on hold."
        >
          <NumberInput
            value={earnHoldThreshold}
            onChange={(v) => { setEarnHoldThreshold(v); markDirty(); }}
            min={0}
            disabled={!earnHoldEnabled}
            suffix="Coins"
          />
        </Field>

        <Field
          label="Holds Duration (Days)"
          hint="Number of days the earning will remain locked before being credited to the wallet."
        >
          <NumberInput
            value={earnHoldDays}
            onChange={(v) => { setEarnHoldDays(v); markDirty(); }}
            min={0}
            disabled={!earnHoldEnabled}
            suffix="Days"
          />
        </Field>

        {/* Release Earnings Holds Now Button */}
        <div style={{ marginTop: '0.5rem' }}>
          <button
            onClick={handleReleaseEarningsHolds}
            disabled={releaseEarningsLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              background: releaseEarningsLoading
                ? 'rgba(16,185,129,0.05)'
                : 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.2))',
              border: '1px solid rgba(16,185,129,0.3)',
              color: releaseEarningsLoading ? '#475569' : '#34d399',
              cursor: releaseEarningsLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              fontFamily: 'Barlow, system-ui, sans-serif',
              transition: 'all 0.2s',
              letterSpacing: '0.02em',
            }}
          >
            {releaseEarningsLoading
              ? <><FiLoader style={{ animation: 'spin 1s linear infinite' }} /> Releasing...</>
              : <><FiZap style={{ fontSize: '0.9rem' }} /> Force Release All Earnings Holds Now</>
            }
          </button>
          <p style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <FiInfo style={{ flexShrink: 0 }} />
            Instantly credits all offerwall/custom earnings currently on hold to user wallets.
          </p>
        </div>
      </div>

      {/* ── Section 4: Daily Bonus ────────────── */}
      <div className="admin-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#047857)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiRefreshCw style={{ color: 'white', fontSize: 14 }} />
          </div>
          <div>
            <h3 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Daily Bonus System</h3>
            <p style={{ color: '#64748b', fontSize: '0.72rem', margin: 0 }}>Configure requirements & rewards for Day 1–30</p>
          </div>
        </div>

        <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Day</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Earn Gate</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Reward</div>
          </div>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={`day-${i}`} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600, textAlign: 'center' }}>{i + 1}</div>
              <input
                type="number"
                value={earnGate[i] ?? 1000}
                onChange={(e) => {
                  const newGate = [...earnGate];
                  newGate[i] = Number(e.target.value);
                  setEarnGate(newGate);
                  markDirty();
                }}
                className="admin-input"
                style={{ width: '100%', fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
              />
              <input
                type="number"
                value={earnReward[i] ?? 100}
                onChange={(e) => {
                  const newReward = [...earnReward];
                  newReward[i] = Number(e.target.value);
                  setEarnReward(newReward);
                  markDirty();
                }}
                className="admin-input"
                style={{ width: '100%', fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
              />
            </div>
          ))}
        </div>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#475569', fontSize: '0.68rem', margin: 0, fontFamily: "'Barlow', system-ui, sans-serif", fontFeatureSettings: "'zero' 0" }}>
                            <span>Min:</span> <CoinDisplay amount={Math.round(minCoins)} size={11} compact={false} />
                          </div>
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
              fontSize: '0.82rem', fontWeight: 600, fontFamily: 'Barlow, system-ui, sans-serif',
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
