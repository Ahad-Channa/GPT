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
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-[#29FD98] selection:text-black flex flex-col">

      {/* NAVBAR */}
      {currentUser ? (
        <div className="relative z-50">
          <Header />
        </div>
      ) : (
        <nav className="w-full relative z-50 py-2 lg:py-6 px-2 md:px-8 flex justify-between items-center max-w-7xl mx-auto h-[44px] lg:h-[106px]">
          {/* Logo */}
          <div className="flex items-center gap-1 lg:gap-2 cursor-pointer">
            <img
              src="/coins/logo copy.png"
              alt="Logo"
              className="w-[22px] h-[22px] lg:w-[54px] lg:h-[54px] object-contain"
            />
            <span
              className="font-bold tracking-tight text-white flex items-center text-[14px] lg:text-[28px]"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                lineHeight: '30.15px'
              }}
            >
              TaskMint
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-[6px] sm:gap-[10px] lg:gap-8 font-['Barlow_Condensed'] font-semibold text-[10px] sm:text-[14px] lg:text-[22px] leading-none tracking-normal text-white">
            <a href="#hero" className="hover:text-[#29FD98] transition-colors">Home</a>
            <a href="#earn" className="hover:text-[#29FD98] transition-colors">Earn</a>
            <a href="#how-it-works" className="hover:text-[#29FD98] transition-colors whitespace-nowrap">How it Works</a>
            <a href="#features" className="hover:text-[#29FD98] transition-colors">Features</a>
            <a href="#faq" className="hover:text-[#29FD98] transition-colors">FAQ</a>
          </div>

          {/* Right Actions */}
          <div
            className="flex items-center justify-end w-auto lg:w-[282px] h-[22px] lg:h-[48px] gap-[4px] lg:gap-[10px]"
          >
            <div
              className="flex sm:flex items-center justify-center cursor-pointer text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none lg:w-[104px] lg:h-[48px] h-[22px] px-1 lg:px-[14px] rounded-[6px] lg:rounded-[10px] gap-1 lg:gap-[8px]"
              style={{
                background: 'rgba(39, 112, 58, 1)',
                boxShadow: '0px 4px 0px 0px rgba(35, 80, 47, 1)'
              }}
            >
              <img src="/coins/globe.png" alt="Lang" className="w-[8px] h-[8px] lg:w-5 lg:h-5 object-contain" />
              <span className="font-['Barlow_Condensed'] font-semibold text-[8px] lg:text-[18px] leading-none tracking-normal">
                Eng
              </span>
              <img src="/coins/arrow.png" alt="Arrow" className="w-2 h-2 lg:w-3 lg:h-3 object-contain" />
            </div>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none w-[50px] sm:w-[70px] lg:w-[168px] h-[22px] lg:h-[48px] px-1 lg:px-6 gap-[2px] lg:gap-[10px] rounded-[6px] lg:rounded-[10px]"
              style={{
                background: 'rgba(73, 178, 101, 1)',
                boxShadow: '0px 4px 0px 0px rgba(45, 110, 62, 1)'
              }}
            >
              <span className="font-['Barlow_Condensed'] font-bold text-[8px] sm:text-[10px] lg:text-[18px] leading-none tracking-normal whitespace-nowrap">
                Get Started
              </span>
              <div
                className="bg-white w-[6px] h-[6px] lg:w-[18px] lg:h-[18px] hidden sm:block"
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
      <section className="relative pt-[72px] pb-[53px] md:pb-[85px] px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-12 lg:gap-8">
        {/* Left text */}
        <div className="flex-1 w-full z-10">
          <div
            className="flex flex-col text-left"
            style={{ width: 654, height: 297, gap: 50, opacity: 1 }}
          >
            <h1
              className="font-bold text-white m-0"
              style={{
                width: 654,
                height: 112,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 62,
                lineHeight: '69px',
                letterSpacing: '0%',
                opacity: 1
              }}
            >
              Your Time Has Value<br />
              <span style={{ color: 'rgba(73, 178, 101, 1)' }}>Get Rewarded For It</span>
            </h1>
            <p
              className="m-0"
              style={{
                width: 654,
                height: 47,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 22,
                lineHeight: '32px',
                letterSpacing: '0%',
                color: 'rgba(209, 213, 219, 1)',
                opacity: 1
              }}
            >
              Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.
            </p>

            <div
              className="flex items-center justify-start"
              style={{
                width: 410,
                height: 48,
                gap: 10,
                opacity: 1
              }}
            >
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-center text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none"
                style={{
                  width: 200,
                  height: 48,
                  borderRadius: 10,
                  padding: '10px 30px 10px 30px',
                  gap: 10,
                  opacity: 1,
                  backgroundColor: 'rgba(39, 112, 58, 1)',
                  boxShadow: '0px 4px 0px 0px rgba(35, 80, 47, 1)'
                }}
              >
                <img src="/coins/login.png" alt="Login Icon" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                <span style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: 18,
                  lineHeight: '100%'
                }}>
                  Login
                </span>
              </button>
              <button
                onClick={() => navigate('/login?tab=register')}
                className="flex items-center justify-center text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none"
                style={{
                  width: 200,
                  height: 48,
                  borderRadius: 10,
                  padding: '10px 30px 10px 30px',
                  gap: 10,
                  opacity: 1,
                  background: 'rgba(73, 178, 101, 1)',
                  boxShadow: '0px 4px 0px 0px rgba(45, 110, 62, 1)'
                }}
              >
                <span style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: 18,
                  lineHeight: '100%'
                }}>
                  Start Earning
                </span>
                <div
                  className="bg-white"
                  style={{
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
                  }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right image */}
        <div
          className="flex-1 w-full relative z-0 flex justify-center lg:justify-end mt-12 lg:-mt-[55px]"
        >
          <div className="drop-shadow-2xl" style={{ width: 577, minWidth: 577, height: 577, opacity: 1, transform: 'translateX(-30px)' }}>
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
        <div className="absolute z-20 left-1/2 -translate-x-1/2 w-[90%] md:w-[1240px] max-w-[1240px] bottom-0 translate-y-1/2 lg:translate-y-0 lg:bottom-auto lg:top-[448px]">
          <div
            className="flex flex-col md:flex-row items-center w-full"
            style={{
              width: 1240,
              height: 120,
              borderRadius: 20,
              gap: 40,
              padding: 40,
              opacity: 1,
              backgroundColor: 'rgba(129, 129, 129, 0.2)',
              backdropFilter: 'blur(64px)',
              WebkitBackdropFilter: 'blur(64px)'
            }}
          >
            <div className="w-full flex items-center max-w-[540px]" style={{ height: 40, gap: 14 }}>
              <img src="/coins/people.png" alt="Users" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              <span style={{ display: 'inline-block', width: 440, height: 24, opacity: 1, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 24, lineHeight: '24px', letterSpacing: '0%', textTransform: 'capitalize', color: 'rgba(255, 255, 255, 1)', verticalAlign: 'middle' }}>Total Users</span>
              <span style={{ display: 'inline-block', width: 'auto', minWidth: 32, height: 24, opacity: 1, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 44, lineHeight: '24px', letterSpacing: '0%', textAlign: 'center', verticalAlign: 'middle', textTransform: 'capitalize', color: 'rgba(255, 255, 255, 1)' }}>
                {(stats.totalUsers || 16).toLocaleString()}
              </span>
            </div>

            <div className="hidden md:block w-px h-[60px] bg-white/10" />
            <div className="md:hidden w-full h-px bg-white/10" />

            <div className="w-full flex items-center max-w-[540px]" style={{ height: 40, gap: 14 }}>
              <img src="/coins/doller.png" alt="Paid" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              <span style={{ display: 'inline-block', width: 440, height: 24, opacity: 1, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 24, lineHeight: '24px', letterSpacing: '0%', textTransform: 'capitalize', color: 'rgba(255, 255, 255, 1)', verticalAlign: 'middle' }}>Total Paid</span>
              <span style={{ display: 'inline-block', width: 'auto', minWidth: 32, height: 24, opacity: 1, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 44, lineHeight: '24px', letterSpacing: '0%', textAlign: 'center', verticalAlign: 'middle', textTransform: 'capitalize', color: 'rgba(255, 255, 255, 1)' }}>
                ${(stats.totalPaidOut || 31.33).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="pt-0 pb-24 px-6 relative bg-[#050505] flex justify-center w-full">
        <div 
          className="flex flex-col mx-auto"
          style={{
            width: 1240,
            maxWidth: '100%',
            height: 337,
            gap: 40,
            opacity: 1
          }}
        >
          <div
            className="flex flex-col items-center justify-center mx-auto"
            style={{ width: 374, height: 85, gap: 30, opacity: 1 }}
          >
            <h2
              className="font-bold text-white m-0 flex items-center justify-center"
              style={{
                width: 272,
                height: 41,
                opacity: 1,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 58,
                lineHeight: '48px',
                letterSpacing: '0%',
                textAlign: 'center',
                verticalAlign: 'middle'
              }}
            >
              How It Works
            </h2>
            <p
              className="m-0 flex items-center justify-center"
              style={{
                width: 374,
                height: 14,
                opacity: 1,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 20,
                lineHeight: '28px',
                letterSpacing: '0%',
                color: 'rgba(209, 213, 219, 1)',
                textAlign: 'center',
                verticalAlign: 'middle'
              }}
            >
              Get started in seconds. No complicated setup required.
            </p>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-3 mx-auto"
            style={{ width: 1240, maxWidth: '100%', height: 212, gap: 20 }}
          >
            {[
              { icon: '/coins/persontik.png', step: 1, title: 'Sign Up', desc: 'Create your free account in seconds and get instant access to the platform.' },
              { icon: '/coins/clipboard.png', step: 2, title: 'Complete Tasks', desc: 'Choose from hundreds of offers, surveys, and apps to complete at your own pace.' },
              { icon: '/coins/gift.png', step: 3, title: 'Earn Rewards', desc: 'Get coins and convert them into real money, crypto, or gift cards instantly.' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="hover:brightness-110 transition-all group relative"
                style={{
                  width: 400,
                  height: 212,
                  borderRadius: 20,
                  background: 'rgba(26, 27, 26, 1)',
                  boxShadow: '0px 4px 80px 0px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(44px)',
                  WebkitBackdropFilter: 'blur(44px)',
                  border: 'none',
                  opacity: 1
                }}
              >
                <div>
                  <img
                    src={item.icon}
                    alt={item.title}
                    className="object-contain"
                    style={{ 
                      width: 44, 
                      height: 44, 
                      opacity: 1, 
                      position: 'absolute', 
                      top: 24, 
                      left: 24 
                    }}
                  />
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      width: 70,
                      height: 68,
                      top: 0,
                      left: 304,
                      padding: '10px 30px',
                      gap: 10,
                      background: 'rgba(50, 50, 50, 1)',
                      borderBottomRightRadius: 10,
                      borderBottomLeftRadius: 10
                    }}
                  >
                    <span
                      className="text-white flex items-center justify-center"
                      style={{
                        width: 11,
                        height: 27,
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontWeight: 700,
                        fontSize: 38,
                        lineHeight: '100%'
                      }}
                    >
                      {item.step}
                    </span>
                  </div>
                </div>
                <div
                  className="flex flex-col absolute"
                  style={{ width: 351.9999084472656, height: 77, gap: 12, top: 102, left: 24, opacity: 1 }}
                >
                  <h3
                    className="font-semibold text-white m-0"
                    style={{
                      width: 351.9999084472656,
                      height: 17,
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 600,
                      fontSize: 24,
                      lineHeight: '100%',
                      opacity: 1,
                      letterSpacing: '0.5px'
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="m-0 flex items-center"
                    style={{
                      width: 351.9999084472656,
                      height: 48,
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500,
                      fontSize: 17,
                      lineHeight: '24px',
                      color: 'rgba(156, 163, 175, 1)',
                      opacity: 1,
                      verticalAlign: 'middle'
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
        className="mx-auto flex flex-col"
        style={{
          width: 1440,
          maxWidth: '100%',
          height: 721,
          padding: '100px',
          gap: 10,
          background: 'rgba(26, 27, 26, 1)',
          backdropFilter: 'blur(75px)',
          WebkitBackdropFilter: 'blur(75px)'
        }}
      >
        <div
          className="flex flex-col mx-auto"
          style={{ width: 1240, maxWidth: '100%', height: 521, gap: 50 }}
        >
          <div
            className="flex flex-col items-center mx-auto"
            style={{ width: 323, height: 85, gap: 30 }}
          >
            <h2
              className="font-bold m-0"
              style={{
                width: 319,
                height: 41,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 58,
                lineHeight: '48px',
                textAlign: 'center',
                verticalAlign: 'middle',
                color: 'rgba(255, 255, 255, 1)'
              }}
            >
              Why Choose Us
            </h2>
            <p
              className="m-0"
              style={{
                width: 323,
                height: 14,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 20,
                lineHeight: '28px',
                textAlign: 'center',
                verticalAlign: 'middle',
                color: 'rgba(209, 213, 219, 1)'
              }}
            >
              Powerful features designed specifically for you.
            </p>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mx-auto"
            style={{ width: 1240, maxWidth: '100%', height: 472, gap: 20 }}
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
                className="flex flex-col items-center transition-colors group"
                style={{
                  width: 400,
                  maxWidth: '100%',
                  height: 183,
                  borderRadius: 20,
                  padding: '20px 12px 24px 12px',
                  gap: 12,
                  background: 'rgba(255, 255, 255, 0.08)',
                  boxShadow: '0px 4px 80px 0px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(44px)',
                  WebkitBackdropFilter: 'blur(44px)'
                }}
              >
                <div
                  className="flex items-center justify-center mb-0"
                  style={{ width: 94, height: 94, borderRadius: 20, gap: 10, background: 'transparent' }}
                >
                  <img src={item.icon} alt={item.title} style={{ width: 44, height: 44, objectFit: 'contain' }} />
                </div>
                <div
                  className="flex flex-col items-center"
                  style={{ width: 376, height: 53, gap: 12 }}
                >
                  <h3
                    className="font-bold m-0"
                    style={{
                      width: 376,
                      height: 17,
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: 24,
                      lineHeight: '100%',
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 1)'
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="m-0"
                    style={{
                      width: 376,
                      height: 24,
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500,
                      fontSize: 17,
                      lineHeight: '24px',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      color: 'rgba(189, 189, 189, 1)'
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
      <section className="py-24 px-6 bg-[#050505]">
        <div
          className="flex flex-col mx-auto"
          style={{ width: 1240, maxWidth: '100%', height: 318, gap: 50 }}
        >
          <div
            className="flex flex-col items-center mx-auto"
            style={{ width: 452, height: 85, gap: 30 }}
          >
            <h2
              className="font-bold m-0"
              style={{
                width: 384,
                height: 41,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 58,
                lineHeight: '48px',
                textAlign: 'center',
                verticalAlign: 'middle',
                color: 'rgba(255, 255, 255, 1)'
              }}
            >
              Start Earning With
            </h2>
            <p
              className="m-0"
              style={{
                width: 452,
                height: 14,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 20,
                lineHeight: '28px',
                textAlign: 'center',
                verticalAlign: 'middle',
                color: 'rgba(209, 213, 219, 1)'
              }}
            >
              Multiple ways to stack your coins. Choose what works best for you.
            </p>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-3 mx-auto"
            style={{ width: 1240, maxWidth: '100%', height: 270, gap: 24 }}
          >
            {[
              { icon: '/coins/clicl.png', title: 'Surveys', desc: 'Share your opinion on various topics and get rewarded instantly.' },
              { icon: '/coins/game.png', title: 'Apps & Games', desc: 'Download apps or play new games. Reach milestones to earn big.' },
              { icon: '/coins/persantage.png', title: 'Featured Offers', desc: 'Sign up for services or trials to earn the highest paying rewards.' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center transition-colors group"
                style={{
                  width: '397.33px',
                  maxWidth: '100%',
                  height: 183,
                  borderRadius: 20,
                  padding: '20px',
                  gap: 2,
                  background: 'rgba(26, 27, 26, 1)',
                  boxShadow: '0px 4px 80px 0px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(44px)',
                  WebkitBackdropFilter: 'blur(44px)'
                }}
              >
                <div
                  className="flex items-center justify-center mb-0"
                  style={{ width: 94, height: 94, borderRadius: 100, gap: 10, background: 'transparent', transform: 'translateY(-11px)' }}
                >
                  <img src={item.icon} alt={item.title} style={{ width: 44, height: 44, objectFit: 'contain' }} />
                </div>
                <div className="flex flex-col items-center" style={{ gap: 1, width: '100%' }}>
                  <h3
                    className="font-bold m-0"
                    style={{
                      width: '100%',
                      height: 17,
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: 24,
                      lineHeight: '100%',
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 1)',
                      transform: 'translateY(-8px)'
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="m-0 flex items-center justify-center"
                    style={{
                      width: '357.33px',
                      maxWidth: '100%',
                      height: 48,
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500,
                      fontSize: 17,
                      lineHeight: '24px',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      color: 'rgba(189, 189, 189, 1)'
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
      <section id="faq" className="py-12 px-6 bg-[#050505]" style={{ marginTop: -38 }}>
        <div
          className="flex flex-col mx-auto"
          style={{
            width: 1240,
            maxWidth: '100%',
            height: 557,
            borderRadius: 20,
            padding: '60px 40px',
            gap: 50,
            background: 'rgba(255, 255, 255, 0.08)',
            boxShadow: '0px 4px 80px 0px rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(44px)',
            WebkitBackdropFilter: 'blur(44px)'
          }}
        >
          <div
            className="flex flex-col items-center mx-auto"
            style={{ width: 581, height: 85, gap: 30 }}
          >
            <h2
              className="font-bold m-0 whitespace-nowrap"
              style={{
                width: 581,
                height: 41,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 58,
                lineHeight: '48px',
                textAlign: 'center',
                verticalAlign: 'middle',
                color: 'rgba(255, 255, 255, 1)'
              }}
            >
              Frequently Asked Questions
            </h2>
            <p
              className="m-0"
              style={{
                width: 232,
                height: 14,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 20,
                lineHeight: '28px',
                textAlign: 'center',
                verticalAlign: 'middle',
                color: 'rgba(209, 213, 219, 1)'
              }}
            >
              Got questions? We've got answers.
            </p>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-2 mx-auto"
            style={{ width: 1160, maxWidth: '100%', gap: 16 }}
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
                  className="flex flex-col justify-start cursor-pointer transition-all duration-300 overflow-hidden"
                  style={{
                    width: 570,
                    maxWidth: '100%',
                    height: isOpen ? 110 : 76,
                    gap: 10,
                    borderRadius: 20,
                    padding: '22px 30px',
                    background: 'rgba(44, 45, 44, 1)',
                    backdropFilter: 'blur(54px)',
                    WebkitBackdropFilter: 'blur(54px)',
                    boxShadow: '0px 4px 34px 0px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div className="flex justify-between items-center w-full">
                    <span
                      className="font-bold m-0 whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{
                        width: '470.6px',
                        maxWidth: '100%',
                        height: 32,
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontWeight: 700,
                        fontSize: 22,
                        lineHeight: '32px',
                        color: 'rgba(255, 255, 255, 1)'
                      }}
                    >
                      {faq.q}
                    </span>
                    <div
                      className={`bg-[#29FD98] transition-transform duration-300 ${isOpen ? '-rotate-180' : ''}`}
                      style={{
                        width: 24,
                        height: 24,
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
                  <div
                    className={`transition-all duration-300 flex items-start overflow-hidden ${isOpen ? 'opacity-100 max-h-[60px]' : 'opacity-0 max-h-0'}`}
                  >
                    <p
                      className="m-0 overflow-hidden text-ellipsis whitespace-nowrap"
                      style={{
                        width: 510,
                        maxWidth: '100%',
                        height: 24,
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontWeight: 500,
                        fontSize: 20,
                        lineHeight: '24px',
                        color: 'rgba(130, 127, 141, 1)'
                      }}
                    >
                      {faq.a}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* PAYOUT OPTIONS */}
      <div
        className="mx-auto overflow-hidden flex items-center"
        style={{
          width: 1440,
          maxWidth: '100%',
          height: 106,
          paddingTop: 30,
          paddingBottom: 30,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderStyle: 'solid',
          borderColor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(64px)',
          WebkitBackdropFilter: 'blur(64px)',
          opacity: 1,
          transform: 'rotate(0deg)'
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
                <div key={idx} className="flex items-center gap-3 text-white whitespace-nowrap" style={{ marginRight: 100 }}>
                  <item.Icon style={{ fontSize: 32 }} />
                  <span style={{
                    width: 84,
                    height: 46,
                    display: 'inline-block',
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 700,
                    fontStyle: 'normal',
                    fontSize: 28.75,
                    lineHeight: '46px',
                    letterSpacing: '0%',
                    verticalAlign: 'middle',
                    color: 'rgba(255, 255, 255, 1)',
                    opacity: 1,
                    transform: 'rotate(0deg)'
                  }}>
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
        className="w-full flex justify-center"
        style={{ background: 'rgba(27, 28, 27, 1)' }}
      >
        <div
          className="flex flex-col md:flex-row items-center justify-between w-full"
          style={{
            width: 1440,
            maxWidth: '100%',
            height: 158,
            padding: '40px 100px',
            justifyContent: 'space-between'
          }}
        >
          <div
            className="flex flex-col justify-start"
            style={{ width: 1072, height: 78, gap: 30 }}
          >
            <h2
              className="m-0 whitespace-nowrap flex items-center"
              style={{
                width: 341,
                height: 34,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 48,
                lineHeight: '48px',
                color: 'rgba(255, 255, 255, 1)'
              }}
            >
              Start Earning Today
            </h2>
            <p
              className="m-0 whitespace-nowrap flex items-center"
              style={{
                width: 1072,
                maxWidth: '100%',
                height: 14,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 500,
                fontSize: 20,
                lineHeight: '28px',
                color: 'rgba(255, 255, 255, 0.53)'
              }}
            >
              Join now and start making real money right now!
            </p>
          </div>
          <button
            onClick={() => navigate('/login?tab=register')}
            className="flex items-center justify-center text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none"
            style={{
              width: 168,
              height: 48,
              borderRadius: 10,
              padding: '10px 30px',
              gap: 10,
              background: 'rgba(73, 178, 101, 1)',
              boxShadow: '0px 4px 0px 0px rgba(39, 109, 58, 1)'
            }}
          >
            <span
              className="whitespace-nowrap flex items-center justify-center m-0 p-0"
              style={{
                width: 74,
                height: 13,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontStyle: 'normal',
                fontSize: 18,
                lineHeight: '100%',
                letterSpacing: '0%'
              }}
            >
              Get Started
            </span>
            <div
              className="bg-white"
              style={{
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
              }}
            />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="w-full flex justify-center border-t border-[#333] mt-auto shrink-0"
        style={{ background: 'rgba(44, 45, 44, 1)' }}
      >
        <div
          className="flex flex-col items-center text-center w-full mx-auto"
          style={{
            width: 1440,
            maxWidth: '100%',
            height: 266.9997863769531,
            paddingTop: 40,
            paddingRight: 100,
            paddingBottom: 22,
            paddingLeft: 100,
            gap: 30,
            opacity: 1,
            transform: 'rotate(0deg)',
            justifyContent: 'space-between'
          }}
        >
          {/* Top Logo */}
          <div
            className="flex items-center justify-center"
            style={{
              width: 210.99978637695312,
              height: 51.999786376953125,
              gap: 10,
              opacity: 1,
              transform: 'rotate(0deg)'
            }}
          >
            <img
              src="/coins/logo copy.png"
              alt="Logo"
              style={{
                width: 51.999786376953125,
                height: 51.999786376953125,
                objectFit: 'contain',
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
            />
            <span
              className="whitespace-nowrap flex items-center"
              style={{
                width: 149,
                height: 32,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 46,
                lineHeight: '100%',
                letterSpacing: '0%',
                color: 'rgba(255, 255, 255, 1)',
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
            >
              TaskMint
            </span>
          </div>

          {/* Middle Content */}
          <div
            className="flex flex-col items-center text-center"
            style={{ width: 1104, maxWidth: '100%', gap: 30 }}
          >
            <p
              className="m-0 p-0 flex items-center justify-center whitespace-nowrap"
              style={{
                width: 1104,
                maxWidth: '100%',
                height: 14,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 20,
                lineHeight: '28px',
                textAlign: 'center',
                color: 'rgba(209, 213, 219, 1)'
              }}
            >
              Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.
            </p>
            <div
              className="flex justify-center items-center m-0 p-0"
              style={{ width: 526, maxWidth: '100%', height: 11, gap: 20 }}
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
                    className="hover:opacity-80 transition-opacity whitespace-nowrap flex items-center justify-center"
                    style={{
                      height: 11,
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: 16,
                      lineHeight: '11px',
                      color: 'rgba(73, 178, 101, 1)',
                      textDecoration: 'none'
                    }}
                  >
                    {link.name}
                  </a>
                  {idx < arr.length - 1 && (
                    <span
                      className="flex items-center justify-center"
                      style={{ color: '#fff', fontSize: 16, lineHeight: '11px' }}
                    >
                      &bull;
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Bottom Divider & Copyright */}
          <div className="w-full flex flex-col items-center gap-4">
            <div
              style={{
                width: 1240,
                maxWidth: '100%',
                height: 0,
                borderTop: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            />
            <div
              className="flex items-center"
              style={{
                width: 1240,
                maxWidth: '100%',
                height: 34,
                justifyContent: 'space-between',
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
            >
              <p
                className="m-0 p-0 flex items-center"
                style={{
                  width: 1004,
                  height: 11,
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 500,
                  fontSize: 16,
                  lineHeight: '20px',
                  color: 'rgba(255, 255, 255, 1)'
                }}
              >
                © 2026 TaskMint. All rights reserved.
              </p>
              <div
                className="flex items-center justify-between"
                style={{
                  width: 164,
                  height: 26,
                  gap: 20,
                  color: 'rgba(73, 178, 101, 1)'
                }}
              >
                <FaFacebook className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0" style={{ width: 26, height: 26, opacity: 1, transform: 'rotate(0deg)' }} />
                <FaInstagram className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0" style={{ width: 26, height: 26, opacity: 1, transform: 'rotate(0deg)' }} />
                <FaYoutube className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0" style={{ width: 26, height: 26, opacity: 1, transform: 'rotate(0deg)' }} />
                <FaDiscord className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0" style={{ width: 26, height: 26, opacity: 1, transform: 'rotate(0deg)' }} />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
