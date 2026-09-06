import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { FiUsers, FiClock, FiChevronLeft, FiChevronRight, FiFileText } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const calculateReleaseIn = (releaseDateStr) => {
  if (!releaseDateStr) return 'N/A';
  const diff = new Date(releaseDateStr).getTime() - new Date().getTime();
  if (diff <= 0) return 'Ready';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return `${d}d ${h}h`;
};

const formatCoinAmount = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount) || Number(amount) === 0) return '0';
  const num = Number(amount);
  if (Number.isInteger(num)) {
    return num.toLocaleString('de-DE');
  }
  return num.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const Pagination = ({ page, totalPages, onNext, onPrev }) => {
  const canGoNext = page < (totalPages || 1);
  const canGoPrev = page > 1;

  // When there is need to move next -> right side active (pointing right)
  // When no more move to next -> left side shows active (pointing left)
  const isRightActive = canGoNext || (!canGoPrev && !canGoNext);
  const isLeftActive = !canGoNext && canGoPrev;

  return (
    <div
      className="pt-6 sm:pt-8 flex items-center justify-center"
      style={{ gap: '10px' }}
    >
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className="transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:cursor-not-allowed"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '100px',
          gap: '10px',
          boxSizing: 'border-box',
          opacity: 1,
          background: isLeftActive ? 'rgba(36, 50, 77, 1)' : 'transparent',
          border: isLeftActive ? 'none' : '1px solid rgba(36, 50, 77, 1)',
          color: isLeftActive ? '#FFFFFF' : 'rgba(36, 50, 77, 1)',
        }}
        aria-label="Previous page"
      >
        <FiChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:cursor-not-allowed"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '100px',
          gap: '10px',
          boxSizing: 'border-box',
          opacity: 1,
          background: isRightActive ? 'rgba(36, 50, 77, 1)' : 'transparent',
          border: isRightActive ? 'none' : '1px solid rgba(36, 50, 77, 1)',
          color: isRightActive ? '#FFFFFF' : 'rgba(36, 50, 77, 1)',
        }}
        aria-label="Next page"
      >
        <FiChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

