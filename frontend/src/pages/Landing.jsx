import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowRight, FiUsers, FiDollarSign, FiZap,
  FiCheckCircle, FiTrendingUp, FiGift, FiLayers, FiActivity, FiShield,
  FiChevronDown, FiChevronUp, FiStar, FiAward, FiLock, FiLogIn, FiMonitor,
  FiSmartphone, FiBarChart2, FiUserPlus, FiGrid, FiUserCheck, FiClipboard
} from 'react-icons/fi';
import { LuGamepad2, LuBadgePercent } from 'react-icons/lu';
import { FaPaypal, FaAmazon, FaBitcoin, FaDiscord, FaInstagram, FaYoutube, FaFacebook } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Landing = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalPaidOut: 0 });
  const [activeFaq, setActiveFaq] = useState(0);

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
      } catch (e) {
        console.error('Failed to fetch public stats', e);
      }
    };
    fetchStats();
    const intv = setInterval(fetchStats, 60000);
    return () => clearInterval(intv);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const faqs = [
    { q: "How do I earn money?", a: "By completing offers, surveys, and tasks on the platform." },
    { q: "When do I get paid?", a: "Rewards can be instant or take some time depending on the offer." },
    { q: "How do I contact you?", a: "You can reach us through our support page or Discord community." },
    { q: "Is it free to use?", a: "Yes, completely free. No hidden fees or charges." },
    { q: "Why was my reward not credited?", a: "This can happen due to tracking issues. You can contact the offerwall support." },
    { q: "What is the minimum payout?", a: "Our minimum payout starts at just $0.50, depending on the chosen reward method." },
  ];

  const features = [
    { icon: <FiLayers size={22} />, title: "Multiple Offerwalls", desc: "Discover various earning options in one place." },
    { icon: <FiZap size={22} />, title: "Fast Payouts", desc: "Withdraw your earnings quickly and securely." },
    { icon: <FiGift size={22} />, title: "Daily Bonus", desc: "Earn extra rewards every day you stay active." },
    { icon: <FiMonitor size={22} />, title: "VIP Progress", desc: "Level up and unlock better rewards." },
    { icon: <FiUsers size={22} />, title: "Referral System", desc: "Refer friends and earn a share of their income." },
    { icon: <FiActivity size={22} />, title: "Live Activity", desc: "See real-time earnings across the platform." },
  ];

  const earningMethods = [
    { icon: <FiClipboard size={34} />, title: "Surveys", desc: "Share your opinion on various topics and get rewarded instantly.", highlighted: false },
    { icon: <LuGamepad2 size={34} />, title: "Apps & Games", desc: "Download apps or play new games. Reach milestones to earn big.", highlighted: true },
    { icon: <LuBadgePercent size={34} />, title: "Featured Offers", desc: "Sign up for services or trials to earn the highest paying rewards.", highlighted: false },
  ];

  return (
    <div style={{ background: '#0b1512', minHeight: '100vh', color: '#e0ede8', fontFamily: "'Barlow', 'Segoe UI', sans-serif", overflowX: 'hidden' }}>

      {/* ── NAVBAR ── */}
      {currentUser ? (
        <div style={{ position: 'relative', zIndex: 50 }}>
          <Header />
        </div>
      ) : (
        <nav style={{
          position: 'fixed', top: 30, left: 0, right: 0, zIndex: 50,
          display: 'flex', justifyContent: 'center',
          pointerEvents: 'none',
          padding: '0 16px',
        }}>
          <div style={{
            pointerEvents: 'all',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%',
            maxWidth: 1240,
            height: 84,
            gap: 24,
            background: 'rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: 'none',
            outline: 'none',
            borderRadius: 100,
            padding: 18,
            boxShadow: '0px 4px 44px 0px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <img src="/coins/round.png" alt="TaskMint" style={{ width: 34, height: 34, objectFit: 'contain' }} />
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 17, letterSpacing: '-0.2px' }}>TaskMint</span>
            </div>

            {/* Nav links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 13.5 }}>
              <button onClick={() => scrollToSection('home')} style={navLinkStyle}>Home</button>
              <button onClick={() => scrollToSection('earn')} style={navLinkStyle}>Earn</button>
              <button onClick={() => scrollToSection('how-it-works')} style={navLinkStyle}>How it Works</button>
              <button onClick={() => scrollToSection('features')} style={navLinkStyle}>Features</button>
              <button onClick={() => scrollToSection('faq')} style={navLinkStyle}>FAQ</button>
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {/* Language pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                fontSize: 13, color: '#a0b8ac', cursor: 'pointer', fontWeight: 500,
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#a0b8ac'; }}
              >
                🇬🇧 Eng <span style={{ fontSize: 10, opacity: 0.55, marginLeft: 2 }}>▾</span>
              </div>

              {/* Get Started pill */}
              <button
                onClick={() => navigate('/login?tab=register')}
                style={{
                  background: 'linear-gradient(90deg, #29FD98 0%, #2DD4BF 100%)', color: '#051408', padding: '8px 18px',
                  borderRadius: 999, border: 'none', fontWeight: 700, fontSize: 13.5,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                  boxShadow: 'none',
                  transition: 'all 0.2s', fontFamily: 'inherit',
                  letterSpacing: '-0.1px',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(41,253,152,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                Get Started <FiArrowRight size={13} />
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* ── HERO SECTION ── */}
      <section id="home" style={{
        position: 'relative', paddingTop: currentUser ? 80 : 160, paddingBottom: 100,
        display: 'flex', alignItems: 'center',
        background: 'radial-gradient(ellipse 80% 60% at 60% 40%, rgba(41,253,152,0.08) 0%, transparent 70%), #0b1512',
        overflow: 'hidden'
      }}>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', width: '100%', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Left Content */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ flex: 1.2, minWidth: 320, maxWidth: 700 }}>
            <h1 style={{ fontSize: 'clamp(44px, 5.5vw, 68px)', fontWeight: 700, lineHeight: 1.15, marginBottom: 20, color: '#fff', letterSpacing: '-1.5px' }}>
              Your Time Has Value
              <br />
              <span style={{ color: '#29FD98' }}>Get Rewarded For It</span>
            </h1>
            <p style={{ fontSize: 18, color: '#a0b8ac', lineHeight: 1.6, marginBottom: 40, maxWidth: 600 }}>
              Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/login?tab=register')}
                style={{
                  background: '#29FD98', color: '#051408', padding: '14px 32px',
                  borderRadius: 999, border: 'none', fontWeight: 700, fontSize: 15,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s', letterSpacing: '-0.2px'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(41,253,152,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                Start Earning <FiArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'transparent', color: '#fff', padding: '14px 32px',
                  borderRadius: 999, border: '1px solid rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 15,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                  letterSpacing: '-0.2px'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
              >
                <FiLogIn size={18} /> Login
              </button>
            </div>
          </motion.div>

          {/* Right - Hero Image & Stats */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
            style={{ flex: 1, minWidth: 320, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 400 }}
          >
            {/* The Image */}
            <img src="/coins/herosec.png" alt="Rewards" style={{ width: '120%', maxWidth: 700, objectFit: 'contain', zIndex: 1, position: 'relative', right: '-5%', filter: 'grayscale(100%) sepia(100%) hue-rotate(120deg) saturate(400%) brightness(1.2)' }} />

            {/* Stats Box overlay */}
            <div style={{
              position: 'absolute', bottom: '5%', right: '15%', zIndex: 2,
              background: 'rgba(41, 253, 152, 0.05)', 
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: 'none',
              borderRadius: 20, padding: '24px 48px',
              display: 'flex', alignItems: 'center', gap: 48,
              boxShadow: '0 24px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {stats.totalUsers.toLocaleString()}
                </div>
                <div style={{ fontSize: 13, color: '#9ab8a8', marginTop: 8, fontWeight: 500 }}>Total Users</div>
              </div>
              
              <div style={{ width: 1, height: 45, background: 'rgba(255,255,255,0.12)' }} />

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  ${stats.totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 13, color: '#9ab8a8', marginTop: 8, fontWeight: 500 }}>Total Paid</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TRUST BADGES ── */}
      <section style={{
        background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(41,253,152,0.07)', borderBottom: '1px solid rgba(41,253,152,0.07)',
        padding: '36px 40px'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 50, flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#fff' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              border: '1px solid rgba(41,253,152,0.2)', background: 'rgba(41,253,152,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}><FiUsers size={22} /></div>
            <span style={{ fontSize: 17, fontWeight: 500 }}>Real Users Earning Daily</span>
          </div>

          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} className="hidden sm:block" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#fff' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              border: '1px solid rgba(41,253,152,0.2)', background: 'rgba(41,253,152,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}><FiShield size={22} /></div>
            <span style={{ fontSize: 17, fontWeight: 500 }}>Secure And Reliable Platform</span>
          </div>

          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} className="hidden sm:block" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#fff' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              border: '1px solid rgba(41,253,152,0.2)', background: 'rgba(41,253,152,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}><FiAward size={22} /></div>
            <span style={{ fontSize: 17, fontWeight: 500 }}>Transparent Reward System</span>
          </div>

        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ 
        padding: '100px 40px', position: 'relative', overflow: 'hidden',
        background: '#0b1512'
      }}>
        {/* Tiled fading background */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.15,
          backgroundImage: 'linear-gradient(rgba(41,253,152,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(41,253,152,0.4) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)'
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 40, fontWeight: 700, color: '#fff', marginBottom: 12 }}>How It Works</h2>
            <p style={{ fontSize: 16, color: '#9ab8a8' }}>Get started in seconds. No complicated setup required.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, position: 'relative' }}>
            {[
              { num: 1, icon: <FiUserCheck size={28} strokeWidth={1.5} />, title: 'Sign Up', desc: 'Create your free account in seconds and get instant access to the platform.' },
              { num: 2, icon: <FiClipboard size={28} strokeWidth={1.5} />, title: 'Complete Tasks', desc: 'Choose from hundreds of offers, surveys, and apps to complete at your own pace.' },
              { num: 3, icon: <FiGift size={28} strokeWidth={1.5} />, title: 'Earn Rewards', desc: 'Get coins and convert them into real money, crypto, or gift cards instantly.' },
            ].map((step, i) => (
              <div key={step.num} style={{ position: 'relative', zIndex: 10 - i }}>
                <motion.div
                  whileHover={{ y: -4 }}
                  style={{
                    background: 'rgba(21, 25, 24, 0.85)', backdropFilter: 'blur(12px)',
                    border: 'none',
                    borderRadius: 24, padding: '40px 32px', position: 'relative', transition: 'all 0.3s',
                    height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    zIndex: 1
                  }}
                >
                  {/* Big number background */}
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    fontSize: 180, fontWeight: 900, color: 'rgba(255,255,255,0.02)', lineHeight: 0.8,
                    userSelect: 'none', zIndex: 0
                  }}>
                    {step.num}
                  </div>

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Arch Wrapper for Icon */}
                    <div style={{ 
                      width: 80, height: 110, 
                      background: 'linear-gradient(to bottom, rgba(41,253,152,0.12) 0%, transparent 100%)',
                      borderTopLeftRadius: 40, borderTopRightRadius: 40,
                      display: 'flex', justifyContent: 'center', paddingTop: 24,
                      color: '#29FD98', marginBottom: 20
                    }}>
                      {step.icon}
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 12 }}>{step.title}</h3>
                    <p style={{ fontSize: 14, color: '#9ab8a8', lineHeight: 1.7 }}>{step.desc}</p>
                  </div>
                </motion.div>

                {/* Connecting Arrow */}
                {i < 2 && (
                  <div className="hidden lg:flex" style={{
                    position: 'absolute', top: '50%', right: -40, transform: 'translateY(-50%)',
                    width: 56, height: 56, borderRadius: '50%', background: '#29FD98',
                    alignItems: 'center', justifyContent: 'center', zIndex: 0,
                    boxShadow: '0 0 20px rgba(41,253,152,0.4)'
                  }}>
                    <FiArrowRight size={26} color="#fff" strokeWidth={3} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section id="features" style={{ padding: '80px 40px', background: '#111c18' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 48, fontWeight: 700, color: '#fff', marginBottom: 12, lineHeight: '48px', letterSpacing: '0%', textAlign: 'center', verticalAlign: 'middle' }}>Why Choose Us</h2>
            <p style={{ fontSize: 15, color: '#9ab8a8' }}>Powerful features designed specifically for you.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 22, justifyItems: 'center' }}>
            {features.map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4, background: 'rgba(255,255,255,0.1)' }}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none',
                  borderRadius: 30, padding: '20px 12px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', textAlign: 'center', transition: 'all 0.3s',
                  width: '100%', maxWidth: 196.67, height: 230
                }}
              >
                {/* Arch Wrapper for Icon */}
                <div style={{
                  width: 64, height: 80,
                  background: 'linear-gradient(to bottom, rgba(41,253,152,0.12) 0%, transparent 100%)',
                  borderTopLeftRadius: 32, borderTopRightRadius: 32,
                  display: 'flex', justifyContent: 'center', paddingTop: 16,
                  color: '#29FD98', marginBottom: 20
                }}>
                  {f.icon}
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{f.title}</h4>
                <p style={{ fontSize: 13, color: '#9ab8a8', lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOWER SECTION WRAPPER ── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Background Grid */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '100%', zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(41, 253, 152, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(41, 253, 152, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 65%, rgba(0,0,0,1) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 65%, rgba(0,0,0,1) 100%)'
        }} />

        {/* ── START EARNING WITH ── */}
        <section id="earn" style={{ padding: '80px 40px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <h2 style={{ fontSize: 32, fontWeight: 700, color: '#fff', margin: '0 auto 12px', width: 391, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Start Earning With</h2>
              <p style={{ fontSize: 15, color: '#9ab8a8' }}>Multiple ways to stack your coins. Choose what works best for you.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, maxWidth: 1240, margin: '0 auto', justifyItems: 'center' }}>
              {earningMethods.map((method, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -4 }}
                  style={{
                    background: method.highlighted ? 'linear-gradient(90deg, #29FD98 0%, #2DD4BF 100%)' : 'rgba(248, 250, 251, 0.04)',
                    backdropFilter: method.highlighted ? 'none' : 'blur(24px)',
                    WebkitBackdropFilter: method.highlighted ? 'none' : 'blur(24px)',
                    borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-start', textAlign: 'left', gap: 12,
                    boxShadow: method.highlighted ? '0 12px 40px rgba(41,253,152,0.15)' : 'none',
                    transition: 'all 0.3s',
                    width: '100%', maxWidth: 397.33, height: 252,
                    borderBottom: method.highlighted ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  {/* Arch Wrapper */}
                  <div style={{
                    width: 94, height: 94, gap: 10,
                    background: 'linear-gradient(180deg, rgba(41, 253, 152, 0.2) 0%, rgba(41, 253, 152, 0) 100%)',
                    borderTopLeftRadius: 60, borderTopRightRadius: 60,
                    display: 'flex', justifyContent: 'center', paddingTop: 20,
                    color: method.highlighted ? '#000' : '#29FD98'
                  }}>
                    {method.icon}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: method.highlighted ? '#000' : '#fff' }}>{method.title}</h3>
                  <p style={{ fontSize: 14, color: method.highlighted ? 'rgba(0,0,0,0.7)' : '#9ab8a8', lineHeight: 1.7 }}>{method.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" style={{ padding: '80px 40px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <h2 style={{ fontSize: 32, fontWeight: 700, color: '#fff', margin: '0 auto 12px', width: 594, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Frequently Asked Questions</h2>
              <p style={{ fontSize: 15, color: '#9ab8a8' }}>Got questions? We've got answers.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: 20, overflow: 'hidden',
                    backdropFilter: 'blur(54px)',
                    WebkitBackdropFilter: 'blur(54px)',
                    boxShadow: '0px 4px 34px 0px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                    style={{
                      width: '100%', padding: '30px 20px', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', background: 'none', border: 'none',
                      color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', textAlign: 'left', gap: 10
                    }}
                  >
                    <span>{faq.q}</span>
                    {activeFaq === index
                      ? <FiChevronUp size={20} style={{ color: '#29FD98', flexShrink: 0 }} />
                      : <FiChevronDown size={20} style={{ color: '#29FD98', flexShrink: 0 }} />
                    }
                  </button>
                  <AnimatePresence>
                    {activeFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 20px 30px', fontSize: 13, color: '#9ab8a8', lineHeight: 1.7 }}>
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%' }}>
            {/* Supported Payout Methods */}
            <div style={{
              marginTop: 64, background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              borderRadius: 70, padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20,
              minHeight: 80
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>Supported Payout Methods</span>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#fff', fontWeight: 600 }}>
                  <FaBitcoin style={{ color: '#F7931A', fontSize: 18 }} /> Litecoin
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#fff', fontWeight: 600 }}>
                  <FaPaypal style={{ color: '#00457C', fontSize: 18 }} /> PayPal
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#fff', fontWeight: 600 }}>
                  <FaAmazon style={{ color: '#FF9900', fontSize: 18 }} /> Amazon
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#fff', fontWeight: 600 }}>
                  <FiGift style={{ color: '#ff6ea0', fontSize: 18 }} /> Gift Cards
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── CTA BANNER ── */}
      <section style={{
        background: 'linear-gradient(90deg, #29FD98 0%, #0fd5c9 100%)',
        padding: '48px 40px',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#000', marginBottom: 6 }}>Start Earning Today</h2>
            <p style={{ fontSize: 15, color: 'rgba(0,0,0,0.65)', fontWeight: 500 }}>Join now and start making real money right now!</p>
          </div>
          <button
            onClick={() => navigate('/login?tab=register')}
            style={{
              background: '#fff', color: '#000', padding: '16px 32px',
              borderRadius: 999, border: 'none', fontWeight: 700, fontSize: 15,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
          >
            Get Started <FiArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.05)', background: '#051408', padding: '64px 40px 40px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
          {/* Logo + Description */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
              <img src="/coins/round.png" alt="TaskMint Logo" style={{ width: 44, height: 44 }} />
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 28, letterSpacing: '-0.5px' }}>TaskMint</span>
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
              Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.
            </p>
          </div>

          {/* Footer Links */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 30, flexWrap: 'wrap', width: 708, height: 32, margin: '0 auto' }}>
            {['Features', 'FAQ', 'Blog', 'Terms of Use', 'Privacy Policy', 'Support'].map((link, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
                <a href="#" style={{ fontSize: 13, color: '#00e676', textDecoration: 'none', fontWeight: 600, transition: 'opacity 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                  onMouseLeave={e => e.currentTarget.style.opacity = 1}
                >{link}</a>
                {i < 5 && <span style={{ color: '#fff', fontSize: 12 }}>•</span>}
              </span>
            ))}
          </div>

          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)' }} />

          {/* Bottom Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>© {new Date().getFullYear()} TaskMint. All rights reserved.</p>
            <div style={{ display: 'flex', gap: 20 }}>
              {[FaFacebook, FaInstagram, FaYoutube, FaDiscord].map((Icon, i) => (
                <a key={i} href="#" style={{ color: '#00e676', textDecoration: 'none', transition: 'opacity 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                  onMouseLeave={e => e.currentTarget.style.opacity = 1}
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const navLinkStyle = {
  background: 'none', border: 'none', color: '#fff', fontSize: 14,
  fontWeight: 500, cursor: 'pointer', padding: '4px 0', transition: 'color 0.2s',
  fontFamily: 'inherit'
};

export default Landing;
