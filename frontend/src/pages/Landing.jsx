import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiGithub, FiTwitter, FiDisc, FiArrowRight, FiUsers, FiDollarSign } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ─── Floating Orb ─────────────────────────────────────────── */
const Orb = ({ style, color, size = 16 }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: size,
      height: size,
      background: color,
      filter: 'blur(1px)',
      ...style,
    }}
  />
);


/* ═══════════════════════════════════════════════════════════
   Landing Page
═══════════════════════════════════════════════════════════ */
const Landing = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalUsers: 0, totalPaidOut: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API}/public/stats`);
        const data = await res.json();
        if (data.success) {
          setStats({
            totalUsers: data.totalUsers || 0,
            totalPaidOut: data.totalPaidOut || 0
          });
        }
      } catch(e) {
        console.error('Failed to fetch public stats', e);
      }
    };
    fetchStats();
    const intv = setInterval(fetchStats, 60000); // refresh every minute
    return () => clearInterval(intv);
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 15% 50%, #0a0a1a 0%, #000000 60%)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Dark right-side vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 80% at 90% 40%, rgba(6,18,50,0.8) 0%, transparent 70%)',
        }}
      />

      {/* Scattered floating dots */}
      <Orb color="#3b82f6"  size={14} style={{ top: '18%', left: '8%',  opacity: 0.85 }} />
      <Orb color="#2563eb"  size={10} style={{ top: '28%', right: '12%', opacity: 0.8 }} />
      <Orb color="#0ea5e9"  size={8}  style={{ top: '55%', left: '15%', opacity: 0.7 }} />
      <Orb color="#60a5fa"  size={12} style={{ top: '42%', right: '7%', opacity: 0.75 }} />
      <Orb color="#38bdf8"  size={6}  style={{ top: '70%', left: '5%',  opacity: 0.6 }} />
      <Orb color="#7dd3fc"  size={10} style={{ top: '65%', right: '18%',opacity: 0.65 }} />
      <Orb color="#1d4ed8"  size={18} style={{ top: '78%', left: '30%', opacity: 0.4, filter: 'blur(4px)' }} />
      <Orb color="#0284c7"  size={22} style={{ top: '75%', right: '25%',opacity: 0.35, filter: 'blur(6px)' }} />

      {/* ─── Navbar ─────────────────────────────────────────────── */}
      <nav className="relative z-20 max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5"
        >
          <span className="text-white font-bold text-xl tracking-tight" style={{ fontFamily: "'Outfit', Inter, sans-serif" }}>
            GPT Platform
          </span>
        </motion.div>

        {/* Nav Links */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="hidden md:flex items-center gap-8 text-sm text-gray-400"
        >
          {['Platform', 'Services', 'Payouts', 'Roadmap', 'About'].map(link => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="hover:text-white transition-colors duration-200"
            >
              {link}
            </a>
          ))}
        </motion.div>

        {/* Social icons + CTA */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-5"
        >
          {/* Social Icons */}
          <div className="hidden sm:flex items-center gap-4 text-gray-500">
            <a href="#" className="hover:text-white transition-colors"><FiGithub size={17} /></a>
            <a href="#" className="hover:text-white transition-colors"><FiDisc size={17} /></a>
            <a href="#" className="hover:text-white transition-colors"><FiTwitter size={17} /></a>
          </div>
        </motion.div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-0 text-center">

        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1
            className="font-bold leading-tight mb-2"
            style={{
              fontFamily: "'Outfit', Inter, sans-serif",
              fontSize: 'clamp(2.6rem, 7vw, 5.2rem)',
              lineHeight: 1.1,
            }}
          >
            <span
              style={{
                background: 'linear-gradient(90deg, #60a5fa 0%, #2563eb 55%, #0ea5e9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Earn Real Money.
            </span>
            <br />
            <span className="text-white">Instantly.</span>
          </h1>
        </motion.div>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-gray-400 mx-auto mt-5 mb-10 leading-relaxed"
          style={{ maxWidth: '480px', fontSize: '0.95rem' }}
        >
          Complete simple tasks, surveys and offers. Earn points and redeem for{' '}
          Crypto, PayPal, Gift Cards, Discord Nitro & more.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 50%, #0ea5e9 100%)',
              borderRadius: '999px',
              boxShadow: '0 0 24px rgba(37,99,235,0.4)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Get Started <FiArrowRight size={14} />
          </button>

          <button
            className="flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/[0.08]"
            style={{
              background: 'transparent',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.25)',
              cursor: 'pointer',
            }}
          >
            Explore Rewards
          </button>
        </motion.div>
        {/* Global Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 pb-24"
        >
          <div className="flex flex-col flex-1 max-w-[200px] items-center text-center p-4 rounded-3xl bg-white/[0.01] border border-white/[0.05] shadow-card">
            <div className="w-10 h-10 mb-3 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <FiUsers className="text-blue-400" size={18} />
            </div>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white mb-1">
               {stats.totalUsers.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Registered Users</span>
          </div>

          <div className="flex flex-col flex-1 max-w-[200px] items-center text-center p-4 rounded-3xl bg-white/[0.01] border border-white/[0.05] shadow-card">
            <div className="w-10 h-10 mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <FiDollarSign className="text-emerald-400" size={18} />
            </div>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white mb-1 flex items-center">
              ${stats.totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Total Paid Out</span>
          </div>
        </motion.div>
      </main>



    </div>
  );
};

export default Landing;