const useHistory = (token, type, endpoint = '/wallet/history') => {
  const [dataList, setDataList] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalEarned, setTotalEarned] = useState(0);

  const fetchPage = async (pg) => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: pg, limit: 5 });
      if (type) params.append('type', type);

      const res = await fetch(`${API}${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
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

const useAffiliateStats = (token) => {
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    totalAffiliateEarnings: 0,
    last30DaysEarnings: 0,
    referralPercentage: 15,
    pendingCommissions: 0,
    pendingCount: 0,
    holdDays: 30
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API}/wallet/affiliate-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setStats({
            totalAffiliates: data.totalAffiliates ?? 0,
            totalAffiliateEarnings: data.totalAffiliateEarnings ?? 0,
            last30DaysEarnings: data.last30DaysEarnings ?? 0,
            referralPercentage: data.referralPercentage ?? 15,
            pendingCommissions: data.pendingCommissions ?? 0,
            pendingCount: data.pendingCount ?? 0,
            holdDays: data.holdDays ?? 30,
          });
        }
      } catch (err) {
        console.error('Failed to fetch affiliate stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  return { stats, loading };
};

const useReferredUsers = (token) => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPage = async (pg) => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API}/wallet/referred-users?page=${pg}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setUsers(data.referredUsers);
      setTotalPages(data.pagination?.totalPages || 1);
      setPage(pg);
    } catch (err) {
      setError(err.message || 'Failed to load referred users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPage(1);
  }, [token]);

  const nextPage = () => { if (page < totalPages) fetchPage(page + 1); };
  const prevPage = () => { if (page > 1) fetchPage(page - 1); };

  return { users, loading, error, page, totalPages, nextPage, prevPage, goToPage: fetchPage };
};

const Affiliates = () => {
  const { currentUser, mongoUser } = useAuth();
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (currentUser) currentUser.getIdToken().then(setToken);
  }, [currentUser]);

  const referrals = useHistory(token, 'referral_reward');
  const { stats, loading: statsLoading } = useAffiliateStats(token);
  const referredUsersData = useReferredUsers(token);
  const [activeTab, setActiveTab] = useState('recent'); // 'recent', 'users', 'pending'
  const [affiliateHolds, setAffiliateHolds] = useState([]);
  const [holdsLoading, setHoldsLoading] = useState(true);

  // Local pagination for pending holds
  const [pendingPage, setPendingPage] = useState(1);
  const itemsPerPage = 5;
  const totalPendingPages = Math.max(1, Math.ceil(affiliateHolds.length / itemsPerPage));
  const currentPendingHolds = affiliateHolds.slice((pendingPage - 1) * itemsPerPage, pendingPage * itemsPerPage);

  useEffect(() => {
    if (!token) return;
    const fetchHolds = async () => {
      try {
        const res = await fetch(`${API}/wallet/pending-earnings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setAffiliateHolds(data.affiliateHolds || []);
      } catch (e) {
        console.error('Failed to load affiliate holds', e);
      } finally {
        setHoldsLoading(false);
      }
    };
    fetchHolds();
  }, [token]);

  const referralCode = mongoUser?.referralCode || '';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://taskmint.me';
  const referralUrl = referralCode ? `${baseUrl}/r/${referralCode}` : `${baseUrl}/r/`;

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const currentPercentage = stats.referralPercentage ?? 15;

  return (
    <DashboardLayout showLiveBar={true} fullWidth={true}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full flex flex-col items-center"
      >
        {/* ─── Top Banner Area (Warm Background: rgba(249, 247, 241, 1)) ─── */}
        <div
          className="w-full flex justify-center items-center transition-colors duration-300"
          style={{
            background: 'rgba(249, 247, 241, 1)',
            minHeight: '366px',
            opacity: 1,
            transform: 'rotate(0deg)',
          }}
        >
          <div className="w-full max-w-[1328px] mx-auto px-4 md:px-8 lg:px-0 py-8 sm:py-10 flex flex-col justify-center gap-6 sm:gap-8">
            {/* Page Title & Subtitle */}
            <div
              style={{
                maxWidth: '665px',
                minHeight: '44px',
                gap: '16px',
                opacity: 1,
                transform: 'rotate(0deg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
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
                Affiliate Program
              </h1>
              <p
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '14px',
                  letterSpacing: '0%',
                  color: '#000000',
                  margin: 0,
                }}
              >
                Invite friends and earn {currentPercentage}% of their earnings — forever! The more you invite, the more you earn.
              </p>
            </div>

            {/* 4 Top Metric Cards (Whole Layout: 1326x160, gap: 10px; Each Card: 324x160, radius: 25px) */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full"
              style={{
                maxWidth: '1326px',
                minHeight: '160px',
                gap: '10px',
                opacity: 1,
              }}
            >
              {/* Card 1: Total Affiliates */}
              <div
                className="w-full lg:max-w-[324px] flex flex-col justify-between"
                style={{
                  height: '160px',
                  borderRadius: '25px',
                  paddingTop: '23px',
                  paddingRight: '23px',
                  paddingBottom: '25px',
                  paddingLeft: '23px',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 1)',
                  boxSizing: 'border-box',
                  opacity: 1,
                }}
              >
                <div
                  style={{
                    minHeight: '30px',
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '45px',
                    lineHeight: '30px',
                    letterSpacing: '-0.02em',
                    color: '#1E293B',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {statsLoading ? '0' : (stats.totalAffiliates || 0)}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '20px',
                      lineHeight: '1.2',
                      letterSpacing: '-0.02em',
                      color: '#000000',
                      margin: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Total Affiliates
                  </h3>
                  <p
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '1.2',
                      letterSpacing: '0%',
                      color: '#6B7280',
                      margin: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Active referred users
                  </p>
                </div>
              </div>

              {/* Card 2: Lifetime Earnings */}
              <div
                className="w-full lg:max-w-[324px] flex flex-col justify-between"
                style={{
                  height: '160px',
                  borderRadius: '25px',
                  paddingTop: '23px',
                  paddingRight: '23px',
                  paddingBottom: '25px',
                  paddingLeft: '23px',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 1)',
                  boxSizing: 'border-box',
                  opacity: 1,
                }}
              >
                <div
                  style={{
                    minHeight: '30px',
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '45px',
                    lineHeight: '30px',
                    letterSpacing: '-0.02em',
                    color: 'rgba(231, 171, 24, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <img
                    src="/coins/coinofaffliation.png"
                    alt="Coin"
                    style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                    className="shrink-0"
                  />
                  <span>{statsLoading ? '0' : formatCoinAmount(stats.totalAffiliateEarnings || 0)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '20px',
                      lineHeight: '1.2',
                      letterSpacing: '-0.02em',
                      color: '#000000',
                      margin: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Lifetime Earnings
                  </h3>
                  <p
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '1.2',
                      letterSpacing: '0%',
                      color: '#6B7280',
                      margin: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Total coins earned
                  </p>
                </div>
              </div>

              {/* Card 3: 30-Day Earnings */}
              <div
                className="w-full lg:max-w-[324px] flex flex-col justify-between"
                style={{
                  height: '160px',
                  borderRadius: '25px',
                  paddingTop: '23px',
                  paddingRight: '23px',
                  paddingBottom: '25px',
                  paddingLeft: '23px',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 1)',
                  boxSizing: 'border-box',
                  opacity: 1,
                }}
              >
                <div
                  style={{
                    minHeight: '30px',
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '45px',
                    lineHeight: '30px',
                    letterSpacing: '-0.02em',
                    color: 'rgba(231, 171, 24, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <img
                    src="/coins/coinofaffliation.png"
                    alt="Coin"
                    style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                    className="shrink-0"
                  />
                  <span>{statsLoading ? '0' : formatCoinAmount(stats.last30DaysEarnings || 0)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '20px',
                      lineHeight: '1.2',
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
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '1.2',
                      letterSpacing: '0%',
                      color: '#6B7280',
                      margin: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Earned in 30 days
                  </p>
                </div>
              </div>

              {/* Card 4: Pending Coins */}
              <div
                className="w-full lg:max-w-[324px] flex flex-col justify-between"
                style={{
                  height: '160px',
                  borderRadius: '25px',
                  paddingTop: '23px',
                  paddingRight: '23px',
                  paddingBottom: '25px',
                  paddingLeft: '23px',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 1)',
                  boxSizing: 'border-box',
                  opacity: 1,
                }}
              >
                <div
                  style={{
                    minHeight: '30px',
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: '45px',
                    lineHeight: '30px',
                    letterSpacing: '-0.02em',
                    color: 'rgba(231, 171, 24, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <img
                    src="/coins/coinofaffliation.png"
                    alt="Coin"
                    style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                    className="shrink-0"
                  />
                  <span>{statsLoading ? '0' : formatCoinAmount(stats.pendingCommissions || 0)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: '20px',
                      lineHeight: '1.2',
                      letterSpacing: '-0.02em',
                      color: '#000000',
                      margin: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Pending Coins
                  </h3>
                  <p
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '1.2',
                      letterSpacing: '0%',
                      color: '#6B7280',
                      margin: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statsLoading ? '0' : (stats.pendingCount || 0)} hold(s)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Lower Main Content Area (Max Width 1328px like Daily Bonus and Earn) ─── */}
        <div className="w-full max-w-[1328px] mx-auto px-4 md:px-8 lg:px-0 pt-8 sm:pt-10 pb-12 sm:pb-16 flex flex-col gap-6 sm:gap-8">
          {/* Unique Referral Link Card */}
          <div
            className="w-full flex flex-col justify-between transition-colors"
            style={{
              maxWidth: '1328px',
              minHeight: '212px',
              borderRadius: '30px',
              paddingTop: '36px',
              paddingRight: '28px',
              paddingBottom: '39px',
              paddingLeft: '30px',
              gap: '25px',
              background: 'rgba(249, 247, 241, 1)',
              boxSizing: 'border-box',
              opacity: 1,
            }}
          >
            <div
              style={{
                maxWidth: '403px',
                minHeight: '44px',
                gap: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                opacity: 1,
              }}
            >
              <h2
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
                Your Unique Referral Link
              </h2>
              <p
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  lineHeight: '14px',
                  letterSpacing: '0%',
                  color: '#000000',
                  margin: 0,
                }}
              >
                Share this link anywhere to start earning passive income.
              </p>
            </div>

            {/* Referral Link Field (1270x66, radius: 50px, background: white, padding: 8px 10px 9px 25px) */}
            <div
              className="w-full flex items-center justify-between shadow-xs transition-colors"
              style={{
                maxWidth: '1270px',
                height: '66px',
                borderRadius: '50px',
                paddingTop: '8px',
                paddingRight: '10px',
                paddingBottom: '9px',
                paddingLeft: '25px',
                background: 'rgba(255, 255, 255, 1)',
                boxSizing: 'border-box',
                opacity: 1,
              }}
            >
              <input
                type="text"
                readOnly
                value={referralUrl}
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 400,
                  fontSize: '16px',
                  lineHeight: '26px',
                  letterSpacing: '0%',
                  color: '#000000',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  minWidth: 0,
                  paddingRight: '12px',
                }}
              />
              <button
                onClick={() => copyToClipboard(referralUrl)}
                className="active:scale-95 transition-transform shrink-0 cursor-pointer flex items-center justify-center"
                style={{
                  width: '99px',
                  height: '49px',
                  borderRadius: '80px',
                  background: 'rgba(36, 50, 77, 1)',
                  gap: '10px',
                  border: 'none',
                  outline: 'none',
                  opacity: 1,
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '28px',
                    letterSpacing: '0%',
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Copy
                </span>
              </button>
            </div>
          </div>

          {/* Lower Section: Tabs & Table Card (1328x625, background: rgba(249, 247, 241, 1), radius: 30px) */}
          <div
            className="w-full flex flex-col justify-between transition-colors p-4 sm:py-8 sm:px-[28px]"
            style={{
              maxWidth: '1328px',
              minHeight: '625px',
              borderRadius: '30px',
              background: 'rgba(249, 247, 241, 1)',
              boxSizing: 'border-box',
              opacity: 1,
            }}
          >
            {/* Segmented Control Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-center gap-2 sm:gap-[5px] mb-6">
              {/* Row 1 on mobile: Recent Affiliate Earnings + Referred Users */}
              <div className="flex items-center flex-nowrap gap-1.5 sm:gap-[5px] max-w-full overflow-x-auto hide-scroll">
                <button
                  onClick={() => setActiveTab('recent')}
                  className="transition-all cursor-pointer flex items-center justify-center shrink-0 px-3 sm:px-[18px] py-[9px] sm:py-[11px]"
                  style={{
                    height: '37px',
                    borderRadius: '40px',
                    gap: '8px',
                    background: activeTab === 'recent' ? 'rgba(36, 50, 77, 1)' : 'transparent',
                    color: activeTab === 'recent' ? '#FFFFFF' : '#000000',
                    border: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: 1,
                  }}
                >
                  <img
                    src="/coins/recentaffilation.png"
                    alt="Recent"
                    style={{
                      width: '16px',
                      height: '16px',
                      objectFit: 'contain',
                      filter: activeTab === 'recent' ? 'brightness(0) invert(1)' : 'brightness(0)',
                    }}
                    className="shrink-0 transition-all"
                  />
                  <span
                    className="text-[13px] sm:text-[14px]"
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      color: activeTab === 'recent' ? '#FFFFFF' : '#000000',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Recent Affiliate Earnings
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className="transition-all cursor-pointer flex items-center justify-center shrink-0 px-3 sm:px-[18px] py-[9px] sm:py-[11px]"
                  style={{
                    height: '37px',
                    borderRadius: '40px',
                    gap: '8px',
                    background: activeTab === 'users' ? 'rgba(36, 50, 77, 1)' : 'transparent',
                    color: activeTab === 'users' ? '#FFFFFF' : '#000000',
                    border: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: 1,
                  }}
                >
                  <img
                    src="/coins/refereduser.png"
                    alt="Users"
                    style={{
                      width: '16px',
                      height: '16px',
                      objectFit: 'contain',
                      filter: activeTab === 'users' ? 'brightness(0) invert(1)' : 'brightness(0)',
                    }}
                    className="shrink-0 transition-all"
                  />
                  <span
                    className="text-[13px] sm:text-[14px]"
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      lineHeight: '100%',
                      letterSpacing: '0%',
                      color: activeTab === 'users' ? '#FFFFFF' : '#000000',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Referred Users
                  </span>
                </button>
              </div>

              {/* Row 2 on mobile: Pending Affiliate Earnings */}
              <button
                onClick={() => setActiveTab('pending')}
                className="transition-all cursor-pointer flex items-center justify-center shrink-0 px-3 sm:px-[18px] py-[9px] sm:py-[11px]"
                style={{
                  height: '37px',
                  borderRadius: '40px',
                  gap: '8px',
                  background: activeTab === 'pending' ? 'rgba(36, 50, 77, 1)' : 'transparent',
                  color: activeTab === 'pending' ? '#FFFFFF' : '#000000',
                  border: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  opacity: 1,
                }}
              >
                <img
                  src="/coins/pendignaff.png"
                  alt="Pending"
                  style={{
                    width: '16px',
                    height: '16px',
                    objectFit: 'contain',
                    filter: activeTab === 'pending' ? 'brightness(0) invert(1)' : 'brightness(0)',
                  }}
                  className="shrink-0 transition-all"
                />
                <span
                  className="text-[13px] sm:text-[14px]"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    lineHeight: '100%',
                    letterSpacing: '0%',
                    color: activeTab === 'pending' ? '#FFFFFF' : '#000000',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Pending Affiliate Earnings
                </span>
              </button>
            </div>

            {/* Inner White Card for Table Content */}
            <div className="bg-white rounded-[20px] sm:rounded-[24px] p-3 sm:p-6 md:p-8 w-full shadow-xs border border-[#E5E7EB]/60">
              {/* Tab 1: Recent Affiliate Earnings */}
              {activeTab === 'recent' && (
                <div>
                  {referrals.loading ? (
                    <div className="animate-pulse space-y-4 py-6">
                      <div className="h-6 bg-gray-200/70 rounded w-full"></div>
                      <div className="h-14 bg-gray-200/70 rounded w-full"></div>
                      <div className="h-14 bg-gray-200/70 rounded w-full"></div>
                    </div>
                  ) : referrals.error ? (
                    <p className="text-rose-500 text-center py-8 font-medium">{referrals.error}</p>
                  ) : referrals.dataList.length === 0 ? (
                    <div className="text-center py-12 text-[#6B7280] font-medium text-sm sm:text-base">
                      No referral earnings yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div
                        className="w-full min-w-0 sm:min-w-[680px] flex flex-col gap-2.5 sm:gap-[21px]"
                        style={{ maxWidth: '1248px', opacity: 1 }}
                      >
                        {/* Table Header */}
                        <div
                          className="grid grid-cols-[1.4fr_1fr_1.1fr_1.1fr_0.9fr] sm:grid-cols-[1.6fr_1.2fr_1.2fr_1.2fr_1fr] items-center text-[9px] sm:text-[14px] leading-tight sm:leading-[26px] tracking-[0.04em] sm:tracking-[0.06em] text-[rgba(14,15,12,0.6)] uppercase font-[400]"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                          }}
                        >
                          <div>USER</div>
                          <div>DATE</div>
                          <div>EARNING</div>
                          <div>COMMS({currentPercentage}%)</div>
                          <div className="text-right sm:text-left sm:pl-4">STATUS</div>
                        </div>

                        {/* Table Rows */}
                        <div className="divide-y divide-[rgba(0,0,0,0.1)] flex flex-col">
                          {referrals.dataList.map((tx) => {
                            const avatar = tx.linkedTransactionId?.userId?.avatarUrl ||
                              tx.linkedTransactionId?.userId?.photoURL ||
                              `https://api.dicebear.com/7.x/adventurer/svg?seed=${tx._id}`;
                            const username = tx.linkedTransactionId?.userId?.displayName || 'Xyz';
                            const earningVal = (tx.amount * (100 / (currentPercentage || 15))) || (tx.amount * 10);
                            const commVal = tx.amount;

                            return (
                              <div
                                key={tx._id}
                                className="grid grid-cols-[1.4fr_1fr_1.1fr_1.1fr_0.9fr] sm:grid-cols-[1.6fr_1.2fr_1.2fr_1.2fr_1fr] items-center py-2.5 sm:py-5 min-h-[44px] sm:min-h-[60px] transition-colors"
                              >
                                {/* User */}
                                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 pr-1 sm:pr-2">
                                  <img
                                    src={avatar}
                                    alt={username}
                                    className="w-6 h-6 sm:w-10 sm:h-10 rounded-full object-cover bg-gray-200 border border-gray-100 shrink-0"
                                  />
                                  <span
                                    style={{
                                      fontFamily: '"Bricolage Grotesque", sans-serif',
                                      fontWeight: 700,
                                      letterSpacing: '0%',
                                      color: '#000000',
                                    }}
                                    className="truncate text-[10px] sm:text-[16px] leading-tight"
                                  >
                                    {username}
                                  </span>
                                </div>

                                {/* Date */}
                                <div
                                  style={{
                                    fontFamily: '"Poppins", sans-serif',
                                    fontWeight: 500,
                                    letterSpacing: '0%',
                                    color: '#000000',
                                  }}
                                  className="truncate text-[9px] sm:text-[16px] leading-tight sm:leading-[26px]"
                                >
                                  {formatDate(tx.createdAt)}
                                </div>

                                {/* Earning */}
                                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                  <img
                                    src="/coins/coinofaffliation.png"
                                    alt="Coin"
                                    className="w-3 h-3 sm:w-[18px] sm:h-[18px] object-contain shrink-0"
                                  />
                                  <span
                                    style={{
                                      fontFamily: '"Poppins", sans-serif',
                                      fontWeight: 600,
                                      letterSpacing: '0%',
                                      color: 'rgba(190, 146, 0, 1)',
                                    }}
                                    className="truncate text-[9px] sm:text-[16px] leading-tight sm:leading-[26px]"
                                  >
                                    {formatCoinAmount(earningVal)}
                                  </span>
                                </div>

                                {/* Comms */}
                                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                  <img
                                    src="/coins/coinofaffliation.png"
                                    alt="Coin"
                                    className="w-3 h-3 sm:w-[18px] sm:h-[18px] object-contain shrink-0"
                                  />
                                  <span
                                    style={{
                                      fontFamily: '"Poppins", sans-serif',
                                      fontWeight: 600,
                                      letterSpacing: '0%',
                                      color: 'rgba(190, 146, 0, 1)',
                                    }}
                                    className="truncate text-[9px] sm:text-[16px] leading-tight sm:leading-[26px]"
                                  >
                                    {formatCoinAmount(commVal)}
                                  </span>
                                </div>

                                {/* Status */}
                                <div className="text-right sm:text-left sm:pl-4">
                                  <span
                                    className="inline-flex items-center justify-center shrink-0 h-[22px] sm:h-[33px] px-2 py-0.5 sm:px-[18px] sm:py-[11px] rounded-[40px] text-[9px] sm:text-[16px] font-medium text-white"
                                    style={{
                                      background: 'rgba(36, 50, 77, 1)',
                                      fontFamily: '"Poppins", sans-serif',
                                      lineHeight: '100%',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {tx.status === 'hold' ? 'Pending' : 'Paid'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Referred Users */}
              {activeTab === 'users' && (
                <div>
                  {referredUsersData.loading ? (
                    <div className="animate-pulse space-y-4 py-6">
                      <div className="h-6 bg-gray-200/70 rounded w-full"></div>
                      <div className="h-14 bg-gray-200/70 rounded w-full"></div>
                      <div className="h-14 bg-gray-200/70 rounded w-full"></div>
                    </div>
                  ) : referredUsersData.error ? (
                    <p className="text-rose-500 text-center py-8 font-medium">{referredUsersData.error}</p>
                  ) : referredUsersData.users.length === 0 ? (
                    <div className="text-center py-12 text-[#6B7280] font-medium text-sm sm:text-base">
                      No referred users yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div
                        className="w-full min-w-0 sm:min-w-[680px] flex flex-col gap-2.5 sm:gap-[21px]"
                        style={{ maxWidth: '1248px', opacity: 1 }}
                      >
                        {/* Table Header */}
                        <div
                          className="grid grid-cols-[1.4fr_1fr_1.1fr_1.1fr_0.9fr] sm:grid-cols-[1.6fr_1.2fr_1.2fr_1.2fr_1fr] items-center text-[9px] sm:text-[14px] leading-tight sm:leading-[26px] tracking-[0.04em] sm:tracking-[0.06em] text-[rgba(14,15,12,0.6)] uppercase font-[400]"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                          }}
                        >
                          <div>USER</div>
                          <div>JOINED DATE</div>
                          <div>TOTAL EARNING</div>
                          <div>YOUR COMMS</div>
                          <div className="text-right sm:text-left sm:pl-4">STATUS</div>
                        </div>

                        {/* Table Rows */}
                        <div className="divide-y divide-[rgba(0,0,0,0.1)] flex flex-col">
                          {referredUsersData.users.map((u) => {
                            const avatar = u.avatarUrl || u.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${u.displayName}`;
                            const commsEarned = u.referralEarnings > 0
                              ? u.referralEarnings
                              : ((u.totalEarned || 0) * (currentPercentage / 100));

                            return (
                              <div
                                key={u._id}
                                className="grid grid-cols-[1.4fr_1fr_1.1fr_1.1fr_0.9fr] sm:grid-cols-[1.6fr_1.2fr_1.2fr_1.2fr_1fr] items-center py-2.5 sm:py-5 min-h-[44px] sm:min-h-[60px] transition-colors"
                              >
                                {/* User */}
                                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 pr-1 sm:pr-2">
                                  <img
                                    src={avatar}
                                    alt={u.displayName}
                                    className="w-6 h-6 sm:w-10 sm:h-10 rounded-full object-cover bg-gray-200 border border-gray-100 shrink-0"
                                  />
                                  <span
                                    style={{
                                      fontFamily: '"Bricolage Grotesque", sans-serif',
                                      fontWeight: 700,
                                      letterSpacing: '0%',
                                      color: '#000000',
                                    }}
                                    className="truncate text-[10px] sm:text-[16px] leading-tight"
                                  >
                                    {u.displayName}
                                  </span>
                                </div>

                                {/* Joined Date */}
                                <div
                                  style={{
                                    fontFamily: '"Poppins", sans-serif',
                                    fontWeight: 500,
                                    letterSpacing: '0%',
                                    color: '#000000',
                                  }}
                                  className="truncate text-[9px] sm:text-[16px] leading-tight sm:leading-[26px]"
                                >
                                  {formatDate(u.createdAt)}
                                </div>

                                {/* Total Earning */}
                                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                  <img
                                    src="/coins/coinofaffliation.png"
                                    alt="Coin"
                                    className="w-3 h-3 sm:w-[18px] sm:h-[18px] object-contain shrink-0"
                                  />
                                  <span
                                    style={{
                                      fontFamily: '"Poppins", sans-serif',
                                      fontWeight: 600,
                                      letterSpacing: '0%',
                                      color: 'rgba(190, 146, 0, 1)',
                                    }}
                                    className="truncate text-[9px] sm:text-[16px] leading-tight sm:leading-[26px]"
                                  >
                                    {formatCoinAmount(u.totalEarned || 0)}
                                  </span>
                                </div>

                                {/* Your Comms */}
                                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                  <img
                                    src="/coins/coinofaffliation.png"
                                    alt="Coin"
                                    className="w-3 h-3 sm:w-[18px] sm:h-[18px] object-contain shrink-0"
                                  />
                                  <span
                                    style={{
                                      fontFamily: '"Poppins", sans-serif',
                                      fontWeight: 600,
                                      letterSpacing: '0%',
                                      color: 'rgba(190, 146, 0, 1)',
                                    }}
                                    className="truncate text-[9px] sm:text-[16px] leading-tight sm:leading-[26px]"
                                  >
                                    {formatCoinAmount(commsEarned)}
                                  </span>
                                </div>

                                {/* Status */}
                                <div className="text-right sm:text-left sm:pl-4">
                                  <span
                                    className="inline-flex items-center justify-center shrink-0 h-[22px] sm:h-[33px] px-2 py-0.5 sm:px-[18px] sm:py-[11px] rounded-[40px] text-[9px] sm:text-[16px] font-medium text-white"
                                    style={{
                                      background: 'rgba(36, 50, 77, 1)',
                                      fontFamily: '"Poppins", sans-serif',
                                      lineHeight: '100%',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Active
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Pending Affiliate Earnings */}
              {activeTab === 'pending' && (
                <div>
                  {holdsLoading ? (
                    <div className="animate-pulse space-y-4 py-6">
                      <div className="h-6 bg-gray-200/70 rounded w-full"></div>
                      <div className="h-14 bg-gray-200/70 rounded w-full"></div>
                      <div className="h-14 bg-gray-200/70 rounded w-full"></div>
                    </div>
                  ) : currentPendingHolds.length === 0 ? (
                    <div className="text-center py-12 text-[#6B7280] font-medium text-sm sm:text-base">
                      No affiliate earnings on hold right now.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div
                        className="w-full min-w-0 sm:min-w-[680px] flex flex-col gap-2.5 sm:gap-[21px]"
                        style={{ maxWidth: '1248px', opacity: 1 }}
                      >
                        {/* Table Header */}
                        <div
                          className="grid grid-cols-[1.4fr_1fr_1.1fr_1.1fr_0.9fr] sm:grid-cols-[1.6fr_1.2fr_1.2fr_1.2fr_1fr] items-center text-[9px] sm:text-[14px] leading-tight sm:leading-[26px] tracking-[0.04em] sm:tracking-[0.06em] text-[rgba(14,15,12,0.6)] uppercase font-[400]"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                          }}
                        >
                          <div>USER</div>
                          <div>DATE</div>
                          <div>EARNING</div>
                          <div>COMMS({currentPercentage}%)</div>
                          <div className="text-right sm:text-left sm:pl-4">RELEASE IN</div>
                        </div>

                        {/* Table Rows */}
                        <div className="divide-y divide-[rgba(0,0,0,0.1)] flex flex-col">
                          {currentPendingHolds.map((tx) => {
                            const avatar = tx.linkedTransactionId?.userId?.avatarUrl ||
                              tx.linkedTransactionId?.userId?.photoURL ||
                              `https://api.dicebear.com/7.x/adventurer/svg?seed=${tx._id}`;
                            const username = tx.linkedTransactionId?.userId?.displayName || 'Unknown';
                            const earningVal = (tx.amount * (100 / (currentPercentage || 15))) || (tx.amount * 10);
                            const commVal = tx.amount;

                            return (
                              <div
                                key={tx._id}
                                className="grid grid-cols-[1.4fr_1fr_1.1fr_1.1fr_0.9fr] sm:grid-cols-[1.6fr_1.2fr_1.2fr_1.2fr_1fr] items-center py-2.5 sm:py-5 min-h-[44px] sm:min-h-[60px] transition-colors"
                              >
                                {/* User */}
                                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 pr-1 sm:pr-2">
                                  <img
                                    src={avatar}
                                    alt={username}
                                    className="w-6 h-6 sm:w-10 sm:h-10 rounded-full object-cover bg-gray-200 border border-gray-100 shrink-0"
                                  />
                                  <span
                                    style={{
                                      fontFamily: '"Bricolage Grotesque", sans-serif',
                                      fontWeight: 700,
                                      letterSpacing: '0%',
                                      color: '#000000',
                                    }}
                                    className="truncate text-[10px] sm:text-[16px] leading-tight"
                                  >
                                    {username}
                                  </span>
                                </div>

                                {/* Date */}
                                <div
                                  style={{
                                    fontFamily: '"Poppins", sans-serif',
                                    fontWeight: 500,
                                    letterSpacing: '0%',
                                    color: '#000000',
                                  }}
                                  className="truncate text-[9px] sm:text-[16px] leading-tight sm:leading-[26px]"
                                >
                                  {formatDate(tx.createdAt)}
                                </div>

                                {/* Earning */}
                                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                  <img
                                    src="/coins/coinofaffliation.png"
                                    alt="Coin"
                                    className="w-3 h-3 sm:w-[18px] sm:h-[18px] object-contain shrink-0"
                                  />
                                  <span
                                    style={{
                                      fontFamily: '"Poppins", sans-serif',
                                      fontWeight: 600,
                                      letterSpacing: '0%',
                                      color: 'rgba(190, 146, 0, 1)',
                                    }}
                                    className="truncate text-[9px] sm:text-[16px] leading-tight sm:leading-[26px]"
                                  >
                                    {formatCoinAmount(earningVal)}
                                  </span>
                                </div>

                                {/* Comms */}
                                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                                  <img
                                    src="/coins/coinofaffliation.png"
                                    alt="Coin"
                                    className="w-3 h-3 sm:w-[18px] sm:h-[18px] object-contain shrink-0"
                                  />
                                  <span
                                    style={{
                                      fontFamily: '"Poppins", sans-serif',
                                      fontWeight: 600,
                                      letterSpacing: '0%',
                                      color: 'rgba(190, 146, 0, 1)',
                                    }}
                                    className="truncate text-[9px] sm:text-[16px] leading-tight sm:leading-[26px]"
                                  >
                                    {formatCoinAmount(commVal)}
                                  </span>
                                </div>

                                {/* Release In */}
                                <div className="text-right sm:text-left sm:pl-4">
                                  <span
                                    className="inline-flex items-center justify-center shrink-0 h-[22px] sm:h-[33px] px-2 py-0.5 sm:px-[18px] sm:py-[11px] rounded-[40px] text-[9px] sm:text-[16px] font-medium text-white"
                                    style={{
                                      background: 'rgba(36, 50, 77, 1)',
                                      fontFamily: '"Poppins", sans-serif',
                                      lineHeight: '100%',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {calculateReleaseIn(tx.releaseDate)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pagination at the bottom of the section */}
            {activeTab === 'recent' && referrals.dataList.length > 0 && (
              <Pagination
                page={referrals.page}
                totalPages={referrals.totalPages || 1}
                onNext={referrals.nextPage}
                onPrev={referrals.prevPage}
              />
            )}
            {activeTab === 'users' && referredUsersData.users.length > 0 && (
              <Pagination
                page={referredUsersData.page}
                totalPages={referredUsersData.totalPages || 1}
                onNext={referredUsersData.nextPage}
                onPrev={referredUsersData.prevPage}
              />
            )}
            {activeTab === 'pending' && currentPendingHolds.length > 0 && (
              <Pagination
                page={pendingPage}
                totalPages={totalPendingPages || 1}
                onNext={() => setPendingPage((p) => Math.min(totalPendingPages, p + 1))}
                onPrev={() => setPendingPage((p) => Math.max(1, p - 1))}
              />
            )}
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Affiliates;
