import { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-icons/fi';
import { FaPaypal, FaAmazon } from 'react-icons/fa';
import { SiLitecoin, SiNetflix, SiGoogleplay } from 'react-icons/si';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.38 } } };

const PromoCodeRedeem = ({ onSuccess }) => {
  const { currentUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setMessage({ text: '', type: '' });

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
        setMessage({ text: <span className="flex items-center gap-1">+<CoinDisplay amount={data.coinsEarned} size={12} /> added to your wallet!</span>, type: 'success' });
        setCode('');
        if (onSuccess) onSuccess(data.newBalance);
      } else {
        setMessage({ text: data.error || 'Failed to redeem code', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error. Try again later.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div variants={item} className="flex flex-col md:flex-row items-start md:items-center justify-between w-[1240px] md:h-[120px] rounded-[20px] p-[20px] bg-[#242424] shrink-0 gap-[18px] relative">
      <div className="flex flex-col gap-[6px] w-full md:w-[591px] md:h-[76px] shrink-0 justify-between">
        <h2 className="m-0 p-0 font-bold font-['Barlow_Condensed'] text-[34px] leading-[120%] text-white w-full md:w-[591px] md:h-[41px] flex items-center shrink-0">
          Redeem Promo Code
        </h2>
        <p className="m-0 p-0 font-medium font-['Barlow_Condensed'] text-[22px] leading-[130%] text-[#888888] w-full md:w-[591px] md:h-[29px] flex items-center shrink-0">
          Have a code? Enter it below to claim free coins.
        </p>
      </div>

      <form onSubmit={handleRedeem} className="flex items-center w-full md:w-[591px] md:h-[80px] bg-[rgba(255,255,255,0.08)] border border-[#49B265] rounded-[10px] p-[16px] justify-between gap-[10px] shrink-0 relative">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code here..."
          className="w-full md:w-[466px] h-[20px] bg-transparent text-white placeholder-white/50 font-medium font-['Barlow_Condensed'] text-[22px] leading-[20px] align-middle focus:outline-none border-none p-0 uppercase"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="flex items-center justify-center w-[93px] h-[48px] rounded-[10px] gap-[10px] py-[10px] px-[20px] bg-[#49B265] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-[0_4px_0_0_#276D3A] shrink-0"
        >
          <span className="font-bold font-['Barlow_Condensed'] text-[18px] leading-none text-white whitespace-nowrap">
            {loading ? '...' : 'Redeem'}
          </span>
        </button>
      </form>

      {message.text && (
        <motion.p
          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className={`absolute -bottom-[24px] right-[20px] text-sm font-medium ${message.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}
        >
          {message.text}
        </motion.p>
      )}
    </motion.div>
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
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksVisible, setBooksVisible] = useState(false);

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
          setBooksVisible(!data.booksGermanyOnly || data.isGermanIP);
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
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 max-w-[1240px] mx-auto w-full">

        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative w-[1240px] shrink-0">
          <div className="flex flex-col gap-[6px] relative z-10">
            <h1 className="m-0 p-0 font-bold text-[68px] leading-[120%] text-white font-['Barlow_Condensed'] whitespace-nowrap">Withdraw</h1>
            <p className="m-0 p-0 font-medium text-[26px] leading-[130%] text-[#888888] font-['Barlow_Condensed']">Choose your preferred withdrawal method and convert your coins into real rewards.</p>
          </div>
          <div className="hidden md:block absolute right-[-7px] -top-[36px] opacity-100 pointer-events-none w-[317px] h-[226px] z-0">
            <img
              src="/coins/withdarwhero.png"
              alt="Wallet Illustration"
              className="absolute inset-0 w-full h-full object-contain object-right z-10 drop-shadow-2xl"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        </div>

        {/* ── Balance Hero Card ─────────────────────────────────── */}
        <motion.div variants={item} className="relative overflow-hidden rounded-[20px] bg-[#242424] py-[30px] px-[40px] flex items-center justify-between gap-[40px] w-[1240px] h-[138px] backdrop-blur-[94px] shrink-0">
          <p className="w-[931px] h-[36px] m-0 p-0 text-white font-bold font-['Barlow_Condensed'] text-[28px] leading-[130%] uppercase whitespace-nowrap">
            Your Balance
          </p>
          <div className="flex flex-col items-end justify-center w-[189px] h-[78px] gap-[18px] shrink-0">
            <div className="flex items-center w-auto h-[44px] gap-[6px] shrink-0 overflow-visible">
              <img src="/coins/coinfix.png" alt="Coin" className="w-[44px] h-[44px] shrink-0 object-contain" />
              <p
                className="w-auto h-auto m-0 p-0 font-bold font-['Barlow_Condensed'] text-[60px] leading-none tracking-normal whitespace-nowrap flex items-center shrink-0 pb-[6px]"
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
                    src="/coins/coinfix.png"
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
        <motion.div variants={item} className="flex flex-col md:flex-row justify-between gap-5 w-[1240px] shrink-0">

          {/* Card 1: PayPal & Litecoin */}
          <div className="bg-white/[0.14] rounded-[20px] p-[20px] flex flex-col gap-[18px] w-full md:w-[400px] md:h-[445px] hover:bg-white/[0.18] transition-colors shrink-0">
            <div className="flex justify-center w-full">
              <img src="/coins/paylite.png" alt="PayPal and Litecoin" className="w-[249px] h-[126px] object-contain" />
            </div>
            <div className="flex flex-col w-[360px] h-[105px] gap-[6px]">
              <h3 className="w-[360px] h-[41px] m-0 p-0 font-bold font-['Barlow_Condensed'] text-[34px] leading-[120%] text-white">
                PayPal & Litecoin
              </h3>
              <p className="w-[360px] h-[58px] m-0 p-0 font-medium font-['Barlow_Condensed'] text-[22px] leading-[130%] text-[#888888]">
                Withdraw your earnings to your PayPal account or Litecoin wallet.
              </p>
            </div>

            <div className="flex flex-col w-[360px] h-[72px] gap-[14px]">
              <div className="flex items-center w-[360px] h-[29px] gap-[18px]">
                <img src="/coins/paypal.png" alt="PayPal" className="w-[24px] h-[24px] object-contain" />
                <span className="w-[52px] h-[29px] m-0 p-0 font-medium font-['Barlow_Condensed'] text-[22px] leading-[130%] text-white">
                  PayPal
                </span>
              </div>
              <div className="flex items-center w-[360px] h-[29px] gap-[18px]">
                <img src="/coins/litecoin.png" alt="Litecoin" className="w-[24px] h-[24px] object-contain" />
                <span className="w-[52px] h-[29px] m-0 p-0 font-medium font-['Barlow_Condensed'] text-[22px] leading-[130%] text-white">
                  Litecoin
                </span>
              </div>
            </div>

            <button
              onClick={() => handleOpenWithdrawal('paypal_litecoin')}
              disabled={settingsLoad}
              className="flex items-center justify-center w-[360px] h-[48px] gap-[10px] rounded-[10px] px-[30px] py-[10px] bg-[#49B265] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all mt-auto shrink-0"
            >
              <span className="m-0 p-0 font-bold font-['Barlow_Condensed'] text-[18px] leading-none text-white whitespace-nowrap">
                Withdraw Now
              </span>
              <img src="/coins/ar.png" alt="Arrow" className="w-[24px] h-[24px] object-contain" />
            </button>
          </div>

          {/* Card 2: Gift Cards */}
          <div className="bg-white/[0.14] rounded-[20px] p-[20px] flex flex-col gap-[18px] w-full md:w-[400px] md:h-[445px] hover:bg-white/[0.18] transition-colors shrink-0">
            <div className="flex justify-center w-[360px]">
              <img src="/coins/giftcard.png" alt="Gift Cards" className="w-[330px] h-[126px] object-contain" />
            </div>
            <div className="flex flex-col w-[360px] h-[105px] gap-[6px]">
              <h3 className="w-[360px] h-[41px] m-0 p-0 font-bold font-['Barlow_Condensed'] text-[34px] leading-[120%] text-white">
                Gift Cards
              </h3>
              <p className="w-[360px] h-[58px] m-0 p-0 font-medium font-['Barlow_Condensed'] text-[22px] leading-[130%] text-[#888888]">
                Choose from a variety of popular gift cards and treat yourself.
              </p>
            </div>

            <div className="flex items-center w-[360px] h-[72px] gap-[8px]">
              <div className="flex items-center justify-center w-[114.66px] h-[60px] rounded-[10px] border border-white/[0.22] bg-[#111111] shrink-0">
                <img src="/coins/amazon.png" alt="Amazon" className="w-[86px] h-[24px] object-contain" />
              </div>
              <div className="flex items-center justify-center w-[114.66px] h-[60px] rounded-[10px] border border-white/[0.22] bg-[#111111] shrink-0">
                <img src="/coins/netflix.png" alt="Netflix" className="w-[86px] h-[24px] object-contain" />
              </div>
              <div className="flex items-center justify-center w-[114.66px] h-[60px] rounded-[10px] border border-white/[0.22] bg-[#111111] shrink-0">
                <span className="w-[61px] h-[29px] m-0 p-0 text-white font-medium font-['Barlow_Condensed'] text-[22px] leading-[130%] whitespace-nowrap text-center">
                  +5 More
                </span>
              </div>
            </div>

            <button
              onClick={() => handleOpenWithdrawal('giftcards')}
              disabled={settingsLoad}
              className="flex items-center justify-center w-[360px] h-[48px] gap-[10px] rounded-[10px] px-[30px] py-[10px] bg-[#49B265] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all mt-auto shrink-0"
            >
              <span className="m-0 p-0 font-bold font-['Barlow_Condensed'] text-[18px] leading-none text-white whitespace-nowrap">
                Withdraw Now
              </span>
              <img src="/coins/ar.png" alt="Arrow" className="w-[24px] h-[24px] object-contain" />
            </button>
          </div>

          {/* Card 3: Your Books */}
          <div className="bg-white/[0.14] rounded-[20px] p-[20px] flex flex-col gap-[18px] w-full md:w-[400px] md:h-[445px] hover:bg-white/[0.18] transition-colors shrink-0">
            <div className="flex justify-center w-[360px]">
              <img src="/coins/books.png" alt="Your Books" className="w-[321px] h-[126px] object-contain" />
            </div>
            <div className="flex flex-col w-[360px] h-[105px] gap-[6px]">
              <h3 className="w-[360px] h-[41px] m-0 p-0 font-bold font-['Barlow_Condensed'] text-[34px] leading-[120%] text-white">
                Your Books
              </h3>
              <p className="w-[360px] h-[58px] m-0 p-0 font-medium font-['Barlow_Condensed'] text-[22px] leading-[130%] text-[#888888]">
                Redeem your coins for my books. Personally signed - only in Germany.
              </p>
            </div>

            <div className="flex flex-col w-[360px] h-[72px] gap-[14px]">
              <div className="flex items-center w-[360px] h-[29px] gap-[18px]">
                <img src="/coins/signature.png" alt="Signature" className="w-[26px] h-[26px] object-contain" />
                <span className="h-[29px] m-0 p-0 font-medium font-['Barlow_Condensed'] text-[22px] leading-[130%] text-white whitespace-nowrap">
                  Personal signature possible
                </span>
              </div>
              <div className="flex items-center w-[360px] h-[29px] gap-[18px]">
                <img src="/coins/truck.png" alt="Truck" className="w-[26px] h-[26px] object-contain" />
                <span className="h-[29px] m-0 p-0 font-medium font-['Barlow_Condensed'] text-[22px] leading-[130%] text-white whitespace-nowrap">
                  Shipping only within Germany
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowBookSelector(true)}
              className="flex items-center justify-center w-[360px] h-[48px] gap-[10px] rounded-[10px] px-[30px] py-[10px] bg-[#49B265] shadow-[0_4px_0_0_#276D3A] hover:bg-[#49B265]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#276D3A] active:translate-y-[4px] active:shadow-none transition-all mt-auto shrink-0"
            >
              <span className="m-0 p-0 font-bold font-['Barlow_Condensed'] text-[18px] leading-none text-white whitespace-nowrap">
                Order Now
              </span>
              <img src="/coins/ar.png" alt="Arrow" className="w-[24px] h-[24px] object-contain" />
            </button>
          </div>

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
