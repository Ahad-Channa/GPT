import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import AuthModal from '../components/AuthModal';
import {
  FiGlobe, FiLogIn, FiArrowRight, FiUsers, FiDollarSign,
  FiUserPlus, FiCheckSquare, FiGift, FiLayers, FiZap,
  FiMonitor, FiActivity, FiClipboard, FiChevronDown, FiUser, FiMenu, FiX
} from 'react-icons/fi';
import { LuGamepad2, LuBadgePercent } from 'react-icons/lu';
import {
  FaPaypal, FaAmazon, FaBitcoin, FaDiscord,
  FaInstagram, FaYoutube, FaFacebook
} from 'react-icons/fa';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Landing = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalPaidOut: 0 });
  const [openFaq, setOpenFaq] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authModal, setAuthModal] = useState({ isOpen: false, tab: 'login' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'register') {
      setAuthModal({ isOpen: true, tab: 'register' });
    } else if (params.get('tab') === 'login' || params.get('login') === 'true') {
      setAuthModal({ isOpen: true, tab: 'login' });
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  return (
    <div
      className="min-h-screen relative text-gray-900 font-sans overflow-x-hidden selection:bg-[#29FD98] selection:text-black flex flex-col mx-auto"
      style={{
        maxWidth: '1440px',
        width: '100%',
        background: 'linear-gradient(0deg, #FAFAFA, #FAFAFA), linear-gradient(0deg, #FFFFFF, #FFFFFF)'
      }}
    >
      {/* Absolute Right Hero Image (Overlaps header) */}
      {!isMobile && (
        <div
          className="absolute top-0 right-0 z-0 pointer-events-none"
          style={{ width: 755, height: 587 }}
        >
          <img
            src="/coins/hero section image.png"
            alt="Hero Background"
            className="w-full h-full object-fill"
          />
        </div>
      )}

      {/* NAVBAR */}
      {currentUser ? (
        <div className="relative z-50">
          <Header />
        </div>
      ) : (
        <nav
          className="relative z-50 flex justify-between items-center w-full px-4 md:px-8 lg:px-0 mx-auto"
          style={{
            maxWidth: '1328px',
            height: '80px',
            paddingTop: '12px',
            paddingBottom: '12px',
          }}
        >
          {/* Logo */}
          <div className="flex items-center cursor-pointer">
            <img
              src="/coins/logo final.svg"
              alt="TaskMint Logo"
              className="object-contain"
              style={{ width: '161px', height: '28.53px' }}
            />
          </div>

          {/* Links */}
          <div className="hidden lg:flex items-center gap-[40px]">
            <a href="#hero" className="hover:text-black transition-colors" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: 'rgba(30, 30, 30, 1)' }}>Home</a>
            <a href="#earn" className="hover:text-black transition-colors" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: 'rgba(30, 30, 30, 1)' }}>Earn</a>
            <a href="#how-it-works" className="hover:text-black transition-colors whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: 'rgba(30, 30, 30, 1)' }}>How it works</a>
            <a href="#features" className="hover:text-black transition-colors" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: 'rgba(30, 30, 30, 1)' }}>Features</a>
            <a href="#faq" className="hover:text-black transition-colors" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: 'rgba(30, 30, 30, 1)' }}>FAQ</a>
          </div>

          {/* Right Actions */}
          <div className="hidden lg:flex items-center gap-[5px] w-[287px] h-[49px]">
            <button
              onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'login' })}
              className="flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap cursor-pointer"
              style={{
                width: '99px',
                height: '49px',
                padding: '19px 28px',
                gap: '10px',
                borderRadius: '80px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                background: 'rgba(255, 255, 255, 1)',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '28px',
                color: 'rgba(0, 0, 0, 1)'
              }}
            >
              Login
            </button>
            <button
              onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'register' })}
              className="flex items-center justify-center hover:bg-[#1E2631] transition-colors shadow-sm whitespace-nowrap cursor-pointer"
              style={{
                width: '183px',
                height: '49px',
                padding: '19px 28px',
                gap: '10px',
                borderRadius: '80px',
                background: 'rgba(36, 50, 77, 1)',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '28px',
                color: 'rgba(255, 255, 255, 1)'
              }}
            >
              Create Account
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button className="text-gray-900 text-2xl">
              <FiMenu />
            </button>
          </div>
        </nav>
      )}

      {/* Header Bottom Line */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-40 top-[44px] lg:top-[106px]"
        style={{
          width: '100%',
          maxWidth: 1240,
          borderBottom: '1px solid rgba(255, 255, 255, 0.4)'
        }}
      />

      {/* HERO SECTION */}
      <section
        className={isMobile ? "relative pt-8 pb-[40px] px-4 w-full mx-auto flex flex-col items-start gap-6" : "relative w-full mx-auto flex justify-center px-4 md:px-8 lg:px-0"}
        style={!isMobile ? { height: 507, opacity: 1 } : {}}
      >
        <div
          className="w-full h-full flex flex-col lg:flex-row items-center relative z-10"
          style={!isMobile ? { maxWidth: 1328 } : {}}
        >
          {/* Left Content */}
          <div
            className="z-10 flex flex-col gap-6 lg:gap-10"
            style={!isMobile ? {
              width: 664,
              height: 469,
              paddingTop: 40,
              paddingBottom: 16,
              opacity: 1
            } : {
              width: '100%',
              padding: '32px 0px'
            }}
          >
            <div
              className="flex flex-col text-left"
              style={!isMobile ? { width: 608, gap: 40 } : { width: '100%', gap: 24 }}
            >
              <h1
                className="m-0"
                style={!isMobile ? {
                  width: 608,
                  height: 96,
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: 55,
                  lineHeight: '60px',
                  letterSpacing: '-0.02em',
                  color: 'rgba(14, 15, 12, 1)'
                } : {
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: 36,
                  lineHeight: '44px',
                  color: 'rgba(14, 15, 12, 1)'
                }}
              >
                Your Time Has Value<br />
                Get Rewarded For It
              </h1>
              <p
                className="m-0"
                style={!isMobile ? {
                  width: 539,
                  height: 37,
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 16,
                  lineHeight: '26px',
                  color: 'rgba(14, 15, 12, 1)'
                } : {
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 15,
                  lineHeight: '24px',
                  color: 'rgba(14, 15, 12, 1)'
                }}
              >
                Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.
              </p>

              <div
                className="flex items-center"
                style={{ width: 264, height: 49, gap: 5 }}
              >
                <button
                  onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'register' })}
                  className="flex items-center justify-center transition-all hover:bg-[#2A3544] cursor-pointer"
                  style={{
                    width: 160,
                    height: 49,
                    padding: '19px 28px',
                    gap: 10,
                    borderRadius: 80,
                    backgroundColor: 'rgba(36, 50, 77, 1)',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: 16,
                    lineHeight: '28px',
                    color: 'rgba(255, 255, 255, 1)'
                  }}
                >
                  Start Earning
                </button>
                <button
                  onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'login' })}
                  className="flex items-center justify-center transition-all hover:bg-gray-200 cursor-pointer"
                  style={{
                    width: 99,
                    height: 49,
                    padding: '19px 28px',
                    gap: 10,
                    borderRadius: 80,
                    backgroundColor: 'rgba(239, 239, 239, 1)',
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: 16,
                    lineHeight: '28px',
                    color: 'rgba(0, 0, 0, 1)'
                  }}
                >
                  Login
                </button>
              </div>
            </div>

            {/* Stats below buttons */}
            <div
              className="flex items-center"
              style={{ width: 520, height: 45, gap: 60 }}
            >
              {/* Total Users */}
              <div className="flex items-center gap-4">
                <img
                  src="/coins/total user.png"
                  alt="Users"
                  className="object-contain"
                  style={{ width: 44, height: 44, paddingTop: 3.3, paddingBottom: 3.3 }}
                />
                <div className="flex flex-col" style={{ width: 109, height: 43, gap: 15 }}>
                  <span className="uppercase" style={{
                    width: 109, height: 8,
                    fontFamily: '"Poppins", sans-serif', fontWeight: 500, fontSize: 12,
                    lineHeight: '28px', letterSpacing: '0.08em', color: 'rgba(14, 15, 12, 1)',
                    display: 'flex', alignItems: 'center'
                  }}>
                    Total Users:
                  </span>
                  <span style={{
                    width: 109, height: 20,
                    fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, fontSize: 30,
                    lineHeight: '72px', letterSpacing: '-0.02em', color: 'rgba(14, 15, 12, 1)',
                    display: 'flex', alignItems: 'center'
                  }}>
                    {stats.totalUsers.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Total Paid */}
              <div className="flex items-center gap-4">
                <img
                  src="/coins/total paid.png"
                  alt="Paid"
                  className="object-contain"
                  style={{ width: 45, height: 45 }}
                />
                <div className="flex flex-col" style={{ width: 230, height: 43, gap: 15 }}>
                  <span className="uppercase" style={{
                    width: 230, height: 8,
                    fontFamily: '"Poppins", sans-serif', fontWeight: 500, fontSize: 12,
                    lineHeight: '28px', letterSpacing: '0.08em', color: 'rgba(14, 15, 12, 1)',
                    display: 'flex', alignItems: 'center'
                  }}>
                    Total Paid:
                  </span>
                  <span style={{
                    width: 230, height: 20,
                    fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, fontSize: 30,
                    lineHeight: '72px', letterSpacing: '-0.02em', color: 'rgba(14, 15, 12, 1)',
                    display: 'flex', alignItems: 'center'
                  }}>
                    ${stats.totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-12 lg:py-24 px-4 lg:px-6 relative bg-transparent flex justify-center w-full z-10">
        <div
          className="flex flex-col mx-auto w-full h-auto gap-[55px]"
          style={{ maxWidth: 1328 }}
        >
          {/* Header */}
          <div
            className="flex flex-col items-center justify-center mx-auto"
            style={{ width: 500, height: 69, gap: 25 }}
          >
            <h2
              className="m-0 text-center flex items-center justify-center"
              style={{
                width: 314,
                height: 33,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: 50,
                lineHeight: '72px',
                color: 'rgba(14, 15, 12, 1)',
                letterSpacing: '-0.02em'
              }}
            >
              How It Works
            </h2>
            <p
              className="m-0 text-center flex items-center justify-center"
              style={{
                width: 500,
                height: 11,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '28px',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Get started in seconds. No complicated setup required.
            </p>
          </div>

          {/* Steps */}
          <div className="relative flex flex-col lg:flex-row items-start justify-between mx-auto w-full gap-[40px] lg:gap-[20px]">

            {[
              {
                icon: '/coins/s1.png',
                step: 'STEP 01',
                title: 'Sign Up',
                desc: 'Create your free account in seconds and get instant access to the platform.'
              },
              {
                icon: '/coins/s2.png',
                step: 'STEP 02',
                title: 'Complete Tasks',
                desc: 'Choose from hundreds of offers, surveys, and apps to complete at your own pace.'
              },
              {
                icon: '/coins/s3.png',
                step: 'STEP 03',
                title: 'Earn Rewards',
                desc: 'Get coins and convert them into real money, crypto, or gift cards instantly.'
              },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-row items-start gap-[20px] w-full lg:w-[400px] z-10" style={{ background: 'linear-gradient(0deg, #FAFAFA, #FAFAFA), linear-gradient(0deg, #FFFFFF, #FFFFFF)' }}>
                {/* Icon */}
                <div className="shrink-0" style={{ width: 90, height: 90 }}>
                  <img src={item.icon} alt={item.title} style={{ width: 90, height: 90, transform: 'rotate(0deg)', opacity: 1, objectFit: 'contain' }} />
                </div>
                {/* Content */}
                <div className="flex flex-col gap-[8px] mt-[-6px]">
                  <div className="flex flex-col gap-0">
                    <span
                      className="uppercase"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: 12,
                        lineHeight: '28px',
                        letterSpacing: '0.08em',
                        color: 'rgba(14, 15, 12, 1)',
                        opacity: 1
                      }}
                    >
                      {item.step}
                    </span>
                    <h3
                      className="m-0 mt-[-4px]"
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: 22,
                        lineHeight: '28px',
                        color: 'rgba(14, 15, 12, 1)',
                        letterSpacing: '-0.02em',
                        opacity: 1
                      }}
                    >
                      {item.title}
                    </h3>
                  </div>
                  <p
                    className="m-0"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: 12,
                      lineHeight: '20px',
                      color: 'rgba(14, 15, 12, 1)',
                      opacity: 1
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section
        id="features"
        className="mx-auto flex flex-col lg:flex-row items-center w-full max-w-[1440px] lg:h-[558px] py-12 lg:py-0 relative z-10"
        style={{
          background: 'transparent',
          gap: '10px'
        }}
      >
        {/* Left Image */}
        <div className="flex-shrink-0 w-full lg:w-[720px] h-auto lg:h-[558px] pl-4 lg:pl-[56px] pr-4 lg:pr-[24px]">
          <img src="/coins/why chose us.png" alt="Why Choose Us" className="w-full h-full object-cover rounded-[32px]" />
        </div>

        {/* Right Content */}
        <div
          className="flex flex-col w-full px-4 lg:px-[24px] justify-center"
          style={{ transform: 'translateY(10px)' }}
        >
          {/* Heading & Sub */}
          <div
            className="flex flex-col items-start"
            style={{ width: 472, height: 74, gap: 30, marginBottom: 50, marginTop: -15 }}
          >
            <h2
              className="m-0 text-left flex items-center"
              style={{
                width: 472,
                height: 33,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: 50,
                lineHeight: '72px',
                letterSpacing: '-0.02em',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Why Choose Us
            </h2>
            <p
              className="m-0 text-left flex items-center"
              style={{
                width: 472,
                height: 11,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '28px',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Powerful features designed specifically for you.
            </p>
          </div>

          {/* Features Grid */}
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ width: 608, height: 306, gap: 24 }}
          >
            {[
              { icon: '/coins/multi.png', title: 'Multiple Offer walls', desc: 'Discover various earning options in one place.' },
              { icon: '/coins/vip copy.png', title: 'VIP Progress', desc: 'Level up and unlock better rewards' },
              { icon: '/coins/fast copy.png', title: 'Fast Payouts', desc: 'Withdraw your earnings quickly and securely' },
              { icon: '/coins/referl.png', title: 'Referral System', desc: 'Refer friends and earn a share of their income.' },
              { icon: '/coins/daily.png', title: 'Daily Bonus', desc: 'Earn extra rewards every day you stay active' },
              { icon: '/coins/live copy.png', title: 'Live Activity', desc: 'See real-time earnings across the platform' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex flex-row items-center pt-[16px] pb-[8px] gap-[16px] group cursor-pointer"
                style={{ width: 292, borderTop: '1px solid rgba(226, 226, 225, 1)' }}
              >
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: 48, height: 48 }}
                >
                  <img src={item.icon} alt={item.title} className="w-full h-full object-contain" />
                </div>
                <div
                  className="flex flex-col items-start text-left w-full"
                  style={{ gap: 2, paddingTop: 6 }}
                >
                  <div
                    className="m-0 font-medium"
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 500,
                      fontSize: 18,
                      lineHeight: '22px',
                      color: 'rgba(14, 15, 12, 1)'
                    }}
                  >
                    {item.title}
                  </div>
                  <p
                    className="m-0 text-[#0e0f0c] group-hover:text-gray-500 transition-colors duration-300"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 400,
                      fontSize: 14,
                      lineHeight: '20px',
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div
            className="flex flex-row items-center mt-[50px]"
            style={{ width: 264, height: 49, gap: 5 }}
          >
            <button
              onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'register' })}
              className="flex items-center justify-center text-white cursor-pointer hover:bg-[#1E2631] transition-colors"
              style={{
                width: 160,
                height: 49,
                gap: 10,
                borderRadius: 80,
                paddingTop: 19,
                paddingRight: 28,
                paddingBottom: 19,
                paddingLeft: 28,
                background: 'rgba(36, 50, 77, 1)'
              }}
            >
              <span style={{
                width: 104,
                height: 11,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 1)'
              }}>
                Start Earning
              </span>
            </button>
            <button
              onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'login' })}
              className="flex items-center justify-center text-black cursor-pointer hover:bg-gray-200 transition-colors"
              style={{
                width: 99,
                height: 49,
                gap: 10,
                borderRadius: 80,
                paddingTop: 19,
                paddingRight: 28,
                paddingBottom: 19,
                paddingLeft: 28,
                background: 'rgba(239, 239, 239, 1)'
              }}
            >
              <span style={{
                width: 43,
                height: 11,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(0, 0, 0, 1)'
              }}>
                Login
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* START EARNING WITH */}
      <section id="earn" className="py-12 lg:py-24 px-4 lg:px-6 bg-transparent">
        <div
          className="flex flex-col mx-auto w-full h-auto gap-8 lg:gap-[50px]"
          style={{ maxWidth: 1328 }}
        >
          <div
            className="flex flex-col items-center justify-center mx-auto"
            style={{ width: 652, height: 69, gap: 25 }}
          >
            <h2
              className="m-0 flex items-center justify-center"
              style={{
                width: 434,
                height: 33,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: 50,
                lineHeight: '72px',
                letterSpacing: '-0.02em',
                textAlign: 'center',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Start Earning With
            </h2>
            <p
              className="m-0 flex items-center justify-center"
              style={{
                width: 534,
                height: 11,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '28px',
                textAlign: 'center',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Multiple ways to stack your coins. Choose what works best for you.
            </p>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-3 mx-auto w-full"
            style={{ width: 1328, maxWidth: '100%', height: 368, gap: 22 }}
          >
            {['/coins/sew1.png', '/coins/sew2.png', '/coins/sew3.png'].map((imgSrc, idx) => (
              <img
                key={idx}
                src={imgSrc}
                alt={`Start Earning Option ${idx + 1}`}
                className="w-full object-contain mx-auto"
                style={{ maxWidth: '100%', width: 428, height: 368 }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="pt-8 pb-0 lg:pt-8 lg:pb-0 px-4 lg:px-6 bg-transparent">
        <div
          className="flex flex-col lg:flex-row mx-auto w-full items-start"
          style={{ maxWidth: 1328, minHeight: 504, gap: 114 }}
        >
          {/* Left Side */}
          <div
            className="flex flex-col items-start w-full lg:w-[45%]"
            style={{ width: 562, maxWidth: '100%', height: 138, gap: 40 }}
          >
            <h2
              className="m-0"
              style={{
                width: 562,
                maxWidth: '100%',
                height: 87,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: 50,
                lineHeight: '54px',
                letterSpacing: '-0.02em',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Frequently<br />Asked Questions
            </h2>
            <p
              className="m-0"
              style={{
                width: 279,
                maxWidth: '100%',
                height: 11,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '28px',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Got questions? We've got answers.
            </p>
          </div>

          {/* Right Side */}
          <div
            className="flex flex-col w-full lg:w-[55%]"
          >
            {[
              { q: "How do I earn money?", a: "By completing offers, surveys, and tasks on the platform." },
              { q: "When do I get paid?", a: "You can withdraw your earnings instantly at any time." },
              { q: "How do i can contact you?", a: "You can reach us through our 24/7 support ticket system." },
              { q: "Is it free to use?", a: "Yes, it is 100% free to join and start earning." },
              { q: "Why was my reward not credited?", a: "Sometimes tracking takes a bit longer. Contact support if you need help." },
              { q: "What is the minimum payout?", a: "The minimum payout is only $5 for most withdrawal methods." }
            ].map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="flex flex-col justify-start cursor-pointer transition-all duration-300 overflow-hidden w-full"
                  style={{
                    width: 652,
                    maxWidth: '100%',
                    minHeight: 69,
                    gap: 25,
                    borderRadius: 20,
                    padding: '28px 20px 28px 20px',
                    background: isOpen ? 'rgba(246, 245, 237, 1)' : 'transparent',
                  }}
                >
                  <div
                    className="flex justify-between items-center"
                    style={{ width: '100%', height: 13 }}
                  >
                    <span
                      className="m-0"
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 500,
                        fontSize: 20,
                        lineHeight: '22px',
                        color: 'rgba(14, 15, 12, 1)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {faq.q}
                    </span>
                    <div
                      className="transition-transform duration-300 flex items-center justify-center shrink-0"
                      style={{
                        transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                      }}
                    >
                      <img src="/coins/arup.png" alt="Toggle FAQ" style={{ width: 16, height: 10, objectFit: 'contain' }} />
                    </div>
                  </div>
                  {isOpen && (
                    <div
                      className="transition-all duration-300 flex items-start overflow-hidden"
                    >
                      <p
                        className="m-0"
                        style={{
                          width: 394,
                          maxWidth: '100%',
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 400,
                          fontSize: 14,
                          color: 'rgba(14, 15, 12, 0.7)'
                        }}
                      >
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* GET STARTED & PAYOUT OPTIONS */}
      <section className="pt-0 pb-4 lg:pt-0 lg:pb-8 px-4 lg:px-6 w-full flex justify-center bg-transparent">
        <div
          className="flex flex-col mx-auto w-full relative"
          style={{
            maxWidth: 1328,
            minHeight: 245,
            gap: 55,
            borderRadius: 24,
            padding: '40px 0px 6px 0px',
            background: 'rgba(239, 239, 239, 1)',
            overflow: 'hidden'
          }}
        >
          <div
            className="flex flex-col w-full z-10 mx-auto px-4 lg:px-0"
            style={{
              width: 1248,
              maxWidth: '100%',
              height: 80,
              gap: 20
            }}
          >
            <div
              className="flex items-center"
              style={{
                width: 1248,
                maxWidth: '100%',
                height: 49,
                gap: 623
              }}
            >
              <h2
                className="m-0"
                style={{
                  width: 465,
                  maxWidth: '100%',
                  height: 33,
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: 50,
                  lineHeight: '54px',
                  letterSpacing: '-0.02em',
                  color: 'rgba(14, 15, 12, 1)'
                }}
              >
                Start Earning Today
              </h2>
              <button
                onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'register' })}
                className="flex items-center justify-center transition-all hover:brightness-110 active:translate-y-[2px] h-[48px] rounded-[24px] px-8 cursor-pointer"
                style={{
                  background: '#2D3346',
                  color: 'white',
                  width: 160
                }}
              >
                <span
                  className="whitespace-nowrap m-0 p-0 text-[16px] font-medium"
                  style={{ fontFamily: '"Poppins", sans-serif' }}
                >
                  Start Earning
                </span>
              </button>
            </div>

            <p
              className="m-0"
              style={{
                width: 1248,
                maxWidth: '100%',
                height: 11,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '28px',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Join now and start making real money right now!
            </p>
          </div>

          <div
            className="flex w-full overflow-hidden mx-auto px-4 lg:px-0"
            style={{
              width: 1322,
              maxWidth: '100%',
              height: 64,
              borderRadius: 20,
              paddingTop: 16,
              paddingBottom: 16,
              background: 'rgba(222, 223, 247, 1)',
              position: 'relative'
            }}
          >
            <div className="flex animate-[marquee_40s_linear_infinite] whitespace-nowrap items-center w-max" style={{ gap: 56 }}>
              {[...Array(8)].map((_, i) => (
                <React.Fragment key={i}>
                  {[
                    { src: "/coins/LTC.png", text: "Litecoin" },
                    { src: "/coins/giftcard copy.png", text: "Gift Card" },
                    { src: "/coins/amazon copy.png", text: "Amazon" },
                    { src: "/coins/paypal copy.png", text: "Paypal" }
                  ].map((item, idx) => (
                    <div key={`${i}-${idx}`} className="flex items-center gap-2">
                      <div className="flex items-center justify-center shrink-0">
                        <img
                          src={item.src}
                          alt={item.text}
                          style={{
                            width: 25.92,
                            height: 31.9015,
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                      <span
                        className="m-0 whitespace-nowrap"
                        style={{
                          height: 13,
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: 20,
                          lineHeight: '72px',
                          letterSpacing: '-0.02em',
                          color: 'rgba(99, 101, 168, 1)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NEW FOOTER */}
      <footer className="w-full flex justify-center pt-4 pb-12 px-4 lg:px-6 bg-transparent shrink-0">
        <div
          className="flex flex-col lg:flex-row justify-between w-full mx-auto"
          style={{
            maxWidth: 1328,
            minHeight: 715,
            gap: 40
          }}
        >
          {/* Left Panel */}
          <div
            className="relative flex flex-col items-center shrink-0 overflow-hidden"
            style={{
              width: 427,
              height: 715,
              justifyContent: 'space-between',
              opacity: 1,
              borderRadius: 24,
              paddingTop: 50,
              paddingRight: 32,
              paddingBottom: 24,
              paddingLeft: 32,
              background: 'rgba(249, 247, 241, 1)'
            }}
          >
            {/* Background Image */}
            <img
              src="/coins/side.png"
              alt="Background graphics"
              className="absolute bottom-0 left-[-13px] w-full h-auto z-0"
            />

            {/* Logo area */}
            <div
              className="flex flex-col items-center z-10"
              style={{
                width: 363,
                height: 140.586,
                gap: 22
              }}
            >
              <img
                src="/coins/Taksmint WHITE BACKGROUND PNG.png"
                alt="taskmint logo"
                style={{
                  width: 228.998,
                  height: 40.586,
                  objectFit: 'contain'
                }}
              />
              <p className="m-0 text-[18px] font-bold text-gray-900" style={{ fontFamily: '"Bricolage Grotesque", sans-serif', lineHeight: '1' }}>
                Complete tasks. Earn rewards.
              </p>

              <div
                className="flex items-center"
                style={{
                  width: 263,
                  height: 44,
                  gap: 27,
                  borderRadius: 50,
                  paddingTop: 8,
                  paddingRight: 11,
                  paddingBottom: 8,
                  paddingLeft: 11,
                  background: 'rgba(255, 255, 255, 1)'
                }}
              >
                <span
                  className="flex items-center text-gray-800 m-0 whitespace-nowrap"
                  style={{
                    width: 156,
                    height: 10,
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: 14,
                    lineHeight: '28px',
                    letterSpacing: 0
                  }}
                >
                  Change to dark mode
                </span>
                <div
                  className={`rounded-full flex items-center shrink-0 cursor-pointer transition-colors duration-300 ${isDarkMode ? 'justify-end' : 'justify-start'}`}
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  style={{
                    width: 58,
                    height: 28,
                    background: isDarkMode ? '#0eb957' : 'rgba(248, 246, 238, 1)',
                    boxShadow: '0px 3px 3px 0px rgba(56, 63, 71, 0.1) inset',
                    padding: 3
                  }}
                >
                  <div
                    className="bg-white rounded-full shadow-sm"
                    style={{
                      width: 22,
                      height: 22,
                      boxShadow: '0px 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Socials */}
            <div
              className="flex justify-end items-center z-10 relative"
              style={{ width: 363, height: 36, gap: 4, transform: 'translateX(18px)' }}
            >
              {[
                { src: '/coins/fbo.png', alt: 'Facebook' },
                { src: '/coins/iso.png', alt: 'Instagram' },
                { src: '/coins/yoo.png', alt: 'YouTube' }
              ].map((icon, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 75.42,
                    opacity: 1
                  }}
                >
                  <img
                    src={icon.src}
                    alt={icon.alt}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Area */}
          <div className="flex flex-col flex-1 h-full pt-4">

            {/* Top Section */}
            <div className="flex justify-between w-full">
              <div className="flex" style={{ width: 289, height: 273, gap: 80, transform: 'translateY(-27px)' }}>
                <div className="flex flex-col" style={{ width: 108, height: 273, gap: 40 }}>
                  <h4
                    className="m-0"
                    style={{
                      width: 108,
                      height: 13,
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: 20,
                      lineHeight: '32px',
                      letterSpacing: '-0.02em',
                      textAlign: 'center',
                      color: '#0E0F0C'
                    }}
                  >
                    Quick Links
                  </h4>
                  <ul className="flex flex-col list-none p-0 m-0" style={{ width: 91, height: 220, gap: 32 }}>
                    {['Home', 'Earn', 'Leaderboard', 'Affiliates', 'Withdraw', 'Daily Bonus'].map((link) => (
                      <li key={link} className="flex items-center" style={{ height: 10 }}>
                        <a
                          href="#"
                          className="no-underline hover:opacity-100 transition-opacity"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 400,
                            fontSize: 14,
                            lineHeight: '20px',
                            opacity: 0.56,
                            color: '#0E0F0C',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col" style={{ width: 101, height: 273, gap: 40 }}>
                  <h4
                    className="m-0"
                    style={{
                      width: 108,
                      height: 13,
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 700,
                      fontSize: 20,
                      lineHeight: '32px',
                      letterSpacing: '-0.02em',
                      textAlign: 'center',
                      color: '#0E0F0C'
                    }}
                  >
                    Resources
                  </h4>
                  <ul className="flex flex-col list-none p-0 m-0" style={{ width: 91, height: 220, gap: 32 }}>
                    {['Features', 'FAQ', 'Blog', 'Terms of Use', 'Privacy Policy', 'Support'].map((link) => (
                      <li key={link} className="flex items-center" style={{ height: 10 }}>
                        <a
                          href="#"
                          className="no-underline hover:opacity-100 transition-opacity"
                          style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 400,
                            fontSize: 14,
                            lineHeight: '20px',
                            opacity: 0.56,
                            color: '#0E0F0C',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Banner */}
              <div
                className="w-[420px] flex justify-center items-center relative h-fit"
              >
                <img
                  src="/coins/wybt.png"
                  alt="Top Earner Graphic"
                  className="pointer-events-none w-full h-auto"
                  style={{
                    objectFit: 'contain'
                  }}
                />
              </div>
            </div>

            {/* Middle Section (Trustpilot) */}
            <div className="flex items-center justify-between w-full mt-auto mb-6 pt-6">
              <div className="flex flex-col gap-2 items-start">
                <img
                  src="/coins/trust plot.png"
                  alt="Trustpilot rating"
                  style={{
                    width: 169,
                    height: 81,
                    objectFit: 'contain'
                  }}
                />
                <span className="text-[13px] text-gray-900 font-bold" style={{ fontFamily: '"Poppins", sans-serif' }}>
                  Trust score 5 | 145 reviews
                </span>
              </div>
              <button
                className="bg-[#2a3044] hover:bg-[#1a1e2e] transition-colors text-white font-medium text-[15px] px-8 py-4 rounded-[24px]"
                style={{ fontFamily: '"Poppins", sans-serif' }}
              >
                Leave a review
              </button>
            </div>

            {/* Bottom Section (Testimonials) */}
            <div
              className="flex items-center w-full"
              style={{ gap: 16 }}
            >
              {[
                '/coins/mar.png',
                '/coins/ash.png',
                '/coins/john.png'
              ].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Feedback ${i + 1}`}
                  style={{
                    width: 295,
                    height: 215,
                    borderRadius: 20,
                    objectFit: 'contain'
                  }}
                />
              ))}
            </div>

            {/* Copyright */}
            <div className="mt-6 flex w-full">
              <p
                className="m-0 whitespace-nowrap"
                style={{
                  width: 853,
                  height: 10,
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: '20px',
                  color: 'rgba(0, 0, 0, 1)',
                  transform: 'translateY(-6px)'
                }}
              >
                © 2026 TaskMint. All rights reserved.
              </p>
            </div>

          </div>
        </div>
      </footer>

      {/* Auth Modal Popup */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal(prev => ({ ...prev, isOpen: false }))}
        initialTab={authModal.tab}
      />
    </div>
  );
};

export default Landing;
