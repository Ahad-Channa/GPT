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
        <img src={valid[idx]} alt={`Preview ${idx + 1}`} className="max-h-full max-w-full object-contain" />
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
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="bg-[#242424] rounded-[20px] w-[700px] h-[808px] max-h-[95vh] flex flex-col p-[16px] gap-[16px] shadow-2xl relative overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
              <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover rounded-md drop-shadow-2xl" />
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
                    <img src={url} alt={`Preview ${i+1}`} className="w-full h-full object-cover" />
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
        toast.success('📦 Order placed! Your book will be shipped within 3–5 business days.');
        onSuccess(data.newBalance, data.order);
        onClose();
      } else {
        toast.error(data.error || 'Failed to place order');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="bg-[#0c1322] border border-white/[0.1] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <h2 className="text-sm font-bold text-white">Order Book</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors">
            <FiX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Book summary */}
            <div className="flex gap-4 items-center bg-[#111827] border border-white/[0.07] rounded-xl p-4">
              {book.coverImage && (
                <img src={book.coverImage} alt={book.title} className="w-14 h-18 object-contain flex-shrink-0 rounded-lg" />
              )}
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{book.title}</p>
                <div className="mt-2">
                  <CoinBadge amount={book.coinCost} size="sm" />
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Shipping Address</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">Full Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                    <input type="text" required value={form.fullName} onChange={e => set('fullName', e.target.value)}
                      className="w-full bg-[#151b2b] border border-white/[0.08] rounded-xl pl-8 pr-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                      placeholder="Emmy" />
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">Email</label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                    <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                      className="w-full bg-[#151b2b] border border-white/[0.08] rounded-xl pl-8 pr-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                      placeholder="emmy@gmail.com" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Address</label>
                  <div className="relative">
                    <FiHome className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                    <input type="text" required value={form.address} onChange={e => set('address', e.target.value)}
                      className="w-full bg-[#151b2b] border border-white/[0.08] rounded-xl pl-8 pr-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                      placeholder="Enter your complete address" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">City</label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                    <input type="text" required value={form.city} onChange={e => set('city', e.target.value)}
                      className="w-full bg-[#151b2b] border border-white/[0.08] rounded-xl pl-8 pr-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                      placeholder="Enter your city" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Zipcode</label>
                  <div className="relative">
                    <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                    <input type="text" required value={form.zipcode} onChange={e => set('zipcode', e.target.value)}
                      className="w-full bg-[#151b2b] border border-white/[0.08] rounded-xl pl-8 pr-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                      placeholder="12345" />
                  </div>
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="border border-white/[0.07] rounded-xl p-4 bg-[#111827]">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Personal Signature</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <button type="button" onClick={() => set('wantsSignature', !form.wantsSignature)}
                  className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    form.wantsSignature ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 bg-transparent'
                  }`}>
                  {form.wantsSignature && <FiCheck size={11} className="text-white" />}
                </button>
                <span className="text-sm text-slate-300">I would like a personal signature</span>
              </label>

              <AnimatePresence>
                {form.wantsSignature && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }} className="overflow-hidden mt-3">
                    <label className="block text-xs text-slate-500 mb-1">Name for Signature</label>
                    <input type="text" value={form.signatureName} onChange={e => set('signatureName', e.target.value)}
                      className="w-full bg-[#151b2b] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                      placeholder={form.fullName || 'Your name'} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <button type="submit" disabled={submitting}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-sm">
              {submitting ? <FiLoader className="animate-spin" size={16} /> : <FiArrowRight size={16} />}
              {submitting ? 'Placing Order...' : 'Order Book Now →'}
            </button>
            <p className="text-center text-xs text-slate-500 mt-3">
              After ordering, the book will be shipped within 3–5 business days
            </p>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

/* ── Main Section component ──────────────────────────────────── */
const MyBooksSection = ({ balance, onBalanceUpdate }) => {
  const { currentUser, getSocket } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false); // whether this user is eligible to see books

  const [detailBook, setDetailBook] = useState(null);
  const [orderBook, setOrderBook] = useState(null);

  const fetchBooks = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API}/books`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setBooks(data.books);
        // Show section if: worldwide mode OR user is on German IP
        setVisible(!data.booksGermanyOnly || data.isGermanIP);
      }
    } catch (e) {
      console.error('Failed to load books', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  useEffect(() => {
    const socket = getSocket && getSocket();
    if (!socket) return;
    
    const onOrderUpdated = (data) => {
      setBooks(prev => prev.map(b => 
        (b.userOrder && b.userOrder._id === data.orderId) 
          ? { ...b, userOrder: { ...b.userOrder, status: data.status } } 
          : b
      ));
    };

    socket.on('bookOrderUpdated', onOrderUpdated);
    return () => socket.off('bookOrderUpdated', onOrderUpdated);
  }, [getSocket, setBooks]);

  if (loading) return null;
  if (!visible) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        className="flex flex-col w-[1240px] gap-[18px] rounded-[20px] p-[20px] bg-white/[0.14]"
      >
        {/* Section header */}
        <div className="flex items-center w-[852px] h-[88px] gap-[16px]">
          <div className="flex items-center justify-center w-[88px] h-[88px] gap-[6px] rounded-[10px] py-[10px] px-[12px] bg-[rgba(41,253,152,0.2)] flex-shrink-0">
            <img src="/coins/booki.png" alt="Book Icon" className="w-[44px] h-[44px] object-contain" />
          </div>
          <div className="flex flex-col w-[748px] h-[85px] gap-[6px] justify-center">
            <h2 className="w-[748px] h-[50px] m-0 p-0 font-bold font-['Barlow_Condensed'] text-[42px] leading-[120%] text-white whitespace-nowrap">
              My Books
            </h2>
            <p className="w-[748px] h-[29px] m-0 p-0 font-medium font-['Barlow_Condensed'] text-[22px] leading-[130%] text-[#888888] whitespace-nowrap">
              Redeem your coins for my books. Each book can be ordered with a personal signature.
            </p>
          </div>
        </div>

        {books.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <FiBook className="text-slate-600 text-xl" />
            </div>
            <p className="text-slate-500 text-sm">No books available right now.</p>
            <p className="text-slate-600 text-xs">Check back soon for new releases!</p>
          </div>
        ) : (
          <div className="flex w-[1200px] gap-[14px] overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {books.map(book => (
              <button
                key={book._id}
                onClick={() => setDetailBook(book)}
                className="flex flex-col items-center flex-shrink-0 w-[188.33px] h-[317px] gap-[16px] rounded-[20px] p-[16px] bg-[rgba(0,0,0,0.36)] backdrop-blur-[44px] cursor-pointer group text-left"
              >
                {/* Cover */}
                <div className="flex items-center justify-center w-full h-[162px]">
                  {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title}
                      className="w-[106px] h-[162px] object-contain drop-shadow-lg" />
                  ) : (
                    <FiBook className="text-slate-600 text-4xl" />
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col w-full h-full justify-between">
                  <p className="w-[156.33px] h-[65px] m-0 p-0 font-semibold font-['Barlow_Condensed'] text-[21px] leading-[120%] text-white overflow-hidden">
                    {book.title}
                  </p>
                  <div className="flex items-center w-[156.33px] h-[26px] gap-[3px]">
                    <img 
                      src="/coins/coinfix.png" 
                      alt="Coin" 
                      className="w-[26px] h-[26px] object-contain rounded-full shadow-[0px_14px_34px_0px_rgba(254,198,53,0.3)] flex-shrink-0" 
                    />
                    <span className="flex items-center min-w-[51px] pt-[2px] pb-[4px] m-0 font-bold font-['Barlow_Condensed'] text-[22px] leading-none bg-clip-text text-transparent bg-gradient-to-b from-[#FEDF77] to-[#FCB91E]">
                      {book.coinCost.toLocaleString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
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
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default MyBooksSection;
