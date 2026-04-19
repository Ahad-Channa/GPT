import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { CURRENCY_NAME, formatCoins } from '../../config/platform';
import toast from 'react-hot-toast';
import {
  FiX, FiArrowRight, FiArrowLeft, FiAlertCircle,
  FiCheckCircle, FiLoader, FiInfo,
} from 'react-icons/fi';

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

const WithdrawalModal = ({ settings, balance, onClose, onSuccess }) => {
  const { currentUser } = useAuth();

  // Steps: 1 = select method, 2 = enter amount & destination, 3 = confirm, 4 = done
  const [step,        setStep]        = useState(1);
  const [method,      setMethod]      = useState('');
  const [amount,      setAmount]      = useState('');
  const [destination, setDestination] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');

  const overlayRef = useRef(null);

  const { coinsPerUSD, withdrawalMethods = [], exchangeRates } = settings;

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

  // USD/LTC estimates
  const amountUSD = amountNum / coinsPerUSD;
  const receiveUSD = youReceive / coinsPerUSD;
  const receiveLTC = exchangeRates?.ltcUSD ? (receiveUSD / exchangeRates.ltcUSD).toFixed(8) : null;

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
        body: JSON.stringify({ method, amount: amountNum, payoutDestination: destination }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Withdrawal failed. Please try again.');
        setSubmitting(false);
        return;
      }

      setStep(4); // success screen
      onSuccess(data.newBalance);
      toast.success(`Withdrawal of ${amountNum.toLocaleString()} ${CURRENCY_NAME} submitted!`);
    } catch (err) {
      setError('Network error. Please check your connection.');
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md glass-card overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 80px rgba(0,0,0,0.5)' }}
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {step > 1 && step < 4 && (
              <button
                onClick={() => { setStep(s => s - 1); setError(''); }}
                className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                <FiArrowLeft className="text-xs" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold font-display text-white">
                {step === 1 && 'Select Method'}
                {step === 2 && 'Enter Details'}
                {step === 3 && 'Confirm Withdrawal'}
                {step === 4 && 'Request Submitted!'}
              </h2>
              {step < 4 && (
                <p className="text-xs text-slate-500 mt-0.5">Step {step} of 3</p>
              )}
            </div>
          </div>
          <button
            id="withdrawal-modal-close"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] flex items-center justify-center text-slate-500 hover:text-white transition-all"
          >
            <FiX className="text-sm" />
          </button>
        </div>

        <div className="p-6 space-y-4">

          {/* ── STEP 1: Select Method ─────────────────────────── */}
          {step === 1 && (
            <>
              <p className="text-xs text-slate-500">Choose how you'd like to receive your {CURRENCY_NAME}.</p>
              <div className="space-y-3">
                {withdrawalMethods.map((m) => {
                  const cfg = METHOD_CONFIG[m.id];
                  if (!cfg) return null;
                  const minCoins = m.minUSD * coinsPerUSD;
                  const canSelect = balance >= minCoins;
                  return (
                    <button
                      key={m.id}
                      id={`method-${m.id}`}
                      onClick={() => { if (canSelect) { setMethod(m.id); setStep(2); setError(''); } }}
                      disabled={!canSelect}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                        canSelect
                          ? `${cfg.border} hover:${cfg.activeBorder} hover:bg-white/[0.03] hover:shadow-sm cursor-pointer`
                          : 'border-white/[0.05] opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cfg.iconBg} flex items-center justify-center text-lg flex-shrink-0`}>
                        <span className={cfg.iconColor}>{cfg.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{m.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Min: {minCoins.toLocaleString()} {CURRENCY_NAME}
                          <span className="text-slate-600 ml-1">≈ ${m.minUSD} USD</span>
                        </p>
                      </div>
                      <FiArrowRight className="text-slate-600 text-sm flex-shrink-0" />
                    </button>
                  );
                })}
              </div>

              {/* Available balance */}
              <div className="pt-2 text-center text-xs text-slate-600">
                Available: <span className="text-white font-mono">{balance.toLocaleString()} {CURRENCY_NAME}</span>
              </div>
            </>
          )}

          {/* ── STEP 2: Enter Amount & Destination ───────────── */}
          {step === 2 && selectedConfig && selectedMethod && (
            <>
              {/* Selected method reminder */}
              <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br ${selectedConfig.iconBg} border ${selectedConfig.border}`}>
                <span className={`text-xl ${selectedConfig.iconColor}`}>{selectedConfig.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{selectedMethod.label}</p>
                  <p className="text-xs text-slate-400">{selectedConfig.hint}</p>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 tracking-wide uppercase mb-2">
                  Amount ({CURRENCY_NAME})
                </label>
                <div className="relative">
                  <input
                    id="withdrawal-amount"
                    type="number"
                    min={minimumCoins}
                    max={balance}
                    step="1"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError(''); }}
                    placeholder={`Min ${minimumCoins.toLocaleString()}`}
                    className="premium-input font-mono w-full"
                    style={{ paddingLeft: '1rem', paddingRight: '5rem' }}
                  />
                  <button
                    onClick={() => setAmount(String(Math.floor(balance / (1 + methodFeePercent / 100))))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-400 font-semibold hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md transition-colors"
                  >
                    MAX
                  </button>
                </div>
                {amount && !meetsMinimum && (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                    <FiAlertCircle className="text-xs" />
                    Minimum is {minimumCoins.toLocaleString()} {CURRENCY_NAME} (${selectedMethod.minUSD} USD)
                  </p>
                )}
                {amount && !hasEnoughBalance && meetsMinimum && (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                    <FiAlertCircle className="text-xs" />
                    Insufficient balance (need {totalDeducted.toLocaleString()} including fee)
                  </p>
                )}
              </div>

              {/* Destination input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 tracking-wide uppercase mb-2">
                  {method === 'litecoin' ? 'LTC Address' : method === 'paypal' ? 'PayPal Email' : 'Email Address'}
                </label>
                <input
                  id="withdrawal-destination"
                  type={method === 'litecoin' ? 'text' : 'email'}
                  value={destination}
                  onChange={(e) => { setDestination(e.target.value); setError(''); }}
                  placeholder={selectedConfig.placeholder}
                  className="premium-input w-full"
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              {/* Fee preview */}
              {amountNum > 0 && (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase flex items-center gap-1.5">
                    <FiInfo className="text-blue-400" /> Payout Breakdown
                  </p>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Requested</span>
                      <span className="text-white">{amountNum.toLocaleString()} {CURRENCY_NAME}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Processing fee ({methodFeePercent}%)</span>
                      <span className="text-orange-400">−{feeCoins.toLocaleString()} {CURRENCY_NAME}</span>
                    </div>
                    <div className="h-px bg-white/[0.06] my-1" />
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-300">You receive</span>
                      <span className="text-emerald-400">{youReceive.toLocaleString()} {CURRENCY_NAME}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>≈ USD value</span>
                      <span>${receiveUSD.toFixed(2)}</span>
                    </div>
                    {method === 'litecoin' && receiveLTC && (
                      <div className="flex justify-between text-slate-500">
                        <span>≈ LTC (@ ${exchangeRates.ltcUSD?.toLocaleString()})</span>
                        <span className="text-amber-400">{receiveLTC} LTC</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500 pt-1 border-t border-white/[0.05]">
                      <span>Total deducted from balance</span>
                      <span className="text-red-400">{totalDeducted.toLocaleString()} {CURRENCY_NAME}</span>
                    </div>
                  </div>
                </div>
              )}

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
                className="w-full py-3 rounded-xl btn-glow text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Review Withdrawal <FiArrowRight />
              </button>
            </>
          )}

          {/* ── STEP 3: Confirm ───────────────────────────────── */}
          {step === 3 && selectedConfig && selectedMethod && (
            <>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] divide-y divide-white/[0.05]">
                {[
                  { label: 'Method',      value: selectedMethod.label },
                  { label: 'Destination', value: destination, mono: true, truncate: true },
                  { label: 'Amount',      value: `${amountNum.toLocaleString()} ${CURRENCY_NAME}`, mono: true },
                  { label: 'Fee',         value: `${feeCoins.toLocaleString()} ${CURRENCY_NAME}`, mono: true, accent: 'text-orange-400' },
                  { label: 'You receive', value: `${youReceive.toLocaleString()} ${CURRENCY_NAME}`, mono: true, accent: 'text-emerald-400', bold: true },
                  ...(method === 'litecoin' && receiveLTC ? [{ label: '≈ LTC', value: `${receiveLTC} LTC`, mono: true, accent: 'text-amber-400' }] : []),
                ].map(({ label, value, mono, accent, bold, truncate }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className={`text-xs ${bold ? 'font-bold text-sm' : 'font-medium'} ${accent || 'text-slate-200'} ${mono ? 'font-mono' : ''} ${truncate ? 'max-w-[180px] truncate text-right' : ''}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/[0.07] border border-amber-500/20">
                <FiAlertCircle className="text-amber-400 text-sm mt-0.5 flex-shrink-0" />
                <p className="text-amber-400/80 text-xs">
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
                className="w-full py-3 rounded-xl btn-glow text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? (
                  <><FiLoader className="animate-spin" /> Processing...</>
                ) : (
                  <><FiCheckCircle /> Confirm Withdrawal</>
                )}
              </button>
            </>
          )}

          {/* ── STEP 4: Success ───────────────────────────────── */}
          {step === 4 && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <FiCheckCircle className="text-emerald-400 text-3xl" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">Request Submitted!</p>
                <p className="text-slate-400 text-sm mt-1">
                  Your withdrawal of <span className="text-white font-mono">{amountNum.toLocaleString()} {CURRENCY_NAME}</span> via{' '}
                  <span className="text-white">{selectedMethod?.label}</span> has been submitted.
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  Our team will process your request within 1–3 business days. Check your transaction history for updates.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl btn-glow text-sm font-semibold"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default WithdrawalModal;
