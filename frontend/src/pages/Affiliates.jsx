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

const Pagination = ({ page, totalPages, onNext, onPrev }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="pt-6 pb-2 flex items-center justify-center gap-2">
      <button onClick={onPrev} disabled={page === 1} className="w-8 h-8 rounded-full flex items-center justify-center border border-[#2a2d36] text-[#4ade80] hover:bg-[#4ade80]/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors">
        <FiChevronLeft />
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button key={i} className={`w-8 h-8 rounded-full text-sm font-medium ${page === i + 1 ? 'bg-[#4ade80] text-[#0f1115]' : 'text-slate-400'} transition-colors cursor-default`}>
            {i + 1}
          </button>
        ))}
      </div>
      <button onClick={onNext} disabled={page === totalPages} className="w-8 h-8 rounded-full flex items-center justify-center border border-[#2a2d36] text-[#4ade80] hover:bg-[#4ade80]/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors">
        <FiChevronRight />
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

  return { dataList, loading, error, page, totalPages, nextPage, prevPage, totalEarned };
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

  return { users, loading, error, page, totalPages, nextPage, prevPage };
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
        className="max-w-[1280px] mx-auto w-full space-y-8"
      >
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 w-full max-w-[1240px]">
            <div className="flex flex-col gap-[6px] w-full max-w-[866px] h-auto lg:h-[122px]">
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-[68px] leading-[120%] text-white tracking-normal m-0 p-0">Affiliate Program</h1>
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-medium text-[26px] leading-[130%] text-[#888888] tracking-normal m-0 p-0 max-w-[866px] h-auto lg:h-[34px] lg:whitespace-nowrap">
                Invite friends and earn {statsLoading ? '...' : (stats.referralPercentage != null ? `${stats.referralPercentage}%` : '10%')} of their earnings — forever! The more you invite, the more you earn.
              </p>
            </div>
            <div className="relative w-[365.53px] h-[243.69px] shrink-0">
              <img 
                src="/coins/heroaffli.png" 
                alt="Affiliate Hero" 
                className="w-full h-full object-contain" 
              />
              <div 
                className="absolute inset-0 pointer-events-none mix-blend-color"
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
        <div className="flex flex-col gap-[20px] w-full max-w-[1240px]">
          <div className="w-full">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[20px]">
              <div className="bg-[#1f2128] rounded-xl p-5 border border-white/[0.05]">
                <h3 className="text-sm font-bold text-white mb-2">Today's Reward</h3>
                <div className="text-3xl font-black text-[#4ade80] mb-1">
                  {statsLoading ? '...' : stats.totalAffiliates}
                </div>
                <p className="text-xs text-slate-500">Active referred users</p>
              </div>

              <div className="bg-[#1f2128] rounded-xl p-5 border border-white/[0.05]">
                <h3 className="text-sm font-bold text-white mb-2">Lifetime Earnings</h3>
                <div className="flex items-center gap-2 mb-1">
                  <CoinIcon size={24} />
                  <div className="text-3xl font-black text-[#fbbf24]">
                    {statsLoading ? '...' : stats.totalAffiliateEarnings.toLocaleString()}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Total coins earned from referrals</p>
              </div>

              <div className="bg-[#1f2128] rounded-xl p-5 border border-white/[0.05]">
                <h3 className="text-sm font-bold text-white mb-2">30-Day Earnings</h3>
                <div className="flex items-center gap-2 mb-1">
                  <CoinIcon size={24} />
                  <div className="text-3xl font-black text-[#fbbf24]">
                    {statsLoading ? '...' : stats.last30DaysEarnings.toLocaleString()}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Coins earned in the last 30 days</p>
              </div>

              <div className="bg-[#1f2128] rounded-xl p-5 border border-white/[0.05]">
                <h3 className="text-sm font-bold text-white mb-2">Pending Commissions</h3>
                <div className="flex items-center gap-2 mb-1">
                  <CoinIcon size={24} />
                  <div className="text-3xl font-black text-[#fbbf24]">
                    {statsLoading ? '...' : stats.pendingCommissions.toLocaleString()}
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {statsLoading ? '...' : `${stats.pendingCount} hold(s) - releases after ${stats.holdDays}d`}
                </p>
              </div>
            </div>
          </div>

        {/* Referral Link Section */}
        <div className="bg-[#1f2128] rounded-2xl p-6 border border-white/[0.05]">
          <h2 className="text-xl font-bold text-white mb-1">Your Unique Referral Link</h2>
          <p className="text-slate-400 text-sm mb-4">Share this link anywhere to start earning passive income.</p>
          
          <div className="flex flex-col sm:flex-row items-center bg-[#15171e] rounded-xl border border-[#2a2d36] overflow-hidden">
            <input 
              type="text" 
              readOnly 
              value={`${window.location.origin}/r/${mongoUser?.referralCode || ''}`}
              className="flex-1 w-full bg-transparent text-slate-300 px-4 py-3 text-sm font-mono outline-none"
            />
            <button 
              onClick={() => copyToClipboard(`${window.location.origin}/r/${mongoUser?.referralCode}`)}
              className="w-full sm:w-auto px-6 py-2.5 sm:m-1.5 rounded-none sm:rounded-lg flex items-center justify-center bg-[#4ade80] hover:bg-[#3bb770] text-[#0f1115] font-bold text-sm transition-colors gap-2"
            >
              <FiCopy size={16} /> Copy
            </button>
          </div>
        </div>

        {/* Tabs section */}
        <div className="bg-[#1f2128] rounded-2xl border border-white/[0.05] p-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2 ${
                activeTab === 'recent'
                  ? 'bg-[#4ade80] text-[#0f1115] shadow-lg'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <FiInbox /> Recent Affiliate Earnings
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-[#4ade80] text-[#0f1115] shadow-lg'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <FiUsers /> Referred Users
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-[#4ade80] text-[#0f1115] shadow-lg'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <FiClock /> Pending Affiliate Earnings
            </button>
        </div>

        {/* Table Content Section */}
        <div className="bg-[#1f2128] rounded-2xl border border-white/[0.05] overflow-hidden p-6">
           
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
                 <>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse min-w-[600px]">
                       <thead>
                         <tr className="text-slate-400 text-sm border-b border-[#2a2d36]">
                           <th className="pb-4 font-medium px-4">User</th>
                           <th className="pb-4 font-medium px-4">Date</th>
                           <th className="pb-4 font-medium px-4">Earning</th>
                           <th className="pb-4 font-medium px-4">Commission ({statsLoading ? '...' : (stats.referralPercentage != null ? `${stats.referralPercentage}%` : '10%')})</th>
                           <th className="pb-4 font-medium px-4 text-right">Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-[#2a2d36]">
                         {referrals.dataList.map(tx => (
                           <tr key={tx._id} className="hover:bg-white/[0.02] transition-colors">
                             <td className="py-4 px-4">
                               <div className="flex items-center gap-3">
                                  <img src={tx.linkedTransactionId?.userId?.avatarUrl || tx.linkedTransactionId?.userId?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${tx._id}`} className="w-8 h-8 rounded-full bg-[#15171e] object-cover" alt="avatar"/>
                                  <span className="font-bold text-white">{tx.description?.replace(/Referral Reward from /i, '') || 'Unknown'}</span>
                               </div>
                             </td>
                             <td className="py-4 px-4 text-white font-medium">{new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                             <td className="py-4 px-4">
                               <div className="flex items-center gap-1 font-bold text-[#fbbf24]">
                                 <CoinIcon size={14} /> {(tx.amount * 10).toLocaleString()}
                               </div>
                             </td>
                             <td className="py-4 px-4">
                               <div className="flex items-center gap-1 font-bold text-[#fbbf24]">
                                 <CoinIcon size={14} /> {tx.amount.toLocaleString()}
                               </div>
                             </td>
                             <td className="py-4 px-4 text-right">
                               <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${tx.status === 'hold' ? 'bg-[#fbbf24]/10 text-[#fbbf24]' : 'bg-[#153423] text-[#4ade80]'}`}>
                                 {tx.status === 'hold' ? 'Pending' : 'Paid'}
                               </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   <Pagination 
                     page={referrals.page} 
                     totalPages={referrals.totalPages} 
                     onNext={referrals.nextPage} 
                     onPrev={referrals.prevPage} 
                   />
                 </>
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
                     <table className="w-full text-left border-collapse min-w-[600px]">
                       <thead>
                         <tr className="text-slate-400 text-sm border-b border-[#2a2d36]">
                           <th className="pb-4 font-medium px-4">User</th>
                           <th className="pb-4 font-medium px-4">Joined Date</th>
                           <th className="pb-4 font-medium px-4">Total Earning</th>
                           <th className="pb-4 font-medium px-4">Your Commission</th>
                           <th className="pb-4 font-medium px-4 text-right">Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-[#2a2d36]">
                         {referredUsersData.users.map(u => (
                           <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                             <td className="py-4 px-4">
                               <div className="flex items-center gap-3">
                                  <img src={u.avatarUrl || u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.displayName}`} className="w-8 h-8 rounded-full bg-[#15171e] object-cover" alt="avatar"/>
                                  <span className="font-bold text-white">{u.displayName}</span>
                               </div>
                             </td>
                             <td className="py-4 px-4 text-white font-medium">{new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                             <td className="py-4 px-4">
                               <div className="flex items-center gap-1 font-bold text-[#fbbf24]">
                                 <CoinIcon size={14} /> {(u.totalEarned || 0).toLocaleString()}
                               </div>
                             </td>
                             <td className="py-4 px-4">
                               <div className="flex items-center gap-1 font-bold text-[#fbbf24]">
                                 <CoinIcon size={14} /> {(u.referralEarnings > 0 ? u.referralEarnings : Math.floor((u.totalEarned || 0) * ((stats.referralPercentage || 10) / 100))).toLocaleString()}
                               </div>
                             </td>
                             <td className="py-4 px-4 text-right">
                               <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#153423] text-[#4ade80]">
                                 Active
                               </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   <Pagination 
                     page={referredUsersData.page} 
                     totalPages={referredUsersData.totalPages} 
                     onNext={referredUsersData.nextPage} 
                     onPrev={referredUsersData.prevPage} 
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
                     <table className="w-full text-left border-collapse min-w-[600px]">
                       <thead>
                         <tr className="text-slate-400 text-sm border-b border-[#2a2d36]">
                           <th className="pb-4 font-medium px-4">User</th>
                           <th className="pb-4 font-medium px-4">Earning Date</th>
                           <th className="pb-4 font-medium px-4">Earning</th>
                           <th className="pb-4 font-medium px-4">Commission ({statsLoading ? '...' : (stats.referralPercentage != null ? `${stats.referralPercentage}%` : '10%')})</th>
                           <th className="pb-4 font-medium px-4 text-right">Release In</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-[#2a2d36]">
                         {currentPendingHolds.map(tx => (
                           <tr key={tx._id} className="hover:bg-white/[0.02] transition-colors">
                             <td className="py-4 px-4">
                               <div className="flex items-center gap-3">
                                  <img src={tx.linkedTransactionId?.userId?.avatarUrl || tx.linkedTransactionId?.userId?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${tx._id}`} className="w-8 h-8 rounded-full bg-[#15171e] object-cover" alt="avatar"/>
                                  <span className="font-bold text-white">{tx.description?.replace(/Referral Reward from /i, '') || 'Unknown'}</span>
                               </div>
                             </td>
                             <td className="py-4 px-4 text-white font-medium">{new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                             <td className="py-4 px-4">
                               <div className="flex items-center gap-1 font-bold text-[#fbbf24]">
                                 <CoinIcon size={14} /> {(tx.amount * 10).toLocaleString()}
                               </div>
                             </td>
                             <td className="py-4 px-4">
                               <div className="flex items-center gap-1 font-bold text-[#fbbf24]">
                                 <CoinIcon size={14} /> {tx.amount.toLocaleString()}
                               </div>
                             </td>
                             <td className="py-4 px-4 text-right text-slate-300 font-medium">
                               {calculateReleaseIn(tx.releaseDate)}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   <Pagination 
                     page={pendingPage} 
                     totalPages={totalPendingPages} 
                     onNext={() => setPendingPage(p => Math.min(totalPendingPages, p + 1))} 
                     onPrev={() => setPendingPage(p => Math.max(1, p - 1))} 
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
