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

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Customization / Avatar Shop Modal ─────────────────────────────
const CustomizationModal = ({ isOpen, onClose, mongoUser, token, setMongoUser }) => {
  const [activeTab, setActiveTab] = useState('my_avatars');
  const [previewAvatar, setPreviewAvatar] = useState(null);

  const [saving, setSaving] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);

  const [myPage, setMyPage] = useState(1);
  const [shopPage, setShopPage] = useState(1);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [confirmingAvatar, setConfirmingAvatar] = useState(null);
  const [purchaseSuccessAvatar, setPurchaseSuccessAvatar] = useState(null);
  const [orderSummaryAvatar, setOrderSummaryAvatar] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerPage = isMobile ? 6 : 9;

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
      setActiveTab('shop');
      setConfirmingAvatar(null);
      setPurchaseSuccessAvatar(null);
      setOrderSummaryAvatar(null);
      fetchAvatars();
    }
  }, [isOpen]);

  useEffect(() => {
    if (avatars.length > 0 && !previewAvatar && isOpen) {
      const sourceList = activeTab === 'my_avatars'
        ? avatars.filter(a => a.isUnlocked)
        : avatars.filter(a => !a.isUnlocked);
      if (sourceList.length > 0) {
        if (activeTab === 'my_avatars') {
          const equipped = sourceList.find(a => a.url === mongoUser?.avatarUrl);
          setPreviewAvatar(equipped || sourceList[0]);
        } else {
          setPreviewAvatar(sourceList[0]);
        }
      }
    }
  }, [avatars, mongoUser, previewAvatar, isOpen, activeTab]);

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
        toast.success('Avatar purchased and equipped!');
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

  const currentList = activeTab === 'my_avatars' ? myAvatars : shopAvatars;
  const currentPage = activeTab === 'my_avatars' ? myPage : shopPage;
  const totalPages = Math.ceil(currentList.length / itemsPerPage) || 1;
  const paginatedAvatars = currentList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return createPortal(
    <div
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden"
    >
      {/* Outer White Frame */}
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          boxSizing: 'border-box',
          fontFamily: '"Poppins", sans-serif'
        }}
        className="w-full max-w-[430px] md:max-w-[96vw] md:w-[1072px] h-auto max-h-[96vh] md:h-[610px] md:max-h-[94vh] bg-[#FFFFFF] rounded-[24px] p-1.5 sm:p-2 md:p-[6px] shadow-2xl flex flex-col md:flex-row items-center justify-center overflow-y-auto md:overflow-hidden relative my-auto [&::-webkit-scrollbar]:hidden"
      >
        {/* Top Right Close Button (Circle with X) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-[24px] h-[24px] md:w-[22px] md:h-[22px] bg-black text-white rounded-full flex items-center justify-center border-none cursor-pointer absolute top-3.5 right-3.5 md:top-[12px] md:right-[14px] z-50 p-0 hover:opacity-80 transition-opacity shrink-0 shadow-sm"
        >
          <FiX size={12} strokeWidth={2.5} className="pointer-events-none" />
        </button>

        {/* Inner Main Cream Container */}
        <div
          style={{
            boxSizing: 'border-box'
          }}
          className="w-full md:w-[1056px] md:max-w-full h-auto md:h-[596px] md:max-h-full bg-[rgba(248,245,239,1)] rounded-[20px] md:rounded-[18px] px-1.5 py-3 sm:px-2 sm:py-3.5 md:p-[10px_18px_12px_18px] flex flex-col justify-start md:justify-between gap-3 md:gap-0 relative overflow-y-auto md:overflow-hidden [&::-webkit-scrollbar]:hidden"
        >
          {/* Top Header Row */}
          <div
            className="w-full md:w-[987px] md:max-w-full md:h-[76px] flex items-start md:items-center justify-between mx-0 md:mx-auto box-border shrink-0 relative pt-1 md:pt-0 px-2 md:px-0"
          >
            {/* Left Title & Accent */}
            <div className="flex flex-col justify-center min-w-0 pr-2">
              <h2
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  letterSpacing: '-0.02em',
                  color: 'rgba(14, 15, 12, 1)',
                  margin: 0
                }}
                className="font-bold text-[24px] sm:text-[28px] md:text-[32px] leading-tight md:leading-[1.1]"
              >
                Avatar Shop
              </h2>
              <p
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  color: 'rgba(14, 15, 12, 1)'
                }}
                className="text-[12.5px] sm:text-[14px] md:text-[16px] font-medium leading-tight md:leading-[26px] max-w-[210px] sm:max-w-[280px] md:max-w-[375px] mt-1 md:mt-1 opacity-90"
              >
                Customize your identity with premium avatars
              </p>
              {/* Purple accent bar */}
              <div
                className="w-[52px] md:w-[74px] h-[3.5px] md:h-[4px] rounded-full bg-[rgba(85,88,211,1)] mt-2 md:mt-2 shrink-0"
              />
            </div>

            {/* Right Coin Balance Badge */}
            <div
              className="bg-[#FFFFFF] rounded-full md:rounded-[100px] h-auto md:h-[71px] px-3.5 py-1.5 sm:px-4 sm:py-2 md:p-[22px_26px] flex items-center justify-center gap-1.5 md:gap-[20px] shadow-sm shrink-0 self-start mr-7 md:mr-0 mt-0.5 md:mt-0"
            >
              <img
                src="/coins/image copy 2.png"
                alt="Coins"
                className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] md:w-[34px] md:h-[34px] object-contain shrink-0"
              />
              <span
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  letterSpacing: '-0.02em',
                  color: 'rgba(190, 146, 0, 1)'
                }}
                className="font-bold text-[15px] sm:text-[17px] md:text-[41px] leading-none text-center inline-block"
              >
                {(mongoUser?.walletBalance || 0).toLocaleString('de-DE')}
              </span>
            </div>
          </div>

          {/* Main Content Row (Left White Grid Card + Right White/Beige Preview Card) */}
          <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0 md:mt-1.5 items-stretch w-full">
            {/* Upper/Left White Grid Card */}
            <div
              className="w-full md:flex-1 bg-[#FFFFFF] rounded-[18px] md:rounded-[16px] p-2.5 sm:p-3 md:p-[12px_16px_14px_16px] box-border flex flex-col justify-between min-w-0 md:h-full md:min-h-[490px] self-stretch"
            >
              {/* Buttons Switcher (My Avatars / Shop) */}
              <div className="flex justify-center items-center gap-2 sm:gap-2.5 mb-2.5 md:mb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTabChange('my_avatars')}
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    letterSpacing: '0%',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  className={`h-[34px] md:h-[37px] px-4 sm:px-5 md:px-6 md:w-[126px] rounded-full md:rounded-[40px] font-bold text-[13px] md:text-[14px] leading-none border-none cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'my_avatars'
                      ? 'bg-[rgba(36,50,77,1)] text-[#FFFFFF] shadow-sm'
                      : 'bg-[rgba(249,247,241,1)] text-[rgba(14,15,12,1)] hover:opacity-90'
                  }`}
                >
                  My Avatars
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('shop')}
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    letterSpacing: '0%',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  className={`h-[34px] md:h-[37px] px-4 sm:px-5 md:px-6 md:w-[84px] rounded-full md:rounded-[40px] font-bold text-[13px] md:text-[14px] leading-none border-none cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'shop'
                      ? 'bg-[rgba(36,50,77,1)] text-[#FFFFFF] shadow-sm'
                      : 'bg-[rgba(249,247,241,1)] text-[rgba(14,15,12,1)] hover:opacity-90'
                  }`}
                >
                  Shop
                </button>
              </div>

              {/* Avatars Grid (6 on Mobile: 2 cols x 3 rows; 9 on Desktop: 3 cols x 3 rows) */}
              {loadingAvatars ? (
                <div className="flex-1 flex items-center justify-center min-h-[180px] md:min-h-0">
                  <FiLoader className="animate-spin text-3xl text-[#202C44]" />
                </div>
              ) : paginatedAvatars.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-[#888888] text-center font-medium min-h-[180px] md:min-h-0 text-sm">
                  {activeTab === 'my_avatars' ? 'No avatars owned yet. Visit the Shop to get one!' : 'No avatars available in shop right now.'}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5 flex-1 content-start justify-items-center mt-1 md:mt-[5px] w-full">
                  {paginatedAvatars.map((avatar) => {
                    const isSelected = previewAvatar?._id === avatar._id;
                    return (
                      <div
                        key={avatar._id}
                        onClick={() => setPreviewAvatar(avatar)}
                        style={{
                          boxSizing: 'border-box',
                          transition: 'all 0.2s'
                        }}
                        className={`w-full max-w-full md:max-w-[227px] h-[56px] sm:h-[60px] md:h-[86px] rounded-full md:rounded-[100px] p-1.5 pr-2 sm:p-2 sm:pr-2.5 md:p-[7px_12px_7px_5px] flex items-center gap-1.5 sm:gap-2 md:gap-[10px] cursor-pointer hover:opacity-95 select-none ${
                          isSelected
                            ? 'bg-[rgba(36,50,77,1)] text-white shadow-sm'
                            : 'bg-[rgba(248,245,239,1)] text-black'
                        }`}
                      >
                        {/* Avatar Circle with Gap between Image and Border */}
                        <div
                          className={`w-[42px] h-[42px] sm:w-[46px] sm:h-[46px] md:w-[72px] md:h-[72px] rounded-full bg-white flex items-center justify-center shrink-0 box-border ${
                            isSelected
                              ? 'border-[2px] md:border-[2.5px] border-white'
                              : 'border-[2px] md:border-[2.5px] border-[rgba(36,50,77,1)]'
                          }`}
                        >
                          <div
                            className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] md:w-[60px] md:h-[60px] rounded-full overflow-hidden flex items-center justify-center bg-[#3B82F6] shrink-0"
                          >
                            <img
                              src={avatar.url}
                              alt={avatar.name}
                              className="w-full h-full object-cover rounded-full block"
                            />
                          </div>
                        </div>

                        {/* Text Container */}
                        <div
                          className={`flex flex-col justify-center items-start min-w-0 flex-1 leading-none ${
                            activeTab === 'my_avatars' ? 'pl-1 md:pl-[6px]' : 'pl-0'
                          }`}
                        >
                          {/* Heading (Avatar Name) */}
                          <span
                            style={{
                              fontFamily: '"Bricolage Grotesque", sans-serif',
                              letterSpacing: '0%'
                            }}
                            className={`font-bold text-[13px] sm:text-[14px] md:text-[19px] leading-tight md:leading-none truncate capitalize w-full text-left ${
                              isSelected ? 'text-white' : 'text-black'
                            }`}
                          >
                            {avatar.name}
                          </span>

                          {/* Below Text (in shop tab only) */}
                          {activeTab === 'shop' && (
                            <span
                              style={{
                                fontFamily: '"Poppins", sans-serif',
                                letterSpacing: '0%'
                              }}
                              className={`font-medium text-[8.5px] sm:text-[9.5px] md:text-[10px] leading-tight md:leading-[14px] truncate w-full mt-0.5 md:mt-0 ${
                                isSelected ? 'text-white/80' : 'text-black/70'
                              }`}
                            >
                              {avatar.quantity ? `${avatar.quantity} Available` : 'Unlimited Available'}
                            </span>
                          )}

                          {/* Coin Price (in shop tab) */}
                          {activeTab === 'shop' && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <img src="/coins/Coin.png" alt="Coin" className="w-[11px] h-[11px] sm:w-[12px] sm:h-[12px] md:w-[14px] md:h-[14px] object-contain shrink-0" />
                              <span
                                style={{
                                  fontFamily: '"Poppins", sans-serif',
                                  letterSpacing: '0%'
                                }}
                                className={`font-semibold text-[10px] sm:text-[11px] md:text-[12px] leading-tight ${
                                  isSelected ? 'text-[#FBBF24]' : 'text-[#BE9200]'
                                }`}
                              >
                                {(avatar.price || 0).toLocaleString('de-DE')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              <div className="flex justify-center items-center gap-2 sm:gap-[10px] pt-2.5 md:pt-2 shrink-0">
                {/* Left Button */}
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentPage > 1) {
                      if (activeTab === 'my_avatars') setMyPage(p => Math.max(1, p - 1));
                      else setShopPage(p => Math.max(1, p - 1));
                    }
                  }}
                  className={`w-[36px] h-[36px] md:w-[40px] md:h-[40px] rounded-full flex items-center justify-center p-0 box-border transition-all ${
                    currentPage > 1
                      ? 'bg-[rgba(36,50,77,1)] text-white border-none cursor-pointer hover:opacity-90 active:scale-95'
                      : 'bg-transparent border border-[rgba(36,50,77,1)] text-[rgba(36,50,77,1)] cursor-default opacity-60'
                  }`}
                >
                  <FiChevronLeft size={16} />
                </button>

                {/* Right Button */}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentPage < totalPages) {
                      if (activeTab === 'my_avatars') setMyPage(p => Math.min(totalPages, p + 1));
                      else setShopPage(p => Math.min(totalPages, p + 1));
                    }
                  }}
                  className={`w-[36px] h-[36px] md:w-[40px] md:h-[40px] rounded-full flex items-center justify-center p-0 box-border transition-all ${
                    currentPage < totalPages
                      ? 'bg-[rgba(36,50,77,1)] text-white border-none cursor-pointer hover:opacity-90 active:scale-95'
                      : 'bg-transparent border border-[rgba(36,50,77,1)] text-[rgba(36,50,77,1)] cursor-default opacity-60'
                  }`}
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Lower/Right Preview Card (White Card on both Mobile and Desktop) */}
            <div
              className="w-full md:w-[284px] bg-[#FFFFFF] rounded-[18px] md:rounded-[16px] p-[4px_4px_12px_4px] md:p-[4px_4px_14px_4px] flex flex-col items-center shrink-0 md:h-full md:min-h-[490px] box-border self-stretch"
            >
              {previewAvatar ? (
                <>
                  {/* Desktop Banner Top Section (hidden on mobile) */}
                  <div
                    style={{
                      boxSizing: 'border-box'
                    }}
                    className="hidden md:block w-full max-w-[276px] h-[107px] bg-[rgba(248,245,239,1)] rounded-[15px] relative shrink-0 mb-[62px]"
                  >
                    {/* Avatar Circle centered on the bg boundary */}
                    <div
                      style={{
                        width: '128px',
                        height: '128px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        border: '3px solid rgba(36, 50, 77, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                        position: 'absolute',
                        bottom: '-64px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        flexShrink: 0
                      }}
                    >
                      <div
                        style={{
                          width: '114px',
                          height: '114px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#3B82F6',
                          flexShrink: 0
                        }}
                      >
                        <img
                          src={previewAvatar.url}
                          alt={previewAvatar.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            borderRadius: '50%'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mobile Beige Banner with Overlapping Avatar Circle (hidden on desktop) */}
                  <div className="block md:hidden w-full h-[70px] bg-[rgba(248,245,239,1)] rounded-[15px] relative shrink-0 mb-[48px]">
                    <div className="w-[84px] h-[84px] rounded-full bg-white border-[3px] border-[rgba(36,50,77,1)] flex items-center justify-center absolute bottom-[-42px] left-1/2 -translate-x-1/2 z-10 shrink-0 shadow-sm">
                      <div className="w-[74px] h-[74px] rounded-full overflow-hidden flex items-center justify-center bg-[#3B82F6] shrink-0">
                        <img
                          src={previewAvatar.url}
                          alt={previewAvatar.name}
                          className="w-full h-full object-cover rounded-full block"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="flex flex-col items-center w-full my-0.5">
                    <h4
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        color: 'rgba(14, 15, 12, 1)'
                      }}
                      className="font-bold text-[20px] sm:text-[22px] md:text-[24px] leading-tight capitalize truncate max-w-full text-center m-0 mb-0.5"
                    >
                      {previewAvatar.name}
                    </h4>
                    <p
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        letterSpacing: '0%',
                        color: '#000000'
                      }}
                      className="font-medium text-[12.5px] sm:text-[14px] md:text-[16px] leading-tight md:leading-[26px] text-center truncate max-w-full m-0 mt-0.5 mb-2 md:mt-[19px] md:mb-[10px]"
                    >
                      {previewAvatar.description || (activeTab === 'shop' ? 'Billo' : 'test di')}
                    </p>
                  </div>

                  {/* Specs Rows */}
                  <div
                    className="w-full flex flex-col items-center gap-1.5 md:gap-2 my-1 md:my-[6px] px-1 md:px-0"
                  >
                    {activeTab === 'shop' && (
                      <div
                        className="w-full md:max-w-[260px] h-[34px] sm:h-[36px] md:h-[37.8px] bg-[rgba(248,245,239,1)] rounded-[8px] md:rounded-[10px] px-3 md:px-[10px] flex justify-between items-center box-border"
                      >
                        <span
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            letterSpacing: '0%',
                            color: '#000000'
                          }}
                          className="font-medium text-[12.5px] sm:text-[13.5px] md:text-[14px] leading-none"
                        >
                          Price
                        </span>
                        <div className="flex items-center gap-1">
                          <img src="/coins/Coin.png" alt="Coin" className="w-[13px] h-[13px] md:w-[14px] md:h-[14px] object-contain" />
                          <span
                            style={{
                              fontFamily: '"Poppins", sans-serif',
                              letterSpacing: '0%',
                              color: '#D97706'
                            }}
                            className="font-bold text-[12.5px] sm:text-[13.5px] md:text-[14px] leading-none"
                          >
                            {(previewAvatar.price || 0).toLocaleString('de-DE')}
                          </span>
                        </div>
                      </div>
                    )}

                    <div
                      className="w-full md:max-w-[260px] h-[34px] sm:h-[36px] md:h-[37.8px] bg-[rgba(248,245,239,1)] rounded-[8px] md:rounded-[10px] px-3 md:px-[10px] flex justify-between items-center box-border"
                    >
                      <span
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          letterSpacing: '0%',
                          color: '#000000'
                        }}
                        className="font-medium text-[12.5px] sm:text-[13.5px] md:text-[14px] leading-none"
                      >
                        Rarity
                      </span>
                      <span
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          letterSpacing: '0%',
                          color: 'rgba(14, 15, 12, 1)'
                        }}
                        className="font-semibold text-[12.5px] sm:text-[13.5px] md:text-[14px] leading-none"
                      >
                        {previewAvatar.rarity || 'Limited Edition'}
                      </span>
                    </div>

                    {activeTab === 'shop' ? (
                      <div
                        className="w-full md:max-w-[260px] h-[34px] sm:h-[36px] md:h-[37.8px] bg-[rgba(248,245,239,1)] rounded-[8px] md:rounded-[10px] px-3 md:px-[10px] flex justify-between items-center box-border"
                      >
                        <span
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            letterSpacing: '0%',
                            color: '#000000'
                          }}
                          className="font-medium text-[12.5px] sm:text-[13.5px] md:text-[14px] leading-none"
                        >
                          Limited Quantity
                        </span>
                        <span
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            letterSpacing: '0%',
                            color: 'rgba(14, 15, 12, 1)'
                          }}
                          className="font-semibold text-[12.5px] sm:text-[13.5px] md:text-[14px] leading-none"
                        >
                          {previewAvatar.quantity ? `${previewAvatar.quantity} Available` : 'Unlimited'}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="w-full md:max-w-[260px] h-[34px] sm:h-[36px] md:h-[37.8px] bg-[rgba(248,245,239,1)] rounded-[8px] md:rounded-[10px] px-3 md:px-[10px] flex justify-between items-center box-border"
                      >
                        <span
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            letterSpacing: '0%',
                            color: '#000000'
                          }}
                          className="font-medium text-[12.5px] sm:text-[13.5px] md:text-[14px] leading-none"
                        >
                          Obtained On
                        </span>
                        <span
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            letterSpacing: '0%',
                            color: 'rgba(14, 15, 12, 1)'
                          }}
                          className="font-semibold text-[12.5px] sm:text-[13.5px] md:text-[14px] leading-none"
                        >
                          {previewAvatar.obtainedAt ? new Date(previewAvatar.obtainedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Aug 21, 2026'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Button (width: 265, height: 55 on desktop; full-width on mobile) */}
                  <div className="w-full flex justify-center mt-2.5 md:mt-auto px-1 md:px-0">
                    {activeTab === 'my_avatars' ? (
                      <button
                        type="button"
                        onClick={handleEquip}
                        disabled={saving || mongoUser?.avatarUrl === previewAvatar?.url}
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          letterSpacing: '0%',
                          boxSizing: 'border-box'
                        }}
                        className={`w-full md:max-w-[265px] h-[48px] sm:h-[50px] md:h-[55px] rounded-full md:rounded-[30px] bg-[rgba(36,50,77,1)] text-[#FFFFFF] font-medium text-[15px] sm:text-[16px] leading-none border-none flex items-center justify-center gap-2 cursor-pointer transition-all hover:opacity-90 active:scale-[0.99] px-6 ${
                          mongoUser?.avatarUrl === previewAvatar?.url ? 'opacity-80 cursor-default' : ''
                        }`}
                      >
                        {saving ? 'Equipping...' : (mongoUser?.avatarUrl === previewAvatar?.url ? 'Equipped' : 'Equip')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!previewAvatar?.isUnlocked && !mongoUser?.unlockedAvatars?.includes(previewAvatar?._id)) {
                            setConfirmingAvatar(previewAvatar);
                          }
                        }}
                        disabled={saving || previewAvatar?.isUnlocked || mongoUser?.unlockedAvatars?.includes(previewAvatar?._id) || previewAvatar?.quantity === 0 || (mongoUser?.walletBalance || 0) < (previewAvatar?.price || 0)}
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          letterSpacing: '0%',
                          boxSizing: 'border-box'
                        }}
                        className={`w-full md:max-w-[265px] h-[48px] sm:h-[50px] md:h-[55px] rounded-full md:rounded-[30px] bg-[rgba(36,50,77,1)] text-[#FFFFFF] font-medium text-[15px] sm:text-[16px] leading-none border-none flex items-center justify-center gap-2 cursor-pointer transition-all hover:opacity-90 active:scale-[0.99] px-6 disabled:opacity-75 ${
                          (previewAvatar?.isUnlocked || mongoUser?.unlockedAvatars?.includes(previewAvatar?._id)) ? 'cursor-default' : ''
                        }`}
                      >
                        {saving
                          ? 'Processing...'
                          : (previewAvatar?.isUnlocked || mongoUser?.unlockedAvatars?.includes(previewAvatar?._id))
                            ? 'Claimed'
                            : previewAvatar?.quantity === 0
                              ? 'Sold Out'
                              : (mongoUser?.walletBalance || 0) < (previewAvatar?.price || 0)
                                ? 'Insufficient Coins'
                                : 'Claim'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#888888] text-sm py-8 md:py-0">
                  Select an avatar
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Modal ("Order Summary") */}
      {confirmingAvatar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: '626px',
              maxWidth: '95vw',
              background: '#FFFFFF',
              borderRadius: '26px',
              padding: '10px 10px 18px 10px',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
            className="shadow-2xl"
          >
            {/* Top Header Row (width: 606, height: 95, background: rgba(248, 245, 239, 1)) */}
            <div
              style={{
                width: '100%',
                height: '95px',
                background: 'rgba(248, 245, 239, 1)',
                borderRadius: '18px',
                padding: '0 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '28px',
                    lineHeight: '1.2',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    margin: 0
                  }}
                >
                  Order Summary
                </h2>
                <div
                  style={{
                    width: '52px',
                    height: '4px',
                    background: '#5B68DF',
                    borderRadius: '2px',
                    marginTop: '6px'
                  }}
                />
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setConfirmingAvatar(null)}
                style={{
                  width: '22px',
                  height: '22px',
                  background: '#000000',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer'
                }}
                className="text-white hover:opacity-80 transition-opacity shrink-0"
              >
                <FiX size={12} strokeWidth={2.5} className="pointer-events-none" />
              </button>
            </div>

            {/* Modal Body (White Background) */}
            <div
              style={{
                width: '100%',
                background: '#FFFFFF',
                padding: '20px 0 0 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxSizing: 'border-box'
              }}
            >
              {/* Avatar Row */}
              <div className="flex items-center gap-4 my-1 px-2">
                <div
                  style={{
                    width: '93px',
                    height: '93px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '4px solid rgba(36, 50, 77, 1)',
                    padding: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    flexShrink: 0
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[#3B82F6]">
                    <img src={confirmingAvatar.url} alt={confirmingAvatar.name} className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <h4
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '27px',
                      lineHeight: '1.2',
                      letterSpacing: '-0.02em',
                      color: '#000000',
                      margin: 0
                    }}
                    className="capitalize truncate"
                  >
                    {confirmingAvatar.name}
                  </h4>
                  <p
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '16px',
                      lineHeight: '26px',
                      letterSpacing: '0%',
                      color: '#000000',
                      margin: '4px 0 0 0'
                    }}
                    className="truncate"
                  >
                    {confirmingAvatar.description || 'Premium Avatar Collection'}
                  </p>
                </div>
              </div>

              {/* Price Row (Cream Pill) */}
              <div
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'rgba(248, 245, 239, 1)',
                  borderRadius: '12px',
                  padding: '0 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxSizing: 'border-box'
                }}
              >
                <span
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    color: '#000000'
                  }}
                >
                  Price
                </span>
                <div className="flex items-center gap-1.5">
                  <img src="/coins/Coin.png" alt="Coin" className="w-[16px] h-[16px] object-contain" />
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 700,
                      fontSize: '16px',
                      color: 'rgba(190, 146, 0, 1)'
                    }}
                  >
                    {(confirmingAvatar.price || 0).toLocaleString('de-DE')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingAvatar(null)}
                  style={{
                    height: '48px',
                    flex: 1,
                    background: 'transparent',
                    border: '1.5px solid #202C44',
                    borderRadius: '9999px',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '15px',
                    color: '#202C44',
                    cursor: 'pointer'
                  }}
                  className="hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handlePurchaseAvatar(confirmingAvatar)}
                  disabled={saving}
                  style={{
                    height: '48px',
                    flex: 1,
                    background: '#202C44',
                    border: 'none',
                    borderRadius: '9999px',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '15px',
                    color: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                  className="hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Success Modal ("Purchase Successful!") */}
      {purchaseSuccessAvatar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: '560px',
              maxWidth: '95vw',
              background: '#FFFFFF',
              borderRadius: '28px',
              padding: '10px',
              boxSizing: 'border-box'
            }}
            className="shadow-2xl overflow-hidden"
          >
            <div
              style={{
                width: '100%',
                background: 'rgba(248, 245, 239, 1)',
                borderRadius: '20px',
                padding: '36px 24px 34px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxSizing: 'border-box',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Bottom Right Corner Rainbow Background Image */}
              <img
                src="/coins/confirmbottom.png"
                alt=""
                className="absolute bottom-0 right-0 pointer-events-none z-0 select-none"
                style={{
                  maxWidth: '240px',
                  objectFit: 'contain'
                }}
              />

              {/* Close Button Top Right */}
              <button
                type="button"
                onClick={() => setPurchaseSuccessAvatar(null)}
                style={{
                  width: '24px',
                  height: '24px',
                  background: '#000000',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  zIndex: 20
                }}
                className="text-white hover:opacity-80 transition-opacity"
              >
                <FiX size={13} strokeWidth={2.5} className="pointer-events-none" />
              </button>

              {/* Content Box */}
              <div className="relative z-10 flex flex-col items-center text-center w-full max-w-[480px]">
                {/* Blue Scalloped Verified Badge */}
                <div className="flex items-center justify-center mb-4">
                  <img
                    src="/coins/confooooom.png"
                    alt="Success"
                    className="w-[68px] h-[68px] object-contain"
                  />
                </div>

                {/* Title */}
                <h2
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '32px',
                    lineHeight: '1.15',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    margin: '0 0 8px 0'
                  }}
                >
                  Purchase Successful!
                </h2>

                {/* Subtitle */}
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 400,
                    fontSize: '16px',
                    lineHeight: '24px',
                    color: '#000000',
                    margin: '0 0 28px 0'
                  }}
                >
                  <span className="capitalize">{purchaseSuccessAvatar.name}</span> has been added to your collection.
                </p>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    setOrderSummaryAvatar(purchaseSuccessAvatar);
                    setPurchaseSuccessAvatar(null);
                    setActiveTab('my_avatars');
                    setPreviewAvatar(purchaseSuccessAvatar);
                  }}
                  style={{
                    width: '100%',
                    maxWidth: '380px',
                    height: '52px',
                    background: '#202C44',
                    borderRadius: '9999px',
                    border: 'none',
                    color: '#FFFFFF',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  className="hover:opacity-90 transition-opacity shadow-sm"
                >
                  View My Avatar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Order Summary Post-Purchase Modal */}
      {orderSummaryAvatar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              width: '626px',
              maxWidth: '95vw',
              background: '#FFFFFF',
              borderRadius: '26px',
              padding: '10px 10px 18px 10px',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
            className="shadow-2xl"
          >
            {/* Top Header Row (width: 606, height: 95, background: rgba(248, 245, 239, 1)) */}
            <div
              style={{
                width: '100%',
                height: '95px',
                background: 'rgba(248, 245, 239, 1)',
                borderRadius: '18px',
                padding: '0 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '28px',
                    lineHeight: '1.2',
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    margin: 0
                  }}
                >
                  Order Summary
                </h2>
                <div
                  style={{
                    width: '52px',
                    height: '4px',
                    background: '#5B68DF',
                    borderRadius: '2px',
                    marginTop: '6px'
                  }}
                />
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setOrderSummaryAvatar(null)}
                style={{
                  width: '22px',
                  height: '22px',
                  background: '#000000',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer'
                }}
                className="text-white hover:opacity-80 transition-opacity shrink-0"
              >
                <FiX size={12} strokeWidth={2.5} className="pointer-events-none" />
              </button>
            </div>

            {/* Modal Body (White Background) */}
            <div
              style={{
                width: '100%',
                background: '#FFFFFF',
                padding: '20px 0 0 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxSizing: 'border-box'
              }}
            >
              {/* Avatar Row */}
              <div className="flex items-center gap-4 my-1 px-2">
                <div
                  style={{
                    width: '93px',
                    height: '93px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '4px solid rgba(36, 50, 77, 1)',
                    padding: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    flexShrink: 0
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[#3B82F6]">
                    <img src={orderSummaryAvatar.url} alt={orderSummaryAvatar.name} className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <h4
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '27px',
                      lineHeight: '1.2',
                      letterSpacing: '-0.02em',
                      color: '#000000',
                      margin: 0
                    }}
                    className="capitalize truncate"
                  >
                    {orderSummaryAvatar.name}
                  </h4>
                  <p
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '16px',
                      lineHeight: '26px',
                      letterSpacing: '0%',
                      color: '#000000',
                      margin: '4px 0 0 0'
                    }}
                    className="truncate"
                  >
                    {orderSummaryAvatar.description || 'Premium Avatar Collection'}
                  </p>
                </div>
              </div>

              {/* Price Row (Cream Pill) */}
              <div
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'rgba(248, 245, 239, 1)',
                  borderRadius: '12px',
                  padding: '0 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxSizing: 'border-box'
                }}
              >
                <span
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    color: '#000000'
                  }}
                >
                  Price
                </span>
                <div className="flex items-center gap-1.5">
                  <img src="/coins/Coin.png" alt="Coin" className="w-[16px] h-[16px] object-contain" />
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 700,
                      fontSize: '16px',
                      color: 'rgba(190, 146, 0, 1)'
                    }}
                  >
                    {(orderSummaryAvatar.price || 0).toLocaleString('de-DE')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>,
    document.body
  );
};

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

