import { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  FiZap, FiStar, FiMail, FiCalendar, FiEdit2, FiCheck, FiX, FiShield
} from 'react-icons/fi';

const Profile = () => {
  const { currentUser, mongoUser, setMongoUser } = useAuth();
  const [isEditing,  setIsEditing]  = useState(false);
  const [editName,   setEditName]   = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  const handleEditClick = () => {
    setEditName(mongoUser?.displayName || '');
    setError('');
    setIsEditing(true);
  };

  const handleSave = async () => {
    const nameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!nameRegex.test(editName)) {
      setError('3–20 characters: letters, numbers, dashes, underscores only.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: editName }),
      });
      const data = await res.json();
      if (res.ok) { setMongoUser(data.user); setIsEditing(false); }
      else         { setError(data.error || 'Failed to update profile'); }
    } catch {
      setError('An error occurred while saving.');
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto w-full space-y-6"
      >
        {/* Page Header */}
        <div>
          <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-1">Account</p>
          <h1 className="text-3xl font-bold font-display text-white">Your Profile</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* ─── Identity Card ──────────────────────────── */}
          <div className="md:col-span-4 glass-card p-7 relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-transparent" />

            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10 mb-6 shadow-glow">
              <img
                src={currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${mongoUser?.displayName || 'Felix'}`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Username */}
            <p className="text-[10px] font-semibold text-slate-600 tracking-widest uppercase mb-2">Username</p>

            {isEditing ? (
              <div className="flex flex-col mb-4">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 bg-white/[0.04] border border-white/[0.12] rounded-xl px-3 py-2 text-slate-100 text-sm outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    placeholder="USERNAME"
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    title="Save"
                    className="w-9 h-9 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 transition-all flex items-center justify-center"
                  >
                    <FiCheck size={15} />
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                    title="Cancel"
                    className="w-9 h-9 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-red-500/20 hover:border-red-500/40 text-red-400 transition-all flex items-center justify-center"
                  >
                    <FiX size={15} />
                  </button>
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
              </div>
            ) : (
              <div className="flex items-center justify-between group mb-4">
                <h2 className="text-xl font-bold font-display text-white">
                  {mongoUser?.displayName || 'Anonymous'}
                </h2>
                <button
                  onClick={handleEditClick}
                  title="Edit Username"
                  className="w-8 h-8 rounded-xl border border-white/[0.08] bg-transparent hover:bg-white/[0.05] hover:border-indigo-500/30 text-slate-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                >
                  <FiEdit2 size={13} />
                </button>
              </div>
            )}

            <div className="h-px bg-white/[0.05] my-5" />

            {/* Email */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-600 tracking-widest uppercase mb-1">Email</p>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <FiMail className="text-indigo-400 flex-shrink-0" />
                  <span className="truncate">{currentUser?.email}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-600 tracking-widest uppercase mb-1">Member Since</p>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <FiCalendar className="text-indigo-400 flex-shrink-0" />
                  <span>
                    {mongoUser?.createdAt
                      ? new Date(mongoUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Stats Panel ────────────────────────────── */}
          <div className="md:col-span-8 flex flex-col gap-6">

            {/* Balance + VIP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Balance */}
              <div className="stat-card group">
                <div className="flex items-start justify-between mb-6">
                  <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Liquid Balance</p>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-glow">
                    <FiZap className="text-white text-sm" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white font-mono">
                  {mongoUser?.walletBalance?.toFixed(2) || '0.00'}
                </p>
                <p className="text-indigo-400 text-xs font-mono tracking-widest mt-1">PLATFORM POINTS</p>
              </div>

              {/* VIP */}
              <div className="stat-card group">
                <div className="flex items-start justify-between mb-6">
                  <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Platform Rank</p>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center" style={{ boxShadow: '0 6px 16px rgba(245,158,11,0.2)' }}>
                    <FiStar className="text-white text-sm" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white font-mono">
                  <span className="text-sm text-amber-400 font-semibold mr-1">LVL</span>
                  {mongoUser?.vipLevel || 1}
                </p>
                <p className="text-amber-400/70 text-xs font-mono tracking-widest mt-1">VIP STATUS</p>
              </div>
            </div>

            {/* Account Status */}
            <div className="glass-card p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center" style={{ boxShadow: '0 6px 16px rgba(16,185,129,0.2)' }}>
                  <FiShield className="text-white text-base" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-0.5">Account Status</p>
                  <p className="text-sm font-semibold text-white">Verified & Active</p>
                </div>
              </div>
              <span className="badge-emerald">Active</span>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
