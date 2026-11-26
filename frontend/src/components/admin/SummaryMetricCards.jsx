import { useMemo, useId } from 'react';
import { FiUsers, FiZap, FiCreditCard, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import CoinDisplay from '../CoinDisplay';
import { buildSmoothLinePath } from './chartUtils';

const SPARK_W = 136;
const SPARK_H = 56;
const SPARK_PAD_X = 4;
const SPARK_PAD_TOP = 6;
const SPARK_PAD_BOTTOM = 4;

const buildSparklinePaths = (series = []) => {
  const values = Array.isArray(series) && series.length > 0 ? series.map((v) => Number(v) || 0) : [0, 0];
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const span = maxVal - minVal;

  const usableW = SPARK_W - SPARK_PAD_X * 2;
  const usableH = SPARK_H - SPARK_PAD_TOP - SPARK_PAD_BOTTOM;
  const stepX = values.length > 1 ? usableW / (values.length - 1) : 0;

  const points = values.map((val, idx) => {
    const x = values.length > 1 ? SPARK_PAD_X + idx * stepX : SPARK_W / 2;
    const normalized = span === 0 ? (val > 0 ? 0.55 : 0.1) : (val - minVal) / span;
    const y = SPARK_PAD_TOP + usableH - normalized * (usableH * 0.85) - usableH * 0.08;
    return { x, y };
  });

  const linePath = buildSmoothLinePath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${SPARK_H} L ${points[0].x.toFixed(2)} ${SPARK_H} Z`;
  return { linePath, areaPath };
};

const Sparkline = ({ series, color, idPrefix }) => {
  const { linePath, areaPath } = useMemo(() => buildSparklinePaths(series), [series]);
  const gradId = `spark-${idPrefix}`;

  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      className="admin-summary-spark"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const SummaryMetricCards = ({ metrics }) => {
  const uid = useId().replace(/:/g, '');

  const cards = [
    {
      key: 'totalUsers',
      label: 'Total Users',
      icon: FiUsers,
      iconClass: 'bg-emerald-50 text-emerald-600',
      color: '#059669',
      metric: metrics?.totalUsers || { value: 0, changePct: 0, series: [] },
      renderValue: (val) => (val || 0).toLocaleString(),
    },
    {
      key: 'activeUsers',
      label: 'Active Users',
      icon: FiZap,
      iconClass: 'bg-indigo-50 text-indigo-600',
      color: '#4F46E5',
      metric: metrics?.activeUsers || { value: 0, changePct: 0, series: [] },
      renderValue: (val) => (val || 0).toLocaleString(),
    },
    {
      key: 'totalEarnings',
      label: 'Total Earnings',
      icon: FiCreditCard,
      iconClass: 'bg-blue-50 text-blue-600',
      color: '#2563EB',
      metric: metrics?.totalEarnings || { value: 0, changePct: 0, series: [] },
      renderValue: (val) => <CoinDisplay amount={val || 0} size={20} compact={false} />,
    },
  ];

  return (
    <div className="admin-summary-grid">
      {cards.map((card) => {
        const pct = Number(card.metric.changePct) || 0;
        const isNegative = pct < 0;
        const formattedPct = `${isNegative ? '' : '+'}${pct.toFixed(1)}%`;

        return (
          <div key={card.key} className="admin-summary-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 ${card.iconClass}`}>
              <card.icon style={{ fontSize: '18px' }} />
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="admin-summary-value">
                  {card.renderValue(card.metric.value)}
                </div>
                <div className="admin-summary-label">{card.label}</div>
                <div
                  className="admin-summary-trend"
                  style={{ color: isNegative ? '#DC2626' : '#059669' }}
                >
                  {isNegative ? <FiArrowDown size={13} /> : <FiArrowUp size={13} />}
                  <span>{formattedPct}</span>
                </div>
              </div>

              <Sparkline
                series={card.metric.series}
                color={card.color}
                idPrefix={`${uid}-${card.key}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryMetricCards;
