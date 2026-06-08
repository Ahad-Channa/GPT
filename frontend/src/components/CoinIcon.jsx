import React from 'react';

const CoinIcon = ({ size = 16, className = '', coinId = null }) => {
  const src = coinId ? `/coins/coin${coinId}.png` : '/coins/coin1.png';
  return (
    <img 
      src={src} 
      width={size} 
      height={size} 
      className={`inline-block ${className} object-contain`} 
      style={{ flexShrink: 0 }} 
      alt="Coin" 
    />
  );
};

export default CoinIcon;
