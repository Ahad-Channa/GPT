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
  FiUsers, FiCopy, FiLock, FiList, FiChevronLeft, FiChevronRight
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
                      {(mongoUser?.walletBalance || 0).toLocaleString()}
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
          <img src="/coins/Coin.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" />
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
            className="h-[48px] px-5 bg-[rgba(39,112,58,1)] hover:brightness-110 text-white rounded-[10px] flex items-center justify-center gap-[10px] font-bold font-['Barlow_Condensed'] text-[20px] transition-all shadow-[0px_4px_0px_0px_rgba(35,80,47,1)] active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(35,80,47,1)]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
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
      {/* 2FA Setup Inner Modal */}
      {show2FASetup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[44px] z-[999999] flex items-center justify-center p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <div className="bg-[#242424] border border-white/[0.08] rounded-[2rem] w-full max-w-md p-8 flex flex-col items-center text-center my-auto max-h-[95vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            <div className="w-[52px] h-[52px] rounded-full bg-[#11291b] border border-[#1a422a] flex items-center justify-center text-[#49b265] mb-4 shrink-0">
              <FiShield size={22} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 font-['Barlow_Condensed'] uppercase tracking-wide">SETUP 2-FACTOR AUTH</h3>
            <p className="text-slate-400 text-[14px] mb-6 max-w-[280px] font-['Barlow_Condensed'] font-semibold leading-normal">
              Scan this QR code with Google Authenticator or Microsoft Authenticator, then enter the 6-digit code.
            </p>
            
            {qrCodeUrl ? (
              <div className="bg-white p-3 rounded-2xl mb-6 shadow-lg select-none">
                <img src={qrCodeUrl} alt="2FA QR Code" className="w-[180px] h-[180px] rounded-xl" />
              </div>
            ) : (
              <div className="w-[180px] h-[180px] flex items-center justify-center mb-6 bg-[#1a1a1a] rounded-2xl border border-white/[0.05]">
                <FiLoader className="animate-spin text-emerald-400 text-3xl" />
              </div>
            )}

            <div className="w-full bg-black/[0.36] border border-white/[0.08] rounded-xl py-3 px-4 mb-4 font-['Barlow_Condensed'] text-[15px] font-semibold text-center text-[#49b265] select-all tracking-wide">
              {secretKey || 'Loading secret key...'}
            </div>

            <form onSubmit={handleConfirm2FA} className="w-full space-y-4">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="0 0 0 0 0 0"
                className="w-full bg-black/[0.36] border border-white/[0.08] rounded-xl py-3 text-center text-xl font-bold text-white tracking-[0.6em] pl-[0.6em] focus:outline-none focus:bg-black/[0.36] active:bg-black/[0.36] focus:border-[#49b265]/50 transition-colors font-['Barlow_Condensed'] placeholder:text-slate-600 [&:-webkit-autofill]:[Webkit-text-fill-color:white] [&:-webkit-autofill]:[Webkit-box-shadow:0_0_0_30px_#151515_inset]"
                autoFocus
              />
              {error && <p className="text-rose-400 text-sm font-['Barlow_Condensed'] font-semibold">{error}</p>}
              
              <div className="flex gap-3 font-['Barlow_Condensed'] text-[20px] mt-4">
                <button
                  type="button"
                  onClick={() => { setShow2FASetup(false); setOtpCode(''); setError(''); }}
                  className="w-1/2 h-[48px] bg-white/[0.11] text-white rounded-[10px] font-bold shadow-[0_4px_0_0_rgba(255,255,255,0.05)] hover:bg-white/[0.15] hover:translate-y-[1px] hover:shadow-[0_3px_0_0_rgba(255,255,255,0.05)] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying2FA || otpCode.length !== 6}
                  className="w-1/2 h-[48px] bg-[#49B265] text-white rounded-[10px] font-bold shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_4px_0_0_#276D3A] disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_0_#276D3A]"
                >
                  {verifying2FA ? 'Enabling...' : 'Verify & Enable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Disable Inner Modal */}
      {show2FADisable && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[44px] z-[999999] flex items-center justify-center p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <div className="bg-[#242424] border border-white/[0.08] rounded-[2rem] w-full max-w-md p-8 flex flex-col items-center text-center my-auto max-h-[95vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            <div className="w-[52px] h-[52px] rounded-full bg-[#2a1114] border border-[#4a1a21] flex items-center justify-center text-rose-500 mb-4 shrink-0">
              <FiShield size={22} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 font-['Barlow_Condensed'] uppercase tracking-wide">DISABLE 2-FACTOR AUTH</h3>
            <p className="text-slate-400 text-[14px] mb-6 max-w-[280px] font-['Barlow_Condensed'] font-semibold leading-normal">
              For security, enter the 6-digit code from your authenticator app to disable 2FA.
            </p>

            <form onSubmit={handleDisable2FA} className="w-full space-y-4">
              <input
                type="text"
                maxLength={6}
                value={disableCode}
                onChange={e => setDisableCode(e.target.value.replace(/\D/g, ''))}
                placeholder="0 0 0 0 0 0"
                className="w-full bg-black/[0.36] border border-white/[0.08] rounded-xl py-3 text-center text-xl font-bold text-white tracking-[0.6em] pl-[0.6em] focus:outline-none focus:bg-black/[0.36] active:bg-black/[0.36] focus:border-rose-500/50 transition-colors font-['Barlow_Condensed'] placeholder:text-slate-600 [&:-webkit-autofill]:[Webkit-text-fill-color:white] [&:-webkit-autofill]:[Webkit-box-shadow:0_0_0_30px_#151515_inset]"
                autoFocus
              />
              {error && <p className="text-rose-400 text-sm font-['Barlow_Condensed'] font-semibold">{error}</p>}
              
              <div className="flex gap-3 font-['Barlow_Condensed'] text-[20px] mt-4">
                <button
                  type="button"
                  onClick={() => { setShow2FADisable(false); setDisableCode(''); setError(''); }}
                  className="w-1/2 h-[48px] bg-white/[0.11] text-white rounded-[10px] font-bold shadow-[0_4px_0_0_rgba(255,255,255,0.05)] hover:bg-white/[0.15] hover:translate-y-[1px] hover:shadow-[0_3px_0_0_rgba(255,255,255,0.05)] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying2FA || disableCode.length !== 6}
                  className="w-1/2 h-[48px] bg-rose-500 text-white rounded-[10px] font-bold shadow-[0_4px_0_0_#9f1239] hover:bg-rose-500/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#9f1239] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_4px_0_0_#9f1239] disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_0_0_#9f1239]"
                >
                  {verifying2FA ? 'Disabling...' : 'Verify & Disable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {deletePhase === 1 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
          <div
            style={{
              width: '500px',
              height: '317px',
              background: 'rgba(36, 36, 36, 1)',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              position: 'relative'
            }}
            className="border border-white/[0.08] shadow-card"
          >
            {/* Top Close Button */}
            <button
              onClick={() => setDeletePhase(0)}
              style={{
                width: '36px',
                height: '36px',
                background: 'rgba(255, 255, 255, 0.11)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: 0
              }}
              className="text-slate-400 hover:text-white hover:bg-white/20 transition-all"
            >
              <FiX size={20} />
            </button>

            {/* Warning Icon */}
            <div style={{ marginTop: '10px' }}>
              <img
                src="/coins/war2.png"
                alt="Warning"
                style={{
                  width: '74px',
                  height: '74px',
                  objectFit: 'contain'
                }}
              />
            </div>

            {/* Title & Description */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: '24px',
                  lineHeight: '120%',
                  color: '#fff',
                  margin: 0,
                  textTransform: 'uppercase'
                }}
              >
                Delete Account!
              </h3>
              <p
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '130%',
                  color: 'rgba(136, 136, 136, 1)',
                  margin: 0,
                  maxWidth: '400px'
                }}
              >
                Deleting your account is permanent. All associated data will be wiped.
              </p>
            </div>

            {/* Action Buttons Row */}
            <div style={{ display: 'flex', width: '100%', gap: '20px' }}>
              <button
                onClick={() => setDeletePhase(0)}
                style={{
                  height: '48px',
                  flex: 1,
                  background: 'rgba(73, 178, 101, 1)',
                  borderRadius: '10px',
                  boxShadow: '0px 4px 0px 0px rgba(39, 109, 58, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#fff'
                }}
                className="hover:opacity-95 transition-all active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(39,109,58,1)]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete()}
                style={{
                  height: '48px',
                  flex: 1,
                  background: 'rgba(229, 62, 62, 1)',
                  borderRadius: '10px',
                  boxShadow: '0px 4px 0px 0px rgba(155, 44, 44, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#fff'
                }}
                className="hover:opacity-95 transition-all active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(155,44,44,1)]"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Modal */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            width: '700px',
            height: '720px',
            background: 'rgba(36, 36, 36, 1)',
            borderRadius: '20px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxSizing: 'border-box'
          }}
          className="relative border border-white/[0.08] shadow-card max-w-full max-h-full overflow-hidden"
        >
          {/* Top header area */}
          <div
            style={{
              width: '668px',
              height: '63px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px',
              boxSizing: 'border-box'
            }}
            className="flex-shrink-0"
          >
            <div
              style={{
                width: '616px',
                height: '63px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <h2
                style={{
                  width: '616px',
                  height: '34px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: '28px',
                  lineHeight: '120%',
                  color: '#fff',
                  margin: 0,
                  textTransform: 'uppercase'
                }}
              >
                Account Settings
              </h2>
              <p
                style={{
                  width: '616px',
                  height: '23px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 500,
                  fontSize: '18px',
                  lineHeight: '130%',
                  color: 'rgba(136, 136, 136, 1)',
                  margin: 0
                }}
              >
                Manage your identity, avatars, and account security
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                background: 'rgba(255, 255, 255, 0.11)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                padding: 0
              }}
              className="text-slate-400 hover:text-white hover:bg-white/20 transition-all shrink-0"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Main content body with scrollable fallback */}
          <div
            style={{
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch'
            }}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden hide-scrollbar flex flex-col gap-[20px]"
          >
            {/* Display Name Input */}
            <div
              style={{
                width: '668px',
                height: '80px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxSizing: 'border-box'
              }}
              className="flex-shrink-0"
            >
              <label
                style={{
                  width: 'auto',
                  height: '20px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '20px',
                  letterSpacing: '-1%',
                  color: 'rgba(255, 255, 255, 1)',
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                style={{
                  width: '668px',
                  height: '56px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  boxSizing: 'border-box',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '18px',
                  fontWeight: 600
                }}
                className="focus:outline-none focus:border-[#49b265]/50 focus:ring-1 focus:ring-[#49b265]/20 transition-all placeholder-slate-600"
                placeholder="Username"
              />
            </div>

            {/* Private Profile Toggle Card */}
            <div
              style={{
                width: '668px',
                height: '112px',
                background: 'rgba(0, 0, 0, 0.36)',
                backdropFilter: 'blur(44px)',
                borderRadius: '20px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxSizing: 'border-box'
              }}
              className="border border-white/[0.05]"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <div
                  style={{
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxSizing: 'border-box'
                  }}
                >
                  <img
                    src="/coins/proprivte.png"
                    alt="Private Profile"
                    style={{
                      width: '24px',
                      height: '24px',
                      objectFit: 'contain'
                    }}
                    className="shrink-0"
                  />
                  <h3
                    style={{
                      height: '24px',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 600,
                      fontSize: '21px',
                      lineHeight: '24px',
                      color: '#fff',
                      margin: 0
                    }}
                  >
                    Private Profile
                  </h3>
                </div>
                <p
                  style={{
                    height: '46px',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 500,
                    fontSize: '18px',
                    lineHeight: '130%',
                    color: 'rgba(136, 136, 136, 1)',
                    margin: 0
                  }}
                >
                  Hide specific offer details (like survey names) from other users on your public profile and the live earning feed.
                </p>
              </div>
              <button
                onClick={() => setIsPrivate(!isPrivate)}
                style={{
                  width: '46px',
                  height: '26px',
                  boxSizing: 'border-box'
                }}
                className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${isPrivate ? 'bg-[#49b265]' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-[22px]' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* 2FA Toggle Card */}
            <div
              style={{
                width: '668px',
                height: '112px',
                background: 'rgba(0, 0, 0, 0.36)',
                backdropFilter: 'blur(44px)',
                borderRadius: '20px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxSizing: 'border-box'
              }}
              className="border border-white/[0.05]"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <div
                  style={{
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxSizing: 'border-box'
                  }}
                >
                  <img
                    src="/coins/2fa.png"
                    alt="2FA"
                    style={{
                      width: '24px',
                      height: '24px',
                      objectFit: 'contain'
                    }}
                    className="shrink-0"
                  />
                  <h3
                    style={{
                      height: '24px',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 600,
                      fontSize: '21px',
                      lineHeight: '24px',
                      color: '#fff',
                      margin: 0
                    }}
                  >
                    2 Factor Authorization
                  </h3>
                </div>
                <p
                  style={{
                    height: '46px',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 500,
                    fontSize: '18px',
                    lineHeight: '130%',
                    color: 'rgba(136, 136, 136, 1)',
                    margin: 0
                  }}
                >
                  Make your account more secure by activating 2FA.
                </p>
              </div>
              <button
                onClick={handle2FAToggle}
                style={{
                  width: '46px',
                  height: '26px',
                  boxSizing: 'border-box'
                }}
                className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${is2FAEnabled ? 'bg-[#49b265]' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${is2FAEnabled ? 'translate-x-[22px]' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Local Success / Error Messages */}
            {error && !show2FASetup && !show2FADisable && (
              <div className="p-4 rounded-xl text-sm font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-['Barlow_Condensed']">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 rounded-xl text-sm font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-['Barlow_Condensed']">
                {success}
              </div>
            )}

            {/* Save Profile Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '668px',
                height: '48px',
                background: 'rgba(73, 178, 101, 1)',
                borderRadius: '10px',
                padding: '10px 30px',
                boxShadow: '0px 4px 0px 0px rgba(39, 109, 58, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                border: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
                fontFamily: "'Barlow Condensed', sans-serif"
              }}
              className="hover:opacity-95 disabled:opacity-50 text-white font-bold text-xl transition-all shrink-0 active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(39,109,58,1)]"
            >
              {saving ? <FiLoader className="animate-spin text-xl" /> : null}
              <span>Save Profile</span>
            </button>

            {/* Danger Zone */}
            <div className="border-t border-white/[0.08] pt-4">
              <div
                style={{
                  width: '668px',
                  height: '89px',
                  background: 'rgba(0, 0, 0, 0.36)',
                  backdropFilter: 'blur(44px)',
                  borderRadius: '20px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxSizing: 'border-box'
                }}
                className="border border-white/[0.05]"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <div
                    style={{
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <img
                      src="/coins/war2.png"
                      alt="Danger Zone"
                      style={{
                        width: '24px',
                        height: '24px',
                        objectFit: 'contain'
                      }}
                      className="shrink-0"
                    />
                    <h3
                      style={{
                        height: '24px',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
                        fontSize: '21px',
                        lineHeight: '24px',
                        color: '#fff',
                        margin: 0
                      }}
                    >
                      Danger Zone
                    </h3>
                  </div>
                  <p
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 500,
                      fontSize: '15px',
                      lineHeight: '130%',
                      color: 'rgba(136, 136, 136, 1)',
                      margin: 0
                    }}
                  >
                    Deleting your account is permanent. All associated data will be wiped.
                  </p>
                </div>

                <button
                  onClick={() => setDeletePhase(1)}
                  style={{
                    height: '40px',
                    background: 'rgba(229, 62, 62, 1)',
                    borderRadius: '10px',
                    padding: '8px 20px',
                    boxShadow: '0px 4px 0px 0px rgba(155, 44, 44, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    fontFamily: "'Barlow Condensed', sans-serif"
                  }}
                  className="hover:opacity-95 text-white font-bold text-lg transition-all shrink-0 active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(155,44,44,1)]"
                >
                  Delete Account
                </button>
              </div>
            </div>
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
        <div className="flex flex-col gap-[18px] bg-white/[0.14] rounded-[20px] border border-[#2A2A2E] p-[20px] backdrop-blur-[94px] relative z-20">
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
              <div className="flex flex-col gap-[10px] w-full max-w-[824px] h-[104px]">
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
            <div className="flex items-center gap-3 shrink-0 relative z-10">
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
                  <img src="/coins/Coin.png" alt="Coin" className="w-[40px] h-[40px] object-contain shrink-0" />
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
                  <img src="/coins/Coin.png" alt="Coin" className="w-[40px] h-[40px] object-contain shrink-0" />
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
                      <p className="text-center py-8" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '20px', lineHeight: '120%', color: 'white' }}>No clicked offers yet. Browse the Earn page to start new offers!</p>
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
                                onRefresh={fetchOffersData}
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
                  <p className="text-center py-8" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '20px', lineHeight: '120%', color: 'white' }}>No completed offers yet. Finish a started offer to earn your reward!</p>
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
                                  <img src="/coins/Coin.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" />
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
                  <p className="text-center py-8" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '20px', lineHeight: '120%', color: 'white' }}>No held earnings at the moment.</p>
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
                                    <img src="/coins/Coin.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" />
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
                  <p className="text-center py-8" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '20px', lineHeight: '120%', color: 'white' }}>No transaction history found.</p>
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
                                  <img src="/coins/Coin.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" />
                                  <span>{isDebit ? '' : '+'}{tx.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-start">
                                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`inline-flex items-center justify-center px-[20px] py-[4px] rounded-[100px] text-[22px] leading-[120%] font-semibold border ${isPending
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : tx.status === 'failed' || tx.status === 'rejected'
                                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                      : 'bg-[#153423] text-[#4ade80] border-[#4ade80]/20'
                                    }`}>
                                    {tx.status === 'completed' ? 'Completed' : tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
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
                  <p className="text-center py-8" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '20px', lineHeight: '120%', color: 'white' }}>No chargebacks found on your account.</p>
                ) : (
                  <div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[1180px]">
                        <div className="w-[1180px] h-[58px] rounded-[20px] pt-[10px] pr-[95px] pb-[30px] pl-[40px] grid grid-cols-[2fr_1fr_1fr] gap-[20px] border-b border-[#2a2d36] items-center">
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Offers</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Started On</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[26px] text-white/40">Amount</div>
                        </div>
                        <div className="flex flex-col gap-[10px] mt-[10px]">
                          {chargebacks.dataList.map(tx => (
                            <div key={tx._id} className="w-[1180px] h-[82px] bg-[#171717] rounded-[20px] pt-[20px] pr-[95px] pb-[20px] pl-[40px] grid grid-cols-[2fr_1fr_1fr] gap-[20px] items-center hover:bg-[#1a1a1a] transition-colors">
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[28px] leading-[120%] text-white truncate">{tx.description}</span>
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-semibold text-[28px] leading-[120%]">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                              <div className="flex items-center gap-[6px] font-semibold text-[#fbbf24] text-[28px] leading-[120%]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                <img src="/coins/Coin.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" />
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
