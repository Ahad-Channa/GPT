import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import WithdrawalModal from '../components/wallet/WithdrawalModal';
import MyBooksSection from '../components/wallet/MyBooksSection';

import { formatCoins } from '../config/platform';
import CoinDisplay from '../components/CoinDisplay';
import CoinIcon from '../components/CoinIcon';
import {
  FiArrowRight,
  FiGift,
  FiCheck,
  FiAlertCircle,
} from 'react-icons/fi';
import { FaPaypal, FaAmazon } from 'react-icons/fa';
import { SiLitecoin, SiNetflix, SiGoogleplay } from 'react-icons/si';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.38 } } };

const PromoCodeRedeem = ({ onSuccess }) => {
  const { currentUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null); // { type: 'success'|'error', text: '' }

  // Lock scroll when popup is open — only button can close it
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
      <motion.div variants={item} className="flex flex-col md:flex-row items-start md:items-center justify-between w-full rounded-[20px] p-[20px] bg-[#242424] shrink-0 gap-[18px] relative border border-white/[0.04]">
        <div className="flex flex-col gap-[6px] w-full md:w-[591px] h-auto shrink-0 justify-between">
          <h2 className="m-0 p-0 font-bold font-['Barlow_Condensed'] text-[28px] md:text-[34px] leading-[120%] text-white w-full h-auto flex items-center shrink-0">
            Redeem Promo Code
          </h2>
          <p className="m-0 p-0 font-medium font-['Barlow_Condensed'] text-[18px] md:text-[22px] leading-[130%] text-[#888888] w-full h-auto flex items-center shrink-0">
            Have a code? Enter it below to claim free coins.
          </p>
        </div>

        <form onSubmit={handleRedeem} className="flex items-center w-full md:w-[591px] md:h-[80px] bg-[rgba(255,255,255,0.08)] border border-[#49B265] rounded-[10px] p-[10px] md:p-[16px] justify-between gap-[10px] shrink-0">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code here..."
            className="w-full md:w-[466px] h-auto md:h-[20px] bg-transparent text-white placeholder-white/50 font-medium font-['Barlow_Condensed'] text-[18px] md:text-[22px] leading-[20px] align-middle focus:outline-none border-none p-0 uppercase"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="flex items-center justify-center w-auto md:w-[93px] h-[40px] md:h-[48px] rounded-[10px] gap-[10px] py-[10px] px-[16px] md:px-[20px] bg-[#49B265] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-[0_4px_0_0_#276D3A] shrink-0"
          >
            <span className="font-bold font-['Barlow_Condensed'] text-[16px] md:text-[18px] leading-none text-white whitespace-nowrap">
              {loading ? '...' : 'Redeem'}
            </span>
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
                className="flex flex-col items-center justify-center w-full max-w-[500px] h-auto md:h-[339px] bg-[#242424] rounded-[20px] p-[16px] border border-white/[0.08] shadow-2xl relative gap-[20px]"
              >
                <div
                  className="flex items-center justify-center rounded-full shrink-0"
                  style={{
                    width: 72, height: 72,
                    background: popup.type === 'success' ? 'rgba(73,178,101,0.15)' : 'transparent',
                  }}
                >
                  {popup.type === 'success' ? (
                    <FiCheck size={36} className="text-[#49B265]" />
                  ) : (
                    <img src="/coins/war2.png" alt="Error" className="w-[64px] h-[64px] object-contain" />
                  )}
                </div>

                {/* Title */}
                <div className="flex flex-col items-center gap-[8px] w-full px-4">
                  <h2 className="m-0 p-0 font-bold font-['Barlow_Condensed'] text-[28px] md:text-[34px] leading-[120%] text-white text-center">
                    {popup.type === 'success' ? 'Code Redeemed!' : 'Redemption Failed'}
                  </h2>
                  <p className="m-0 p-0 font-medium font-['Barlow_Condensed'] text-[18px] md:text-[22px] leading-[130%] text-[#888888] text-center">
                    {popup.type === 'success'
                      ? <span className="flex items-center justify-center gap-2">+<CoinDisplay amount={popup.coins} size={18} /> added to your wallet!</span>
                      : popup.text}
                  </p>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setPopup(null)}
                  className="flex items-center justify-center w-full max-w-[468px] h-[48px] rounded-[10px] gap-[10px] px-[30px] py-[10px] bg-[#49B265] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all"
                >
                  <span className="font-bold font-['Barlow_Condensed'] text-[18px] leading-none text-white">
                    {popup.type === 'success' ? 'Awesome!' : 'Try Again'}
                  </span>
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

  const scrollToBooks = () => {
    document.getElementById('my-books-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 max-w-[1240px] mx-auto w-full px-4 md:px-0">

        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 relative w-full shrink-0">
          <div className="flex flex-col gap-[6px] relative z-10">
            <h1 className="m-0 p-0 font-bold text-[36px] sm:text-[48px] md:text-[68px] leading-[120%] text-white font-['Barlow_Condensed'] whitespace-nowrap">Withdraw</h1>
            <p className="m-0 p-0 font-medium text-[16px] sm:text-[20px] md:text-[26px] leading-[130%] text-[#888888] font-['Barlow_Condensed']">Choose your preferred withdrawal method and convert your coins into real rewards.</p>
          </div>
          <div className="hidden md:block absolute right-[-3px] -top-[36px] opacity-100 pointer-events-none w-[317px] h-[226px] z-0">
            <img
              src="/coins/withdarwhero.png"
              alt="Wallet Illustration"
              className="absolute inset-0 w-full h-full object-contain object-right z-10 drop-shadow-2xl"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        </div>

        {/* ── Balance Hero Card ─────────────────────────────────── */}
        <motion.div variants={item} className="relative overflow-hidden rounded-[20px] bg-[#242424] py-[20px] px-[20px] md:py-[30px] md:px-[40px] flex items-center justify-between gap-[20px] md:gap-[40px] w-full h-auto md:h-[138px] backdrop-blur-[94px] shrink-0 border border-white/[0.04]">
          <p className="w-auto h-auto m-0 p-0 text-white font-bold font-['Barlow_Condensed'] text-[24px] md:text-[28px] leading-[130%] uppercase whitespace-nowrap">
            Your Balance
          </p>
          <div className="flex flex-col items-end justify-center w-auto h-auto gap-[10px] md:gap-[18px] shrink-0">
            <div className="flex items-center w-auto h-[36px] md:h-[44px] gap-[6px] shrink-0 overflow-visible">
              <img src="/coins/Coin.png" alt="Coin" className="w-[36px] h-[36px] md:w-[44px] md:h-[44px] shrink-0 object-contain" />
              <p
                className="w-auto h-auto m-0 p-0 font-bold font-['Barlow_Condensed'] text-[42px] md:text-[60px] leading-none tracking-normal whitespace-nowrap flex items-center shrink-0 pb-[4px] md:pb-[6px]"
                style={{
                  backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent'
                }}
              >
                {balance.toLocaleString()}
              </p>
            </div>
            {settings && (
              <div className="flex items-center gap-1 font-semibold font-['Barlow_Condensed'] text-[20px] uppercase tracking-wide">
                <div className="flex items-center w-[52px] h-[16px] gap-[3px]">
                  <img
                    src="/coins/Coin.png"
                    alt="Coin"
                    className="w-[16px] h-[16px] object-contain"
                  />
                  <span
                    style={{
                      backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent'
                    }}
                  >
                    {settings.coinsPerUSD.toLocaleString()}
                  </span>
                </div>
                <span className="text-white ml-1">= 1 USD</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Withdrawal Options ───────────────────────────────────── */}
        <motion.div variants={item} className="flex flex-col md:flex-row justify-start gap-[20px] w-full shrink-0">

          {/* Card 1: PayPal & Litecoin */}
          <div className="bg-white/[0.14] rounded-[20px] p-[20px] flex flex-col gap-[18px] w-full md:w-[400px] md:h-[445px] hover:bg-white/[0.18] transition-colors shrink-0">
            <div className="flex justify-center w-full">
              <img src="/coins/paylite.png" alt="PayPal and Litecoin" className="w-[249px] h-[126px] object-contain" />
            </div>
            <div className="flex flex-col w-full md:w-[360px] h-auto md:h-[105px] gap-[6px]">
              <h3 className="w-full h-auto m-0 p-0 font-bold font-['Barlow_Condensed'] text-[28px] md:text-[34px] leading-[120%] text-white">
                PayPal & Litecoin
              </h3>
              <p className="w-full h-auto m-0 p-0 font-medium font-['Barlow_Condensed'] text-[18px] md:text-[22px] leading-[130%] text-[#888888]">
                Withdraw your earnings to your PayPal account or Litecoin wallet.
              </p>
            </div>

            <div className="flex flex-col w-full h-auto gap-[14px]">
              <div className="flex items-center w-full gap-[18px]">
                <img src="/coins/paypal.png" alt="PayPal" className="w-[24px] h-[24px] object-contain" />
                <span className="w-auto h-auto m-0 p-0 font-medium font-['Barlow_Condensed'] text-[18px] md:text-[22px] leading-[130%] text-white">
                  PayPal
                </span>
              </div>
              <div className="flex items-center w-full gap-[18px]">
                <img src="/coins/litecoin.png" alt="Litecoin" className="w-[24px] h-[24px] object-contain" />
                <span className="w-auto h-auto m-0 p-0 font-medium font-['Barlow_Condensed'] text-[18px] md:text-[22px] leading-[130%] text-white">
                  Litecoin
                </span>
              </div>
            </div>

            <button
              onClick={() => handleOpenWithdrawal('paypal_litecoin')}
              disabled={settingsLoad}
              className="flex items-center justify-center w-full h-[48px] gap-[10px] rounded-[10px] px-[30px] py-[10px] bg-[#49B265] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all mt-auto shrink-0"
            >
              <span className="m-0 p-0 font-bold font-['Barlow_Condensed'] text-[18px] leading-none text-white whitespace-nowrap">
                Withdraw Now
              </span>
              <img src="/coins/ar.png" alt="Arrow" className="w-[24px] h-[24px] object-contain" />
            </button>
          </div>

          {/* Card 2: Gift Cards */}
          <div className="bg-white/[0.14] rounded-[20px] p-[20px] flex flex-col gap-[18px] w-full md:w-[400px] md:h-[445px] hover:bg-white/[0.18] transition-colors shrink-0">
            <div className="flex justify-center w-full">
              <img src="/coins/giftcard.png" alt="Gift Cards" className="w-[330px] h-[126px] object-contain" />
            </div>
            <div className="flex flex-col w-full h-auto md:h-[105px] gap-[6px]">
              <h3 className="w-full h-auto m-0 p-0 font-bold font-['Barlow_Condensed'] text-[28px] md:text-[34px] leading-[120%] text-white">
                Gift Cards
              </h3>
              <p className="w-full h-auto m-0 p-0 font-medium font-['Barlow_Condensed'] text-[18px] md:text-[22px] leading-[130%] text-[#888888]">
                Choose from a variety of popular gift cards and treat yourself.
              </p>
            </div>

            <div className="flex items-center w-full h-auto gap-[8px] overflow-hidden">
              <div className="flex items-center justify-center flex-1 h-[60px] rounded-[10px] border border-white/[0.22] bg-[#111111] shrink-0">
                <img src="/coins/amazon.png" alt="Amazon" className="w-[86px] h-[24px] object-contain" />
              </div>
              <div className="flex items-center justify-center flex-1 h-[60px] rounded-[10px] border border-white/[0.22] bg-[#111111] shrink-0">
                <img src="/coins/netflix.png" alt="Netflix" className="w-[86px] h-[24px] object-contain" />
              </div>
              <div className="flex items-center justify-center flex-1 h-[60px] rounded-[10px] border border-white/[0.22] bg-[#111111] shrink-0">
                <span className="w-auto h-auto m-0 p-0 text-white font-medium font-['Barlow_Condensed'] text-[18px] md:text-[22px] leading-[130%] whitespace-nowrap text-center">
                  +5 More
                </span>
              </div>
            </div>

            <button
              onClick={() => handleOpenWithdrawal('giftcards')}
              disabled={settingsLoad}
              className="flex items-center justify-center w-full h-[48px] gap-[10px] rounded-[10px] px-[30px] py-[10px] bg-[#49B265] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all mt-auto shrink-0"
            >
              <span className="m-0 p-0 font-bold font-['Barlow_Condensed'] text-[18px] leading-none text-white whitespace-nowrap">
                Withdraw Now
              </span>
              <img src="/coins/ar.png" alt="Arrow" className="w-[24px] h-[24px] object-contain" />
            </button>
          </div>

          {/* Card 3: Your Books */}
          {booksVisible && (
            <div className="bg-white/[0.14] rounded-[20px] p-[20px] flex flex-col gap-[18px] w-full md:w-[400px] md:h-[445px] hover:bg-white/[0.18] transition-colors shrink-0">
              <div className="flex justify-center w-full">
                <img src="/coins/books.png" alt="Your Books" className="w-[321px] h-[126px] object-contain" />
              </div>
              <div className="flex flex-col w-full h-auto gap-[6px]">
                <h3 className="w-full h-auto m-0 p-0 font-bold font-['Barlow_Condensed'] text-[28px] md:text-[34px] leading-[120%] text-white">
                  Your Books
                </h3>
                <p className="w-full h-auto m-0 p-0 font-medium font-['Barlow_Condensed'] text-[18px] md:text-[22px] leading-[130%] text-[#888888]">
                  Redeem your coins for my books. Personally signed - only in Germany.
                </p>
              </div>

              <div className="flex flex-col w-full h-auto gap-[14px]">
                <div className="flex items-center w-full gap-[18px]">
                  <img src="/coins/signature.png" alt="Signature" className="w-[26px] h-[26px] object-contain shrink-0" />
                  <span className="h-auto m-0 p-0 font-medium font-['Barlow_Condensed'] text-[18px] md:text-[22px] leading-[130%] text-white">
                    Personal signature possible
                  </span>
                </div>
                <div className="flex items-center w-full gap-[18px]">
                  <img src="/coins/truck.png" alt="Truck" className="w-[26px] h-[26px] object-contain shrink-0" />
                  <span className="h-auto m-0 p-0 font-medium font-['Barlow_Condensed'] text-[18px] md:text-[22px] leading-[130%] text-white">
                    Shipping only within Germany
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowBookSelector(true)}
                className="flex items-center justify-center w-full h-[48px] gap-[10px] rounded-[10px] px-[30px] py-[10px] bg-[#49B265] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all mt-auto shrink-0"
              >
                <span className="m-0 p-0 font-bold font-['Barlow_Condensed'] text-[18px] leading-none text-white whitespace-nowrap">
                  Order Now
                </span>
                <img src="/coins/ar.png" alt="Arrow" className="w-[24px] h-[24px] object-contain" />
              </button>
            </div>
          )}

        </motion.div>


        {/* ── Promo Code Redeemer ───────────────────────────────── */}
        <PromoCodeRedeem onSuccess={handleWithdrawSuccess} />

      </motion.div>

      {/* ── Withdrawal Modal ──────────────────────────────────── */}
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

      {/* ── Select Book Modal ─────────────────────────────────── */}
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
