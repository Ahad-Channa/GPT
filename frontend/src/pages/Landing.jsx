import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
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
      className="min-h-screen text-gray-900 font-sans overflow-x-hidden selection:bg-[#29FD98] selection:text-black flex flex-col mx-auto"
      style={{
        maxWidth: '1440px',
        width: '100%',
        background: 'linear-gradient(0deg, #FAFAFA, #FAFAFA), linear-gradient(0deg, #FFFFFF, #FFFFFF)'
      }}
    >

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
              onClick={() => navigate('/login')}
              className="flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
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
              onClick={() => navigate('/login?tab=register')}
              className="flex items-center justify-center hover:bg-[#1E2631] transition-colors shadow-sm whitespace-nowrap"
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
      <section className={isMobile ? "relative pt-8 pb-[40px] px-4 max-w-7xl mx-auto flex flex-col items-start gap-6" : "relative pt-[72px] pb-[53px] md:pb-[85px] px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-12 lg:gap-8"}>
        {/* Left text */}
        <div className="flex-1 w-full z-10">
          <div
            className="flex flex-col text-left"
            style={!isMobile ? { width: 654, height: 297, gap: 50, opacity: 1 } : { width: '100%', height: 'auto', gap: 16, opacity: 1 }}
          >
            <h1
              className="font-bold text-white m-0"
              style={!isMobile ? {
                width: 654,
                height: 112,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 62,
                lineHeight: '69px',
                letterSpacing: '0%',
                opacity: 1
              } : {
                width: '100%',
                height: 'auto',
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 32,
                lineHeight: '38px',
                letterSpacing: '0%',
                opacity: 1
              }}
            >
              Your Time Has Value<br />
              <span style={{ color: 'rgba(73, 178, 101, 1)' }}>Get Rewarded For It</span>
            </h1>
            <p
              className="m-0"
              style={!isMobile ? {
                width: 654,
                height: 47,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 22,
                lineHeight: '32px',
                letterSpacing: '0%',
                color: 'rgba(209, 213, 219, 1)',
                opacity: 1
              } : {
                width: '100%',
                height: 'auto',
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 15,
                lineHeight: '22px',
                letterSpacing: '0%',
                color: 'rgba(209, 213, 219, 1)',
                opacity: 1
              }}
            >
              Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.
            </p>

            <div
              className="flex items-center justify-start"
              style={!isMobile ? {
                width: 410,
                height: 48,
                gap: 10,
                opacity: 1
              } : {
                width: '100%',
                maxWidth: 410,
                height: 'auto',
                gap: 12,
                opacity: 1
              }}
            >
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-center text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none"
                style={!isMobile ? {
                  width: 200,
                  height: 48,
                  borderRadius: 10,
                  padding: '10px 30px 10px 30px',
                  gap: 10,
                  opacity: 1,
                  backgroundColor: 'rgba(39, 112, 58, 1)',
                  boxShadow: '0px 4px 0px 0px rgba(35, 80, 47, 1)'
                } : {
                  width: 135,
                  height: 40,
                  borderRadius: 8,
                  padding: '8px 12px',
                  gap: 6,
                  opacity: 1,
                  backgroundColor: 'rgba(39, 112, 58, 1)',
                  boxShadow: '0px 4px 0px 0px rgba(35, 80, 47, 1)'
                }}
              >
                <img src="/coins/login.png" alt="Login Icon" style={!isMobile ? { width: 24, height: 24, objectFit: 'contain' } : { width: 18, height: 18, objectFit: 'contain' }} />
                <span style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: !isMobile ? 18 : 14,
                  lineHeight: '100%'
                }}>
                  Login
                </span>
              </button>
              <button
                onClick={() => navigate('/login?tab=register')}
                className="flex items-center justify-center text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none"
                style={!isMobile ? {
                  width: 200,
                  height: 48,
                  borderRadius: 10,
                  padding: '10px 30px 10px 30px',
                  gap: 10,
                  opacity: 1,
                  background: 'rgba(73, 178, 101, 1)',
                  boxShadow: '0px 4px 0px 0px rgba(45, 110, 62, 1)'
                } : {
                  width: 135,
                  height: 40,
                  borderRadius: 8,
                  padding: '8px 12px',
                  gap: 6,
                  opacity: 1,
                  background: 'rgba(73, 178, 101, 1)',
                  boxShadow: '0px 4px 0px 0px rgba(45, 110, 62, 1)'
                }}
              >
                <span style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: !isMobile ? 18 : 14,
                  lineHeight: '100%'
                }}>
                  Start Earning
                </span>
                <div
                  className="bg-white"
                  style={!isMobile ? {
                    width: 18,
                    height: 18,
                    WebkitMaskImage: 'url(/coins/image.png)',
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskImage: 'url(/coins/image.png)',
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center'
                  } : {
                    width: 14,
                    height: 14,
                    WebkitMaskImage: 'url(/coins/image.png)',
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskImage: 'url(/coins/image.png)',
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center'
                  }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right image */}
        <div
          className={!isMobile ? "flex-1 w-full relative z-0 flex justify-center lg:justify-end mt-4 lg:-mt-[55px]" : "hidden"}
        >
          <div className="drop-shadow-2xl" style={!isMobile ? { width: 577, minWidth: 577, height: 577, opacity: 1, transform: 'translateX(-30px)' } : { width: '100%', maxWidth: 577, height: 260, opacity: 1 }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: `linear-gradient(rgba(182, 242, 198, 1), rgba(182, 242, 198, 1)), url('/coins/hero.png')`,
                backgroundBlendMode: 'color',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                WebkitMaskImage: `url('/coins/hero.png')`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: `url('/coins/hero.png')`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center'
              }}
            />
          </div>
        </div>

        {/* Floating Stats Box */}
        <div className={!isMobile ? "absolute z-20 left-1/2 -translate-x-1/2 w-[90%] md:w-[1240px] max-w-[1240px] bottom-0 translate-y-1/2 lg:translate-y-0 lg:bottom-auto lg:top-[448px]" : "relative z-20 w-full mt-2 px-2"}>
          <div
            className="flex flex-row items-center w-full"
            style={!isMobile ? {
              width: 1240,
              height: 120,
              borderRadius: 20,
              gap: 40,
              padding: 40,
              opacity: 1,
              backgroundColor: 'rgba(129, 129, 129, 0.2)',
              backdropFilter: 'blur(64px)',
              WebkitBackdropFilter: 'blur(64px)'
            } : {
              width: '100%',
              borderRadius: 12,
              gap: 8,
              padding: '12px 10px',
              opacity: 1,
              backgroundColor: 'rgba(129, 129, 129, 0.2)',
              backdropFilter: 'blur(64px)',
              WebkitBackdropFilter: 'blur(64px)',
              justifyContent: 'flex-start'
            }}
          >
            <div className={!isMobile ? "w-full flex items-center justify-start max-w-[540px]" : "flex items-center justify-start flex-1"} style={!isMobile ? { height: 40, gap: 14 } : { height: 'auto', gap: 6 }}>
              <img src="/coins/people.png" alt="Users" style={{ width: !isMobile ? 40 : 22, height: !isMobile ? 40 : 22, objectFit: 'contain' }} />
              <span style={{ display: 'inline-block', width: !isMobile ? 440 : 'auto', height: !isMobile ? 24 : 'auto', opacity: 1, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: !isMobile ? 24 : 13, lineHeight: !isMobile ? '24px' : '100%', letterSpacing: '0%', textTransform: 'capitalize', color: 'rgba(255, 255, 255, 1)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Total Users:</span>
              <span style={{ display: 'inline-block', width: 'auto', minWidth: !isMobile ? 32 : 'auto', height: !isMobile ? 24 : 'auto', opacity: 1, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: !isMobile ? 44 : 16, lineHeight: !isMobile ? '24px' : '100%', letterSpacing: '0%', textAlign: 'center', verticalAlign: 'middle', textTransform: 'capitalize', color: 'rgba(255, 255, 255, 1)', marginLeft: !isMobile ? 0 : 8, whiteSpace: 'nowrap' }}>
                {(stats.totalUsers || 16).toLocaleString()}
              </span>
            </div>

            <div className={!isMobile ? "w-px h-[60px] bg-white/10" : "w-px h-[24px] bg-white/20 mx-1"} />

            <div className={!isMobile ? "w-full flex items-center justify-start max-w-[540px]" : "flex items-center justify-start flex-1"} style={!isMobile ? { height: 40, gap: 14 } : { height: 'auto', gap: 6 }}>
              <img src="/coins/doller.png" alt="Paid" style={{ width: !isMobile ? 40 : 22, height: !isMobile ? 40 : 22, objectFit: 'contain' }} />
              <span style={{ display: 'inline-block', width: !isMobile ? 440 : 'auto', height: !isMobile ? 24 : 'auto', opacity: 1, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: !isMobile ? 24 : 13, lineHeight: !isMobile ? '24px' : '100%', letterSpacing: '0%', textTransform: 'capitalize', color: 'rgba(255, 255, 255, 1)', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Total Paid:</span>
              <span style={{ display: 'inline-block', width: 'auto', minWidth: !isMobile ? 32 : 'auto', height: !isMobile ? 24 : 'auto', opacity: 1, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: !isMobile ? 44 : 16, lineHeight: !isMobile ? '24px' : '100%', letterSpacing: '0%', textAlign: 'center', verticalAlign: 'middle', textTransform: 'capitalize', color: 'rgba(255, 255, 255, 1)', marginLeft: !isMobile ? 0 : 8, whiteSpace: 'nowrap' }}>
                ${(stats.totalPaidOut || 31.33).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="pt-0 lg:pt-0 pb-12 lg:pb-24 px-4 lg:px-6 relative bg-[#050505] flex justify-center w-full">
        <div
          className="flex flex-col mx-auto w-full max-w-[1240px] h-auto gap-8 lg:gap-[40px]"
        >
          <div
            className="flex flex-col items-center justify-center mx-auto w-full max-w-[374px] h-auto gap-2 lg:gap-[30px]"
          >
            <h2
              className="font-bold text-white m-0 flex items-center justify-center text-[34px] sm:text-[44px] lg:text-[58px] leading-[40px] lg:leading-[48px] text-center w-auto h-auto"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                letterSpacing: '0%'
              }}
            >
              How It Works
            </h2>
            <p
              className="m-0 flex items-center justify-center text-[15px] sm:text-[18px] lg:text-[20px] leading-[22px] lg:leading-[28px] text-center text-gray-300 w-auto h-auto px-2"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                letterSpacing: '0%'
              }}
            >
              Get started in seconds. No complicated setup required.
            </p>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-3 mx-auto w-full max-w-[1240px] h-auto gap-4 lg:gap-[20px]"
          >
            {[
              { icon: '/coins/persontik.png', step: 1, title: 'Sign Up', desc: 'Create your free account in seconds and get instant access to the platform.' },
              { icon: '/coins/clipboard.png', step: 2, title: 'Complete Tasks', desc: 'Choose from hundreds of offers, surveys, and apps to complete at your own pace.' },
              { icon: '/coins/gift.png', step: 3, title: 'Earn Rewards', desc: 'Get coins and convert them into real money, crypto, or gift cards instantly.' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="hover:brightness-110 transition-all group relative w-full h-auto lg:h-[212px] rounded-[16px] lg:rounded-[20px] p-6 lg:p-0 overflow-hidden"
                style={{
                  background: 'rgba(26, 27, 26, 1)',
                  boxShadow: '0px 4px 80px 0px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(44px)',
                  WebkitBackdropFilter: 'blur(44px)'
                }}
              >
                <div className="flex items-start justify-between w-full lg:block">
                  <img
                    src={item.icon}
                    alt={item.title}
                    className="object-contain w-10 h-10 lg:w-[44px] lg:h-[44px] static lg:absolute lg:top-[24px] lg:left-[24px]"
                  />
                  <div
                    className="flex items-center justify-center absolute top-0 right-6 lg:left-[304px] lg:right-auto w-[48px] lg:w-[70px] h-[48px] lg:h-[68px] px-2 lg:px-[30px] gap-[10px] rounded-b-[8px] rounded-t-none lg:rounded-b-[10px]"
                    style={{
                      background: 'rgba(50, 50, 50, 1)'
                    }}
                  >
                    <span
                      className="text-white flex items-center justify-center text-[24px] lg:text-[38px]"
                      style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontWeight: 700,
                        lineHeight: '100%'
                      }}
                    >
                      {item.step}
                    </span>
                  </div>
                </div>
                <div
                  className="flex flex-col mt-4 lg:mt-0 lg:absolute lg:top-[102px] lg:left-[24px] w-full lg:w-[352px] gap-2 lg:gap-[12px]"
                >
                  <h3
                    className="font-semibold text-white m-0 text-[20px] lg:text-[24px]"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 600,
                      lineHeight: '100%',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="m-0 flex items-center text-[15px] lg:text-[17px] leading-[22px] lg:leading-[24px] text-gray-400"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500
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
        className="mx-auto flex flex-col w-full max-w-[1440px] h-auto py-12 lg:py-[100px] px-4 lg:px-[100px] gap-2 lg:gap-[10px]"
        style={{
          background: 'rgba(26, 27, 26, 1)',
          backdropFilter: 'blur(75px)',
          WebkitBackdropFilter: 'blur(75px)'
        }}
      >
        <div
          className="flex flex-col mx-auto w-full max-w-[1240px] h-auto gap-8 lg:gap-[50px]"
        >
          <div
            className="flex flex-col items-center mx-auto w-full max-w-[323px] h-auto gap-2 lg:gap-[30px]"
          >
            <h2
              className="font-bold m-0 text-white text-[34px] sm:text-[44px] lg:text-[58px] leading-[40px] lg:leading-[48px] text-center w-auto h-auto"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700
              }}
            >
              Why Choose Us
            </h2>
            <p
              className="m-0 text-[15px] sm:text-[18px] lg:text-[20px] leading-[22px] lg:leading-[28px] text-center text-gray-300 w-auto h-auto"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400
              }}
            >
              Powerful features designed specifically for you.
            </p>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-3 mx-auto w-full max-w-[1240px] h-auto gap-4 lg:gap-[20px]"
          >
            {[
              { icon: '/coins/walls.png', title: 'Multiple Offerwalls', desc: 'Discover various earning options in one place.' },
              { icon: '/coins/fast.png', title: 'Fast Payouts', desc: 'Withdraw your earnings quickly and securely' },
              { icon: '/coins/gift.png', title: 'Daily Bonus', desc: 'Earn extra rewards every day you stay active' },
              { icon: '/coins/presentations.png', title: 'VIP Progress', desc: 'Level up and unlock better rewards' },
              { icon: '/coins/persons.png', title: 'Referral System', desc: 'Refer friends and earn a share of their income.' },
              { icon: '/coins/live.png', title: 'Live Activity', desc: 'See real-time earnings across the platform' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center transition-colors group w-full h-auto lg:h-[183px] rounded-[16px] lg:rounded-[20px] p-6 lg:p-[20px_12px_24px_12px] gap-4 lg:gap-[12px]"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  boxShadow: '0px 4px 80px 0px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(44px)',
                  WebkitBackdropFilter: 'blur(44px)'
                }}
              >
                <div
                  className="flex items-center justify-center mb-0 w-[40px] h-[40px] lg:w-[64px] lg:h-[64px]"
                  style={{ borderRadius: 20, gap: 10, background: 'transparent' }}
                >
                  <img src={item.icon} alt={item.title} className="w-10 h-10 lg:w-[44px] lg:h-[44px] object-contain" />
                </div>
                <div
                  className="flex flex-col items-center w-full max-w-[376px] h-auto gap-2 lg:gap-[12px]"
                >
                  <h3
                    className="font-bold m-0 text-white text-[20px] lg:text-[24px] text-center"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      lineHeight: '100%'
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="m-0 text-[15px] lg:text-[17px] leading-[22px] lg:leading-[24px] text-center text-gray-300"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500
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

      {/* START EARNING WITH */}
      <section id="earn" className="py-12 lg:py-24 px-4 lg:px-6 bg-[#050505]">
        <div
          className="flex flex-col mx-auto w-full max-w-[1240px] h-auto gap-8 lg:gap-[50px]"
        >
          <div
            className="flex flex-col items-center mx-auto w-full max-w-[452px] h-auto gap-2 lg:gap-[30px]"
          >
            <h2
              className="font-bold m-0 text-white text-[34px] sm:text-[44px] lg:text-[58px] leading-[40px] lg:leading-[48px] text-center w-auto h-auto"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700
              }}
            >
              Start Earning With
            </h2>
            <p
              className="m-0 text-[15px] sm:text-[18px] lg:text-[20px] leading-[22px] lg:leading-[28px] text-center text-gray-300 w-auto h-auto"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400
              }}
            >
              Multiple ways to stack your coins. Choose what works best for you.
            </p>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-3 mx-auto w-full max-w-[1240px] h-auto gap-4 lg:gap-[24px]"
          >
            {[
              { icon: '/coins/clicl.png', title: 'Surveys', desc: 'Share your opinion on various topics and get rewarded instantly.' },
              { icon: '/coins/game.png', title: 'Apps & Games', desc: 'Download apps or play new games. Reach milestones to earn big.' },
              { icon: '/coins/persantage.png', title: 'Featured Offers', desc: 'Sign up for services or trials to earn the highest paying rewards.' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center transition-colors group w-full h-auto lg:h-[183px] rounded-[16px] lg:rounded-[20px] p-6 lg:p-5 gap-4 lg:gap-2"
                style={{
                  background: 'rgba(26, 27, 26, 1)',
                  boxShadow: '0px 4px 80px 0px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(44px)',
                  WebkitBackdropFilter: 'blur(44px)'
                }}
              >
                <div
                  className="flex items-center justify-center mb-0 w-[40px] h-[40px] lg:w-[64px] lg:h-[64px]"
                  style={{ borderRadius: 100, gap: 10, background: 'transparent' }}
                >
                  <img src={item.icon} alt={item.title} className="w-10 h-10 lg:w-[44px] lg:h-[44px] object-contain" />
                </div>
                <div className="flex flex-col items-center gap-1 w-full">
                  <h3
                    className="font-bold m-0 text-white text-[20px] lg:text-[24px] text-center"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      lineHeight: '100%'
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="m-0 text-[15px] lg:text-[17px] leading-[22px] lg:leading-[24px] text-center text-gray-400"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500
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

      {/* FAQ SECTION */}
      <section id="faq" className="py-8 lg:py-12 px-4 lg:px-6 bg-[#050505] lg:-mt-[38px]">
        <div
          className="flex flex-col mx-auto w-full max-w-[1240px] h-auto rounded-[16px] lg:rounded-[20px] p-5 sm:p-8 lg:p-[60px_40px] gap-6 lg:gap-[50px]"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            boxShadow: '0px 4px 80px 0px rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(44px)',
            WebkitBackdropFilter: 'blur(44px)'
          }}
        >
          <div
            className="flex flex-col items-center mx-auto w-full max-w-[581px] h-auto gap-2 lg:gap-[30px]"
          >
            <h2
              className="font-bold m-0 text-white text-[30px] sm:text-[44px] lg:text-[58px] leading-[36px] lg:leading-[48px] text-center w-auto h-auto"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700
              }}
            >
              Frequently Asked Questions
            </h2>
            <p
              className="m-0 text-[15px] sm:text-[18px] lg:text-[20px] leading-[22px] lg:leading-[28px] text-center text-gray-300 w-auto h-auto"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400
              }}
            >
              Got questions? We've got answers.
            </p>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-2 mx-auto w-full max-w-[1160px] gap-4 lg:gap-4"
          >
            {[
              { q: "How do I earn money?", a: "By completing offers, surveys, and tasks on the platform." },
              { q: "Is it free to use?", a: "Yes, it is 100% free to join and start earning." },
              { q: "When do I get paid?", a: "You can withdraw your earnings instantly at any time." },
              { q: "Why was my reward not credited?", a: "Sometimes tracking takes a bit longer. Contact support if you need help." },
              { q: "How do i can contact you?", a: "You can reach us through our 24/7 support ticket system." },
              { q: "What is the minimum payout?", a: "The minimum payout is only $5 for most withdrawal methods." }
            ].map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="flex flex-col justify-start cursor-pointer transition-all duration-300 overflow-hidden w-full h-auto min-h-[60px] lg:min-h-[76px] gap-2 sm:gap-2 lg:gap-[10px] rounded-[16px] lg:rounded-[20px] p-6 lg:p-[22px_30px]"
                  style={{
                    background: 'rgba(44, 45, 44, 1)',
                    backdropFilter: 'blur(54px)',
                    WebkitBackdropFilter: 'blur(54px)',
                    boxShadow: '0px 4px 34px 0px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div className="flex justify-between items-center w-full">
                    <span
                      className="font-bold m-0 text-white text-[16px] lg:text-[22px] leading-[24px] lg:leading-[32px]"
                      style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontWeight: 700
                      }}
                    >
                      {faq.q}
                    </span>
                    <div
                      className={`bg-[#29FD98] transition-transform duration-300 shrink-0 w-[24px] h-[24px] lg:w-[14px] lg:h-[14px] ${isOpen ? '-rotate-180' : ''}`}
                      style={{
                        WebkitMaskImage: 'url(/coins/arrow.png)',
                        WebkitMaskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center',
                        maskImage: 'url(/coins/arrow.png)',
                        maskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        maskPosition: 'center'
                      }}
                    />
                  </div>
                  {isOpen && (
                    <div
                      className="transition-all duration-300 flex items-start overflow-hidden mt-1"
                    >
                      <p
                        className="m-0 text-[15px] lg:text-[20px] leading-[22px] lg:leading-[24px] text-gray-300"
                        style={{
                          fontFamily: '"Barlow Condensed", sans-serif',
                          fontWeight: 500
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

      {/* PAYOUT OPTIONS */}
      <div
        className="mx-auto overflow-hidden flex items-center w-full max-w-[1440px] h-[70px] lg:h-[106px] py-3 lg:py-[30px] border-y border-white/40"
        style={{
          backdropFilter: 'blur(64px)',
          WebkitBackdropFilter: 'blur(64px)'
        }}
      >
        <div className="flex animate-[marquee_40s_linear_infinite] whitespace-nowrap">
          {[...Array(4)].map((_, i) => (
            <React.Fragment key={i}>
              {[
                { Icon: FaBitcoin, text: "Litecoin" },
                { Icon: FaPaypal, text: "PayPal" },
                { Icon: FaAmazon, text: "Amazon" },
                { Icon: FiGift, text: "Gift Cards" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 lg:gap-3 text-white whitespace-nowrap mr-12 lg:mr-[100px]">
                  <item.Icon className="text-[20px] lg:text-[32px]" />
                  <span
                    className="font-['Barlow_Condensed'] font-bold text-[18px] lg:text-[28.75px] text-white"
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* BOTTOM CTA */}
      <section
        className="w-full flex justify-center bg-[rgba(27,28,27,1)]"
      >
        <div
          className="flex flex-col md:flex-row items-center justify-between w-full max-w-[1440px] h-auto lg:h-[158px] py-8 lg:py-[40px] px-6 lg:px-[100px] gap-6 lg:gap-0"
        >
          <div
            className="flex flex-col justify-start w-full lg:w-[1072px] h-auto gap-2 lg:gap-[30px] text-center lg:text-left"
          >
            <h2
              className="m-0 text-white text-[30px] sm:text-[38px] lg:text-[48px] leading-[36px] lg:leading-[48px] font-bold"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif'
              }}
            >
              Start Earning Today
            </h2>
            <p
              className="m-0 text-white/60 text-[15px] sm:text-[18px] lg:text-[20px] leading-[22px] lg:leading-[28px] font-medium"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif'
              }}
            >
              Join now and start making real money right now!
            </p>
          </div>
          <button
            onClick={() => navigate('/login?tab=register')}
            className="flex items-center justify-center text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none w-auto sm:w-[168px] h-[44px] lg:h-[48px] rounded-[10px] px-6 gap-[10px]"
            style={{
              background: 'rgba(73, 178, 101, 1)',
              boxShadow: '0px 4px 0px 0px rgba(39, 109, 58, 1)'
            }}
          >
            <span
              className="whitespace-nowrap flex items-center justify-center m-0 p-0 text-[16px] lg:text-[18px] font-bold font-['Barlow_Condensed']"
            >
              Get Started
            </span>
            <div
              className="bg-white w-[16px] h-[16px] lg:w-[18px] lg:h-[18px]"
              style={{
                WebkitMaskImage: 'url(/coins/image.png)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: 'url(/coins/image.png)',
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center'
              }}
            />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="w-full flex justify-center border-t border-[#333] shrink-0 items-start"
        style={{ background: 'rgba(44, 45, 44, 1)' }}
      >
        <div
          className="flex flex-col items-center text-center w-full mx-auto px-4 lg:px-[100px] py-6 lg:pt-[40px] lg:pb-[22px] gap-6 lg:gap-[30px]"
          style={{
            maxWidth: 1440,
            opacity: 1,
            transform: 'rotate(0deg)',
            justifyContent: 'space-between'
          }}
        >
          {/* Top Logo */}
          <div
            className="relative flex items-center justify-center w-full h-[32px] lg:h-[52px] lg:gap-[10px]"
          >
            <img
              src="/coins/logo copy.png"
              alt="Logo"
              className="absolute right-[calc(50%+48px)] lg:static w-[32px] h-[32px] lg:w-[52px] lg:h-[52px] object-contain"
            />
            <span
              className="whitespace-nowrap flex items-center text-[26px] lg:text-[46px]"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                lineHeight: '100%',
                color: 'rgba(255, 255, 255, 1)'
              }}
            >
              TaskMint
            </span>
          </div>

          {/* Middle Content */}
          <div
            className="flex flex-col items-center text-center w-full max-w-[1104px] gap-3 lg:gap-[30px]"
          >
            <p
              className="m-0 p-0 flex items-center justify-center whitespace-normal lg:whitespace-nowrap px-4 lg:px-0 text-[13px] leading-[18px] lg:text-[20px] lg:leading-[28px]"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                textAlign: 'center',
                color: 'rgba(209, 213, 219, 1)'
              }}
            >
              Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.
            </p>
            <div
              className="flex justify-center items-center m-0 p-0 flex-wrap lg:flex-nowrap gap-x-[12px] gap-y-2 lg:gap-[20px] w-full px-2 lg:px-0"
            >
              {[
                { name: 'Features', href: '#features' },
                { name: 'FAQ', href: '#faq' },
                { name: 'Blog', href: '#' },
                { name: 'Terms of Use', href: '#' },
                { name: 'Privacy Policy', href: '#' },
                { name: 'Support', href: '#' }
              ].map((link, idx, arr) => (
                <React.Fragment key={link.name}>
                  <a
                    href={link.href}
                    className="hover:opacity-80 transition-opacity whitespace-nowrap flex items-center justify-center text-[12px] sm:text-[14px] lg:text-[16px]"
                    style={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      color: 'rgba(73, 178, 101, 1)',
                      textDecoration: 'none'
                    }}
                  >
                    {link.name}
                  </a>
                  {idx < arr.length - 1 && (
                    <span
                      className="hidden lg:flex items-center justify-center"
                      style={{ color: '#fff', fontSize: 16 }}
                    >
                      &bull;
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Bottom Divider & Copyright */}
          <div className="w-full flex flex-col items-center gap-3 mt-2 lg:mt-0 px-2 lg:px-0">
            <div
              className="w-full border-t border-white/30"
              style={{ maxWidth: 1240 }}
            />
            <div
              className="flex flex-col-reverse lg:flex-row items-center justify-between w-full gap-3 lg:gap-0 pb-2 lg:pb-0"
              style={{ maxWidth: 1240 }}
            >
              <p
                className="m-0 p-0 flex items-center text-center lg:text-left text-[12px] lg:text-[16px]"
                style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 1)'
                }}
              >
                © 2026 TaskMint. All rights reserved.
              </p>
              <div
                className="flex items-center justify-center lg:justify-between gap-4 lg:gap-[20px]"
                style={{
                  color: 'rgba(73, 178, 101, 1)'
                }}
              >
                <FaFacebook className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0 w-[18px] h-[18px] lg:w-[26px] lg:h-[26px]" />
                <FaInstagram className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0 w-[18px] h-[18px] lg:w-[26px] lg:h-[26px]" />
                <FaYoutube className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0 w-[18px] h-[18px] lg:w-[26px] lg:h-[26px]" />
                <FaDiscord className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0 w-[18px] h-[18px] lg:w-[26px] lg:h-[26px]" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
