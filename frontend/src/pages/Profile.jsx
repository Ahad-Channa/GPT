import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiZap, FiStar, FiMail, FiCalendar, FiEdit2, FiCheck, FiX, FiShield,
  FiActivity, FiArrowDownCircle, FiCheckCircle, FiClock,
  FiInbox, FiLoader, FiTrendingUp, FiChevronDown, FiPlayCircle,
  FiSend, FiExternalLink, FiSettings, FiTrash2, FiAlertTriangle, FiRefreshCw,
  FiUsers, FiCopy, FiLock, FiList
} from 'react-icons/fi';
import TransactionHistory from '../components/wallet/TransactionHistory';
import CoinDisplay from '../components/CoinDisplay';
import CoinIcon from '../components/CoinIcon';

// ── Customization / Avatar Shop Modal ─────────────────────────────
const CustomizationModal = ({ isOpen, onClose, mongoUser, token, setMongoUser }) => {
  const [avatarUrl, setAvatarUrl] = useState(mongoUser?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [purchasingAvatar, setPurchasingAvatar] = useState(null);

  const [freePage, setFreePage] = useState(0);
  const [premiumPage, setPremiumPage] = useState(0);
  const ITEMS_PER_PAGE = 5;

  const fetchAvatars = async () => {
    setLoadingAvatars(true);
    try {
      const res = await fetch(`${API}/wallet/avatars`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Sort: Owned first (isUnlocked), then locked.
        const sorted = data.avatars.sort((a, b) => {
          if (a.isUnlocked === b.isUnlocked) return a.price - b.price;
          return a.isUnlocked ? -1 : 1;
        });
        setAvatars(sorted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAvatars(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setAvatarUrl(mongoUser?.avatarUrl || '');
      setPurchasingAvatar(null);
      fetchAvatars();
    }
  }, [isOpen, mongoUser]);

  const handleAvatarClick = (avatar) => {
    if (avatar.quantity !== null && avatar.quantity <= 0 && !avatar.isUnlocked) {
      toast.error('This avatar is sold out!');
      return;
    }
    if (avatar.isUnlocked) {
      setAvatarUrl(avatar.url);
      setPurchasingAvatar(null);
    } else {
      setPurchasingAvatar(avatar);
    }
  };

  const handlePurchaseAvatar = async () => {
    if (!purchasingAvatar) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/wallet/avatars/buy/${purchasingAvatar._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setAvatarUrl(purchasingAvatar.url);
        setMongoUser(prev => ({
          ...prev,
          walletBalance: data.walletBalance,
          unlockedAvatars: [...(prev.unlockedAvatars || []), purchasingAvatar._id]
        }));

        // Auto-equip on backend
        await fetch(`${API}/auth/profile`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: purchasingAvatar.url })
        });

        fetchAvatars();
        setPurchasingAvatar(null);
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleEquip = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl })
      });
      const data = await res.json();
      if (res.ok) {
        setMongoUser(data.user);
        toast.success('Avatar equipped successfully!');
        onClose();
      } else {
        toast.error(data.error || 'Failed to equip avatar');
      }
    } catch {
      toast.error('Network error.');
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  const freeAvatars = avatars.filter(a => !a.isPremium);
  const premiumAvatars = avatars.filter(a => a.isPremium);

  const paginatedFree = freeAvatars.slice(freePage * ITEMS_PER_PAGE, (freePage + 1) * ITEMS_PER_PAGE);
  const paginatedPremium = premiumAvatars.slice(premiumPage * ITEMS_PER_PAGE, (premiumPage + 1) * ITEMS_PER_PAGE);

  const renderAvatar = (avatar) => {
    const isEquipped = avatarUrl === avatar.url;
    const isSelected = purchasingAvatar?._id === avatar._id;
    const isSoldOut = avatar.quantity !== null && avatar.quantity <= 0 && !avatar.isUnlocked;

    return (
      <button
        key={avatar._id}
        onClick={() => handleAvatarClick(avatar)}
        className={`relative group aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 ${isEquipped
          ? 'border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] scale-105 z-10'
          : isSelected
            ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-105 z-10'
            : 'border-white/5 hover:border-white/20 hover:scale-105'
          } bg-[#151b2b] ${isSoldOut ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
      >
        <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

        {isEquipped && (
          <div className="absolute inset-x-0 bottom-0 bg-indigo-500/90 py-1 text-[10px] font-bold text-white text-center backdrop-blur-sm">
            EQUIPPED
          </div>
        )}

        {!avatar.isUnlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] group-hover:bg-black/20 transition-all">
            <div className="bg-black/60 p-2 rounded-full mb-1 backdrop-blur-md border border-white/10">
              <FiLock className="text-amber-400" size={16} />
            </div>
            {isSoldOut ? (
              <span className="bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md">
                SOLD OUT
              </span>
            ) : (
              <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md">
                {avatar.price}🪙
              </span>
            )}
            {!isSoldOut && avatar.quantity !== null && avatar.quantity > 0 && (
              <span className="mt-1 text-[9px] text-amber-100/70 font-semibold bg-black/50 px-1.5 rounded">
                {avatar.quantity} left
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999999] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0c101b] border border-white/[0.08] rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col relative shadow-2xl shadow-indigo-500/10"
      >
        <div className="flex-shrink-0 flex justify-between items-center px-8 pt-8 pb-4 border-b border-white/[0.04]">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2 font-display tracking-tight">
              <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">Avatar Shop</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">Customize your identity with premium avatars</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2">
            <FiX size={20} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-8">
          {loadingAvatars ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FiLoader className="animate-spin text-3xl text-indigo-500 mb-4" />
              <p className="text-slate-400 text-sm">Loading collection...</p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Free Avatars Section */}
              {freeAvatars.length > 0 && (
                <section>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Free Avatars</h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    </div>
                    {freeAvatars.length > ITEMS_PER_PAGE && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setFreePage(Math.max(0, freePage - 1))}
                          disabled={freePage === 0}
                          className="px-2 py-1 bg-white/5 rounded hover:bg-white/10 disabled:opacity-30 text-xs font-bold text-slate-300"
                        >Prev</button>
                        <button
                          onClick={() => setFreePage(Math.min(Math.ceil(freeAvatars.length / ITEMS_PER_PAGE) - 1, freePage + 1))}
                          disabled={(freePage + 1) * ITEMS_PER_PAGE >= freeAvatars.length}
                          className="px-2 py-1 bg-white/5 rounded hover:bg-white/10 disabled:opacity-30 text-xs font-bold text-slate-300"
                        >Next</button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    {paginatedFree.map(renderAvatar)}
                  </div>
                </section>
              )}

              {/* Premium Avatars Section */}
              {premiumAvatars.length > 0 && (
                <section>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider text-amber-400/90 flex items-center gap-2">
                        <FiStar /> Premium Shop
                      </h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-amber-500/20 to-transparent" />
                    </div>
                    {premiumAvatars.length > ITEMS_PER_PAGE && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPremiumPage(Math.max(0, premiumPage - 1))}
                          disabled={premiumPage === 0}
                          className="px-2 py-1 bg-amber-500/10 rounded hover:bg-amber-500/20 disabled:opacity-30 text-xs font-bold text-amber-400 border border-amber-500/20"
                        >Prev</button>
                        <button
                          onClick={() => setPremiumPage(Math.min(Math.ceil(premiumAvatars.length / ITEMS_PER_PAGE) - 1, premiumPage + 1))}
                          disabled={(premiumPage + 1) * ITEMS_PER_PAGE >= premiumAvatars.length}
                          className="px-2 py-1 bg-amber-500/10 rounded hover:bg-amber-500/20 disabled:opacity-30 text-xs font-bold text-amber-400 border border-amber-500/20"
                        >Next</button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    {paginatedPremium.map(renderAvatar)}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-6 border-t border-white/[0.04] bg-[#080b14]/50 rounded-b-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              <FiZap className="text-amber-400" />
              <CoinDisplay amount={mongoUser?.walletBalance || 0} size={14} className="text-sm font-bold text-white" />
            </div>
          </div>

          <div className="flex gap-4 w-full sm:w-auto items-center">
            {purchasingAvatar ? (
              <>
                <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)] bg-[#0b101e] flex-shrink-0 animate-fade-in-up">
                  <img src={purchasingAvatar.url} alt={purchasingAvatar.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-1 sm:flex-none items-center gap-3 bg-amber-500/10 border border-amber-500/20 pl-4 pr-1 py-1 rounded-xl h-12">
                  <div className="flex flex-col items-start pr-2 hidden sm:flex">
                    <span className="text-[10px] text-amber-500/70 font-bold uppercase tracking-wider leading-none mb-0.5">Purchase</span>
                    <span className="text-sm font-bold text-amber-400 leading-none">{purchasingAvatar.name}</span>
                  </div>
                  <button
                    onClick={handlePurchaseAvatar}
                    disabled={saving || (mongoUser?.walletBalance || 0) < purchasingAvatar.price}
                    className="flex-1 sm:flex-none h-full px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-lg shadow-amber-500/20 transition-all whitespace-nowrap flex items-center justify-center"
                  >
                    {saving ? 'Processing...' : `Buy for ${purchasingAvatar.price}🪙`}
                  </button>
                  <button onClick={() => setPurchasingAvatar(null)} className="h-full px-3 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <FiX />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={handleEquip}
                disabled={saving || avatarUrl === mongoUser?.avatarUrl}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all disabled:opacity-50 disabled:hover:shadow-none"
              >
                {saving ? <FiLoader className="animate-spin" /> : <FiCheck />}
                {saving ? 'Equipping...' : (avatarUrl === mongoUser?.avatarUrl ? 'Equipped' : 'Equip Selected')}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TX_TYPE_LABEL = {
  offer_reward: { label: 'Offer Reward', color: 'text-indigo-400' },
  custom_offer_reward: { label: 'Custom Offer', color: 'text-indigo-400' },
  daily_bonus: { label: 'Daily Bonus', color: 'text-amber-400' },
  promo_code: { label: 'Promo Code', color: 'text-emerald-400' },
  referral_reward: { label: 'Referral', color: 'text-cyan-400' },
  withdrawal: { label: 'Withdrawal', color: 'text-rose-400' },
  admin_adjustment: { label: 'Adjustment', color: 'text-orange-400' },
  leaderboard_reward: { label: 'Leaderboard', color: 'text-violet-400' },
  vip_reward: { label: 'VIP Reward', color: 'text-yellow-400' },
  mission_reward: { label: 'Mission', color: 'text-sky-400' },
  chargeback: { label: 'Chargeback', color: 'text-rose-400' },
};

const STATUS_DOT = {
  completed: 'bg-emerald-400',
  pending: 'bg-amber-400 animate-pulse',
  rejected: 'bg-rose-400',
  failed: 'bg-rose-400',
  reversed: 'bg-slate-400',
};

const calculateReleaseIn = (releaseDateStr) => {
  if (!releaseDateStr) return 'N/A';
  const diff = new Date(releaseDateStr).getTime() - new Date().getTime();
  if (diff <= 0) return 'Ready';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return `${d}d ${h}h`;
};

const Pagination = ({ page, totalPages, onNext, onPrev, onPageClick }) => {
  if (totalPages <= 1) return null;

  const visiblePages = [];
  if (totalPages <= 3) {
    for (let i = 1; i <= totalPages; i++) visiblePages.push(i);
  } else {
    let start = Math.min(Math.max(1, page - 1), totalPages - 2);
    if (page === 1) start = 1;
    visiblePages.push(start, start + 1, start + 2);
  }

  const CircleBtn = ({ active, disabled, onClick, children, isArrow }) => {
    const isGreen = active;
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="transition-all hover:brightness-110"
        style={{
          width: '52px', height: '52px', borderRadius: '52px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isGreen ? 'rgba(73, 178, 101, 1)' : (isArrow ? 'transparent' : '#2A2A2A'),
          border: isArrow ? '1px solid rgba(73, 178, 101, 1)' : '1px solid transparent',
          color: isGreen || !isArrow ? '#fff' : 'rgba(73, 178, 101, 1)',
          fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, fontSize: '26px',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.3 : 1,
          boxSizing: 'border-box',
        }}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="pt-6 pb-2 flex items-center justify-center gap-[10px]">
      <CircleBtn isArrow disabled={page === 1} onClick={onPrev}>
        <div style={{
          width: '16px', height: '16px',
          backgroundColor: 'rgba(73, 178, 101, 1)',
          WebkitMaskImage: 'url(/coins/leftarrow.png)',
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          transform: 'rotate(180deg)'
        }} />
      </CircleBtn>

      {visiblePages.map(p => (
        <CircleBtn
          key={p}
          active={page === p}
          onClick={() => onPageClick && onPageClick(p)}
        >
          {p}
        </CircleBtn>
      ))}

      <CircleBtn isArrow disabled={page === totalPages} onClick={onNext}>
        <div style={{
          width: '16px', height: '16px',
          backgroundColor: 'rgba(73, 178, 101, 1)',
          WebkitMaskImage: 'url(/coins/leftarrow.png)',
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          transform: 'rotate(0deg)'
        }} />
      </CircleBtn>
    </div>
  );
};

const useHistory = (token, type, endpoint = '/wallet/history') => {
  const { currentUser } = useAuth();
  const [dataList, setDataList] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalEarned, setTotalEarned] = useState(0);

  const fetchPage = async (pg) => {
    if (!token && !currentUser) return;
    try {
      setLoading(true);
      setError('');
      const freshToken = currentUser ? await currentUser.getIdToken() : token;
      const params = new URLSearchParams({ page: pg, limit: 5 });
      if (type) params.append('type', type);

      const res = await fetch(`${API}${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const items = data.transactions || data.logs || [];
      setDataList(items);
      setTotalPages(data.pagination?.totalPages || 1);
      setPage(pg);
      if (pg === 1 && data.stats) {
        setTotalEarned(data.stats.totalEarned || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPage(1);
  }, [token, type, endpoint]);

  const nextPage = () => { if (page < totalPages) fetchPage(page + 1); };
  const prevPage = () => { if (page > 1) fetchPage(page - 1); };

  return { dataList, loading, error, page, totalPages, nextPage, prevPage, totalEarned, goToPage: fetchPage };
};

// ── Tab Button
const TabBtn = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-[10px] h-[48px] px-[20px] rounded-[10px] text-[20px] font-bold transition-all shrink-0 ${active
      ? 'bg-[#49b265] text-white shadow-[0px_4px_0px_0px_rgba(39,109,58,1)]'
      : 'text-white/60 hover:text-white bg-transparent'
      }`}
    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
  >
    <img 
      src={icon} 
      alt=""
      className={`w-[24px] h-[24px] shrink-0 object-contain ${active ? 'brightness-0 invert' : ''}`}
    />
    <span>{label}</span>
  </button>
);

// ── Clicked Offer Row (inline proof upload per offer)
const ClickedOfferRow = ({ offer, token: initialToken, onRefresh }) => {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const isRejected = offer.submissionStatus === 'rejected';
  const iconEmoji = offer.icon && !offer.icon.startsWith('http') && !offer.icon.includes('/') ? offer.icon : null;
  const iconUrl = offer.coverImage || (offer.icon && !iconEmoji ? offer.icon : null);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProofImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const freshToken = currentUser ? await currentUser.getIdToken() : initialToken;
      const res = await fetch(`${API}/custom-offers/${offer._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({ proofText: proof, proofImage }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: 'success', message: 'Proof submitted! Awaiting admin review.' });
        setOpen(false);
        onRefresh();
      } else {
        setResult({ type: 'error', message: data.error || 'Submission failed.' });
      }
    } catch {
      setResult({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-[1180px] bg-[#171717] rounded-[20px] pt-[20px] pr-[95px] pb-[20px] pl-[40px] hover:bg-[#1a1a1a]/80 transition-colors flex flex-col gap-[15px]">
      {/* Table Row Grid */}
      <div className="grid grid-cols-[300px_repeat(4,1fr)] gap-[20px] items-center">
        {/* Offers Title */}
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[28px] leading-[120%] text-white truncate">
          {offer.title}
        </span>

        {/* Started On */}
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-semibold text-[28px] leading-[120%]">
          {offer.createdAt ? new Date(offer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
        </span>

        {/* Reward */}
        <div className="flex items-center gap-[6px] font-semibold text-[#fbbf24] text-[28px] leading-[120%]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          <img src="/coins/coinfix.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" />
          <span>{(offer.rewardAmount || 0).toLocaleString()}</span>
        </div>

        {/* Status */}
        <div>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`inline-flex items-center justify-center px-[20px] py-[4px] rounded-[100px] text-[22px] leading-[120%] font-semibold border ${isRejected
            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            : 'bg-[#153423] text-[#4ade80] border-[#4ade80]/20'
            }`}>
            {isRejected ? 'Rejected' : 'In Progress'}
          </span>
        </div>

        {/* Proof Action */}
        <div className="flex justify-start">
          <button
            onClick={() => { setOpen(o => !o); setResult(null); }}
            className="h-[48px] px-5 bg-[#49b265] hover:bg-[#3bb770] text-white rounded-[10px] flex items-center justify-center gap-[10px] font-bold font-['Barlow_Condensed'] text-[20px] transition-all shadow-[0px_4px_0px_0px_rgba(39,109,58,1)] active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(39,109,58,1)]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            <FiSend className="w-[20px] h-[20px] shrink-0" />
            <span>{isRejected ? 'Resubmit' : 'Submit Proof'}</span>
          </button>
        </div>
      </div>

      {/* Rejection note */}
      {isRejected && offer.adminNote && (
        <div className="text-rose-400 text-sm font-semibold italic border-l-2 border-rose-500 pl-4 py-1 bg-rose-500/5 rounded-r-[10px]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Admin rejection note: "{offer.adminNote}"
        </div>
      )}

      {/* Result banner */}
      {result && (
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`p-4 rounded-[10px] border text-lg font-semibold ${result.type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
          {result.type === 'success' && <FiCheckCircle className="inline mr-2 text-xl" />}
          <span>{result.message}</span>
        </div>
      )}

      {/* Inline proof form (expandable) */}
      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="overflow-hidden mt-3"
          >
            <div className="bg-[#101010] border border-white/[0.07] rounded-[15px] p-6 space-y-4">
              <textarea
                value={proof}
                onChange={e => setProof(e.target.value)}
                placeholder="Describe your completion (transaction ID, username, steps taken…)"
                rows={3}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-[10px] px-4 py-3 text-white text-lg placeholder-slate-600 focus:outline-none focus:border-[#49b265]/50 focus:ring-1 focus:ring-[#49b265]/20 resize-none"
              />

              {/* Image upload */}
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="cursor-pointer flex items-center gap-2 py-3 px-4 border border-dashed border-white/[0.12] rounded-[10px] bg-[#1b1b1b] hover:bg-white/[0.03] transition-colors text-lg text-slate-300">
                <FiSend className="text-[#49b265] text-xl" />
                <span>
                  {proofImage ? '✓ Screenshot selected — click to change' : 'Attach screenshot (optional)'}
                </span>
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </label>

              {proofImage && (
                <div className="rounded-[10px] overflow-hidden border border-white/[0.08] max-w-sm mx-auto bg-black/50 p-2">
                  <img src={proofImage} alt="Proof preview" className="max-h-32 object-contain mx-auto" />
                </div>
              )}

              <div className="flex gap-3 pt-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                <button
                  type="submit"
                  disabled={submitting || (!proof.trim() && !proofImage)}
                  className="flex items-center justify-center gap-2 h-[48px] px-6 bg-[#49b265] hover:bg-[#3bb770] text-white rounded-[10px] font-bold text-lg transition-all shadow-[0px_4px_0px_0px_rgba(39,109,58,1)] active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(39,109,58,1)]"
                >
                  {submitting ? <FiLoader className="animate-spin text-xl" /> : <FiSend className="text-xl" />}
                  <span>{submitting ? 'Submitting…' : 'Send Proof'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-[48px] px-6 rounded-[10px] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors font-bold text-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Settings & Delete Account Modal
const SettingsModal = ({ isOpen, onClose, mongoUser, token, setMongoUser, logout }) => {
  const [displayName, setDisplayName] = useState(mongoUser?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletePhase, setDeletePhase] = useState(0);
  const [isPrivate, setIsPrivate] = useState(mongoUser?.isPrivate || false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(mongoUser?.displayName || '');
      setIsPrivate(mongoUser?.isPrivate || false);
      setDeletePhase(0);
      setError('');
      setSuccess('');
    }
  }, [isOpen, mongoUser]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const nameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!nameRegex.test(displayName)) {
      setError('Invalid username format.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, isPrivate })
      });
      const data = await res.json();
      if (res.ok) {
        setMongoUser(data.user);
        setSuccess('Profile updated successfully!');
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch {
      setError('Network error.');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (deletePhase === 0) {
      setDeletePhase(1);
      return;
    }
    if (deletePhase === 1) {
      setDeletePhase(2);
      try {
        const res = await fetch(`${API}/auth/account`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          await logout();
          window.location.href = '/';
        } else {
          const d = await res.json();
          setError(d.error || 'Failed to delete account');
          setDeletePhase(0);
        }
      } catch {
        setError('Network error');
        setDeletePhase(0);
      }
    }
  };
  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0c101b] border border-white/[0.08] rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col relative shadow-glow-lg"
      >
        {/* Sticky close button — always visible, never scrolls away */}
        <div className="flex-shrink-0 flex justify-end px-6 pt-6">
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2">
            <FiX size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="px-8 pb-8 space-y-8">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2 font-display">
                <FiSettings className="text-indigo-400" /> Account Settings
              </h2>
              <p className="text-slate-400 text-sm mt-1">Manage your identity, avatars, and account security</p>
            </div>

            {(error || success) && (
              <div className={`p-4 rounded-xl text-sm font-medium ${error ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {error || success}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#151b2b] border border-white/[0.08] p-4 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <FiShield className="text-indigo-400" /> Private Profile
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Hide specific offer details (like survey names) from other users on your public profile and the live earning feed.
                  </p>
                </div>
                <button
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPrivate ? 'bg-indigo-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Display Name</h3>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-[#151b2b] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                placeholder="Username"
              />
            </div>



            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold hover:shadow-glow transition-all disabled:opacity-50"
              >
                {saving ? <FiLoader className="animate-spin" /> : <FiCheck />}
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

            <div className="mt-12 pt-8 border-t border-white/[0.08]">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2 mb-2">
                <FiAlertTriangle /> Danger Zone
              </h3>
              <p className="text-slate-400 text-sm mb-4">Deleting your account is permanent. All associated data will be wiped.</p>

              {deletePhase === 0 && (
                <button
                  onClick={handleDelete}
                  className="px-5 py-2.5 rounded-xl border border-rose-500/40 text-rose-400 font-semibold hover:bg-rose-500/10 transition-colors text-sm"
                >
                  Delete Account...
                </button>
              )}
              {deletePhase === 1 && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex items-center justify-between flex-wrap gap-4">
                  <p className="text-rose-300 font-medium text-sm">Are you absolutely sure?</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setDeletePhase(0)} className="text-slate-400 hover:text-white text-sm font-semibold">Cancel</button>
                    <button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-rose-900/50 transition-colors">
                      Yes, delete my account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

// ══════════════════════════════════════════════════════════════════
const Profile = () => {

  const { currentUser, mongoUser, setMongoUser, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [activeTab, setActiveTab] = useState('started_offers');
  const [token, setToken] = useState(null);
  const [customOffers, setCustomOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [profileStats, setProfileStats] = useState({ totalTasksCompleted: 0, earnings30Days: 0, totalEarnedLifetime: 0 });
  const [startedPage, setStartedPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [heldPage, setHeldPage] = useState(1);
  const itemsPerPage = 5;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  useEffect(() => {
    if (currentUser) currentUser.getIdToken().then(setToken);
  }, [currentUser]);

  useEffect(() => {
    if (token) {
      fetch(`${API}/wallet/dashboard-stats`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setProfileStats({
              totalTasksCompleted: data.totalTasksCompleted,
              earnings30Days: data.earnings30Days,
              totalEarnedLifetime: data.totalEarnedLifetime
            });
          }
        })
        .catch(console.error);
    }
  }, [token]);

  const fetchCustomOffers = async () => {
    if (!currentUser && !token) return;
    setLoadingOffers(true);
    try {
      const freshToken = currentUser ? await currentUser.getIdToken() : token;
      const res = await fetch(`${API}/custom-offers`, { headers: { Authorization: `Bearer ${freshToken}` } });
      const data = await res.json();
      if (data.success) {
        setCustomOffers(data.offers);
      }
    } catch (err) {
      console.error('Failed to fetch custom offers:', err);
    } finally {
      setLoadingOffers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'started_offers' && token) {
      fetchCustomOffers();
    }
  }, [activeTab, token]);

  // History hooks (only fetches when token is ready)
  const txHistory = useHistory(activeTab === 'transaction_history' ? token : null, null);
  const chargebacks = useHistory(activeTab === 'chargebacks' ? token : null, 'chargeback');

  // Completed offers = approved custom offers + all offer_reward transactions
  const [completedOffers, setCompletedOffers] = useState([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const fetchCompletedOffers = async () => {
    if (!currentUser && !token) return;
    setLoadingCompleted(true);
    try {
      const freshToken = currentUser ? await currentUser.getIdToken() : token;

      // Fetch both sources in parallel
      const [customRes, walletRes] = await Promise.all([
        fetch(`${API}/custom-offers`, { headers: { Authorization: `Bearer ${freshToken}` } }),
        fetch(`${API}/wallet/history?type=offer_reward%2Ccustom_offer_reward&limit=50`, { headers: { Authorization: `Bearer ${freshToken}` } }),
      ]);
      const [customData, walletData] = await Promise.all([customRes.json(), walletRes.json()]);

      // Approved custom offers
      const approvedCustom = (customData.success ? customData.offers.filter(o => o.submissionStatus === 'approved') : [])
        .map(o => ({
          _id: o._id,
          title: o.title,
          rewardAmount: o.rewardAmount,
          completedAt: o.updatedAt,
          source: 'custom',
        }));

      // Offer-wall reward transactions
      const walletOffers = (walletData.success ? walletData.transactions : [])
        .filter(tx => tx.status === 'completed' && tx.amount > 0)
        .map(tx => ({
          _id: tx._id,
          title: tx.description || 'Offer Reward',
          rewardAmount: tx.amount,
          completedAt: tx.createdAt,
          source: 'offerwall',
        }));

      // Merge, deduplicate by _id, sort newest first
      const seen = new Set();
      const merged = [...approvedCustom, ...walletOffers]
        .filter(o => { if (seen.has(String(o._id))) return false; seen.add(String(o._id)); return true; })
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      setCompletedOffers(merged);
    } catch (err) {
      console.error('Failed to fetch completed offers:', err);
    } finally {
      setLoadingCompleted(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'completed_offers' && token) fetchCompletedOffers();
  }, [activeTab, token]);

  // Held Offers
  const [heldOffers, setHeldOffers] = useState([]);
  const [loadingHolds, setLoadingHolds] = useState(false);

  const fetchHeldOffers = async () => {
    if (!currentUser && !token) return;
    setLoadingHolds(true);
    try {
      const freshToken = currentUser ? await currentUser.getIdToken() : token;
      const res = await fetch(`${API}/wallet/pending-earnings`, { headers: { Authorization: `Bearer ${freshToken}` } });
      const data = await res.json();
      if (data.success) {
        setHeldOffers(data.regularHolds);
      }
    } catch (err) {
      console.error('Failed to fetch held offers:', err);
    } finally {
      setLoadingHolds(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'held_offers' && token) fetchHeldOffers();
  }, [activeTab, token]);



  return (
    <DashboardLayout>
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        mongoUser={mongoUser}
        token={token}
        setMongoUser={setMongoUser}
        logout={logout}
      />
      <CustomizationModal
        isOpen={showCustomization}
        onClose={() => setShowCustomization(false)}
        mongoUser={mongoUser}
        token={token}
        setMongoUser={setMongoUser}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-[1240px] shrink-0 mx-auto flex flex-col gap-[20px]"
      >
        {/* ─── PROFILE HERO ─────────────────────────────── */}
        <div className="flex flex-col gap-[18px] bg-white/[0.14] rounded-[20px] border border-[#2A2A2E] p-[20px] backdrop-blur-[94px]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
            {/* Left side: Avatar + User Details */}
            <div className="flex flex-col sm:flex-row gap-[16px] items-start sm:items-center flex-1 min-w-0">
              {/* Avatar picture (rounded corners rectangular shape) */}
              <div className="relative shrink-0">
                <div className="w-[118px] h-[118px] rounded-[20px] overflow-hidden border border-white/10 bg-[#111827] shadow-[0_0_20px_rgba(0,0,0,0.4)]">
                  <img
                    src={mongoUser?.avatarUrl || currentUser?.photoURL || `/avatars/avatar1.png`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Identity details */}
              <div className="flex flex-col gap-[10px] w-[824px] h-[104px]">
                <div className="flex items-center w-auto h-[50px]">
                  <h1 className="text-[42px] font-bold text-white font-['Barlow_Condensed'] leading-[120%] whitespace-nowrap">
                    {mongoUser?.displayName || 'Anonymous'}
                  </h1>
                </div>

                {/* Info tags list */}
                <div className="flex items-center gap-[6px] w-[587px] h-[44px]">
                  <div className="flex items-center gap-[10px] pt-[12px] pr-[22px] pb-[12px] pl-[14px] h-[44px] bg-[#171717] rounded-[10px] text-[14px] font-semibold text-white w-auto shrink-0" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    <img src="/coins/sms.png" alt="Email" className="w-[20px] h-[20px] shrink-0" />
                    <span className="truncate leading-none">{currentUser?.email}</span>
                  </div>
                  <div className="flex items-center gap-[10px] pt-[12px] pr-[22px] pb-[12px] pl-[14px] h-[44px] bg-[#171717] rounded-[10px] text-[14px] font-semibold text-white w-auto shrink-0" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    <img src="/coins/caledar.png" alt="Joined" className="w-[20px] h-[20px] shrink-0" />
                    <span className="truncate leading-none">Joined {mongoUser?.createdAt ? new Date(mongoUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/r/${mongoUser?.referralCode}`)}
                    className="flex items-center gap-[10px] pt-[12px] pr-[22px] pb-[12px] pl-[14px] h-[44px] bg-[#171717] hover:bg-[#202020] rounded-[10px] text-[14px] font-semibold text-white transition-all text-left w-auto shrink-0"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    <img src="/coins/copg.png" alt="Copy" className="w-[20px] h-[20px] shrink-0" />
                    <span className="truncate leading-none">Copy Referral Link</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right side: Action buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowSettings(true)}
                title="Account Settings"
                className="w-[48px] h-[48px] shrink-0 bg-[#49b265] hover:bg-[#3bb770] text-white rounded-[10px] flex items-center justify-center transition-all shadow-[0px_4px_0px_0px_rgba(39,109,58,1)] active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(39,109,58,1)]"
              >
                <img src="/coins/proset.png" alt="Settings" className="w-[24px] h-[24px]" />
              </button>
              <button
                onClick={() => setShowCustomization(true)}
                className="w-[162px] h-[48px] shrink-0 bg-[#27703a] hover:bg-[#205c2e] text-white rounded-[10px] flex items-center justify-center gap-[10px] font-bold font-['Barlow_Condensed'] text-[20px] transition-all shadow-[0px_4px_0px_0px_rgba(35,80,47,1)] active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(35,80,47,1)]"
              >
                <img src="/coins/procus.png" alt="Customize" className="w-[24px] h-[24px] shrink-0" />
                <span>Customize</span>
              </button>
            </div>
          </div>

          {/* Bottom stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px] w-full">
            {/* Offers card */}
            <div className="bg-[#171717] rounded-[20px] p-[20px] flex flex-col gap-[22px] h-[156px]">
              <div className="flex flex-col gap-[12px] h-[81px]">
                <h3 className="font-['Barlow_Condensed'] text-[22px] font-bold text-white leading-[130%] h-[29px]">Offers</h3>
                <div className="flex items-center gap-[6px] h-[40px]">
                  <span className="font-['Barlow_Condensed'] font-bold text-[50px] leading-[120%] text-[#49b265]">
                    {profileStats.totalTasksCompleted}
                  </span>
                </div>
              </div>
              <p className="font-['Barlow_Condensed'] text-[18px] font-semibold text-white/50 leading-[130%] h-[13px]">Completed</p>
            </div>

            {/* Earned card */}
            <div className="bg-[#171717] rounded-[20px] p-[20px] flex flex-col gap-[22px] h-[156px]">
              <div className="flex flex-col gap-[12px] h-[81px]">
                <h3 className="font-['Barlow_Condensed'] text-[22px] font-bold text-white leading-[130%] h-[29px]">Earned</h3>
                <div className="flex items-center gap-[6px] h-[40px]">
                  <img src="/coins/coinfix.png" alt="Coin" className="w-[40px] h-[40px] object-contain shrink-0" />
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent'
                    }}
                    className="font-bold text-[50px] leading-[120%]"
                  >
                    {Math.max(mongoUser?.totalEarned || 0, profileStats.totalEarnedLifetime || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="font-['Barlow_Condensed'] text-[18px] font-semibold text-white/50 leading-[130%] h-[13px]">Lifetime earned</p>
            </div>

            {/* 30-Day card */}
            <div className="bg-[#171717] rounded-[20px] p-[20px] flex flex-col gap-[22px] h-[156px]">
              <div className="flex flex-col gap-[12px] h-[81px]">
                <h3 className="font-['Barlow_Condensed'] text-[22px] font-bold text-white leading-[130%] h-[29px] whitespace-nowrap">30-Day Earnings</h3>
                <div className="flex items-center gap-[6px] h-[40px]">
                  <img src="/coins/coinfix.png" alt="Coin" className="w-[40px] h-[40px] object-contain shrink-0" />
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent'
                    }}
                    className="font-bold text-[50px] leading-[120%]"
                  >
                    {(profileStats.earnings30Days || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="font-['Barlow_Condensed'] text-[18px] font-semibold text-white/50 leading-[130%] h-[13px]">last 30 days</p>
            </div>
          </div>
        </div>

        {/* ─── Tab pill bar navigation ─────────────────── */}
        <div className="w-[1240px] h-[84px] shrink-0 bg-[#2c2d2c] backdrop-blur-[24px] shadow-[0px_4px_44px_0px_rgba(0,0,0,0.25)] rounded-[10px] p-[18px] flex items-center">
          <div className="flex justify-between items-center w-full">
            <TabBtn active={activeTab === 'started_offers'} onClick={() => setActiveTab('started_offers')} icon="/coins/clock.png" label="Started Offers" />
            <TabBtn active={activeTab === 'completed_offers'} onClick={() => setActiveTab('completed_offers')} icon="/coins/gift.png" label="Completed Offers" />
            <TabBtn active={activeTab === 'held_offers'} onClick={() => setActiveTab('held_offers')} icon="/coins/puse.png" label="Hold Offers" />
            <TabBtn active={activeTab === 'transaction_history'} onClick={() => setActiveTab('transaction_history')} icon="/coins/protim.png" label="Transaction History" />
            <TabBtn active={activeTab === 'chargebacks'} onClick={() => setActiveTab('chargebacks')} icon="/coins/probac.png" label="Chargebacks" />
          </div>
        </div>

        {/* ─── Tab Content ─────────────────────────────────── */}
        <div className="w-full bg-[#242424] rounded-[30px] p-[30px] flex flex-col gap-[10px]">
          <AnimatePresence mode="wait">
            {/* ══ STARTED OFFERS TAB ══ */}
            {activeTab === 'started_offers' && (
              <motion.div
                key="started_offers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="w-full"
              >
                {loadingOffers ? (
                  <div className="flex justify-center py-10"><FiLoader className="animate-spin text-2xl text-[#49b265]" /></div>
                ) : (() => {
                  const startedOffers = customOffers.filter(o => o.submissionStatus === 'started' || o.submissionStatus === 'rejected');
                  if (startedOffers.length === 0) {
                    return (
                      <div className="py-14 flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
                          <FiInbox className="text-slate-600 text-xl" />
                        </div>
                        <p className="text-slate-500 text-sm">No clicked offers yet. Browse the Earn page to start new offers!</p>
                      </div>
                    );
                  }
                  const totalStartedPages = Math.ceil(startedOffers.length / itemsPerPage);
                  const paginatedStarted = startedOffers.slice((startedPage - 1) * itemsPerPage, startedPage * itemsPerPage);
                  return (
                    <div>
                      <div className="overflow-x-auto">
                        <div className="min-w-[1180px]">
                          <div className="w-[1180px] h-[58px] rounded-[20px] pt-[10px] pr-[95px] pb-[30px] pl-[40px] grid grid-cols-[300px_repeat(4,1fr)] gap-[20px] border-b border-[#2a2d36] items-center">
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Offers</div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Started On</div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Reward</div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Status</div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Proof</div>
                          </div>
                          <div className="flex flex-col gap-[10px] mt-[10px]">
                            {paginatedStarted.map(offer => (
                              <ClickedOfferRow
                                key={offer._id}
                                offer={offer}
                                token={token}
                                onRefresh={fetchCustomOffers}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <Pagination
                        page={startedPage}
                        totalPages={totalStartedPages}
                        onNext={() => setStartedPage(p => Math.min(totalStartedPages, p + 1))}
                        onPrev={() => setStartedPage(p => Math.max(1, p - 1))}
                        onPageClick={setStartedPage}
                      />
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* ══ COMPLETED OFFERS TAB ══ */}
            {activeTab === 'completed_offers' && (
              <motion.div
                key="completed_offers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="w-full"
              >
                {loadingCompleted ? (
                  <div className="flex justify-center py-10"><FiLoader className="animate-spin text-2xl text-[#49b265]" /></div>
                ) : completedOffers.length === 0 ? (
                  <div className="py-14 flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
                      <FiInbox className="text-slate-600 text-xl" />
                    </div>
                    <p className="text-slate-500 text-sm">No completed offers yet. Finish a started offer to earn your reward!</p>
                  </div>
                ) : (() => {
                  const totalCompletedPages = Math.ceil(completedOffers.length / itemsPerPage);
                  const paginatedCompleted = completedOffers.slice((completedPage - 1) * itemsPerPage, completedPage * itemsPerPage);
                  return (
                    <div>
                      <div className="overflow-x-auto">
                        <div className="min-w-[1180px]">
                          <div className="w-[1180px] h-[58px] rounded-[20px] pt-[10px] pr-[95px] pb-[30px] pl-[40px] grid grid-cols-[2fr_1fr_1fr] gap-[20px] border-b border-[#2a2d36] items-center">
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Offers</div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Completed On</div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Reward</div>
                          </div>
                          <div className="flex flex-col gap-[10px] mt-[10px]">
                            {paginatedCompleted.map(offer => (
                              <div key={offer._id} className="w-[1180px] h-[82px] bg-[#171717] rounded-[20px] pt-[20px] pr-[95px] pb-[20px] pl-[40px] grid grid-cols-[2fr_1fr_1fr] gap-[20px] items-center hover:bg-[#1a1a1a] transition-colors">
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[28px] leading-[120%] text-white truncate">{offer.title}</span>
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-semibold text-[28px] leading-[120%]">{offer.completedAt ? new Date(offer.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                                <div className="flex items-center gap-[6px] font-semibold text-[#fbbf24] text-[28px] leading-[120%]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                  <img src="/coins/coinfix.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" />
                                  <span>{(offer.rewardAmount || 0).toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Pagination
                        page={completedPage}
                        totalPages={totalCompletedPages}
                        onNext={() => setCompletedPage(p => Math.min(totalCompletedPages, p + 1))}
                        onPrev={() => setCompletedPage(p => Math.max(1, p - 1))}
                        onPageClick={setCompletedPage}
                      />
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* ══ HOLD OFFERS TAB ══ */}
            {activeTab === 'held_offers' && (
              <motion.div
                key="held_offers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="w-full"
              >
                {loadingHolds ? (
                  <div className="flex justify-center py-10"><FiLoader className="animate-spin text-2xl text-[#49b265]" /></div>
                ) : heldOffers.length === 0 ? (
                  <div className="py-14 flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center">
                      <FiInbox className="text-slate-600 text-xl" />
                    </div>
                    <p className="text-slate-500 text-sm">No held earnings at the moment.</p>
                  </div>
                ) : (() => {
                  const totalHeldPages = Math.ceil(heldOffers.length / itemsPerPage);
                  const paginatedHeld = heldOffers.slice((heldPage - 1) * itemsPerPage, heldPage * itemsPerPage);
                  return (
                    <div>
                      <div className="overflow-x-auto">
                        <div className="min-w-[1180px]">
                          <div className="w-[1180px] h-[58px] rounded-[20px] pt-[10px] pr-[95px] pb-[30px] pl-[40px] grid grid-cols-[300px_repeat(4,1fr)] gap-[20px] border-b border-[#2a2d36] items-center">
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Offers</div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Completed On</div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Reward</div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Hold Period</div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40 text-right">Release In</div>
                          </div>
                          <div className="flex flex-col gap-[10px] mt-[10px]">
                            {paginatedHeld.map(offer => {
                                const holdPeriodDays = offer.holdUntil && offer.createdAt
                                  ? Math.round((new Date(offer.holdUntil) - new Date(offer.createdAt)) / (1000 * 60 * 60 * 24))
                                  : 30;
                                const releaseIn = offer.daysRemaining > 0
                                  ? `${offer.daysRemaining}d`
                                  : offer.isReadyToRelease ? 'Ready' : 'N/A';
                                return (
                                  <div key={offer._id} className="w-[1180px] h-[82px] bg-[#171717] rounded-[20px] pt-[20px] pr-[95px] pb-[20px] pl-[40px] grid grid-cols-[300px_repeat(4,1fr)] gap-[20px] items-center hover:bg-[#1a1a1a] transition-colors">
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[28px] leading-[120%] text-white truncate">{offer.description}</span>
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-semibold text-[28px] leading-[120%]">{offer.createdAt ? new Date(offer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                                    <div className="flex items-center gap-[6px] font-semibold text-[#fbbf24] text-[28px] leading-[120%]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                      <img src="/coins/coinfix.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" />
                                      <span>{(offer.amount || 0).toLocaleString()}</span>
                                    </div>
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-semibold text-[28px] leading-[120%]">{holdPeriodDays} days</span>
                                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`text-right font-semibold text-[28px] leading-[120%] ${offer.isReadyToRelease ? 'text-[#49b265]' : 'text-white'}`}>
                                      {releaseIn}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                      <Pagination
                        page={heldPage}
                        totalPages={totalHeldPages}
                        onNext={() => setHeldPage(p => Math.min(totalHeldPages, p + 1))}
                        onPrev={() => setHeldPage(p => Math.max(1, p - 1))}
                        onPageClick={setHeldPage}
                      />
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* ══ TRANSACTION HISTORY TAB ══ */}
            {activeTab === 'transaction_history' && (
              <motion.div
                key="transaction_history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="w-full"
              >
                {txHistory.loading ? (
                  <div className="flex justify-center py-10"><FiLoader className="animate-spin text-2xl text-[#49b265]" /></div>
                ) : txHistory.error ? (
                  <p className="text-rose-400 text-center py-8">{txHistory.error}</p>
                ) : txHistory.dataList.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No transaction history found.</p>
                ) : (
                  <div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[1180px]">
                        <div className="w-[1180px] h-[58px] rounded-[20px] pt-[10px] pr-[95px] pb-[30px] pl-[40px] grid grid-cols-[180px_180px_1fr_180px_150px] gap-[20px] border-b border-[#2a2d36] items-center">
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Date</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Type</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Description</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Amount</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Status</div>
                        </div>
                        <div className="flex flex-col gap-[10px] mt-[10px]">
                          {txHistory.dataList.map(tx => {
                            const config = TX_TYPE_LABEL[tx.transactionType] || { label: tx.transactionType, color: 'text-slate-400' };
                            const isDebit = tx.amount < 0;
                            const isPending = tx.status === 'pending';
                            return (
                              <div key={tx._id} className="w-[1180px] h-[82px] bg-[#171717] rounded-[20px] pt-[20px] pr-[95px] pb-[20px] pl-[40px] grid grid-cols-[180px_180px_1fr_180px_150px] gap-[20px] items-center hover:bg-[#1a1a1a] transition-colors">
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-semibold text-[28px] leading-[120%]">
                                  {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                </span>
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-semibold text-[28px] leading-[120%] truncate">
                                  {config.label}
                                </span>
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-semibold text-[28px] leading-[120%] truncate">
                                  {tx.description}
                                </span>
                                <div className="flex items-center gap-[6px] font-semibold text-[#fbbf24] text-[28px] leading-[120%]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                  <img src="/coins/coinfix.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" />
                                  <span>{isDebit ? '' : '+'}{tx.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-start">
                                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`inline-flex items-center justify-center px-[20px] py-[4px] rounded-[100px] text-[22px] leading-[120%] font-semibold border ${isPending
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : tx.status === 'failed' || tx.status === 'rejected'
                                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                      : 'bg-[#153423] text-[#4ade80] border-[#4ade80]/20'
                                    }`}>
                                    {tx.status === 'completed' ? 'Completed' : tx.status}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <Pagination
                      page={txHistory.page}
                      totalPages={txHistory.totalPages}
                      onNext={txHistory.nextPage}
                      onPrev={txHistory.prevPage}
                      onPageClick={txHistory.goToPage}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* ══ CHARGEBACKS TAB ══ */}
            {activeTab === 'chargebacks' && (
              <motion.div
                key="chargebacks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="w-full"
              >
                {chargebacks.loading ? (
                  <div className="flex justify-center py-10"><FiLoader className="animate-spin text-2xl text-[#49b265]" /></div>
                ) : chargebacks.error ? (
                  <p className="text-rose-400 text-center py-8">{chargebacks.error}</p>
                ) : chargebacks.dataList.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No chargebacks found on your account.</p>
                ) : (
                  <div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[1180px]">
                        <div className="w-[1180px] h-[58px] rounded-[20px] pt-[10px] pr-[95px] pb-[30px] pl-[40px] grid grid-cols-[2fr_1fr_1fr] gap-[20px] border-b border-[#2a2d36] items-center">
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Offers</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Started On</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Reward</div>
                        </div>
                        <div className="flex flex-col gap-[10px] mt-[10px]">
                          {chargebacks.dataList.map(tx => (
                            <div key={tx._id} className="w-[1180px] h-[82px] bg-[#171717] rounded-[20px] pt-[20px] pr-[95px] pb-[20px] pl-[40px] grid grid-cols-[2fr_1fr_1fr] gap-[20px] items-center hover:bg-[#1a1a1a] transition-colors">
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[28px] leading-[120%] text-white truncate">{tx.description}</span>
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-semibold text-[28px] leading-[120%]">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                              <div className="flex items-center gap-[6px] font-semibold text-[#fbbf24] text-[28px] leading-[120%]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                <img src="/coins/coinfix.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" />
                                <span>{Math.abs(tx.amount || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Pagination
                      page={chargebacks.page}
                      totalPages={chargebacks.totalPages}
                      onNext={chargebacks.nextPage}
                      onPrev={chargebacks.prevPage}
                      onPageClick={chargebacks.goToPage}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
