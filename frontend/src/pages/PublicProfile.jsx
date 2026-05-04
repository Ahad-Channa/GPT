import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { FiStar, FiClock, FiShield, FiAlertTriangle, FiLock } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PublicProfile = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [recentOffers, setRecentOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/public/user/${id}`);
        const data = await res.json();
        if (data.success) {
          setProfile(data.profile);
          setRecentOffers(data.recentActiveOffers || []);
        } else {
          setError(data.error || 'User not found');
        }
      } catch (err) {
        setError('Network error loading profile');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-40">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-40 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
            <FiAlertTriangle className="text-2xl text-rose-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
          <p className="text-slate-400 max-w-sm mb-6">{error || 'The user you are looking for does not exist or has been removed.'}</p>
          <Link to="/leaderboard" className="px-6 py-3 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold hover:bg-indigo-500/20 transition-colors">
            Back to Leaderboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-6 pb-20">

        {/* Profile Card Header — always visible */}
        <motion.div variants={item} className="bg-gradient-to-br from-[#0c101b] to-[#111624] border border-white/[0.08] rounded-[2rem] p-8 md:p-10 relative overflow-hidden shadow-glow">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-fuchsia-500/5 rounded-full blur-[60px] pointer-events-none" />

          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10 text-center md:text-left">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-[2rem] overflow-hidden border-4 border-white/[0.05] shadow-xl bg-[#1a2235]">
              <img
                src={profile.avatarUrl || `/avatars/avatar1.png`}
                alt={profile.displayName}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                {profile.displayName}
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-medium">
                {/* Total Earned — only shown for public profiles */}
                {!profile.isPrivate && typeof profile.totalEarned !== 'undefined' && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Total Earned: {profile.totalEarned?.toLocaleString() || 0}
                  </div>
                )}

                {profile.createdAt && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <FiClock /> Joined {new Date(profile.createdAt).getFullYear()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Private Profile — earnings & history hidden */}
        {profile.isPrivate ? (
          <motion.div variants={item} className="bg-[#0c101b] border border-indigo-500/20 rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <FiShield className="text-2xl text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Earnings are private</h2>
            <p className="text-slate-500 text-sm max-w-xs">
              This user has chosen to keep their offer history and earnings private.
            </p>
          </motion.div>
        ) : (
          /* Recent Offers Section — public profiles only */
          <motion.div variants={item} className="bg-[#0c101b] border border-white/[0.08] rounded-3xl p-6 md:p-8">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <FiStar className="text-amber-400" /> Recent Activity
            </h2>

            <div className="space-y-3">
              {recentOffers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  No recent offers found.
                </div>
              ) : (
                recentOffers.map((offer) => (
                  <div key={offer._id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <FiStar className="text-emerald-400 text-lg" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          {offer.description}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {timeAgo(offer.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-400">
                        +{(offer.amount || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500">Coins</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

      </motion.div>
    </DashboardLayout>
  );
};

export default PublicProfile;
