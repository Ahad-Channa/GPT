import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#FAFAFA';
    return () => {
      document.body.style.backgroundColor = originalBg;
    };
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#FAFAFA] text-gray-900 font-sans overflow-x-hidden selection:bg-[#29FD98] selection:text-black flex flex-col items-center">
      <div
        className="min-h-screen relative text-gray-900 font-sans flex flex-col mx-auto w-full"
        style={{
          maxWidth: '1440px',
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
            maxWidth: isMobile ? '408px' : '1328px',
            height: isMobile ? '71px' : '80px',
            paddingTop: '12px',
            paddingBottom: '12px',
          }}
        >
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img
              src="/coins/logo final.svg"
              alt="TaskMint Logo"
              className="object-contain"
              style={{
                width: isMobile ? '148px' : '161px',
                height: isMobile ? '26.23px' : '28.53px',
                opacity: 1,
              }}
            />
          </div>

          {/* Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-[40px]">
            <a href="#hero" className="hover:text-black transition-colors" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: 'rgba(30, 30, 30, 1)' }}>Home</a>
            <a href="#earn" className="hover:text-black transition-colors" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: 'rgba(30, 30, 30, 1)' }}>Earn</a>
            <a href="#how-it-works" className="hover:text-black transition-colors whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: 'rgba(30, 30, 30, 1)' }}>How it works</a>
            <a href="#features" className="hover:text-black transition-colors" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: 'rgba(30, 30, 30, 1)' }}>Features</a>
            <a href="#faq" className="hover:text-black transition-colors" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: 'rgba(30, 30, 30, 1)' }}>FAQ</a>
          </div>

          {/* Right Actions (Desktop) */}
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

          {/* Mobile Menu Dropdown Circle Button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center rounded-full text-white transition-transform active:scale-95 shadow-md cursor-pointer"
              style={{
                width: '47px',
                height: '47px',
                backgroundColor: 'rgba(36, 50, 77, 1)',
                opacity: 1,
              }}
            >
              {mobileMenuOpen ? <FiX className="w-6 h-6 text-white" /> : <FiMenu className="w-6 h-6 text-white" />}
            </button>
          </div>
        </nav>
      )}

      {/* Mobile Drawer Menu */}
      {!currentUser && mobileMenuOpen && (
        <div className="lg:hidden relative z-50 px-4 mb-4 mx-auto w-full" style={{ maxWidth: '408px' }}>
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col gap-4">
            <div className="flex flex-col gap-3 text-left">
              <a
                href="#hero"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 text-[#1E1E1E] font-medium text-[16px] hover:bg-gray-50 rounded-xl"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Home
              </a>
              <a
                href="#earn"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 text-[#1E1E1E] font-medium text-[16px] hover:bg-gray-50 rounded-xl"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Earn
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 text-[#1E1E1E] font-medium text-[16px] hover:bg-gray-50 rounded-xl"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                How it works
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 text-[#1E1E1E] font-medium text-[16px] hover:bg-gray-50 rounded-xl"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Features
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 text-[#1E1E1E] font-medium text-[16px] hover:bg-gray-50 rounded-xl"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                FAQ
              </a>
            </div>

            <div className="flex items-center justify-center gap-[14px] pt-3 pb-1 border-t border-gray-100 w-full">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAuthModal({ isOpen: true, tab: 'login' });
                }}
                className="flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap cursor-pointer"
                style={{
                  width: '120px',
                  height: '52px',
                  borderRadius: '80px',
                  border: '1px solid rgba(0, 0, 0, 0.15)',
                  background: 'rgba(255, 255, 255, 1)',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  color: 'rgba(0, 0, 0, 1)',
                }}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAuthModal({ isOpen: true, tab: 'register' });
                }}
                className="flex items-center justify-center hover:bg-[#1E2631] transition-colors shadow-sm whitespace-nowrap cursor-pointer"
                style={{
                  width: '205px',
                  height: '52px',
                  borderRadius: '80px',
                  background: 'rgba(36, 50, 77, 1)',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  color: 'rgba(255, 255, 255, 1)',
                }}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
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
              className={isMobile ? "flex flex-col items-center text-center mx-auto w-full gap-6" : "flex flex-col text-left"}
              style={!isMobile ? { width: 608, gap: 40 } : { maxWidth: 424 }}
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
                  width: '100%',
                  maxWidth: 424,
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(42px, 14vw, 64px)',
                  lineHeight: 'clamp(38px, 12.5vw, 56px)',
                  letterSpacing: '-0.02em',
                  textAlign: 'center',
                  color: 'rgba(14, 15, 12, 1)'
                }}
              >
                {isMobile ? (
                  <>
                    Your Time<br />
                    Has Value Get<br />
                    Rewarded<br />
                    For It
                  </>
                ) : (
                  <>
                    Your Time Has Value<br />
                    Get Rewarded For It
                  </>
                )}
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
                  width: '100%',
                  maxWidth: 400,
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 'clamp(13px, 3.8vw, 15.5px)',
                  lineHeight: '26px',
                  letterSpacing: '0%',
                  textAlign: 'center',
                  color: 'rgba(14, 15, 12, 1)'
                }}
              >
                {isMobile ? (
                  <>
                    <span className="block whitespace-nowrap">Complete offers, surveys, and tasks to earn real</span>
                    <span className="block whitespace-nowrap">rewards. Join thousands of users already earning</span>
                    <span className="block whitespace-nowrap">every day.</span>
                  </>
                ) : (
                  'Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.'
                )}
              </p>

              <div
                className={isMobile ? "flex items-center justify-center mx-auto" : "flex items-center"}
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
              className={isMobile ? "flex items-center justify-between w-full mx-auto" : "flex items-center"}
              style={!isMobile ? { width: 520, height: 45, gap: 60 } : { maxWidth: 360, marginTop: 39, gap: 20 }}
            >
              {/* Total Users */}
              <div className="flex items-center gap-3 sm:gap-4">
                <img
                  src="/coins/total user.png"
                  alt="Users"
                  className="object-contain flex-shrink-0"
                  style={{
                    width: isMobile ? 54 : 44,
                    height: isMobile ? 54 : 44,
                    paddingTop: isMobile ? 0 : 3.3,
                    paddingBottom: isMobile ? 0 : 3.3
                  }}
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
                    {stats.totalUsers.toLocaleString('de-DE')}
                  </span>
                </div>
              </div>

              {/* Total Paid */}
              <div className="flex items-center gap-3 sm:gap-4">
                <img
                  src="/coins/total paid.png"
                  alt="Paid"
                  className="object-contain flex-shrink-0"
                  style={{
                    width: isMobile ? 54 : 44,
                    height: isMobile ? 54 : 44,
                    paddingTop: isMobile ? 0 : 3.3,
                    paddingBottom: isMobile ? 0 : 3.3,
                    transform: 'translateY(4px)',
                  }}
                />
                <div className="flex flex-col" style={{ height: 43, gap: 15 }}>
                  <span className="uppercase" style={{
                    height: 8,
                    fontFamily: '"Poppins", sans-serif', fontWeight: 500, fontSize: 12,
                    lineHeight: '28px', letterSpacing: '0.08em', color: 'rgba(14, 15, 12, 1)',
                    display: 'flex', alignItems: 'center'
                  }}>
                    Total Paid:
                  </span>
                  <span style={{
                    height: 20,
                    fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, fontSize: 30,
                    lineHeight: '72px', letterSpacing: '-0.02em', color: 'rgba(14, 15, 12, 1)',
                    display: 'flex', alignItems: 'center'
                  }}>
                    ${stats.totalPaidOut.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Hero Graphic Image */}
            {isMobile && (
              <div
                className="w-[calc(100%+2rem)] -mx-4 flex justify-center items-center mt-8 overflow-hidden"
              >
                <img
                  src="/coins/mobile hero.png"
                  alt="Mobile Hero Graphic"
                  className="w-full h-auto object-cover"
                  style={{
                    maxWidth: '440px',
                    width: '100%',
                    opacity: 1,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className={isMobile ? "py-10 px-5 relative bg-transparent flex justify-center w-full z-10" : "py-12 lg:py-24 px-4 lg:px-6 relative bg-transparent flex justify-center w-full z-10"}>
        <div
          className="flex flex-col mx-auto w-full h-auto"
          style={!isMobile ? { maxWidth: 1328, gap: 55 } : { maxWidth: 440, gap: 64 }}
        >
          {/* Header */}
          <div
            className="flex flex-col items-center justify-center mx-auto"
            style={!isMobile ? { width: 500, height: 69, gap: 25 } : { width: '100%', maxWidth: 400, gap: 16 }}
          >
            <h2
              className="m-0 text-center flex items-center justify-center"
              style={!isMobile ? {
                width: 314,
                height: 33,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: 50,
                lineHeight: '72px',
                color: 'rgba(14, 15, 12, 1)',
                letterSpacing: '-0.02em'
              } : {
                width: '100%',
                maxWidth: 301,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(36px, 10vw, 48px)',
                lineHeight: '56px',
                letterSpacing: '-0.02em',
                textAlign: 'center',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              How It Works
            </h2>
            <p
              className="m-0 text-center flex items-center justify-center"
              style={!isMobile ? {
                width: 500,
                height: 11,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '28px',
                color: 'rgba(14, 15, 12, 1)'
              } : {
                width: '100%',
                maxWidth: 400,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 18,
                lineHeight: '28px',
                letterSpacing: '0%',
                textAlign: 'center',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              {isMobile ? (
                <>
                  Get started in seconds. No complicated<br />setup required.
                </>
              ) : (
                'Get started in seconds. No complicated setup required.'
              )}
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
              <div
                key={idx}
                className={isMobile ? "flex flex-col items-center text-center w-full mx-auto gap-4 z-10" : "flex flex-row items-start gap-[20px] w-full lg:w-[400px] z-10"}
                style={{ background: 'transparent' }}
              >
                {/* Icon */}
                <div className="shrink-0 flex items-center justify-center" style={{ width: isMobile ? 80 : 90, height: isMobile ? 80 : 90 }}>
                  <img src={item.icon} alt={item.title} style={{ width: isMobile ? 80 : 90, height: isMobile ? 80 : 90, transform: 'rotate(0deg)', opacity: 1, objectFit: 'contain' }} />
                </div>
                {/* Content */}
                <div className={isMobile ? "flex flex-col items-center text-center gap-2" : "flex flex-col gap-[8px] mt-[-6px]"}>
                  <div className={isMobile ? "flex flex-col items-center gap-0" : "flex flex-col gap-0"}>
                    <span
                      className="uppercase"
                      style={{
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: 12,
                        lineHeight: '28px',
                        letterSpacing: '0.08em',
                        color: 'rgba(14, 15, 12, 1)',
                        opacity: 1,
                        textAlign: isMobile ? 'center' : 'left'
                      }}
                    >
                      {item.step}
                    </span>
                    <h3
                      className="m-0"
                      style={{
                        width: isMobile ? '100%' : 'auto',
                        maxWidth: isMobile ? 360 : 'none',
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 700,
                        fontSize: isMobile ? 24 : 22,
                        lineHeight: isMobile ? '32px' : '28px',
                        color: 'rgba(14, 15, 12, 1)',
                        letterSpacing: '-0.02em',
                        opacity: 1,
                        textAlign: isMobile ? 'center' : 'left'
                      }}
                    >
                      {item.title}
                    </h3>
                  </div>
                  <p
                    className="m-0"
                    style={{
                      width: isMobile ? '100%' : 'auto',
                      maxWidth: isMobile ? 360 : 'none',
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: 12,
                      lineHeight: '20px',
                      letterSpacing: '0%',
                      color: 'rgba(14, 15, 12, 1)',
                      opacity: 1,
                      textAlign: isMobile ? 'center' : 'left'
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
        className="mx-auto flex flex-col lg:flex-row items-center justify-between w-full max-w-[1328px] px-4 md:px-8 lg:px-0 lg:h-[558px] py-12 lg:py-0 relative z-10"
        style={!isMobile ? {
          background: 'transparent',
          gap: '40px'
        } : {
          maxWidth: '440px',
          paddingRight: '4px',
          paddingLeft: '4px',
          gap: '32px',
          background: 'transparent'
        }}
      >
        {/* Content (First on mobile, Second on Desktop) */}
        <div
          className="order-1 lg:order-2 flex flex-col w-full lg:flex-1 justify-center"
          style={!isMobile ? { transform: 'translateY(10px)' } : {}}
        >
          {/* Heading & Sub */}
          <div
            className="flex flex-col items-start w-full"
            style={!isMobile ? { width: 472, height: 74, gap: 30, marginBottom: 50, marginTop: -15 } : { gap: 12, marginBottom: 24 }}
          >
            <h2
              className="m-0 text-left flex items-center"
              style={!isMobile ? {
                width: 472,
                height: 33,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: 50,
                lineHeight: '72px',
                letterSpacing: '-0.02em',
                color: 'rgba(14, 15, 12, 1)'
              } : {
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(36px, 10vw, 48px)',
                lineHeight: '52px',
                letterSpacing: '-0.02em',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Why Choose Us
            </h2>
            <p
              className="m-0 text-left flex items-center"
              style={!isMobile ? {
                width: 472,
                height: 11,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '28px',
                color: 'rgba(14, 15, 12, 1)'
              } : {
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '24px',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Powerful features designed specifically for you.
            </p>
          </div>

          {/* Features Grid */}
          <div
            className="grid grid-cols-1 lg:grid-cols-2 w-full"
            style={!isMobile ? { width: 608, height: 306, gap: 24 } : { gap: 0 }}
          >
            {(isMobile ? [
              { icon: '/coins/multi.png', title: 'Multiple Offer walls', desc: 'Discover various earning options in one place.' },
              { icon: '/coins/fast copy.png', title: 'Fast Payouts', desc: 'Withdraw your earnings quickly and securely' },
              { icon: '/coins/daily.png', title: 'Daily Bonus', desc: 'Earn extra rewards every day you stay active' },
              { icon: '/coins/vip copy.png', title: 'VIP Progress', desc: 'Level up and unlock better rewards' },
              { icon: '/coins/referl.png', title: 'Referral System', desc: 'Refer friends and earn a share of their income.' },
              { icon: '/coins/live copy.png', title: 'Live Activity', desc: 'See real-time earnings across the platform' },
            ] : [
              { icon: '/coins/multi.png', title: 'Multiple Offer walls', desc: 'Discover various earning options in one place.' },
              { icon: '/coins/vip copy.png', title: 'VIP Progress', desc: 'Level up and unlock better rewards' },
              { icon: '/coins/fast copy.png', title: 'Fast Payouts', desc: 'Withdraw your earnings quickly and securely' },
              { icon: '/coins/referl.png', title: 'Referral System', desc: 'Refer friends and earn a share of their income.' },
              { icon: '/coins/daily.png', title: 'Daily Bonus', desc: 'Earn extra rewards every day you stay active' },
              { icon: '/coins/live copy.png', title: 'Live Activity', desc: 'See real-time earnings across the platform' },
            ]).map((item, idx) => (
              <div
                key={idx}
                className="flex flex-row items-center pt-[16px] pb-[16px] lg:pb-[8px] gap-[16px] group cursor-pointer w-full"
                style={!isMobile ? { width: 292, borderTop: '1px solid rgba(226, 226, 225, 1)' } : { width: '100%', borderTop: '1px solid rgba(226, 226, 225, 1)' }}
              >
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: 48, height: 48 }}
                >
                  <img src={item.icon} alt={item.title} className="w-full h-full object-contain" />
                </div>
                <div
                  className="flex flex-col items-start text-left w-full"
                  style={{ gap: 2, paddingTop: 2 }}
                >
                  <div
                    className="m-0 font-medium"
                    style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif',
                      fontWeight: 600,
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
            className="flex flex-row items-center mt-[32px] lg:mt-[50px]"
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

        {/* Image (Second on mobile, First on Desktop) */}
        <div
          className="order-2 lg:order-1 flex-shrink-0 w-full lg:w-[640px] h-auto lg:h-[558px] px-0 mt-6 lg:mt-0 flex justify-start"
          style={isMobile ? { width: 'calc(100% + 8px)', maxWidth: 'calc(100% + 8px)', marginLeft: '-4px', marginRight: '-4px' } : {}}
        >
          <img
            src={isMobile ? "/coins/whychosemobile.png" : "/coins/why chose us.png"}
            alt="Why Choose Us"
            className="w-full h-auto object-cover rounded-[24px] lg:rounded-[32px]"
            style={isMobile ? { width: '100%', opacity: 1, position: 'relative', left: '-13px' } : { width: '100%', height: '100%', position: 'relative', left: '-13px' }}
          />
        </div>
      </section>

      {/* START EARNING WITH */}
      <section id="earn" className={isMobile ? "py-10 px-0 bg-transparent flex justify-center w-full" : "py-12 lg:py-24 px-4 lg:px-6 bg-transparent"}>
        <div
          className="flex flex-col mx-auto w-full h-auto"
          style={!isMobile ? { maxWidth: 1328, gap: 50 } : { maxWidth: 440, gap: 48 }}
        >
          <div
            className="flex flex-col items-center justify-center mx-auto px-4"
            style={!isMobile ? { width: 652, height: 69, gap: 25 } : { width: '100%', maxWidth: 400, gap: 16 }}
          >
            <h2
              className="m-0 flex items-center justify-center"
              style={!isMobile ? {
                width: 434,
                height: 33,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: 50,
                lineHeight: '72px',
                letterSpacing: '-0.02em',
                textAlign: 'center',
                color: 'rgba(14, 15, 12, 1)'
              } : {
                width: '100%',
                maxWidth: 400,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(36px, 10vw, 48px)',
                lineHeight: '52px',
                letterSpacing: '-0.02em',
                textAlign: 'center',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Start Earning With
            </h2>
            <p
              className="m-0 flex flex-col items-center justify-center text-center"
              style={!isMobile ? {
                width: 534,
                height: 11,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 16,
                lineHeight: '28px',
                textAlign: 'center',
                color: 'rgba(14, 15, 12, 1)'
              } : {
                width: '100%',
                maxWidth: 400,
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                fontSize: 'clamp(14px, 3.9vw, 17.5px)',
                lineHeight: '28px',
                letterSpacing: '0%',
                textAlign: 'center',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              {isMobile ? (
                <>
                  <span className="block whitespace-nowrap">Multiple ways to stack your coins. Choose</span>
                  <span className="block whitespace-nowrap">what works best for you.</span>
                </>
              ) : (
                'Multiple ways to stack your coins. Choose what works best for you.'
              )}
            </p>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-3 mx-auto w-full px-0"
            style={!isMobile ? { width: 1328, maxWidth: '100%', height: 368, gap: 22 } : { maxWidth: 440, height: 'auto', gap: 20 }}
          >
            {['/coins/sew1.png', '/coins/Mask group.png', '/coins/sew3.png'].map((imgSrc, idx) => (
              <img
                key={idx}
                src={imgSrc}
                alt={`Start Earning Option ${idx + 1}`}
                className="w-full object-cover sm:object-contain mx-auto"
                style={!isMobile ? { maxWidth: '100%', width: 428, height: 368 } : { width: '100%', maxWidth: '100%', height: 'auto' }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="pt-8 pb-12 sm:pb-16 lg:pt-8 lg:pb-0 px-2 lg:px-6 bg-transparent w-full">
        <div
          className="flex flex-col lg:flex-row mx-auto w-full items-center lg:items-start max-w-[440px] lg:max-w-[1328px] gap-[56px] lg:gap-[114px]"
        >
          {/* Left Side */}
          <div
            className="flex flex-col items-center text-center lg:items-start lg:text-left w-full max-w-[424px] lg:max-w-[562px] lg:w-[45%] gap-4 lg:gap-[40px]"
          >
            <h2
              className="m-0 text-center lg:text-left w-full max-w-[424px] lg:max-w-[562px]"
              style={{
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              <span className="block text-[40px] sm:text-[48px] lg:text-[50px] leading-[44px] sm:leading-[48px] lg:leading-[54px]">
                Frequently<br />Asked Questions
              </span>
            </h2>
            <p
              className="m-0 text-center lg:text-left w-full max-w-[314px] lg:max-w-[279px]"
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 500,
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              <span className="block text-[18px] lg:text-[16px] leading-[28px]">
                Got questions? We've got answers.
              </span>
            </p>
          </div>

          {/* Right Side */}
          <div
            className="flex flex-col items-center lg:items-start w-full max-w-[424px] lg:max-w-[652px] lg:w-[55%] lg:-translate-y-[20px]"
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
                  className="flex flex-col justify-start cursor-pointer transition-all duration-300 overflow-hidden w-full max-w-[424px] lg:max-w-[652px]"
                  style={{
                    minHeight: isOpen ? 139 : 69,
                    gap: 25,
                    borderRadius: 20,
                    padding: '28px 20px 28px 20px',
                    background: isOpen ? 'rgba(246, 245, 237, 1)' : 'transparent',
                  }}
                >
                  <div
                    className="flex justify-between items-center w-full"
                    style={{ minHeight: 22 }}
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
                      className="transition-transform duration-300 flex items-center justify-center shrink-0 ml-2"
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
                          lineHeight: '20px',
                          color: 'rgba(14, 15, 12, 0.7)'
                        }}
                      >
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GET STARTED & PAYOUT OPTIONS */}
      <section className="pt-4 pb-6 sm:pt-6 sm:pb-8 lg:pt-0 lg:pb-8 px-2 lg:px-6 w-full flex justify-center bg-transparent">
        
        {/* MOBILE VERSION (< 1024px) */}
        <div
          className="flex lg:hidden flex-col items-center justify-between mx-auto w-full relative"
          style={{
            maxWidth: 424,
            minHeight: 517,
            borderRadius: 24,
            paddingTop: 40,
            paddingBottom: 40,
            background: 'rgba(239, 239, 239, 1)',
            overflow: 'hidden',
            gap: 28
          }}
        >
          {/* 1. Heading */}
          <div className="flex flex-col items-center justify-center w-full px-6 text-center">
            <h2
              className="m-0 text-center"
              style={{
                maxWidth: 376,
                width: '100%',
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(38px, 12vw, 56px)',
                lineHeight: 'clamp(42px, 12vw, 56px)',
                letterSpacing: '-0.02em',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Start Earning<br />Today
            </h2>
          </div>

          {/* 2. Button */}
          <div className="flex justify-center w-full px-6">
            <button
              onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'register' })}
              className="flex items-center justify-center transition-all hover:brightness-105 active:scale-95 shadow-sm cursor-pointer"
              style={{
                width: 260,
                maxWidth: '100%',
                height: 64,
                padding: '10px 28px',
                gap: 10,
                borderRadius: 80,
                backgroundColor: 'rgba(142, 249, 165, 1)',
                border: 'none'
              }}
            >
              <span
                className="whitespace-nowrap m-0 p-0"
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 600,
                  fontSize: 18,
                  color: 'rgba(14, 15, 12, 1)'
                }}
              >
                Start Earning
              </span>
            </button>
          </div>

          {/* 3. Marquee Carousel */}
          <div
            className="flex w-full overflow-hidden relative items-center"
            style={{
              width: '100%',
              height: 64,
              paddingTop: 16,
              paddingBottom: 16,
              background: 'rgba(222, 223, 247, 1)',
            }}
          >
            <div className="flex animate-[marquee_25s_linear_infinite] whitespace-nowrap items-center w-max" style={{ gap: 40 }}>
              {[...Array(8)].map((_, i) => (
                <React.Fragment key={i}>
                  {[
                    { src: "/coins/paypal copy.png", text: "Paypal" },
                    { src: "/coins/LTC.png", text: "Litecoin" },
                    { src: "/coins/giftcard copy.png", text: "Gift Card" },
                    { src: "/coins/amazon copy.png", text: "Amazon" }
                  ].map((item, idx) => (
                    <div key={`${i}-${idx}`} className="flex items-center gap-2">
                      <div className="flex items-center justify-center shrink-0">
                        <img
                          src={item.src}
                          alt={item.text}
                          style={{
                            width: 26,
                            height: 32,
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                      <span
                        className="m-0 whitespace-nowrap"
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: 18,
                          lineHeight: '24px',
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

          {/* 4. Below Text */}
          <div className="flex flex-col items-center justify-center w-full px-6 text-center">
            <p
              className="m-0 text-center"
              style={{
                maxWidth: 376,
                width: '100%',
                fontFamily: '"Bricolage Grotesque", sans-serif',
                fontWeight: 700,
                fontSize: 24,
                lineHeight: '32px',
                letterSpacing: '-0.02em',
                color: 'rgba(14, 15, 12, 1)'
              }}
            >
              Join now and start making real money right now!
            </p>
          </div>
        </div>

        {/* DESKTOP VERSION (>= 1024px) - 100% UNTOUCHED */}
        <div
          className="hidden lg:flex flex-col mx-auto w-full relative"
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
      <Footer />

      {/* Auth Modal Popup */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal(prev => ({ ...prev, isOpen: false }))}
        initialTab={authModal.tab}
      />
      </div>
    </div>
  );
};

export default Landing;
