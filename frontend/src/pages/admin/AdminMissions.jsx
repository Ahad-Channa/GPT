import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiTarget, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight, FiSave, FiRefreshCw, FiBarChart2, FiAward } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PERIOD_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const PERIOD_COLORS = {
  daily:   { bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.3)',  text: '#a5b4fc', accent: '#6366f1' },
  weekly:  { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  text: '#6ee7b7', accent: '#10b981' },
  monthly: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  text: '#fcd34d', accent: '#f59e0b' },
};

// Blank slot structure
const emptySlot = (displayOrder) => ({
  templateKey: '',
  targetValue: '',
  rewardAmount: '',
  isEnabled: true,
  displayOrder,
  configId: null,
});

// ── Period Management Panel ──────────────────────────────────────────────────
function PeriodPanel({ period, templates, configs, onSave, saving }) {
  const cfg = PERIOD_COLORS[period];
  const label = PERIOD_LABELS[period];

  // Filter templates allowed for this period
  const allowed = templates.filter(t => t.allowedPeriods?.includes(period) && t.isActive);

  // Build slots: existing configs fill slots, empty slots pad to 3
  const buildSlots = () => {
    const slots = [1, 2, 3].map(order => {
      const existing = configs.find(c => c.period === period && c.displayOrder === order);
      if (existing) {
        return {
          templateKey: existing.templateKey,
          targetValue: String(existing.targetValue),
          rewardAmount: String(existing.rewardAmount),
          isEnabled: existing.isEnabled,
          displayOrder: order,
          configId: existing._id,
        };
      }
      return emptySlot(order);
    });
    return slots;
  };

  const [slots, setSlots] = useState(buildSlots);

  useEffect(() => {
    setSlots(buildSlots());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs]);

  const updateSlot = (idx, field, value) => {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const clearSlot = (idx) => {
    setSlots(prev => prev.map((s, i) => i === idx ? emptySlot(s.displayOrder) : s));
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}
    >
      {/* Period header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: cfg.border }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
            style={{ background: `${cfg.accent}20`, color: cfg.accent, border: `1px solid ${cfg.accent}30` }}
          >
            {label[0]}
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">{label} Missions</h3>
            <p className="text-xs text-slate-500">Configure up to 3 missions (1 per slot)</p>
          </div>
        </div>

        <button
          onClick={() => onSave(period, slots)}
          disabled={saving === period}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:brightness-110"
          style={{ background: cfg.accent, color: '#fff', boxShadow: `0 0 12px ${cfg.accent}50` }}
        >
          {saving === period ? (
            <><FiRefreshCw className="animate-spin text-xs" /> Saving…</>
          ) : (
            <><FiSave className="text-xs" /> Save {label}</>
          )}
        </button>
      </div>

      {/* Slot cards */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slot, idx) => (
          <div
            key={idx}
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}
          >
            {/* Slot header */}
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
                style={{ background: `${cfg.accent}20`, color: cfg.text }}
              >
                Slot {slot.displayOrder}
              </span>
              <div className="flex items-center gap-2">
                <button
                  title={slot.isEnabled ? 'Disable' : 'Enable'}
                  onClick={() => updateSlot(idx, 'isEnabled', !slot.isEnabled)}
                  style={{ color: slot.isEnabled ? cfg.accent : '#475569' }}
                >
                  {slot.isEnabled
                    ? <FiToggleRight className="text-xl" />
                    : <FiToggleLeft className="text-xl" />
                  }
                </button>
                {slot.templateKey && (
                  <button
                    title="Clear slot"
                    onClick={() => clearSlot(idx)}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <FiTrash2 className="text-sm" />
                  </button>
                )}
              </div>
            </div>

            {/* Template select */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                Mission Type
              </label>
              <select
                value={slot.templateKey}
                onChange={e => updateSlot(idx, 'templateKey', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm font-medium bg-slate-900/80 border border-slate-700/50 text-slate-200 focus:outline-none focus:border-indigo-500/60 transition-colors"
              >
                <option value="">— Select Mission —</option>
                {allowed.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Target value */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                Target (X)
              </label>
              <input
                type="number"
                min="1"
                value={slot.targetValue}
                onChange={e => updateSlot(idx, 'targetValue', e.target.value)}
                placeholder="e.g. 5"
                className="w-full rounded-lg px-3 py-2 text-sm font-medium bg-slate-900/80 border border-slate-700/50 text-slate-200 focus:outline-none focus:border-indigo-500/60 transition-colors placeholder-slate-600"
              />
            </div>

            {/* Reward amount */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                Reward Coins (Y)
              </label>
              <input
                type="number"
                min="0"
                value={slot.rewardAmount}
                onChange={e => updateSlot(idx, 'rewardAmount', e.target.value)}
                placeholder="e.g. 500"
                className="w-full rounded-lg px-3 py-2 text-sm font-medium bg-slate-900/80 border border-slate-700/50 text-slate-200 focus:outline-none focus:border-indigo-500/60 transition-colors placeholder-slate-600"
              />
            </div>

            {/* Preview description */}
            {slot.templateKey && (
              <div
                className="rounded-lg px-3 py-2 text-xs italic leading-relaxed"
                style={{ background: `${cfg.accent}10`, color: cfg.text, border: `1px solid ${cfg.accent}20` }}
              >
                {(allowed.find(t => t.key === slot.templateKey)?.descriptionTemplate || '')
                  .replace('{X}', slot.targetValue || 'X')
                  .replace('{Y}', slot.rewardAmount ? Number(slot.rewardAmount).toLocaleString() : 'Y')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Period Completion Bonus Config Panel ──────────────────────────────────────
function PeriodBonusConfig({ config, onSave, saving }) {
  const [local, setLocal] = useState({
    daily:   { enabled: true,  bonusAmount: 0 },
    weekly:  { enabled: true,  bonusAmount: 0 },
    monthly: { enabled: true,  bonusAmount: 0 },
  });

  useEffect(() => {
    if (config) setLocal(config);
  }, [config]);

  const update = (period, field, value) =>
    setLocal(prev => ({ ...prev, [period]: { ...prev[period], [field]: value } }));

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'rgba(245,158,11,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <FiAward className="text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">Period Completion Bonus</h3>
            <p className="text-xs text-slate-500">Extra reward when user completes ALL missions in a period</p>
          </div>
        </div>
        <button
          onClick={() => onSave(local)}
          disabled={!!saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:brightness-110"
          style={{ background: '#f59e0b', color: '#1c1400', boxShadow: '0 0 12px rgba(245,158,11,0.4)' }}
        >
          {saving ? <><FiRefreshCw className="animate-spin text-xs" /> Saving…</> : <><FiSave className="text-xs" /> Save Bonus Config</>}
        </button>
      </div>

      {/* Per-period rows */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {['daily', 'weekly', 'monthly'].map(period => {
          const cfg = PERIOD_COLORS[period];
          const val = local[period] || { enabled: true, bonusAmount: 0 };
          return (
            <div
              key={period}
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
                  style={{ background: `${cfg.accent}20`, color: cfg.text }}
                >
                  {PERIOD_LABELS[period]}
                </span>
                <button
                  title={val.enabled ? 'Disable bonus' : 'Enable bonus'}
                  onClick={() => update(period, 'enabled', !val.enabled)}
                  style={{ color: val.enabled ? cfg.accent : '#475569' }}
                >
                  {val.enabled ? <FiToggleRight className="text-xl" /> : <FiToggleLeft className="text-xl" />}
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Bonus Coins
                </label>
                <input
                  type="number"
                  min="0"
                  value={val.bonusAmount}
                  onChange={e => update(period, 'bonusAmount', Number(e.target.value))}
                  placeholder="e.g. 500"
                  disabled={!val.enabled}
                  className="w-full rounded-lg px-3 py-2 text-sm font-medium bg-slate-900/80 border border-slate-700/50 text-slate-200 focus:outline-none focus:border-amber-500/60 transition-colors placeholder-slate-600 disabled:opacity-40"
                />
              </div>

              {val.enabled && val.bonusAmount > 0 && (
                <div
                  className="rounded-lg px-3 py-2 text-xs italic"
                  style={{ background: `${cfg.accent}10`, color: cfg.text, border: `1px solid ${cfg.accent}20` }}
                >
                  Users earn +{Number(val.bonusAmount).toLocaleString()} bonus coins for completing all {PERIOD_LABELS[period].toLowerCase()} missions
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mission Templates Reference Table ────────────────────────────────────────
function TemplatesTable({ templates }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(51,65,85,0.5)', background: 'rgba(15,23,42,0.5)' }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <FiBarChart2 className="text-indigo-400" />
          <span className="font-bold text-slate-200">Mission Template Reference</span>
          <span className="text-xs text-slate-500">({templates.length} templates)</span>
        </div>
        <span className="text-slate-500 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-800/60 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="text-left px-5 py-3 text-xs text-slate-500 font-bold uppercase tracking-wider">Label</th>
                <th className="text-left px-5 py-3 text-xs text-slate-500 font-bold uppercase tracking-wider">Key</th>
                <th className="text-left px-5 py-3 text-xs text-slate-500 font-bold uppercase tracking-wider">Tracking Field</th>
                <th className="text-left px-5 py-3 text-xs text-slate-500 font-bold uppercase tracking-wider">Allowed Periods</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.key} className="border-b border-slate-800/30 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-medium text-slate-200">{t.label}</td>
                  <td className="px-5 py-3">
                    <code className="text-xs bg-slate-800 text-indigo-400 px-2 py-0.5 rounded">{t.key}</code>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs font-mono">{t.trackingField}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(t.allowedPeriods || []).map(p => (
                        <span
                          key={p}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide"
                          style={{
                            background: PERIOD_COLORS[p]?.bg,
                            color: PERIOD_COLORS[p]?.text,
                            border: `1px solid ${PERIOD_COLORS[p]?.border}`,
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {['daily', 'weekly', 'monthly'].map(period => {
        const s = stats[period] || {};
        const cfg = PERIOD_COLORS[period];
        return (
          <div
            key={period}
            className="rounded-xl p-4"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">{PERIOD_LABELS[period]}</div>
            <div className="flex items-end gap-4">
              <div>
                <div className="text-2xl font-black" style={{ color: cfg.accent }}>{s.claimed ?? 0}</div>
                <div className="text-[10px] text-slate-500">claimed</div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-400">{s.total ?? 0}</div>
                <div className="text-[10px] text-slate-500">started</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── AdminMissions Page ────────────────────────────────────────────────────────
const AdminMissions = () => {
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [stats, setStats] = useState(null);
  const [bonusConfig, setBonusConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [savingBonus, setSavingBonus] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [tmplRes, cfgRes, statsRes, bonusRes] = await Promise.all([
        fetch(`${API}/missions/admin/templates`, { headers }),
        fetch(`${API}/missions/admin/configs`, { headers }),
        fetch(`${API}/missions/admin/stats`, { headers }),
        fetch(`${API}/missions/admin/period-bonus-config`, { headers }),
      ]);

      const [tmplData, cfgData, statsData, bonusData] = await Promise.all([
        tmplRes.json(), cfgRes.json(), statsRes.json(), bonusRes.json(),
      ]);

      if (tmplData.success)  setTemplates(tmplData.templates);
      if (cfgData.success)   setConfigs(cfgData.configs);
      if (statsData.success) setStats(statsData.stats);
      if (bonusData.success) setBonusConfig(bonusData.config);
    } catch (err) {
      toast.error('Failed to load mission data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSavePeriod = async (period, slots) => {
    setSaving(period);
    try {
      const token = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const ops = [];
      for (const slot of slots) {
        if (!slot.templateKey) {
          // If there's an existing config for this slot, delete it
          if (slot.configId) {
            ops.push(
              fetch(`${API}/missions/admin/configs/${slot.configId}`, {
                method: 'DELETE', headers,
              })
            );
          }
        } else {
          // Upsert via POST (server handles upsert logic)
          ops.push(
            fetch(`${API}/missions/admin/configs`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                templateKey: slot.templateKey,
                period,
                displayOrder: slot.displayOrder,
                targetValue: Number(slot.targetValue) || 1,
                rewardAmount: Number(slot.rewardAmount) || 0,
                isEnabled: slot.isEnabled,
              }),
            })
          );
        }
      }

      const results = await Promise.all(ops);
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        const errJson = await failed[0].json().catch(() => ({}));
        throw new Error(errJson.error || 'Some configs failed to save');
      }

      toast.success(`${PERIOD_LABELS[period]} missions saved!`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FiTarget className="text-indigo-400 text-xl" />
            <h1 className="text-xl font-black text-slate-100">Mission Management</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Configure missions for each period. Max 3 per category. Admins set target (X) and reward (Y) only — mission type is fixed.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
        >
          <FiRefreshCw className="text-xs" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Info notice */}
      <div
        className="rounded-xl px-4 py-3 text-xs leading-relaxed"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}
      >
        <strong>How it works:</strong> Each slot (1–3) in a period shows one mission to users.
        Select a mission type from the dropdown (fixed templates), then set the target (how many to complete)
        and reward (how many coins they earn). Toggle the slot off to hide it without deleting.
        Rewards can only be claimed during the active period — expired missions are forfeited.
      </div>

      {/* Period panels */}
      {['daily', 'weekly', 'monthly'].map(period => (
        <PeriodPanel
          key={period}
          period={period}
          templates={templates}
          configs={configs}
          onSave={handleSavePeriod}
          saving={saving}
        />
      ))}

      {/* Period completion bonus config */}
      <PeriodBonusConfig
        config={bonusConfig}
        saving={savingBonus}
        onSave={async (localCfg) => {
          setSavingBonus(true);
          try {
            const token = await currentUser.getIdToken();
            const res = await fetch(`${API}/missions/admin/period-bonus-config`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(localCfg),
            });
            const json = await res.json();
            if (json.success) {
              setBonusConfig(json.config);
              toast.success('Period bonus config saved!');
            } else {
              toast.error(json.error || 'Failed to save');
            }
          } catch {
            toast.error('Network error');
          } finally {
            setSavingBonus(false);
          }
        }}
      />

      {/* Templates reference */}
      <TemplatesTable templates={templates} />
    </div>
  );
};

export default AdminMissions;
