import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FiGithub, FiTwitter, FiDisc, FiArrowRight, FiUsers, FiDollarSign, FiZap, 
  FiCheckCircle, FiTrendingUp, FiGift, FiLayers, FiActivity, FiShield, 
  FiChevronDown, FiPlayCircle, FiStar, FiAward
} from 'react-icons/fi';
import { FaPaypal, FaAmazon, FaBitcoin } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Background Grid Component
const CyberGrid = () => (
  <div className="absolute inset-0 pointer-events-none opacity-[0.15]">
    <div 
      className="absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(99, 102, 241, 0.4) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(99, 102, 241, 0.4) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
        transformOrigin: 'top center',
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/80 to-transparent" />
  </div>
);

const Landing = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalPaidOut: 0 });
  const [activeFaq, setActiveFaq] = useState(null);

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
    const intv = setInterval(fetchStats, 60000);
    return () => clearInterval(intv);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      q: "How do I earn money?",
      a: "By completing offers, surveys, and tasks on the platform."
    },
    {
      q: "When do I get paid?",
      a: "Rewards can be instant or take some time depending on the offer."
    },
    {
      q: "Is it free to use?",
      a: "Yes, completely free."
    },
    {
      q: "Why was my reward not credited?",
      a: "This can happen due to tracking issues. You can contact the offerwall support."
    },
    {
      q: "What is the minimum payout?",
      a: "Our minimum payout starts at just $0.50, depending on the chosen reward method."
    }
  ];

  const features = [
    { icon: <FiLayers />, title: "Multiple Offerwalls", desc: "Access many earning opportunities in one place" },
    { icon: <FiZap />, title: "Fast Payouts", desc: "Withdraw your earnings quickly and securely" },
    { icon: <FiGift />, title: "Daily Bonus", desc: "Earn extra rewards every day you stay active" },
    { icon: <FiTrendingUp />, title: "VIP Progress", desc: "Level up and unlock better rewards" },
    { icon: <FiUsers />, title: "Referral System", desc: "Invite friends and earn a percentage of their earnings" },
    { icon: <FiActivity />, title: "Live Activity", desc: "See real-time earnings across the platform" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-brand-dark text-[#c8d6ef] font-sans selection:bg-brand-accent/30 selection:text-white">
      <CyberGrid />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-50" />
      <div className="ambient-bg" />

      {/* Conditional Header */}
      {currentUser ? (
        <div className="relative z-50">
          <Header />
        </div>
      ) : (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/80 backdrop-blur-md border-b border-brand-border">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5">
              <img src="/coins/logo1.png" alt="Logo" className="h-10 w-auto object-contain" />
              <span className="font-display font-bold text-xl tracking-tight text-white">GPT Platform</span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="hidden md:flex items-center gap-8 text-sm text-[#c8d6ef] font-medium">
              <button onClick={() => scrollToSection('earn')} className="hover:text-white transition-all">Earn</button>
              <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-all">How it Works</button>
              <button onClick={() => scrollToSection('features')} className="hover:text-white transition-all">Features</button>
              <button onClick={() => scrollToSection('faq')} className="hover:text-white transition-all">FAQ</button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-4">
              <button onClick={() => navigate('/login')} className="hidden sm:block text-sm font-bold text-[#c8d6ef] hover:text-white uppercase tracking-wider">
                Login
              </button>
              <button onClick={() => navigate('/login?tab=register')} className="btn-glow px-6 py-2 text-sm uppercase tracking-widest rounded-lg">
                Sign Up
              </button>
            </motion.div>
          </div>
        </nav>
      )}

      {/* 2. Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center mt-10 lg:mt-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 glass-card mb-8 font-mono text-xs text-brand-cyan shadow-glow-cyan">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
            Live
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter leading-tight mb-6 text-white">
            Earn Money Online <br />
            <span className="text-transparent bg-clip-text bg-gradient-brand">
              Simple, Fast & Real
            </span>
          </h1>
          <p className="text-lg md:text-xl text-[#c8d6ef]/80 max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
            Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button onClick={() => navigate('/login?tab=register')} className="w-full sm:w-auto btn-glow px-8 py-4 uppercase tracking-widest flex items-center justify-center gap-2 group">
              Start Earning
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => navigate('/login')} className="w-full sm:w-auto glass-card px-8 py-4 text-white font-bold uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2">
              Login
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="stat-card">
              <div className="text-3xl md:text-4xl font-black text-white clean-numbers">{stats.totalUsers.toLocaleString()}</div>
              <div className="text-sm font-mono text-brand-accent uppercase tracking-wider mt-1">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="text-3xl md:text-4xl font-black text-brand-cyan clean-numbers">${stats.totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-sm font-mono text-brand-cyan/80 uppercase tracking-wider mt-1">Total Paid</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. How It Works */}
      <section id="how-it-works" className="relative z-10 py-24 bg-brand-darker border-y border-brand-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight mb-4 text-white">How It Works</h2>
            <div className="w-16 h-1 bg-brand-accent mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8 relative group hover:border-brand-accent/50 transition-colors">
              <div className="absolute -top-6 left-8 w-12 h-12 bg-gradient-brand rounded-xl flex items-center justify-center font-black text-xl text-white shadow-glow transform -rotate-6 group-hover:rotate-0 transition-transform">1</div>
              <FiUsers className="text-4xl text-brand-accent mb-6 mt-4" />
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wide text-white">Sign Up</h3>
              <p className="text-[#c8d6ef]/80">Create your free account in seconds and get instant access to the platform.</p>
            </div>
            <div className="glass-card p-8 relative group hover:border-brand-cyan/50 transition-colors">
              <div className="absolute -top-6 left-8 w-12 h-12 bg-gradient-to-br from-brand-cyan to-blue-500 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-glow-cyan transform rotate-3 group-hover:rotate-0 transition-transform">2</div>
              <FiCheckCircle className="text-4xl text-brand-cyan mb-6 mt-4" />
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wide text-white">Complete Tasks</h3>
              <p className="text-[#c8d6ef]/80">Choose from hundreds of offers, surveys, and apps to complete at your own pace.</p>
            </div>
            <div className="glass-card p-8 relative group hover:border-brand-violet/50 transition-colors">
              <div className="absolute -top-6 left-8 w-12 h-12 bg-gradient-to-br from-brand-violet to-purple-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-glow transform -rotate-3 group-hover:rotate-0 transition-transform">3</div>
              <FiDollarSign className="text-4xl text-brand-violet mb-6 mt-4" />
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wide text-white">Earn Rewards</h3>
              <p className="text-[#c8d6ef]/80">Get coins and convert them into real money, crypto, or gift cards instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight mb-4 text-white">Why Choose Us</h2>
          <div className="w-16 h-1 bg-brand-accent mx-auto rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-4 p-6 glass-card hover:bg-white/[0.04] transition-colors">
              <div className="w-12 h-12 shrink-0 bg-brand-accent/10 border border-brand-accent/30 rounded-xl flex items-center justify-center text-brand-accent text-xl shadow-[inset_0_0_12px_rgba(99,102,241,0.2)]">
                {f.icon}
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1 text-white">{f.title}</h4>
                <p className="text-sm text-[#c8d6ef]/80 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Earnings Section */}
      <section id="earn" className="relative z-10 py-32 bg-brand-dark overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-accent/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-black uppercase tracking-tight mb-4 text-white">Start Earning With</h2>
            <div className="w-16 h-1 bg-brand-accent mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-[#c8d6ef]/80 max-w-2xl mx-auto">Multiple ways to stack your coins. Choose what works best for you.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-8 flex flex-col items-center text-center group hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6 shadow-[inset_0_0_20px_rgba(99,102,241,0.2)] group-hover:scale-110 transition-transform">
                <FiActivity className="text-3xl text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-wide text-white mb-3">Surveys</h3>
              <p className="text-[#c8d6ef]/70 leading-relaxed">Share your opinion on various topics and get rewarded instantly.</p>
            </div>
            
            <div className="glass-card p-8 flex flex-col items-center text-center group hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mb-6 shadow-[inset_0_0_20px_rgba(139,92,246,0.2)] group-hover:scale-110 transition-transform">
                <FiPlayCircle className="text-3xl text-violet-400" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-wide text-white mb-3">Apps & Games</h3>
              <p className="text-[#c8d6ef]/70 leading-relaxed">Download apps or play new games. Reach milestones to earn big.</p>
            </div>
            
            <div className="glass-card p-8 flex flex-col items-center text-center group hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 shadow-[inset_0_0_20px_rgba(6,182,212,0.2)] group-hover:scale-110 transition-transform">
                <FiStar className="text-3xl text-cyan-400" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-wide text-white mb-3">Featured Offers</h3>
              <p className="text-[#c8d6ef]/70 leading-relaxed">Sign up for services or trials to earn the highest paying rewards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Trust Section */}
      <section className="relative z-10 py-16 border-y border-brand-border bg-brand-accent/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-around items-center gap-8 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-brand-card border border-brand-border rounded-full flex items-center justify-center mb-3">
              <FiUsers className="text-brand-accent text-xl" />
            </div>
            <h4 className="font-bold uppercase tracking-wide text-white">Real users earning daily</h4>
          </div>
          <div className="hidden md:block w-px h-16 bg-brand-border"></div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-brand-card border border-brand-border rounded-full flex items-center justify-center mb-3">
              <FiShield className="text-brand-accent text-xl" />
            </div>
            <h4 className="font-bold uppercase tracking-wide text-white">Secure and reliable platform</h4>
          </div>
          <div className="hidden md:block w-px h-16 bg-brand-border"></div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-brand-card border border-brand-border rounded-full flex items-center justify-center mb-3">
              <FiAward className="text-brand-accent text-xl" />
            </div>
            <h4 className="font-bold uppercase tracking-wide text-white">Transparent reward system</h4>
          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section id="faq" className="relative z-10 py-24 px-6 max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight mb-4 text-white">Frequently Asked Questions</h2>
          <div className="w-16 h-1 bg-brand-accent mx-auto rounded-full"></div>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="glass-card overflow-hidden">
              <button 
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-bold pr-4 text-white">{faq.q}</span>
                <FiChevronDown className={`text-brand-accent transform transition-transform ${activeFaq === index ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {activeFaq === index && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-[#c8d6ef]/80 leading-relaxed border-t border-brand-border pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Payment Methods Section */}
      <section className="relative z-10 py-16 bg-[#04060b] overflow-hidden border-t border-brand-border">
        <div className="text-center mb-10">
          <h3 className="text-xl md:text-2xl font-display font-black uppercase tracking-wider text-white">Supported Payout Methods</h3>
        </div>
        <div className="flex animate-marquee whitespace-nowrap opacity-50 hover:opacity-100 transition-opacity">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-16 px-8">
              <div className="flex items-center gap-2 text-2xl font-display font-bold text-white"><FaBitcoin className="text-[#F7931A]" /> Litecoin</div>
              <div className="flex items-center gap-2 text-2xl font-display font-bold text-white"><FaPaypal className="text-[#00457C]" /> PayPal</div>
              <div className="flex items-center gap-2 text-2xl font-display font-bold text-white"><FaAmazon className="text-[#FF9900]" /> Amazon</div>
              <div className="flex items-center gap-2 text-2xl font-display font-bold text-white"><FiGift className="text-pink-500" /> Gift Cards</div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. Final CTA Section */}
      <section className="relative z-10 py-32 px-6 max-w-4xl mx-auto text-center">
        <div className="absolute inset-0 bg-brand-accent/10 blur-[100px] rounded-full pointer-events-none" />
        <h2 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tight mb-8 relative text-white">Start Earning Today</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative">
          <button onClick={() => navigate('/login?tab=register')} className="w-full sm:w-auto btn-glow px-10 py-5 uppercase tracking-widest text-lg">
            Sign Up
          </button>
          <button onClick={() => navigate('/login')} className="w-full sm:w-auto glass-card px-10 py-5 text-white font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
            Login
          </button>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="relative z-10 border-t border-brand-border py-8 text-center text-sm text-[#c8d6ef]/60">
        <p>&copy; {new Date().getFullYear()} GPT Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
