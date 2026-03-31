import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiTrendingUp, FiCrosshair, FiZap, FiArrowRight } from 'react-icons/fi';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#08080c] text-slate-200 overflow-hidden relative">
      
      {/* Abstract Ambient Background */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-cyan-900/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-60 -left-20 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Modern NavBar */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            <span className="font-bold text-white text-sm">N</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            GPT<span className="text-slate-500 font-medium">Platform</span>
          </span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:flex items-center space-x-10 text-sm font-medium text-slate-400"
        >
          <a href="#features" className="hover:text-cyan-400 transition-colors">Platform</a>
          <a href="#rewards" className="hover:text-cyan-400 transition-colors">Payouts</a>
          <a href="#about" className="hover:text-cyan-400 transition-colors">Mission</a>
        </motion.div>

        <motion.button 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           onClick={() => navigate('/login')}
           className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/50 text-white font-medium transition-all duration-300 backdrop-blur-md"
        >
          Access Portal
        </motion.button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-24 pb-32 text-center relative z-20">
        <motion.div
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
           className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold uppercase tracking-widest mb-8"
        >
           <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
           Next Generation Earning
        </motion.div>

        <motion.h1 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1, duration: 0.8 }}
           className="text-6xl md:text-8xl font-bold tracking-tighter text-white mb-6 leading-[1.1]"
        >
          Turn Tasks &amp; Surveys <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500">
            Into Rewards.
          </span>
        </motion.h1>
        
        <motion.p 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.3, duration: 0.8 }}
           className="text-slate-400 text-lg md:text-2xl max-w-2xl mx-auto font-light leading-relaxed mb-12"
        >
          Earn points and redeem Crypto, PayPal, Gift Cards, Discord Nitro &amp; more.
        </motion.p>
        
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4 }}
           className="flex flex-col sm:flex-row justify-center items-center gap-6"
        >
           <button 
             onClick={() => navigate('/login')}
             className="w-full sm:w-auto px-10 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
           >
             Start Earning <FiArrowRight />
           </button>
           <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
             <FiZap className="text-yellow-500" /> Instant verification
           </div>
        </motion.div>
      </main>

      {/* Feature Architecture */}
      <section className="max-w-7xl mx-auto px-6 pb-40 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: FiTrendingUp, title: "Create an account", desc: "Simply create an account by signing in with Google or entering your email." },
            { icon: FiCrosshair, title: "Earn Money", desc: "Earn money by simply completing tasks, taking surveys, watching videos and more." },
            { icon: FiZap, title: "Withdraw", desc: "Once you reach the minimum amount, you can cash out via your favourite methods." }
          ].map((feature, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.6 }}
              className="glass-card p-10 hover:-translate-y-2 transition-transform duration-500 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 text-cyan-400 text-2xl group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 transition-colors">
                <feature.icon />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed font-light">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default Landing;
