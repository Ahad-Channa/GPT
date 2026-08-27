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
const BACKEND = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

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
      {amount.toLocaleString('de-DE')}
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
  const validImages = (book.previewImages?.filter(Boolean) || []).map(url =>
    url.startsWith('data:') || url.startsWith('http') ? url : `${BACKEND}${url}`
  );
  const [previewIdx, setPreviewIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerPage = isMobile ? 1 : 5;
  const maxIdx = Math.max(0, validImages.length - itemsPerPage);

  const nextPreview = () => {
    setPreviewIdx(p => Math.min(maxIdx, p + 1));
  };
  const prevPreview = () => {
    setPreviewIdx(p => Math.max(0, p - 1));
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

  const visiblePreviews = validImages.slice(previewIdx, previewIdx + itemsPerPage);

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white shadow-2xl relative border border-gray-100 box-border flex flex-col p-6 sm:p-8 my-auto overflow-hidden"
        style={{
          width: '100%',
          maxWidth: '1072px',
          height: 'auto',
          maxHeight: '912px',
          borderRadius: '25px',
          background: 'rgba(255, 255, 255, 1)',
          opacity: 1,
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-5 shrink-0">
          <h2
            style={{
              fontFamily: '"Poppins", "Bricolage Grotesque", sans-serif',
              fontWeight: 700,
              fontSize: '24px',
              lineHeight: '28px',
              letterSpacing: '-0.02em',
              color: '#000000',
              margin: 0,
              padding: 0,
            }}
          >
            Book Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 cursor-pointer"
            style={{
              width: '24px',
              height: '24px',
            }}
            title="Close"
          >
            <FiX size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Container for Modal Content */}
        <div className="w-full flex-1 overflow-y-auto select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-6">
          {/* Top Card: Book Main Info */}
          <div
            className="w-full flex flex-col md:flex-row gap-6 md:gap-7 items-center md:items-start shrink-0"
            style={{
              width: '100%',
              maxWidth: '1015px',
              minHeight: '400px',
              background: 'rgba(248, 245, 239, 1)',
              borderRadius: '20px',
              padding: '8px 24px 24px 8px',
              boxSizing: 'border-box',
              opacity: 1,
            }}
          >
            {/* Cover Card Container */}
            <div
              className="flex items-center justify-center shrink-0 mx-auto md:mx-0"
              style={{
                width: '185px',
                height: '246px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 1)',
                boxSizing: 'border-box',
                opacity: 1,
              }}
            >
              {book.coverImage ? (
                <img
                  src={book.coverImage.startsWith('data:') || book.coverImage.startsWith('http') ? book.coverImage : `${BACKEND}${book.coverImage}`}
                  alt={book.title}
                  className="object-contain"
                  style={{
                    width: '138px',
                    height: '210px',
                    opacity: 1,
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <FiBook className="text-slate-400 text-4xl" />
              )}
            </div>

            {/* Info Right */}
            <div 
              className="flex flex-col flex-1 min-w-0 w-full justify-between"
              style={{
                maxWidth: '767px',
                height: '363px',
                opacity: 1,
              }}
            >
              {/* Title */}
              <h3
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 700,
                  fontSize: '22px',
                  lineHeight: '28px',
                  letterSpacing: '-0.01em',
                  color: '#000000',
                  margin: 0,
                  padding: 0,
                  marginTop: '10px',
                }}
              >
                {book.title}
              </h3>

              {/* Price & Description Container */}
              <div
                className="flex flex-col w-full"
                style={{
                  width: '100%',
                  height: '286px',
                  background: 'rgba(255, 255, 255, 1)',
                  borderRadius: '20px',
                  gap: '17px',
                  padding: '8px 12px 21px 12px',
                  boxSizing: 'border-box',
                  opacity: 1,
                }}
              >
                {/* Price & Action Button */}
                <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2">
                    <img
                      src="/coins/gfitcoin.png"
                      alt="Coins"
                      className="w-6 h-6 object-contain shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = '/coins/Coin.png';
                      }}
                    />
                    <span
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 700,
                        fontSize: '22px',
                        lineHeight: '1',
                        color: 'rgba(233, 179, 0, 1)',
                      }}
                    >
                      {book.coinCost.toLocaleString('de-DE')}
                    </span>
                  </div>

                  <button
                    onClick={() => canAfford && onOrder(book)}
                    disabled={!canAfford}
                    className={`flex items-center justify-center font-semibold transition-all shrink-0 cursor-pointer ${
                      canAfford
                        ? 'bg-[#24324D] text-white hover:bg-[#1a2538] active:scale-95'
                        : 'bg-[#24324D] text-white opacity-90 cursor-not-allowed'
                    }`}
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontSize: '14px',
                      borderRadius: '9999px',
                      height: '40px',
                      padding: '0 24px',
                    }}
                  >
                    {canAfford ? 'Order Now' : 'Insufficient Coins'}
                  </button>
                </div>

                {/* Description */}
                {book.description && (
                  <>
                    <hr className="w-full border-black/5 m-0" />
                    <div className="flex flex-col gap-1">
                  <h4
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 700,
                      fontSize: '15px',
                      color: '#000000',
                      margin: 0,
                    }}
                  >
                    Description
                  </h4>
                  <p
                    className="overflow-y-auto select-text pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    style={{
                      width: '100%',
                      maxWidth: '743px',
                      height: '148px',
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 400,
                      fontSize: '12px',
                      lineHeight: '20px',
                      color: '#333333',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      textAlign: 'justify',
                    }}
                  >
                    {book.description}
                  </p>
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Book Preview Section */}
          <div className="w-full flex flex-col shrink-0">
            <h3
              style={{
                fontFamily: '"Poppins", "Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: '20px',
                lineHeight: '24px',
                letterSpacing: '-0.01em',
                color: '#000000',
                margin: '0 0 16px 0',
              }}
            >
              Book Preview
            </h3>

            {validImages.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 w-full">
                  {visiblePreviews.map((url, i) => {
                    const actualIdx = previewIdx + i;
                    return (
                      <div
                        key={actualIdx}
                        onClick={() => setLightboxIdx(actualIdx)}
                        className="flex items-center justify-center p-2.5 rounded-[16px] cursor-pointer group transition-all hover:shadow-md"
                        style={{
                          background: 'rgba(248, 245, 239, 1)',
                          height: '240px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          className="bg-white rounded-[4px] shadow-sm w-full h-full flex items-center justify-center p-2 overflow-hidden group-hover:scale-[1.02] transition-transform"
                        >
                          <img
                            src={url}
                            alt={`Preview ${actualIdx + 1}`}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Carousel Navigation Arrows */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={prevPreview}
                    disabled={previewIdx === 0}
                    className="w-9 h-9 rounded-full bg-[#24324D] text-white flex items-center justify-center hover:bg-[#1a2538] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Previous"
                  >
                    <FiChevronLeft size={18} />
                  </button>
                  <button
                    onClick={nextPreview}
                    disabled={previewIdx >= maxIdx}
                    className="w-9 h-9 rounded-full bg-white border border-[#CBD5E1] text-[#24324D] hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Next"
                  >
                    <FiChevronRight size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div
                className="w-full flex items-center justify-center p-8 rounded-[16px] text-center"
                style={{ background: 'rgba(248, 245, 239, 1)' }}
              >
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontSize: '14px',
                    color: '#666666',
                    margin: 0,
                  }}
                >
                  No preview pages available for this book.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
      </motion.div>

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx(null);
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(null);
              }}
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <FiX size={32} />
            </button>

            <div className="relative w-full max-w-5xl h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <img
                src={validImages[lightboxIdx]}
                alt={`Enlarged Preview ${lightboxIdx + 1}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />

              {validImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIdx(prev => (prev > 0 ? prev - 1 : validImages.length - 1));
                    }}
                    className="absolute left-4 md:left-8 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <FiChevronLeft size={28} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIdx(prev => (prev < validImages.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-4 md:right-8 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <FiChevronRight size={28} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
};


/* ── Order Book Modal ─────────────────────────── */
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={handleDone}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white shadow-2xl w-full flex flex-col my-auto overflow-hidden border border-gray-100 box-border p-[10px]"
          style={{
            width: '100%',
            maxWidth: '626px',
            minHeight: '402px',
            background: 'rgba(255, 255, 255, 1)',
            borderRadius: '30px',
            opacity: 1,
          }}
          onClick={e => e.stopPropagation()}
        >
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
            {/* Bottom Right Corner Background Graphic */}
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
                Order Submitted!
              </h2>

              {/* Book Title */}
              <p
                className="text-[#000000] text-[15px] font-normal leading-[23px] m-0 mb-1 line-clamp-2"
                style={{ fontFamily: '"Poppins", sans-serif' }}
              >
                {book.title}
              </p>

              {/* Info Subtext */}
              <p
                className="text-[#000000] text-[15px] font-normal leading-[23px] m-0 mb-6"
                style={{ fontFamily: '"Poppins", sans-serif' }}
              >
                Our team will process your order within 1-3 business days. Check transaction for info
              </p>

              {/* Done Button */}
              <button
                id="order-done-btn"
                type="button"
                onClick={handleDone}
                className="w-full flex items-center justify-center transition-all cursor-pointer shadow-none border-none outline-none hover:bg-[#1a2538] active:scale-[0.99]"
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
        </motion.div>
      </motion.div>,
      document.body
    );
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white shadow-2xl relative border border-gray-100 box-border flex flex-col p-6 sm:p-8 md:p-9 my-auto overflow-hidden"
        style={{
          width: '100%',
          maxWidth: '1072px',
          height: 'auto',
          maxHeight: '929px',
          borderRadius: '25px',
          background: 'rgba(255, 255, 255, 1)',
          opacity: 1,
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-4 shrink-0">
          <h2
            style={{
              fontFamily: '"Poppins", "Bricolage Grotesque", sans-serif',
              fontWeight: 700,
              fontSize: '24px',
              lineHeight: '28px',
              letterSpacing: '-0.02em',
              color: '#000000',
              margin: 0,
              padding: 0,
            }}
          >
            Book Details
          </h2>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 cursor-pointer"
            title="Close"
          >
            <FiX size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="w-full flex-1 overflow-y-auto select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-5">
          {/* Top Card: Selected Book Info Banner */}
          <div
            className="w-full flex items-center shrink-0"
            style={{
              width: '100%',
              maxWidth: '1015px',
              height: '163px',
              background: 'rgba(248, 245, 239, 1)',
              borderRadius: '16px',
              padding: '8px 24px 8px 12px',
              gap: '20px',
              boxSizing: 'border-box',
              opacity: 1,
            }}
          >
            {/* Book Cover Container */}
            <div
              className="flex items-center justify-center shrink-0 bg-white"
              style={{
                width: '108px',
                height: '147px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 1)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                padding: '6px',
                boxSizing: 'border-box',
              }}
            >
              {book.coverImage ? (
                <img
                  src={book.coverImage.startsWith('data:') || book.coverImage.startsWith('http') ? book.coverImage : `${BACKEND}${book.coverImage}`}
                  alt={book.title}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <FiBook className="text-slate-400 text-3xl" />
              )}
            </div>

            {/* Info Right */}
            <div
              className="flex flex-col justify-center gap-2 flex-1 min-w-0"
              style={{
                maxWidth: '836px',
                opacity: 1,
              }}
            >
              <h3
                className="line-clamp-2"
                style={{
                  width: '100%',
                  maxWidth: '836px',
                  fontFamily: '"Bricolage Grotesque", "Poppins", sans-serif',
                  fontWeight: 700,
                  fontSize: '23px',
                  lineHeight: '28px',
                  letterSpacing: '-0.02em',
                  color: '#000000',
                  margin: 0,
                  padding: 0,
                  opacity: 1,
                }}
              >
                {book.title}
              </h3>

              <div className="flex items-center gap-2">
                <img
                  src="/coins/gfitcoin.png"
                  alt="Coins"
                  className="w-6 h-6 object-contain shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = '/coins/Coin.png';
                  }}
                />
                <span
                  style={{
                    fontFamily: '"Bricolage Grotesque", "Poppins", sans-serif',
                    fontWeight: 700,
                    fontSize: '22px',
                    lineHeight: '1',
                    color: 'rgba(233, 179, 0, 1)',
                  }}
                >
                  {book.coinCost ? book.coinCost.toLocaleString('de-DE') : '0'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
            {/* Shipping Address Section */}
            <div className="flex flex-col gap-3.5 w-full">
              <h3
                style={{
                  width: '100%',
                  maxWidth: '1017px',
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: '23px',
                  lineHeight: '28px',
                  letterSpacing: '-0.02em',
                  color: '#000000',
                  margin: 0,
                  padding: 0,
                  opacity: 1,
                }}
              >
                Shipping Address
              </h3>

              <div className="flex flex-col gap-4 w-full">
                {/* Row 1: Full Name & Email Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '16px',
                        lineHeight: '26px',
                        letterSpacing: '0em',
                        color: '#000000',
                        opacity: 1,
                        display: 'block',
                      }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={e => set('fullName', e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full text-[#000000] placeholder:text-[#9CA3AF] px-6 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-400/50 border-none transition-all"
                      style={{
                        maxWidth: '499.5px',
                        height: '58px',
                        background: 'rgba(239, 239, 239, 1)',
                        borderRadius: '50px',
                        opacity: 1,
                        fontFamily: '"Poppins", sans-serif',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '16px',
                        lineHeight: '26px',
                        letterSpacing: '0em',
                        color: '#000000',
                        opacity: 1,
                        display: 'block',
                      }}
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full text-[#000000] placeholder:text-[#9CA3AF] px-6 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-400/50 border-none transition-all"
                      style={{
                        maxWidth: '499.5px',
                        height: '58px',
                        background: 'rgba(239, 239, 239, 1)',
                        borderRadius: '50px',
                        opacity: 1,
                        fontFamily: '"Poppins", sans-serif',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Row 2: Address */}
                <div className="flex flex-col gap-1.5 w-full">
                  <label
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '16px',
                      lineHeight: '26px',
                      letterSpacing: '0em',
                      color: '#000000',
                      opacity: 1,
                      display: 'block',
                    }}
                  >
                    Address
                  </label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder="Enter your complete address"
                    className="w-full text-[#000000] placeholder:text-[#9CA3AF] px-6 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-400/50 border-none transition-all"
                    style={{
                      maxWidth: '1018px',
                      height: '58px',
                      background: 'rgba(239, 239, 239, 1)',
                      borderRadius: '50px',
                      opacity: 1,
                      fontFamily: '"Poppins", sans-serif',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Row 3: City & Zipcode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '16px',
                        lineHeight: '26px',
                        letterSpacing: '0em',
                        color: '#000000',
                        opacity: 1,
                        display: 'block',
                      }}
                    >
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={form.city}
                      onChange={e => set('city', e.target.value)}
                      placeholder="Enter your city"
                      className="w-full text-[#000000] placeholder:text-[#9CA3AF] px-6 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-400/50 border-none transition-all"
                      style={{
                        maxWidth: '499.5px',
                        height: '58px',
                        background: 'rgba(239, 239, 239, 1)',
                        borderRadius: '50px',
                        opacity: 1,
                        fontFamily: '"Poppins", sans-serif',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: '16px',
                        lineHeight: '26px',
                        letterSpacing: '0em',
                        color: '#000000',
                        opacity: 1,
                        display: 'block',
                      }}
                    >
                      Zipcode
                    </label>
                    <input
                      type="text"
                      required
                      value={form.zipcode}
                      onChange={e => set('zipcode', e.target.value)}
                      placeholder="Enter zip code"
                      className="w-full text-[#000000] placeholder:text-[#9CA3AF] px-6 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-400/50 border-none transition-all"
                      style={{
                        maxWidth: '499.5px',
                        height: '58px',
                        background: 'rgba(239, 239, 239, 1)',
                        borderRadius: '50px',
                        opacity: 1,
                        fontFamily: '"Poppins", sans-serif',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Signature Section */}
            <div className="flex flex-col gap-2 w-full">
              <h3
                style={{
                  width: '100%',
                  maxWidth: '1017px',
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: '23px',
                  lineHeight: '28px',
                  letterSpacing: '-0.02em',
                  color: '#000000',
                  margin: 0,
                  padding: 0,
                  opacity: 1,
                }}
              >
                Personal Signature
              </h3>

              <div
                onClick={() => set('wantsSignature', !form.wantsSignature)}
                className="flex items-center gap-3 cursor-pointer select-none w-fit group py-1"
              >
                <div
                  style={{
                    width: '15px',
                    height: '15px',
                    borderRadius: '5px',
                    border: '1px solid rgba(36, 50, 77, 1)',
                    background: form.wantsSignature ? 'rgba(36, 50, 77, 1)' : '#FFFFFF',
                    opacity: 1,
                    boxSizing: 'border-box',
                  }}
                  className="flex items-center justify-center shrink-0 transition-all"
                >
                  {form.wantsSignature && <FiCheck size={10} strokeWidth={3.5} className="text-white" />}
                </div>
                <span
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '15px',
                    color: '#000000',
                    opacity: 1,
                  }}
                >
                  I would like a personal signature
                </span>
              </div>

              <AnimatePresence>
                {form.wantsSignature && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mt-1"
                  >
                    <div className="flex flex-col gap-1.5 w-full">
                      <label
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 500,
                          fontSize: '16px',
                          lineHeight: '26px',
                          letterSpacing: '0em',
                          color: '#000000',
                          opacity: 1,
                          display: 'block',
                        }}
                      >
                        Name for Signature
                      </label>
                      <input
                        type="text"
                        value={form.signatureName}
                        onChange={e => set('signatureName', e.target.value)}
                        placeholder="Enter name for signature"
                        className="w-full text-[#000000] placeholder:text-[#9CA3AF] px-6 text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-400/50 border-none transition-all"
                        style={{
                          maxWidth: '1018px',
                          height: '58px',
                          background: 'rgba(239, 239, 239, 1)',
                          borderRadius: '50px',
                          opacity: 1,
                          fontFamily: '"Poppins", sans-serif',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit Button & Subtext */}
            <div className="flex flex-col gap-2.5 mt-1 w-full">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#24324D] text-white rounded-full font-semibold text-[15px] hover:bg-[#1a2538] active:scale-[0.99] transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
                style={{
                  height: '50px',
                  fontFamily: '"Poppins", sans-serif',
                }}
              >
                {submitting ? 'Placing Order...' : 'Order Book Now'}
              </button>
              <p
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontSize: '13px',
                  color: '#777777',
                  textAlign: 'center',
                  margin: 0,
                  padding: 0,
                }}
              >
                After ordering, the book will be shipped within 3-5 business days
              </p>
            </div>
          </form>
        </div>
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
  const [selectedBookId, setSelectedBookId] = useState(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        // Show section if: worldwide mode OR backend confirmed real German IP (no VPN)
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
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-[25px] w-full max-w-[500px] p-6 sm:p-8 shadow-2xl relative flex flex-col items-center text-center gap-4 border border-gray-100"
          onClick={e => e.stopPropagation()}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 cursor-pointer"
            style={{ width: '22px', height: '22px' }}
            title="Close"
          >
            <FiX size={13} strokeWidth={2.5} />
          </button>
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-2">
            <FiBook size={30} />
          </div>
          <h2
            style={{
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontWeight: 700,
              fontSize: '22px',
              color: '#000000',
            }}
          >
            Germany Only Reward
          </h2>
          <p
            style={{
              fontFamily: '"Poppins", sans-serif',
              fontSize: '14px',
              lineHeight: '22px',
              color: '#666666',
            }}
          >
            Ordering physical books is currently only available for shipping addresses within Germany.
          </p>
        </motion.div>
      </motion.div>,
      document.body
    );
  }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white shadow-2xl relative border border-gray-100 box-border flex flex-col p-6 sm:p-8 my-auto"
        style={{
          width: '100%',
          maxWidth: '1072px',
          height: 'auto',
          maxHeight: '921px',
          borderRadius: '25px',
          background: 'rgba(255, 255, 255, 1)',
          opacity: 1,
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between w-full mb-5 shrink-0">
          <h2
            style={{
              width: '339px',
              height: '23px',
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontWeight: 700,
              fontSize: '23px',
              lineHeight: '23px',
              letterSpacing: '-0.02em',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              margin: 0,
              padding: 0,
              opacity: 1,
            }}
          >
            Select Book to Order
          </h2>
          <button
            onClick={onClose}
            className="rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 cursor-pointer"
            style={{
              width: '22px',
              height: '22px',
            }}
            title="Close"
          >
            <FiX size={13} strokeWidth={2.5} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <p
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontSize: '15px',
                color: '#666666',
              }}
            >
              Loading books...
            </p>
          </div>
        ) : (
          /* Books Grid with hidden scrollbar */
          <div className="w-full overflow-y-auto max-h-[830px] select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {books.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center w-full">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <FiBook size={24} />
                </div>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontSize: '15px',
                    color: '#666666',
                  }}
                >
                  No books available right now.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {books.map((book) => {
                  const isSelected = selectedBookId === book._id;
                  return (
                    <div
                      key={book._id}
                      onClick={() => {
                        setSelectedBookId(book._id);
                        setDetailBook(book);
                      }}
                      className="flex items-center w-full transition-all cursor-pointer text-left group"
                      style={{
                        width: '100%',
                        maxWidth: '503px',
                        height: '262px',
                        background: isSelected ? 'rgba(36, 50, 77, 1)' : 'rgba(248, 245, 239, 1)',
                        borderRadius: '16px',
                        padding: '8px 24px 8px 8px',
                        gap: '24px',
                        border: isSelected ? '2px solid rgba(36, 50, 77, 1)' : '2px solid transparent',
                        boxSizing: 'border-box',
                        opacity: 1,
                      }}
                    >
                      {/* Cover Card Container */}
                      <div
                        className="flex items-center justify-center shrink-0 bg-white"
                        style={{
                          width: '185px',
                          height: '246px',
                          borderRadius: '14px',
                          boxSizing: 'border-box',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                        }}
                      >
                        {book.coverImage ? (
                          <img
                            src={book.coverImage.startsWith('data:') || book.coverImage.startsWith('http') ? book.coverImage : `${BACKEND}${book.coverImage}`}
                            alt={book.title}
                            className="object-contain"
                            style={{
                              width: '138px',
                              height: '210px',
                              filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.18))',
                            }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <FiBook className="text-slate-400 text-4xl" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-col justify-center gap-3.5 flex-1 min-w-0">
                        <h3
                          className="line-clamp-3"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 700,
                            fontSize: '22px',
                            lineHeight: '28px',
                            letterSpacing: '-0.01em',
                            color: isSelected ? '#FFFFFF' : '#000000',
                            margin: 0,
                            padding: 0,
                          }}
                        >
                          {book.title}
                        </h3>

                        <div className="flex items-center gap-2 mt-1">
                          <img
                            src="/coins/gfitcoin.png"
                            alt="Coins"
                            className="w-6 h-6 object-contain shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = '/coins/Coin.png';
                            }}
                          />
                          <span
                            style={{
                              fontFamily: '"Poppins", sans-serif',
                              fontWeight: 700,
                              fontSize: '22px',
                              lineHeight: '1',
                              color: 'rgba(233, 179, 0, 1)',
                            }}
                          >
                            {book.coinCost.toLocaleString('de-DE')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
