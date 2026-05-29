import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  FiTarget, FiTrash2, FiToggleLeft, FiToggleRight, FiSave,
  FiRefreshCw, FiBarChart2, FiAward, FiCalendar,
  FiClock, FiCheck, FiChevronRight,
} from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PERIOD_LABELS  = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const PERIOD_COLORS  = {
  daily:   { bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.3)',  text: '#a5b4fc', accent: '#6366f1' },
  weekly:  { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  text: '#6ee7b7', accent: '#10b981' },
  monthly: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  text: '#fcd34d', accent: '#f59e0b' },
};

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
    // "2026-05-29" → "Thu, May 29"
    const d = new Date(key + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  if (period === 'weekly') {
    // "2026-W22" → "Week 22"
    const wNum = key.split('-W')[1];
    return `Week ${wNum}`;
  }
  if (period === 'monthly') {
    // "2026-05" → "May 2026"
    const [y, m] = key.split('-');
    const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  return key;
}

/** Is this periodKey the current one? */
function isCurrentPeriodKey(period, key, upcomingKeys) {
  return upcomingKeys?.[period]?.[0] === key;
}

// ── Apply-Mode Toggle ─────────────────────────────────────────────────────────
function ApplyModeToggle({ value, onChange }) {
  return (
    <div
      className="flex rounded-xl overflow-hidden border text-xs font-bold"
      style={{ borderColor: 'rgba(51,65,85,0.6)' }}
    >
      <button
        onClick={() => onChange('instant')}
        className="flex items-center gap-1.5 px-3 py-1.5 transition-all"
        style={{
          background: value === 'instant' ? '#6366f1' : 'rgba(15,23,42,0.7)',
          color: value === 'instant' ? '#fff' : '#64748b',
        }}
      >
        Instant
      </button>
      <button
        onClick={() => onChange('next_period')}
        className="flex items-center gap-1.5 px-3 py-1.5 transition-all"
        style={{
          background: value === 'next_period' ? '#f59e0b' : 'rgba(15,23,42,0.7)',
          color: value === 'next_period' ? '#1c1400' : '#64748b',
        }}
      >
        <FiClock className="text-[11px]" />
        Next Period
      </button>
    </div>
  );
}

// ── Slot Card (shared between Live + Schedule Ahead) ──────────────────────────
function SlotCard({ slot, idx, templates, period, onUpdate, onClear }) {
  const cfg = PERIOD_COLORS[period];
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

// ── Live Period Panel ─────────────────────────────────────────────────────────
function PeriodPanel({ period, templates, configs, onSave, saving }) {
  const cfg = PERIOD_COLORS[period];
  const label = PERIOD_LABELS[period];
  const [applyMode, setApplyMode] = useState('instant');

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
            <h3 className="font-bold text-slate-100 text-base">{label} Missions</h3>
            <p className="text-xs text-slate-500">Configure up to 3 missions (1 per slot)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ApplyModeToggle value={applyMode} onChange={setApplyMode} />
          <button
            onClick={() => onSave(period, slots, applyMode)}
            disabled={saving === period}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:brightness-110"
            style={{
              background: applyMode === 'next_period' ? '#f59e0b' : cfg.accent,
              color: applyMode === 'next_period' ? '#1c1400' : '#fff',
              boxShadow: `0 0 12px ${applyMode === 'next_period' ? 'rgba(245,158,11,0.4)' : `${cfg.accent}50`}`,
            }}
          >
            {saving === period ? (
              <><FiRefreshCw className="animate-spin text-xs" /> Saving…</>
            ) : (
              <>
                {applyMode === 'next_period' ? <FiClock className="text-xs" /> : <FiSave className="text-xs" />}
                {applyMode === 'next_period' ? `Schedule Next ${label}` : `Save ${label}`}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Apply mode info banner */}
      {applyMode === 'next_period' && (
        <div
          className="mx-5 mt-4 rounded-xl px-4 py-2.5 text-xs flex items-center gap-2"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' }}
        >
          <FiClock className="shrink-0" />
          <span>
            <strong>Next Period mode:</strong> Changes will take effect at the start of the <em>next</em> {period.toLowerCase()} period.
            Users currently in progress will not be affected.
          </span>
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

// ── Schedule Ahead Panel ──────────────────────────────────────────────────────
function ScheduleAheadPanel({ period, templates, upcomingKeys, scheduledData, onSaveScheduled, onClearScheduled, saving }) {
  const cfg   = PERIOD_COLORS[period];
  const label = PERIOD_LABELS[period];
  const keys  = upcomingKeys?.[period] || [];

  // Which slot is currently open for editing
  const [activeKey, setActiveKey] = useState(null);

  // Slots state for the currently active period key
  const buildSlotsForKey = useCallback((pk) => {
    return [1, 2, 3].map(order => {
      const existing = (scheduledData || []).find(
        s => s.period === period && s.periodKey === pk && s.displayOrder === order
      );
      if (existing) {
        return {
          templateKey:  existing.templateKey || '',
          targetValue:  String(existing.targetValue || ''),
          rewardAmount: String(existing.rewardAmount || ''),
          isEnabled:    existing.isEnabled,
          displayOrder: order,
          scheduledId:  existing._id,
        };
      }
      return emptySlot(order);
    });
  }, [scheduledData, period]);

  const [editSlots, setEditSlots] = useState([]);

  // When activeKey changes, rebuild slots
  useEffect(() => {
    if (activeKey) setEditSlots(buildSlotsForKey(activeKey));
  }, [activeKey, buildSlotsForKey]);

  const updateSlot = (idx, field, value) =>
    setEditSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  const clearSlot = (idx) =>
    setEditSlots(prev => prev.map((s, i) => i === idx ? emptySlot(s.displayOrder) : s));

  /** Does this period key have ANY scheduled entries? */
  const hasSchedule = (pk) =>
    (scheduledData || []).some(s => s.period === period && s.periodKey === pk && s.templateKey);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b"
        style={{ borderColor: cfg.border }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${cfg.accent}20`, color: cfg.accent, border: `1px solid ${cfg.accent}30` }}
        >
          <FiCalendar className="text-sm" />
        </div>
        <div>
          <h3 className="font-bold text-slate-100 text-base">{label} — Schedule Ahead</h3>
          <p className="text-xs text-slate-500">Click a period slot to configure missions in advance</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Period key list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {keys.map((pk, i) => {
            const isCurrent = i === 0;
            const scheduled = hasSchedule(pk);
            const isOpen    = activeKey === pk;

            return (
              <button
                key={pk}
                onClick={() => setActiveKey(isOpen ? null : pk)}
                className="rounded-xl px-4 py-3 text-left transition-all border hover:brightness-110"
                style={{
                  background: isOpen
                    ? `${cfg.accent}25`
                    : scheduled
                      ? `${cfg.accent}10`
                      : 'rgba(15,23,42,0.5)',
                  borderColor: isOpen
                    ? cfg.accent
                    : scheduled
                      ? `${cfg.accent}50`
                      : 'rgba(51,65,85,0.5)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: cfg.text }}
                  >
                    {isCurrent ? 'Current' : `+${i} ${period === 'daily' ? 'days' : period === 'weekly' ? 'weeks' : 'months'}`}
                  </span>
                  {scheduled
                    ? <FiCheck className="text-xs" style={{ color: cfg.accent }} />
                    : <FiChevronRight className="text-xs text-slate-600" />
                  }
                </div>
                <div className="text-sm font-bold text-slate-200">
                  {formatPeriodKey(period, pk)}
                </div>
                <div
                  className="text-[10px] mt-1 font-medium"
                  style={{ color: scheduled ? cfg.accent : '#475569' }}
                >
                  {scheduled ? 'Custom scheduled' : 'Using live default'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Editor for the active slot */}
        {activeKey && (
          <div
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: cfg.border }}
          >
            {/* Editor header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-3"
              style={{ borderColor: cfg.border, background: `${cfg.accent}08` }}
            >
              <div>
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">Editing</div>
                <div className="font-bold text-slate-100">{formatPeriodKey(period, activeKey)}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{activeKey}</div>
              </div>
              <div className="flex items-center gap-2">
                {hasSchedule(activeKey) && (
                  <button
                    onClick={() => { onClearScheduled(period, activeKey); setActiveKey(null); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 transition-all"
                  >
                    <FiTrash2 className="text-xs" /> Clear Schedule
                  </button>
                )}
                <button
                  onClick={() => onSaveScheduled(period, activeKey, editSlots)}
                  disabled={saving === `${period}-${activeKey}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:brightness-110"
                  style={{
                    background: cfg.accent,
                    color: '#fff',
                    boxShadow: `0 0 12px ${cfg.accent}50`,
                  }}
                >
                  {saving === `${period}-${activeKey}`
                    ? <><FiRefreshCw className="animate-spin text-xs" /> Saving…</>
                    : <><FiSave className="text-xs" /> Save Schedule</>
                  }
                </button>
              </div>
            </div>

            {/* Slot cards */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {editSlots.map((slot, idx) => (
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
        )}
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
  const [scheduledData, setScheduledData] = useState([]);
  const [upcomingKeys,  setUpcomingKeys]  = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(null);
  const [savingBonus,   setSavingBonus]   = useState(false);
  const [activeTab,     setActiveTab]     = useState('live'); // 'live' | 'schedule'

  const fetchData = useCallback(async () => {
    try {
      const token   = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [tmplRes, cfgRes, statsRes, bonusRes, scheduledRes, keysRes] = await Promise.all([
        fetch(`${API}/missions/admin/templates`,     { headers }),
        fetch(`${API}/missions/admin/configs`,       { headers }),
        fetch(`${API}/missions/admin/stats`,         { headers }),
        fetch(`${API}/missions/admin/period-bonus-config`, { headers }),
        fetch(`${API}/missions/admin/scheduled`,     { headers }),
        fetch(`${API}/missions/admin/upcoming-keys`, { headers }),
      ]);

      const [tmplData, cfgData, statsData, bonusData, scheduledJson, keysData] = await Promise.all([
        tmplRes.json(), cfgRes.json(), statsRes.json(), bonusRes.json(),
        scheduledRes.json(), keysRes.json(),
      ]);

      if (tmplData.success)      setTemplates(tmplData.templates);
      if (cfgData.success)       setConfigs(cfgData.configs);
      if (statsData.success)     setStats(statsData.stats);
      if (bonusData.success)     setBonusConfig(bonusData.config);
      if (scheduledJson.success) setScheduledData(scheduledJson.scheduled);
      if (keysData.success)      setUpcomingKeys(keysData.keys);
    } catch (err) {
      toast.error('Failed to load mission data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Save Live Config (instant or next_period) ────────────────────────────
  const handleSavePeriod = async (period, slots, applyMode = 'instant') => {
    setSaving(period);
    try {
      const token   = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      if (applyMode === 'next_period') {
        // Compute next period key
        const nextKeyRes = await fetch(`${API}/missions/admin/upcoming-keys`, { headers: { Authorization: `Bearer ${token}` } });
        const nextKeyData = await nextKeyRes.json();
        const nextKey = nextKeyData.keys?.[period]?.[1]; // index 1 = next period

        if (!nextKey) throw new Error('Could not determine next period key');

        const ops = slots.map(slot =>
          fetch(`${API}/missions/admin/scheduled`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              period,
              periodKey:    nextKey,
              displayOrder: slot.displayOrder,
              templateKey:  slot.templateKey || '',
              targetValue:  Number(slot.targetValue) || 0,
              rewardAmount: Number(slot.rewardAmount) || 0,
              isEnabled:    slot.isEnabled,
            }),
          })
        );

        const results = await Promise.all(ops);
        const failed  = results.filter(r => !r.ok);
        if (failed.length > 0) {
          const errJson = await failed[0].json().catch(() => ({}));
          throw new Error(errJson.error || 'Some configs failed to schedule');
        }

        toast.success(`${PERIOD_LABELS[period]} missions scheduled for next ${period}!`, { icon: '📅' });
        fetchData();
        return;
      }

      // Instant: original logic — upsert MissionConfig
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

      toast.success(`${PERIOD_LABELS[period]} missions saved!`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  // ── Save Scheduled Config ────────────────────────────────────────────────
  const handleSaveScheduled = async (period, periodKey, slots) => {
    const savingKey = `${period}-${periodKey}`;
    setSaving(savingKey);
    try {
      const token   = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const ops = slots.map(slot =>
        fetch(`${API}/missions/admin/scheduled`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            period,
            periodKey,
            displayOrder: slot.displayOrder,
            templateKey:  slot.templateKey || '',
            targetValue:  Number(slot.targetValue) || 0,
            rewardAmount: Number(slot.rewardAmount) || 0,
            isEnabled:    slot.isEnabled,
          }),
        })
      );

      const results = await Promise.all(ops);
      const failed  = results.filter(r => !r.ok);
      if (failed.length > 0) {
        const errJson = await failed[0].json().catch(() => ({}));
        throw new Error(errJson.error || 'Some slots failed to save');
      }

      toast.success(`Schedule saved for ${formatPeriodKey(period, periodKey)}!`, { icon: '📅' });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save schedule');
    } finally {
      setSaving(null);
    }
  };

  // ── Clear Scheduled Config ───────────────────────────────────────────────
  const handleClearScheduled = async (period, periodKey) => {
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch(`${API}/missions/admin/scheduled/period/${period}/${periodKey}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Schedule cleared — ${formatPeriodKey(period, periodKey)} will use live default.`);
        fetchData();
      } else {
        toast.error(json.error || 'Failed to clear');
      }
    } catch {
      toast.error('Network error');
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
            Configure missions per period, schedule future missions, and set completion bonuses.
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
        <button
          onClick={() => setActiveTab('live')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex-1 justify-center"
          style={{
            background: activeTab === 'live' ? '#6366f1' : 'transparent',
            color: activeTab === 'live' ? '#fff' : '#64748b',
          }}
        >
          Live Config
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex-1 justify-center"
          style={{
            background: activeTab === 'schedule' ? '#f59e0b' : 'transparent',
            color: activeTab === 'schedule' ? '#1c1400' : '#64748b',
          }}
        >
          <FiCalendar className="text-xs" /> Schedule Ahead
        </button>
      </div>

      {/* ── LIVE CONFIG TAB ── */}
      {activeTab === 'live' && (
        <>
          {/* Info notice */}
          <div
            className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc' }}
          >
            <strong>Live Config:</strong> Use <span className="font-black text-indigo-400">⚡ Instant</span> to apply changes right now
            (affects the current period). Use <span className="font-black text-amber-400">🕐 Next Period</span> to stage changes
            without disrupting users currently in progress — changes take effect at the start of the next period.
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

          {/* Period completion bonus config */}
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

      {/* ── SCHEDULE AHEAD TAB ── */}
      {activeTab === 'schedule' && (
        <>
          <div
            className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}
          >
            <strong>Schedule Ahead:</strong> Pre-configure missions for specific upcoming periods.
            Daily shows the next <strong>7 days</strong>, Weekly shows the next <strong>7 weeks</strong>,
            Monthly shows the next <strong>7 months</strong>. Scheduled slots take priority over the live default config.
            Slots without a custom schedule will automatically use the live config when that period becomes active.
          </div>

          {['daily', 'weekly', 'monthly'].map(period => (
            <ScheduleAheadPanel
              key={period}
              period={period}
              templates={templates}
              upcomingKeys={upcomingKeys}
              scheduledData={scheduledData}
              onSaveScheduled={handleSaveScheduled}
              onClearScheduled={handleClearScheduled}
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
