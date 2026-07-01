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
  xs: { badge: { fontSize: '10px', padding: '0 7.94px', gap: '2.63px', minWidth: '44px', height: '18px' }, roman: { fontSize: '10px' } },
  sm: { badge: { fontSize: '10px', padding: '2px 10px', gap: '3px' }, roman: { fontSize: '10px' } },
  md: { badge: { fontSize: '12px', padding: '4px 12px', gap: '4px' }, roman: { fontSize: '12px' } },
  lg: { badge: { fontSize: '14px', padding: '6px 14px', gap: '5px' }, roman: { fontSize: '14px' } },
};

const getBackground = (tier) => {
  switch (tier) {
    case 'Bronze': return 'linear-gradient(180deg, #FF8C00 0%, #90540B 100%)';
    case 'Silver': return 'linear-gradient(180deg, #DEDEDE 0%, #8B8B8B 100%)';
    case 'Gold': return 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%), linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1))';
    case 'Platinum': return 'linear-gradient(180deg, #1FCBE6 0%, #217681 100%)';
    case 'Diamond': return 'linear-gradient(180deg, #7F8AF7 0%, #793EB9 100%)';
    case 'Opal': return 'linear-gradient(180deg, #E079DD 0%, #2757A0 100%)';
    default: return 'linear-gradient(180deg, #FF8C00 0%, #90540B 100%)';
  }
};

const VipBadge = ({ tier = 'Bronze', rank = 'I', size = 'sm', style = {} }) => {
  const sz = SIZE[size] || SIZE.sm;

  return (
    <div
      title={rank ? `${tier} ${rank}` : tier}
      className="flex items-center justify-center overflow-visible"
      style={{
        boxSizing: 'border-box',
        borderRadius: '30px',
        padding: sz.badge.padding,
        minWidth: sz.badge.minWidth,
        height: sz.badge.height,
        background: getBackground(tier),
        display: 'inline-flex',
        gap: sz.badge.gap,
        opacity: 1,
        ...style
      }}
    >
      <span
        className="text-white font-['Barlow_Condensed'] font-semibold leading-[120%] text-center flex items-center justify-center overflow-visible whitespace-nowrap"
        style={{
          fontSize: sz.badge.fontSize,
          letterSpacing: '0%',
        }}
      >
        {tier}
      </span>
      {rank && (
        <span
          className="text-white font-['Barlow_Condensed'] font-semibold leading-[120%] text-center flex items-center justify-center overflow-visible whitespace-nowrap"
          style={{
            fontSize: sz.roman.fontSize,
            letterSpacing: '0%',
          }}
        >
          {rank}
        </span>
      )}
    </div>
  );
};

export default VipBadge;
