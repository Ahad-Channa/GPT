import { useTranslation } from 'react-i18next';
import { BsQrCode } from 'react-icons/bs';
import { shouldShowQr } from '../../utils/offerPlatforms.js';

// Smartphone QR section shared by every offer modal (Featured, Earn, Goodpicks).
// Rendered only for Android/iOS offers; PC-only offers get nothing.
// The QR is a static icon (not a scannable code).
export default function OfferQrSection({ platforms, isDarkMode = false, textKey = 'goodpicks.scanQrCode' }) {
  const { t } = useTranslation();
  if (!shouldShowQr(platforms)) return null;

  return (
    <div
      data-testid="offer-qr-section"
      style={{
        width: '100%',
        maxWidth: '100%',
        minHeight: '116px',
        background: isDarkMode ? 'transparent' : '#FFFFFF',
        borderRadius: '20px',
        padding: '16px 20px',
        gap: '24px',
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
      }}
      className="w-full shrink-0"
    >
      <div
        style={{
          width: '76px',
          height: '76px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
          background: isDarkMode ? '#FFFFFF' : 'transparent',
          padding: isDarkMode ? '4px' : '0',
        }}
      >
        <BsQrCode size={isDarkMode ? 68 : 76} className="text-[#000000]" />
      </div>
      <div
        style={{
          width: '230px',
          maxWidth: '100%',
          minHeight: '38px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            fontFamily: '"IBM Plex Sans", "Poppins", sans-serif',
            fontWeight: 500,
            fontSize: '13px',
            lineHeight: '18px',
            color: isDarkMode ? '#FFFFFF' : '#000000',
            margin: 0,
            padding: 0,
            whiteSpace: 'pre-line',
          }}
        >
          {t(textKey)}
        </p>
      </div>
    </div>
  );
}
