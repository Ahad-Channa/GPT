import { useState, useMemo, useId, useEffect } from 'react';
import { FiUsers } from 'react-icons/fi';
import { buildSmoothLinePath } from './chartUtils';

const CHART_WIDTH = 860;
const CHART_HEIGHT = 280;
const PADDING = { top: 20, right: 24, bottom: 36, left: 48 };
const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

const COLORS = {
  total: '#059669',
  active: '#4F46E5',
};

const PERIOD_OPTIONS = [
  { value: '1d', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '1y', label: 'Last 1 Year' },
  { value: 'custom', label: 'Custom Range' },
];

const getDefaultDates = () => {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6))
    .toISOString()
    .slice(0, 10);
  return { startDate: start, endDate: end };
};

const formatYAxisTick = (val) => {
  if (val >= 1000) {
    const scaled = val / 1000;
    return Number.isInteger(scaled) ? `${scaled}K` : `${scaled.toFixed(1)}K`;
  }
  return String(val);
};

const formatShortLabel = (bucketKey) => {
  if (typeof bucketKey === 'string' && bucketKey.length === 13 && bucketKey[10] === 'T') {
    return `${bucketKey.slice(11, 13)}:00`;
  }
  if (typeof bucketKey === 'string' && bucketKey.length === 7) {
    const date = new Date(`${bucketKey}-01T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return bucketKey;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    });
  }
  const date = new Date(`${bucketKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return bucketKey;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

const formatTooltipLabel = (bucketKey) => {
  if (typeof bucketKey === 'string' && bucketKey.length === 13 && bucketKey[10] === 'T') {
    const datePart = bucketKey.slice(0, 10);
    const hourPart = bucketKey.slice(11, 13);
    const date = new Date(`${datePart}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return bucketKey;
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    return `${formattedDate} • ${hourPart}:00 UTC`;
  }
  if (typeof bucketKey === 'string' && bucketKey.length === 7) {
    const date = new Date(`${bucketKey}-01T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return bucketKey;
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  const date = new Date(`${bucketKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return bucketKey;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const getSubtitleText = (period, customRange) => {
  if (period === '1d') return 'Last 24 hours • Total vs. active users';
  if (period === '7d') return 'Last 7 days • Total vs. active users';
  if (period === '30d') return 'Last 30 days • Total vs. active users';
  if (period === '1y') return 'Last 1 year • Total vs. active users';
  if (period === 'custom' && customRange?.startDate && customRange?.endDate) {
    return `${formatShortLabel(customRange.startDate)} – ${formatShortLabel(customRange.endDate)} • Total vs. active users`;
  }
  return 'Custom range • Total vs. active users';
};

/**
 * Generates clean, evenly spaced Y-axis ticks starting at 0 for both small and large counts.
 */
const buildYAxis = (maxVal) => {
  const targetMax = Math.max(4, maxVal);
  const rawStep = targetMax / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const fraction = rawStep / magnitude;

  let niceFraction = 10;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 5) niceFraction = 5;

  const step = Math.max(1, Math.ceil(niceFraction * magnitude));
  const yMax = step * 4;
  const ticks = [0, step, step * 2, step * 3, yMax];
  return { yMax, ticks };
};

const shouldShowXAxisLabel = (idx, total) => {
  if (total <= 12) return true;
  const step = Math.ceil((total - 1) / 5);
  if (idx === 0 || idx === total - 1) return true;
  if (idx % step === 0 && total - 1 - idx >= Math.ceil(step * 0.5)) return true;
  return false;
};

const UserActivityChart = ({
  data = [],
  period = '7d',
  customRange,
  loading = false,
  onPeriodChange,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [showCustomInputs, setShowCustomInputs] = useState(period === 'custom');
  const defaults = useMemo(() => getDefaultDates(), []);
  const [draftStart, setDraftStart] = useState(customRange?.startDate || defaults.startDate);
  const [draftEnd, setDraftEnd] = useState(customRange?.endDate || defaults.endDate);
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    setHoveredIdx(null);
  }, [data]);

  const handleSelectChange = (e) => {
    const nextPeriod = e.target.value;
    if (nextPeriod === 'custom') {
      setShowCustomInputs(true);
      if (onPeriodChange && draftStart && draftEnd) {
        onPeriodChange('custom', { startDate: draftStart, endDate: draftEnd });
      }
      return;
    }
    setShowCustomInputs(false);
    if (onPeriodChange) {
      onPeriodChange(nextPeriod);
    }
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (!draftStart || !draftEnd || !onPeriodChange) return;
    onPeriodChange('custom', { startDate: draftStart, endDate: draftEnd });
  };

  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return null;

    const maxValue = data.reduce(
      (max, item) => Math.max(max, item.totalUsers || 0, item.activeUsers || 0),
      0
    );
    const { yMax, ticks } = buildYAxis(maxValue);

    const stepX = data.length > 1 ? PLOT_WIDTH / (data.length - 1) : 0;
    const getX = (idx) =>
      data.length > 1 ? PADDING.left + idx * stepX : PADDING.left + PLOT_WIDTH / 2;
    const getY = (val) =>
      PADDING.top + PLOT_HEIGHT - ((val || 0) / yMax) * PLOT_HEIGHT;

    const totalPoints = data.map((item, idx) => ({
      x: getX(idx),
      y: getY(item.totalUsers),
      value: item.totalUsers || 0,
      date: item.date,
    }));

    const activePoints = data.map((item, idx) => ({
      x: getX(idx),
      y: getY(item.activeUsers),
      value: item.activeUsers || 0,
      date: item.date,
    }));

    const baselineY = PADDING.top + PLOT_HEIGHT;
    const totalLinePath = buildSmoothLinePath(totalPoints);
    const activeLinePath = buildSmoothLinePath(activePoints);

    const totalAreaPath = `${totalLinePath} L ${totalPoints[totalPoints.length - 1].x.toFixed(2)} ${baselineY} L ${totalPoints[0].x.toFixed(2)} ${baselineY} Z`;
    const activeAreaPath = `${activeLinePath} L ${activePoints[activePoints.length - 1].x.toFixed(2)} ${baselineY} L ${activePoints[0].x.toFixed(2)} ${baselineY} Z`;

    return {
      yTicks: ticks.map((val) => ({ val, y: getY(val) })),
      totalPoints,
      activePoints,
      totalLinePath,
      activeLinePath,
      totalAreaPath,
      activeAreaPath,
      baselineY,
      colWidth: data.length > 1 ? PLOT_WIDTH / (data.length - 1) : PLOT_WIDTH,
    };
  }, [data]);

  const safeIdx = hoveredIdx !== null && hoveredIdx < data.length ? hoveredIdx : null;
  const activePoint = safeIdx !== null && chartData ? chartData.activePoints[safeIdx] : null;
  const totalPoint = safeIdx !== null && chartData ? chartData.totalPoints[safeIdx] : null;
  const hoveredRow = safeIdx !== null ? data[safeIdx] : null;

  const tooltipLeftPct = totalPoint ? (totalPoint.x / CHART_WIDTH) * 100 : 0;
  const alignRight = safeIdx !== null && safeIdx >= data.length - Math.max(2, Math.ceil(data.length * 0.25));
  const dotRadius = data.length > 14 ? 2.5 : 4;

  return (
    <div className="admin-activity-card flex flex-col justify-between">
      <div>
        <div className="admin-activity-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 shrink-0">
              <FiUsers style={{ fontSize: '17px' }} />
            </div>
            <div>
              <h2 className="admin-activity-title">User Activity</h2>
              <p className="admin-activity-sub">{getSubtitleText(period, customRange)}</p>
            </div>
          </div>

          <div className="admin-activity-controls">
            {loading && (
              <span
                className="w-4 h-4 rounded-full border-2 border-[#1E2538] border-t-transparent animate-spin"
                aria-label="Loading activity"
              />
            )}
            <select
              value={showCustomInputs ? 'custom' : period}
              onChange={handleSelectChange}
              className="admin-activity-select"
              aria-label="Select user activity period"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showCustomInputs && (
          <form onSubmit={handleApplyCustom} className="admin-activity-custom-bar">
            <label className="admin-activity-date-label">
              <span>From</span>
              <input
                type="date"
                value={draftStart}
                max={draftEnd || defaults.endDate}
                onChange={(e) => setDraftStart(e.target.value)}
                className="admin-activity-date-input"
                required
              />
            </label>
            <label className="admin-activity-date-label">
              <span>To</span>
              <input
                type="date"
                value={draftEnd}
                min={draftStart || undefined}
                max={defaults.endDate}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="admin-activity-date-input"
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading || !draftStart || !draftEnd}
              className="admin-activity-apply-btn"
            >
              Apply
            </button>
          </form>
        )}

        <div className="admin-activity-legend mb-3">
          <div className="admin-activity-legend-item">
            <span className="admin-activity-dot" style={{ backgroundColor: COLORS.total }} />
            <span>Total Users</span>
          </div>
          <div className="admin-activity-legend-item">
            <span className="admin-activity-dot" style={{ backgroundColor: COLORS.active }} />
            <span>Active Users</span>
          </div>
        </div>
      </div>

      {!chartData ? (
        <div className="py-16 text-center text-sm text-gray-400">
          No activity data for this period.
        </div>
      ) : (
        <div
          className={`admin-activity-canvas transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="w-full h-auto block select-none"
            role="img"
            aria-label="User activity chart"
          >
            <defs>
              <linearGradient id={`totalArea-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.total} stopOpacity="0.20" />
                <stop offset="100%" stopColor={COLORS.total} stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id={`activeArea-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.active} stopOpacity="0.18" />
                <stop offset="100%" stopColor={COLORS.active} stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {chartData.yTicks.map((tick) => (
              <g key={tick.val}>
                <line
                  x1={PADDING.left}
                  y1={tick.y}
                  x2={CHART_WIDTH - PADDING.right}
                  y2={tick.y}
                  stroke={tick.val === 0 ? '#E5E7EB' : '#F3F4F6'}
                  strokeWidth="1"
                />
                <text
                  x={PADDING.left - 12}
                  y={tick.y + 4}
                  textAnchor="end"
                  fill="#9CA3AF"
                  fontSize="11.5"
                  fontWeight="500"
                >
                  {formatYAxisTick(tick.val)}
                </text>
              </g>
            ))}

            {/* Subtle Vertical Grid Lines & X-Axis Labels */}
            {chartData.totalPoints.map((pt, idx) => {
              const showLabel = shouldShowXAxisLabel(idx, chartData.totalPoints.length);
              return (
                <g key={pt.date}>
                  {showLabel && (
                    <>
                      <line
                        x1={pt.x}
                        y1={PADDING.top}
                        x2={pt.x}
                        y2={chartData.baselineY}
                        stroke="#F3F4F6"
                        strokeWidth="1"
                      />
                      <text
                        x={pt.x}
                        y={CHART_HEIGHT - 10}
                        textAnchor="middle"
                        fill={safeIdx === idx ? '#0E0F0C' : '#6B7280'}
                        fontSize="11.5"
                        fontWeight={safeIdx === idx ? '600' : '500'}
                      >
                        {formatShortLabel(pt.date)}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Area Fills */}
            <path d={chartData.totalAreaPath} fill={`url(#totalArea-${uid})`} />
            <path d={chartData.activeAreaPath} fill={`url(#activeArea-${uid})`} />

            {/* Smooth Lines */}
            <path
              d={chartData.totalLinePath}
              fill="none"
              stroke={COLORS.total}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={chartData.activeLinePath}
              fill="none"
              stroke={COLORS.active}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hover Vertical Crosshair */}
            {totalPoint && (
              <line
                x1={totalPoint.x}
                y1={PADDING.top}
                x2={totalPoint.x}
                y2={chartData.baselineY}
                stroke="#94A3B8"
                strokeWidth="1.25"
                strokeDasharray="4 4"
              />
            )}

            {/* Data Point Dots */}
            {chartData.totalPoints.map((pt, idx) => {
              const isHovered = safeIdx === idx;
              return (
                <circle
                  key={`t-${pt.date}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : dotRadius}
                  fill={COLORS.total}
                  stroke="#FFFFFF"
                  strokeWidth={data.length > 14 && !isHovered ? 1.25 : 2}
                />
              );
            })}

            {chartData.activePoints.map((pt, idx) => {
              const isHovered = safeIdx === idx;
              return (
                <circle
                  key={`a-${pt.date}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : dotRadius}
                  fill={COLORS.active}
                  stroke="#FFFFFF"
                  strokeWidth={data.length > 14 && !isHovered ? 1.25 : 2}
                />
              );
            })}

            {/* Invisible Hover Hit Columns */}
            {chartData.totalPoints.map((pt, idx) => (
              <rect
                key={`hit-${pt.date}`}
                x={pt.x - chartData.colWidth / 2}
                y={PADDING.top}
                width={chartData.colWidth}
                height={PLOT_HEIGHT + 24}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onFocus={() => setHoveredIdx(idx)}
              />
            ))}
          </svg>

          {/* Floating Tooltip */}
          {hoveredRow && totalPoint && activePoint && (
            <div
              className="admin-activity-tooltip"
              style={{
                left: `${tooltipLeftPct}%`,
                top: '16%',
                transform: alignRight ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
              }}
            >
              <div className="admin-activity-tooltip-date">
                {formatTooltipLabel(hoveredRow.date)}
              </div>
              <div className="admin-activity-tooltip-row">
                <span className="admin-activity-dot" style={{ backgroundColor: COLORS.total }} />
                <span className="text-gray-600">Total Users:</span>
                <span className="font-bold text-[#0E0F0C] ml-auto">
                  {(hoveredRow.totalUsers || 0).toLocaleString()}
                </span>
              </div>
              <div className="admin-activity-tooltip-row">
                <span className="admin-activity-dot" style={{ backgroundColor: COLORS.active }} />
                <span className="text-gray-600">Active Users:</span>
                <span className="font-bold text-[#0E0F0C] ml-auto">
                  {(hoveredRow.activeUsers || 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserActivityChart;
