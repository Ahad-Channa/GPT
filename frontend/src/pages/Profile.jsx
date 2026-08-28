import React, { useState, useEffect } from 'react';
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
  FiUsers, FiCopy, FiLock, FiList, FiChevronLeft, FiChevronRight,
  FiSliders, FiCreditCard, FiRotateCcw, FiPauseCircle
} from 'react-icons/fi';
import TransactionHistory from '../components/wallet/TransactionHistory';
import CoinDisplay from '../components/CoinDisplay';
import CoinIcon from '../components/CoinIcon';

// ── Customization / Avatar Shop Modal ─────────────────────────────
const CustomizationModal = ({ isOpen, onClose, mongoUser, token, setMongoUser }) => {
  const [activeTab, setActiveTab] = useState('my_avatars');
  const [previewAvatar, setPreviewAvatar] = useState(null);

  const [saving, setSaving] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);

  const [myPage, setMyPage] = useState(1);
  const [shopPage, setShopPage] = useState(1);
  const ITEMS_PER_PAGE_MY = 5;
  const ITEMS_PER_PAGE_SHOP = 10;

  const [confirmingAvatar, setConfirmingAvatar] = useState(null);
  const [purchaseSuccessAvatar, setPurchaseSuccessAvatar] = useState(null);

  const fetchAvatars = async () => {
    setLoadingAvatars(true);
    try {
      const res = await fetch(`${API}/wallet/avatars`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAvatars(data.avatars);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAvatars(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPreviewAvatar(null);
      setMyPage(1);
      setShopPage(1);
      setActiveTab('my_avatars');
      setConfirmingAvatar(null);
      setPurchaseSuccessAvatar(null);
      fetchAvatars();
    }
  }, [isOpen]);

  useEffect(() => {
    if (avatars.length > 0 && !previewAvatar && isOpen) {
      const equipped = avatars.find(a => a.url === mongoUser?.avatarUrl) || avatars[0];
      setPreviewAvatar(equipped);
    }
  }, [avatars, mongoUser, previewAvatar, isOpen]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMyPage(1);
    setShopPage(1);
    const sourceList = tab === 'my_avatars'
      ? avatars.filter(a => a.isUnlocked)
      : avatars.filter(a => !a.isUnlocked);

    if (sourceList.length > 0) {
      if (tab === 'my_avatars') {
        const equipped = sourceList.find(a => a.url === mongoUser?.avatarUrl);
        setPreviewAvatar(equipped || sourceList[0]);
      } else {
        setPreviewAvatar(sourceList[0]);
      }
    } else {
      setPreviewAvatar(null);
    }
  };

  const handlePurchaseAvatar = async (avatarToBuy) => {
    const avatar = avatarToBuy || previewAvatar;
    if (!avatar) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/wallet/avatars/buy/${avatar._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMongoUser(prev => ({
          ...prev,
          walletBalance: data.walletBalance,
          unlockedAvatars: [...(prev.unlockedAvatars || []), avatar._id]
        }));

        await fetch(`${API}/auth/profile`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: avatar.url })
        });

        await fetchAvatars();
        setPurchaseSuccessAvatar(avatar);
        setConfirmingAvatar(null);
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
    if (!previewAvatar) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: previewAvatar.url })
      });
      const data = await res.json();
      if (res.ok) {
        setMongoUser(data.user);
        toast.success('Avatar equipped successfully!');
      } else {
        toast.error(data.error || 'Failed to equip avatar');
      }
    } catch {
      toast.error('Network error.');
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  const myAvatars = avatars.filter(a => a.isUnlocked);
  const shopAvatars = avatars.filter(a => !a.isUnlocked);

  const totalMyPages = Math.ceil(myAvatars.length / ITEMS_PER_PAGE_MY) || 1;
  const paginatedMyAvatars = myAvatars.slice((myPage - 1) * ITEMS_PER_PAGE_MY, myPage * ITEMS_PER_PAGE_MY);

  const totalShopPages = Math.ceil(shopAvatars.length / ITEMS_PER_PAGE_SHOP) || 1;
  const paginatedShopAvatars = shopAvatars.slice((shopPage - 1) * ITEMS_PER_PAGE_SHOP, shopPage * ITEMS_PER_PAGE_SHOP);

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999999] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-[1200px] h-auto min-h-[586px] my-auto rounded-[20px] p-[30px] bg-[rgba(36,36,36,1)] flex flex-col relative shadow-2xl font-['Barlow_Condensed'] border-2 border-[#1a1a1a]"
      >
        <div className="flex gap-[20px] flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex justify-between items-center w-full h-[77px] gap-[16px] mb-[20px] shrink-0">
              <div className="flex flex-col gap-[6px] w-[568px] h-[77px] justify-center">
                <h2 className="text-[40px] font-bold text-white leading-[1.2] m-0">Avatar Shop</h2>
                <p className="text-[18px] font-medium text-white/50 leading-[1.3] m-0">Customize your identity with premium avatars</p>
              </div>
              <div className="flex items-center gap-[22px]">
                <div className="flex items-center justify-center bg-[rgba(26,27,26,1)] h-[63px] p-[10px] rounded-[10px] backdrop-blur-[74px]">
                  <div className="flex items-center justify-center gap-[6px] min-w-[111px] h-[32px]">
                    <img src="/coins/Coin.png" alt="Coins" className="w-[32px] h-[32px] object-contain shrink-0" />
                    <span className="font-bold text-[30px] leading-[1.2] text-transparent bg-clip-text bg-gradient-to-b from-[#FEDF77] to-[#FCB91E]">
                      {(mongoUser?.walletBalance || 0).toLocaleString('de-DE')}
                    </span>
                  </div>
                </div>
                <button onClick={onClose} className="w-[40px] h-[40px] bg-[#1a1a1a] hover:bg-white/10 rounded-[10px] flex items-center justify-center text-white/50 hover:text-white transition-colors">
                  <FiX size={24} />
                </button>
              </div>
            </div>

            <div className="h-[50px] bg-[#1a1a1a] rounded-[10px] p-[5px] flex shrink-0 mb-[20px]">
              <button
                onClick={() => handleTabChange('my_avatars')}
                className={`flex-1 rounded-[8px] font-bold text-[20px] transition-colors flex items-center justify-center ${activeTab === 'my_avatars' ? 'bg-[#49b265] text-white shadow-[0px_2px_0px_0px_rgba(35,80,47,1)]' : 'text-white/50 hover:text-white'}`}
              >
                My Avatars
              </button>
              <button
                onClick={() => handleTabChange('shop')}
                className={`flex-1 rounded-[8px] font-bold text-[20px] transition-colors flex items-center justify-center ${activeTab === 'shop' ? 'bg-[#49b265] text-white shadow-[0px_2px_0px_0px_rgba(35,80,47,1)]' : 'text-white/50 hover:text-white'}`}
              >
                Shop
              </button>
            </div>

            {loadingAvatars ? (
              <div className="flex-1 flex items-center justify-center">
                <FiLoader className="animate-spin text-4xl text-[#49b265]" />
              </div>
            ) : activeTab === 'my_avatars' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <h3 className="text-[24px] font-bold text-white leading-none mb-1">My Avatars</h3>
                <p className="text-[16px] text-white/50 mb-[15px] leading-none">Avatars your owns and can use</p>

                <div className="grid grid-cols-5 gap-[15px] content-start">
                  {paginatedMyAvatars.length === 0 ? (
                    <div className="col-span-5 text-center text-white/50 py-10">No avatars owned. Visit the shop!</div>
                  ) : (
                    paginatedMyAvatars.map(avatar => (
                      <div
                        key={avatar._id}
                        onClick={() => setPreviewAvatar(avatar)}
                        className={`rounded-[12px] bg-[#1a1a1a] p-[10px] flex flex-col gap-[10px] cursor-pointer border-2 transition-all ${previewAvatar?._id === avatar._id ? 'border-[#49b265]' : 'border-transparent hover:border-white/10'
                          }`}
                      >
                        <div className="w-full aspect-square rounded-[8px] overflow-hidden bg-black/20">
                          <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-white text-center font-semibold text-[16px] leading-none truncate pb-[4px]">{avatar.name}</span>
                      </div>
                    ))
                  )}
                </div>

                <Pagination
                  page={myPage}
                  totalPages={totalMyPages}
                  onNext={() => setMyPage(p => Math.min(totalMyPages, p + 1))}
                  onPrev={() => setMyPage(p => Math.max(1, p - 1))}
                  onPageClick={(p) => setMyPage(p)}
                />
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <h3 className="text-[24px] font-bold text-white leading-none mb-1">Collect & Stand Out</h3>
                <p className="text-[16px] text-white/50 mb-[15px] leading-none">Limited avatars are rare and available in limited quantities.</p>

                <div className="grid grid-cols-5 gap-[15px] content-start">
                  {paginatedShopAvatars.length === 0 ? (
                    <div className="col-span-5 text-center text-white/50 py-10">No premium avatars available right now.</div>
                  ) : (
                    paginatedShopAvatars.map(avatar => (
                      <div
                        key={avatar._id}
                        onClick={() => setPreviewAvatar(avatar)}
                        className={`rounded-[12px] bg-[#1a1a1a] p-[10px] flex flex-col gap-[8px] cursor-pointer border-2 transition-all ${previewAvatar?._id === avatar._id ? 'border-[#49b265]' : 'border-transparent hover:border-white/10'
                          }`}
                      >
                        <div className="w-full aspect-square rounded-[8px] overflow-hidden bg-black/20 relative">
                          <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                          {avatar.quantity === 0 && (
                            <div
                              className="absolute top-[8px] right-[8px] bg-[rgba(26,27,26,0.85)] border border-[#fbbf24] px-[10px] py-[4px] rounded-full text-[#fbbf24] font-bold text-[14px] uppercase leading-none tracking-wider shadow-lg"
                              style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                            >
                              Sold Out
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-[16px] leading-none truncate mb-[6px]">{avatar.name}</div>
                          <div className="text-[12px] text-[#49b265] font-semibold leading-none mb-[6px]">{avatar.quantity ?? 'Unlimited'} Available</div>
                          <div className="flex items-center gap-[4px]">
                            <img src="/coins/Coin.png" alt="Coins" className="w-[14px] h-[14px] object-contain" />
                            <span className="text-[#fbbf24] font-bold text-[14px] leading-none">{avatar.price}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Pagination
                  page={shopPage}
                  totalPages={totalShopPages}
                  onNext={() => setShopPage(p => Math.min(totalShopPages, p + 1))}
                  onPrev={() => setShopPage(p => Math.max(1, p - 1))}
                  onPageClick={(p) => setShopPage(p)}
                />
              </div>
            )}
          </div>

          <div
            className="w-[325px] h-auto shrink-0 rounded-[20px] p-[16px] flex flex-col relative"
            style={{
              background: 'rgba(0, 0, 0, 0.36)',
              backdropFilter: 'blur(44px)',
              WebkitBackdropFilter: 'blur(44px)',
              gap: '26px'
            }}
          >
            <h3
              className="text-[28px] font-bold text-white leading-[1.2]"
              style={{
                width: '293px',
                height: '34px',
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700
              }}
            >
              Preview
            </h3>

            {previewAvatar ? (
              <div
                className="w-[293px] flex-1 flex flex-col min-h-[420px]"
                style={{ gap: '26px' }}
              >
                <div
                  className="w-[160px] h-[160px] rounded-full mx-auto overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.3)] shrink-0 flex items-center justify-center p-[5px]"
                  style={{
                    background: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)'
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-black/20">
                    <img src={previewAvatar.url} alt={previewAvatar.name} className="w-full h-full object-cover" />
                  </div>
                </div>

                <div
                  className="flex flex-col shrink-0 text-left justify-center"
                  style={{
                    width: '293px',
                    height: '49px',
                    gap: '14px'
                  }}
                >
                  <h4
                    className="text-white truncate shrink-0"
                    style={{
                      width: '293px',
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 600,
                      fontSize: '32px',
                      lineHeight: '1.2'
                    }}
                  >
                    {previewAvatar.name}
                  </h4>
                  <p
                    className="truncate shrink-0"
                    style={{
                      width: '293px',
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 600,
                      fontSize: '18px',
                      lineHeight: '1.2',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}
                  >
                    {previewAvatar.description || 'Premium Avatar Collection'}
                  </p>
                </div>

                <div
                  className="flex flex-col text-[16px] shrink-0"
                  style={{
                    width: '293px',
                    minHeight: '102px',
                    gap: '16px',
                    borderRadius: '12px',
                    padding: '16px',
                    background: 'rgba(36, 36, 36, 1)',
                    backdropFilter: 'blur(44px)',
                    WebkitBackdropFilter: 'blur(44px)'
                  }}
                >
                  {activeTab === 'shop' && (
                    <div className="flex justify-between items-center pb-[8px] border-b border-white/5 last:border-0 last:pb-0">
                      <span className="text-white font-semibold">Price</span>
                      <div className="flex items-center gap-[4px]">
                        <img src="/coins/Coin.png" alt="Coins" className="w-[16px] h-[16px] object-contain" />
                        <span className="text-[#fbbf24] font-bold text-[16px] leading-none">{previewAvatar.price}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center pb-[8px] border-b border-white/5 last:border-0 last:pb-0">
                    <span className="text-white font-semibold">Rarity</span>
                    <span className="text-white font-bold">{previewAvatar.rarity || 'Limited Edition'}</span>
                  </div>
                  {activeTab === 'my_avatars' && (
                    <div className="flex justify-between items-center pb-[8px] border-b border-white/5 last:border-0 last:pb-0">
                      <span className="text-white font-semibold">Obtained On</span>
                      <span className="text-white font-bold">
                        {previewAvatar.obtainedAt ? new Date(previewAvatar.obtainedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'May 21, 2026'}
                      </span>
                    </div>
                  )}
                  {activeTab === 'shop' && (
                    <div className="flex justify-between items-center pb-[8px] border-b border-white/5 last:border-0 last:pb-0">
                      <span className="text-white font-semibold">Limited Quantity</span>
                      <span className="text-white font-bold">{previewAvatar.quantity ? `Only ${previewAvatar.quantity} Available` : 'Unlimited'}</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto shrink-0">
                  {activeTab === 'my_avatars' ? (
                    <button
                      onClick={handleEquip}
                      disabled={saving || mongoUser?.avatarUrl === previewAvatar.url}
                      className="w-full h-[48px] bg-[#49b265] disabled:bg-[#49b265]/50 hover:bg-[#3bb770] text-white rounded-[10px] font-bold text-[20px] transition-all flex items-center justify-center gap-[10px] shadow-[0px_4px_0px_0px_rgba(35,80,47,1)] active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(35,80,47,1)] disabled:shadow-none disabled:translate-y-[2px]"
                    >
                      {saving ? 'Equipping...' : mongoUser?.avatarUrl === previewAvatar.url ? 'Equipped' : 'Equip'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmingAvatar(previewAvatar)}
                      disabled={saving || previewAvatar.quantity === 0 || (mongoUser?.walletBalance || 0) < previewAvatar.price}
                      className="w-full h-[48px] bg-[#49b265] disabled:bg-[#49b265]/50 hover:bg-[#3bb770] text-white rounded-[10px] font-bold text-[20px] transition-all flex items-center justify-center gap-[10px] shadow-[0px_4px_0px_0px_rgba(35,80,47,1)] active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(35,80,47,1)] disabled:shadow-none disabled:translate-y-[2px]"
                    >
                      {saving ? 'Processing...' : previewAvatar.quantity === 0 ? 'Sold Out' : (previewAvatar.price === 0 ? 'Claim Free' : 'Buy Now')}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/30 text-[18px] font-semibold">
                Select an avatar
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Confirmation Modal ("Order Summary") */}
      {confirmingAvatar && (
        <div className="fixed inset-0 bg-black/60 z-[9999999] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-[500px] h-[313px] rounded-[20px] p-[16px] bg-[rgba(36,36,36,1)] border border-white/[0.08] shadow-2xl flex flex-col justify-between font-['Barlow_Condensed'] text-white"
          >
            <div className="flex justify-between items-center w-full">
              <h3
                className="text-white m-0 flex items-center"
                style={{
                  width: '416px',
                  height: '34px',
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: '28px',
                  lineHeight: '120%',
                  opacity: 1
                }}
              >
                Order Summary
              </h3>
              <button
                onClick={() => setConfirmingAvatar(null)}
                className="w-[36px] h-[36px] rounded-[10px] bg-white/[0.11] hover:bg-white/[0.18] transition-colors flex items-center justify-center text-white shrink-0"
              >
                <FiX size={20} strokeWidth={2} />
              </button>
            </div>

            <div
              className="flex flex-col justify-between border border-white/[0.08] shrink-0"
              style={{
                width: '468px',
                height: '157px',
                gap: '12px',
                borderRadius: '20px',
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.36)',
                backdropFilter: 'blur(44px)',
                WebkitBackdropFilter: 'blur(44px)',
                opacity: 1
              }}
            >
              <div className="flex gap-[16px] items-center">
                <img
                  src={confirmingAvatar.url}
                  alt={confirmingAvatar.name}
                  className="object-cover shrink-0"
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '10px',
                    opacity: 1
                  }}
                />
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-white font-bold text-[24px] leading-tight truncate">{confirmingAvatar.name}</span>
                  <span className="text-white/50 text-[16px] font-medium leading-[1.3] truncate">{confirmingAvatar.description || 'Premium Avatar Collection'}</span>
                </div>
              </div>
              <div className="h-[1px] bg-white/10 w-full shrink-0" />
              <div className="flex justify-between items-center w-full">
                <span className="text-[#49b265] font-semibold text-[20px] leading-none">Price</span>
                <div className="flex items-center gap-[4px]">
                  <img
                    src="/coins/Coin.png"
                    alt="Coins"
                    className="w-[18px] h-[18px] object-contain shrink-0"
                    style={{ filter: 'drop-shadow(0px 0px 10px rgba(254, 198, 53, 0.6))' }}
                  />
                  <span className="text-[#fbbf24] font-bold text-[22px] leading-none pt-[2px]">{confirmingAvatar.price}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handlePurchaseAvatar(confirmingAvatar)}
              disabled={saving}
              className="w-full h-[48px] bg-[#49b265] disabled:bg-[#49b265]/50 hover:bg-[#3bb770] text-white rounded-[10px] font-bold text-[20px] transition-all flex items-center justify-center gap-[10px] shadow-[0px_4px_0px_0px_rgba(35,80,47,1)] active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(35,80,47,1)] disabled:shadow-none"
            >
              {saving ? 'Processing...' : 'Confirm Purchase →'}
            </button>
          </motion.div>
        </div>
      )}

      {/* Success Modal ("Purchase Successful!") */}
      {purchaseSuccessAvatar && (
        <div className="fixed inset-0 bg-black/60 z-[9999999] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-[500px] h-[317px] rounded-[20px] p-[16px] bg-[rgba(36,36,36,1)] border border-white/[0.08] shadow-2xl flex flex-col justify-between items-center font-['Barlow_Condensed'] text-white text-center"
          >
            <div className="w-full flex justify-end">
              <button
                onClick={() => setPurchaseSuccessAvatar(null)}
                className="w-[36px] h-[36px] rounded-[10px] bg-white/[0.11] hover:bg-white/[0.18] transition-colors flex items-center justify-center text-white shrink-0"
              >
                <FiX size={20} strokeWidth={2} />
              </button>
            </div>

            <div className="flex flex-col items-center flex-1 justify-center my-[10px]">
              <img
                src="/coins/tik1.png"
                alt="Success"
                className="shrink-0 object-contain mb-[14px]"
                style={{
                  width: '74px',
                  height: '74px',
                  opacity: 1
                }}
              />
              <h3 className="text-[28px] font-bold text-white leading-none m-0 uppercase">Purchase Successful!</h3>
              <p className="text-white/50 text-[18px] font-medium leading-[1.3] m-0 mt-[10px] max-w-[400px]">
                {purchaseSuccessAvatar.name} has been added to your collection.
              </p>
            </div>

            <button
              onClick={() => {
                setPurchaseSuccessAvatar(null);
                setActiveTab('my_avatars');
                setPreviewAvatar(purchaseSuccessAvatar);
              }}
              className="w-full h-[48px] bg-[#49b265] hover:bg-[#3bb770] text-white rounded-[10px] font-bold text-[20px] transition-all flex items-center justify-center shadow-[0px_4px_0px_0px_rgba(35,80,47,1)] active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(35,80,47,1)]"
            >
              View My Avatar
            </button>
          </motion.div>
        </div>
      )}
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

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      style={{ gap: '10px' }}
      className="pt-6 pb-2 flex items-center justify-center"
    >
      {/* Previous Button (Left Arrow) */}
      <button
        onClick={onPrev}
        disabled={!canPrev}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '100px',
          backgroundColor: canPrev ? 'rgba(36, 50, 77, 1)' : 'transparent',
          border: canPrev ? 'none' : '1px solid rgba(36, 50, 77, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: !canPrev ? 'not-allowed' : 'pointer',
          opacity: 1,
        }}
        className={`transition-all ${canPrev ? 'text-white' : 'text-[#24324D]'}`}
        title="Previous"
      >
        <FiChevronLeft size={18} />
      </button>

      {/* Next Button (Right Arrow) */}
      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '100px',
          backgroundColor: canNext ? 'rgba(36, 50, 77, 1)' : 'transparent',
          border: canNext ? 'none' : '1px solid rgba(36, 50, 77, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: !canNext ? 'not-allowed' : 'pointer',
          opacity: 1,
        }}
        className={`transition-all ${canNext ? 'text-white' : 'text-[#24324D]'}`}
        title="Next"
      >
        <FiChevronRight size={18} />
      </button>
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
    style={{
      fontFamily: '"Bricolage Grotesque", sans-serif',
      fontWeight: 700,
      fontSize: '14px',
      lineHeight: '100%',
      letterSpacing: '0%',
      borderRadius: '80px',
      height: '37px',
      opacity: 1,
    }}
    className={`flex items-center justify-center gap-2 px-4 py-2 transition-all cursor-pointer whitespace-nowrap ${active
      ? 'bg-[#24324D] text-white shadow-sm'
      : 'text-[#000000] hover:bg-black/5 bg-transparent'
      }`}
  >
    {typeof icon === 'string' ? (
      <img
        src={icon}
        alt=""
        style={{
          filter: active ? 'brightness(0) invert(1)' : 'brightness(0)',
        }}
        className="w-4 h-4 shrink-0 object-contain"
      />
    ) : icon ? (
      React.createElement(icon, {
        className: `w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-black'}`,
      })
    ) : null}
    <span>{label}</span>
  </button>
);

// ── Clicked Offer Row (inline proof upload per offer)
const ClickedOfferRow = ({ offer, index = 0, token: initialToken, onRefresh }) => {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const isRejected = offer.submissionStatus === 'rejected';

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
    <div
      style={{
        width: '100%',
        minHeight: '69px',
        height: 'auto',
        borderRadius: '10px',
        backgroundColor: index % 2 === 0 ? 'rgba(249, 247, 241, 1)' : '#ffffff',
      }}
      className="px-6 py-3 flex flex-col justify-center gap-4"
    >
      {/* Table Row Grid */}
      <div className="grid grid-cols-[1fr_130px_110px_140px_150px] gap-4 items-center">
        {/* Offers Title */}
        <span
          style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '26px' }}
          className="text-[#1e293b] leading-tight break-words"
          title={offer.title}
        >
          {offer.title}
        </span>

        {/* Started On */}
        <span
          style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '26px', whiteSpace: 'nowrap' }}
          className="text-[#1e293b] whitespace-nowrap"
        >
          {offer.createdAt ? new Date(offer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
        </span>

        {/* Reward */}
        <div
          style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '16px', color: 'rgba(190, 146, 0, 1)', whiteSpace: 'nowrap' }}
          className="flex items-center gap-1.5 whitespace-nowrap"
        >
          <img src="/coins/profilecoin1.png" alt="Coin" className="w-[18px] h-[18px] shrink-0 object-contain" />
          <span>{(offer.rewardAmount || 0).toLocaleString('de-DE')}</span>
        </div>

        {/* Status */}
        <div>
          <span
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 500,
              fontSize: '16px',
              lineHeight: '26px',
              borderRadius: '40px',
              padding: '3px 18px',
              whiteSpace: 'nowrap',
            }}
            className={`inline-flex items-center justify-center whitespace-nowrap ${isRejected
              ? 'bg-rose-500/10 text-rose-600 border border-rose-200'
              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-200'
            }`}
          >
            {isRejected ? 'Rejected' : 'In Progress'}
          </span>
        </div>

        {/* Proof Action */}
        <div className="flex justify-start">
          <button
            onClick={() => { setOpen(o => !o); setResult(null); }}
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 500,
              fontSize: '16px',
              lineHeight: '26px',
              borderRadius: '40px',
              padding: '3px 18px',
              whiteSpace: 'nowrap',
            }}
            className="bg-[#1e293b] hover:bg-[#0f172a] text-white transition-all shadow-sm cursor-pointer inline-flex items-center justify-center whitespace-nowrap"
          >
            {isRejected ? 'Resubmit' : 'Submit Proof'}
          </button>
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`p-3 rounded-xl border text-sm font-semibold ${result.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
          {result.type === 'success' && <FiCheckCircle className="inline mr-2 text-base" />}
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
            className="overflow-hidden mt-1"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <textarea
                value={proof}
                onChange={e => setProof(e.target.value)}
                placeholder="Describe your completion (transaction ID, username, steps taken…)"
                rows={3}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 resize-none"
              />

              {/* Image upload */}
              <label className="cursor-pointer flex items-center gap-2 py-2.5 px-4 border border-dashed border-slate-300 rounded-xl bg-[#f8fafc] hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-600">
                <FiSend className="text-emerald-500 text-base" />
                <span>
                  {proofImage ? '✓ Screenshot selected — click to change' : 'Attach screenshot (optional)'}
                </span>
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </label>

              {proofImage && (
                <div className="rounded-xl overflow-hidden border border-slate-200 max-w-sm mx-auto bg-slate-50 p-2">
                  <img src={proofImage} alt="Proof preview" className="max-h-32 object-contain mx-auto" />
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting || (!proof.trim() && !proofImage)}
                  className="flex items-center justify-center gap-1.5 h-9 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
                >
                  {submitting ? <FiLoader className="animate-spin text-sm" /> : <FiSend className="text-sm" />}
                  <span>{submitting ? 'Submitting…' : 'Send Proof'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-9 px-4 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-bold text-xs"
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
  const { setup2FA, confirm2FA, disable2FA } = useAuth();

  const [displayName, setDisplayName] = useState(mongoUser?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletePhase, setDeletePhase] = useState(0);
  const [isPrivate, setIsPrivate] = useState(mongoUser?.isPrivate || false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(mongoUser?.twoFactorEnabled || false);

  // 2FA modal flows
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  const handleOtpDigitChange = (index, val) => {
    const clean = val.replace(/\D/g, '');
    const updated = [...otpDigits];
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split('');
      pasted.forEach((d, i) => {
        if (i < 6) updated[i] = d;
      });
      setOtpDigits(updated);
      setOtpCode(updated.join(''));
      const nextFocus = Math.min(pasted.length, 5);
      document.getElementById(`otp-digit-${nextFocus}`)?.focus();
      return;
    }
    updated[index] = clean ? clean[clean.length - 1] : '';
    setOtpDigits(updated);
    setOtpCode(updated.join(''));
    if (clean && index < 5) {
      document.getElementById(`otp-digit-${index + 1}`)?.focus();
    }
  };

  const handleOtpDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        document.getElementById(`otp-digit-${index - 1}`)?.focus();
      }
    }
  };

  const [disableDigits, setDisableDigits] = useState(['', '', '', '', '', '']);

  const handleDisableDigitChange = (index, val) => {
    const clean = val.replace(/\D/g, '');
    const updated = [...disableDigits];
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split('');
      pasted.forEach((d, i) => {
        if (i < 6) updated[i] = d;
      });
      setDisableDigits(updated);
      setDisableCode(updated.join(''));
      const nextFocus = Math.min(pasted.length, 5);
      document.getElementById(`disable-digit-${nextFocus}`)?.focus();
      return;
    }
    updated[index] = clean ? clean[clean.length - 1] : '';
    setDisableDigits(updated);
    setDisableCode(updated.join(''));
    if (clean && index < 5) {
      document.getElementById(`disable-digit-${index + 1}`)?.focus();
    }
  };

  const handleDisableDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!disableDigits[index] && index > 0) {
        document.getElementById(`disable-digit-${index - 1}`)?.focus();
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDisplayName(mongoUser?.displayName || '');
      setIsPrivate(mongoUser?.isPrivate || false);
      setIs2FAEnabled(mongoUser?.twoFactorEnabled || false);
      setDeletePhase(0);
      setError('');
      setSuccess('');
    }
  }, [isOpen, mongoUser]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const nameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!nameRegex.test(displayName)) {
      setError('Username must be 3-20 characters long and can only contain letters, numbers, dashes, and underscores.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, isPrivate })
      });
      const data = await res.json();
      if (res.ok) {
        setMongoUser(data.user);
        setSuccess('Profile updated successfully!');
        toast.success('Profile updated successfully!');
      } else {
        setError(data.error || 'Failed to update profile');
        toast.error(data.error || 'Failed to update profile');
      }
    } catch {
      setError('Network error.');
      toast.error('Network error.');
    }
    setSaving(false);
  };

  const handle2FAToggle = async () => {
    setError('');
    if (!is2FAEnabled) {
      // Setup flow
      setQrCodeUrl('');
      setSecretKey('');
      setOtpDigits(['', '', '', '', '', '']);
      setOtpCode('');
      setShow2FASetup(true);
      const data = await setup2FA();
      if (data.success) {
        setSecretKey(data.secret);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.otpauthUrl)}`;
        setQrCodeUrl(qrUrl);
      } else {
        setError(data.error || 'Failed to initiate 2FA setup.');
        setShow2FASetup(false);
      }
    } else {
      // Disable flow
      setDisableDigits(['', '', '', '', '', '']);
      setDisableCode('');
      setShow2FADisable(true);
    }
  };

  const handleConfirm2FA = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;
    setVerifying2FA(true);
    setError('');
    const res = await confirm2FA(otpCode);
    setVerifying2FA(false);
    if (res.success) {
      setIs2FAEnabled(true);
      setShow2FASetup(false);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpCode('');
      toast.success('2FA enabled successfully!');
    } else {
      setError(res.error || 'Invalid code.');
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (disableCode.length !== 6) return;
    setVerifying2FA(true);
    setError('');
    const res = await disable2FA(disableCode);
    setVerifying2FA(false);
    if (res.success) {
      setIs2FAEnabled(false);
      setShow2FADisable(false);
      setDisableDigits(['', '', '', '', '', '']);
      setDisableCode('');
      toast.success('2FA disabled successfully.');
    } else {
      setError(res.error || 'Invalid code.');
    }
  };

  const handleDelete = async () => {
    if (deletePhase === 0) {
      setDeletePhase(1);
      return;
    }
    if (deletePhase === 1) {
      setDeletePhase(2);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/account`, {
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
    <>
      {/* 2FA Setup Inner Modal (width: 626px, height: 593px) */}
      {show2FASetup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <div
            style={{
              width: '626px',
              maxWidth: '100%',
              background: '#FFFFFF',
              borderRadius: '28px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxSizing: 'border-box',
              fontFamily: '"Poppins", sans-serif'
            }}
            className="relative shadow-2xl overflow-y-auto max-h-[95vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
          >
            {/* Top Header Card */}
            <div
              style={{
                width: '606px',
                maxWidth: '100%',
                background: 'rgba(248, 245, 239, 1)',
                borderRadius: '16px',
                padding: '24px 28px',
                position: 'relative',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
              className="shrink-0"
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  opacity: 1,
                  transform: 'rotate(0deg)'
                }}
              >
                <h2
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '32px',
                    lineHeight: '1.2',
                    letterSpacing: '-0.02em',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0
                  }}
                >
                  Setup 2-factor auth
                </h2>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '15px',
                    lineHeight: '24px',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0
                  }}
                >
                  Scan this QR code with Google Authenticator or Microsoft Authenticator, then enter the 6-digit code.
                </p>
              </div>

              {/* Accent bar */}
              <div
                style={{
                  width: '74px',
                  height: '4px',
                  borderRadius: '20px',
                  background: 'rgba(85, 88, 211, 1)'
                }}
              />
            </div>

            {/* QR Code and Secret Key */}
            <div className="flex flex-col items-center gap-3 w-full shrink-0">
              {qrCodeUrl ? (
                <div
                  style={{
                    background: 'rgba(248, 245, 239, 1)',
                    borderRadius: '24px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  className="shadow-sm select-none"
                >
                  <img src={qrCodeUrl} alt="2FA QR Code" className="w-[170px] h-[170px] rounded-xl" />
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(248, 245, 239, 1)',
                    borderRadius: '24px',
                    width: '202px',
                    height: '202px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FiLoader className="animate-spin text-[#5356FB] text-3xl" />
                </div>
              )}

              {/* Secret Key Badge */}
              <div
                style={{
                  background: 'rgba(248, 245, 239, 1)',
                  borderRadius: '10px',
                  padding: '6px 18px',
                  fontFamily: '"Poppins", monospace, sans-serif',
                  fontWeight: 600,
                  fontSize: '15px',
                  letterSpacing: '0.08em',
                  color: 'rgba(14, 15, 12, 1)'
                }}
                className="select-all text-center"
              >
                {secretKey || 'Loading secret key...'}
              </div>
            </div>

            {/* 6 Digit Inputs Form */}
            <form onSubmit={handleConfirm2FA} className="w-full flex flex-col items-center gap-3 shrink-0">
              {/* 6 individual OTP input boxes */}
              <div className="flex justify-center gap-2.5 sm:gap-3 my-1">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-digit-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpDigitKeyDown(idx, e)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'rgba(239, 239, 239, 1)',
                      border: 'none',
                      outline: 'none',
                      textAlign: 'center',
                      fontSize: '22px',
                      fontWeight: 700,
                      color: 'rgba(14, 15, 12, 1)',
                      fontFamily: '"Poppins", sans-serif'
                    }}
                    className="focus:ring-2 focus:ring-[#5356FB]/30 focus:bg-white transition-all"
                  />
                ))}
              </div>

              {error && <p className="text-rose-500 text-sm font-['Poppins',sans-serif] font-medium">{error}</p>}

              {/* Action Buttons Row */}
              <div className="flex gap-3 w-full px-2 mt-1">
                <button
                  type="button"
                  onClick={() => { setShow2FASetup(false); setOtpDigits(['', '', '', '', '', '']); setOtpCode(''); setError(''); }}
                  style={{
                    flex: 1,
                    height: '52px',
                    borderRadius: '9999px',
                    border: '1.5px solid #202C44',
                    background: 'transparent',
                    color: '#202C44',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '28px',
                    letterSpacing: '0%',
                    cursor: 'pointer'
                  }}
                  className="hover:bg-slate-50 transition-all flex items-center justify-center"
                >
                  <span>Cancle</span>
                </button>
                <button
                  type="submit"
                  disabled={verifying2FA || otpCode.length !== 6}
                  style={{
                    flex: 1,
                    height: '52px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: '#202C44',
                    color: '#FFFFFF',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '28px',
                    letterSpacing: '0%',
                    cursor: 'pointer'
                  }}
                  className="hover:bg-[#182338] disabled:opacity-50 transition-all flex items-center justify-center shadow-sm"
                >
                  <span>{verifying2FA ? 'Enabling...' : 'Verify & Enable'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Disable Inner Modal (width: 626px, height: 388px) */}
      {show2FADisable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <div
            style={{
              width: '626px',
              maxWidth: '100%',
              minHeight: '388px',
              background: '#FFFFFF',
              borderRadius: '28px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              boxSizing: 'border-box',
              fontFamily: '"Poppins", sans-serif',
              opacity: 1,
              transform: 'rotate(0deg)'
            }}
            className="relative shadow-2xl overflow-y-auto max-h-[95vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
          >
            {/* Top Header Card (width: 606px) */}
            <div
              style={{
                width: '606px',
                maxWidth: '100%',
                background: 'rgba(248, 245, 239, 1)',
                borderRadius: '16px',
                padding: '24px 28px',
                position: 'relative',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
              className="shrink-0"
            >
              {/* Close Button (Circle with X) */}
              <button
                onClick={() => { setShow2FADisable(false); setDisableDigits(['', '', '', '', '', '']); setDisableCode(''); setError(''); }}
                style={{
                  width: '32px',
                  height: '32px',
                  background: '#000000',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  padding: 0
                }}
                className="text-white hover:opacity-80 transition-opacity shrink-0"
              >
                <FiX size={16} strokeWidth={2.5} />
              </button>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingRight: '36px',
                  opacity: 1,
                  transform: 'rotate(0deg)'
                }}
              >
                <h2
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '32px',
                    lineHeight: '1.2',
                    letterSpacing: '-0.02em',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0
                  }}
                >
                  Disable 2-factor auth
                </h2>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '15px',
                    lineHeight: '24px',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0
                  }}
                >
                  For security, enter the 6-digit code from your authenticator app to disable 2FA.
                </p>
              </div>

              {/* Accent bar */}
              <div
                style={{
                  width: '74px',
                  height: '4px',
                  borderRadius: '20px',
                  background: 'rgba(85, 88, 211, 1)'
                }}
              />
            </div>

            {/* 6 Digit Inputs Form */}
            <form onSubmit={handleDisable2FA} className="w-full flex flex-col items-center gap-4 shrink-0 pb-2">
              {/* 6 individual OTP input boxes */}
              <div className="flex justify-center gap-2.5 sm:gap-3 my-2">
                {disableDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`disable-digit-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleDisableDigitChange(idx, e.target.value)}
                    onKeyDown={e => handleDisableDigitKeyDown(idx, e)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'rgba(239, 239, 239, 1)',
                      border: 'none',
                      outline: 'none',
                      textAlign: 'center',
                      fontSize: '22px',
                      fontWeight: 700,
                      color: 'rgba(14, 15, 12, 1)',
                      fontFamily: '"Poppins", sans-serif'
                    }}
                    className="focus:ring-2 focus:ring-[#5356FB]/30 focus:bg-white transition-all"
                  />
                ))}
              </div>

              {error && <p className="text-rose-500 text-sm font-['Poppins',sans-serif] font-medium">{error}</p>}

              {/* Action Buttons Row */}
              <div className="flex gap-3 w-full px-2 mt-2">
                <button
                  type="button"
                  onClick={() => { setShow2FADisable(false); setDisableDigits(['', '', '', '', '', '']); setDisableCode(''); setError(''); }}
                  style={{
                    flex: 1,
                    height: '52px',
                    borderRadius: '9999px',
                    border: '1.5px solid #202C44',
                    background: 'transparent',
                    color: '#202C44',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '28px',
                    letterSpacing: '0%',
                    cursor: 'pointer'
                  }}
                  className="hover:bg-slate-50 transition-all flex items-center justify-center"
                >
                  <span>Cancle</span>
                </button>
                <button
                  type="submit"
                  disabled={verifying2FA || disableCode.length !== 6}
                  style={{
                    flex: 1,
                    height: '52px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: '#202C44',
                    color: '#FFFFFF',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '28px',
                    letterSpacing: '0%',
                    cursor: 'pointer'
                  }}
                  className="hover:bg-[#182338] disabled:opacity-50 transition-all flex items-center justify-center shadow-sm"
                >
                  <span>{verifying2FA ? 'Disabling...' : 'Verify & Disable'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {deletePhase === 1 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
          <div
            style={{
              width: '460px',
              maxWidth: '95vw',
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxSizing: 'border-box',
              position: 'relative'
            }}
            className="shadow-2xl"
          >
            {/* Top Close Button */}
            <button
              onClick={() => setDeletePhase(0)}
              style={{
                width: '32px',
                height: '32px',
                background: '#F1F3F5',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                position: 'absolute',
                top: '18px',
                right: '18px',
                padding: 0
              }}
              className="text-slate-600 hover:text-black transition-colors"
            >
              <FiX size={16} />
            </button>

            {/* Warning Icon */}
            <div className="w-14 h-14 rounded-full bg-red-100 text-[#E50020] flex items-center justify-center mb-4 mt-2">
              <FiAlertTriangle size={28} />
            </div>

            {/* Title & Description */}
            <h3
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 700,
                fontSize: '22px',
                color: '#000000',
                margin: '0 0 8px 0'
              }}
            >
              Delete Account?
            </h3>
            <p
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '1.4',
                color: '#555555',
                margin: '0 0 24px 0'
              }}
            >
              Deleting your account is permanent. All associated data, earnings, and progress will be wiped immediately.
            </p>

            {/* Action Buttons Row */}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setDeletePhase(0)}
                style={{
                  height: '46px',
                  flex: 1,
                  background: '#ECEEF2',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: '"Poppins", sans-serif',
                  fontSize: '16px',
                  lineHeight: '28px',
                  letterSpacing: '0%',
                  fontWeight: 500,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                className="hover:bg-slate-200 transition-colors"
              >
                <span>Cancel</span>
              </button>
              <button
                onClick={() => handleDelete()}
                style={{
                  height: '46px',
                  flex: 1,
                  background: '#E50020',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: '"Poppins", sans-serif',
                  fontSize: '16px',
                  lineHeight: '28px',
                  letterSpacing: '0%',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                className="hover:bg-[#CC001C] transition-colors shadow-sm"
              >
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Modal */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            width: '626px',
            maxWidth: '100%',
            background: '#FFFFFF',
            borderRadius: '28px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxSizing: 'border-box',
            fontFamily: '"Poppins", sans-serif'
          }}
          className="relative shadow-2xl overflow-y-auto max-h-[95vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
        >
          {/* Top Header Card (width: 606px, height: 143px, border-radius: 16px, background: rgba(248, 245, 239, 1)) */}
          <div
            style={{
              width: '606px',
              maxWidth: '100%',
              height: '143px',
              background: 'rgba(248, 245, 239, 1)',
              borderRadius: '16px',
              padding: '24px 28px',
              position: 'relative',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              opacity: 1,
              transform: 'rotate(0deg)'
            }}
            className="shrink-0"
          >
            {/* Close Button (Circle with X) */}
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                background: '#000000',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                position: 'absolute',
                top: '20px',
                right: '20px',
                padding: 0
              }}
              className="text-white hover:opacity-80 transition-opacity shrink-0"
            >
              <FiX size={16} strokeWidth={2.5} />
            </button>

            {/* Whole unit containing heading, below text, and bar (width: 422px, height: 76px, gap: 16px) */}
            <div
              style={{
                width: '422px',
                maxWidth: '100%',
                height: '76px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
            >
              {/* Heading and text as one whole (width: 422px, height: 56px, gap: 20px) */}
              <div
                style={{
                  width: '422px',
                  maxWidth: '100%',
                  height: '56px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  opacity: 1,
                  transform: 'rotate(0deg)'
                }}
              >
                <h2
                  style={{
                    width: '284px',
                    maxWidth: '100%',
                    height: '23px',
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '35px',
                    lineHeight: '60px',
                    letterSpacing: '-0.02em',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 1,
                    transform: 'rotate(0deg)'
                  }}
                >
                  Account Settings
                </h2>
                <p
                  style={{
                    width: '422px',
                    maxWidth: '100%',
                    height: '11px',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '26px',
                    letterSpacing: '0%',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 1,
                    transform: 'rotate(0deg)'
                  }}
                >
                  Manage your identity, avatars, and account security
                </p>
              </div>

              {/* Below bar (width: 74px, height: 4px, border-radius: 20px, background: rgba(85, 88, 211, 1)) */}
              <div
                style={{
                  width: '74px',
                  height: '4px',
                  borderRadius: '20px',
                  background: 'rgba(85, 88, 211, 1)',
                  opacity: 1,
                  transform: 'rotate(0deg)'
                }}
              />
            </div>
          </div>

          {/* Display Name Input */}
          <div
            style={{
              width: '607px',
              maxWidth: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxSizing: 'border-box'
            }}
            className="shrink-0"
          >
            <label
              style={{
                width: '112px',
                maxWidth: '100%',
                height: '11px',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '26px',
                letterSpacing: '0%',
                color: 'rgba(14, 15, 12, 1)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
            >
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              style={{
                width: '607px',
                maxWidth: '100%',
                height: '58px',
                background: 'rgba(239, 239, 239, 1)',
                borderRadius: '50px',
                paddingLeft: '24px',
                paddingRight: '24px',
                color: '#1E293B',
                border: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: '"Poppins", sans-serif',
                fontSize: '16px',
                fontWeight: 500,
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
              className="focus:ring-2 focus:ring-[#5356FB]/20 transition-all placeholder:text-[#94A3B8]"
              placeholder="FuturisticBug1"
            />
          </div>

          {/* Two Toggle Cards (width: 606px, height: 198px, gap: 10px) */}
          <div
            style={{
              width: '606px',
              maxWidth: '100%',
              height: '198px',
              display: 'flex',
              gap: '10px',
              opacity: 1,
              transform: 'rotate(0deg)'
            }}
            className="shrink-0"
          >
            {/* Private Profile Card */}
            <div
              style={{
                flex: 1,
                maxWidth: '100%',
                height: '198px',
                background: 'rgba(248, 245, 239, 1)',
                borderRadius: '30px',
                paddingTop: '26px',
                paddingRight: '16px',
                paddingBottom: '26px',
                paddingLeft: '17px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <h3
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    lineHeight: '24px',
                    letterSpacing: '-0.02em',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0,
                    opacity: 1,
                    transform: 'rotate(0deg)'
                  }}
                >
                  Private Profile
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  style={{
                    width: '48px',
                    height: '28px',
                    borderRadius: '9999px',
                    backgroundColor: isPrivate ? '#00A843' : '#D1D5DB',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 3px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}
                >
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      transform: isPrivate ? 'translateX(20px)' : 'translateX(0px)',
                      transition: 'transform 0.2s'
                    }}
                    className="inline-block shadow-sm"
                  />
                </button>
              </div>
              <p
                style={{
                  width: '100%',
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '14.5px',
                  lineHeight: '22px',
                  letterSpacing: '0%',
                  color: 'rgba(14, 15, 12, 1)',
                  margin: 0,
                  opacity: 1,
                  transform: 'rotate(0deg)'
                }}
              >
                Hide specific offer details (like survey names) from other users on your public profile and the live earning feed.
              </p>
            </div>

            {/* 2FA Card */}
            <div
              style={{
                flex: 1,
                maxWidth: '100%',
                height: '198px',
                background: 'rgba(248, 245, 239, 1)',
                borderRadius: '30px',
                paddingTop: '26px',
                paddingRight: '16px',
                paddingBottom: '26px',
                paddingLeft: '17px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxSizing: 'border-box',
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <h3
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    lineHeight: '23px',
                    letterSpacing: '-0.02em',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0,
                    opacity: 1,
                    transform: 'rotate(0deg)'
                  }}
                >
                  2 Factor<br />Authorization
                </h3>
                <button
                  type="button"
                  onClick={handle2FAToggle}
                  style={{
                    width: '48px',
                    height: '28px',
                    borderRadius: '9999px',
                    backgroundColor: is2FAEnabled ? '#00A843' : '#D1D5DB',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 3px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}
                >
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      transform: is2FAEnabled ? 'translateX(20px)' : 'translateX(0px)',
                      transition: 'transform 0.2s'
                    }}
                    className="inline-block shadow-sm"
                  />
                </button>
              </div>
              <p
                style={{
                  width: '100%',
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '14.5px',
                  lineHeight: '22px',
                  letterSpacing: '0%',
                  color: 'rgba(14, 15, 12, 1)',
                  margin: 0,
                  opacity: 1,
                  transform: 'rotate(0deg)'
                }}
              >
                Make your account more secure by activating 2FA.
              </p>
            </div>
          </div>

          {/* Local Success / Error Messages */}
          {error && !show2FASetup && !show2FADisable && (
            <div className="p-3 rounded-2xl text-sm font-medium bg-rose-50 text-rose-600 border border-rose-200 text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-2xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 text-center">
              {success}
            </div>
          )}

          {/* Save Profile Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '606px',
              maxWidth: '100%',
              height: '52px',
              background: '#202C44',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              border: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 500,
              fontSize: '16px',
              lineHeight: '28px',
              letterSpacing: '0%',
              color: '#FFFFFF'
            }}
            className="hover:bg-[#182338] disabled:opacity-50 transition-all shrink-0 active:scale-[0.99] shadow-sm cursor-pointer"
          >
            {saving ? <FiLoader className="animate-spin text-lg" /> : null}
            <span>Save Profile</span>
          </button>

          {/* Danger Zone Card (width: 606px, height: 118px, border-radius: 20px, background: rgba(255, 234, 235, 1)) */}
          <div
            style={{
              width: '606px',
              maxWidth: '100%',
              height: '118px',
              background: 'rgba(255, 234, 235, 1)',
              borderRadius: '20px',
              paddingTop: '26px',
              paddingRight: '14px',
              paddingBottom: '25px',
              paddingLeft: '19px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              boxSizing: 'border-box',
              opacity: 1,
              transform: 'rotate(0deg)'
            }}
            className="shrink-0"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <h3
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 700,
                  fontSize: '18px',
                  color: '#000000',
                  margin: 0
                }}
              >
                Danger Zone
              </h3>
              <p
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 400,
                  fontSize: '13.5px',
                  lineHeight: '1.4',
                  color: '#333333',
                  margin: 0
                }}
              >
                Deleting your account is permanent. All associated data will be wiped.
              </p>
            </div>

            <button
              onClick={() => setDeletePhase(1)}
              style={{
                height: '46px',
                background: '#E50020',
                borderRadius: '9999px',
                padding: '0 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '28px',
                letterSpacing: '0%',
                color: '#FFFFFF',
                whiteSpace: 'nowrap'
              }}
              className="hover:bg-[#CC001C] transition-all shrink-0 active:scale-[0.98] shadow-sm cursor-pointer"
            >
              Delete Account
            </button>
          </div>
        </motion.div>
      </div>
    </>,
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

  // Completed offers = approved custom offers + all offer_reward transactions
  const [completedOffers, setCompletedOffers] = useState([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const fetchOffersData = async () => {
    if (!currentUser && !token) return;
    setLoadingOffers(true);
    setLoadingCompleted(true);
    try {
      const freshToken = currentUser ? await currentUser.getIdToken() : token;

      const [customRes, walletRes] = await Promise.all([
        fetch(`${API}/custom-offers`, { headers: { Authorization: `Bearer ${freshToken}` } }),
        fetch(`${API}/wallet/history?type=offer_reward%2Ccustom_offer_reward&limit=50`, { headers: { Authorization: `Bearer ${freshToken}` } }),
      ]);
      const [customData, walletData] = await Promise.all([customRes.json(), walletRes.json()]);

      if (customData.success) {
        setCustomOffers(customData.offers);

        const approvedCustom = customData.offers
          .filter(o => o.submissionStatus === 'approved')
          .map(o => ({
            _id: o._id,
            title: o.title,
            rewardAmount: o.rewardAmount,
            completedAt: o.updatedAt,
            source: 'custom',
          }));

        const walletOffers = (walletData.success ? walletData.transactions : [])
          .filter(tx => tx.status === 'completed' && tx.amount > 0)
          .map(tx => ({
            _id: tx._id,
            title: tx.description || 'Offer Reward',
            rewardAmount: tx.amount,
            completedAt: tx.createdAt,
            source: 'offerwall',
          }));

        const seen = new Set();
        const merged = [...approvedCustom, ...walletOffers]
          .filter(o => { if (seen.has(String(o._id))) return false; seen.add(String(o._id)); return true; })
          .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

        setCompletedOffers(merged);
      }
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setLoadingOffers(false);
      setLoadingCompleted(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOffersData();
    }
  }, [token]);

  // History hooks (only fetches when token is ready)
  const txHistory = useHistory(token, null);
  const chargebacks = useHistory(token, 'chargeback');

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
    if (token) fetchHeldOffers();
  }, [token]);

  const startedOffers = customOffers.filter(o => o.submissionStatus === 'started' || o.submissionStatus === 'rejected');
  const totalStartedPages = Math.ceil(startedOffers.length / itemsPerPage);
  const totalCompletedPages = Math.ceil(completedOffers.length / itemsPerPage);
  const totalHeldPages = Math.ceil(heldOffers.length / itemsPerPage);

  return (
    <DashboardLayout showLiveBar={true} fullWidth={true}>
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

      {/* ─── Top Banner Strip (width: 100%, height: 108px, background: rgba(249, 247, 241, 1)) ─── */}
      <div
        className="w-full transition-colors duration-300 shrink-0"
        style={{
          width: '100%',
          height: '108px',
          background: 'rgba(249, 247, 241, 1)',
          opacity: 1,
          transform: 'rotate(0deg)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[1328px] mx-auto px-4 md:px-8 lg:px-0 flex flex-col gap-6 -mt-[82px] pb-12"
      >
        {/* ─── PROFILE HERO ─────────────────────────────── */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end gap-6 w-full">
          {/* Circular Avatar (shifted 40px right) */}
          <div className="relative shrink-0 ml-[40px]">
            <div
              style={{
                width: '164px',
                height: '164px',
                backgroundColor: '#ffffff',
                border: '2.5px solid rgba(36, 50, 77, 1)',
                borderRadius: '50%',
                padding: '4.5px',
                boxSizing: 'border-box',
              }}
              className="shadow-sm flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                <img
                  src={mongoUser?.avatarUrl || currentUser?.photoURL || `/avatars/avatar1.png`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Details & Actions Row (justify-content: space-between) */}
          <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full pb-1">
            {/* Identity details (width: 337px, height: 49px, gap: 16px) */}
            <div
              style={{
                width: '337px',
                height: '49px',
                gap: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
            >
              <h1
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: '27px',
                  lineHeight: '18px',
                  letterSpacing: '-0.02em',
                  color: '#000000',
                  margin: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {mongoUser?.displayName || 'FuturisticBug1'}
              </h1>

              {/* Info tags row */}
              <div className="flex items-center gap-4 sm:gap-6 whitespace-nowrap">
                <div
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '13px',
                    lineHeight: '9px',
                    letterSpacing: '0%',
                    color: '#000000',
                  }}
                  className="flex items-center gap-1.5"
                >
                  <img
                    src="/coins/profileemail.png"
                    alt="Email"
                    className="w-[14px] h-[14px] object-contain shrink-0"
                  />
                  <span>{currentUser?.email || mongoUser?.email || 'futuristicbug1@gmail.com'}</span>
                </div>
                <div
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '13px',
                    lineHeight: '9px',
                    letterSpacing: '0%',
                    color: '#000000',
                  }}
                  className="flex items-center gap-1.5"
                >
                  <img
                    src="/coins/profiledate.png"
                    alt="Joined"
                    className="w-[14px] h-[14px] object-contain shrink-0"
                  />
                  <span>
                    Joined {mongoUser?.createdAt ? new Date(mongoUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Aug 2026'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right side: Action buttons */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Settings and Customization group (width: 98px, height: 45px, gap: 8px) */}
              <div
                style={{
                  width: '98px',
                  height: '45px',
                  gap: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
              >
                <button
                  onClick={() => setShowSettings(true)}
                  title="Account Settings"
                  style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '80px',
                    background: 'rgba(249, 247, 241, 1)',
                    border: 'none',
                    opacity: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  className="hover:opacity-80 transition-opacity"
                >
                  <img src="/coins/profilesetting.png" alt="Settings" className="w-[18px] h-[18px] object-contain" />
                </button>
                <button
                  onClick={() => setShowCustomization(true)}
                  title="Customize Avatars"
                  style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '80px',
                    background: 'rgba(249, 247, 241, 1)',
                    border: 'none',
                    opacity: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  className="hover:opacity-80 transition-opacity"
                >
                  <img src="/coins/profilecustumize.png" alt="Customize" className="w-[18px] h-[18px] object-contain" />
                </button>
              </div>

              {/* Copy Referral Link Button (width: 198px, height: 49px, border-radius: 80px) */}
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/r/${mongoUser?.referralCode || ''}`)}
                style={{
                  width: '198px',
                  height: '49px',
                  borderRadius: '80px',
                  background: 'rgba(36, 50, 77, 1)',
                  paddingLeft: '28px',
                  paddingRight: '28px',
                  gap: '10px',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
                className="hover:opacity-90 transition-opacity shadow-sm shrink-0"
              >
                <span
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '28px',
                    letterSpacing: '0%',
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Copy Referral Link
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── THREE STAT CARDS (width: 1103px, height: 160px, gap: 10px) ─── */}
        <div className="w-full flex justify-end">
          <div
            style={{
              width: '1103px',
              maxWidth: '100%',
              gap: '10px',
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
            className="grid grid-cols-1 md:grid-cols-3"
          >
            {/* Offers card (width: 361px, height: 160px, radius: 25px) */}
            <div
              style={{
                height: '160px',
                borderRadius: '25px',
                background: 'rgba(249, 247, 241, 1)',
                paddingTop: '23px',
                paddingRight: '23px',
                paddingBottom: '25px',
                paddingLeft: '23px',
                gap: '10px',
                opacity: 1,
                transform: 'rotate(0deg)',
                boxSizing: 'border-box',
              }}
              className="flex flex-col justify-between"
            >
              <div>
                <span
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '45px',
                    lineHeight: '30px',
                    letterSpacing: '-0.02em',
                    color: '#24324D',
                    display: 'block',
                  }}
                >
                  {profileStats.totalTasksCompleted || 0}
                </span>
              </div>
              {/* Heading and text as one whole (width: 144px, height: 36px, gap: 15px) */}
              <div
                style={{
                  width: '144px',
                  height: '36px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: 1,
                }}
              >
                <h3
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    lineHeight: '13px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    margin: 0,
                  }}
                >
                  Offers
                </h3>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '13px',
                    lineHeight: '10px',
                    letterSpacing: '0%',
                    color: '#000000',
                    margin: 0,
                  }}
                >
                  Completed
                </p>
              </div>
            </div>

            {/* Earned card (width: 361px, height: 160px, radius: 25px) */}
            <div
              style={{
                height: '160px',
                borderRadius: '25px',
                background: 'rgba(249, 247, 241, 1)',
                paddingTop: '23px',
                paddingRight: '23px',
                paddingBottom: '25px',
                paddingLeft: '23px',
                gap: '10px',
                opacity: 1,
                transform: 'rotate(0deg)',
                boxSizing: 'border-box',
              }}
              className="flex flex-col justify-between"
            >
              <div className="flex items-center gap-2.5">
                <img
                  src="/coins/profilecoin.png"
                  alt="Coin"
                  className="w-[28px] h-[28px] object-contain shrink-0"
                />
                <span
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '45px',
                    lineHeight: '30px',
                    letterSpacing: '-0.02em',
                    color: '#ca8a04',
                  }}
                >
                  {Math.max(mongoUser?.totalEarned || 0, profileStats.totalEarnedLifetime || 0).toLocaleString('en-US')}
                </span>
              </div>
              {/* Heading and text as one whole */}
              <div
                style={{
                  width: '144px',
                  height: '36px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: 1,
                }}
              >
                <h3
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    lineHeight: '13px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    margin: 0,
                  }}
                >
                  Earned
                </h3>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '13px',
                    lineHeight: '10px',
                    letterSpacing: '0%',
                    color: '#000000',
                    margin: 0,
                  }}
                >
                  Lifetime earned
                </p>
              </div>
            </div>

            {/* 30-Day Earnings card (width: 361px, height: 160px, radius: 25px) */}
            <div
              style={{
                height: '160px',
                borderRadius: '25px',
                background: 'rgba(249, 247, 241, 1)',
                paddingTop: '23px',
                paddingRight: '23px',
                paddingBottom: '25px',
                paddingLeft: '23px',
                gap: '10px',
                opacity: 1,
                transform: 'rotate(0deg)',
                boxSizing: 'border-box',
              }}
              className="flex flex-col justify-between"
            >
              <div className="flex items-center gap-2.5">
                <img
                  src="/coins/profilecoin.png"
                  alt="Coin"
                  className="w-[28px] h-[28px] object-contain shrink-0"
                />
                <span
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '45px',
                    lineHeight: '30px',
                    letterSpacing: '-0.02em',
                    color: '#ca8a04',
                  }}
                >
                  {(profileStats.earnings30Days || 0).toLocaleString('en-US')}
                </span>
              </div>
              {/* Heading and text as one whole */}
              <div
                style={{
                  width: '144px',
                  height: '36px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: 1,
                }}
              >
                <h3
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '20px',
                    lineHeight: '13px',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    margin: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  30-Day Earnings
                </h3>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '13px',
                    lineHeight: '10px',
                    letterSpacing: '0%',
                    color: '#000000',
                    margin: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Earned in 30 days
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── MAIN TABS & TABLE CONTAINER (width: 1325px, min-height: 593px, background: rgba(249, 247, 241, 1)) ─── */}
        <div
          style={{
            width: '100%',
            maxWidth: '1325px',
            minHeight: '593px',
            background: 'rgba(249, 247, 241, 1)',
            borderRadius: '30px',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
          className="mx-auto px-6 py-6 sm:px-8 sm:py-7 border border-slate-100/60 shadow-sm flex flex-col justify-start gap-4"
        >
          {/* Tab pill bar navigation (width: 839px, height: 37px, gap: 5px) */}
          <div
            style={{
              width: '100%',
              maxWidth: '839px',
              height: '37px',
              gap: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 1,
            }}
            className="mx-auto flex-wrap sm:flex-nowrap"
          >
            <TabBtn active={activeTab === 'started_offers'} onClick={() => setActiveTab('started_offers')} icon="/coins/profilestarted.png" label="Started Offers" />
            <TabBtn active={activeTab === 'completed_offers'} onClick={() => setActiveTab('completed_offers')} icon="/coins/profilecompleted.png" label="Completed Offers" />
            <TabBtn active={activeTab === 'held_offers'} onClick={() => setActiveTab('held_offers')} icon="/coins/profilehold.png" label="Hold Offers" />
            <TabBtn active={activeTab === 'transaction_history'} onClick={() => setActiveTab('transaction_history')} icon="/coins/profiletransition.png" label="Transaction History" />
            <TabBtn active={activeTab === 'chargebacks'} onClick={() => setActiveTab('chargebacks')} icon="/coins/profileback.png" label="Chargebacks" />
          </div>

          {/* Tab Content Box (width: 1295px, min-height: 462px, border-radius: 20px, background: #FFFFFF) */}
          <div
            style={{
              width: '100%',
              maxWidth: '1295px',
              minHeight: '462px',
              backgroundColor: 'rgba(255, 255, 255, 1)',
              borderRadius: '20px',
              opacity: 1,
              transform: 'rotate(0deg)',
              padding: '16px 2px',
              boxSizing: 'border-box',
            }}
            className="mx-auto shadow-sm flex flex-col justify-between w-full mt-2"
          >
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
                    <div className="flex justify-center py-12"><FiLoader className="animate-spin text-2xl text-emerald-600" /></div>
                  ) : (() => {
                    const startedOffers = customOffers.filter(o => o.submissionStatus === 'started' || o.submissionStatus === 'rejected');
                    if (startedOffers.length === 0) {
                      return (
                        <p className="text-center py-12 text-slate-500 font-bold text-base">No clicked offers yet. Browse the Earn page to start new offers!</p>
                      );
                    }
                    const totalStartedPages = Math.ceil(startedOffers.length / itemsPerPage);
                    const paginatedStarted = startedOffers.slice((startedPage - 1) * itemsPerPage, startedPage * itemsPerPage);
                    return (
                      <div>
                        <div className="overflow-x-auto">
                          <div className="min-w-[800px]">
                            <div
                              style={{
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 400,
                                fontSize: '14px',
                                lineHeight: '26px',
                                letterSpacing: '0.06em',
                                color: 'rgba(14, 15, 12, 0.6)',
                                textTransform: 'uppercase',
                              }}
                              className="grid grid-cols-[1fr_130px_110px_140px_150px] gap-4 px-6 py-2"
                            >
                              <div>Offers</div>
                              <div>Started On</div>
                              <div>Reward</div>
                              <div>Status</div>
                              <div>Proof</div>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                              {paginatedStarted.map((offer, idx) => (
                                <ClickedOfferRow
                                  key={offer._id}
                                  offer={offer}
                                  index={idx}
                                  token={token}
                                  onRefresh={fetchOffersData}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
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
                    <div className="flex justify-center py-12"><FiLoader className="animate-spin text-2xl text-emerald-600" /></div>
                  ) : completedOffers.length === 0 ? (
                    <p className="text-center py-12 text-slate-500 font-bold text-base">No completed offers yet. Finish a started offer to earn your reward!</p>
                  ) : (() => {
                    const paginatedCompleted = completedOffers.slice((completedPage - 1) * itemsPerPage, completedPage * itemsPerPage);
                    return (
                      <div>
                        <div className="overflow-x-auto">
                          <div className="min-w-[700px]">
                            <div
                              style={{
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 400,
                                fontSize: '14px',
                                lineHeight: '26px',
                                letterSpacing: '0.06em',
                                color: 'rgba(14, 15, 12, 0.6)',
                                textTransform: 'uppercase',
                              }}
                              className="grid grid-cols-[1fr_180px_150px] gap-4 px-6 py-2"
                            >
                              <div>Offers</div>
                              <div>Completed On</div>
                              <div>Reward</div>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                              {paginatedCompleted.map((offer, idx) => (
                                <div
                                  key={offer._id}
                                  style={{
                                    width: '100%',
                                    minHeight: '69px',
                                    height: 'auto',
                                    borderRadius: '10px',
                                    backgroundColor: idx % 2 === 0 ? 'rgba(249, 247, 241, 1)' : '#ffffff',
                                  }}
                                  className="px-6 py-3.5 grid grid-cols-[1fr_180px_150px] gap-4 items-center shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                                >
                                  <span
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '26px' }}
                                    className="text-[#1e293b] leading-tight break-words"
                                  >
                                    {offer.title}
                                  </span>
                                  <span
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '26px' }}
                                    className="text-[#1e293b]"
                                  >
                                    {offer.completedAt ? new Date(offer.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                  </span>
                                  <div
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '16px', color: 'rgba(190, 146, 0, 1)' }}
                                    className="flex items-center gap-1.5"
                                  >
                                    <img src="/coins/profilecoin1.png" alt="Coin" className="w-[18px] h-[18px] shrink-0 object-contain" />
                                    <span>{(offer.rewardAmount || 0).toLocaleString('de-DE')}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
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
                    <div className="flex justify-center py-12"><FiLoader className="animate-spin text-2xl text-emerald-600" /></div>
                  ) : heldOffers.length === 0 ? (
                    <p className="text-center py-12 text-slate-500 font-bold text-base">No held earnings at the moment.</p>
                  ) : (() => {
                    const paginatedHeld = heldOffers.slice((heldPage - 1) * itemsPerPage, heldPage * itemsPerPage);
                    return (
                      <div>
                        <div className="overflow-x-auto">
                          <div className="min-w-[800px]">
                            <div
                              style={{
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 400,
                                fontSize: '14px',
                                lineHeight: '26px',
                                letterSpacing: '0.06em',
                                color: 'rgba(14, 15, 12, 0.6)',
                                textTransform: 'uppercase',
                              }}
                              className="grid grid-cols-[1fr_140px_130px_130px_130px] gap-4 px-6 py-2"
                            >
                              <div>Offers</div>
                              <div>Completed On</div>
                              <div>Reward</div>
                              <div>Hold Period</div>
                              <div className="text-right">Release In</div>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                              {paginatedHeld.map((offer, idx) => {
                                const holdPeriodDays = offer.holdUntil && offer.createdAt
                                  ? Math.round((new Date(offer.holdUntil) - new Date(offer.createdAt)) / (1000 * 60 * 60 * 24))
                                  : 30;
                                const releaseIn = offer.daysRemaining > 0
                                  ? `${offer.daysRemaining}d`
                                  : offer.isReadyToRelease ? 'Ready' : 'N/A';
                                return (
                                  <div
                                    key={offer._id}
                                    style={{
                                      width: '100%',
                                      minHeight: '69px',
                                      height: 'auto',
                                      borderRadius: '10px',
                                      backgroundColor: idx % 2 === 0 ? 'rgba(249, 247, 241, 1)' : '#ffffff',
                                    }}
                                    className="px-6 py-3.5 grid grid-cols-[1fr_140px_130px_130px_130px] gap-4 items-center shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                                  >
                                    <span
                                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '26px' }}
                                      className="text-[#1e293b] leading-tight break-words"
                                    >
                                      {offer.description}
                                    </span>
                                    <span
                                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '26px' }}
                                      className="text-[#1e293b]"
                                    >
                                      {offer.createdAt ? new Date(offer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                    </span>
                                    <div
                                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '16px', color: 'rgba(190, 146, 0, 1)' }}
                                      className="flex items-center gap-1.5"
                                    >
                                      <img src="/coins/profilecoin1.png" alt="Coin" className="w-[18px] h-[18px] shrink-0 object-contain" />
                                      <span>{(offer.amount || 0).toLocaleString('de-DE')}</span>
                                    </div>
                                    <span
                                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '26px' }}
                                      className="text-[#1e293b]"
                                    >
                                      {holdPeriodDays} days
                                    </span>
                                    <div
                                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '16px', lineHeight: '26px' }}
                                      className={`text-right ${offer.isReadyToRelease ? 'text-emerald-600' : 'text-[#1e293b]'}`}
                                    >
                                      {releaseIn}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
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
                    <div className="flex justify-center py-12"><FiLoader className="animate-spin text-2xl text-emerald-600" /></div>
                  ) : txHistory.error ? (
                    <p className="text-rose-500 text-center py-12 font-semibold">{txHistory.error}</p>
                  ) : txHistory.dataList.length === 0 ? (
                    <p className="text-center py-12 text-slate-500 font-bold text-base">No transaction history found.</p>
                  ) : (
                    <div>
                      <div className="overflow-x-auto">
                        <div className="min-w-[850px]">
                          <div
                            style={{
                              fontFamily: 'Poppins, sans-serif',
                              fontWeight: 400,
                              fontSize: '14px',
                              lineHeight: '26px',
                              letterSpacing: '0.06em',
                              color: 'rgba(14, 15, 12, 0.6)',
                              textTransform: 'uppercase',
                            }}
                            className="grid grid-cols-[130px_140px_1fr_140px_120px] gap-4 px-6 py-2"
                          >
                            <div>Date</div>
                            <div>Type</div>
                            <div>Description</div>
                            <div>Amount</div>
                            <div>Status</div>
                          </div>
                          <div className="flex flex-col gap-2 mt-2">
                            {txHistory.dataList.map((tx, idx) => {
                              const config = TX_TYPE_LABEL[tx.transactionType] || { label: tx.transactionType, color: 'text-slate-500' };
                              const isDebit = tx.amount < 0;
                              const isPending = tx.status === 'pending';
                              return (
                                <div
                                  key={tx._id}
                                  style={{
                                    width: '100%',
                                    minHeight: '69px',
                                    height: 'auto',
                                    borderRadius: '10px',
                                    backgroundColor: idx % 2 === 0 ? 'rgba(249, 247, 241, 1)' : '#ffffff',
                                  }}
                                  className="px-6 py-3.5 grid grid-cols-[130px_140px_1fr_140px_120px] gap-4 items-center shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                                >
                                  <span
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '26px' }}
                                    className="text-[#1e293b]"
                                  >
                                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                  </span>
                                  <span
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '26px' }}
                                    className="text-[#1e293b] truncate"
                                  >
                                    {config.label}
                                  </span>
                                  <span
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '26px' }}
                                    className="text-[#1e293b] leading-tight break-words pr-2"
                                    title={tx.description}
                                  >
                                    {tx.description}
                                  </span>
                                  <div
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '16px', color: 'rgba(190, 146, 0, 1)' }}
                                    className="flex items-center gap-1.5"
                                  >
                                    <img src="/coins/profilecoin1.png" alt="Coin" className="w-[18px] h-[18px] shrink-0 object-contain" />
                                    <span>{Math.abs(tx.amount || 0).toLocaleString('de-DE')}</span>
                                  </div>
                                  <div className="flex justify-start">
                                    <span
                                      style={{
                                        fontFamily: 'Poppins, sans-serif',
                                        fontWeight: 500,
                                        fontSize: '16px',
                                        lineHeight: '26px',
                                        borderRadius: '40px',
                                        padding: '3px 18px',
                                      }}
                                      className={`inline-flex items-center justify-center ${isPending
                                        ? 'bg-[#1e293b] text-white'
                                        : tx.status === 'completed'
                                          ? 'bg-[#10b981] text-white'
                                          : 'bg-[#1e293b] text-white'
                                      }`}
                                    >
                                      {tx.status === 'completed' ? 'Completed' : tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
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
                    <div className="flex justify-center py-12"><FiLoader className="animate-spin text-2xl text-emerald-600" /></div>
                  ) : chargebacks.error ? (
                    <p className="text-rose-500 text-center py-12 font-semibold">{chargebacks.error}</p>
                  ) : chargebacks.dataList.length === 0 ? (
                    <p className="text-center py-12 text-slate-500 font-bold text-base">No chargebacks found on your account.</p>
                  ) : (
                    <div>
                      <div className="overflow-x-auto">
                        <div className="min-w-[700px]">
                          <div
                            style={{
                              fontFamily: 'Poppins, sans-serif',
                              fontWeight: 400,
                              fontSize: '14px',
                              lineHeight: '26px',
                              letterSpacing: '0.06em',
                              color: 'rgba(14, 15, 12, 0.6)',
                              textTransform: 'uppercase',
                            }}
                            className="grid grid-cols-[1fr_180px_150px] gap-4 px-6 py-2"
                          >
                            <div>Offers</div>
                            <div>Started On</div>
                            <div>Amount</div>
                          </div>
                          <div className="flex flex-col gap-2 mt-2">
                            {chargebacks.dataList.map((tx, idx) => (
                              <div
                                key={tx._id}
                                style={{
                                  width: '100%',
                                  minHeight: '69px',
                                  height: 'auto',
                                  borderRadius: '10px',
                                  backgroundColor: idx % 2 === 0 ? 'rgba(249, 247, 241, 1)' : '#ffffff',
                                }}
                                className="px-6 py-3.5 grid grid-cols-[1fr_180px_150px] gap-4 items-center shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                              >
                                <span
                                  style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '26px' }}
                                  className="text-[#1e293b] leading-tight break-words"
                                >
                                  {tx.description}
                                </span>
                                <span
                                  style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '26px' }}
                                  className="text-[#1e293b]"
                                >
                                  {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                </span>
                                <div
                                  style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '16px', color: 'rgba(190, 146, 0, 1)' }}
                                  className="flex items-center gap-1.5"
                                >
                                  <img src="/coins/profilecoin1.png" alt="Coin" className="w-[18px] h-[18px] shrink-0 object-contain" />
                                  <span>{Math.abs(tx.amount || 0).toLocaleString('de-DE')}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Pagination Outside White Box (Below Rows Section) ── */}
          {activeTab === 'started_offers' && (
            <Pagination
              page={startedPage}
              totalPages={totalStartedPages}
              onNext={() => setStartedPage(p => Math.min(totalStartedPages, p + 1))}
              onPrev={() => setStartedPage(p => Math.max(1, p - 1))}
              onPageClick={setStartedPage}
            />
          )}
          {activeTab === 'completed_offers' && (
            <Pagination
              page={completedPage}
              totalPages={totalCompletedPages}
              onNext={() => setCompletedPage(p => Math.min(totalCompletedPages, p + 1))}
              onPrev={() => setCompletedPage(p => Math.max(1, p - 1))}
              onPageClick={setCompletedPage}
            />
          )}
          {activeTab === 'held_offers' && (
            <Pagination
              page={heldPage}
              totalPages={totalHeldPages}
              onNext={() => setHeldPage(p => Math.min(totalHeldPages, p + 1))}
              onPrev={() => setHeldPage(p => Math.max(1, p - 1))}
              onPageClick={setHeldPage}
            />
          )}
          {activeTab === 'transaction_history' && (
            <Pagination
              page={txHistory.page}
              totalPages={txHistory.totalPages}
              onNext={txHistory.nextPage}
              onPrev={txHistory.prevPage}
              onPageClick={txHistory.goToPage}
            />
          )}
          {activeTab === 'chargebacks' && (
            <Pagination
              page={chargebacks.page}
              totalPages={chargebacks.totalPages}
              onNext={chargebacks.nextPage}
              onPrev={chargebacks.prevPage}
              onPageClick={chargebacks.goToPage}
            />
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
