import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { buildProviderUrl, getProviderLogo } from './OfferCards';
import { GoodpicksOfferwallModal } from './GoodpicksModal';

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

  // Goodpicks is our in-house custom offerwall matching Figma specs
  if (provider.id === 'goodpicks') {
    return <GoodpicksOfferwallModal onClose={onClose} />;
  }

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
        className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[1000px] h-[95vh] sm:h-[92vh] max-h-[900px] rounded-[18px] sm:rounded-[24px] bg-white shadow-[0px_25px_60px_0px_rgba(0,0,0,0.28)] border border-[rgba(223,225,209,0.7)] flex flex-col gap-1 sm:gap-2 p-1.5 sm:p-2.5 overflow-hidden box-border relative"
        >
          {/* ── Top Header Bar ── */}
          <div
            style={{
              background: 'rgba(248, 245, 239, 1)',
            }}
            className="w-full h-[54px] sm:h-[72px] md:h-[86px] px-2.5 sm:px-6 flex items-center justify-between box-border shrink-0 relative rounded-[14px] sm:rounded-[16px]"
          >
            {/* Left: Provider Logo / Name */}
            <div
              className="max-w-[105px] sm:max-w-[166px] h-[30px] sm:h-[43px] flex items-center justify-start shrink-0"
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
                    color: '#000000',
                  }}
                  className="text-[14px] sm:text-[18px] whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {provider.label || 'Offerwall'}
                </span>
              )}
            </div>

            {/* Center: TaskMint Platform Brand Logo (evenly spaced between provider logo & close button) */}
            <div className="flex-1 flex items-center justify-center pointer-events-none px-2 -translate-x-1 sm:translate-x-0">
              <img
                src="/coins/logo final.svg"
                alt="TaskMint Logo"
                className="h-[22px] sm:h-8 max-w-[110px] sm:max-w-[150px] object-contain select-none"
                onError={(e) => {
                  e.currentTarget.src = '/coins/logo copy.png';
                }}
              />
            </div>

            {/* Right: Black Circular Close Button */}
            <button
              onClick={onClose}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#000000',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
              className="hover:opacity-85 active:scale-95 shrink-0 z-10"
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
