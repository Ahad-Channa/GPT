import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  FiX, FiAlertCircle, FiLoader,
} from 'react-icons/fi';
import { FaPaypal } from 'react-icons/fa';
import { SiLitecoin } from 'react-icons/si';
import { BsPatchCheckFill } from 'react-icons/bs';

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
    placeholder: 'Your Litecoin address (LTC...)',
    hint: 'We will send LTC to this address at the live market rate.',
  },
  paypal: {
    label: 'PayPal',
    placeholder: 'Your PayPal email address',
    hint: 'Funds will be sent as a PayPal Friends & Family transfer.',
  },
  giftcard: {
    label: 'Gift Card',
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

  const { coinsPerUSD = 1000, withdrawalMethods = [] } = settings;

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

  // Default to Paypal or Litecoin if available
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
  const youReceive = amountNum - feeCoins;
  const totalDeducted = amountNum;

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

  const isGiftCard = method === 'giftcard';

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white shadow-2xl rounded-[30px] w-full p-[10px] flex flex-col my-auto overflow-hidden border border-gray-100 box-border gap-2"
        style={{
          width: '100%',
          maxWidth: isGiftCard && step === 2 ? '680px' : '626px',
          minHeight: step === 1 ? '339px' : step === 4 ? '402px' : 'auto',
          height: step === 1 ? '339px' : step === 4 ? '402px' : 'auto',
          background: '#FFFFFF',
          borderRadius: '30px',
          opacity: 1,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header & Close Button Box */}
        {step < 4 && (
          <div
            className="w-full flex flex-col justify-between shrink-0 relative"
            style={{
              width: '100%',
              maxWidth: '606px',
              height: '143px',
              borderRadius: '16px',
              background: 'rgba(248, 245, 239, 1)',
              padding: '34px 20px 14px 20px',
              boxSizing: 'border-box',
              opacity: 1,
            }}
          >
            {/* Close Button Absolute Top-Right */}
            <button
              id="withdrawal-modal-close"
              onClick={onClose}
              className="absolute top-[16px] right-[20px] rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 cursor-pointer z-10"
              style={{
                width: '22px',
                height: '22px',
                opacity: 1,
              }}
              title="Close"
            >
              <FiX size={13} strokeWidth={2.5} />
            </button>

            {/* Whole Header Layout (565x78) */}
            <div
              className="flex flex-col justify-between"
              style={{
                width: '100%',
                maxWidth: '565px',
                height: '78px',
                gap: '16px',
                boxSizing: 'border-box',
                opacity: 1,
              }}
            >
              <div className="flex flex-col">
                <h2
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '35px',
                    lineHeight: '23px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    width: '100%',
                    maxWidth: '438px',
                    height: '23px',
                    display: 'flex',
                    alignItems: 'center',
                    margin: 0,
                    padding: 0,
                    opacity: 1,
                  }}
                >
                  {isGiftCard ? (
                    step === 2 ? 'Redeem Gift Card' : 'Confirm Redemption'
                  ) : (
                    step === 1 ? 'Select Withdrawal Method' : step === 2 ? 'Enter Details' : 'Confirm Withdrawal'
                  )}
                </h2>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '13px',
                    letterSpacing: '0%',
                    color: '#000000',
                    width: '100%',
                    maxWidth: '565px',
                    height: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    margin: 0,
                    padding: 0,
                    marginTop: '16px',
                    opacity: 1,
                  }}
                >
                  {isGiftCard ? `Step ${step - 1} of 2` : `Step ${step} of 3`}
                </p>
              </div>

              {/* 3-Segment Progress Bar */}
              <div className="flex items-center gap-1.5 w-full">
                <div
                  className={`transition-all ${
                    step >= 1 ? 'bg-[#5B6BF5]' : 'bg-[#ECECF4]'
                  }`}
                  style={{
                    height: '6px',
                    borderRadius: '20px',
                    flex: 1,
                    opacity: 1,
                  }}
                />
                <div
                  className={`transition-all ${
                    step >= 2 ? 'bg-[#5B6BF5]' : 'bg-[#ECECF4]'
                  }`}
                  style={{
                    height: '6px',
                    borderRadius: '20px',
                    flex: 1,
                    opacity: 1,
                  }}
                />
                <div
                  className={`transition-all ${
                    step >= 3 ? 'bg-[#5B6BF5]' : 'bg-[#ECECF4]'
                  }`}
                  style={{
                    height: '6px',
                    borderRadius: '20px',
                    flex: 1,
                    opacity: 1,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Select Withdrawal Method ────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between gap-3 w-full mb-3">
              {orderedMethods.map((m) => {
                const minCoins = m.minUSD * coinsPerUSD;
                const canSelect = balance >= minCoins;
                const isSelected = method === m.id;
                return (
                  <button
                    key={m.id}
                    id={`method-${m.id}`}
                    type="button"
                    onClick={() => { if (canSelect) { setMethod(m.id); setError(''); } }}
                    disabled={!canSelect}
                    className={`flex items-center transition-all text-left border border-transparent ${
                      isSelected
                        ? 'bg-[#1E2538] text-white shadow-sm'
                        : 'bg-[#F9F7F1] hover:bg-[#f4efe3] text-[#0E0F0C]'
                    } ${canSelect ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                    style={{
                      width: '100%',
                      maxWidth: '297px',
                      height: '90px',
                      borderRadius: '16px',
                      paddingTop: '8px',
                      paddingRight: '20px',
                      paddingBottom: '8px',
                      paddingLeft: '8px',
                      gap: '10px',
                      boxSizing: 'border-box',
                      opacity: 1,
                    }}
                  >
                    {/* Left Icon Box (74x74) */}
                    <div
                      className="bg-white flex items-center justify-center shadow-xs shrink-0"
                      style={{
                        width: '74px',
                        height: '74px',
                        borderRadius: '10px',
                        paddingTop: '14px',
                        paddingRight: '17px',
                        paddingBottom: '13px',
                        paddingLeft: '17px',
                        gap: '10px',
                        boxSizing: 'border-box',
                        opacity: 1,
                      }}
                    >
                      {m.id === 'paypal' ? (
                        <FaPaypal className="text-[#00457C] text-[34px]" />
                      ) : (
                        <SiLitecoin className="text-[#345D9D] text-[34px]" />
                      )}
                    </div>

                    {/* Method Details */}
                    <div className="flex flex-col justify-center min-w-0" style={{ gap: '6px' }}>
                      <span
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: '20px',
                          lineHeight: '13px',
                          letterSpacing: '-0.02em',
                          color: isSelected ? '#FFFFFF' : '#000000',
                          width: '137px',
                          height: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          margin: 0,
                          padding: 0,
                          opacity: 1,
                        }}
                      >
                        {m.id === 'paypal' ? 'PayPal' : 'Litecoin'}
                      </span>
                      <span
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 400,
                          fontSize: '12px',
                          lineHeight: '17px',
                          letterSpacing: '0%',
                          color: isSelected ? 'rgba(255, 255, 255, 0.85)' : '#000000',
                          width: '137px',
                          height: '31px',
                          display: 'flex',
                          alignItems: 'center',
                          margin: 0,
                          padding: 0,
                          opacity: 1,
                        }}
                      >
                        Minimum withdrawal<br />{minCoins.toLocaleString()} coin
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Button */}
            <button
              id="withdrawal-next-btn"
              type="button"
              onClick={() => { if (canContinue) { setStep(2); setError(''); } }}
              disabled={!canContinue}
              className="w-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-none border-none outline-none"
              style={{
                width: '100%',
                maxWidth: '604px',
                height: '55px',
                gap: '10px',
                borderRadius: '30px',
                paddingTop: '22px',
                paddingRight: '28px',
                paddingBottom: '22px',
                paddingLeft: '28px',
                background: 'rgba(36, 50, 77, 1)',
                boxSizing: 'border-box',
                opacity: !canContinue ? 0.45 : 1,
                cursor: !canContinue ? 'not-allowed' : 'pointer',
              }}
            >
              <span
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '28px',
                  letterSpacing: '0%',
                  color: '#FFFFFF',
                  width: '74px',
                  height: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 1,
                }}
              >
                Continue
              </span>
            </button>
          </div>
        )}

        {/* ── STEP 2: Enter Details ────────────────────────────────────────── */}
        {step === 2 && selectedConfig && selectedMethod && (
          <div className="flex flex-col gap-4 w-full">
            {isGiftCard ? (
              <div className="flex flex-col gap-2 w-full">
                <label
                  className="font-bold text-[16px] text-[#0E0F0C]"
                  style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                >
                  Select Gift Card
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BRANDS.map((brand) => {
                    const isSelected = giftCardBrand === brand.id;
                    return (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => setGiftCardBrand(brand.id)}
                        className={`flex items-center justify-center p-2 rounded-[14px] border-2 transition-all cursor-pointer bg-[#F9F7F1] h-[72px] ${
                          isSelected ? 'border-[#1E2538] bg-white shadow-sm' : 'border-transparent hover:border-gray-200'
                        }`}
                      >
                        <div className={`w-full h-full flex items-center justify-center ${isSelected ? 'opacity-100' : 'opacity-50'}`}>
                          {brand.logo}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Selected Method Summary Pill */
              <div
                className="flex items-center"
                style={{
                  width: '100%',
                  maxWidth: '606px',
                  height: '90px',
                  borderRadius: '15px',
                  paddingTop: '8px',
                  paddingRight: '20px',
                  paddingBottom: '8px',
                  paddingLeft: '8px',
                  background: 'rgba(36, 50, 77, 1)',
                  gap: '10px',
                  boxSizing: 'border-box',
                  opacity: 1,
                }}
              >
                <div
                  className="bg-white flex items-center justify-center shadow-xs shrink-0"
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '10px',
                    paddingTop: '14px',
                    paddingRight: '17px',
                    paddingBottom: '13px',
                    paddingLeft: '17px',
                    gap: '10px',
                    boxSizing: 'border-box',
                    opacity: 1,
                  }}
                >
                  {method === 'paypal' ? (
                    <FaPaypal className="text-[#00457C] text-[34px]" />
                  ) : (
                    <SiLitecoin className="text-[#345D9D] text-[34px]" />
                  )}
                </div>
                <div
                  className="flex flex-col justify-center min-w-0"
                  style={{
                    width: '100%',
                    maxWidth: '437px',
                    height: '43px',
                    gap: '17px',
                    boxSizing: 'border-box',
                    opacity: 1,
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '23px',
                      lineHeight: '15px',
                      letterSpacing: '-0.02em',
                      color: '#FFFFFF',
                      width: '100%',
                      maxWidth: '437px',
                      height: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      margin: 0,
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    {selectedMethod.label}
                  </span>
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 400,
                      fontSize: method === 'paypal' ? '14px' : '16px',
                      lineHeight: '16px',
                      letterSpacing: '0%',
                      color: 'rgba(255, 255, 255, 0.75)',
                      width: '100%',
                      maxWidth: '500px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      margin: 0,
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    {selectedConfig.hint}
                  </span>
                </div>
              </div>
            )}

            {/* Amount input */}
            <div className="flex flex-col gap-2 w-full">
              <label
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '11px',
                  letterSpacing: '0%',
                  color: '#000000',
                  width: '110px',
                  height: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  margin: 0,
                  padding: 0,
                  opacity: 1,
                }}
              >
                Enter amount
              </label>
              <div
                className="relative flex items-center w-full transition-all border-none outline-none shadow-none"
                style={{
                  width: '100%',
                  maxWidth: '602px',
                  height: '58px',
                  gap: '10px',
                  borderRadius: '50px',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  background: 'rgba(239, 239, 239, 1)',
                  boxSizing: 'border-box',
                  opacity: 1,
                }}
              >
                <input
                  id="withdrawal-amount"
                  type="number"
                  min={minimumCoins}
                  max={balance}
                  step="1"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  placeholder={`Minimum: ${minimumCoins.toLocaleString()} Coins`}
                  className="bg-transparent border-none outline-none p-0 flex-1 h-full placeholder:text-black/50"
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 400,
                    fontSize: '15px',
                    lineHeight: '26px',
                    letterSpacing: '0%',
                    color: 'rgba(0, 0, 0, 1)',
                  }}
                />
              </div>
              {amount && !meetsMinimum && (
                <p className="text-red-500 text-xs mt-0.5" style={{ fontFamily: '"Poppins", sans-serif' }}>
                  Minimum is {minimumCoins.toLocaleString()} Coins
                </p>
              )}
              {amount && !hasEnoughBalance && meetsMinimum && (
                <p className="text-red-500 text-xs mt-0.5" style={{ fontFamily: '"Poppins", sans-serif' }}>
                  Insufficient balance (need {totalDeducted.toLocaleString()} including fee)
                </p>
              )}
            </div>

            {/* Destination input */}
            <div className="flex flex-col gap-2 w-full">
              <label
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '11px',
                  letterSpacing: '0%',
                  color: '#000000',
                  width: '110px',
                  height: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  margin: 0,
                  padding: 0,
                  opacity: 1,
                }}
              >
                {method === 'litecoin' ? 'LTC Address' : method === 'paypal' ? 'PayPal Email' : 'Email Address'}
              </label>
              <div
                className="relative flex items-center w-full transition-all border-none outline-none shadow-none"
                style={{
                  width: '100%',
                  maxWidth: '602px',
                  height: '58px',
                  gap: '10px',
                  borderRadius: '50px',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  background: 'rgba(239, 239, 239, 1)',
                  boxSizing: 'border-box',
                  opacity: 1,
                }}
              >
                <input
                  id="withdrawal-destination"
                  type={method === 'litecoin' ? 'text' : 'email'}
                  value={destination}
                  onChange={(e) => { setDestination(e.target.value); setError(''); }}
                  placeholder={selectedConfig.placeholder}
                  className="bg-transparent border-none outline-none p-0 flex-1 h-full placeholder:text-black/50"
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 400,
                    fontSize: '15px',
                    lineHeight: '26px',
                    letterSpacing: '0%',
                    color: 'rgba(0, 0, 0, 1)',
                  }}
                />
              </div>

              {/* Warning Disclaimer */}
              <p
                style={{
                  width: '100%',
                  maxWidth: '602px',
                  minHeight: '25px',
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '12px',
                  lineHeight: '17px',
                  letterSpacing: '0%',
                  color: 'rgba(229, 9, 20, 1)',
                  margin: 0,
                  padding: 0,
                  marginTop: '2px',
                  opacity: 1,
                }}
              >
                {method === 'litecoin'
                  ? '***Please double-check your LTC wallet address. Once the payout is processed, this action cannot be reversed. We are not responsible for lost rewards due to an incorrect address'
                  : '***Please double-check your paypal email address. Once the payout is processed, this action cannot be reversed. We are not responsible for lost rewards due to an incorrect address'}
              </p>
            </div>

            {/* Payout Breakdown Card (606x240) */}
            <div
              className="flex items-center justify-center w-full"
              style={{
                width: '100%',
                maxWidth: '606px',
                height: '240px',
                borderRadius: '16px',
                background: 'rgba(248, 245, 239, 1)',
                padding: '27px 16px',
                boxSizing: 'border-box',
                opacity: 1,
              }}
            >
              {/* Four Elements as One Whole Layout (572.5x186, gap: 25px) */}
              <div
                className="flex flex-col justify-between w-full"
                style={{
                  width: '100%',
                  maxWidth: '572.5px',
                  height: '186px',
                  gap: '25px',
                  boxSizing: 'border-box',
                  opacity: 1,
                }}
              >
                <h4
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    lineHeight: '13px',
                    letterSpacing: '-0.02em',
                    color: '#0E0F0C',
                    width: '100%',
                    maxWidth: '572.5px',
                    height: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    margin: 0,
                    padding: 0,
                    opacity: 1,
                  }}
                >
                  Payout Breakdown
                </h4>

                <div className="flex flex-col gap-2 w-full">
                  {/* Amount You Receive Pill */}
                  <div
                    className="bg-white flex justify-between items-center w-full"
                    style={{
                      width: '100%',
                      maxWidth: '572.5px',
                      height: '53px',
                      borderRadius: '11px',
                      padding: '0 20px',
                      boxSizing: 'border-box',
                      opacity: 1,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '18px',
                        lineHeight: '13px',
                        letterSpacing: '0%',
                        color: '#000000',
                        width: '187px',
                        height: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        margin: 0,
                        padding: 0,
                        opacity: 1,
                      }}
                    >
                      Amount You Receive
                    </span>
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '18px',
                        color: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {youReceive.toLocaleString()}
                    </span>
                  </div>

                  {/* Processing Fees Pill */}
                  <div
                    className="bg-white flex justify-between items-center w-full"
                    style={{
                      width: '100%',
                      maxWidth: '572.5px',
                      height: '53px',
                      borderRadius: '11px',
                      padding: '0 20px',
                      boxSizing: 'border-box',
                      opacity: 1,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '18px',
                        lineHeight: '13px',
                        letterSpacing: '0%',
                        color: '#000000',
                        minWidth: '187px',
                        height: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        margin: 0,
                        padding: 0,
                        opacity: 1,
                      }}
                    >
                      Processing Fees ({methodFeePercent}%)
                    </span>
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '18px',
                        color: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      -{feeCoins.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Total Deducted Row */}
                <div
                  className="flex justify-between items-center w-full px-1"
                  style={{ opacity: 1 }}
                >
                  <span
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '20px',
                      lineHeight: '13px',
                      letterSpacing: '-0.02em',
                      color: '#000000',
                      width: '275px',
                      height: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      margin: 0,
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    Total Deducted From Balance
                  </span>
                  <span
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '20px',
                      lineHeight: '13px',
                      letterSpacing: '-0.02em',
                      color: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 1,
                    }}
                  >
                    {totalDeducted.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
                <FiAlertCircle className="text-red-500 text-sm mt-0.5 shrink-0" />
                <p className="text-red-600 text-xs m-0">{error}</p>
              </div>
            )}

            {/* Actions */}
            <button
              id="withdrawal-next-btn"
              type="button"
              onClick={() => {
                if (!isValidAmount) { setError('Please enter a valid amount.'); return; }
                if (!destination.trim()) { setError('Please enter your payout destination.'); return; }
                setError('');
                setStep(3);
              }}
              disabled={!isValidAmount || !destination.trim()}
              className="w-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-none border-none outline-none"
              style={{
                width: '100%',
                maxWidth: '604px',
                height: '55px',
                gap: '10px',
                borderRadius: '30px',
                paddingTop: '22px',
                paddingRight: '28px',
                paddingBottom: '22px',
                paddingLeft: '28px',
                background: 'rgba(36, 50, 77, 1)',
                opacity: (!isValidAmount || !destination.trim()) ? 0.45 : 1,
                cursor: (!isValidAmount || !destination.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              <span
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '28px',
                  letterSpacing: '0%',
                  color: '#FFFFFF',
                  width: '154px',
                  height: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 1,
                }}
              >
                Review Withdrawal
              </span>
            </button>
          </div>
        )}

        {/* ── STEP 3: Confirm Withdrawal ───────────────────────────────────── */}
        {step === 3 && selectedConfig && selectedMethod && (
          <div className="flex flex-col gap-4 w-full">
            {/* Payout Breakdown Card */}
            <div
              className="flex flex-col justify-between w-full"
              style={{
                width: '100%',
                maxWidth: '606px',
                borderRadius: '16px',
                background: 'rgba(248, 245, 239, 1)',
                padding: '24px 16px',
                gap: '20px',
                boxSizing: 'border-box',
                opacity: 1,
              }}
            >
              <h4
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: '20px',
                  lineHeight: '13px',
                  letterSpacing: '-0.02em',
                  color: '#0E0F0C',
                  width: '100%',
                  height: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  margin: 0,
                  padding: 0,
                  opacity: 1,
                }}
              >
                Payout Breakdown
              </h4>

              <div className="flex flex-col gap-2 w-full">
                {/* Method Pill */}
                <div
                  className="bg-white flex justify-between items-center w-full shadow-xs"
                  style={{
                    width: '100%',
                    height: '53px',
                    borderRadius: '11px',
                    padding: '0 20px',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '18px',
                      color: '#000000',
                    }}
                  >
                    Method
                  </span>
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '18px',
                      color: '#000000',
                    }}
                  >
                    {method === 'giftcard' ? `${selectedMethod.label} (${giftCardBrand})` : selectedMethod.label}
                  </span>
                </div>

                {/* Destination Pill */}
                <div
                  className="bg-white flex justify-between items-center w-full shadow-xs"
                  style={{
                    width: '100%',
                    height: '53px',
                    borderRadius: '11px',
                    padding: '0 20px',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '18px',
                      color: '#000000',
                    }}
                  >
                    Destination
                  </span>
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '18px',
                      color: '#000000',
                      maxWidth: '320px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {destination}
                  </span>
                </div>

                {/* Amount You Receive Pill */}
                <div
                  className="bg-white flex justify-between items-center w-full shadow-xs"
                  style={{
                    width: '100%',
                    height: '53px',
                    borderRadius: '11px',
                    padding: '0 20px',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '18px',
                      color: '#000000',
                    }}
                  >
                    Amount you recevie
                  </span>
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '18px',
                      color: '#000000',
                    }}
                  >
                    {youReceive.toLocaleString()}
                  </span>
                </div>

                {/* Processing Fees Pill */}
                <div
                  className="bg-white flex justify-between items-center w-full shadow-xs"
                  style={{
                    width: '100%',
                    height: '53px',
                    borderRadius: '11px',
                    padding: '0 20px',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '18px',
                      color: '#000000',
                    }}
                  >
                    Processing Fees ({methodFeePercent}%)
                  </span>
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '18px',
                      color: '#000000',
                    }}
                  >
                    +{feeCoins.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Total Deducted Row */}
              <div
                className="flex justify-between items-center w-full px-1"
                style={{ opacity: 1 }}
              >
                <span
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    lineHeight: '13px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  Total Deducted From Balance
                </span>
                <span
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    lineHeight: '13px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {totalDeducted.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Red Notice */}
            <p
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: '12px',
                lineHeight: '17px',
                letterSpacing: '0%',
                color: 'rgba(229, 9, 20, 1)',
                margin: 0,
                padding: 0,
                opacity: 1,
              }}
            >
              This action is irreversible. Your balance will be deducted immediately and the request will be reviewed by our team.
            </p>

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
                <FiAlertCircle className="text-red-500 text-sm mt-0.5 shrink-0" />
                <p className="text-red-600 text-xs m-0">{error}</p>
              </div>
            )}

            {/* Confirm Withdrawal Button */}
            <button
              id="withdrawal-confirm-btn"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-none border-none outline-none"
              style={{
                width: '100%',
                maxWidth: '604px',
                height: '55px',
                gap: '10px',
                borderRadius: '30px',
                paddingTop: '22px',
                paddingRight: '28px',
                paddingBottom: '22px',
                paddingLeft: '28px',
                background: 'rgba(36, 50, 77, 1)',
                boxSizing: 'border-box',
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              <span
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '28px',
                  letterSpacing: '0%',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 1,
                }}
              >
                {submitting ? (
                  <><FiLoader className="animate-spin mr-2" /> Processing...</>
                ) : (
                  'Confirm Withdrawal'
                )}
              </span>
            </button>
          </div>
        )}

        {/* ── STEP 4: Success ─────────────────────────────────────────────── */}
        {step === 4 && (
          <div
            className="relative w-full flex flex-col items-center justify-center text-center overflow-hidden px-8 py-6 box-border"
            style={{
              width: '100%',
              maxWidth: '606px',
              height: '382px',
              background: 'rgba(248, 245, 239, 1)',
              borderRadius: '20px',
            }}
          >
            {/* Bottom Right Corner Background Image */}
            <img
              src="/coins/confirmbottom.png"
              alt=""
              className="absolute bottom-0 right-0 pointer-events-none z-0 select-none"
              style={{
                maxWidth: '260px',
                objectFit: 'contain',
              }}
            />

            {/* Content Box */}
            <div className="relative z-10 flex flex-col items-center text-center w-full max-w-[500px]">
              {/* Blue Verified Badge Image */}
              <div className="flex items-center justify-center mb-3">
                <img
                  src="/coins/confooooom.png"
                  alt="Success"
                  className="w-[64px] h-[64px] object-contain"
                />
              </div>

              {/* Title */}
              <h2
                className="text-[#000000] font-bold text-[32px] leading-tight m-0 mb-3"
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  letterSpacing: '-0.02em',
                }}
              >
                Request Submitted!
              </h2>

              {/* Subtitle / Details */}
              <p
                className="text-[#000000] text-[15px] font-normal leading-[23px] m-0 mb-6"
                style={{ fontFamily: '"Poppins", sans-serif' }}
              >
                Your withdrawal of <span className="font-bold">{amountNum ? amountNum.toLocaleString() : youReceive.toLocaleString()} Coins</span> via {selectedMethod?.label || (method === 'paypal' ? 'PayPal' : 'Litecoin')} has been submitted.
                <br />
                Our team will process your request within 1–3 business days. Check your transaction history for updates.
              </p>

              {/* Done Button */}
              <button
                id="withdrawal-done-btn"
                type="button"
                onClick={onClose}
                className="w-full flex items-center justify-center transition-all cursor-pointer shadow-none border-none outline-none"
                style={{
                  width: '100%',
                  maxWidth: '440px',
                  height: '55px',
                  borderRadius: '30px',
                  background: 'rgba(36, 50, 77, 1)',
                  color: '#FFFFFF',
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default WithdrawalModal;
