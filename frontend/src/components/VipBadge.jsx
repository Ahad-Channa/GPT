import { TIER_STYLES } from '../utils/vipLevels';

/**
 * VipBadge — renders a stylized VIP tier badge.
 * Props:
 *  tier   — 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Opal'
 *  rank   — 'I' | 'II' | 'III' | ''
 *  size   — 'xs' | 'sm' | 'md' | 'lg'
 */
const SIZE = {
  xs: { badge: { fontSize: '11px', padding: '2px 8px', gap: '3px', height: '18px' }, roman: { fontSize: '11px' } },
  sm: { badge: { fontSize: '11px', padding: '2px 8px', gap: '3px', height: '20px' }, roman: { fontSize: '11px' } },
  md: { badge: { fontSize: '12px', padding: '3px 10px', gap: '4px', height: '22px' }, roman: { fontSize: '12px' } },
  lg: { badge: { fontSize: '13px', padding: '4px 12px', gap: '5px', height: '26px' }, roman: { fontSize: '13px' } },
};

const getBackground = (tier) => {
  switch (tier) {
    case 'Bronze': return 'linear-gradient(180deg, #F3B60A -26.79%, #BE6708 158.93%)';
    case 'Silver': return 'linear-gradient(180deg, #D6D6D6 -26.79%, #929292 158.93%)';
    case 'Gold': return 'linear-gradient(180deg, #FEDD72 -23.08%, #FCBA21 74.64%)';
    case 'Platinum': return 'linear-gradient(180deg, #1FC4DE 0%, #207985 100%)';
    case 'Diamond': return 'linear-gradient(180deg, #7E83F1 0%, #7941BB 100%)';
    case 'Opal': return 'linear-gradient(180deg, #E92BFF 0%, #31BDFF 100%)';
    default: return 'linear-gradient(180deg, #F3B60A -26.79%, #BE6708 158.93%)';
  }
};

const VipBadge = ({ tier = 'Bronze', rank = 'I', size = 'xs', showIcon = false, style = {} }) => {
  const sz = SIZE[size] || SIZE.xs;

  return (
    <div
      title={rank ? `${tier} ${rank}` : tier}
      className="flex items-center justify-center shadow-xs select-none"
      style={{
        boxSizing: 'border-box',
        borderRadius: '100px',
        padding: sz.badge.padding,
        minWidth: 'fit-content',
        width: 'auto',
        height: sz.badge.height,
        background: getBackground(tier),
        display: 'inline-flex',
        alignItems: 'center',
        gap: sz.badge.gap,
        opacity: 1,
        ...style
      }}
    >
      <span
        className="text-white font-['Poppins',sans-serif] font-semibold leading-none text-center flex items-center justify-center whitespace-nowrap"
        style={{
          fontSize: sz.badge.fontSize,
          letterSpacing: '0%',
        }}
      >
        {tier}
      </span>
      {rank && (
        <span
          className="text-white font-['Poppins',sans-serif] font-semibold leading-none text-center flex items-center justify-center whitespace-nowrap"
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
