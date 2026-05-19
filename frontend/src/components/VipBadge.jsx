import { TIER_STYLES } from '../utils/vipLevels';

/**
 * VipBadge — renders a stylized VIP tier badge.
 * Props:
 *  tier   — 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Opal'
 *  rank   — 'I' | 'II' | 'III' | ''
 *  size   — 'xs' | 'sm' | 'md' | 'lg'
 *  inline — if true, renders as an inline element (for chat)
 */
const SIZE = {
  xs: { badge: { fontSize: '0.55rem', padding: '1px 5px', borderRadius: 4, gap: 2 }, roman: { fontSize: '0.5rem' } },
  sm: { badge: { fontSize: '0.62rem', padding: '2px 7px', borderRadius: 5, gap: 3 }, roman: { fontSize: '0.55rem' } },
  md: { badge: { fontSize: '0.75rem', padding: '4px 10px', borderRadius: 7, gap: 4 }, roman: { fontSize: '0.65rem' } },
  lg: { badge: { fontSize: '1.05rem', padding: '6px 14px', borderRadius: 9, gap: 5 }, roman: { fontSize: '0.85rem' } },
};

const VipBadge = ({ tier = 'Bronze', rank = 'I', size = 'sm', style = {} }) => {
  const s = TIER_STYLES[tier] || TIER_STYLES.Bronze;
  const sz = SIZE[size] || SIZE.sm;
  const isOpal = tier === 'Opal';

  return (
    <span
      title={rank ? `${tier} ${rank}` : tier}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sz.badge.gap,
        padding: sz.badge.padding,
        borderRadius: sz.badge.borderRadius,
        background: s.gradient,
        border: `1px solid ${s.border}`,
        boxShadow: `0 0 8px ${s.glow}`,
        fontWeight: 800,
        letterSpacing: '0.04em',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...(isOpal ? {
          background: 'linear-gradient(135deg, #7c3aed, #ec4899, #06b6d4)',
          animation: 'opalShimmer 3s ease-in-out infinite',
        } : {}),
        ...style,
      }}
    >
      <span style={{ fontSize: sz.badge.fontSize, color: s.text, textShadow: `0 0 8px ${s.glow}` }}>
        {tier.toUpperCase()}
      </span>
      {rank && (
        <span style={{
          fontSize: sz.roman.fontSize,
          color: s.text,
          opacity: 0.85,
          fontStyle: 'italic',
          fontWeight: 700,
        }}>
          {rank}
        </span>
      )}
      <style>{`
        @keyframes opalShimmer {
          0%,100% { filter: hue-rotate(0deg) brightness(1); }
          50%      { filter: hue-rotate(30deg) brightness(1.15); }
        }
      `}</style>
    </span>
  );
};

export default VipBadge;
