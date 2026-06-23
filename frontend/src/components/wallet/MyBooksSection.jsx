import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiBook, FiX, FiArrowRight, FiChevronLeft, FiChevronRight,
  FiLoader, FiMapPin, FiUser, FiMail, FiHome, FiCheck,
} from 'react-icons/fi';
import CoinIcon from '../CoinIcon';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BACKEND = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

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

/* ── Coin Badge ──────────────────────────────────────────────── */
const CoinBadge = ({ amount, size = 'md' }) => {
  const cls = size === 'sm'
    ? 'text-xs gap-1 px-2 py-0.5'
    : size === 'lg'
      ? 'text-base gap-1.5 px-3 py-1'
      : 'text-sm gap-1 px-2.5 py-0.5';
  return (
    <span className={`inline-flex items-center font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full ${cls}`}>
      <CoinIcon size={size === 'lg' ? 16 : 12} />
      {amount.toLocaleString()}
    </span>
  );
};

/* ── Preview Image Carousel ──────────────────────────────────── */
const PreviewCarousel = ({ images }) => {
  const [idx, setIdx] = useState(0);
  const valid = images.filter(Boolean);
  if (!valid.length) return null;
  return (
    <div className="relative select-none">
      <div className="rounded-xl overflow-hidden bg-black/30 border border-white/[0.07] aspect-[3/4] max-h-72 flex items-center justify-center">
        <img src={valid[idx].startsWith('data:') || valid[idx].startsWith('http') ? valid[idx] : `${BACKEND}${valid[idx]}`} alt={`Preview ${idx + 1}`} className="max-h-full max-w-full object-contain" />
      </div>
      {valid.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button onClick={() => setIdx(i => (i - 1 + valid.length) % valid.length)}
            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 transition-colors">
            <FiChevronLeft size={14} />
          </button>
          <span className="text-xs text-slate-500">{idx + 1} / {valid.length}</span>
          <button onClick={() => setIdx(i => (i + 1) % valid.length)}
            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 transition-colors">
            <FiChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Book Detail Modal ───────────────────────── */
const BookDetailModal = ({ book, onClose, onOrder, balance }) => {
  const canAfford = balance >= book.coinCost;
  const hasOrder = !!book.userOrder;
  const validImages = book.previewImages?.filter(Boolean) || [];
  const [previewIdx, setPreviewIdx] = useState(0);

  const nextPreview = () => {
    if (previewIdx + 3 < validImages.length) setPreviewIdx(p => p + 1);
  };
  const prevPreview = () => {
    if (previewIdx > 0) setPreviewIdx(p => p - 1);
  };

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

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="bg-[#242424] rounded-[20px] w-[700px] h-[808px] my-auto flex flex-col p-[16px] gap-[16px] shadow-2xl relative border border-white/[0.08]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center w-full h-[24px] gap-[6px] shrink-0">
          <h2 className="w-[638px] text-white font-bold font-['Barlow_Condensed'] text-[16px] leading-[120%]">Book Details</h2>
          <button onClick={onClose} className="text-[#888888] hover:text-white transition-colors flex items-center justify-center w-[24px] h-[24px]">
            <FiX size={24} strokeWidth={1} />
          </button>
        </div>

        {/* Book Info */}
        <div className="flex flex-row w-[668px] h-[401px] gap-[16px] shrink-0">
          {/* Cover */}
          <div className="w-[161px] h-[246px] shrink-0">
            {book.coverImage ? (
              <img src={book.coverImage.startsWith('data:') || book.coverImage.startsWith('http') ? book.coverImage : `${BACKEND}${book.coverImage}`} alt={book.title} className="w-full h-full object-cover rounded-md drop-shadow-2xl"
                onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="w-full h-full rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                <FiBook className="text-slate-600 text-5xl" />
              </div>
            )}
          </div>

          {/* Right — Info */}
          <div className="flex flex-col w-[491px] shrink-0">
            {/* Title & Order Group */}
            <div className="flex flex-col w-[491px] min-h-[150px] gap-[22px] shrink-0">
              <h3 className="w-[491px] text-white font-semibold font-['Barlow_Condensed'] text-[26px] leading-[120%]">
                {book.title}
              </h3>

              <div className="flex items-center gap-[14px] w-[491px] h-[48px] shrink-0">
                <div className="flex items-center gap-[3px] w-[238.5px] h-[26px]">
                  <img src="/coins/coinfix.png" alt="Coin" className="w-[26px] h-[26px] object-contain rounded-full shadow-[0px_14px_34px_0px_rgba(254,198,53,0.3)]" />
                  <span className="font-bold font-['Barlow_Condensed'] text-[32px] leading-none bg-clip-text text-transparent bg-gradient-to-b from-[#FEDF77] to-[#FCB91E]">
                    {book.coinCost.toLocaleString()}
                  </span>
                </div>

                {hasOrder ? (
                  <div className="flex items-center justify-center px-[30px] py-[10px] w-[238.5px] h-[48px] bg-[#1a1a1a] text-[#49B265] font-bold font-['Barlow_Condensed'] rounded-[10px] text-[20px] border border-[#49B265]/30 gap-[10px]">
                    Status: <span className="capitalize ml-1">{book.userOrder.status}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => canAfford && onOrder(book)}
                    disabled={!canAfford}
                    className="flex items-center justify-center w-[238.5px] h-[48px] gap-[10px] rounded-[10px] px-[30px] py-[10px] bg-[#49B265] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_0_#276D3A]"
                  >
                    <span className="font-bold font-['Barlow_Condensed'] text-[20px] leading-none text-white whitespace-nowrap">
                      {canAfford ? 'Order Now' : 'Insufficient Coins'}
                    </span>
                    {canAfford && <img src="/coins/ar.png" alt="Arrow" className="w-[24px] h-[24px] object-contain shrink-0" />}
                  </button>
                )}
              </div>
            </div>

            {book.description && (
              <div className="flex flex-col w-[491px] min-h-[235px] gap-[6px] mt-[16px] shrink-0">
                <h4 className="w-[491px] min-h-[17px] text-white font-bold font-['Barlow_Condensed'] text-[14px] leading-[120%]">
                  Description
                </h4>
                <div className="w-[491px] min-h-[212px] text-[#888888] font-medium font-['Barlow_Condensed'] text-[14px] leading-[130%] whitespace-pre-wrap">
                  {book.description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview Section */}
        {validImages.length > 0 && (
          <div className="bg-[rgba(0,0,0,0.36)] backdrop-blur-[44px] rounded-[20px] w-[668px] h-[319px] p-[16px] flex flex-col gap-[16px] shrink-0">
            <h4 className="w-[636px] h-[15px] text-white font-semibold font-['Barlow_Condensed'] text-[21px] leading-[120%] flex items-center">Book Preview</h4>
            <div className="flex items-center justify-between">
              <button
                onClick={prevPreview}
                disabled={previewIdx === 0}
                className="w-[32px] h-[32px] flex-shrink-0 rounded-[32px] border-[1px] border-[#49B265] flex items-center justify-center hover:bg-[#49B265]/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <img src="/coins/leftarrow.png" alt="Previous" className="w-[16px] h-[16px] object-contain rotate-180" />
              </button>
              <div className="flex gap-[16px] justify-center overflow-hidden">
                {validImages.slice(previewIdx, previewIdx + 3).map((url, i) => (
                  <div key={i} className="bg-white rounded-[3px] overflow-hidden flex-shrink-0 w-[177px] h-[256px] flex items-center justify-center">
                    <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <button
                onClick={nextPreview}
                disabled={previewIdx + 3 >= validImages.length}
                className="w-[32px] h-[32px] flex-shrink-0 rounded-[32px] border-[1px] border-[#49B265] flex items-center justify-center hover:bg-[#49B265]/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <img src="/coins/leftarrow.png" alt="Next" className="w-[16px] h-[16px] object-contain" />
              </button>
            </div>
          </div>
        )}

      </motion.div>
    </motion.div>,
    document.body
  );
};


/* ── Order Book Modal (Screenshot 3) ─────────────────────────── */
const OrderModal = ({ book, onClose, onSuccess, balance }) => {
  const { currentUser, mongoUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [form, setForm] = useState({
    fullName: mongoUser?.displayName || '',
    email: currentUser?.email || '',
    address: '',
    city: '',
    zipcode: '',
    wantsSignature: false,
    signatureName: mongoUser?.displayName || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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

  const handleDone = () => {
    if (resultData) {
      onSuccess(resultData.newBalance, resultData.order);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.address || !form.city || !form.zipcode) {
      toast.error('Please fill all shipping fields');
      return;
    }
    setSubmitting(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/books/order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book._id,
          ...form,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResultData({ newBalance: data.newBalance, order: data.order });
        setSubmitted(true);
      } else {
        toast.error(data.error || 'Failed to place order');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return createPortal(
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto"
        onClick={handleDone}>
        <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="bg-[#242424] rounded-[20px] w-[500px] h-[379px] my-auto flex flex-col items-center p-[16px] gap-[20px] shadow-2xl relative border border-white/[0.08]"
          onClick={e => e.stopPropagation()}>

          <button onClick={handleDone} className="absolute top-4 right-4 w-[36px] h-[36px] rounded-[10px] bg-white/[0.11] hover:bg-white/[0.18] transition-colors flex items-center justify-between px-[8px] text-white shrink-0">
            <div className="w-full flex justify-center items-center">
              <FiX size={20} strokeWidth={2} />
            </div>
          </button>

          <div className="w-[64px] h-[64px] rounded-full bg-[#49B265] flex items-center justify-center text-[#1A1A1A] shrink-0 mt-[16px]">
            <FiCheck size={36} strokeWidth={3} />
          </div>

          <h2 className="text-white font-bold font-['Barlow_Condensed'] text-[28px] leading-[120%] tracking-normal m-0 p-0 text-center uppercase w-[468px] h-[34px] flex items-center justify-center shrink-0">
            Order Submitted!
          </h2>

          <div className="flex flex-col gap-[6px] items-center w-[468px] h-[85px] shrink-0 justify-center overflow-y-auto custom-scrollbar">
            <p className="font-medium font-['Barlow_Condensed'] text-[18px] leading-[130%] m-0 p-0 text-center w-[468px]" style={{ color: 'var(--Text-text-sheen, rgba(136, 136, 136, 1))' }}>
              You have successfully order book &ldquo;{book.title}&rdquo;
            </p>
            <p className="font-medium font-['Barlow_Condensed'] text-[18px] leading-[130%] m-0 p-0 text-center w-[468px]" style={{ color: 'var(--Text-text-sheen, rgba(136, 136, 136, 1))' }}>
              Our team will process your order within 1-3 business days. Check your email for updates.
            </p>
          </div>

          <button
            onClick={handleDone}
            className="w-full h-[48px] bg-[#49B265] text-white rounded-[10px] font-bold font-['Barlow_Condensed'] text-[20px] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center mt-auto"
          >
            Done
          </button>

        </motion.div>
      </motion.div>,
      document.body
    );
  }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="bg-[#242424] rounded-[20px] w-[700px] h-[835px] my-auto flex flex-col p-[16px] gap-[16px] shadow-2xl relative border border-white/[0.08]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center w-[668px] h-[24px] gap-[6px] shrink-0">
          <h2 className="w-[638px] h-[19px] text-white font-bold font-['Barlow_Condensed'] text-[16px] leading-[120%]">Order Book</h2>
          <button onClick={onClose} className="w-[24px] h-[24px] flex items-center justify-center text-white/50 hover:text-white transition-colors shrink-0">
            <FiX size={24} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[16px]">

          {/* Book Info Header */}
          <div className="flex w-[668px] h-[119px] gap-[16px] shrink-0 items-center">
            <div className="w-[78px] h-[119px] shrink-0 overflow-hidden shadow-lg rounded-[3px]">
              {book.coverImage ? (
                <img src={book.coverImage.startsWith('data:') || book.coverImage.startsWith('http') ? book.coverImage : `${BACKEND}${book.coverImage}`} alt={book.title} className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><FiBook className="text-slate-600 text-3xl" /></div>
              )}
            </div>
            <div className="flex flex-col w-[574px] min-h-[89px] gap-[16px] shrink-0">
              <h3 className="w-[574px] min-h-[41px] text-white font-semibold font-['Barlow_Condensed'] text-[22px] leading-[120%] line-clamp-2">
                {book.title}
              </h3>
              <div className="flex items-center gap-[3px] w-[237px] h-[26px]">
                <img src="/coins/coinfix.png" alt="Coin" className="w-[26px] h-[26px] object-contain rounded-full shadow-[0px_14px_34px_0px_rgba(254,198,53,0.3)] shrink-0" />
                <span className="font-bold font-['Barlow_Condensed'] text-[24px] leading-none bg-clip-text text-transparent bg-gradient-to-b from-[#FEDF77] to-[#FCB91E]">
                  {book.coinCost ? book.coinCost.toLocaleString() : "0"}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-[rgba(0,0,0,0.36)] backdrop-blur-[44px] rounded-[20px] w-[668px] h-[327px] p-[16px] flex flex-col gap-[16px] shrink-0">
            <h3 className="w-[636px] h-[15px] text-white font-semibold font-['Barlow_Condensed'] text-[21px] leading-[120%] shrink-0">Shipping Address</h3>

            <div className="w-[636px] h-[264px] shrink-0 grid grid-cols-2 gap-[12px]">
              <div className="flex flex-col gap-[4px] col-span-2 sm:col-span-1">
                <label className="w-fit h-[20px] text-white font-medium font-['Barlow_Condensed'] text-[16px] leading-[20px] tracking-[-0.01em] flex items-center shrink-0">Full Name</label>
                <div className="w-full h-[56px] bg-[rgba(255,255,255,0.08)] rounded-[10px] py-[16px] px-[20px] flex justify-between items-center">
                  <img src="/coins/orman.png" alt="User" className="w-[24px] h-[24px] shrink-0" />
                  <input type="text" required value={form.fullName} onChange={e => set('fullName', e.target.value)}
                    className="w-[236px] h-[20px] bg-transparent text-white font-medium font-['Barlow_Condensed'] text-[18px] leading-[20px] placeholder:text-[#898D8F] focus:outline-none border-none p-0"
                    placeholder="Emmy" />
                </div>
              </div>
              <div className="flex flex-col gap-[4px] col-span-2 sm:col-span-1">
                <label className="w-fit h-[20px] text-white font-medium font-['Barlow_Condensed'] text-[16px] leading-[20px] tracking-[-0.01em] flex items-center shrink-0">Email</label>
                <div className="w-full h-[56px] bg-[rgba(255,255,255,0.08)] rounded-[10px] py-[16px] px-[20px] flex justify-between items-center">
                  <img src="/coins/orsms.png" alt="Email" className="w-[24px] h-[24px] shrink-0" />
                  <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                    className="w-[236px] h-[20px] bg-transparent text-white font-medium font-['Barlow_Condensed'] text-[18px] leading-[20px] placeholder:text-[#898D8F] focus:outline-none border-none p-0"
                    placeholder="emmy@gmail.com" />
                </div>
              </div>
              <div className="flex flex-col gap-[4px] col-span-2">
                <label className="w-fit h-[20px] text-white font-medium font-['Barlow_Condensed'] text-[16px] leading-[20px] tracking-[-0.01em] flex items-center shrink-0">Address</label>
                <div className="w-full h-[56px] bg-[rgba(255,255,255,0.08)] rounded-[10px] py-[16px] px-[20px] flex justify-between items-center">
                  <img src="/coins/orloc.png" alt="Location" className="w-[24px] h-[24px] shrink-0" />
                  <input type="text" required value={form.address} onChange={e => set('address', e.target.value)}
                    className="w-[560px] h-[20px] bg-transparent text-white font-medium font-['Barlow_Condensed'] text-[18px] leading-[20px] placeholder:text-[#898D8F] focus:outline-none border-none p-0"
                    placeholder="Enter Your complete address" />
                </div>
              </div>
              <div className="flex flex-col gap-[4px] col-span-2 sm:col-span-1">
                <label className="w-fit h-[20px] text-white font-medium font-['Barlow_Condensed'] text-[16px] leading-[20px] tracking-[-0.01em] flex items-center shrink-0">City</label>
                <div className="w-full h-[56px] bg-[rgba(255,255,255,0.08)] rounded-[10px] py-[16px] px-[20px] flex justify-start items-center">
                  <input type="text" required value={form.city} onChange={e => set('city', e.target.value)}
                    className="w-full h-[20px] bg-transparent text-white font-medium font-['Barlow_Condensed'] text-[18px] leading-[20px] placeholder:text-[#898D8F] focus:outline-none border-none p-0"
                    placeholder="Enter Your City" />
                </div>
              </div>
              <div className="flex flex-col gap-[4px] col-span-2 sm:col-span-1">
                <label className="w-fit h-[20px] text-white font-medium font-['Barlow_Condensed'] text-[16px] leading-[20px] tracking-[-0.01em] flex items-center shrink-0">Zipcode</label>
                <div className="w-full h-[56px] bg-[rgba(255,255,255,0.08)] rounded-[10px] py-[16px] px-[20px] flex justify-between items-center">
                  <img src="/coins/orloc.png" alt="Zipcode" className="w-[24px] h-[24px] shrink-0" />
                  <input type="text" required value={form.zipcode} onChange={e => set('zipcode', e.target.value)}
                    className="w-[236px] h-[20px] bg-transparent text-white font-medium font-['Barlow_Condensed'] text-[18px] leading-[20px] placeholder:text-[#898D8F] focus:outline-none border-none p-0"
                    placeholder="12345" />
                </div>
              </div>
            </div>
          </div>

          {/* Personal Signature */}
          <div className="bg-[rgba(0,0,0,0.36)] backdrop-blur-[44px] rounded-[20px] w-[668px] p-[16px] flex flex-col gap-[16px] shrink-0">
            <h3 className="w-[636px] h-[15px] text-white font-semibold font-['Barlow_Condensed'] text-[21px] leading-[120%] shrink-0">Personal Signature</h3>

            <label className="flex items-center gap-[12px] cursor-pointer w-fit">
              <button type="button" onClick={() => set('wantsSignature', !form.wantsSignature)}
                className={`w-[26px] h-[26px] rounded-[6px] border-[2px] flex items-center justify-center shrink-0 transition-all ${form.wantsSignature ? 'bg-[#49B265] border-[#49B265]' : 'border-[#49B265] bg-transparent'
                  }`}>
                {form.wantsSignature && <FiCheck size={16} strokeWidth={3} className="text-[#1A1A1A]" />}
              </button>
              <span className="w-[203px] h-[20px] text-white font-medium font-['Barlow_Condensed'] text-[16px] leading-[20px] flex items-center shrink-0">I would like a personal signature</span>
            </label>

            <AnimatePresence>
              {form.wantsSignature && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="flex flex-col gap-[8px] mt-[8px]">
                    <label className="w-fit h-[20px] text-white font-medium font-['Barlow_Condensed'] text-[16px] leading-[20px] tracking-[-0.01em] flex items-center shrink-0">Name for Signature</label>
                    <div className="w-full h-[56px] bg-[rgba(255,255,255,0.08)] rounded-[10px] py-[16px] px-[20px] flex justify-between items-center">
                      <input type="text" value={form.signatureName} onChange={e => set('signatureName', e.target.value)}
                        className="w-full h-[20px] bg-transparent text-white font-medium font-['Barlow_Condensed'] text-[18px] leading-[20px] placeholder:text-[#898D8F] focus:outline-none border-none p-0"
                        placeholder="Emmy" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col gap-[12px] mt-[8px]">
            <button type="submit" disabled={submitting}
              className="w-full h-[48px] bg-[#49B265] text-white rounded-[10px] font-bold font-['Barlow_Condensed'] text-[20px] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-[10px] disabled:opacity-50">
              {submitting ? 'Placing Order...' : 'Order Book Now'}
              {!submitting && <FiArrowRight size={20} strokeWidth={2.5} />}
            </button>
            <p className="w-[668px] h-[20px] text-[rgba(137,141,143,1)] font-medium font-['Barlow_Condensed'] text-[18px] leading-[20px] text-center flex items-center justify-center shrink-0">
              After ordering, the book will be shipped within 3-5 business days
            </p>
          </div>

        </form>
      </motion.div>
    </motion.div>,
    document.body
  );
};

/* ── Main Section component ──────────────────────────────────── */
const MyBooksSection = ({ balance, onBalanceUpdate, onClose, preFetchedBooks, preFetchedLoading, preFetchedVisible, onBooksUpdate }) => {
  const { currentUser, getSocket } = useAuth();
  const [books, setBooks] = useState(preFetchedBooks || []);
  const [loading, setLoading] = useState(preFetchedBooks !== undefined ? preFetchedLoading : true);
  const [visible, setVisible] = useState(preFetchedBooks !== undefined ? preFetchedVisible : false); // whether this user is eligible to see books

  const [detailBook, setDetailBook] = useState(null);
  const [orderBook, setOrderBook] = useState(null);

  const updateBooksState = useCallback((newBooksOrFn) => {
    setBooks(prev => {
      const next = typeof newBooksOrFn === 'function' ? newBooksOrFn(prev) : newBooksOrFn;
      if (onBooksUpdate) onBooksUpdate(next);
      return next;
    });
  }, [onBooksUpdate]);

  const fetchBooks = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/books`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        updateBooksState(data.books);
        // Show section if: worldwide mode OR user is on German IP
        const isVisible = !data.booksGermanyOnly || data.isGermanIP;
        setVisible(isVisible);
      }
    } catch (e) {
      console.error('Failed to load books', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, updateBooksState]);

  useEffect(() => {
    if (preFetchedBooks === undefined) {
      fetchBooks();
    }
  }, [fetchBooks, preFetchedBooks]);

  // Sync state if pre-fetched props change
  useEffect(() => {
    if (preFetchedBooks !== undefined) {
      setBooks(preFetchedBooks);
      setLoading(preFetchedLoading);
      setVisible(preFetchedVisible);
    }
  }, [preFetchedBooks, preFetchedLoading, preFetchedVisible]);

  useEffect(() => {
    const socket = getSocket && getSocket();
    if (!socket) return;

    const onOrderUpdated = (data) => {
      updateBooksState(prev => prev.map(b =>
        (b.userOrder && b.userOrder._id === data.orderId)
          ? { ...b, userOrder: { ...b.userOrder, status: data.status } }
          : b
      ));
    };

    socket.on('bookOrderUpdated', onOrderUpdated);
    return () => socket.off('bookOrderUpdated', onOrderUpdated);
  }, [getSocket, updateBooksState]);

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

  if (!loading && !visible) {
    return createPortal(
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="bg-[#242424] rounded-[20px] w-[500px] p-[24px] shadow-2xl relative flex flex-col items-center text-center gap-4 border border-white/[0.08]"
          onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 text-[#888888] hover:text-white transition-colors">
            <FiX size={24} />
          </button>
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
            <FiBook size={32} />
          </div>
          <h2 className="text-white font-bold font-['Barlow_Condensed'] text-2xl uppercase">Germany Only Reward</h2>
          <p className="text-[#888888] font-['Barlow_Condensed'] text-[18px]">
            Ordering physical books is currently only available for shipping addresses within Germany.
          </p>
        </motion.div>
      </motion.div>,
      document.body
    );
  }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="bg-[#242424] rounded-[20px] w-[700px] h-[720px] my-auto flex flex-col p-[16px] gap-[16px] shadow-2xl relative border border-white/[0.08]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center w-[668px] h-[24px] gap-[6px] shrink-0">
          <h2 className="w-[638px] h-[19px] text-white font-bold font-['Barlow_Condensed'] text-[16px] leading-[120%] flex items-center">Select Book to Order</h2>
          <button onClick={onClose} className="text-[#888888] hover:text-white transition-colors flex items-center justify-center w-[24px] h-[24px]">
            <FiX size={24} strokeWidth={1.5} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-[#49B265] border-t-transparent animate-spin" />
            <p className="text-[#888888] font-['Barlow_Condensed'] text-[18px]">Loading books...</p>
          </div>
        ) : (
          /* Books Grid */
          <div className="w-[668px] h-[648px] overflow-x-auto overflow-y-hidden select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {books.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center w-full h-full">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <FiBook className="text-slate-600 text-xl" />
              </div>
              <p className="text-slate-500 text-sm">No books available right now.</p>
            </div>
          ) : (() => {
            const cols = Math.max(3, Math.ceil(books.length / 2));
            const reorderedBooks = Array(cols * 2).fill(null);
            books.forEach((book, i) => {
              const r = Math.floor(i / cols);
              const c = i % cols;
              reorderedBooks[c * 2 + r] = book;
            });
            return (
              <div className="grid grid-rows-2 grid-flow-col gap-[14px] h-[638px] p-0.5">
                {reorderedBooks.map((book, idx) => {
                  if (!book) {
                    return <div key={`empty-${idx}`} className="w-[213.33px] h-[317px] opacity-0 pointer-events-none" />;
                  }
                  return (
                    <button
                      key={book._id}
                      onClick={() => setDetailBook(book)}
                      className="flex flex-col items-center w-[213.33px] h-[317px] gap-[16px] rounded-[20px] p-[16px] bg-[rgba(0,0,0,0.36)] backdrop-blur-[44px] hover:scale-[1.02] transition-all cursor-pointer text-left"
                    >
                      {/* Cover */}
                      <div className="flex items-center justify-center w-full h-[162px]">
                        {book.coverImage ? (
                          <img src={book.coverImage.startsWith('data:') || book.coverImage.startsWith('http') ? book.coverImage : `${BACKEND}${book.coverImage}`} alt={book.title}
                            className="w-[106px] h-[162px] object-contain drop-shadow-lg"
                            onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <FiBook className="text-slate-600 text-4xl" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-col w-full h-full justify-between min-h-[80px]">
                        <p className="m-0 p-0 font-semibold font-['Barlow_Condensed'] text-[20px] leading-[120%] text-white line-clamp-3">
                          {book.title}
                        </p>
                        <div className="flex items-center w-full h-[26px] gap-[3px] mt-2">
                          <img
                            src="/coins/coinfix.png"
                            alt="Coin"
                            className="w-[22px] h-[22px] object-contain rounded-full shadow-[0px_14px_34px_0px_rgba(254,198,53,0.3)] flex-shrink-0"
                          />
                          <span className="flex items-center pt-[2px] pb-[4px] m-0 font-bold font-['Barlow_Condensed'] text-[22px] leading-none bg-clip-text text-transparent bg-gradient-to-b from-[#FEDF77] to-[#FCB91E]">
                            {book.coinCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
        )}
      </motion.div>

      {/* Book Detail Modal */}
      <AnimatePresence>
        {detailBook && (
          <BookDetailModal
            book={detailBook}
            balance={balance}
            onClose={() => setDetailBook(null)}
            onOrder={(b) => { setDetailBook(null); setOrderBook(b); }}
          />
        )}
      </AnimatePresence>

      {/* Order Modal */}
      <AnimatePresence>
        {orderBook && (
          <OrderModal
            book={orderBook}
            balance={balance}
            onClose={() => setOrderBook(null)}
            onSuccess={(newBalance, newOrder) => {
              if (onBalanceUpdate) onBalanceUpdate(newBalance);
              if (newOrder) {
                setBooks(prev => prev.map(b => b._id === orderBook._id ? { ...b, userOrder: newOrder } : b));
              }
              setOrderBook(null);
              onClose(); // Close the main selector modal too
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>,
    document.body
  );
};

export default MyBooksSection;
