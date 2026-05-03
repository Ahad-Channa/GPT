import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiUsers, FiDollarSign, FiZap, FiTerminal } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

// Background Grid Component
const CyberGrid = () => (
  <div className="absolute inset-0 pointer-events-none opacity-[0.15]">
    <div 
      className="absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(to right, #4f46e5 1px, transparent 1px),
          linear-gradient(to bottom, #4f46e5 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
        transformOrigin: 'top center',
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[#03060d] via-transparent to-[#03060d]" />
  </div>
);

const DemoLandingB = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [tickerOffset, setTickerOffset] = useState(0);
  
  // Fake payouts for the ticker
  const payouts = [
    { user: 'Alex99', amount: '$5.50', method: 'PayPal' },
    { user: 'CryptoKing', amount: '$12.00', method: 'Litecoin' },
    { user: 'SarahJ', amount: '$10.00', method: 'Steam' },
    { user: 'GamerX', amount: '$25.00', method: 'Visa' },
    { user: 'MikeT', amount: '$2.50', method: 'PayPal' },
    { user: 'Elena', amount: '$50.00', method: 'Bitcoin' },
  ];

  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col"
      style={{
        background: '#03060d', // Ultra dark
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <CyberGrid />
      
      {/* Top Gradient Highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

      {/* Navbar (Minimal) */}
      <nav className="relative z-20 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between w-full border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-sm flex items-center justify-center transform rotate-45 border border-indigo-400">
            <FiTerminal className="text-white text-xl transform -rotate-45" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tighter uppercase" style={{ fontFamily: "'Outfit', Inter, sans-serif" }}>
            SYSTEM<span className="text-indigo-500">.EARN</span>
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/login')} className="text-slate-400 hover:text-white text-sm font-semibold uppercase tracking-widest transition-colors">
            Login
          </button>
          <button 
            onClick={() => navigate('/login')} 
            className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all relative overflow-hidden group"
          >
            <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out skew-x-12" />
            Initialize
          </button>
        </div>
      </nav>

      {/* Live Payouts Ticker */}
      <div className="relative z-20 w-full border-b border-white/[0.05] bg-white/[0.02] overflow-hidden flex">
        <div className="flex py-2 animate-[marquee_20s_linear_infinite] whitespace-nowrap">
          {[...payouts, ...payouts, ...payouts].map((p, i) => (
            <div key={i} className="flex items-center gap-2 px-6 text-xs font-mono">
              <span className="text-emerald-400">{p.amount}</span>
              <span className="text-slate-500">paid to</span>
              <span className="text-slate-300 font-semibold">{p.user}</span>
              <span className="text-slate-600">via</span>
              <span className="text-indigo-400">{p.method}</span>
              <span className="mx-4 text-slate-800">|</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}</style>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-20 flex-1 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Column: Typography */}
        <div className="flex-1 max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/10 rounded-sm mb-6 font-mono text-xs text-indigo-400"
          >
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
            SYSTEM ONLINE V2.0
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="font-black uppercase leading-[0.9] mb-8 text-white tracking-tighter"
            style={{ fontSize: 'clamp(3.5rem, 8vw, 7rem)' }}
          >
            Liquidate<br/>
            Your<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-emerald-400">
              Downtime.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-400 text-lg mb-10 leading-relaxed max-w-md border-l-2 border-indigo-500/50 pl-4"
          >
            Engage with premium sponsors. Extract value. Execute instant withdrawals to fiat or cryptocurrency.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            onClick={() => navigate(currentUser ? '/dashboard' : '/login')}
            className="flex items-center gap-4 bg-white text-black px-8 py-4 font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-colors group"
          >
            Commence Extraction 
            <FiArrowRight className="transform group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>

        {/* Right Column: Cyber Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.4 }}
          className="flex-1 w-full max-w-lg relative"
        >
          {/* Glowing backdrop */}
          <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="grid grid-cols-1 gap-4 relative z-10">
            {/* Stat Box 1 */}
            <div className="bg-[#0a0f1c] border border-indigo-500/30 p-6 flex items-center justify-between shadow-[0_0_30px_rgba(79,70,229,0.15)] transform translate-x-0 lg:translate-x-8">
              <div>
                <div className="text-slate-500 font-mono text-xs mb-1">TOTAL_RECORDS.users</div>
                <div className="text-4xl font-black text-white tracking-tighter">145,020</div>
              </div>
              <div className="w-12 h-12 bg-indigo-500/10 flex items-center justify-center border border-indigo-500/50">
                <FiUsers className="text-indigo-500 text-xl" />
              </div>
            </div>

            {/* Stat Box 2 */}
            <div className="bg-[#0a0f1c] border border-emerald-500/30 p-6 flex items-center justify-between shadow-[0_0_30px_rgba(16,185,129,0.15)] transform translate-x-0 lg:-translate-x-4">
              <div>
                <div className="text-slate-500 font-mono text-xs mb-1">VOLUME.distributed_usd</div>
                <div className="text-4xl font-black text-emerald-400 tracking-tighter">$854,000</div>
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 flex items-center justify-center border border-emerald-500/50">
                <FiDollarSign className="text-emerald-500 text-xl" />
              </div>
            </div>
            
            {/* Stat Box 3 */}
            <div className="bg-[#0a0f1c] border border-white/10 p-6 flex items-center justify-between transform translate-x-0 lg:translate-x-12 opacity-80">
               <div>
                <div className="text-slate-500 font-mono text-xs mb-1">NETWORK.status</div>
                <div className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> OPERATIONAL
                </div>
              </div>
              <div className="w-12 h-12 bg-white/5 flex items-center justify-center border border-white/10">
                <FiZap className="text-slate-400 text-xl" />
              </div>
            </div>

          </div>
        </motion.div>

      </main>
    </div>
  );
};

export default DemoLandingB;
