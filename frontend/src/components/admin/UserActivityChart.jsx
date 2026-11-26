import { useState, useMemo, useId } from 'react';
import { FiUsers } from 'react-icons/fi';

const CHART_WIDTH = 860;
const CHART_HEIGHT = 280;
const PADDING = { top: 20, right: 24, bottom: 36, left: 48 };
const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

const COLORS = {
  total: '#059669',
  active: '#4F46E5',
};

const formatYAxisTick = (val) => {
  if (val >= 1000) {
    const scaled = val / 1000;
    return Number.isInteger(scaled) ? `${scaled}K` : `${scaled.toFixed(1)}K`;
  }
  return String(val);
};

const formatShortDate = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

const formatTooltipDate = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
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

/**
 * Builds a smooth cubic Bezier path with clamped tangents so curves never dip below zero or overshoot.
 */
const buildSmoothLinePath = (points) => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const n = points.length;
  const slopes = [];
  for (let i = 0; i < n - 1; i += 1) {
    const dx = points[i + 1].x - points[i].x || 1;
    slopes.push((points[i + 1].y - points[i].y) / dx);
  }

  const tangents = new Array(n).fill(0);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i += 1) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (slopes[i - 1] + slopes[i]) / 2;
    }
  }

  // Fritsch-Carlson clamp: guarantees smooth curves never overshoot or dip below 0
  for (let i = 0; i < n - 1; i += 1) {
    const s = slopes[i];
    if (s === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i] / s;
      const b = tangents[i + 1] / s;
      const h = Math.hypot(a, b);
      if (h > 3) {
        const scale = 3 / h;
        tangents[i] = scale * a * s;
        tangents[i + 1] = scale * b * s;
      }
    }
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) / 3;
    const cp1x = p0.x + dx;
    const cp1y = p0.y + tangents[i] * dx;
    const cp2x = p1.x - dx;
    const cp2y = p1.y - tangents[i + 1] * dx;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return d;
};

const UserActivityChart = ({ data = [] }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const uid = useId().replace(/:/g, '');

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

  if (!chartData) return null;

  const activePoint = hoveredIdx !== null ? chartData.activePoints[hoveredIdx] : null;
  const totalPoint = hoveredIdx !== null ? chartData.totalPoints[hoveredIdx] : null;
  const hoveredRow = hoveredIdx !== null ? data[hoveredIdx] : null;

  const tooltipLeftPct = totalPoint ? (totalPoint.x / CHART_WIDTH) * 100 : 0;
  const alignRight = hoveredIdx !== null && hoveredIdx >= data.length - 2;

  return (
    <div className="admin-activity-card">
      <div className="admin-activity-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
            <FiUsers style={{ fontSize: '17px' }} />
          </div>
          <div>
            <h2 className="admin-activity-title">User Activity</h2>
            <p className="admin-activity-sub">Last 7 days • Total vs. active users</p>
          </div>
        </div>

        <div className="admin-activity-legend">
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

      <div
        className="admin-activity-canvas"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label="User activity over the last 7 days"
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
          {chartData.totalPoints.map((pt, idx) => (
            <g key={pt.date}>
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
                fill={hoveredIdx === idx ? '#0E0F0C' : '#6B7280'}
                fontSize="11.5"
                fontWeight={hoveredIdx === idx ? '600' : '500'}
              >
                {formatShortDate(pt.date)}
              </text>
            </g>
          ))}

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
            const isHovered = hoveredIdx === idx;
            return (
              <circle
                key={`t-${pt.date}`}
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5.5 : 4}
                fill={COLORS.total}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            );
          })}

          {chartData.activePoints.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <circle
                key={`a-${pt.date}`}
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5.5 : 4}
                fill={COLORS.active}
                stroke="#FFFFFF"
                strokeWidth="2"
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
              {formatTooltipDate(hoveredRow.date)}
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
    </div>
  );
};

export default UserActivityChart;
