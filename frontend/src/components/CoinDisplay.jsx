import React from 'react';
import CoinIcon from './CoinIcon';
import { formatCoins } from '../config/platform';

const CoinDisplay = ({ amount, size = 14, compact = false, className = '', showIcon = true, coinId = null }) => {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{formatCoins(amount, compact)}</span>
      {showIcon && <CoinIcon size={size} coinId={coinId} />}
    </span>
  );
};

export default CoinDisplay;
