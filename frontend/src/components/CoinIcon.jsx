import React from 'react';

const CoinIcon = ({ size = 16, className = '', coinId = null }) => {
  if (coinId) {
    return (
      <img 
        src={`/coins/coin ${coinId}.png`} 
        width={size} 
        height={size} 
        className={`inline-block ${className} object-contain`} 
        style={{ flexShrink: 0 }} 
        alt="Coin" 
      />
    );
  }

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="coinGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" /> {/* purple-500 */}
          <stop offset="1" stopColor="#3b82f6" /> {/* blue-500 */}
        </linearGradient>
        <linearGradient id="coinInner" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c084fc" /> {/* purple-400 */}
          <stop offset="1" stopColor="#60a5fa" /> {/* blue-400 */}
        </linearGradient>
        <filter id="coinGlow" x="-2" y="-2" width="28" height="28" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <circle cx="12" cy="12" r="10" fill="url(#coinGrad)" filter="url(#coinGlow)" />
      <circle cx="12" cy="12" r="7" fill="url(#coinInner)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      
      {/* Inner Gem shape */}
      <path d="M12 7L15.5 12L12 17L8.5 12L12 7Z" fill="rgba(255,255,255,0.9)" />
      <path d="M12 7L15.5 12L12 17" fill="rgba(255,255,255,0.5)" />
      <path d="M8.5 12H15.5" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
    </svg>
  );
};

export default CoinIcon;
