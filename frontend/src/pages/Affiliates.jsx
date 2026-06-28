import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { FiUsers, FiTrendingUp, FiCopy, FiInbox, FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import CoinDisplay from '../components/CoinDisplay';
import CoinIcon from '../components/CoinIcon';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  const [stats, setStats] = useState({ totalAffiliates: 0, totalAffiliateEarnings: 0, last30DaysEarnings: 0, referralPercentage: null, pendingCommissions: 0, pendingCount: 0, holdDays: 30 });
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
            totalAffiliates: data.totalAffiliates,
            totalAffiliateEarnings: data.totalAffiliateEarnings,
            last30DaysEarnings: data.last30DaysEarnings,
            referralPercentage: data.referralPercentage ?? null,
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
  const totalPendingPages = Math.ceil(affiliateHolds.length / itemsPerPage);
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[1240px] mx-auto w-full space-y-8"
      >
        {/* Header Section */}
        <div className="relative w-[1240px] lg:mt-[49px] shrink-0">
          <div className="flex flex-col gap-[6px] w-full max-w-[866px] h-auto lg:h-[122px] relative z-10">
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-[68px] leading-[120%] text-white tracking-normal m-0 p-0">Affiliate Program</h1>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-medium text-[26px] leading-[130%] text-[#888888] tracking-normal m-0 p-0 max-w-[866px] h-auto lg:h-[34px] lg:whitespace-nowrap">
              Invite friends and earn {statsLoading ? '...' : (stats.referralPercentage != null ? `${stats.referralPercentage}%` : '10%')} of their earnings — forever! The more you invite, the more you earn.
            </p>
          </div>
          <div className="relative lg:absolute lg:right-[-42.53px] lg:top-[-49px] w-[365.53px] h-[243.69px] shrink-0 pointer-events-none z-0 mt-8 lg:mt-0">
            <img
              src="/coins/heroaffli.png"
              alt="Affiliate Hero"
              className="w-full h-full object-contain"
            />
            <div
              className="absolute inset-0 mix-blend-color"
              style={{
                backgroundColor: 'rgba(73, 178, 101, 1)',
                WebkitMaskImage: 'url(/coins/heroaffli.png)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: 'url(/coins/heroaffli.png)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
              }}
            />
          </div>
        </div>

        {/* Lower Group (Stats, Referral Link, Tabs, Tables) */}
        <div className="flex flex-col gap-[20px] w-[1240px] shrink-0">
          <div className="w-full">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full lg:w-[1240px] lg:h-[156px] gap-[10px] shrink-0">
              <div className="flex flex-col w-full h-[156px] rounded-[20px] p-[20px] gap-[22px] bg-[#1a1b1a] backdrop-blur-[74px]">
                <div className="flex flex-col w-fit min-w-[123px] h-[81px] gap-[12px] whitespace-nowrap">
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-[123px] h-[29px] font-bold text-[22px] leading-[130%] text-white tracking-normal m-0 p-0">Total Affiliates</h3>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-[84px] h-[40px] font-bold text-[50px] leading-[120%] tracking-normal text-[#49b265] m-0 p-0 flex items-center align-middle">
                    {statsLoading ? '...' : stats.totalAffiliates}
                  </div>
                </div>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-full h-auto font-semibold text-[18px] leading-[130%] text-white/50 tracking-normal m-0 p-0">Active referred users</p>
              </div>

              <div className="flex flex-col w-full h-[156px] rounded-[20px] p-[20px] gap-[22px] bg-[#1a1b1a] backdrop-blur-[74px]">
                <div className="flex flex-col w-fit min-w-[123px] h-[81px] gap-[12px] whitespace-nowrap">
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-[123px] h-[29px] font-bold text-[22px] leading-[130%] text-white tracking-normal m-0 p-0">Lifetime Earnings</h3>
                  <div className="flex items-center gap-[6px] h-[40px]">
                    <img src="/coins/coinfix.png" alt="Coin" className="w-[40px] h-[40px] shrink-0 object-contain" />
                    <div
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent'
                      }}
                      className="font-bold text-[50px] leading-none tracking-normal m-0 p-0 flex items-center pb-[6px]"
                    >
                      {statsLoading ? '...' : stats.totalAffiliateEarnings.toLocaleString()}
                    </div>
                  </div>
                </div>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-full h-auto font-semibold text-[18px] leading-[130%] text-white/50 tracking-normal m-0 p-0">Total coins earned from referrals</p>
              </div>

              <div className="flex flex-col w-full h-[156px] rounded-[20px] p-[20px] gap-[22px] bg-[#1a1b1a] backdrop-blur-[74px]">
                <div className="flex flex-col w-fit min-w-[123px] h-[81px] gap-[12px] whitespace-nowrap">
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-[123px] h-[29px] font-bold text-[22px] leading-[130%] text-white tracking-normal m-0 p-0">30-Day Earnings</h3>
                  <div className="flex items-center gap-[6px] h-[40px]">
                    <img src="/coins/coinfix.png" alt="Coin" className="w-[40px] h-[40px] shrink-0 object-contain" />
                    <div
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent'
                      }}
                      className="font-bold text-[50px] leading-none tracking-normal m-0 p-0 flex items-center pb-[6px]"
                    >
                      {statsLoading ? '...' : stats.last30DaysEarnings.toLocaleString()}
                    </div>
                  </div>
                </div>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-full h-auto font-semibold text-[18px] leading-[130%] text-white/50 tracking-normal m-0 p-0">Coins earned in the last 30 days</p>
              </div>

              <div className="flex flex-col w-full h-[156px] rounded-[20px] p-[20px] gap-[22px] bg-[#1a1b1a] backdrop-blur-[74px]">
                <div className="flex flex-col w-fit min-w-[123px] h-[81px] gap-[12px] whitespace-nowrap">
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-fit min-w-[123px] h-[29px] font-bold text-[22px] leading-[130%] text-white tracking-normal m-0 p-0">Pending Commissions</h3>
                  <div className="flex items-center gap-[6px] h-[40px]">
                    <img src="/coins/coinfix.png" alt="Coin" className="w-[40px] h-[40px] shrink-0 object-contain" />
                    <div
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent'
                      }}
                      className="font-bold text-[50px] leading-none tracking-normal m-0 p-0 flex items-center pb-[6px]"
                    >
                      {statsLoading ? '...' : stats.pendingCommissions.toLocaleString()}
                    </div>
                  </div>
                </div>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-full h-auto font-semibold text-[18px] leading-[130%] text-white/50 tracking-normal m-0 p-0">
                  {statsLoading ? '...' : `${stats.pendingCount} hold(s) - releases after ${stats.holdDays}d`}
                </p>
              </div>
            </div>
          </div>

          {/* Referral Link Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full lg:w-[1240px] h-auto sm:h-[120px] rounded-[20px] p-[20px] gap-[18px] bg-white/[0.14]">
            <div className="flex flex-col w-full lg:w-[591px] lg:h-[76px] gap-[6px]">
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-full lg:h-[41px] font-bold text-[34px] leading-[120%] text-white tracking-normal m-0 p-0">Your Unique Referral Link</h2>
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-full lg:h-[29px] font-medium text-[22px] leading-[130%] text-[#888888] tracking-normal m-0 p-0">Share this link anywhere to start earning passive income.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between w-full lg:w-[591px] lg:h-[80px] rounded-[10px] border border-[#49b265] bg-white/[0.08] p-[16px]">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/r/${mongoUser?.referralCode || ''}`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                className="w-full lg:w-[453px] lg:h-[20px] bg-transparent text-white font-medium text-[18px] leading-[20px] tracking-normal outline-none align-middle m-0 p-0"
              />
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/r/${mongoUser?.referralCode}`)}
                className="w-[106px] h-[48px] rounded-[10px] flex items-center justify-center bg-[#49b265] hover:bg-[#3bb770] text-white transition-all gap-[10px] py-[10px] px-[20px] shadow-[0px_4px_0px_0px_rgba(39,109,58,1)] active:translate-y-[2px] active:shadow-[0px_2px_0px_0px_rgba(39,109,58,1)] shrink-0"
              >
                <img src="/coins/copy.png" alt="Copy" className="w-[24px] h-[24px] shrink-0 object-contain" />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-[32px] h-[13px] font-bold text-[18px] leading-[100%] tracking-normal m-0 p-0 flex items-center justify-center">Copy</span>
              </button>
            </div>
          </div>

          {/* Tabs section */}
          <div className="w-full lg:w-[1239px] lg:h-[84px] bg-[#2c2d2c] backdrop-blur-[24px] shadow-[0px_4px_44px_0px_rgba(0,0,0,0.25)] rounded-[10px] p-[18px] flex items-center overflow-hidden lg:overflow-visible">
            <div className="w-full lg:w-[1203px] lg:h-[48px] rounded-[100px] flex flex-col sm:flex-row gap-[20px] lg:justify-between items-center">
              <button
                onClick={() => setActiveTab('recent')}
                className={`transition-all flex justify-center items-center gap-[10px] py-[10px] px-[20px] rounded-[10px] text-[16px] font-bold shrink-0 ${activeTab === 'recent'
                  ? 'lg:w-[401px] h-[48px] bg-[#49b265] text-white shadow-[0px_4px_0px_0px_rgba(39,109,58,1)]'
                  : 'w-auto h-[48px] text-white hover:bg-white/5'
                  }`}
              >
                <img src="/coins/paisa.png" alt="Recent" className={`w-[24px] h-[24px] shrink-0 object-contain ${activeTab === 'recent' ? 'brightness-0 invert' : ''}`} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-[180px] h-[32px] font-bold text-[20px] leading-[32px] text-white tracking-normal m-0 p-0 flex items-center justify-start whitespace-nowrap">Recent Affiliate Earnings</span>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`transition-all flex justify-center items-center gap-[10px] py-[10px] px-[20px] rounded-[10px] text-[16px] font-bold shrink-0 ${activeTab === 'users'
                  ? 'lg:w-[401px] h-[48px] bg-[#49b265] text-white shadow-[0px_4px_0px_0px_rgba(39,109,58,1)]'
                  : 'w-auto h-[48px] text-white hover:bg-white/5'
                  }`}
              >
                <img src="/coins/persons.png" alt="Users" className={`w-[24px] h-[24px] shrink-0 object-contain ${activeTab === 'users' ? 'brightness-0 invert' : ''}`} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-[180px] h-[32px] font-bold text-[20px] leading-[32px] text-white tracking-normal m-0 p-0 flex items-center justify-start whitespace-nowrap">Referred Users</span>
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`transition-all flex justify-center items-center gap-[10px] py-[10px] px-[20px] rounded-[10px] text-[16px] font-bold shrink-0 ${activeTab === 'pending'
                  ? 'lg:w-[401px] h-[48px] bg-[#49b265] text-white shadow-[0px_4px_0px_0px_rgba(39,109,58,1)]'
                  : 'w-auto h-[48px] text-white hover:bg-white/5'
                  }`}
              >
                <img src="/coins/clock.png" alt="Pending" className={`w-[24px] h-[24px] shrink-0 object-contain ${activeTab === 'pending' ? 'brightness-0 invert' : ''}`} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="w-[180px] h-[32px] font-bold text-[20px] leading-[32px] text-white tracking-normal m-0 p-0 flex items-center justify-start whitespace-nowrap">Pending Affiliate Earnings</span>
              </button>
            </div>
          </div>

          {/* Table Content Section */}
          <div className="w-full lg:w-[1240px] lg:h-[630px] bg-[#242424] rounded-[30px] p-[30px] flex flex-col gap-[10px] mt-4">

            {activeTab === 'recent' && (
              <div>
                {referrals.loading ? (
                  <div className="animate-pulse flex flex-col gap-4">
                    <div className="h-8 bg-white/5 rounded w-full"></div>
                    <div className="h-12 bg-white/5 rounded w-full"></div>
                  </div>
                ) : referrals.error ? (
                  <p className="text-rose-400 text-center py-8">{referrals.error}</p>
                ) : referrals.dataList.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No referral earnings yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[1180px]">
                      <div className="w-[1180px] h-[58px] rounded-[20px] pt-[10px] pr-[95px] pb-[30px] pl-[40px] grid grid-cols-[313px_repeat(4,1fr)] gap-[50px] border-b border-[#2a2d36]">
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap">User</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap">Date</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap">Earning</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap">Commission ({statsLoading ? '...' : (stats.referralPercentage != null ? `${stats.referralPercentage}%` : '10%')})</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap text-right">Status</div>
                      </div>
                      <div className="flex flex-col gap-[10px]">
                        {referrals.dataList.map(tx => (
                          <div key={tx._id} className="w-[1180px] h-[82px] bg-[#171717] rounded-[20px] pt-[20px] pr-[95px] pb-[20px] pl-[40px] grid grid-cols-[313px_repeat(4,1fr)] gap-[50px] items-center hover:bg-[#1a1a1a] transition-colors">
                            <div className="flex items-center gap-[10px]">
                              <img src={tx.linkedTransactionId?.userId?.avatarUrl || tx.linkedTransactionId?.userId?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${tx._id}`} className="w-[42px] h-[42px] rounded-[10px] bg-[#15171e] object-cover shrink-0" alt="avatar" />
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[28px] leading-[120%] text-white truncate">{tx.linkedTransactionId?.userId?.displayName || 'Unknown User'}</span>
                            </div>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-semibold text-[28px] leading-[120%]">{new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div className="flex items-center gap-[6px] font-semibold text-[#fbbf24] text-[28px] leading-[120%]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                              <img src="/coins/coinfix.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" /> {(tx.amount * 10).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-[6px] font-semibold text-[#fbbf24] text-[28px] leading-[120%]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                              <img src="/coins/coinfix.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" /> {tx.amount.toLocaleString()}
                            </div>
                            <div className="text-right flex justify-end">
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`inline-flex items-center justify-center px-[20px] py-[4px] rounded-[100px] text-[22px] leading-[120%] font-semibold ${tx.status === 'hold' ? 'bg-[#fbbf24]/10 text-[#fbbf24]' : 'bg-[#153423] text-[#4ade80]'}`}>
                                {tx.status === 'hold' ? 'Pending' : 'Paid'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {!referrals.loading && !referrals.error && referrals.dataList.length > 0 && (
                  <Pagination
                    page={referrals.page}
                    totalPages={referrals.totalPages}
                    onNext={referrals.nextPage}
                    onPrev={referrals.prevPage}
                    onPageClick={referrals.goToPage}
                  />
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                {referredUsersData.loading ? (
                  <div className="animate-pulse flex flex-col gap-4">
                    <div className="h-8 bg-white/5 rounded w-full"></div>
                    <div className="h-12 bg-white/5 rounded w-full"></div>
                  </div>
                ) : referredUsersData.error ? (
                  <p className="text-rose-400 text-center py-8">{referredUsersData.error}</p>
                ) : referredUsersData.users.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No referred users yet.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <div className="min-w-[1180px]">
                        <div className="w-[1180px] h-[58px] rounded-[20px] pt-[10px] pr-[95px] pb-[30px] pl-[40px] grid grid-cols-[313px_repeat(4,1fr)] gap-[50px] border-b border-[#2a2d36]">
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap">User</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap">Joined Date</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap">Total Earning</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap">Your Commission</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap text-right">Status</div>
                        </div>

                        <div className="flex flex-col gap-[10px]">
                          {referredUsersData.users.map(u => (
                            <div key={u._id} className="w-[1180px] h-[82px] bg-[#171717] rounded-[20px] pt-[20px] pr-[95px] pb-[20px] pl-[40px] grid grid-cols-[313px_repeat(4,1fr)] gap-[50px] items-center hover:bg-[#1a1a1a] transition-colors">
                              <div className="flex items-center gap-[10px]">
                                <img src={u.avatarUrl || u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.displayName}`} className="w-[42px] h-[42px] rounded-[10px] bg-[#15171e] object-cover shrink-0" alt="avatar" />
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[28px] leading-[120%] text-white truncate">{u.displayName}</span>
                              </div>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-semibold text-[28px] leading-[120%]">{new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                              <div className="flex items-center gap-[6px] font-semibold text-[#fbbf24] text-[28px] leading-[120%]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                <img src="/coins/coinfix.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" /> {(u.totalEarned || 0).toLocaleString()}
                              </div>
                              <div className="flex items-center gap-[6px] font-semibold text-[#fbbf24] text-[28px] leading-[120%]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                <img src="/coins/coinfix.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" /> {(u.referralEarnings > 0 ? u.referralEarnings : Math.floor((u.totalEarned || 0) * ((stats.referralPercentage || 10) / 100))).toLocaleString()}
                              </div>
                              <div className="text-right flex justify-end">
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="inline-flex items-center justify-center px-[20px] py-[4px] rounded-[100px] text-[22px] leading-[120%] font-semibold bg-[#153423] text-[#4ade80]">
                                  Active
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Pagination
                      page={referredUsersData.page}
                      totalPages={referredUsersData.totalPages}
                      onNext={referredUsersData.nextPage}
                      onPrev={referredUsersData.prevPage}
                      onPageClick={referredUsersData.goToPage}
                    />
                  </>
                )}
              </div>
            )}

            {activeTab === 'pending' && (
              <div>
                {holdsLoading ? (
                  <div className="animate-pulse flex flex-col gap-4">
                    <div className="h-8 bg-white/5 rounded w-full"></div>
                    <div className="h-12 bg-white/5 rounded w-full"></div>
                  </div>
                ) : currentPendingHolds.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No affiliate earnings on hold right now.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <div className="min-w-[1180px]">
                        <div className="w-[1180px] h-[58px] rounded-[20px] pt-[10px] pr-[95px] pb-[30px] pl-[40px] grid grid-cols-[313px_repeat(4,1fr)] gap-[50px] border-b border-[#2a2d36]">
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap">User</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap">Earning Date</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap">Earning</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap">Commission ({statsLoading ? '...' : (stats.referralPercentage != null ? `${stats.referralPercentage}%` : '10%')})</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="h-[18px] font-semibold text-[26px] leading-[120%] text-[rgba(255,255,255,0.4)] whitespace-nowrap text-right">Release In</div>
                        </div>

                        <div className="flex flex-col gap-[10px]">
                          {currentPendingHolds.map(tx => (
                            <div key={tx._id} className="w-[1180px] h-[82px] bg-[#171717] rounded-[20px] pt-[20px] pr-[95px] pb-[20px] pl-[40px] grid grid-cols-[313px_repeat(4,1fr)] gap-[50px] items-center hover:bg-[#1a1a1a] transition-colors">
                              <div className="flex items-center gap-[10px]">
                                <img src={tx.linkedTransactionId?.userId?.avatarUrl || tx.linkedTransactionId?.userId?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${tx._id}`} className="w-[42px] h-[42px] rounded-[10px] bg-[#15171e] object-cover shrink-0" alt="avatar" />
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-semibold text-[28px] leading-[120%] text-white truncate">{tx.linkedTransactionId?.userId?.displayName || 'Unknown User'}</span>
                              </div>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-semibold text-[28px] leading-[120%]">{new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                              <div className="flex items-center gap-[6px] font-semibold text-[#fbbf24] text-[28px] leading-[120%]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                <img src="/coins/coinfix.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" /> {(tx.amount * 10).toLocaleString()}
                              </div>
                              <div className="flex items-center gap-[6px] font-semibold text-[#fbbf24] text-[28px] leading-[120%]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                <img src="/coins/coinfix.png" alt="Coin" className="w-[24px] h-[24px] shrink-0 object-contain" /> {tx.amount.toLocaleString()}
                              </div>
                              <div className="text-right flex justify-end">
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-[#888888] font-semibold text-[28px] leading-[120%]">
                                  {calculateReleaseIn(tx.releaseDate)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Pagination
                      page={pendingPage}
                      totalPages={totalPendingPages}
                      onNext={() => setPendingPage(p => Math.min(totalPendingPages, p + 1))}
                      onPrev={() => setPendingPage(p => Math.max(1, p - 1))}
                      onPageClick={setPendingPage}
                    />
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Affiliates;
