import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { buildProviderUrl, getProviderLogo } from './OfferCards';

export const OfferwallModal = ({ provider, userId, onClose }) => {
  useEffect(() => {
    if (provider) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [provider]);

  if (!provider) return null;

  const url = buildProviderUrl(provider, userId);
  const fallbackLogo = getProviderLogo(provider.id);
  const logoUrl = provider.imageUrl || fallbackLogo;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '1000px',
            height: '92vh',
            maxHeight: '900px',
            borderRadius: '24px',
            background: 'rgba(255, 255, 255, 1)',
            boxShadow: '0px 25px 60px 0px rgba(0, 0, 0, 0.28)',
            border: '1px solid rgba(223, 225, 209, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px 10px 10px',
            overflow: 'hidden',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {/* ── Top Header Bar (width: 968, height: 86, border-radius: 16px, bg: rgba(248, 245, 239, 1)) ── */}
          <div
            style={{
              width: '100%',
              height: '86px',
              background: 'rgba(248, 245, 239, 1)',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              flexShrink: 0,
              position: 'relative',
              borderRadius: '16px',
            }}
          >
            {/* Left: Provider Logo / Name (width: 166, height: 43) */}
            <div
              style={{
                width: '166px',
                height: '43px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                opacity: 1,
              }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={provider.label || 'Provider'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'left center',
                    display: 'block',
                  }}
                  className="select-none"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '18px',
                    color: '#000000',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {provider.label || 'Offerwall'}
                </span>
              )}
            </div>

            {/* Center: TaskMint Platform Brand Logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              <img
                src="/coins/logo final.svg"
                alt="TaskMint Logo"
                className="h-8 sm:h-9 max-w-[150px] object-contain select-none"
                onError={(e) => {
                  e.currentTarget.src = '/coins/logo copy.png';
                }}
              />
            </div>

            {/* Right: Black Circular Close Button (22x22) positioned at top right */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '10px',
                right: '12px',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#000000',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s, opacity 0.15s',
                padding: 0,
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
              className="hover:opacity-85 active:scale-95 z-10"
              title="Close"
            >
              <FiX size={12} />
            </button>
          </div>

          {/* ── Body: Offerwall Iframe Area ── */}
          <div
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
              minHeight: 0,
              background: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '16px',
              border: '1px solid rgba(223, 225, 209, 0.4)',
            }}
          >
            {url ? (
              <iframe
                src={url}
                title={`${provider.label || 'Provider'} Offerwall`}
                className="w-full h-full border-none block"
                style={{ width: '100%', height: '100%' }}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 font-bold text-lg">
                  !
                </div>
                <h4
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '18px',
                    color: '#000000',
                    margin: 0,
                  }}
                >
                  Offerwall Not Configured
                </h4>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontSize: '13px',
                    color: 'rgba(14, 15, 12, 0.7)',
                    maxWidth: '360px',
                    margin: 0,
                  }}
                >
                  This offerwall is currently being set up. Please try another provider or check back soon!
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfferwallModal;
