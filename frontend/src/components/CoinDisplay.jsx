import React from 'react';
import CoinIcon from './CoinIcon';
import { formatCoins } from '../config/platform';

const CoinDisplay = ({ amount, size = 14, compact = false, className = '', showIcon = true }) => {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {showIcon && <CoinIcon size={size} />}
      <span>{formatCoins(amount, compact)}</span>
    </span>
  );
};

export default CoinDisplay;
