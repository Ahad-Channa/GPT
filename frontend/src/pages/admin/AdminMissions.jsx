import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  FiTarget, FiTrash2, FiToggleLeft, FiToggleRight, FiSave,
  FiRefreshCw, FiBarChart2, FiAward, FiCalendar,
  FiClock, FiCheck, FiChevronRight, FiRepeat, FiZap,
} from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PERIOD_LABELS  = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const PERIOD_COLORS  = {
  daily:   { bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.3)',  text: '#a5b4fc', accent: '#6366f1' },
  weekly:  { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  text: '#6ee7b7', accent: '#10b981' },
  monthly: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  text: '#fcd34d', accent: '#f59e0b' },
};

const CYCLE_META = {
  daily:   { length: 7, labels: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
  weekly:  { length: 4, labels: ['Week 1','Week 2','Week 3','Week 4'] },
  monthly: { length: 1, labels: ['Monthly Default'] },
};

// ── Compute current cycle index client-side (mirrors server logic) ──────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getCurrentCycleIndex(period) {
  const now = new Date();
  if (period === 'daily') {
    const utcDay = now.getUTCDay();
    return utcDay === 0 ? 6 : utcDay - 1;
  }
  if (period === 'weekly') {
    return (getISOWeek(now) - 1) % 4;
  }
  return 0; // monthly
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const emptySlot = (displayOrder) => ({
  templateKey: '',
  targetValue: '',
  rewardAmount: '',
  isEnabled: true,
  displayOrder,
  configId: null,
});

/** Format a raw periodKey into a human-readable label */
function formatPeriodKey(period, key) {
  if (period === 'daily') {
    const d = new Date(key + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  if (period === 'weekly') {
    const wNum = key.split('-W')[1];
    return `Week ${wNum}`;
  }
  if (period === 'monthly') {
    const [y, m] = key.split('-');
    const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  return key;
}

// ── Slot Card (shared between Live + Recurring + Schedule Ahead) ──────────────
function SlotCard({ slot, idx, templates, period, onUpdate, onClear }) {
  const cfg     = PERIOD_COLORS[period];
  const allowed = templates.filter(t => t.allowedPeriods?.includes(period) && t.isActive);

  return (
    <div
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
            onClick={() => onUpdate(idx, 'isEnabled', !slot.isEnabled)}
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
              onClick={() => onClear(idx)}
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
          onChange={e => onUpdate(idx, 'templateKey', e.target.value)}
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
          onChange={e => onUpdate(idx, 'targetValue', e.target.value)}
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
          onChange={e => onUpdate(idx, 'rewardAmount', e.target.value)}
          placeholder="e.g. 500"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium bg-slate-900/80 border border-slate-700/50 text-slate-200 focus:outline-none focus:border-indigo-500/60 transition-colors placeholder-slate-600"
        />
      </div>

      {/* Preview */}
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
  );
}

// ── Recurring Config Panel ────────────────────────────────────────────────────
/**
 * The new "Recurring" panel for a single period.
 * Daily: tabs for Mon-Sun
 * Weekly: tabs for Week 1-4
 * Monthly: single form
 *
 * When saved, the configuration repeats automatically every cycle.
 */
function RecurringPanel({ period, templates, recurringData, scheduledData, currentPeriodKey, onSave, saving }) {
  const cfg    = PERIOD_COLORS[period];
  const label  = PERIOD_LABELS[period];
  const meta   = CYCLE_META[period];

  // Auto-open on the currently-active cycle index
  const liveIdx = getCurrentCycleIndex(period);
  const [activeIdx, setActiveIdx] = useState(liveIdx);

  // Build slots for a given cycleDayIndex from DB data
  const buildSlots = useCallback((idx) => {
    return [1, 2, 3].map(order => {
      const existing = (recurringData || []).find(
        r => r.period === period && r.cycleDayIndex === idx && r.displayOrder === order
      );
      if (existing && existing.templateKey) {
        return {
          templateKey:  existing.templateKey,
          targetValue:  String(existing.targetValue  || ''),
          rewardAmount: String(existing.rewardAmount || ''),
          isEnabled:    existing.isEnabled,
          displayOrder: order,
          recurringId:  existing._id,
        };
      }
      return emptySlot(order);
    });
  }, [recurringData, period]);

  const [slots, setSlots] = useState(() => buildSlots(liveIdx));

  // Rebuild slots when active tab changes or data refreshes
  useEffect(() => { setSlots(buildSlots(activeIdx)); }, [activeIdx, buildSlots]);

  const updateSlot = (idx, field, value) =>
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  const clearSlot = (idx) =>
    setSlots(prev => prev.map((s, i) => i === idx ? emptySlot(s.displayOrder) : s));

  const hasData = (idx) =>
    (recurringData || []).some(r => r.period === period && r.cycleDayIndex === idx && r.templateKey);

  const savingKey = `recurring-${period}-${activeIdx}`;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-3"
        style={{ borderColor: cfg.border }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${cfg.accent}20`, color: cfg.accent, border: `1px solid ${cfg.accent}30` }}
          >
            <FiRepeat className="text-sm" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">{label} — Recurring Config</h3>
            <p className="text-xs text-slate-500">
              {period === 'daily'   && 'Configure missions for each day of the week — repeats automatically every week'}
              {period === 'weekly'  && 'Configure 4 different weekly setups — repeats in a 4-week cycle automatically'}
              {period === 'monthly' && 'Configure monthly missions once — repeats every month until you change it'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onSave(period, activeIdx, slots)}
          disabled={saving === savingKey}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:brightness-110"
          style={{
            background: cfg.accent,
            color: period === 'monthly' ? '#1c1400' : '#fff',
            boxShadow: `0 0 12px ${cfg.accent}50`,
          }}
        >
          {saving === savingKey
            ? <><FiRefreshCw className="animate-spin text-xs" /> Saving…</>
            : <><FiSave className="text-xs" /> Save {meta.labels[activeIdx]}</>
          }
        </button>
      </div>

      {/* Cycle tabs (hidden for monthly since there's only one) */}
      {meta.length > 1 && (
        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {meta.labels.map((lbl, idx) => {
            const done    = hasData(idx);
            const isLive  = idx === liveIdx;
            const isOpen  = activeIdx === idx;

            return (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className="rounded-xl px-4 py-2 text-xs font-bold transition-all border flex items-center gap-1.5"
                style={{
                  background: isOpen
                    ? cfg.accent
                    : done
                      ? `${cfg.accent}15`
                      : 'rgba(15,23,42,0.5)',
                  borderColor: isOpen
                    ? cfg.accent
                    : done
                      ? `${cfg.accent}50`
                      : 'rgba(51,65,85,0.5)',
                  color: isOpen
                    ? (period === 'monthly' ? '#1c1400' : '#fff')
                    : done
                      ? cfg.text
                      : '#475569',
                }}
              >
                {done && !isOpen && <FiCheck className="text-[10px]" />}
                {lbl}
                {isLive && (
                  <span
                    className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                    style={{
                      background: isOpen ? 'rgba(255,255,255,0.25)' : `${cfg.accent}25`,
                      color: isOpen ? '#fff' : cfg.accent,
                      border: `1px solid ${isOpen ? 'rgba(255,255,255,0.3)' : `${cfg.accent}50`}`,
                    }}
                  >
                    LIVE
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Slot cards */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slot, idx) => (
          <SlotCard
            key={idx}
            slot={slot}
            idx={idx}
            templates={templates}
            period={period}
            onUpdate={updateSlot}
            onClear={clearSlot}
          />
        ))}
      </div>
    </div>
  );
}


// ── Live Period Panel ─────────────────────────────────────────────────────────
function PeriodPanel({ period, templates, configs, onSave, saving }) {
  const cfg   = PERIOD_COLORS[period];
  const label = PERIOD_LABELS[period];

  const buildSlots = () =>
    [1, 2, 3].map(order => {
      const existing = configs.find(c => c.period === period && c.displayOrder === order);
      if (existing) {
        return {
          templateKey:  existing.templateKey,
          targetValue:  String(existing.targetValue),
          rewardAmount: String(existing.rewardAmount),
          isEnabled:    existing.isEnabled,
          displayOrder: order,
          configId:     existing._id,
        };
      }
      return emptySlot(order);
    });

  const [slots, setSlots] = useState(buildSlots);
  useEffect(() => { setSlots(buildSlots()); }, [configs]); // eslint-disable-line

  const updateSlot = (idx, field, value) =>
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  const clearSlot = (idx) =>
    setSlots(prev => prev.map((s, i) => i === idx ? emptySlot(s.displayOrder) : s));

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}
    >
      {/* Period header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-3"
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
            <h3 className="font-bold text-slate-100 text-base">{label} — Instant Override</h3>
            <p className="text-xs text-slate-500">Apply immediate updates to missions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSave(period, slots)}
            disabled={saving === period}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:brightness-110"
            style={{
              background: cfg.accent,
              color: '#fff',
              boxShadow: `0 0 12px ${cfg.accent}50`,
            }}
          >
            {saving === period ? (
              <><FiRefreshCw className="animate-spin text-xs" /> Saving…</>
            ) : (
              <>
                <FiZap className="text-xs" /> Apply Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Slot cards */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slot, idx) => (
          <SlotCard
            key={idx}
            slot={slot}
            idx={idx}
            templates={templates}
            period={period}
            onUpdate={updateSlot}
            onClear={clearSlot}
          />
        ))}
      </div>
    </div>
  );
}

// ── Period Completion Bonus Config Panel ──────────────────────────────────────
function PeriodBonusConfig({ config, onSave, saving }) {
  const [local, setLocal] = useState({
    daily:   { enabled: true, bonusAmount: 0 },
    weekly:  { enabled: true, bonusAmount: 0 },
    monthly: { enabled: true, bonusAmount: 0 },
  });

  useEffect(() => { if (config) setLocal(config); }, [config]);

  const update = (period, field, value) =>
    setLocal(prev => ({ ...prev, [period]: { ...prev[period], [field]: value } }));

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}
    >
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

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {['daily', 'weekly', 'monthly'].map(period => {
        const s   = stats[period] || {};
        const cfg = PERIOD_COLORS[period];
        return (
          <div key={period} className="rounded-xl p-4" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
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
  const [templates,     setTemplates]     = useState([]);
  const [configs,       setConfigs]       = useState([]);
  const [stats,         setStats]         = useState(null);
  const [bonusConfig,   setBonusConfig]   = useState(null);
  const [recurringData, setRecurringData] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(null);
  const [savingBonus,   setSavingBonus]   = useState(false);
  // 'recurring' | 'instant'
  const [activeTab,     setActiveTab]     = useState('recurring');

  const fetchData = useCallback(async () => {
    try {
      const token   = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [tmplRes, cfgRes, statsRes, bonusRes, recurringRes] = await Promise.all([
        fetch(`${API}/missions/admin/templates`,      { headers }),
        fetch(`${API}/missions/admin/configs`,        { headers }),
        fetch(`${API}/missions/admin/stats`,          { headers }),
        fetch(`${API}/missions/admin/period-bonus-config`, { headers }),
        fetch(`${API}/missions/admin/recurring`,      { headers }),
      ]);

      const [tmplData, cfgData, statsData, bonusData, recurringJson] = await Promise.all([
        tmplRes.json(), cfgRes.json(), statsRes.json(), bonusRes.json(),
        recurringRes.json(),
      ]);

      if (tmplData.success)      setTemplates(tmplData.templates);
      if (cfgData.success)       setConfigs(cfgData.configs);
      if (statsData.success)     setStats(statsData.stats);
      if (bonusData.success)     setBonusConfig(bonusData.config);
      if (recurringJson.success) setRecurringData(recurringJson.recurring);
    } catch (err) {
      toast.error('Failed to load mission data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Save Recurring Config ────────────────────────────────────────────────
  const handleSaveRecurring = async (period, cycleDayIndex, slots) => {
    const savingKey = `recurring-${period}-${cycleDayIndex}`;
    setSaving(savingKey);
    try {
      const token   = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const res = await fetch(`${API}/missions/admin/recurring/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          period,
          cycleDayIndex,
          slots: slots.map(s => ({
            displayOrder: s.displayOrder,
            templateKey:  s.templateKey  || '',
            targetValue:  Number(s.targetValue)  || 0,
            rewardAmount: Number(s.rewardAmount) || 0,
            isEnabled:    s.isEnabled,
          })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        const cycleLabel = CYCLE_META[period].labels[cycleDayIndex] || `Index ${cycleDayIndex}`;
        toast.success(`${PERIOD_LABELS[period]} recurring config saved for ${cycleLabel}! 🔁`, { icon: '✅' });
        fetchData();
      } else {
        toast.error(json.error || 'Failed to save recurring config');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  // ── Save Live Config ────────────────────────────
  const handleSavePeriod = async (period, slots) => {
    setSaving(period);
    try {
      const token   = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      // Instant: upsert MissionConfig
      const ops = [];
      for (const slot of slots) {
        if (!slot.templateKey) {
          if (slot.configId) {
            ops.push(fetch(`${API}/missions/admin/configs/${slot.configId}`, { method: 'DELETE', headers }));
          }
        } else {
          ops.push(
            fetch(`${API}/missions/admin/configs`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                templateKey:  slot.templateKey,
                period,
                displayOrder: slot.displayOrder,
                targetValue:  Number(slot.targetValue) || 1,
                rewardAmount: Number(slot.rewardAmount) || 0,
                isEnabled:    slot.isEnabled,
              }),
            })
          );
        }
      }

      const results = await Promise.all(ops);
      const failed  = results.filter(r => !r.ok);
      if (failed.length > 0) {
        const errJson = await failed[0].json().catch(() => ({}));
        throw new Error(errJson.error || 'Some configs failed to save');
      }

      toast.success(`${PERIOD_LABELS[period]} missions applied instantly!`, { icon: '⚡' });
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

  const TABS = [
    {
      id: 'recurring',
      label: 'Recurring Config',
      icon: <FiRepeat className="text-xs" />,
      color: '#10b981',
      desc: 'Set-and-forget weekly/monthly cycles',
    },
    {
      id: 'instant',
      label: 'Instant Override',
      icon: <FiZap className="text-xs" />,
      color: '#6366f1',
      desc: 'Apply or stage changes now',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FiTarget className="text-indigo-400 text-xl" />
            <h1 className="text-xl font-black text-slate-100">Mission Management</h1>
          </div>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl">
            Configure recurring missions or apply instant overrides.
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

      {/* Tab Switcher */}
      <div
        className="flex rounded-xl overflow-hidden border p-1 gap-1"
        style={{ borderColor: 'rgba(51,65,85,0.6)', background: 'rgba(15,23,42,0.6)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex-1 justify-center"
            style={{
              background: activeTab === tab.id ? tab.color : 'transparent',
              color: activeTab === tab.id ? (tab.id === 'schedule' ? '#1c1400' : '#fff') : '#64748b',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── RECURRING CONFIG TAB ── */}
      {activeTab === 'recurring' && (
        <>

          {['daily', 'weekly', 'monthly'].map(period => (
            <RecurringPanel
              key={period}
              period={period}
              templates={templates}
              recurringData={recurringData}
              onSave={handleSaveRecurring}
              saving={saving}
            />
          ))}

          <PeriodBonusConfig
            config={bonusConfig}
            saving={savingBonus}
            onSave={async (localCfg) => {
              setSavingBonus(true);
              try {
                const token = await currentUser.getIdToken();
                const res   = await fetch(`${API}/missions/admin/period-bonus-config`, {
                  method:  'PUT',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body:    JSON.stringify(localCfg),
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
        </>
      )}

      {/* ── INSTANT OVERRIDE TAB ── */}
      {activeTab === 'instant' && (
        <>
          <div
            className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}
          >
            <strong>Instant Override:</strong> Use <span className="font-black text-indigo-400">⚡ Apply Now</span> to change missions immediately for the
            current active period.
            <strong> Note: Instant changes do NOT affect the recurring config</strong> — they only override the live default.
          </div>

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
        </>
      )}

      {/* Templates reference — always visible */}
      <TemplatesTable templates={templates} />
    </div>
  );
};

export default AdminMissions;