const Pagination = ({ page = 1, totalPages = 1, onNext, onPrev, onPageClick }) => {
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
const TabBtn = ({ active, onClick, icon, label, className = '' }) => (
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
    className={`flex items-center justify-start md:justify-center gap-2 px-3 sm:px-4 py-2 transition-all cursor-pointer whitespace-nowrap w-fit ${active
      ? 'bg-[#24324D] text-white shadow-sm'
      : 'text-[#000000] hover:bg-black/5 bg-transparent'
      } ${className}`}
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

// ── Clicked Offer Row (Clean table row with no proof buttons)
const ClickedOfferRow = ({ offer, index = 0 }) => {
  return (
    <div
      style={{
        width: '100%',
        borderRadius: index % 2 === 0 ? '10px' : '0px',
        backgroundColor: index % 2 === 0 ? 'rgba(249, 247, 241, 1)' : 'transparent',
      }}
      className="px-1.5 sm:px-6 py-2.5 sm:py-3.5 min-h-[50px] md:min-h-[69px] grid grid-cols-[1fr_60px_60px_56px] md:grid-cols-[1fr_180px_160px_140px] gap-1.5 md:gap-4 items-center"
    >
      {/* Offers Title */}
      <span
        style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
        className="text-[#1e293b] leading-tight break-words line-clamp-2 text-[10px] md:text-[16px] md:leading-[26px]"
        title={offer.title}
      >
        {offer.title}
      </span>

      {/* Started On */}
      <span
        style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
        className="text-[#1e293b] text-[10px] md:text-[16px] leading-tight md:leading-[26px]"
      >
        {offer.createdAt ? new Date(offer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
      </span>

      {/* Reward */}
      <div
        style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: 'rgba(190, 146, 0, 1)' }}
        className="flex items-center gap-0.5 md:gap-1.5 text-[10px] md:text-[16px]"
      >
        <img src="/coins/profilecoin1.png" alt="Coin" className="w-3 h-3 md:w-[18px] md:h-[18px] shrink-0 object-contain" />
        <span>{(offer.rewardAmount || 0).toLocaleString('de-DE')}</span>
      </div>

      {/* Status */}
      <div className="flex justify-center">
        <span
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 500,
            borderRadius: '40px',
            backgroundColor: 'rgba(36, 50, 77, 0.1)',
            color: 'rgba(36, 50, 77, 1)',
          }}
          className="inline-flex items-center justify-center whitespace-nowrap text-[8.5px] md:text-[16px] px-1.5 md:px-[18px] py-0.5 md:py-[3px] leading-tight"
        >
          In Progress
        </span>
      </div>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <div
            style={{
              fontFamily: '"Poppins", sans-serif'
            }}
            className="relative shadow-2xl overflow-y-auto max-h-[95vh] w-full max-w-[430px] md:max-w-none md:w-[626px] bg-[#FFFFFF] rounded-[22px] md:rounded-[28px] p-2 sm:p-2.5 md:p-[10px] flex flex-col gap-2.5 md:gap-[16px] box-border [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
          >
            {/* Top Header Card */}
            <div
              style={{
                background: 'rgba(248, 245, 239, 1)',
                borderRadius: '16px',
                opacity: 1,
                transform: 'rotate(0deg)',
                boxSizing: 'border-box'
              }}
              className="w-full md:w-[606px] max-w-full h-auto md:h-[143px] p-[14px_14px_12px_14px] md:p-[24px_28px] relative flex flex-col gap-2 md:justify-between shrink-0"
            >
              <div
                className="w-full md:w-[422px] max-w-full flex flex-col gap-2 md:gap-[8px]"
              >
                <h2
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0
                  }}
                  className="w-full max-w-[275px] md:max-w-none text-[26px] sm:text-[30px] md:text-[32px] leading-tight md:leading-[1.2]"
                >
                  Setup 2-factor auth
                </h2>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    letterSpacing: '0%',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0
                  }}
                  className="w-full text-[11px] min-[370px]:text-[11.5px] min-[400px]:text-[12.5px] md:text-[15px] leading-[18px] md:leading-[24px] tracking-tight md:tracking-normal"
                >
                  <span className="block md:inline whitespace-nowrap md:whitespace-normal">Scan this QR code with Google Authenticator or </span>
                  <span className="block md:inline whitespace-nowrap md:whitespace-normal">Microsoft Authenticator, then enter the 6-digit code.</span>
                </p>
              </div>

              {/* Accent bar */}
              <div
                style={{
                  background: 'rgba(85, 88, 211, 1)',
                  borderRadius: '20px'
                }}
                className="w-[55px] md:w-[74px] h-[3.5px] md:h-[4px]"
              />
            </div>

            {/* QR Code and Secret Key */}
            <div className="flex flex-col items-center gap-3 w-full shrink-0">
              {qrCodeUrl ? (
                <div
                  style={{
                    background: 'rgba(248, 245, 239, 1)',
                    borderRadius: '16px',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  className="shadow-sm select-none"
                >
                  <img src={qrCodeUrl} alt="2FA QR Code" className="w-[160px] h-[160px] md:w-[170px] md:h-[170px] rounded-[10px]" />
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(248, 245, 239, 1)',
                    borderRadius: '16px',
                    width: '176px',
                    height: '176px',
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <div
            style={{
              fontFamily: '"Poppins", sans-serif'
            }}
            className="relative shadow-2xl overflow-y-auto max-h-[95vh] w-full max-w-[430px] md:max-w-none md:w-[626px] bg-[#FFFFFF] rounded-[22px] md:rounded-[28px] p-2 sm:p-2.5 md:p-[10px] flex flex-col gap-2.5 md:gap-[16px] box-border [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
          >
            {/* Top Header Card */}
            <div
              style={{
                background: 'rgba(248, 245, 239, 1)',
                borderRadius: '16px',
                opacity: 1,
                transform: 'rotate(0deg)',
                boxSizing: 'border-box'
              }}
              className="w-full md:w-[606px] max-w-full h-auto md:h-[143px] p-[14px_14px_12px_14px] md:p-[24px_28px] relative flex flex-col gap-2 md:justify-between shrink-0"
            >
              <div
                className="w-full md:w-[422px] max-w-full flex flex-col gap-2 md:gap-[8px]"
              >
                <h2
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0
                  }}
                  className="w-full max-w-[285px] md:max-w-none text-[26px] sm:text-[30px] md:text-[32px] leading-tight md:leading-[1.2]"
                >
                  Disable 2-factor auth
                </h2>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    letterSpacing: '0%',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0
                  }}
                  className="w-full text-[11px] min-[370px]:text-[11.5px] min-[400px]:text-[12.5px] md:text-[15px] leading-[18px] md:leading-[24px] tracking-tight md:tracking-normal"
                >
                  <span className="block md:inline whitespace-nowrap md:whitespace-normal">For security, enter the 6-digit code from your </span>
                  <span className="block md:inline whitespace-nowrap md:whitespace-normal">authenticator app to disable 2FA.</span>
                </p>
              </div>

              {/* Accent bar */}
              <div
                style={{
                  background: 'rgba(85, 88, 211, 1)',
                  borderRadius: '20px'
                }}
                className="w-[55px] md:w-[74px] h-[3.5px] md:h-[4px]"
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
          {/* Outer White Border Frame */}
          <div
            style={{
              width: '510px',
              maxWidth: '95vw',
              background: '#FFFFFF',
              borderRadius: '28px',
              padding: '10px',
              boxSizing: 'border-box'
            }}
            className="shadow-2xl"
          >
            {/* Inner Pink Card */}
            <div
              style={{
                width: '100%',
                background: 'rgba(255, 234, 235, 1)',
                borderRadius: '20px',
                padding: '36px 24px 32px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxSizing: 'border-box',
                position: 'relative'
              }}
            >
              {/* Top Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletePhase(0);
                }}
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
                  top: '16px',
                  right: '16px',
                  zIndex: 50,
                  padding: 0
                }}
                className="text-white hover:opacity-80 transition-opacity shrink-0 cursor-pointer"
              >
                <FiX size={16} strokeWidth={2.5} className="pointer-events-none" />
              </button>

              {/* Red Circle Exclamation Icon */}
              <img
                src="/coins/image copy.png"
                alt="Alert"
                style={{
                  width: '60px',
                  height: '60px',
                  marginBottom: '18px',
                  objectFit: 'contain'
                }}
                className="select-none"
              />

              {/* Title & Description */}
              <h3
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: '30px',
                  color: 'rgba(14, 15, 12, 1)',
                  margin: '0 0 10px 0'
                }}
              >
                Delete Account!
              </h3>
              <p
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '15px',
                  lineHeight: '24px',
                  color: 'rgba(14, 15, 12, 1)',
                  maxWidth: '380px',
                  margin: '0 0 28px 0'
                }}
              >
                Deleting your account is permanent. All associated data will be wiped.
              </p>

              {/* Action Buttons Column (Vertical Alignment) */}
              <div className="flex flex-col gap-2 md:gap-2.5 w-full max-w-[366px]">
                <button
                  type="button"
                  onClick={() => setDeletePhase(0)}
                  style={{
                    height: '52px',
                    width: '100%',
                    background: '#202C44',
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
                  className="hover:bg-[#182338] transition-colors shadow-sm cursor-pointer active:scale-[0.99]"
                >
                  <span>Cancle</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete()}
                  style={{
                    height: '52px',
                    width: '100%',
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
                  className="hover:bg-[#CC001C] transition-colors shadow-sm cursor-pointer active:scale-[0.99]"
                >
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Modal */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            fontFamily: '"Poppins", sans-serif'
          }}
          className="relative shadow-2xl overflow-y-auto max-h-[95vh] w-full max-w-[430px] md:max-w-none md:w-[626px] bg-[#FFFFFF] rounded-[22px] md:rounded-[28px] p-2 sm:p-2.5 md:p-[10px] flex flex-col gap-2.5 md:gap-[16px] box-border [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
        >
          {/* Top Header Card (Mobile: width: 406px, height: 137px, border-radius: 16px, background: rgba(248, 245, 239, 1); Desktop: width: 606px, height: 143px) */}
          <div
            style={{
              background: 'rgba(248, 245, 239, 1)',
              borderRadius: '16px',
              opacity: 1,
              transform: 'rotate(0deg)',
              boxSizing: 'border-box',
            }}
            className="w-full md:w-[606px] max-w-full h-auto md:h-[143px] p-[16px_16px_14px_16px] md:p-[24px_28px] relative flex flex-col gap-2.5 md:justify-between shrink-0"
          >
            {/* Close Button (Circle with X) */}
            <button
              onClick={onClose}
              style={{
                width: '30px',
                height: '30px',
                background: '#000000',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                padding: 0
              }}
              className="text-white hover:opacity-80 transition-opacity shrink-0 absolute top-3.5 right-3.5 md:top-[20px] md:right-[20px] md:w-[32px] md:h-[32px]"
            >
              <FiX size={15} strokeWidth={2.5} />
            </button>

            {/* Whole unit containing heading, below text, and bar */}
            <div
              className="w-full md:w-[422px] max-w-full flex flex-col gap-2 md:gap-[16px]"
            >
              {/* Heading and text */}
              <div
                className="flex flex-col gap-1 md:gap-[20px] pr-7 md:pr-0"
              >
                <h2
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0,
                    opacity: 1,
                  }}
                  className="w-full md:w-[284px] max-w-full text-[22px] md:text-[35px] leading-tight md:leading-[60px] flex items-center"
                >
                  Account Settings
                </h2>
                <p
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    letterSpacing: '0%',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0,
                    opacity: 1,
                  }}
                  className="w-full md:w-[422px] max-w-[367px] md:max-w-full text-[12px] md:text-[16px] leading-[16px] md:leading-[26px] flex items-center"
                >
                  Manage your identity, avatars, and account security
                </p>
              </div>

              {/* Below accent bar */}
              <div
                style={{
                  background: 'rgba(85, 88, 211, 1)',
                  borderRadius: '20px',
                  opacity: 1,
                }}
                className="w-[55px] md:w-[74px] h-[3.5px] md:h-[4px]"
              />
            </div>
          </div>

          {/* Display Name Input */}
          <div
            className="w-full md:w-[607px] md:max-w-full flex flex-col gap-1.5 md:gap-[10px] box-border shrink-0"
          >
            <label
              style={{
                fontFamily: '"Poppins", sans-serif',
                color: 'rgba(14, 15, 12, 1)',
                margin: 0,
              }}
              className="font-medium text-[12.5px] md:text-[16px] leading-tight md:leading-[26px]"
            >
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              style={{
                background: 'rgba(239, 239, 239, 1)',
                color: '#1E293B',
                border: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: '"Poppins", sans-serif',
              }}
              className="w-full md:w-[607px] md:max-w-full h-[44px] md:h-[58px] rounded-[12px] md:rounded-[50px] px-3.5 md:px-[24px] text-[13.5px] md:text-[16px] font-medium focus:ring-2 focus:ring-[#5356FB]/20 transition-all placeholder:text-[#94A3B8]"
              placeholder="FuturisticBug1"
            />
          </div>

          {/* Two Toggle Cards */}
          <div
            className="w-full md:w-[606px] md:max-w-full flex flex-col md:flex-row gap-2.5 md:gap-[10px] md:h-[198px] shrink-0"
          >
            {/* Private Profile Card */}
            <div
              style={{
                background: 'rgba(248, 245, 239, 1)',
                boxSizing: 'border-box',
              }}
              className="flex-1 w-full md:max-w-full rounded-[18px] md:rounded-[30px] p-4 md:p-[26px_16px_26px_17px] md:h-[198px] flex flex-col justify-between gap-3 md:gap-0"
            >
              <div className="flex items-center justify-between gap-2">
                <h3
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0,
                    opacity: 1,
                  }}
                  className="text-[20px] md:text-[20px] leading-tight md:leading-[24px]"
                >
                  Private Profile
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  style={{
                    backgroundColor: isPrivate ? '#00A843' : '#D1D5DB',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 3px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}
                  className="w-[44px] md:w-[48px] h-[24px] md:h-[28px] rounded-full"
                >
                  <span
                    style={{
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      transition: 'transform 0.2s'
                    }}
                    className={`inline-block shadow-sm w-[18px] md:w-[22px] h-[18px] md:h-[22px] ${isPrivate ? 'translate-x-[20px]' : 'translate-x-0'}`}
                  />
                </button>
              </div>
              <p
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  letterSpacing: '0%',
                  color: 'rgba(14, 15, 12, 1)',
                  margin: 0,
                  opacity: 1,
                }}
                className="w-full max-w-[363px] md:max-w-full text-[16px] md:text-[14.5px] leading-[26px] md:leading-[22px]"
              >
                Hide specific offer details (like survey names) from other users on your public profile and the live earning feed.
              </p>
            </div>

            {/* 2FA Card */}
            <div
              style={{
                background: 'rgba(248, 245, 239, 1)',
                boxSizing: 'border-box',
              }}
              className="flex-1 w-full md:max-w-full rounded-[18px] md:rounded-[30px] p-4 md:p-[26px_16px_26px_17px] md:h-[198px] flex flex-col justify-between md:justify-start gap-3 md:gap-[12px]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'rgba(14, 15, 12, 1)',
                    margin: 0,
                    opacity: 1,
                  }}
                  className="text-[20px] md:text-[20px] leading-tight md:leading-[23px]"
                >
                  2 Factor<br />Authorization
                </h3>
                <button
                  type="button"
                  onClick={handle2FAToggle}
                  style={{
                    backgroundColor: is2FAEnabled ? '#00A843' : '#D1D5DB',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 3px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}
                  className="w-[44px] md:w-[48px] h-[24px] md:h-[28px] rounded-full mt-0.5 md:mt-0"
                >
                  <span
                    style={{
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      transition: 'transform 0.2s'
                    }}
                    className={`inline-block shadow-sm w-[18px] md:w-[22px] h-[18px] md:h-[22px] ${is2FAEnabled ? 'translate-x-[20px]' : 'translate-x-0'}`}
                  />
                </button>
              </div>
              <p
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  letterSpacing: '0%',
                  color: 'rgba(14, 15, 12, 1)',
                  margin: 0,
                  opacity: 1,
                }}
                className="w-full max-w-[363px] md:max-w-full text-[16px] md:text-[14.5px] leading-[26px] md:leading-[22px]"
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
              background: '#202C44',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 500,
              letterSpacing: '0%',
              color: '#FFFFFF'
            }}
            className="w-full md:w-[606px] md:max-w-full h-[44px] md:h-[52px] rounded-[12px] md:rounded-[9999px] text-[13.5px] md:text-[16px] md:leading-[28px] gap-2 md:gap-[10px] hover:bg-[#182338] disabled:opacity-50 transition-all shrink-0 active:scale-[0.99] shadow-sm cursor-pointer"
          >
            {saving ? <FiLoader className="animate-spin text-base md:text-lg" /> : null}
            <span>Save Profile</span>
          </button>

          {/* Danger Zone Card */}
          <div
            style={{
              background: 'rgba(255, 234, 235, 1)',
              boxSizing: 'border-box',
            }}
            className="w-full md:w-[606px] md:max-w-full rounded-[18px] md:rounded-[20px] p-3.5 md:p-[26px_14px_25px_19px] md:h-[118px] flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-[10px] shrink-0"
          >
            <div className="flex flex-col gap-1 md:gap-[4px] flex-1">
              <h3
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#000000',
                  margin: 0
                }}
                className="text-[20px] md:text-[18px] leading-tight md:leading-normal"
              >
                Danger Zone
              </h3>
              <p
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  letterSpacing: '0%',
                  color: '#000000',
                  margin: 0
                }}
                className="w-full max-w-[363px] md:max-w-full text-[16px] md:text-[13.5px] leading-[26px] md:leading-[1.4]"
              >
                Deleting your account is permanent. All associated data will be wiped.
              </p>
            </div>

            <button
              onClick={() => setDeletePhase(1)}
              style={{
                background: '#E50020',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                letterSpacing: '0%',
                color: '#FFFFFF',
                whiteSpace: 'nowrap'
              }}
              className="w-full max-w-[366px] md:max-w-none md:w-auto h-[55px] md:h-[46px] rounded-[30px] md:rounded-[9999px] px-[28px] py-[22px] md:py-0 md:px-6 text-[15px] md:text-[16px] md:leading-[28px] gap-[10px] hover:bg-[#CC001C] transition-all shrink-0 active:scale-[0.98] shadow-sm cursor-pointer"
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

      {/* ─── Top Banner Strip (width: 100%, mobile height: 153px, desktop height: 108px, background: rgba(249, 247, 241, 1)) ─── */}
      <div
        className="w-full transition-colors duration-300 shrink-0 h-[153px] lg:h-[108px]"
        style={{
          background: 'rgba(249, 247, 241, 1)',
          opacity: 1,
          transform: 'rotate(0deg)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[1328px] mx-auto px-1.5 sm:px-6 md:px-8 lg:px-0 flex flex-col gap-6 -mt-[73px] lg:-mt-[82px] pb-12"
      >
        {/* ─── PROFILE HERO ─────────────────────────────── */}
        <div className="flex flex-col lg:flex-row items-center lg:items-end gap-5 lg:gap-6 w-full text-center lg:text-left">
          {/* Circular Avatar (shifted 40px right on desktop, centered on mobile) */}
          <div className="relative shrink-0 mx-auto lg:mx-0 lg:ml-[40px]">
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '2.5px solid rgba(36, 50, 77, 1)',
                borderRadius: '50%',
                padding: '4.5px',
                boxSizing: 'border-box',
              }}
              className="w-[146px] h-[146px] lg:w-[164px] lg:h-[164px] shadow-sm flex items-center justify-center"
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

          {/* Details & Actions Row (Mobile: 337px x 128px, gap: 30px, Desktop: flex-1 flex-row justify-between) */}
          <div className="w-full max-w-[337px] lg:max-w-none lg:flex-1 flex flex-col lg:flex-row justify-between items-center gap-[30px] lg:gap-4 mx-auto lg:mx-0 pb-1">
            {/* Identity details (width: 337px, height: 49px, gap: 16px) */}
            <div
              style={{
                width: '337px',
                maxWidth: '100%',
                height: '49px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: 1,
                transform: 'rotate(0deg)',
              }}
              className="gap-[16px] items-center lg:items-start"
            >
              <h1
                style={{
                  width: '337px',
                  maxWidth: '100%',
                  height: '18px',
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: '27px',
                  lineHeight: '18px',
                  letterSpacing: '-0.02em',
                  color: '#000000',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  opacity: 1,
                }}
                className="text-center lg:text-left"
              >
                {mongoUser?.displayName || 'FuturisticBug1'}
              </h1>

              {/* Info tags row (width: 337px, height: 15px, justify-content: space-between on mobile) */}
              <div
                style={{
                  width: '337px',
                  maxWidth: '100%',
                  height: '15px',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
                className="flex items-center justify-between lg:justify-start lg:gap-6 whitespace-nowrap"
              >
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

            {/* Right side: Action buttons (Mobile: width: 304px, height: 49px, justify-content: space-between, Desktop: gap-3) */}
            <div
              className="w-[304px] lg:w-auto h-[49px] flex items-center justify-between lg:justify-start lg:gap-3 shrink-0"
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
                className="hover:opacity-80 transition-opacity shrink-0"
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
                className="hover:opacity-80 transition-opacity shrink-0"
              >
                <img src="/coins/profilecustumize.png" alt="Customize" className="w-[18px] h-[18px] object-contain" />
              </button>

              {/* Copy Referral Link Button (width: 198px, height: 49px, border-radius: 80px, padding: 19px 28px) */}
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/r/${mongoUser?.referralCode || ''}`)}
                style={{
                  width: '198px',
                  height: '49px',
                  borderRadius: '80px',
                  background: 'rgba(36, 50, 77, 1)',
                  paddingTop: '19px',
                  paddingRight: '28px',
                  paddingBottom: '19px',
                  paddingLeft: '28px',
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
        <div className="w-full flex justify-center lg:justify-end">
          <div
            style={{
              width: '1103px',
              maxWidth: '100%',
              gap: '10px',
              opacity: 1,
              transform: 'rotate(0deg)',
            }}
            className="grid grid-cols-1 md:grid-cols-3 w-full gap-3 md:gap-[10px]"
          >
            {/* Offers card (width: 361px, height: 160px, radius: 25px) */}
            <div
              style={{
                borderRadius: '25px',
                background: 'rgba(249, 247, 241, 1)',
                gap: '10px',
                opacity: 1,
                transform: 'rotate(0deg)',
                boxSizing: 'border-box',
              }}
              className="h-[145px] md:h-[160px] p-5 md:p-[23px_23px_25px_23px] flex flex-col justify-between"
            >
              <div>
                <span
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#24324D',
                    display: 'block',
                  }}
                  className="text-[40px] md:text-[45px] leading-none md:leading-[30px]"
                >
                  {profileStats.totalTasksCompleted || 0}
                </span>
              </div>
              {/* Heading and text as one whole (width: 144px, height: 36px, gap: 15px) */}
              <div
                style={{
                  width: '144px',
                  height: '36px',
                  gap: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: 1,
                  transform: 'rotate(0deg)',
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
                borderRadius: '25px',
                background: 'rgba(249, 247, 241, 1)',
                gap: '10px',
                opacity: 1,
                transform: 'rotate(0deg)',
                boxSizing: 'border-box',
              }}
              className="h-[145px] md:h-[160px] p-5 md:p-[23px_23px_25px_23px] flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 md:gap-2.5">
                <img
                  src="/coins/profilecoin.png"
                  alt="Coin"
                  className="w-[24px] h-[24px] md:w-[28px] md:h-[28px] object-contain shrink-0"
                />
                <span
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#ca8a04',
                  }}
                  className="text-[36px] sm:text-[40px] md:text-[45px] leading-none md:leading-[30px]"
                >
                  {Math.max(mongoUser?.totalEarned || 0, profileStats.totalEarnedLifetime || 0).toLocaleString('en-US')}
                </span>
              </div>
              {/* Heading and text as one whole */}
              <div
                style={{
                  width: '144px',
                  height: '36px',
                  gap: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: 1,
                  transform: 'rotate(0deg)',
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
                borderRadius: '25px',
                background: 'rgba(249, 247, 241, 1)',
                gap: '10px',
                opacity: 1,
                transform: 'rotate(0deg)',
                boxSizing: 'border-box',
              }}
              className="h-[145px] md:h-[160px] p-5 md:p-[23px_23px_25px_23px] flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 md:gap-2.5">
                <img
                  src="/coins/profilecoin.png"
                  alt="Coin"
                  className="w-[24px] h-[24px] md:w-[28px] md:h-[28px] object-contain shrink-0"
                />
                <span
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#ca8a04',
                  }}
                  className="text-[36px] sm:text-[40px] md:text-[45px] leading-none md:leading-[30px]"
                >
                  {(profileStats.earnings30Days || 0).toLocaleString('en-US')}
                </span>
              </div>
              {/* Heading and text as one whole */}
              <div
                style={{
                  width: '144px',
                  height: '36px',
                  gap: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: 1,
                  transform: 'rotate(0deg)',
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
            background: 'rgba(249, 247, 241, 1)',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
          className="w-full mx-auto px-1.5 py-4 sm:px-8 sm:py-7 rounded-[20px] md:rounded-[30px] border border-slate-100/60 shadow-sm flex flex-col justify-start gap-3 sm:gap-4 min-h-[500px] md:min-h-[593px]"
        >
          {/* Tab pill bar navigation (Mobile: 2-column grid matching screenshot, Desktop: flex row) */}
          <div
            className="w-full max-w-[839px] mx-auto grid grid-cols-2 md:flex md:flex-nowrap items-center justify-start md:justify-center gap-x-2 gap-y-2 md:gap-[5px] h-auto md:h-[37px]"
          >
            <TabBtn active={activeTab === 'started_offers'} onClick={() => setActiveTab('started_offers')} icon="/coins/profilestarted.png" label="Started Offers" />
            <TabBtn active={activeTab === 'completed_offers'} onClick={() => setActiveTab('completed_offers')} icon="/coins/image copy 3.png" label="Completed Offers" />
            <TabBtn active={activeTab === 'held_offers'} onClick={() => setActiveTab('held_offers')} icon="/coins/profilehold.png" label="Hold Offers" />
            <TabBtn active={activeTab === 'transaction_history'} onClick={() => setActiveTab('transaction_history')} icon="/coins/profiletransition.png" label="Transaction History" />
            <TabBtn active={activeTab === 'chargebacks'} onClick={() => setActiveTab('chargebacks')} icon="/coins/profileback.png" label="Chargebacks" />
          </div>

          {/* Tab Content Box (width: 1295px, min-height: 462px, border-radius: 20px, background: #FFFFFF) */}
          <div
            style={{
              width: '100%',
              maxWidth: '1295px',
              backgroundColor: 'rgba(255, 255, 255, 1)',
              opacity: 1,
              transform: 'rotate(0deg)',
              boxSizing: 'border-box',
            }}
            className="mx-auto shadow-sm flex flex-col justify-between w-full mt-2 rounded-[14px] md:rounded-[20px] p-1 sm:p-4 md:py-4 md:px-1 min-h-[400px] md:min-h-[462px]"
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
                        <div className="w-full">
                          <div className="w-full md:min-w-[800px]">
                            <div
                              style={{
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 400,
                                letterSpacing: '0.06em',
                                color: 'rgba(14, 15, 12, 0.6)',
                                textTransform: 'uppercase',
                              }}
                              className="grid grid-cols-[1fr_60px_60px_56px] md:grid-cols-[1fr_180px_160px_140px] gap-1.5 md:gap-4 px-1.5 sm:px-6 py-2 text-[9.5px] md:text-[14px] md:leading-[26px]"
                            >
                              <div>Offers</div>
                              <div>Started</div>
                              <div>Reward</div>
                              <div className="text-center">Status</div>
                            </div>
                            <div className="flex flex-col">
                              {paginatedStarted.map((offer, idx) => (
                                <ClickedOfferRow
                                  key={offer._id}
                                  offer={offer}
                                  index={idx}
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
                        <div className="w-full">
                          <div className="w-full md:min-w-[700px]">
                            <div
                              style={{
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 400,
                                letterSpacing: '0.06em',
                                color: 'rgba(14, 15, 12, 0.6)',
                                textTransform: 'uppercase',
                              }}
                              className="grid grid-cols-[1fr_75px_65px] md:grid-cols-[1fr_180px_150px] gap-1.5 md:gap-4 px-1.5 sm:px-6 py-2 text-[9.5px] md:text-[14px] md:leading-[26px]"
                            >
                              <div>Offers</div>
                              <div>Completed</div>
                              <div>Reward</div>
                            </div>
                            <div className="flex flex-col">
                              {paginatedCompleted.map((offer, idx) => (
                                <div
                                  key={offer._id}
                                  style={{
                                    width: '100%',
                                    borderRadius: idx % 2 === 0 ? '10px' : '0px',
                                    backgroundColor: idx % 2 === 0 ? 'rgba(249, 247, 241, 1)' : 'transparent',
                                  }}
                                  className="px-1.5 sm:px-6 py-2.5 sm:py-3.5 min-h-[50px] md:min-h-[69px] grid grid-cols-[1fr_75px_65px] md:grid-cols-[1fr_180px_150px] gap-1.5 md:gap-4 items-center"
                                >
                                  <span
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
                                    className="text-[#1e293b] leading-tight break-words line-clamp-2 text-[10px] md:text-[16px] md:leading-[26px]"
                                  >
                                    {offer.title}
                                  </span>
                                  <span
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
                                    className="text-[#1e293b] text-[10px] md:text-[16px] leading-tight md:leading-[26px]"
                                  >
                                    {offer.completedAt ? new Date(offer.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                  </span>
                                  <div
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: 'rgba(190, 146, 0, 1)' }}
                                    className="flex items-center gap-0.5 md:gap-1.5 text-[10px] md:text-[16px]"
                                  >
                                    <img src="/coins/profilecoin1.png" alt="Coin" className="w-3 h-3 md:w-[18px] md:h-[18px] shrink-0 object-contain" />
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
                        <div className="w-full">
                          <div className="w-full md:min-w-[800px]">
                            <div
                              style={{
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 400,
                                letterSpacing: '0.06em',
                                color: 'rgba(14, 15, 12, 0.6)',
                                textTransform: 'uppercase',
                              }}
                              className="grid grid-cols-[1fr_58px_56px_42px_45px] md:grid-cols-[1fr_140px_130px_130px_130px] gap-1 md:gap-4 px-1.5 sm:px-6 py-2 text-[9px] md:text-[14px] md:leading-[26px]"
                            >
                              <div>Offers</div>
                              <div>Completed</div>
                              <div>Reward</div>
                              <div>Hold</div>
                              <div className="text-right">Release</div>
                            </div>
                            <div className="flex flex-col">
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
                                      borderRadius: idx % 2 === 0 ? '10px' : '0px',
                                      backgroundColor: idx % 2 === 0 ? 'rgba(249, 247, 241, 1)' : 'transparent',
                                    }}
                                    className="px-1.5 sm:px-6 py-2.5 sm:py-3.5 min-h-[50px] md:min-h-[69px] grid grid-cols-[1fr_58px_56px_42px_45px] md:grid-cols-[1fr_140px_130px_130px_130px] gap-1 md:gap-4 items-center"
                                  >
                                    <span
                                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
                                      className="text-[#1e293b] leading-tight break-words line-clamp-2 text-[10px] md:text-[16px] md:leading-[26px]"
                                    >
                                      {offer.description}
                                    </span>
                                    <span
                                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
                                      className="text-[#1e293b] text-[10px] md:text-[16px] leading-tight md:leading-[26px]"
                                    >
                                      {offer.createdAt ? new Date(offer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                    </span>
                                    <div
                                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: 'rgba(190, 146, 0, 1)' }}
                                      className="flex items-center gap-0.5 md:gap-1.5 text-[10px] md:text-[16px]"
                                    >
                                      <img src="/coins/profilecoin1.png" alt="Coin" className="w-3 h-3 md:w-[18px] md:h-[18px] shrink-0 object-contain" />
                                      <span>{(offer.amount || 0).toLocaleString('de-DE')}</span>
                                    </div>
                                    <span
                                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
                                      className="text-[#1e293b] text-[10px] md:text-[16px]"
                                    >
                                      {holdPeriodDays}d
                                    </span>
                                    <div
                                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}
                                      className={`text-right text-[10px] md:text-[16px] ${offer.isReadyToRelease ? 'text-emerald-600' : 'text-[#1e293b]'}`}
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
                      <div className="w-full">
                        <div className="w-full md:min-w-[850px]">
                          <div
                            style={{
                              fontFamily: 'Poppins, sans-serif',
                              fontWeight: 400,
                              letterSpacing: '0.06em',
                              color: 'rgba(14, 15, 12, 0.6)',
                              textTransform: 'uppercase',
                            }}
                            className="grid grid-cols-[48px_54px_1fr_60px_48px] md:grid-cols-[130px_140px_1fr_140px_120px] gap-1 md:gap-4 px-1.5 sm:px-6 py-2 text-[9px] md:text-[14px] md:leading-[26px]"
                          >
                            <div>Date</div>
                            <div>Type</div>
                            <div>Description</div>
                            <div>Amount</div>
                            <div className="text-center">Status</div>
                          </div>
                          <div className="flex flex-col">
                            {txHistory.dataList.map((tx, idx) => {
                              const config = TX_TYPE_LABEL[tx.transactionType] || { label: tx.transactionType, color: 'text-slate-500' };
                              const isDebit = tx.amount < 0;
                              const isPending = tx.status === 'pending';
                              const isRejected = tx.status === 'rejected' || tx.status === 'failed';
                              return (
                                <div
                                  key={tx._id}
                                  style={{
                                    width: '100%',
                                    borderRadius: idx % 2 === 0 ? '10px' : '0px',
                                    backgroundColor: idx % 2 === 0 ? 'rgba(249, 247, 241, 1)' : 'transparent',
                                  }}
                                  className="px-1.5 sm:px-6 py-2 sm:py-3.5 min-h-[50px] md:min-h-[69px] grid grid-cols-[48px_54px_1fr_60px_48px] md:grid-cols-[130px_140px_1fr_140px_120px] gap-1 md:gap-4 items-center"
                                >
                                  <span
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
                                    className="text-[#1e293b] text-[9.5px] md:text-[16px] leading-[13px] md:leading-[26px]"
                                  >
                                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                  </span>
                                  <span
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
                                    className="text-[#1e293b] text-[9.5px] md:text-[16px] leading-[13px] md:leading-[26px] truncate"
                                  >
                                    {config.label}
                                  </span>
                                  <span
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
                                    className="text-[#1e293b] text-[9.5px] md:text-[16px] leading-[13px] md:leading-[26px] line-clamp-2 pr-0.5"
                                    title={tx.description}
                                  >
                                    {tx.description}
                                  </span>
                                  <div
                                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: 'rgba(190, 146, 0, 1)' }}
                                    className="flex items-center gap-0.5 md:gap-1.5 text-[9.5px] md:text-[16px]"
                                  >
                                    <img src="/coins/profilecoin1.png" alt="Coin" className="w-3 h-3 md:w-[18px] md:h-[18px] shrink-0 object-contain" />
                                    <span>{Math.abs(tx.amount || 0).toLocaleString('de-DE')}</span>
                                  </div>
                                  <div className="flex justify-center">
                                    <span
                                      style={{
                                        fontFamily: 'Poppins, sans-serif',
                                        fontWeight: 500,
                                        backgroundColor:
                                          tx.status === 'completed'
                                            ? 'rgba(16, 185, 129, 1)'
                                            : isRejected
                                              ? 'rgba(224, 30, 33, 1)'
                                              : '#24324D',
                                        color: '#ffffff',
                                      }}
                                      className="inline-flex items-center justify-center whitespace-nowrap text-[8.5px] md:text-[16px] px-1.5 md:px-[18px] py-0.5 md:py-[3px] rounded-[40px] leading-tight"
                                    >
                                      {tx.status === 'completed'
                                        ? 'Completed'
                                        : isRejected
                                          ? 'Rejected'
                                          : tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
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
                      <div className="w-full">
                        <div className="w-full md:min-w-[700px]">
                          <div
                            style={{
                              fontFamily: 'Poppins, sans-serif',
                              fontWeight: 400,
                              letterSpacing: '0.06em',
                              color: 'rgba(14, 15, 12, 0.6)',
                              textTransform: 'uppercase',
                            }}
                            className="grid grid-cols-[1fr_75px_65px] md:grid-cols-[1fr_180px_150px] gap-1.5 md:gap-4 px-1.5 sm:px-6 py-2 text-[9.5px] md:text-[14px] md:leading-[26px]"
                          >
                            <div>Offers</div>
                            <div>Started</div>
                            <div>Amount</div>
                          </div>
                          <div className="flex flex-col">
                            {chargebacks.dataList.map((tx, idx) => (
                              <div
                                key={tx._id}
                                style={{
                                  width: '100%',
                                  borderRadius: idx % 2 === 0 ? '10px' : '0px',
                                  backgroundColor: idx % 2 === 0 ? 'rgba(249, 247, 241, 1)' : 'transparent',
                                }}
                                className="px-1.5 sm:px-6 py-2.5 sm:py-3.5 min-h-[50px] md:min-h-[69px] grid grid-cols-[1fr_75px_65px] md:grid-cols-[1fr_180px_150px] gap-1.5 md:gap-4 items-center"
                              >
                                <span
                                  style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
                                  className="text-[#1e293b] leading-tight break-words line-clamp-2 text-[10px] md:text-[16px] md:leading-[26px]"
                                >
                                  {tx.description}
                                </span>
                                <span
                                  style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}
                                  className="text-[#1e293b] text-[10px] md:text-[16px] leading-tight md:leading-[26px]"
                                >
                                  {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                </span>
                                <div
                                  style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: 'rgba(190, 146, 0, 1)' }}
                                  className="flex items-center gap-0.5 md:gap-1.5 text-[10px] md:text-[16px]"
                                >
                                  <img src="/coins/profilecoin1.png" alt="Coin" className="w-3 h-3 md:w-[18px] md:h-[18px] shrink-0 object-contain" />
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
