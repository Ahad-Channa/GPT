import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FiShield, FiLoader, FiLogOut } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TwoFactorOverlay = () => {
  const { verify2FA, logout, mongoUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6 || isNaN(code)) {
      toast.error('Please enter a valid 6-digit code.');
      return;
    }
    setLoading(true);
    const result = await verify2FA(code);
    setLoading(false);
    if (result.success) {
      toast.success('Authenticated successfully!');
    } else {
      toast.error(result.error || 'Invalid 2FA code.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (err) {
      toast.error('Failed to log out.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[999999] flex items-center justify-center p-4 select-none">
      <div className="bg-[#121212] border border-white/[0.08] rounded-[2rem] w-full max-w-md p-8 shadow-glow-lg flex flex-col items-center text-center">
        <div className="w-[60px] h-[60px] rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
          <FiShield size={32} />
        </div>

        <h2 
          className="text-2xl font-bold text-white mb-2"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          2-Factor Verification
        </h2>
        <p className="text-slate-400 text-sm mb-6 max-w-xs">
          Enter the 6-digit code from your authenticator app to access your account {mongoUser?.displayName ? `(${mongoUser.displayName})` : ''}.
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full bg-[#1c1c1c] border border-white/[0.08] rounded-xl py-4 text-center text-2xl font-bold text-white tracking-[0.5em] pl-[0.5em] focus:outline-none focus:border-emerald-500/50 transition-colors placeholder-slate-700"
            autoFocus
          />

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#49b265] hover:bg-[#3bb770] disabled:bg-emerald-800/40 disabled:text-white/40 text-white rounded-xl font-bold hover:shadow-glow transition-all font-['Barlow_Condensed'] text-xl"
          >
            {loading ? <FiLoader className="animate-spin text-xl" /> : null}
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>

        <button
          onClick={handleLogout}
          className="mt-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <FiLogOut /> Log Out
        </button>
      </div>
    </div>
  );
};

export default TwoFactorOverlay;
