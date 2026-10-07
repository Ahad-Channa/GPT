import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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

  const itemsPerPage = isMobile ? 4 : 5;
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
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white shadow-2xl relative border border-gray-100 box-border flex flex-col p-3.5 xs:p-4 md:p-8 my-auto overflow-hidden w-full max-w-[480px] md:max-w-[1072px] max-h-[94vh] md:max-h-[912px] rounded-[24px] md:rounded-[25px]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between w-full mb-3.5 md:mb-5 shrink-0">
            <h2
              className="font-bold text-[20px] xs:text-[22px] md:text-[24px] text-black tracking-tight m-0 p-0"
              style={{
                fontFamily: '"Poppins", "Bricolage Grotesque", sans-serif',
                lineHeight: '1.2',
              }}
            >
              {t('withdraw.bookDetails', 'Book Details')}
            </h2>
            <button
              onClick={onClose}
              className="rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 cursor-pointer w-[22px] h-[22px] md:w-[24px] md:h-[24px]"
              title="Close"
            >
              <FiX size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Scrollable Container for Modal Content */}
          <div className="w-full flex-1 overflow-y-auto select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-5 md:gap-6">
            {/* Top Card: Book Main Info */}
            <div
              className="w-full flex flex-col md:flex-row gap-3.5 md:gap-7 items-center md:items-start shrink-0 p-3 xs:p-3.5 md:p-[8px_24px_24px_8px] rounded-[20px] bg-[#F8F5EF]"
              style={{
                maxWidth: '1015px',
                minHeight: isMobile ? 'auto' : '400px',
                boxSizing: 'border-box',
              }}
            >
              {/* Mobile Top Row: Cover + Title */}
              <div className="flex md:hidden flex-row items-center gap-3.5 w-full">
                {/* Cover Card Container */}
                <div
                  className="w-[95.3px] h-[143px] rounded-[10px] bg-white shrink-0 flex items-center justify-center shadow-xs"
                >
                  {book.coverImage ? (
                    <img
                      src={book.coverImage.startsWith('data:') || book.coverImage.startsWith('http') ? book.coverImage : `${BACKEND}${book.coverImage}`}
                      alt={book.title}
                      className="w-[62.6px] h-[95.4px] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <FiBook className="text-slate-400 text-3xl" />
                  )}
                </div>

                {/* Title Right */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3
                    className="font-bold text-[17px] xs:text-[18px] leading-[22px] xs:leading-[24px] text-black tracking-tight line-clamp-4"
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    {book.title}
                  </h3>
                </div>
              </div>

              {/* Desktop Cover Card Container */}
              <div
                className="hidden md:flex items-center justify-center shrink-0 mx-auto md:mx-0"
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
                  height: isMobile ? 'auto' : '363px',
                  opacity: 1,
                }}
              >
                {/* Desktop Title */}
                <h3
                  className="hidden md:block"
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
                  className="flex flex-col w-full bg-white rounded-[20px] p-3.5 xs:p-4 md:p-[8px_12px_21px_12px] gap-3.5 md:gap-[17px] box-border"
                  style={{
                    height: isMobile ? 'auto' : '286px',
                    opacity: 1,
                  }}
                >
                  {/* Price & Action Button */}
                  <div className="flex items-center justify-between gap-3 xs:gap-4 flex-nowrap w-full">
                    <div className="flex items-center gap-2 shrink-0">
                      <img
                        src="/coins/gfitcoin.png"
                        alt="Coins"
                        className="w-6 h-6 object-contain shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = '/coins/Coin.png';
                        }}
                      />
                      <span
                        className="font-['Poppins',sans-serif] leading-none"
                        style={{
                          fontWeight: isMobile ? 600 : 700,
                          fontSize: isMobile ? '20px' : '22px',
                          color: isMobile ? 'rgba(190, 146, 0, 1)' : 'rgba(233, 179, 0, 1)',
                          letterSpacing: isMobile ? '0' : 'normal',
                        }}
                      >
                        {book.coinCost.toLocaleString('de-DE')}
                      </span>
                    </div>

                    <button
                      onClick={() => canAfford && onOrder(book)}
                      disabled={!canAfford}
                      className={`flex items-center justify-center font-semibold transition-all shrink-0 cursor-pointer w-[167px] h-[45px] rounded-[30px] px-3.5 xs:px-4 md:w-auto md:h-[40px] md:rounded-[9999px] md:px-6 ${
                        canAfford
                          ? 'bg-[#24324D] text-white hover:bg-[#1a2538] active:scale-95'
                          : 'bg-[#24324D] text-white opacity-90 cursor-not-allowed'
                      }`}
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontSize: '14px',
                      }}
                    >
                      <span className="truncate">
                        {canAfford ? t('withdraw.orderNow', 'Order Now') : t('withdraw.insufficientCoins', 'Insufficient Coins')}
                      </span>
                    </button>
                  </div>

                  {/* Description */}
                  {book.description && (
                    <>
                      <hr className="w-full border-black/5 m-0" />
                      <div className="flex flex-col gap-1.5">
                        <h4
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 700,
                            fontSize: '15px',
                            color: '#000000',
                            margin: 0,
                          }}
                        >
                          {t('withdraw.description', 'Description')}
                        </h4>
                        <p
                          className="overflow-y-auto select-text pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                          style={{
                            width: '100%',
                            maxWidth: '743px',
                            height: isMobile ? 'auto' : '148px',
                            maxHeight: isMobile ? '200px' : '148px',
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 400,
                            fontSize: '12.5px',
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
                  margin: '0 0 14px 0',
                }}
              >
                {t('withdraw.bookPreview', 'Book Preview')}
              </h3>

              {validImages.length > 0 ? (
                <>
                  <div className="grid grid-cols-4 md:grid-cols-5 gap-2 md:gap-3.5 w-full">
                    {visiblePreviews.map((url, i) => {
                      const actualIdx = previewIdx + i;
                      return (
                        <div
                          key={actualIdx}
                          onClick={() => setLightboxIdx(actualIdx)}
                          className="flex items-center justify-center p-1.5 md:p-2.5 rounded-[12px] md:rounded-[16px] cursor-pointer group transition-all hover:shadow-md bg-[#F8F5EF] h-[105px] xs:h-[115px] md:h-[240px] box-border"
                        >
                          <div
                            className="bg-white rounded-[4px] shadow-xs w-full h-full flex items-center justify-center p-1 md:p-2 overflow-hidden group-hover:scale-[1.02] transition-transform"
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
                    {t('withdraw.noPreviewPages', 'No preview pages available for this book.')}
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
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4 select-none"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx(null);
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLightboxIdx(null);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLightboxIdx(null);
              }}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[100010] p-2 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
              title="Close"
              aria-label="Close preview"
            >
              <FiX size={30} strokeWidth={2.5} />
            </button>

            <div
              className="relative w-full max-w-5xl max-h-[85vh] flex items-center justify-center pointer-events-auto my-auto"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={validImages[lightboxIdx]}
                alt={`Enlarged Preview ${lightboxIdx + 1}`}
                className="max-w-full max-h-[80vh] sm:max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />

              {validImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setLightboxIdx(prev => (prev > 0 ? prev - 1 : validImages.length - 1));
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setLightboxIdx(prev => (prev > 0 ? prev - 1 : validImages.length - 1));
                    }}
                    className="absolute left-2 sm:left-4 md:left-8 z-[100005] p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer flex items-center justify-center"
                    aria-label="Previous image"
                  >
                    <FiChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setLightboxIdx(prev => (prev < validImages.length - 1 ? prev + 1 : 0));
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setLightboxIdx(prev => (prev < validImages.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-2 sm:right-4 md:right-8 z-[100005] p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer flex items-center justify-center"
                    aria-label="Next image"
                  >
                    <FiChevronRight size={24} />
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
  const { t } = useTranslation();
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
      toast.error(t('books.fillAllFields', 'Please fill all shipping fields'));
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
        toast.error(data.error || t('books.failedToOrder', 'Failed to place order'));
      }
    } catch {
      toast.error(t('common.networkError', 'Network error. Please try again.'));
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
                {t('withdraw.orderSubmitted', 'Order Submitted!')}
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
                {t('withdraw.orderProcessing', 'Our team will process your order within 1-3 business days. Check transaction for info')}
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
                {t('withdraw.done', 'Done')}
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
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white shadow-2xl relative border border-gray-100 box-border flex flex-col p-3.5 xs:p-4 sm:p-6 md:p-9 my-auto overflow-hidden w-full max-w-[500px] md:max-w-[1072px] max-h-[94vh] md:max-h-[929px] rounded-[24px] md:rounded-[25px]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-3.5 md:mb-4 shrink-0">
          <h2
            className="font-bold text-[20px] xs:text-[22px] md:text-[24px] text-black tracking-tight m-0 p-0 text-left"
            style={{
              fontFamily: '"Poppins", "Bricolage Grotesque", sans-serif',
              lineHeight: '1.2',
            }}
          >
            {t('withdraw.bookDetails', 'Book Details')}
          </h2>
          <button
            onClick={onClose}
            className="w-[22px] h-[22px] md:w-6 md:h-6 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 cursor-pointer"
            title="Close"
          >
            <FiX size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="w-full flex-1 overflow-y-auto select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-4 md:gap-5">
          {/* Top Card: Selected Book Info Banner */}
          <div
            className="w-full flex items-center shrink-0 p-3 xs:p-3.5 md:p-[8px_24px_8px_12px] gap-3.5 md:gap-5 rounded-[16px] bg-[#F8F5EF] box-border min-h-[135px] md:h-[163px]"
            style={{
              maxWidth: '1015px',
            }}
          >
            {/* Book Cover Container */}
            <div
              className="flex items-center justify-center shrink-0 bg-white rounded-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.06)] p-1.5 w-[95px] h-[125px] xs:h-[130px] md:w-[108px] md:h-[147px] box-border"
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
              className="flex flex-col justify-center gap-1.5 md:gap-2 flex-1 min-w-0 text-left"
              style={{
                maxWidth: '836px',
              }}
            >
              <h3
                className="font-bold text-[17px] xs:text-[18px] md:text-[23px] leading-[22px] xs:leading-[24px] md:leading-[28px] text-black tracking-tight text-left break-words"
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  margin: 0,
                  padding: 0,
                }}
              >
                {book.title}
              </h3>

              <div className="flex items-center gap-1.5 md:gap-2 mt-0.5">
                <img
                  src="/coins/gfitcoin.png"
                  alt="Coins"
                  className="w-5 h-5 md:w-6 md:h-6 object-contain shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = '/coins/Coin.png';
                  }}
                />
                <span
                  className="font-bold text-[18px] md:text-[22px] leading-none text-[#E9B300]"
                  style={{
                    fontFamily: '"Bricolage Grotesque", "Poppins", sans-serif',
                  }}
                >
                  {book.coinCost ? book.coinCost.toLocaleString('de-DE') : '0'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:gap-5 w-full">
            {/* Shipping Address Section */}
            <div className="flex flex-col gap-3 md:gap-3.5 w-full text-left">
              <h3
                className="font-bold text-[20px] md:text-[23px] leading-[26px] md:leading-[28px] text-black tracking-tight text-left m-0 p-0"
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  maxWidth: '1017px',
                }}
              >
                {t('withdraw.shippingAddress', 'Shipping Address')}
              </h3>

              <div className="flex flex-col gap-3.5 md:gap-4 w-full">
                {/* Row 1: Full Name & Email Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:gap-4 w-full">
                  <div className="flex flex-col gap-1.5 w-full text-left">
                    <label
                      className="font-medium text-[15px] md:text-[16px] text-black text-left block"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                      }}
                    >
                      {t('withdraw.fullName', 'Full Name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={e => set('fullName', e.target.value)}
                      placeholder={t('withdraw.enterFullName', 'Enter your full name')}
                      className="w-full text-[#000000] placeholder:text-[#9CA3AF] px-5 xs:px-6 text-[14px] xs:text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-400/50 border-none transition-all rounded-[50px] bg-[#EFEFEF] h-[52px] xs:h-[54px] md:h-[58px] box-border"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 w-full text-left">
                    <label
                      className="font-medium text-[15px] md:text-[16px] text-black text-left block"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                      }}
                    >
                      {t('withdraw.emailAddress', 'Email Address')}
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder={t('withdraw.enterEmailPlaceholder', 'Enter your email address')}
                      className="w-full text-[#000000] placeholder:text-[#9CA3AF] px-5 xs:px-6 text-[14px] xs:text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-400/50 border-none transition-all rounded-[50px] bg-[#EFEFEF] h-[52px] xs:h-[54px] md:h-[58px] box-border"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                      }}
                    />
                  </div>
                </div>

                {/* Row 2: Address */}
                <div className="flex flex-col gap-1.5 w-full text-left">
                  <label
                    className="font-medium text-[15px] md:text-[16px] text-black text-left block"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                    }}
                  >
                    {t('withdraw.address', 'Address')}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder={t('withdraw.enterCompleteAddress', 'Enter your complete address')}
                    className="w-full text-[#000000] placeholder:text-[#9CA3AF] px-5 xs:px-6 text-[14px] xs:text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-400/50 border-none transition-all rounded-[50px] bg-[#EFEFEF] h-[52px] xs:h-[54px] md:h-[58px] box-border"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                    }}
                  />
                </div>

                {/* Row 3: City & Zipcode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:gap-4 w-full">
                  <div className="flex flex-col gap-1.5 w-full text-left">
                    <label
                      className="font-medium text-[15px] md:text-[16px] text-black text-left block"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                      }}
                    >
                      {t('withdraw.city', 'City')}
                    </label>
                    <input
                      type="text"
                      required
                      value={form.city}
                      onChange={e => set('city', e.target.value)}
                      placeholder={t('withdraw.enterCity', 'Enter your city')}
                      className="w-full text-[#000000] placeholder:text-[#9CA3AF] px-5 xs:px-6 text-[14px] xs:text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-400/50 border-none transition-all rounded-[50px] bg-[#EFEFEF] h-[52px] xs:h-[54px] md:h-[58px] box-border"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 w-full text-left">
                    <label
                      className="font-medium text-[15px] md:text-[16px] text-black text-left block"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                      }}
                    >
                      {t('withdraw.zipcode', 'Zipcode')}
                    </label>
                    <input
                      type="text"
                      required
                      value={form.zipcode}
                      onChange={e => set('zipcode', e.target.value)}
                      placeholder={t('withdraw.enterZipcode', 'Enter zip code')}
                      className="w-full text-[#000000] placeholder:text-[#9CA3AF] px-5 xs:px-6 text-[14px] xs:text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-400/50 border-none transition-all rounded-[50px] bg-[#EFEFEF] h-[52px] xs:h-[54px] md:h-[58px] box-border"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Signature Section */}
            <div className="flex flex-col gap-2 w-full text-left">
              <h3
                className="font-bold text-[20px] md:text-[23px] leading-[26px] md:leading-[28px] text-black tracking-tight text-left m-0 p-0"
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  maxWidth: '1017px',
                }}
              >
                {t('withdraw.personalSignature', 'Personal Signature')}
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
                  }}
                >
                  {t('withdraw.wantsSignature', 'I would like a personal signature')}
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
                    <div className="flex flex-col gap-1.5 w-full text-left">
                      <label
                        className="font-medium text-[15px] md:text-[16px] text-black text-left block"
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                        }}
                      >
                        {t('withdraw.nameForSignature', 'Name for Signature')}
                      </label>
                      <input
                        type="text"
                        value={form.signatureName}
                        onChange={e => set('signatureName', e.target.value)}
                        placeholder={t('withdraw.enterNameForSignature', 'Enter name for signature')}
                        className="w-full text-[#000000] placeholder:text-[#9CA3AF] px-5 xs:px-6 text-[14px] xs:text-[15px] focus:outline-none focus:ring-2 focus:ring-slate-400/50 border-none transition-all rounded-[50px] bg-[#EFEFEF] h-[52px] xs:h-[54px] md:h-[58px] box-border"
                        style={{
                          fontFamily: '"Poppins", sans-serif',
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
                className="w-full bg-[#24324D] text-white rounded-full font-semibold text-[15px] hover:bg-[#1a2538] active:scale-[0.99] transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer h-[50px]"
                style={{
                  fontFamily: '"Poppins", sans-serif',
                }}
              >
                {submitting ? t('withdraw.placingOrder', 'Placing Order...') : t('withdraw.orderBookNow', 'Order Book Now')}
              </button>
              <p
                className="text-center text-[12.5px] xs:text-[13px] text-[#777777] m-0 p-0"
                style={{
                  fontFamily: '"Poppins", sans-serif',
                }}
              >
                {t('withdraw.shippingTimeframe', 'After ordering, the book will be shipped within 3-5 business days')}
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
  const { t } = useTranslation();
  const { currentUser, getSocket } = useAuth();
  const [books, setBooks] = useState(preFetchedBooks || []);
  const [loading, setLoading] = useState(preFetchedBooks !== undefined ? preFetchedLoading : true);
  const [visible, setVisible] = useState(preFetchedBooks !== undefined ? preFetchedVisible : false); // whether this user is eligible to see books

  const [detailBook, setDetailBook] = useState(null);
  const [orderBook, setOrderBook] = useState(null);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [desktopPage, setDesktopPage] = useState(1);

  const totalDesktopPages = Math.max(1, Math.ceil(books.length / 4));
  const currentDesktopPage = Math.min(desktopPage, totalDesktopPages);
  const desktopBooks = books.slice((currentDesktopPage - 1) * 4, currentDesktopPage * 4);

  const renderBookCard = (book) => {
    const isSelected = selectedBookId === book._id;
    const titleLen = book.title ? book.title.length : 0;
    const titleFontSizeClass = titleLen > 38
      ? 'text-[17px] sm:text-[19px] leading-[22px] sm:leading-[25px]'
      : titleLen > 22
        ? 'text-[20px] sm:text-[22px] leading-[26px] sm:leading-[29px]'
        : 'text-[23px] xs:text-[25px] sm:text-[25px] leading-[30px] xs:leading-[35px] sm:leading-[35px]';

    return (
      <div
        key={book._id}
        onClick={() => {
          setSelectedBookId(book._id);
          setDetailBook(book);
        }}
        className={`flex items-center w-full sm:max-w-[503px] h-[197px] sm:h-[262px] transition-all cursor-pointer text-left group p-2 sm:p-[8px_24px_8px_8px] gap-3.5 sm:gap-6 rounded-[20px] sm:rounded-[16px] border-2 box-border opacity-100 shrink-0 ${
          isSelected
            ? 'bg-[#24324D] border-[#24324D]'
            : 'bg-[#F8F5EF] border-transparent'
        }`}
      >
        {/* Cover Card Container */}
        <div
          className="w-[136px] sm:w-[185px] h-[181px] sm:h-[246px] rounded-[14px] flex items-center justify-center shrink-0 bg-white box-border shadow-[0_4px_14px_rgba(0,0,0,0.06)]"
        >
          {book.coverImage ? (
            <img
              src={book.coverImage.startsWith('data:') || book.coverImage.startsWith('http') ? book.coverImage : `${BACKEND}${book.coverImage}`}
              alt={book.title}
              className="w-[101.5px] sm:w-[138px] h-[154.5px] sm:h-[210px] object-contain shrink-0 drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <FiBook className="text-slate-400 text-3xl sm:text-4xl" />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center gap-2 sm:gap-3.5 flex-1 min-w-0 pr-1 sm:pr-0">
          <h3
            className={`line-clamp-3 font-bold tracking-tight ${titleFontSizeClass} ${
              isSelected ? 'text-white' : 'text-black'
            }`}
            style={{
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: 0,
              padding: 0,
            }}
          >
            {book.title}
          </h3>

          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
            <img
              src="/coins/gfitcoin.png"
              alt="Coins"
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
              onError={(e) => {
                e.currentTarget.src = '/coins/Coin.png';
              }}
            />
            <span
              className="font-bold text-[18px] sm:text-[22px] leading-none text-[#E9B300]"
              style={{
                fontFamily: '"Poppins", sans-serif',
              }}
            >
              {book.coinCost.toLocaleString('de-DE')}
            </span>
          </div>
        </div>
      </div>
    );
  };

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
            {t('withdraw.germanyOnlyTitle', 'Germany Only Reward')}
          </h2>
          <p
            style={{
              fontFamily: '"Poppins", sans-serif',
              fontSize: '14px',
              lineHeight: '22px',
              color: '#666666',
            }}
          >
            {t('withdraw.germanyOnlyDesc', 'Ordering physical books is currently only available for shipping addresses within Germany.')}
          </p>
        </motion.div>
      </motion.div>,
      document.body
    );
  }

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white shadow-2xl relative border border-gray-100 box-border flex flex-col p-3.5 xs:p-4 sm:p-8 my-auto w-full max-w-[540px] sm:max-w-[1072px] max-h-[94vh] sm:max-h-[760px] rounded-[24px] sm:rounded-[25px]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between w-full mb-4 sm:mb-5 shrink-0">
          <h2
            className="font-bold text-[20px] sm:text-[23px] text-black tracking-tight m-0 p-0"
            style={{
              fontFamily: '"Bricolage Grotesque", sans-serif',
              lineHeight: '1.2',
            }}
          >
            {t('withdraw.selectBookTitle', 'Select Book to Order')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors shrink-0 cursor-pointer w-[22px] h-[22px]"
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
              {t('withdraw.loadingBooks', 'Loading books...')}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View: vertically scrollable list of all books */}
            <div className="sm:hidden w-full overflow-y-auto max-h-[78vh] select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                    {t('withdraw.noBooksAvailable', 'No books available right now.')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 w-full">
                  {books.map((book) => renderBookCard(book))}
                </div>
              )}
            </div>

            {/* Desktop View: 4 items per page with circular navigation arrows */}
            <div className="hidden sm:flex flex-col w-full">
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
                    {t('withdraw.noBooksAvailable', 'No books available right now.')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 w-full min-h-[540px]">
                    {desktopBooks.map((book) => renderBookCard(book))}
                  </div>

                  {/* Desktop Pagination Controls */}
                  {totalDesktopPages > 1 && (
                    <div
                      className="flex items-center justify-center w-full mt-5"
                      style={{ gap: '12px' }}
                    >
                      <button
                        onClick={() => setDesktopPage((p) => Math.max(1, p - 1))}
                        disabled={currentDesktopPage <= 1}
                        className="transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:cursor-not-allowed"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '100px',
                          boxSizing: 'border-box',
                          background: currentDesktopPage > 1 ? 'rgba(36, 50, 77, 1)' : 'transparent',
                          border: currentDesktopPage > 1 ? 'none' : '1px solid rgba(36, 50, 77, 1)',
                          color: currentDesktopPage > 1 ? '#FFFFFF' : 'rgba(36, 50, 77, 1)',
                        }}
                        title="Previous page"
                        aria-label="Previous page"
                      >
                        <FiChevronLeft size={18} />
                      </button>

                      <button
                        onClick={() => setDesktopPage((p) => Math.min(totalDesktopPages, p + 1))}
                        disabled={currentDesktopPage >= totalDesktopPages}
                        className="transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:cursor-not-allowed"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '100px',
                          boxSizing: 'border-box',
                          background: currentDesktopPage < totalDesktopPages ? 'rgba(36, 50, 77, 1)' : 'transparent',
                          border: currentDesktopPage < totalDesktopPages ? 'none' : '1px solid rgba(36, 50, 77, 1)',
                          color: currentDesktopPage < totalDesktopPages ? '#FFFFFF' : 'rgba(36, 50, 77, 1)',
                        }}
                        title="Next page"
                        aria-label="Next page"
                      >
                        <FiChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
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

