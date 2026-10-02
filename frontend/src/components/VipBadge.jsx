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
    case 'Bronze': return 'linear-gradient(180deg, #F3B60A -26.79%, #BE6708 158.93%)';
    case 'Silver': return 'linear-gradient(180deg, #D6D6D6 -26.79%, #929292 158.93%)';
    case 'Gold': return 'linear-gradient(180deg, #FEDD72 -23.08%, #FCBA21 74.64%)';
    case 'Platinum': return 'linear-gradient(180deg, #1FC4DE 0%, #207985 100%)';
    case 'Diamond': return 'linear-gradient(180deg, #7E83F1 0%, #7941BB 100%)';
    case 'Opal': return 'linear-gradient(180deg, #E92BFF 0%, #31BDFF 100%)';
    default: return 'linear-gradient(180deg, #F3B60A -26.79%, #BE6708 158.93%)';
  }
};

const getMiniBadge = (tier) => {
  switch (tier) {
    case 'Bronze': return '/coins/bronze.png';
    case 'Silver': return '/coins/silver.png';
    case 'Gold': return '/coins/gold.png';
    case 'Platinum': return '/coins/platinum.png';
    case 'Diamond': return '/coins/dimond.png';
    case 'Opal': return '/coins/opal.png';
    default: return '/coins/bronze.png';
  }
};

const VipBadge = ({ tier = 'Bronze', rank = 'I', size = 'sm', showIcon = true, style = {} }) => {
  const sz = SIZE[size] || SIZE.sm;
  const icon = getMiniBadge(tier);

  return (
    <div
      title={rank ? `${tier} ${rank}` : tier}
      className="flex items-center justify-center overflow-visible shadow-xs"
      style={{
        boxSizing: 'border-box',
        borderRadius: '30px',
        padding: sz.badge.padding,
        minWidth: sz.badge.minWidth,
        height: sz.badge.height,
        background: getBackground(tier),
        display: 'inline-flex',
        alignItems: 'center',
        gap: sz.badge.gap,
        opacity: 1,
        ...style
      }}
    >
      {showIcon && icon && (
        <img
          src={icon}
          alt={tier}
          style={{
            width: size === 'xs' ? '10px' : size === 'lg' ? '16px' : '12px',
            height: size === 'xs' ? '10px' : size === 'lg' ? '16px' : '12px',
            objectFit: 'contain',
            flexShrink: 0,
          }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <span
        className="text-white font-['Poppins',sans-serif] font-semibold leading-[120%] text-center flex items-center justify-center overflow-visible whitespace-nowrap"
        style={{
          fontSize: sz.badge.fontSize,
          letterSpacing: '0%',
        }}
      >
        {tier}
      </span>
      {rank && (
        <span
          className="text-white font-['Poppins',sans-serif] font-semibold leading-[120%] text-center flex items-center justify-center overflow-visible whitespace-nowrap"
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
