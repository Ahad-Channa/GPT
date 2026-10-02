import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { formatCoins } from '../../config/platform';
import {
  FiX, FiAlertCircle, FiLoader,
} from 'react-icons/fi';
import { FaPaypal, FaCaretDown, FaCaretUp } from 'react-icons/fa';
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

const COUNTRIES = [
  { id: 'us', code: 'us', name: 'United States', flag: '🇺🇸' },
  { id: 'uk', code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { id: 'ca', code: 'ca', name: 'Canada', flag: '🇨🇦' },
  { id: 'au', code: 'au', name: 'Australia', flag: '🇦🇺' },
  { id: 'de', code: 'de', name: 'Germany', flag: '🇩🇪' },
  { id: 'fr', code: 'fr', name: 'France', flag: '🇫🇷' },
  { id: 'jp', code: 'jp', name: 'Japan', flag: '🇯🇵' },
  { id: 'za', code: 'za', name: 'Africa (South Africa)', flag: '🇿🇦' },
  { id: 'it', code: 'it', name: 'Italy', flag: '🇮🇹' },
  { id: 'es', code: 'es', name: 'Spain', flag: '🇪🇸' },
  { id: 'nl', code: 'nl', name: 'Netherlands', flag: '🇳🇱' },
  { id: 'ch', code: 'ch', name: 'Switzerland', flag: '🇨🇭' },
  { id: 'se', code: 'se', name: 'Sweden', flag: '🇸🇪' },
  { id: 'no', code: 'no', name: 'Norway', flag: '🇳🇴' },
  { id: 'dk', code: 'dk', name: 'Denmark', flag: '🇩🇰' },
  { id: 'pl', code: 'pl', name: 'Poland', flag: '🇵🇱' },
  { id: 'br', code: 'br', name: 'Brazil', flag: '🇧🇷' },
  { id: 'mx', code: 'mx', name: 'Mexico', flag: '🇲🇽' },
  { id: 'in', code: 'in', name: 'India', flag: '🇮🇳' },
  { id: 'pk', code: 'pk', name: 'Pakistan', flag: '🇵🇰' },
  { id: 'ae', code: 'ae', name: 'United Arab Emirates', flag: '🇦🇪' },
  { id: 'sa', code: 'sa', name: 'Saudi Arabia', flag: '🇸🇦' },
  { id: 'tr', code: 'tr', name: 'Turkey', flag: '🇹🇷' },
  { id: 'sg', code: 'sg', name: 'Singapore', flag: '🇸🇬' },
  { id: 'my', code: 'my', name: 'Malaysia', flag: '🇲🇾' },
  { id: 'id', code: 'id', name: 'Indonesia', flag: '🇮🇩' },
  { id: 'ph', code: 'ph', name: 'Philippines', flag: '🇵🇭' },
  { id: 'ng', code: 'ng', name: 'Nigeria', flag: '🇳🇬' },
  { id: 'eg', code: 'eg', name: 'Egypt', flag: '🇪🇬' },
  { id: 'nz', code: 'nz', name: 'New Zealand', flag: '🇳🇿' },
  { id: 'ie', code: 'ie', name: 'Ireland', flag: '🇮🇪' },
  { id: 'be', code: 'be', name: 'Belgium', flag: '🇧🇪' },
  { id: 'at', code: 'at', name: 'Austria', flag: '🇦🇹' },
  { id: 'global', code: 'un', name: 'Worldwide / Global', flag: '🌐' },
];

const CountryFlag = ({ id, size = 43 }) => {
  const item = COUNTRIES.find((c) => c.id === id);
  const code = item?.code || id;
  if (id === 'global') {
    return (
      <span
        style={{
          width: `${size}px`,
          height: `${size}px`,
          fontSize: `${Math.round(size * 0.65)}px`,
        }}
        className="flex items-center justify-center shrink-0"
      >
        🌐
      </span>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/w80/${code.toLowerCase()}.png`}
      alt={item?.name || id}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        opacity: 1,
      }}
      className="rounded-full object-cover shadow-xs shrink-0"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
};

const BRANDS = [
  { id: 'Amazon', logo: <img src="/coins/amazonwidth.png" className="max-h-[26px] xs:max-h-[30px] sm:max-h-[38px] max-w-full sm:max-w-[80px] object-contain" alt="Amazon" /> },
  { id: 'Netflix', logo: <img src="/coins/netfiwdth.png" className="max-h-[26px] xs:max-h-[30px] sm:max-h-[38px] max-w-full sm:max-w-[80px] object-contain" alt="Netflix" /> },
  { id: 'Google Play', logo: <img src="/coins/playwidth.png" className="max-h-[26px] xs:max-h-[30px] sm:max-h-[38px] max-w-full sm:max-w-[80px] object-contain" alt="Google Play" /> },
  { id: 'Steam', logo: <img src="/coins/steamwidth.png" className="max-h-[26px] xs:max-h-[30px] sm:max-h-[38px] max-w-full sm:max-w-[80px] object-contain" alt="Steam" /> },
  { id: 'PlayStation', logo: <img src="/coins/pswidth.png" className="max-h-[26px] xs:max-h-[30px] sm:max-h-[38px] max-w-full sm:max-w-[80px] object-contain" alt="PlayStation" /> },
  { id: 'Xbox', logo: <img src="/coins/xboxwidth.png" className="max-h-[26px] xs:max-h-[30px] sm:max-h-[38px] max-w-full sm:max-w-[80px] object-contain" alt="Xbox" /> },
  { id: 'Spotify', logo: <img src="/coins/spotifywidth.png" className="max-h-[26px] xs:max-h-[30px] sm:max-h-[38px] max-w-full sm:max-w-[80px] object-contain" alt="Spotify" /> },
  { id: 'Apple', logo: <img src="/coins/applewidth.png" className="max-h-[26px] xs:max-h-[30px] sm:max-h-[38px] max-w-full sm:max-w-[80px] object-contain" alt="Apple" /> }
];

const WithdrawalModal = ({ settings, balance, onClose, onSuccess, filterType }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  // Steps: 1 = select method/country, 2 = enter details/brand, 3 = confirm, 4 = done
  const [step,        setStep]        = useState(1);
  const [method,      setMethod]      = useState('');
  const [amount,      setAmount]      = useState('');
  const [destination, setDestination] = useState('');
  const [country,     setCountry]     = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
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

  // Default to Paypal or Litecoin or Giftcard
  useEffect(() => {
    if (filterType === 'giftcards') {
      setMethod('giftcard');
    } else if (!method && orderedMethods.length > 0) {
      const hasPaypal = orderedMethods.some(m => m.id === 'paypal');
      setMethod(hasPaypal ? 'paypal' : orderedMethods[0].id);
    }
  }, [orderedMethods, method, filterType]);

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

  const selectedMethod = method ? withdrawalMethods.find((m) => m.id === method) : null;
  const selectedConfig = method ? METHOD_CONFIG[method] : null;

  const methodFeePercent = selectedMethod?.feePercent ?? (settings.withdrawalFeePercent || 0);

  const amountNum = Number(amount) || 0;
  const feeCoins  = Math.ceil(amountNum * (methodFeePercent / 100));
  const youReceive = amountNum - feeCoins;
  const totalDeducted = amountNum;

  const isGiftCard = method === 'giftcard';

  const minimumCoins = isGiftCard ? 0 : (selectedMethod ? selectedMethod.minUSD * coinsPerUSD : 0);
  const hasEnoughBalance = totalDeducted <= balance;
  const meetsMinimum = isGiftCard ? amountNum > 0 : amountNum >= minimumCoins;
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
    if (!amountNum || amountNum <= 0 || !destination.trim() || totalDeducted > balance || (!isGiftCard && !meetsMinimum)) {
      if (!destination.trim()) {
        setError(isGiftCard ? 'Please enter your email address.' : 'Please enter your payout destination.');
      } else if (totalDeducted > balance) {
        setError(`Insufficient balance. You need ${formatCoins(totalDeducted)} coins.`);
      } else if (!meetsMinimum) {
        setError(`Minimum withdrawal is ${formatCoins(minimumCoins)} Coins.`);
      } else {
        setError('Please select a valid amount.');
      }
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
          brand: method === 'giftcard' ? giftCardBrand : undefined,
          country: method === 'giftcard' ? country : undefined,
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
      toast.success(`Withdrawal of ${formatCoins(amountNum)} submitted!`);
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
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className={`relative bg-white shadow-2xl w-full flex flex-col my-auto overflow-visible border border-gray-100 box-border ${
          isGiftCard && step < 3 ? 'p-2 xs:p-2.5 sm:p-8' : 'p-[10px]'
        }`}
        style={{
          width: '100%',
          maxWidth: isGiftCard && step < 3 ? '1072px' : '626px',
          minHeight: isGiftCard && step === 1 ? 'auto' : step === 1 ? '339px' : step === 4 ? '402px' : 'auto',
          background: 'rgba(255, 255, 255, 1)',
          borderRadius: isGiftCard && step < 3 ? '25px' : '30px',
          opacity: 1,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header & Close Button Box for Normal Steps and Step 3 */}
        {step < 4 && (!isGiftCard || step === 3) && (
          <div
            className="w-full flex flex-col justify-between shrink-0 relative p-3.5 xs:p-4 pb-3 sm:pt-[34px] sm:pr-[20px] sm:pb-[14px] sm:pl-[20px] rounded-[20px] sm:rounded-[16px] min-h-0 sm:min-h-[140px] sm:h-[143px] bg-[#F8F5EF]"
            style={{
              width: '100%',
              maxWidth: '606px',
              boxSizing: 'border-box',
              opacity: 1,
            }}
          >
            {/* Close Button Absolute Top-Right */}
            <button
              id="withdrawal-modal-close"
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-[16px] sm:right-[20px] rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 cursor-pointer z-10 w-[24px] h-[24px] sm:w-[22px] sm:h-[22px]"
              title="Close"
            >
              <FiX size={13} strokeWidth={2.5} />
            </button>

            {/* Whole Header Layout */}
            <div
              className="flex flex-col justify-between w-full max-w-[565px] min-h-0 sm:min-h-[78px] gap-2.5 sm:gap-[16px]"
              style={{
                boxSizing: 'border-box',
                opacity: 1,
              }}
            >
              <div className="flex flex-col">
                <h2
                  className="text-[23px] xs:text-[26px] sm:text-[35px] font-bold text-black m-0 leading-[1.15] sm:leading-[23px] tracking-[-0.02em] w-full max-w-[438px]"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    opacity: 1,
                  }}
                >
                  {step === 1
                    ? t('withdraw.modalTitleStep1', 'Select Withdrawal Method')
                    : step === 2
                    ? t('withdraw.modalTitleStep2', 'Enter Details')
                    : method === 'giftcard'
                    ? t('withdraw.modalTitleStep3GiftCard', 'Confirm Redemption')
                    : t('withdraw.modalTitleStep3Confirm', 'Confirm Withdrawal')}
                </h2>
                <p
                  className="text-[13.5px] sm:text-[16px] font-medium text-black mt-1.5 sm:mt-[16px] leading-tight sm:leading-[13px] w-full max-w-[565px]"
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    letterSpacing: '0%',
                    opacity: 1,
                  }}
                >
                  {t('withdraw.stepOf', { step, defaultValue: `Step ${step} of 3` })}
                </p>
              </div>

              {/* 3-Segment Progress Bar */}
              <div className="flex items-center gap-1.5 w-full mt-0.5 sm:mt-0">
                <div
                  className="transition-all bg-[#5B6BF5] h-[5px] sm:h-[6px] rounded-full"
                  style={{
                    flex: 1,
                    opacity: 1,
                  }}
                />
                <div
                  className={`transition-all h-[5px] sm:h-[6px] rounded-full ${
                    step >= 2 ? 'bg-[#5B6BF5]' : 'bg-[#ECECF4]'
                  }`}
                  style={{
                    flex: 1,
                    opacity: 1,
                  }}
                />
                <div
                  className={`transition-all h-[5px] sm:h-[6px] rounded-full ${
                    step >= 3 || (method === 'giftcard' && step === 3) ? 'bg-[#5B6BF5]' : 'bg-[#ECECF4]'
                  }`}
                  style={{
                    flex: 1,
                    opacity: 1,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Select Withdrawal Method / Country for Gift Card ──────── */}
        {step === 1 && (
          <div className="flex flex-col w-full">
            {isGiftCard ? (
              /* Gift Card Step 1: Select Country (1072x252 Layout) */
              <div className="flex flex-col w-full">
                {/* Header Info Container (width: 1016, height: 78, gap: 16px) */}
                <div
                  className="flex flex-col justify-between w-full max-w-[1016px] min-h-0 sm:min-h-[78px] gap-3 sm:gap-[16px]"
                  style={{
                    opacity: 1,
                    boxSizing: 'border-box',
                  }}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex flex-col">
                      <h2
                        className="text-[22px] min-[350px]:text-[25px] sm:text-[32px] font-bold text-black m-0 leading-tight sm:leading-[34px] tracking-[-0.02em]"
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          opacity: 1,
                        }}
                      >
                        {t('withdraw.giftCardModalTitle', 'Redeem Gift Card')}
                      </h2>
                      <p
                        className="text-[13px] sm:text-[14px] font-medium text-black mt-1 sm:mt-[4px] leading-snug sm:leading-[18px]"
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          letterSpacing: '0%',
                          opacity: 1,
                        }}
                      >
                        {t('withdraw.stepOf', { step: 1, defaultValue: 'Step 1 of 3' })}
                      </p>
                    </div>

                    {/* Close Button */}
                    <button
                      id="giftcard-modal-close"
                      onClick={onClose}
                      className="rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 cursor-pointer w-[24px] h-[24px] sm:w-[22px] sm:h-[22px]"
                      title="Close"
                    >
                      <FiX size={13} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* 3-Segment Progress Bar */}
                  <div className="flex items-center gap-2 w-full mt-1 sm:mt-0">
                    <div
                      className="bg-[#5B6BF5] h-[4px] rounded-full flex-1"
                    />
                    <div
                      className="bg-[#ECECF4] h-[4px] rounded-full flex-1"
                    />
                    <div
                      className="bg-[#ECECF4] h-[4px] rounded-full flex-1"
                    />
                  </div>
                </div>

                {/* Select your country Section */}
                <div className="flex flex-col w-full relative mt-4 sm:mt-5">
                  <label
                    style={{
                      width: '100%',
                      maxWidth: '1018px',
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '23px',
                      lineHeight: '28px',
                      letterSpacing: '-0.02em',
                      color: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      margin: 0,
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    {t('withdraw.selectYourCountry', 'Select your country')}
                  </label>

                  {/* Country Trigger */}
                  <button
                    type="button"
                    onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                    className="relative flex items-center justify-between w-full transition-all border-none outline-none shadow-none cursor-pointer mt-2.5"
                    style={{
                      width: '100%',
                      maxWidth: '1018px',
                      height: '57px',
                      borderRadius: '50px',
                      paddingTop: '7px',
                      paddingBottom: '7px',
                      paddingLeft: '7px',
                      paddingRight: '24px',
                      gap: '10px',
                      background: 'rgba(239, 239, 239, 1)',
                      boxSizing: 'border-box',
                      opacity: 1,
                    }}
                  >
                    {country ? (
                      <div className="flex items-center gap-3">
                        <CountryFlag id={country} size={43} />
                        <span
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 400,
                            fontSize: '15px',
                            lineHeight: '26px',
                            letterSpacing: '0%',
                            color: '#000000',
                            height: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 1,
                          }}
                        >
                          {COUNTRIES.find(c => c.id === country)?.name || 'Country'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: '43px',
                            height: '43px',
                            borderRadius: '50%',
                            background: '#E5E7EB',
                          }}
                          className="flex items-center justify-center text-[18px]"
                        >
                          🌐
                        </div>
                        <span
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 400,
                            fontSize: '15px',
                            lineHeight: '26px',
                            letterSpacing: '0%',
                            color: '#71717A',
                            height: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 1,
                          }}
                        >
                          {t('withdraw.selectACountry', 'Select a country')}
                        </span>
                      </div>
                    )}

                    <span className="text-[#0E0F0C] flex items-center justify-center">
                      {countryDropdownOpen ? (
                        <FaCaretUp className="text-[20px]" />
                      ) : (
                        <FaCaretDown className="text-[20px]" />
                      )}
                    </span>
                  </button>

                  {/* Floating Country Dropdown Menu */}
                  {countryDropdownOpen && (
                    <div
                      className="absolute right-0 top-[90px] w-[300px] max-h-[260px] overflow-y-auto bg-white rounded-[20px] shadow-2xl border border-gray-100 p-2 z-50 flex flex-col gap-1"
                      style={{
                        scrollbarWidth: 'thin',
                      }}
                    >
                      {COUNTRIES.map((c) => {
                        const isSelected = country === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setCountry(c.id);
                              setCountryDropdownOpen(false);
                              setStep(2);
                              setError('');
                            }}
                            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[rgba(248,245,239,1)]'
                                : 'hover:bg-[rgba(248,245,239,0.7)]'
                            }`}
                          >
                            <CountryFlag id={c.id} />
                            <span
                              style={{
                                fontFamily: '"Poppins", sans-serif',
                                fontWeight: 500,
                                fontSize: '14px',
                                color: '#000000',
                              }}
                            >
                              {c.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* PayPal / Litecoin methods */
              <>
                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3 w-full my-3 sm:mb-3 sm:mt-0">
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
                        className={`flex items-center transition-all text-left border border-transparent w-full sm:max-w-[297px] min-h-[86px] sm:h-[90px] rounded-[20px] sm:rounded-[16px] p-2.5 sm:pt-2 sm:pr-5 sm:pb-2 sm:pl-2 gap-3.5 sm:gap-2.5 box-border ${
                          isSelected
                            ? 'bg-[#1E2538] text-white shadow-sm'
                            : 'bg-[#F9F7F1] hover:bg-[#f4efe3] text-[#0E0F0C]'
                        } ${canSelect ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                        style={{
                          opacity: 1,
                        }}
                      >
                        {/* Left Icon Box */}
                        <div
                          className="bg-white flex items-center justify-center shadow-xs shrink-0 rounded-[14px] sm:rounded-[10px] w-[66px] h-[66px] xs:w-[70px] xs:h-[70px] sm:w-[74px] sm:h-[74px]"
                        >
                          {m.id === 'paypal' ? (
                            <FaPaypal className="text-[#00457C] text-[34px] sm:text-[34px]" />
                          ) : (
                            <SiLitecoin className="text-[#345D9D] text-[34px] sm:text-[34px]" />
                          )}
                        </div>

                        {/* Method Details */}
                        <div className="flex flex-col justify-center min-w-0 gap-1 sm:gap-[6px]">
                          <span
                            className="text-[20px] sm:text-[20px] font-bold leading-tight sm:leading-[13px] tracking-[-0.02em]"
                            style={{
                              fontFamily: '"Bricolage Grotesque", sans-serif',
                              color: isSelected ? '#FFFFFF' : '#000000',
                            }}
                          >
                            {m.id === 'paypal' ? 'PayPal' : 'Litecoin'}
                          </span>
                          <span
                            className="text-[13px] sm:text-[12px] font-normal leading-snug sm:leading-[17px] mt-0.5 sm:mt-0"
                            style={{
                              fontFamily: '"Poppins", sans-serif',
                              color: isSelected ? 'rgba(255, 255, 255, 0.85)' : '#000000',
                            }}
                          >
                            {t('withdraw.minWithdrawal', 'Minimum withdrawal')} {t('withdraw.coinsCount', { count: formatCoins(minCoins), defaultValue: `${formatCoins(minCoins)} coin` })}
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
                  className="w-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-none border-none outline-none h-[54px] sm:h-[55px] rounded-full sm:rounded-[30px] bg-[#24324D] text-white font-medium text-[16px] py-0 px-6 sm:px-7 mt-1 sm:mt-0"
                  style={{
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
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('withdraw.continue', 'Continue')}
                  </span>
                </button>
              </>
            )}
          </div>
        )}

        {/* ── STEP 2: Enter Details ────────────────────────────────────────── */}
        {step === 2 && selectedConfig && selectedMethod && (
          <div className="flex flex-col gap-4 w-full mt-3 sm:mt-3">
            {isGiftCard ? (
              /* Gift Card Step 2 Layout */
              <div className="flex flex-col w-full">
                {/* Header Info Container (width: 1016, height: 78, gap: 16px) */}
                <div
                  className="flex flex-col justify-between w-full max-w-[1016px] min-h-0 sm:min-h-[78px] gap-3 sm:gap-[16px]"
                  style={{
                    opacity: 1,
                    boxSizing: 'border-box',
                  }}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex flex-col">
                      <h2
                        className="text-[22px] min-[350px]:text-[25px] sm:text-[32px] font-bold text-black m-0 leading-tight sm:leading-[34px] tracking-[-0.02em]"
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          opacity: 1,
                        }}
                      >
                        {t('withdraw.giftCardModalTitle', 'Redeem Gift Card')}
                      </h2>
                      <p
                        className="text-[13px] sm:text-[14px] font-medium text-black mt-1 sm:mt-[4px] leading-snug sm:leading-[18px]"
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          letterSpacing: '0%',
                          opacity: 1,
                        }}
                      >
                        {t('withdraw.stepOf', { step: 2, defaultValue: 'Step 2 of 3' })}
                      </p>
                    </div>

                    {/* Close Button */}
                    <button
                      id="giftcard-modal-close-step2"
                      onClick={onClose}
                      className="rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 cursor-pointer w-[24px] h-[24px] sm:w-[22px] sm:h-[22px]"
                      title="Close"
                    >
                      <FiX size={13} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* 3-Segment Progress Bar */}
                  <div className="flex items-center gap-2 w-full mt-1 sm:mt-0">
                    <div
                      className="bg-[#5B6BF5] h-[4px] rounded-full flex-1"
                    />
                    <div
                      className="bg-[#5B6BF5] h-[4px] rounded-full flex-1"
                    />
                    <div
                      className="bg-[#ECECF4] h-[4px] rounded-full flex-1"
                    />
                  </div>
                </div>

                {/* 1. Select your country Section */}
                <div className="flex flex-col w-full relative mt-4 sm:mt-5">
                  <label
                    style={{
                      width: '100%',
                      maxWidth: '1018px',
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '23px',
                      lineHeight: '28px',
                      letterSpacing: '-0.02em',
                      color: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      margin: 0,
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    {t('withdraw.selectYourCountry', 'Select your country')}
                  </label>

                  {/* Country Trigger */}
                  <button
                    type="button"
                    onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                    className="relative flex items-center justify-between w-full transition-all border-none outline-none shadow-none cursor-pointer mt-2.5"
                    style={{
                      width: '100%',
                      maxWidth: '1018px',
                      height: '57px',
                      borderRadius: '50px',
                      paddingTop: '7px',
                      paddingBottom: '7px',
                      paddingLeft: '7px',
                      paddingRight: '24px',
                      gap: '10px',
                      background: 'rgba(239, 239, 239, 1)',
                      boxSizing: 'border-box',
                      opacity: 1,
                    }}
                  >
                    {country ? (
                      <div className="flex items-center gap-3">
                        <CountryFlag id={country} size={43} />
                        <span
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 400,
                            fontSize: '15px',
                            lineHeight: '26px',
                            letterSpacing: '0%',
                            color: '#000000',
                            height: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 1,
                          }}
                        >
                          {COUNTRIES.find(c => c.id === country)?.name || 'Country'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: '43px',
                            height: '43px',
                            borderRadius: '50%',
                            background: '#E5E7EB',
                          }}
                          className="flex items-center justify-center text-[18px]"
                        >
                          🌐
                        </div>
                        <span
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 400,
                            fontSize: '15px',
                            lineHeight: '26px',
                            letterSpacing: '0%',
                            color: '#71717A',
                            height: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 1,
                          }}
                        >
                          {t('withdraw.selectACountry', 'Select a country')}
                        </span>
                      </div>
                    )}

                    <span className="text-[#0E0F0C] flex items-center justify-center">
                      {countryDropdownOpen ? (
                        <FaCaretUp className="text-[20px]" />
                      ) : (
                        <FaCaretDown className="text-[20px]" />
                      )}
                    </span>
                  </button>

                  {/* Floating Country Dropdown Menu */}
                  {countryDropdownOpen && (
                    <div
                      className="absolute right-0 top-[90px] w-[300px] max-h-[260px] overflow-y-auto bg-white rounded-[20px] shadow-2xl border border-gray-100 p-2 z-50 flex flex-col gap-1"
                      style={{
                        scrollbarWidth: 'thin',
                      }}
                    >
                      {COUNTRIES.map((c) => {
                        const isSelected = country === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setCountry(c.id);
                              setCountryDropdownOpen(false);
                            }}
                            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[rgba(248,245,239,1)]'
                                : 'hover:bg-[rgba(248,245,239,0.7)]'
                            }`}
                          >
                            <CountryFlag id={c.id} />
                            <span
                              style={{
                                fontFamily: '"Poppins", sans-serif',
                                fontWeight: 500,
                                fontSize: '14px',
                                color: '#000000',
                              }}
                            >
                              {c.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Select Gift Card Box */}
                <div
                  className="w-full flex flex-col mt-4 px-2.5 xs:px-3 py-3.5 sm:py-[18px] sm:px-[20px] rounded-[20px] bg-[#F8F5EF]"
                  style={{
                    boxSizing: 'border-box',
                  }}
                >
                  <label
                    className="text-[18px] sm:text-[23px] font-bold text-black tracking-[-0.02em] leading-snug sm:leading-[28px]"
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      opacity: 1,
                    }}
                  >
                    {t('withdraw.selectGiftCard', 'Select Gift Card')}
                  </label>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 xs:gap-2.5 sm:gap-3 items-center mt-3 w-full">
                    {BRANDS.map((brand) => {
                      const isSelected = giftCardBrand === brand.id;
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => setGiftCardBrand(brand.id)}
                          className={`flex items-center justify-center p-1.5 xs:p-2 rounded-[14px] sm:rounded-[12px] transition-all cursor-pointer h-[52px] xs:h-[56px] sm:h-[58px] w-full ${
                            isSelected
                              ? 'bg-[#1E2538] shadow-md ring-2 ring-[#1E2538]'
                              : 'bg-transparent hover:bg-black/5 opacity-90 hover:opacity-100'
                          }`}
                        >
                          <div className="w-full h-full flex items-center justify-center">
                            {brand.logo}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Vouchers Section */}
                <div className="flex flex-col w-full mt-4">
                  <label
                    className="text-[18px] sm:text-[23px] font-bold text-black tracking-[-0.02em] leading-snug sm:leading-[28px]"
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      opacity: 1,
                    }}
                  >
                    {t('withdraw.selectVoucherAmount', 'Select Voucher Amount')}
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xs:gap-2.5 sm:gap-3 mt-3 w-full">
                    {[5, 10, 15, 20].map((usd) => {
                      const voucherCoins = usd * coinsPerUSD;
                      const isSelected = Number(amount) === voucherCoins;
                      return (
                        <div
                          key={usd}
                          onClick={() => {
                            setAmount(voucherCoins.toString());
                            setError('');
                          }}
                          className={`flex items-center justify-between cursor-pointer transition-all w-full max-w-[246px] h-[60px] xs:h-[66px] sm:h-[73px] rounded-[12px] px-2.5 xs:px-3.5 sm:px-5 py-2 sm:py-4 box-border ${
                            isSelected
                              ? 'bg-[#F8F5EF] border border-[#24324D]'
                              : 'bg-white border border-[#E8E8E8]'
                          }`}
                        >
                          <div className="flex flex-col justify-center min-w-0">
                            <div className="flex items-center gap-1 xs:gap-1.5">
                              <img
                                src="/coins/gfitcoin.png"
                                alt="Coin"
                                className="w-[13px] h-[13px] xs:w-[15px] xs:h-[15px] sm:w-[18px] sm:h-[18px] object-contain shrink-0"
                              />
                              <span
                                className="text-[11.5px] min-[350px]:text-[12.5px] xs:text-[14px] sm:text-[18px] font-bold text-[#E9B300] leading-none truncate"
                                style={{
                                  fontFamily: '"Poppins", sans-serif',
                                  letterSpacing: '0%',
                                }}
                              >
                                {formatCoins(voucherCoins)}
                              </span>
                            </div>
                            <span
                              className="text-[9.5px] xs:text-[11px] sm:text-[12px] font-normal text-black/50 mt-1 sm:mt-1.5 leading-none"
                              style={{
                                fontFamily: '"Poppins", sans-serif',
                                letterSpacing: '0%',
                              }}
                            >
                              {t('withdraw.coins', 'Coins')}
                            </span>
                          </div>
                          <span
                            className="text-[15px] xs:text-[17px] sm:text-[20px] font-bold text-[#1E2538] sm:text-black shrink-0 ml-1.5"
                            style={{
                              fontFamily: '"Poppins", sans-serif',
                            }}
                          >
                            ${usd}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Email Address Input */}
                <div className="flex flex-col w-full mt-4">
                  <label
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '16px',
                      lineHeight: '26px',
                      letterSpacing: '0%',
                      color: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      margin: 0,
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    {t('withdraw.emailAddress', 'Email Address')}
                  </label>

                  <div
                    className="relative flex items-center w-full transition-all border-none outline-none shadow-none mt-2"
                    style={{
                      width: '100%',
                      maxWidth: '1018px',
                      height: '58px',
                      borderRadius: '50px',
                      gap: '10px',
                      paddingLeft: '28px',
                      paddingRight: '28px',
                      background: 'rgba(239, 239, 239, 1)',
                      boxSizing: 'border-box',
                      opacity: 1,
                    }}
                  >
                    <input
                      id="giftcard-destination"
                      type="email"
                      value={destination}
                      onChange={(e) => { setDestination(e.target.value); setError(''); }}
                      placeholder={t('withdraw.enterEmailPlaceholder', 'Enter your email address')}
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
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '12px',
                      lineHeight: '17px',
                      color: 'rgba(229, 9, 20, 1)',
                      margin: 0,
                      padding: 0,
                      marginTop: '8px',
                    }}
                  >
                    {t('withdraw.giftcardDisclaimer', '***Please make sure you enter the correct email address. Once the payout is processed, this action cannot be reversed. We are not responsible for lost rewards due to incorrect information.')}
                  </p>
                </div>

                {/* 5. Payout Breakdown Card */}
                <div
                  className="flex flex-col w-full mt-4 px-2 xs:px-2.5 py-4 sm:p-5 rounded-[16px] bg-[#F8F5EF]"
                  style={{
                    boxSizing: 'border-box',
                  }}
                >
                  <h4
                    className="text-[17px] sm:text-[20px] font-bold text-[#0E0F0C] tracking-[-0.02em] px-1 sm:px-0 mb-3 sm:mb-3.5"
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      margin: 0,
                    }}
                  >
                    {t('withdraw.payoutBreakdown', 'Payout Breakdown')}
                  </h4>

                  {/* Amount You Receive */}
                  <div
                    className="bg-white flex justify-between items-center w-full h-[48px] xs:h-[50px] sm:h-[53px] rounded-[11px] px-3 xs:px-3.5 sm:px-[20px] shadow-xs"
                    style={{
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[16px] font-medium text-black"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                      }}
                    >
                      {t('withdraw.amountYouReceive', 'Amount You Receive')}
                    </span>
                    <span
                      className="text-[14px] min-[360px]:text-[15px] xs:text-[16px] sm:text-[16px] font-bold text-black shrink-0 ml-2"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                      }}
                    >
                      {amountNum > 0 ? `$${(amountNum / coinsPerUSD).toFixed(0)}` : '0'}
                    </span>
                  </div>

                  {/* Total Deducted From Balance */}
                  <div
                    className="flex justify-between items-center w-full mt-3.5 px-3 xs:px-3.5 sm:px-[20px]"
                    style={{
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[18px] font-bold text-black whitespace-nowrap"
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        lineHeight: '18px',
                        letterSpacing: '-0.02em',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {t('withdraw.totalDeducted', 'Total Deducted From Balance')}
                    </span>
                    <span
                      className="text-[14px] min-[360px]:text-[15px] xs:text-[16px] sm:text-[18px] font-bold text-black shrink-0 ml-2"
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        lineHeight: '18px',
                        letterSpacing: '-0.02em',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {amountNum > 0 ? formatCoins(amountNum) : '0'}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200 mt-3">
                    <FiAlertCircle className="text-red-500 text-sm mt-0.5 shrink-0" />
                    <p className="text-red-600 text-xs m-0">{error}</p>
                  </div>
                )}

                {/* 6. Review Withdrawal Action Button */}
                {(() => {
                  const isGiftCardValid = amountNum > 0 && destination.trim().length > 0 && giftCardBrand && balance >= amountNum;
                  return (
                    <button
                      id="giftcard-review-btn"
                      type="button"
                      onClick={() => {
                        if (isGiftCardValid) {
                          setStep(3);
                          setError('');
                        } else if (!giftCardBrand) {
                          setError('Please select a gift card brand.');
                        } else if (!amountNum) {
                          setError('Please select a voucher amount.');
                        } else if (balance < amountNum) {
                          setError(`Insufficient balance. You need ${formatCoins(amountNum)} coins.`);
                        } else {
                          setError('Please enter your email address.');
                        }
                      }}
                      disabled={!isGiftCardValid}
                      className="w-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-none border-none outline-none mt-5"
                      style={{
                        width: '100%',
                        maxWidth: '1039px',
                        height: '55px',
                        borderRadius: '30px',
                        gap: '10px',
                        paddingTop: '22px',
                        paddingRight: '28px',
                        paddingBottom: '22px',
                        paddingLeft: '28px',
                        background: 'rgba(36, 50, 77, 1)',
                        boxSizing: 'border-box',
                        opacity: isGiftCardValid ? 1 : 0.4,
                        cursor: isGiftCardValid ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <span
                        style={{
                          minWidth: '154px',
                          height: '11px',
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
                        {t('withdraw.reviewWithdrawal', 'Review Withdrawal')}
                      </span>
                    </button>
                  );
                })()}
              </div>
            ) : (
              /* Selected Method Summary Pill for PayPal / Litecoin */
              <>
                <div
                  className="flex items-center w-full max-w-[606px] min-h-[86px] sm:h-[90px] rounded-[16px] sm:rounded-[15px] p-2 sm:pt-2 sm:pr-5 sm:pb-2 sm:pl-2 gap-2.5 sm:gap-[10px] bg-[#24324D]"
                  style={{
                    boxSizing: 'border-box',
                    opacity: 1,
                  }}
                >
                  <div
                    className="bg-white flex items-center justify-center shadow-xs shrink-0 rounded-[12px] sm:rounded-[10px] w-[58px] h-[58px] xs:w-[64px] xs:h-[64px] sm:w-[74px] sm:h-[74px]"
                  >
                    {method === 'paypal' ? (
                      <FaPaypal className="text-[#00457C] text-[30px] sm:text-[34px]" />
                    ) : (
                      <SiLitecoin className="text-[#345D9D] text-[30px] sm:text-[34px]" />
                    )}
                  </div>
                  <div
                    className="flex flex-col justify-center min-w-0 gap-0.5 sm:gap-[17px] flex-1 max-w-[437px] sm:h-[43px]"
                    style={{
                      boxSizing: 'border-box',
                      opacity: 1,
                    }}
                  >
                    <span
                      className="text-[19px] sm:text-[23px] font-bold text-white tracking-[-0.02em] leading-tight sm:leading-[15px]"
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        margin: 0,
                        padding: 0,
                        opacity: 1,
                      }}
                    >
                      {selectedMethod.label}
                    </span>
                    <span
                      className={`text-[9.5px] min-[350px]:text-[10px] min-[370px]:text-[10.5px] min-[400px]:text-[11px] ${
                        method === 'paypal' ? 'sm:text-[14px]' : 'sm:text-[16px]'
                      } leading-[14px] sm:leading-[16px] max-w-full sm:max-w-[500px] min-h-[25px] sm:min-h-0 whitespace-normal sm:whitespace-nowrap tracking-[0%]`}
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 400,
                        fontStyle: 'normal',
                        color: 'rgba(255, 255, 255, 0.75)',
                        opacity: 1,
                        margin: 0,
                        padding: 0,
                      }}
                    >
                      {method === 'litecoin' ? (
                        <>
                          <span className="whitespace-nowrap">We will send LTC to this address at the live</span>
                          <span className="block sm:inline whitespace-nowrap"> market rate.</span>
                        </>
                      ) : method === 'paypal' ? (
                        t('withdraw.paypalHint', selectedConfig.hint)
                      ) : (
                        selectedConfig.hint
                      )}
                    </span>
                  </div>
                </div>

                {/* Amount input */}
                <div className="flex flex-col gap-2 w-full">
                  <label
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '16px',
                      lineHeight: '22px',
                      letterSpacing: '0%',
                      color: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      margin: 0,
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    {t('withdraw.enterAmount', 'Enter amount')}
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
                      placeholder={t('withdraw.minCoinsPlaceholder', { min: formatCoins(minimumCoins), defaultValue: `Minimum: ${formatCoins(minimumCoins)} Coins` })}
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
                      {t('withdraw.minIsCoins', { min: formatCoins(minimumCoins), defaultValue: `Minimum is ${formatCoins(minimumCoins)} Coins` })}
                    </p>
                  )}
                  {amount && !hasEnoughBalance && meetsMinimum && (
                    <p className="text-red-500 text-xs mt-0.5" style={{ fontFamily: '"Poppins", sans-serif' }}>
                      {t('withdraw.insufficientBalance', { needed: formatCoins(totalDeducted), defaultValue: `Insufficient balance (need ${formatCoins(totalDeducted)} including fee)` })}
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
                      lineHeight: '22px',
                      letterSpacing: '0%',
                      color: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      margin: 0,
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    {method === 'litecoin' ? t('withdraw.ltcAddress', 'LTC Address') : t('withdraw.paypalEmail', 'PayPal Email')}
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
                      placeholder={method === 'litecoin' ? t('withdraw.ltcPlaceholder', selectedConfig.placeholder) : t('withdraw.paypalPlaceholder', selectedConfig.placeholder)}
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
                    className="text-[8.5px] min-[350px]:text-[9px] min-[370px]:text-[9.5px] min-[400px]:text-[10.5px] sm:text-[12px] leading-[12.5px] min-[350px]:leading-[13.5px] min-[370px]:leading-[14px] sm:leading-[17px] w-full max-w-[602px] mt-1 text-[#E50914] font-medium"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      letterSpacing: '0%',
                      opacity: 1,
                      margin: 0,
                    }}
                  >
                    {method === 'litecoin' ? (
                      <>
                        <span className="whitespace-nowrap sm:whitespace-normal">***Please double-check your LTC wallet address. Once the</span>{' '}
                        <span className="block sm:inline whitespace-nowrap sm:whitespace-normal">payout is processed, this action cannot be reversed. We are not</span>{' '}
                        <span className="block sm:inline whitespace-nowrap sm:whitespace-normal">responsible for lost rewards due to an incorrect address</span>
                      </>
                    ) : (
                      <>
                        <span className="whitespace-nowrap sm:whitespace-normal">***Please double-check your paypal email address. Once the</span>{' '}
                        <span className="block sm:inline whitespace-nowrap sm:whitespace-normal">payout is processed, this action cannot be reversed. We are not</span>{' '}
                        <span className="block sm:inline whitespace-nowrap sm:whitespace-normal">responsible for lost rewards due to an incorrect address</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Payout Breakdown Card (606x240) */}
                <div
                  className="flex items-center justify-center w-full max-w-[606px] min-h-[210px] sm:h-[240px] rounded-[16px] bg-[#F8F5EF] px-2 xs:px-2.5 py-4 sm:py-[27px] sm:px-[16px]"
                  style={{
                    boxSizing: 'border-box',
                    opacity: 1,
                  }}
                >
                  {/* Four Elements as One Whole Layout (572.5x186, gap: 25px) */}
                  <div
                    className="flex flex-col justify-between w-full max-w-[572.5px] h-full sm:h-[186px] gap-3 sm:gap-[25px]"
                    style={{
                      boxSizing: 'border-box',
                      opacity: 1,
                    }}
                  >
                    <h4
                      className="text-[17px] sm:text-[20px] font-bold text-[#0E0F0C] tracking-[-0.02em] px-1 sm:px-0"
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        lineHeight: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        margin: 0,
                        opacity: 1,
                      }}
                    >
                      {t('withdraw.payoutBreakdown', 'Payout Breakdown')}
                    </h4>

                    <div className="flex flex-col gap-2 w-full">
                      {/* Amount You Receive Pill */}
                      <div
                        className="bg-white flex justify-between items-center w-full max-w-[572.5px] h-[48px] xs:h-[50px] sm:h-[53px] rounded-[11px] px-3 xs:px-3.5 sm:px-[20px]"
                        style={{
                          boxSizing: 'border-box',
                          opacity: 1,
                        }}
                      >
                        <span
                          className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[18px] font-medium text-black truncate"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            lineHeight: '13px',
                            letterSpacing: '0%',
                            display: 'flex',
                            alignItems: 'center',
                            margin: 0,
                            padding: 0,
                            opacity: 1,
                          }}
                        >
                          {t('withdraw.amountYouReceive', 'Amount You Receive')}
                        </span>
                        <span
                          className="text-[14px] min-[360px]:text-[15px] xs:text-[16px] sm:text-[18px] font-medium text-black shrink-0 ml-2"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {youReceive > 0 ? formatCoins(youReceive) : '0'}
                        </span>
                      </div>

                      {/* Processing Fees Pill */}
                      <div
                        className="bg-white flex justify-between items-center w-full max-w-[572.5px] h-[48px] xs:h-[50px] sm:h-[53px] rounded-[11px] px-3 xs:px-3.5 sm:px-[20px]"
                        style={{
                          boxSizing: 'border-box',
                          opacity: 1,
                        }}
                      >
                        <span
                          className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[18px] font-medium text-black truncate"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            lineHeight: '13px',
                            letterSpacing: '0%',
                            display: 'flex',
                            alignItems: 'center',
                            margin: 0,
                            padding: 0,
                            opacity: 1,
                          }}
                        >
                          {t('withdraw.processingFees', { percent: methodFeePercent, defaultValue: `Processing Fees (${methodFeePercent}%)` })}
                        </span>
                        <span
                          className="text-[14px] min-[360px]:text-[15px] xs:text-[16px] sm:text-[18px] font-medium text-black shrink-0 ml-2"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {feeCoins > 0 ? `-${formatCoins(feeCoins)}` : '0'}
                        </span>
                      </div>
                    </div>

                    {/* Total Deducted Row */}
                    <div
                      className="flex justify-between items-center w-full px-3 xs:px-3.5 sm:px-[20px]"
                      style={{
                        boxSizing: 'border-box',
                        opacity: 1,
                      }}
                    >
                      <span
                        className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[20px] font-bold text-black"
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          lineHeight: '13px',
                          letterSpacing: '-0.02em',
                          display: 'flex',
                          alignItems: 'center',
                          margin: 0,
                          padding: 0,
                          opacity: 1,
                        }}
                      >
                        {t('withdraw.totalDeducted', 'Total Deducted From Balance')}
                      </span>
                      <span
                        className="text-[14px] min-[360px]:text-[15px] xs:text-[16px] sm:text-[20px] font-bold text-black shrink-0 ml-2"
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          lineHeight: '13px',
                          letterSpacing: '-0.02em',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: 1,
                        }}
                      >
                        {totalDeducted > 0 ? formatCoins(totalDeducted) : '0'}
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
                      minWidth: '154px',
                      height: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 1,
                    }}
                  >
                    {t('withdraw.reviewWithdrawal', 'Review Withdrawal')}
                  </span>
                </button>
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Confirm Withdrawal ───────────────────────────────────── */}
        {step === 3 && selectedConfig && selectedMethod && (
          <div className="flex flex-col gap-3.5 w-full mt-3 sm:mt-3">
            {/* Payout Breakdown Card */}
            <div
              className="flex flex-col justify-between w-full max-w-[606px] rounded-[16px] bg-[#F8F5EF] px-2 xs:px-2.5 py-4 sm:py-[24px] sm:px-[16px] gap-3.5 sm:gap-[20px]"
              style={{
                boxSizing: 'border-box',
                opacity: 1,
              }}
            >
              <h4
                className="text-[17px] sm:text-[20px] font-bold text-[#0E0F0C] tracking-[-0.02em] px-1 sm:px-0"
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  lineHeight: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  margin: 0,
                  opacity: 1,
                }}
              >
                {t('withdraw.payoutBreakdown', 'Payout Breakdown')}
              </h4>

              <div className="flex flex-col gap-2 w-full">
                {/* Method Pill */}
                <div
                  className="bg-white flex justify-between items-center w-full max-w-[572.5px] h-[48px] xs:h-[50px] sm:h-[53px] rounded-[11px] px-3 xs:px-3.5 sm:px-[20px] shadow-xs"
                  style={{
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[18px] font-medium text-black"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                    }}
                  >
                    {t('withdraw.method', 'Method')}
                  </span>
                  <span
                    className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[18px] font-medium text-black shrink-0 ml-2"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                    }}
                  >
                    {method === 'giftcard' ? `${selectedMethod.label} (${giftCardBrand})` : selectedMethod.label}
                  </span>
                </div>

                {/* Destination Pill */}
                <div
                  className="bg-white flex justify-between items-center w-full max-w-[572.5px] h-[48px] xs:h-[50px] sm:h-[53px] rounded-[11px] px-3 xs:px-3.5 sm:px-[20px] shadow-xs"
                  style={{
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[18px] font-medium text-black shrink-0 mr-2"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                    }}
                  >
                    {t('withdraw.destination', 'Destination')}
                  </span>
                  <span
                    className="text-[12px] min-[360px]:text-[13px] xs:text-[14px] sm:text-[18px] font-medium text-black truncate max-w-[170px] min-[360px]:max-w-[190px] xs:max-w-[240px] sm:max-w-[320px] text-right"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                    }}
                    title={destination}
                  >
                    {destination}
                  </span>
                </div>

                {/* Amount You Receive Pill */}
                <div
                  className="bg-white flex justify-between items-center w-full max-w-[572.5px] h-[48px] xs:h-[50px] sm:h-[53px] rounded-[11px] px-3 xs:px-3.5 sm:px-[20px] shadow-xs"
                  style={{
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[18px] font-medium text-black truncate"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                    }}
                  >
                    {t('withdraw.amountYouReceiveStep3', 'Amount you receive')}
                  </span>
                  <span
                    className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[18px] font-medium text-black shrink-0 ml-2"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                    }}
                  >
                    {isGiftCard ? (amountNum > 0 ? formatCoins(amountNum) : '0') : (youReceive > 0 ? formatCoins(youReceive) : '0')}
                  </span>
                </div>

                {/* Processing Fees Pill */}
                <div
                  className="bg-white flex justify-between items-center w-full max-w-[572.5px] h-[48px] xs:h-[50px] sm:h-[53px] rounded-[11px] px-3 xs:px-3.5 sm:px-[20px] shadow-xs"
                  style={{
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[18px] font-medium text-black truncate"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                    }}
                  >
                    {t('withdraw.processingFees', { percent: isGiftCard ? '0' : methodFeePercent, defaultValue: `Processing Fees (${isGiftCard ? '0%' : `${methodFeePercent}%`})` })}
                  </span>
                  <span
                    className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[18px] font-medium text-black shrink-0 ml-2"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                    }}
                  >
                    {isGiftCard ? '+0' : (feeCoins > 0 ? `+${formatCoins(feeCoins)}` : '0')}
                  </span>
                </div>
              </div>

              {/* Total Deducted Row */}
              <div
                className="flex justify-between items-center w-full px-3 xs:px-3.5 sm:px-[20px]"
                style={{
                  boxSizing: 'border-box',
                  opacity: 1,
                }}
              >
                <span
                  className="text-[13px] min-[360px]:text-[14px] xs:text-[15px] sm:text-[20px] font-bold text-black whitespace-nowrap"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    lineHeight: '18px',
                    letterSpacing: '-0.02em',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {t('withdraw.totalDeducted', 'Total Deducted From Balance')}
                </span>
                <span
                  className="text-[14px] min-[360px]:text-[15px] xs:text-[16px] sm:text-[20px] font-bold text-black shrink-0 ml-2"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    lineHeight: '18px',
                    letterSpacing: '-0.02em',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {isGiftCard ? (amountNum > 0 ? formatCoins(amountNum) : '0') : (totalDeducted > 0 ? formatCoins(totalDeducted) : '0')}
                </span>
              </div>
            </div>

            {/* Red Notice */}
            <p
              className="text-[9.5px] min-[350px]:text-[10.5px] min-[380px]:text-[11px] sm:text-[12px] leading-[13.5px] min-[350px]:leading-[15px] sm:leading-[17px] text-[#E50914] font-medium w-full max-w-[604px]"
              style={{
                fontFamily: '"Poppins", sans-serif',
                letterSpacing: '0%',
                margin: 0,
                padding: 0,
                opacity: 1,
              }}
            >
              <span className="whitespace-nowrap sm:whitespace-normal">This action is irreversible. Your balance will be deducted</span>{' '}
              <span className="block sm:inline whitespace-nowrap sm:whitespace-normal">immediately and the request will be reviewed by our team.</span>
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
                  <><FiLoader className="animate-spin mr-2" /> {t('withdraw.processing', 'Processing...')}</>
                ) : (
                  t('withdraw.confirmWithdrawal', 'Confirm Withdrawal')
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
                {t('withdraw.requestSubmitted', 'Request Submitted!')}
              </h2>

              {/* Subtitle / Details */}
              <p
                className="text-[#000000] text-[15px] font-normal leading-[23px] m-0 mb-6"
                style={{ fontFamily: '"Poppins", sans-serif' }}
              >
                {t('withdraw.successDetails', {
                  amount: amountNum ? formatCoins(amountNum) : formatCoins(youReceive),
                  method: selectedMethod?.label || (method === 'paypal' ? 'PayPal' : 'Litecoin'),
                  defaultValue: `Your withdrawal of ${amountNum ? formatCoins(amountNum) : formatCoins(youReceive)} Coins via ${selectedMethod?.label || (method === 'paypal' ? 'PayPal' : 'Litecoin')} has been submitted.`
                })}
                <br />
                {t('withdraw.successProcessing', 'Our team will process your request within 1–3 business days. Check your transaction history for updates.')}
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
                {t('withdraw.done', 'Done')}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default WithdrawalModal;
