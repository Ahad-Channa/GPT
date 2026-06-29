import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { CURRENCY_NAME, formatCoins } from '../../config/platform';
import toast from 'react-hot-toast';
import {
  FiX, FiArrowRight, FiArrowLeft, FiAlertCircle,
  FiCheckCircle, FiLoader, FiInfo, FiCreditCard, FiMail,
} from 'react-icons/fi';



let openModalsCount = 0;
const updateBodyScrollLock = (isLocked) => {
  if (typeof document === 'undefined') return;
  if (isLocked) {
    document.body.style.overflow = 'hidden';
    document.body.style.overflowY = 'hidden';
    document.documentElement.style.overflowY = 'hidden';
  } else {
    document.body.style.overflow = '';
    document.body.style.overflowY = '';
    document.documentElement.style.overflowY = '';
  }
};

const METHOD_CONFIG = {
  litecoin: {
    label: 'Litecoin',
    icon: 'Ł',
    iconBg: 'from-amber-500/20 to-amber-600/10',
    iconColor: 'text-amber-400',
    border: 'border-amber-500/30',
    activeBorder: 'border-amber-400',
    placeholder: 'Your Litecoin address (LTC...)',
    hint: 'We will send LTC to this address at the live market rate.',
  },
  paypal: {
    label: 'PayPal',
    icon: '💳',
    iconBg: 'from-blue-500/20 to-blue-600/10',
    iconColor: 'text-blue-400',
    border: 'border-blue-500/30',
    activeBorder: 'border-blue-400',
    placeholder: 'Your PayPal email address',
    hint: 'Funds will be sent as a PayPal Friends & Family transfer.',
  },
  giftcard: {
    label: 'Gift Card',
    icon: '🎁',
    iconBg: 'from-violet-500/20 to-violet-600/10',
    iconColor: 'text-violet-400',
    border: 'border-violet-500/30',
    activeBorder: 'border-violet-400',
    placeholder: 'Your email to receive gift card',
    hint: 'Gift card will be emailed within 1-3 business days.',
  },
};

const BRANDS = [
  { id: 'Amazon', logo: <img src="/coins/1 (1).png" className="w-full h-full object-contain p-3" alt="Amazon" /> },
  { id: 'Netflix', logo: <img src="/coins/1 (8).png" className="w-full h-full object-contain p-3" alt="Netflix" /> },
  { id: 'Google Play', logo: <img src="/coins/1 (7).png" className="w-full h-full object-contain p-3" alt="Google Play" /> },
  { id: 'Steam', logo: <img src="/coins/1 (6).png" className="w-full h-full object-contain p-3" alt="Steam" /> },
  { id: 'PlayStation', logo: <img src="/coins/1 (5).png" className="w-full h-full object-contain p-3" alt="PlayStation" /> },
  { id: 'Xbox', logo: <img src="/coins/1 (4).png" className="w-full h-full object-contain p-3" alt="Xbox" /> },
  { id: 'Spotify', logo: <img src="/coins/1 (3).png" className="w-full h-full object-contain p-3" alt="Spotify" /> },
  { id: 'Apple', logo: <img src="/coins/1 (2).png" className="w-full h-full object-contain p-3" alt="Apple" /> }
];

