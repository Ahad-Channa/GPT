import React from 'react';

const CoinIcon = ({ size = 16, className = '', coinId = null }) => {
  const src = coinId ? `/coins/coin${coinId}.png` : '/coins/coin1.png';
  // Multiply size by 2.8 to account for any transparent padding in the image
  const displaySize = size * 2.8;
  return (
    <img 
      src={src} 
      width={displaySize} 
      height={displaySize} 
      className={`inline-block ${className} object-contain`} 
      style={{ flexShrink: 0 }} 
      alt="Coin" 
    />
  );
};

export default CoinIcon;
