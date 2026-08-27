import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import WithdrawalModal from '../components/wallet/WithdrawalModal';
import MyBooksSection from '../components/wallet/MyBooksSection';
import CoinDisplay from '../components/CoinDisplay';
import { FiCheck, FiFeather, FiTruck } from 'react-icons/fi';
import { FaPaypal } from 'react-icons/fa';
import { SiLitecoin, SiNetflix, SiGoogleplay } from 'react-icons/si';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.38 } } };

const PromoCodeRedeem = ({ onSuccess }) => {
  const { currentUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null); // { type: 'success'|'error', text: '' }

  // Lock scroll when popup is open
  useEffect(() => {
    if (!popup) return;
    document.body.style.overflow = 'hidden';
    document.body.style.overflowY = 'hidden';
    document.documentElement.style.overflowY = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.body.style.overflowY = '';
      document.documentElement.style.overflowY = '';
    };
  }, [popup]);

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setPopup(null);

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/wallet/redeem-promo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });
      const data = await res.json();

      if (data.success) {
        setPopup({ type: 'success', coins: data.coinsEarned, newBalance: data.newBalance });
        setCode('');
        if (onSuccess) onSuccess(data.newBalance);
      } else {
        setPopup({ type: 'error', text: data.error || 'Failed to redeem code' });
      }
    } catch (err) {
      setPopup({ type: 'error', text: 'Network error. Try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        variants={item}
        className="w-full flex flex-col justify-between shrink-0 shadow-sm"
        style={{
          width: '100%',
          maxWidth: '1328px',
          minHeight: '212px',
          borderRadius: '30px',
          background: 'rgba(249, 247, 241, 1)',
          paddingTop: '36px',
          paddingRight: '28px',
          paddingBottom: '39px',
          paddingLeft: '30px',
          gap: '25px',
          boxSizing: 'border-box',
          opacity: 1,
        }}
      >
        <div
          className="flex flex-col justify-center"
          style={{
            width: '100%',
            maxWidth: '331px',
            height: '46px',
            gap: '16px',
            boxSizing: 'border-box',
            opacity: 1,
          }}
        >
          <h2
            style={{
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontWeight: 700,
              fontSize: '30px',
              lineHeight: '20px',
              letterSpacing: '-0.02em',
              color: '#000000',
              width: '100%',
              maxWidth: '298px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              margin: 0,
              padding: 0,
              opacity: 1,
            }}
          >
            Redeem Promo Code
          </h2>
          <p
            style={{
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              lineHeight: '10px',
              letterSpacing: '0%',
              color: '#000000',
              width: '100%',
              maxWidth: '331px',
              height: '10px',
              display: 'flex',
              alignItems: 'center',
              margin: 0,
              padding: 0,
              opacity: 1,
            }}
          >
            Have a code? Enter it below to claim free coins.
          </p>
        </div>

        <form
          onSubmit={handleRedeem}
          className="w-full flex items-center justify-between shadow-none border-none outline-none"
          style={{
            width: '100%',
            maxWidth: '1270px',
            height: '66px',
            borderRadius: '50px',
            paddingTop: '8px',
            paddingRight: '10px',
            paddingBottom: '9px',
            paddingLeft: '25px',
            background: 'rgba(255, 255, 255, 1)',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            opacity: 1,
          }}
        >
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code here"
            className="w-full bg-transparent border-none outline-none p-0 uppercase placeholder:text-black/56"
            style={{
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 400,
              fontSize: '14px',
              lineHeight: '20px',
              letterSpacing: '0%',
              color: 'rgba(0, 0, 0, 1)',
            }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="h-[44px] sm:h-[48px] px-8 sm:px-10 rounded-full bg-[#1E2538] hover:bg-[#151b29] text-white font-semibold text-[15px] flex items-center justify-center shrink-0 transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-sm"
            style={{ fontFamily: '"Poppins", sans-serif' }}
          >
            {loading ? '...' : 'Redeem'}
          </button>
        </form>
      </motion.div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {popup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setPopup(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center justify-center w-full max-w-[480px] bg-white rounded-[24px] p-8 border border-gray-100 shadow-2xl relative gap-5"
              >
                <div
                  className="flex items-center justify-center rounded-full shrink-0"
                  style={{
                    width: 72,
                    height: 72,
                    background: popup.type === 'success' ? 'rgba(73,178,101,0.15)' : 'rgba(239, 68, 68, 0.1)',
                  }}
                >
                  {popup.type === 'success' ? (
                    <FiCheck size={36} className="text-[#49B265]" />
                  ) : (
                    <img src="/coins/war2.png" alt="Error" className="w-[48px] h-[48px] object-contain" />
                  )}
                </div>

                {/* Title */}
                <div className="flex flex-col items-center gap-2 w-full px-4 text-center">
                  <h2
                    className="m-0 p-0 font-bold text-[26px] text-[#0E0F0C]"
                    style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                  >
                    {popup.type === 'success' ? 'Code Redeemed!' : 'Redemption Failed'}
                  </h2>
                  <p
                    className="m-0 p-0 font-medium text-[15px] text-[#71717A]"
                    style={{ fontFamily: '"Poppins", sans-serif' }}
                  >
                    {popup.type === 'success'
                      ? <span className="flex items-center justify-center gap-2">+<CoinDisplay amount={popup.coins} size={18} /> added to your wallet!</span>
                      : popup.text}
                  </p>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setPopup(null)}
                  className="flex items-center justify-center w-full h-[48px] rounded-full bg-[#1E2538] hover:bg-[#151b29] text-white font-semibold text-[15px] transition-all mt-2 cursor-pointer"
                  style={{ fontFamily: '"Poppins", sans-serif' }}
                >
                  {popup.type === 'success' ? 'Awesome!' : 'Try Again'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

const Wallet = () => {
  const { currentUser, mongoUser, setMongoUser } = useAuth();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [filterType, setFilterType] = useState(null);
  const [settings, setSettings] = useState(null);
  const [txRefresh, setTxRefresh] = useState(0);
  const [settingsLoad, setSettingsLoad] = useState(true);
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [books, setBooks] = useState([]);
  const [booksVisible, setBooksVisible] = useState(false);
  const [booksLoading, setBooksLoading] = useState(true);

  // Load wallet settings (fee %, methods, live rate)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setSettingsLoad(true);
        const token = await currentUser.getIdToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/wallet/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setSettings(data);
      } catch (err) {
        console.error('Failed to load wallet settings:', err);
      } finally {
        setSettingsLoad(false);
      }
    };
    if (currentUser) fetchSettings();
  }, [currentUser]);

  // Load books in the background
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setBooksLoading(true);
        const token = await currentUser.getIdToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/books`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setBooks(data.books);
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          // Show books ONLY if: worldwide mode OR backend confirmed real German IP (no VPN)
          const visible = isLocalhost || !data.booksGermanyOnly || data.isGermanIP === true;
          setBooksVisible(visible);
        }
      } catch (err) {
        console.error('Failed to load books:', err);
      } finally {
        setBooksLoading(false);
      }
    };
    if (currentUser) fetchBooks();
  }, [currentUser]);

  // After successful withdrawal, refresh balance in header
  const handleWithdrawSuccess = useCallback((newBalance) => {
    if (setMongoUser) {
      setMongoUser((prev) => ({ ...prev, walletBalance: newBalance }));
    }
    setTxRefresh((n) => n + 1);
  }, [setMongoUser]);

  const balance = mongoUser?.walletBalance ?? 0;

  const handleOpenWithdrawal = (type) => {
    setFilterType(type);
    setShowWithdraw(true);
  };

  return (
    <DashboardLayout showLiveBar={true} fullWidth={true}>
      <div className="w-full min-h-[calc(100vh-200px)] flex flex-col items-center">
        {/* ─── Top Banner Area (Warm Background: rgba(249, 247, 241, 1)) ─── */}
        <div
          className="w-full flex justify-center items-center transition-colors duration-300"
          style={{
            background: 'rgba(249, 247, 241, 1)',
            minHeight: '248px',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          <div
            className="w-full mx-auto px-4 md:px-0 py-6 sm:py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            style={{
              maxWidth: '960px',
              minHeight: '165px',
              boxSizing: 'border-box',
            }}
          >
            {/* Title & Description */}
            <div
              className="flex flex-col justify-center"
              style={{
                width: '100%',
                maxWidth: '354px',
                minHeight: '70px',
                gap: '16px',
                opacity: 1,
                boxSizing: 'border-box',
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
                  padding: 0,
                }}
              >
                Withdraw
              </h1>
              <p
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '26px',
                  letterSpacing: '0%',
                  color: '#000000',
                  margin: 0,
                  padding: 0,
                  maxWidth: '354px',
                }}
              >
                Choose your preferred withdrawal method and convert your coins into real rewards.
              </p>
            </div>

            {/* Your Balance Card */}
            <motion.div
              variants={item}
              className="bg-white shadow-sm flex flex-col shrink-0"
              style={{
                width: '100%',
                maxWidth: '402px',
                height: '165px',
                borderRadius: '20px',
                padding: '5px',
                boxSizing: 'border-box',
                opacity: 1,
              }}
            >
              {/* Header Ribbon / Pill */}
              <div
                className="flex items-center"
                style={{
                  width: '100%',
                  maxWidth: '392px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(36, 50, 77, 0.08)',
                  paddingLeft: '16px',
                  gap: '10px',
                  boxSizing: 'border-box',
                  opacity: 1,
                }}
              >
                <span
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '15px',
                    lineHeight: '10px',
                    letterSpacing: '-0.02em',
                    color: '#24324D',
                    minWidth: '93px',
                    height: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 1,
                  }}
                >
                  Your Balance
                </span>
              </div>

              {/* Balance & Rate Details (Vertically Centered in remaining space, slightly above) */}
              <div className="flex-1 flex flex-col items-center justify-center gap-3.5 -translate-y-[4px]">
                <div
                  className="flex items-center justify-center gap-1.5"
                  style={{
                    height: '27px',
                    opacity: 1,
                  }}
                >
                  <img
                    src="/coins/withdraw coin.png"
                    alt="Coin"
                    className="w-[24px] h-[24px] object-contain shrink-0"
                  />
                  <span
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '41px',
                      lineHeight: '27px',
                      letterSpacing: '-0.02em',
                      color: '#D99806',
                      height: '27px',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 1,
                    }}
                  >
                    {balance.toLocaleString('de-DE')}
                  </span>
                </div>
                <div
                  className="flex items-center justify-center gap-1.5 mt-0.5"
                  style={{
                    minWidth: '103px',
                    height: '11px',
                    opacity: 1,
                  }}
                >
                  <img
                    src="/coins/procoinicon.png"
                    alt="Coin"
                    className="w-[12px] h-[12px] object-contain shrink-0"
                  />
                  <span
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '16px',
                      lineHeight: '28px',
                      letterSpacing: '0%',
                      color: '#D99806',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {settings?.coinsPerUSD ? settings.coinsPerUSD.toLocaleString('de-DE') : '1.000'}
                    <span style={{ color: '#000000' }}>= 1 USD</span>
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Main Content Area ───────────────────────────────────────── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full max-w-[1328px] mx-auto px-4 md:px-8 lg:px-0 py-8 sm:py-10 flex flex-col gap-8"
        >

          {/* ── Withdrawal Options Cards (3 Columns) ────────────────────── */}
          <motion.div
            variants={item}
            className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center w-full mx-auto"
            style={{
              width: '100%',
              maxWidth: '1327px',
              minHeight: '462px',
              gap: '23px',
              opacity: 1,
            }}
          >
            {/* Card 1: PayPal & Litecoin */}
            <div
              className="flex flex-col justify-between shrink-0 shadow-sm"
              style={{
                width: '100%',
                maxWidth: '427px',
                height: '462px',
                borderRadius: '30px',
                background: 'rgba(249, 247, 241, 1)',
                padding: '6px 6px 20px 6px',
                boxSizing: 'border-box',
                opacity: 1,
              }}
            >
              <div className="flex flex-col">
                {/* Banner Area Image */}
                <div
                  className="w-full flex items-center justify-center overflow-hidden"
                  style={{
                    width: '100%',
                    maxWidth: '416px',
                    height: '252px',
                    borderRadius: '24px',
                    opacity: 1,
                  }}
                >
                  <img
                    src="/coins/paypalbox1.png"
                    alt="PayPal & Litecoin"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Content */}
                <div className="px-3.5 mt-3">
                  <h3
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '26px',
                      lineHeight: '17px',
                      letterSpacing: '-0.02em',
                      color: '#0E0F0C',
                      width: '100%',
                      maxWidth: '379px',
                      height: '17px',
                      display: 'flex',
                      alignItems: 'center',
                      margin: 0,
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    PayPal & Litecoin
                  </h3>
                  <p
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: '25px',
                      letterSpacing: '0%',
                      color: '#71717A',
                      width: '100%',
                      maxWidth: '296px',
                      minHeight: '35px',
                      margin: 0,
                      padding: 0,
                      marginTop: '12px',
                      opacity: 1,
                    }}
                  >
                    Withdraw your earnings to your PayPal account or Litecoin wallet.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="w-full flex justify-center px-3.5">
                <button
                  onClick={() => handleOpenWithdrawal('paypal_litecoin')}
                  disabled={settingsLoad}
                  className="w-full flex items-center justify-center transition-colors cursor-pointer bg-white text-black hover:bg-[#24324D] hover:text-white active:bg-[#24324D] active:text-white disabled:opacity-50 shadow-none border-none outline-none"
                  style={{
                    maxWidth: '379px',
                    height: '49px',
                    borderRadius: '80px',
                    padding: '19px 28px',
                    gap: '10px',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 600,
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    opacity: 1,
                  }}
                >
                  Withdraw Now
                </button>
              </div>
            </div>

            {/* Card 2: Gift Cards */}
            <div
              className="flex flex-col justify-between shrink-0 shadow-sm"
              style={{
                width: '100%',
                maxWidth: '427px',
                height: '462px',
                borderRadius: '30px',
                background: 'rgba(249, 247, 241, 1)',
                padding: '6px 6px 20px 6px',
                boxSizing: 'border-box',
                opacity: 1,
              }}
            >
              <div className="flex flex-col">
                {/* Banner Area Image */}
                <div
                  className="w-full flex items-center justify-center overflow-hidden"
                  style={{
                    width: '100%',
                    maxWidth: '416px',
                    height: '252px',
                    borderRadius: '24px',
                    opacity: 1,
                  }}
                >
                  <img
                    src="/coins/giftcardbox2.png"
                    alt="Gift Cards"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Content */}
                <div className="px-3.5 mt-3">
                  <h3
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '26px',
                      lineHeight: '17px',
                      letterSpacing: '-0.02em',
                      color: '#0E0F0C',
                      width: '100%',
                      maxWidth: '379px',
                      height: '17px',
                      display: 'flex',
                      alignItems: 'center',
                      margin: 0,
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    Gift Cards
                  </h3>
                  <p
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: '25px',
                      letterSpacing: '0%',
                      color: '#71717A',
                      width: '100%',
                      maxWidth: '296px',
                      minHeight: '35px',
                      margin: 0,
                      padding: 0,
                      marginTop: '12px',
                      opacity: 1,
                    }}
                  >
                    Choose from a variety of popular gift cards and treat yourself.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="w-full flex justify-center px-3.5">
                <button
                  onClick={() => handleOpenWithdrawal('giftcards')}
                  disabled={settingsLoad}
                  className="w-full flex items-center justify-center transition-colors cursor-pointer bg-white text-black hover:bg-[#24324D] hover:text-white active:bg-[#24324D] active:text-white disabled:opacity-50 shadow-none border-none outline-none"
                  style={{
                    maxWidth: '379px',
                    height: '49px',
                    borderRadius: '80px',
                    padding: '19px 28px',
                    gap: '10px',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 600,
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    opacity: 1,
                  }}
                >
                  Withdraw Now
                </button>
              </div>
            </div>

            {/* Card 3: Your Books */}
            <div
              className="flex flex-col justify-between shrink-0 shadow-sm"
              style={{
                width: '100%',
                maxWidth: '427px',
                height: '462px',
                borderRadius: '30px',
                background: 'rgba(249, 247, 241, 1)',
                padding: '6px 6px 20px 6px',
                boxSizing: 'border-box',
                opacity: 1,
              }}
            >
              <div className="flex flex-col">
                {/* Banner Area Image */}
                <div
                  className="w-full flex items-center justify-center overflow-hidden"
                  style={{
                    width: '100%',
                    maxWidth: '416px',
                    height: '252px',
                    borderRadius: '24px',
                    opacity: 1,
                  }}
                >
                  <img
                    src="/coins/bookcardbox3.png"
                    alt="Your Books"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Content */}
                <div className="px-3.5 mt-3">
                  <h3
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '26px',
                      lineHeight: '17px',
                      letterSpacing: '-0.02em',
                      color: '#0E0F0C',
                      width: '100%',
                      maxWidth: '379px',
                      height: '17px',
                      display: 'flex',
                      alignItems: 'center',
                      margin: 0,
                      padding: 0,
                      opacity: 1,
                    }}
                  >
                    Your Books
                  </h3>
                  <p
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      lineHeight: '25px',
                      letterSpacing: '0%',
                      color: '#71717A',
                      width: '100%',
                      maxWidth: '296px',
                      minHeight: '35px',
                      margin: 0,
                      padding: 0,
                      marginTop: '12px',
                      opacity: 1,
                    }}
                  >
                    Redeem your coins for my books. Personally signed - only in Germany.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="w-full flex justify-center px-3.5">
                <button
                  onClick={() => setShowBookSelector(true)}
                  className="w-full flex items-center justify-center transition-colors cursor-pointer bg-white text-black hover:bg-[#24324D] hover:text-white active:bg-[#24324D] active:text-white disabled:opacity-50 shadow-none border-none outline-none"
                  style={{
                    maxWidth: '379px',
                    height: '49px',
                    borderRadius: '80px',
                    padding: '19px 28px',
                    gap: '10px',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 600,
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    opacity: 1,
                  }}
                >
                  Withdraw Now
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Promo Code Redeemer ─────────────────────────────────────── */}
          <PromoCodeRedeem onSuccess={handleWithdrawSuccess} />
        </motion.div>
      </div>

      {/* ── Withdrawal Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showWithdraw && settings && (
          <WithdrawalModal
            settings={settings}
            balance={balance}
            filterType={filterType}
            onClose={() => setShowWithdraw(false)}
            onSuccess={handleWithdrawSuccess}
          />
        )}
      </AnimatePresence>

      {/* ── Select Book Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showBookSelector && (
          <MyBooksSection
            balance={balance}
            preFetchedBooks={books}
            preFetchedLoading={booksLoading}
            preFetchedVisible={booksVisible}
            onBooksUpdate={setBooks}
            onClose={() => setShowBookSelector(false)}
            onBalanceUpdate={(newBalance) => {
              if (setMongoUser) setMongoUser(prev => ({ ...prev, walletBalance: newBalance }));
              setTxRefresh(n => n + 1);
            }}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Wallet;
