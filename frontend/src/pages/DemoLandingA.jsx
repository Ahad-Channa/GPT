import { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiGithub, FiTwitter, FiDisc, FiArrowRight, FiUsers, FiDollarSign, FiPlay, FiGift, FiZap } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Custom hook for animated counting
const useCountUp = (end, duration = 2000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutExpo)
      const easePercentage = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      
      setCount(Math.floor(end * easePercentage));

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
};

// Background Orb Component
const Orb = ({ style, color, size = 16, delay = 0 }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: style.opacity || 0.5, 
      scale: 1,
      y: [0, -20, 0],
      x: [0, 10, 0]
    }}
    transition={{ 
      duration: 5, 
      delay, 
      repeat: Infinity, 
      repeatType: 'reverse' 
    }}
    style={{
      width: size,
      height: size,
      background: color,
      filter: 'blur(2px)',
      ...style,
    }}
  />
);

const DemoLandingA = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 145020, totalPaidOut: 854000.50 });

  // In a real scenario, fetch stats. For demo, we use placeholder high numbers.
  const animatedUsers = useCountUp(stats.totalUsers, 2500);
  const animatedPayout = useCountUp(stats.totalPaidOut, 2500);

  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col"
      style={{
        background: '#040814',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

      {/* Floating Orbs */}
      <Orb color="#818cf8" size={14} delay={0} style={{ top: '15%', left: '10%' }} />
      <Orb color="#34d399" size={24} delay={1} style={{ top: '25%', right: '15%', filter: 'blur(4px)' }} />
      <Orb color="#fbbf24" size={10} delay={2} style={{ top: '65%', left: '18%' }} />
      <Orb color="#60a5fa" size={30} delay={0.5} style={{ top: '75%', right: '25%', filter: 'blur(8px)', opacity: 0.3 }} />
      <Orb color="#a78bfa" size={18} delay={1.5} style={{ top: '45%', right: '5%' }} />

      {/* Navbar */}
      {currentUser ? (
        <div className="relative z-50">
          <Header />
        </div>
      ) : (
        <nav className="relative z-20 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between w-full">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
               <FiZap className="text-white text-xl" />
             </div>
             <span className="text-white font-bold text-xl tracking-tight" style={{ fontFamily: "'Outfit', Inter, sans-serif" }}>
               GPT Platform
             </span>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            {['How it Works', 'Rewards', 'Leaderboard', 'Support'].map(link => (
              <a key={link} href="#" className="hover:text-white transition-colors">{link}</a>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="text-slate-300 hover:text-white text-sm font-semibold transition-colors">
              Log In
            </button>
            <button onClick={() => navigate('/login')} className="px-5 py-2.5 rounded-full bg-white text-slate-900 text-sm font-bold hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              Sign Up Free
            </button>
          </motion.div>
        </nav>
      )}

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-24 text-center flex-1 flex flex-col items-center justify-center">
        
        {/* Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md"
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Over $50k paid out today</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="font-extrabold leading-[1.1] mb-6 max-w-4xl"
          style={{ fontFamily: "'Outfit', Inter, sans-serif", fontSize: 'clamp(3rem, 8vw, 5.5rem)' }}
        >
          <span className="text-white">Turn your free time into </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-emerald-400">
            Real Rewards.
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Play games, answer surveys, and discover new apps. Instantly withdraw your earnings to Crypto, PayPal, or Gift Cards. No hidden fees.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto"
        >
          <button
            onClick={() => navigate(currentUser ? '/dashboard' : '/login')}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-full text-white font-bold text-lg transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
              boxShadow: '0 10px 30px -10px rgba(79, 70, 229, 0.5)',
            }}
          >
            Start Earning Now <FiArrowRight size={20} />
          </button>
          
          <button className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-full text-slate-300 font-semibold text-lg border border-slate-700 hover:bg-slate-800 transition-all duration-300 backdrop-blur-md">
            <FiPlay size={20} /> Watch Demo
          </button>
        </motion.div>

        {/* Premium Counters (Glassmorphism Cards) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl"
        >
          {/* Card 1 */}
          <div className="relative group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 flex flex-col items-center text-center transition-all hover:bg-white/[0.04]">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 mb-5">
              <FiUsers className="text-indigo-400 text-2xl" />
            </div>
            <div className="text-4xl font-bold text-white mb-2 font-display">{animatedUsers.toLocaleString()}+</div>
            <div className="text-slate-400 font-medium tracking-wide uppercase text-xs">Active Earners</div>
          </div>

          {/* Card 2 */}
          <div className="relative group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 flex flex-col items-center text-center transition-all hover:bg-white/[0.04]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 mb-5">
              <FiDollarSign className="text-emerald-400 text-2xl" />
            </div>
            <div className="text-4xl font-bold text-emerald-400 mb-2 font-display">
              ${(animatedPayout).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-slate-400 font-medium tracking-wide uppercase text-xs">Total USD Paid Out</div>
          </div>

          {/* Card 3 */}
          <div className="relative group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 flex flex-col items-center text-center transition-all hover:bg-white/[0.04]">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 mb-5">
              <FiGift className="text-amber-400 text-2xl" />
            </div>
            <div className="text-4xl font-bold text-white mb-2 font-display">&lt; 5 Min</div>
            <div className="text-slate-400 font-medium tracking-wide uppercase text-xs">Average Cashout Time</div>
          </div>
        </motion.div>

      </main>
    </div>
  );
};

export default DemoLandingA;
