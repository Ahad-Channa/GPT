import { useMemo, useId } from 'react';
import {
  FiUsers,
  FiZap,
  FiCreditCard,
  FiUserPlus,
  FiAward,
  FiArrowUp,
  FiArrowDown,
} from 'react-icons/fi';
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

const MetricSparkCard = ({ card, uid }) => {
  const pct = Number(card.metric.changePct) || 0;
  const isNegative = pct < 0;
  const formattedPct = `${isNegative ? '' : '+'}${pct.toFixed(1)}%`;

  return (
    <div className="admin-summary-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 ${card.iconClass}`}>
        <card.icon style={{ fontSize: '18px' }} />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="admin-summary-value">
            {card.renderValue(card.metric.value)}
          </div>
          <div className="admin-summary-label">{card.label}</div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2">
            <span
              className="admin-summary-trend !mt-0"
              style={{ color: isNegative ? '#DC2626' : '#059669' }}
            >
              {isNegative ? <FiArrowDown size={13} /> : <FiArrowUp size={13} />}
              <span>{formattedPct}</span>
            </span>
            {card.subMeta && (
              <span className="admin-summary-meta">{card.subMeta}</span>
            )}
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
};

const SummaryMetricCards = ({ metrics }) => {
  const uid = useId().replace(/:/g, '');

  const primaryCards = [
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

  const affiliatesMetric = metrics?.totalAffiliates || {
    value: 0,
    invitedUsers: 0,
    changePct: 0,
    series: [],
  };
  const affiliatesEarnedMetric = metrics?.totalAffiliatesEarned || {
    value: 0,
    commissionEarned: 0,
    changePct: 0,
    series: [],
  };

  const affiliateCards = [
    {
      key: 'totalAffiliates',
      label: 'Total Affiliates',
      icon: FiUserPlus,
      iconClass: 'bg-teal-50 text-teal-600',
      color: '#0D9488',
      metric: affiliatesMetric,
      renderValue: (val) => (val || 0).toLocaleString(),
      subMeta: `${(affiliatesMetric.invitedUsers || 0).toLocaleString()} Invited`,
    },
    {
      key: 'totalAffiliatesEarned',
      label: 'Total Affiliates Earned',
      icon: FiAward,
      iconClass: 'bg-violet-50 text-violet-600',
      color: '#7C3AED',
      metric: affiliatesEarnedMetric,
      renderValue: (val) => <CoinDisplay amount={val || 0} size={20} compact={false} />,
      subMeta: (
        <span className="inline-flex items-center gap-1">
          <span>Commission:</span>
          <CoinDisplay amount={affiliatesEarnedMetric.commissionEarned || 0} size={12} compact={false} />
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="admin-summary-grid">
        {primaryCards.map((card) => (
          <MetricSparkCard key={card.key} card={card} uid={uid} />
        ))}
      </div>

      <div className="admin-affiliate-grid">
        {affiliateCards.map((card) => (
          <MetricSparkCard key={card.key} card={card} uid={uid} />
        ))}
      </div>
    </>
  );
};

export default SummaryMetricCards;