const WithdrawalModal = ({ settings, balance, onClose, onSuccess, filterType }) => {
  const { currentUser } = useAuth();

  // Steps: 1 = select method, 2 = enter amount & destination, 3 = confirm, 4 = done
  const [step,        setStep]        = useState(1);
  const [method,      setMethod]      = useState('');
  const [amount,      setAmount]      = useState('');
  const [destination, setDestination] = useState('');
  const [giftCardBrand, setGiftCardBrand] = useState('Amazon');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');

  const overlayRef = useRef(null);

  const isGiftCard = method === 'giftcard';
  const modalWidth = isGiftCard && step !== 4 ? '700px' : '500px';
  const modalHeight = isGiftCard && step !== 4 ? (step === 2 ? '881px' : 'auto') : (step === 1 ? '339px' : step === 2 ? '740px' : step === 4 ? '379px' : 'auto');
  const contentWidth = isGiftCard && step !== 4 ? '668px' : '468px';
  const textWidth = isGiftCard && step !== 4 ? '608px' : '408px';

  const { coinsPerUSD, withdrawalMethods = [], exchangeRates } = settings;

  // Filter methods based on filterType
  const filteredMethods = withdrawalMethods.filter(m => {
    if (filterType === 'paypal_litecoin') return m.id === 'paypal' || m.id === 'litecoin';
    if (filterType === 'giftcards') return m.id === 'giftcard';
    return true;
  });

  // Reorder so Paypal is always first, Litecoin second
  const orderedMethods = [...filteredMethods].sort((a, b) => {
    if (a.id === 'paypal') return -1;
    if (b.id === 'paypal') return 1;
    return 0;
  });

  // Default to Paypal if available
  useEffect(() => {
    if (!method && orderedMethods.length > 0) {
      const hasPaypal = orderedMethods.some(m => m.id === 'paypal');
      setMethod(hasPaypal ? 'paypal' : orderedMethods[0].id);
    }
  }, [orderedMethods, method]);

  // Lock background scroll when open
  useEffect(() => {
    openModalsCount++;
    updateBodyScrollLock(true);
    return () => {
      openModalsCount = Math.max(0, openModalsCount - 1);
      if (openModalsCount === 0) {
        updateBodyScrollLock(false);
      }
    };
  }, []);

  // Skip step 1 if there's only one method
  useEffect(() => {
    if (step === 1 && filteredMethods.length === 1 && !method) {
      setMethod(filteredMethods[0].id);
      setStep(2);
    }
  }, [step, filteredMethods, method]);

  const selectedMethod = method ? withdrawalMethods.find((m) => m.id === method) : null;
  const selectedConfig = method ? METHOD_CONFIG[method] : null;

  const methodFeePercent = selectedMethod?.feePercent ?? (settings.withdrawalFeePercent || 0);

  const amountNum = Number(amount) || 0;
  const feeCoins  = Math.ceil(amountNum * (methodFeePercent / 100));
  const youReceive = amountNum;
  const totalDeducted = amountNum + feeCoins;

  const minimumCoins = selectedMethod ? selectedMethod.minUSD * coinsPerUSD : 0;
  const hasEnoughBalance = totalDeducted <= balance;
  const meetsMinimum = amountNum >= minimumCoins;
  const isValidAmount = amountNum > 0 && meetsMinimum && hasEnoughBalance;

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!isValidAmount || !destination.trim()) {
      setError('Please fill in all fields correctly.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/wallet/withdraw`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          method, 
          amount: amountNum, 
          payoutDestination: destination,
          brand: method === 'giftcard' ? giftCardBrand : undefined
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Withdrawal failed. Please try again.');
        setSubmitting(false);
        return;
      }

      setStep(4); // success screen
      onSuccess(data.newBalance);
      toast.success(`Withdrawal of ${amountNum.toLocaleString()} submitted!`);
    } catch (err) {
      setError('Network error. Please check your connection.');
      setSubmitting(false);
    }
  };

  const selectedMinCoins = selectedMethod ? selectedMethod.minUSD * coinsPerUSD : 0;
  const canContinue = method && balance >= selectedMinCoins;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className={`relative bg-[#242424] border border-white/[0.08] shadow-2xl max-w-[95vw] flex flex-col my-auto overflow-x-hidden ${
          step === 1
            ? 'h-[339px] shrink-0'
            : step === 2
            ? (isGiftCard ? 'h-[881px] shrink-0' : 'h-[740px] shrink-0')
            : step === 4
            ? 'h-[379px] shrink-0'
            : 'h-auto max-h-[90vh] overflow-y-auto custom-scrollbar'
        }`}
        style={{
          width: modalWidth,
          height: modalHeight,
          borderRadius: '20px',
          padding: '16px',
          paddingBottom: (step === 2 || step === 3) ? '24px' : '16px',
          gap: (step === 2 || step === 3) ? '16px' : '20px',
          transform: 'rotate(0deg)',
          opacity: 1,
          background: 'rgba(36, 36, 36, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header / Close Button */}
        {step < 4 ? (
          <div
            className="flex items-start justify-between h-[63px] gap-[16px] shrink-0 relative"
            style={{
              width: contentWidth,
              height: '63px',
              gap: '16px',
              transform: 'rotate(0deg)',
              opacity: 1,
            }}
          >
            <div className="flex flex-col gap-[6px] shrink-0" style={{ width: `calc(${contentWidth} - 52px)` }}>
              <h2
                className="m-0 p-0 text-[28px] font-bold font-['Barlow_Condensed'] text-white leading-[120%] flex items-center"
                style={{
                  width: `calc(${contentWidth} - 52px)`,
                  height: '34px',
                  fontFamily: 'Barlow Condensed',
                  fontWeight: 700,
                  fontSize: '28px',
                  lineHeight: '120%',
                  letterSpacing: '0%',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
              >
                {method === 'giftcard' ? (
                  step === 2 ? 'Redeem Gift Card' : 'Confirm Redemption'
                ) : (
                  step === 1 ? 'Select Withdrawal Method' : step === 2 ? 'Enter Details' : 'Confirm Withdrawal'
                )}
              </h2>
              <p
                className="m-0 p-0 text-[18px] font-medium font-['Barlow_Condensed'] leading-[130%] flex items-center"
                style={{
                  width: `calc(${contentWidth} - 52px)`,
                  height: '23px',
                  fontFamily: 'Barlow Condensed',
                  fontWeight: 500,
                  fontSize: '18px',
                  lineHeight: '130%',
                  letterSpacing: '0%',
                  color: 'var(--Text-text-sheen, rgba(136, 136, 136, 1))',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
              >
                {method === 'giftcard' ? `Step ${step - 1} of 2` : `Step ${step} of 3`}
              </p>
            </div>

            <button
              id="withdrawal-modal-close"
              onClick={onClose}
              className="w-[36px] h-[36px] rounded-[10px] bg-white/[0.11] hover:bg-white/[0.18] transition-colors flex items-center justify-between px-[8px] text-white shrink-0"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                transform: 'rotate(0deg)',
                opacity: 1,
                background: 'rgba(255, 255, 255, 0.11)',
              }}
            >
              <div className="w-full flex justify-center items-center">
                <FiX size={20} strokeWidth={2} />
              </div>
            </button>
          </div>
        ) : (
          <button
            id="withdrawal-modal-close"
            onClick={onClose}
            className="absolute top-[16px] right-[16px] w-[36px] h-[36px] rounded-[10px] bg-white/[0.11] hover:bg-white/[0.18] transition-colors flex items-center justify-between px-[8px] text-white z-10 shrink-0"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              transform: 'rotate(0deg)',
              opacity: 1,
              background: 'rgba(255, 255, 255, 0.11)',
            }}
          >
            <div className="w-full flex justify-center items-center">
              <FiX size={20} strokeWidth={2} />
            </div>
          </button>
        )}

        {/* Content Body */}
        {step === 1 && (
          <>
            <div className="flex flex-col gap-[12px] w-full shrink-0">
              {orderedMethods.map((m) => {
                const cfg = METHOD_CONFIG[m.id];
                if (!cfg) return null;
                const minCoins = m.minUSD * coinsPerUSD;
                const canSelect = balance >= minCoins;
                const isSelected = method === m.id;
                return (
                  <button
                    key={m.id}
                    id={`method-${m.id}`}
                    onClick={() => { if (canSelect) { setMethod(m.id); setError(''); } }}
                    disabled={!canSelect}
                    className={`w-full h-[68px] flex items-center gap-4 px-[16px] py-[12px] rounded-[10px] border transition-all text-left bg-[rgba(0,0,0,0.36)] ${
                      isSelected
                        ? 'border-[#49B265]'
                        : 'border-white/[0.08] hover:bg-[rgba(0,0,0,0.42)] hover:border-white/[0.12]'
                    } ${canSelect ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                  >
                    <img
                      src={m.id === 'paypal' ? '/coins/paypal.png' : '/coins/litecoin.png'}
                      alt={m.label}
                      className="w-[37px] h-[37px] object-contain shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[20px] font-semibold font-['Barlow_Condensed'] text-white leading-[120%] w-[48px] h-[14px] whitespace-nowrap flex items-center">
                        {m.id === 'paypal' ? 'Paypal' : 'Litecoin'}
                      </p>
                      <p className="text-[14px] font-medium font-['Barlow_Condensed'] text-[#888888] leading-tight mt-0.5">
                        Minimum Withdrawal {minCoins.toLocaleString()} Coins
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              id="withdrawal-next-btn"
              onClick={() => { if (canContinue) { setStep(2); setError(''); } }}
              disabled={!canContinue}
              className="w-full h-[48px] bg-[#49B265] text-white rounded-[10px] font-bold font-['Barlow_Condensed'] text-[20px] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-[0_4px_0_0_#276D3A] mt-auto shrink-0"
            >
              Continue →
            </button>
          </>
        )}

        {step === 2 && selectedConfig && selectedMethod && (
          <>
            {method === 'giftcard' ? (
              <div className="flex flex-col gap-[8px] shrink-0" style={{ width: contentWidth }}>
                <label
                  style={{
                    fontFamily: 'Barlow Condensed',
                    fontWeight: 700,
                    fontSize: '22px',
                    lineHeight: '20px',
                    letterSpacing: '-1%',
                    verticalAlign: 'middle',
                    color: 'rgba(255, 255, 255, 1)',
                  }}
                >
                  Select Gift Card
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BRANDS.map((brand) => {
                    const isSelected = giftCardBrand === brand.id;
                    return (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => setGiftCardBrand(brand.id)}
                        className="flex items-center justify-center transition-all cursor-pointer overflow-hidden"
                        style={{
                          width: '161px',
                          height: '90px',
                          borderRadius: '10px',
                          background: 'rgba(23, 23, 23, 1)',
                          borderWidth: '2px',
                          borderStyle: 'solid',
                          borderColor: isSelected ? 'rgba(73, 178, 101, 1)' : 'rgba(255, 255, 255, 0.08)',
                          transform: 'rotate(0deg)',
                          opacity: 1,
                        }}
                      >
                        <div
                          className={`w-full h-full flex items-center justify-center transition-all duration-200 ${
                            isSelected ? 'opacity-100' : 'opacity-40 hover:opacity-75'
                          }`}
                          style={{
                            filter: isSelected ? 'none' : 'grayscale(100%)',
                          }}
                        >
                          {brand.logo}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className="flex items-center shrink-0 relative overflow-hidden"
                style={{
                  width: contentWidth,
                  height: '73px',
                  borderRadius: '12px',
                  gap: '8px',
                  opacity: 1,
                  paddingTop: '16px',
                  paddingRight: '14px',
                  paddingBottom: '16px',
                  paddingLeft: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {/* Background with mix-blend-mode */}
                <div
                  className="absolute inset-0 z-0 pointer-events-none"
                  style={{
                    background: 'rgba(0, 0, 0, 0.36)',
                    mixBlendMode: 'luminosity',
                  }}
                />

                <img
                  src={method === 'paypal' ? '/coins/paypal.png' : method === 'litecoin' ? '/coins/litecoin.png' : '/coins/giftcard.png'}
                  alt={selectedMethod.label}
                  className="object-contain shrink-0 relative z-10"
                  style={{
                    width: '37px',
                    height: '37px',
                    opacity: 1,
                  }}
                />
                <div
                  className="flex flex-col shrink-0 relative z-10"
                  style={{
                    width: '395px',
                    height: '41px',
                    gap: '6px',
                    opacity: 1,
                  }}
                >
                  <p
                    className="font-semibold font-['Barlow_Condensed'] text-white whitespace-nowrap flex items-center"
                    style={{
                      width: '57px',
                      height: '14px',
                      fontFamily: 'Barlow Condensed',
                      fontWeight: 600,
                      fontSize: '20px',
                      lineHeight: '120%',
                      letterSpacing: '0%',
                    }}
                  >
                    {selectedMethod.label}
                  </p>
                  <p
                    className="font-medium font-['Barlow_Condensed'] leading-[130%]"
                    style={{
                      width: '395px',
                      height: '21px',
                      fontFamily: 'Barlow Condensed',
                      fontWeight: 500,
                      fontSize: '16px',
                      letterSpacing: '0%',
                      color: 'var(--Text-text-sheen, rgba(136, 136, 136, 1))',
                    }}
                  >
                    {selectedConfig.hint}
                  </p>
                </div>
              </div>
            )}

            {/* Amount input */}
            <div className="flex flex-col gap-[6px] shrink-0">
              <div className="flex justify-between items-center w-full">
                <label className="text-[16px] font-medium text-white font-['Barlow_Condensed']">Enter Amount</label>
                <span className="text-[14px] font-medium text-[#888888] font-['Barlow_Condensed']">Minimum: {minimumCoins.toLocaleString()} Coins</span>
              </div>
              <div className="relative flex items-center bg-white/[0.04] border border-white/[0.08] focus-within:border-[#49B265] rounded-[10px] h-[56px] w-full px-[16px] transition-all">
                <img src="/coins/coinfix.png" alt="Coin" className="w-[24px] h-[24px] object-contain mr-[10px] shrink-0" />
                <input
                  id="withdrawal-amount"
                  type="number"
                  min={minimumCoins}
                  max={balance}
                  step="1"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  placeholder={`Min ${minimumCoins.toLocaleString()}`}
                  className="bg-transparent text-white font-medium font-['Barlow_Condensed'] text-[18px] leading-[20px] align-middle focus:outline-none border-none p-0 flex-1 h-full placeholder-white/30"
                />
              </div>
              {amount && !meetsMinimum && (
                <p className="text-red-400 text-xs mt-1 font-['Barlow_Condensed']">
                  Minimum is {minimumCoins.toLocaleString()} Coins
                </p>
              )}
              {amount && !hasEnoughBalance && meetsMinimum && (
                <p className="text-red-400 text-xs mt-1 font-['Barlow_Condensed']">
                  Insufficient balance (need {totalDeducted.toLocaleString()} including fee)
                </p>
              )}
            </div>

            {/* Destination input */}
            <div className="flex flex-col gap-[6px] shrink-0">
              <label className="text-[16px] font-medium text-white font-['Barlow_Condensed']">
                {method === 'litecoin' ? 'LTC Address' : method === 'paypal' ? 'PayPal Email' : 'Email Address'}
              </label>
              <div className="relative flex items-center bg-white/[0.04] border border-white/[0.08] focus-within:border-[#49B265] rounded-[10px] h-[56px] w-full px-[16px] transition-all">
                {method === 'litecoin' ? (
                  <img src="/coins/wallet1.png" alt="Wallet" className="w-[24px] h-[24px] object-contain mr-[10px] shrink-0" />
                ) : (
                  <img src="/coins/sms.png" alt="Mail" className="w-[24px] h-[24px] object-contain mr-[10px] shrink-0" />
                )}
                <input
                  id="withdrawal-destination"
                  type={method === 'litecoin' ? 'text' : 'email'}
                  value={destination}
                  onChange={(e) => { setDestination(e.target.value); setError(''); }}
                  placeholder={selectedConfig.placeholder}
                  className="bg-transparent text-white font-medium font-['Barlow_Condensed'] text-[18px] leading-[20px] align-middle focus:outline-none border-none p-0 flex-1 h-full placeholder-white/30"
                />
              </div>
            </div>

            {/* Warning Box */}
            <div
              className="flex items-start shrink-0"
              style={{
                width: contentWidth,
                height: '86px',
                borderRadius: '12px',
                gap: '8px',
                opacity: 1,
                paddingTop: '16px',
                paddingRight: '14px',
                paddingBottom: '16px',
                paddingLeft: '14px',
                background: 'rgba(226, 69, 69, 0.14)',
                backdropFilter: 'blur(44px)',
                border: 'none',
              }}
            >
              <img
                src="/coins/war.png"
                alt="Warning"
                className="shrink-0 object-contain"
                style={{
                  width: '24px',
                  height: '24px',
                  opacity: 1,
                }}
              />
              <p
                className="font-medium font-['Barlow_Condensed']"
                style={{
                  width: textWidth,
                  height: '54px',
                  fontFamily: 'Barlow Condensed',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '130%',
                  color: 'rgba(226, 69, 69, 1)',
                  letterSpacing: '0%',
                  margin: 0,
                  padding: 0,
                }}
              >
                {method === 'litecoin'
                  ? 'Please double-check your LTC wallet address. Once the payout is processed, this action cannot be reversed. We are not responsible for lost rewards due to an incorrect address.'
                  : 'Please make sure you enter the correct email address. Once the payout is processed, this action cannot be reversed. We are not responsible for lost rewards due to incorrect information.'
                }
              </p>
            </div>

            {/* Payout Breakdown */}
            <div
              className="flex flex-col shrink-0"
              style={{
                width: contentWidth,
                height: '158px',
                gap: '12px',
                opacity: 1,
              }}
            >
              <h4
                className="font-semibold font-['Barlow_Condensed'] text-white"
                style={{
                  width: contentWidth,
                  height: '14px',
                  fontFamily: 'Barlow Condensed',
                  fontWeight: 600,
                  fontSize: '20px',
                  lineHeight: '120%',
                  letterSpacing: '0%',
                  textTransform: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  margin: 0,
                  padding: 0,
                }}
              >
                Payout Breakdown
              </h4>

              <div
                className="flex flex-col shrink-0 border border-white/[0.08]"
                style={{
                  width: contentWidth,
                  height: '132px',
                  borderRadius: '12px',
                  padding: '16px',
                  gap: '14px',
                  background: 'rgba(0, 0, 0, 0.36)',
                  backdropFilter: 'blur(44px)',
                }}
              >
                <div className="flex justify-between items-center w-full">
                  <span
                    style={{
                      fontFamily: 'Barlow Condensed',
                      fontWeight: 600,
                      fontSize: '14px',
                      lineHeight: '120%',
                      color: '#ffffff',
                    }}
                  >
                    Amount Your Receive
                  </span>
                  <span
                    style={{
                      fontFamily: 'Barlow Condensed',
                      fontWeight: 600,
                      fontSize: '14px',
                      lineHeight: '120%',
                      color: '#ffffff',
                    }}
                  >
                    {amountNum.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center w-full">
                  <span
                    style={{
                      fontFamily: 'Barlow Condensed',
                      fontWeight: 600,
                      fontSize: '14px',
                      lineHeight: '120%',
                      color: '#ffffff',
                    }}
                  >
                    Processing Fees ({methodFeePercent}%)
                  </span>
                  <span
                    style={{
                      fontFamily: 'Barlow Condensed',
                      fontWeight: 600,
                      fontSize: '14px',
                      lineHeight: '120%',
                      color: '#ffffff',
                    }}
                  >
                    +{feeCoins.toLocaleString()}
                  </span>
                </div>

                <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', width: '100%', flexShrink: 0 }} />

                <div className="flex justify-between items-center w-full text-[#49B265]">
                  <span
                    style={{
                      fontFamily: 'Barlow Condensed',
                      fontWeight: 700,
                      fontSize: '20px',
                      lineHeight: '120%',
                    }}
                  >
                    Total Deducted From Balance
                  </span>
                  <span
                    style={{
                      fontFamily: 'Barlow Condensed',
                      fontWeight: 700,
                      fontSize: '20px',
                      lineHeight: '120%',
                    }}
                  >
                    {totalDeducted.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <FiAlertCircle className="text-red-400 text-sm mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button
              id="withdrawal-next-btn"
              onClick={() => {
                if (!isValidAmount) { setError('Please enter a valid amount.'); return; }
                if (!destination.trim()) { setError('Please enter your payout destination.'); return; }
                setError('');
                setStep(3);
              }}
              disabled={!isValidAmount || !destination.trim()}
              className="bg-[#49B265] text-white font-bold font-['Barlow_Condensed'] text-[20px] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-[10px] mt-auto shrink-0"
              style={{
                width: contentWidth,
                height: '48px',
                borderRadius: '10px',
                gap: '10px',
                opacity: (!isValidAmount || !destination.trim()) ? 0.5 : 1,
                cursor: (!isValidAmount || !destination.trim()) ? 'not-allowed' : 'pointer',
                paddingTop: '10px',
                paddingRight: '30px',
                paddingBottom: '10px',
                paddingLeft: '30px',
              }}
            >
              Review Withdrawal <span className="ml-1">→</span>
            </button>
          </>
        )}

        {step === 3 && selectedConfig && selectedMethod && (
          <div className="flex flex-col gap-[16px] w-full shrink-0">
            {/* Confirm Details Box */}
            <div
              className="flex flex-col shrink-0 border border-white/[0.08]"
              style={{
                width: contentWidth,
                height: '195px',
                borderRadius: '12px',
                padding: '16px',
                gap: '14px',
                background: 'rgba(0, 0, 0, 0.36)',
                backdropFilter: 'blur(44px)',
              }}
            >
              <div className="flex justify-between items-center w-full">
                <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: '14px', lineHeight: '120%', color: '#ffffff' }}>
                  Method
                </span>
                <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: '14px', lineHeight: '120%', color: '#ffffff' }}>
                  {method === 'giftcard' ? `${selectedMethod.label} (${giftCardBrand})` : selectedMethod.label}
                </span>
              </div>

              <div className="flex justify-between items-center w-full">
                <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: '14px', lineHeight: '120%', color: '#ffffff' }}>
                  Destination
                </span>
                <span className="max-w-[240px] truncate" style={{ fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: '14px', lineHeight: '120%', color: '#ffffff' }}>
                  {destination}
                </span>
              </div>

              <div className="flex justify-between items-center w-full">
                <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: '14px', lineHeight: '120%', color: '#ffffff' }}>
                  Amount you receive
                </span>
                <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: '14px', lineHeight: '120%', color: '#ffffff' }}>
                  {amountNum.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center w-full">
                <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: '14px', lineHeight: '120%', color: '#ffffff' }}>
                  Processing Fees ({methodFeePercent}%)
                </span>
                <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 600, fontSize: '14px', lineHeight: '120%', color: '#ffffff' }}>
                  +{feeCoins.toLocaleString()}
                </span>
              </div>

              <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', width: '100%', flexShrink: 0 }} />

              <div className="flex justify-between items-center w-full text-[#49B265]">
                <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '20px', lineHeight: '120%' }}>
                  Total Deducted From Balance
                </span>
                <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '20px', lineHeight: '120%' }}>
                  {totalDeducted.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Warning Box */}
            <div
              className="flex items-start shrink-0"
              style={{
                width: contentWidth,
                height: '86px',
                borderRadius: '12px',
                gap: '8px',
                opacity: 1,
                paddingTop: '16px',
                paddingRight: '14px',
                paddingBottom: '16px',
                paddingLeft: '14px',
                background: 'rgba(226, 69, 69, 0.14)',
                backdropFilter: 'blur(44px)',
                border: '1px solid rgba(226, 69, 69, 0.2)',
              }}
            >
              <img
                src="/coins/war.png"
                alt="Warning"
                className="shrink-0 object-contain"
                style={{
                  width: '24px',
                  height: '24px',
                  opacity: 1,
                }}
              />
              <p
                className="font-medium font-['Barlow_Condensed']"
                style={{
                  width: textWidth,
                  height: '54px',
                  fontFamily: 'Barlow Condensed',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '130%',
                  color: 'rgba(226, 69, 69, 1)',
                  letterSpacing: '0%',
                  margin: 0,
                  padding: 0,
                }}
              >
                This action is irreversible. Your balance will be deducted immediately and the request will be reviewed by our team.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <FiAlertCircle className="text-red-400 text-sm mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button
              id="withdrawal-confirm-btn"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#49B265] text-white font-bold font-['Barlow_Condensed'] text-[20px] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-[10px] mt-auto shrink-0"
              style={{
                width: contentWidth,
                height: '48px',
                borderRadius: '10px',
                gap: '10px',
                opacity: submitting ? 0.5 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
                paddingTop: '10px',
                paddingRight: '30px',
                paddingBottom: '10px',
                paddingLeft: '30px',
              }}
            >
              {submitting ? (
                <><FiLoader className="animate-spin" /> Processing...</>
              ) : (
                <>Confirm Withdrawal <span className="ml-1">→</span></>
              )}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="py-6 flex flex-col items-center gap-[20px] text-center w-full">
              <img
                src="/coins/tik1.png"
                alt="Success"
                className="w-[74px] h-[74px] object-contain shrink-0"
                style={{ transform: 'rotate(0deg)', opacity: 1 }}
              />
            <h2 className="text-white font-bold font-['Barlow_Condensed'] text-[28px] leading-[120%] uppercase w-full">
              Request Submitted!
            </h2>
            <div className="flex flex-col gap-[6px] items-center w-full">
              <p className="text-[#888888] font-medium font-['Barlow_Condensed'] text-[18px] leading-[130%] m-0 p-0 text-center w-full">
                Your withdrawal of <span className="text-white font-mono">{amountNum.toLocaleString()} Coins</span> via{' '}
                <span className="text-white">{selectedMethod?.label}</span> has been submitted.
              </p>
              <p className="text-[#888888] font-medium font-['Barlow_Condensed'] text-[18px] leading-[130%] m-0 p-0 text-center w-full mt-2">
                Our team will process your request within 1–3 business days. Check your transaction history for updates.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full h-[48px] bg-[#49B265] text-white rounded-[10px] font-bold font-['Barlow_Condensed'] text-[20px] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center mt-4"
            >
              Done
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default WithdrawalModal;
