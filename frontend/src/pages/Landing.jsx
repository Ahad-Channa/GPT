import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import {
  FiGlobe, FiLogIn, FiArrowRight, FiUsers, FiDollarSign,
  FiUserPlus, FiCheckSquare, FiGift, FiLayers, FiZap,
  FiMonitor, FiActivity, FiClipboard, FiChevronDown, FiUser
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
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-[#29FD98] selection:text-black">

      {/* NAVBAR */}
      {currentUser ? (
        <div className="relative z-50">
          <Header />
        </div>
      ) : (
        <nav className="w-full absolute top-0 left-0 right-0 z-50 py-6 px-8 flex justify-between items-center max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer">
            <img
              src="/coins/logo copy.png"
              alt="Logo"
              style={{
                width: 53.985984802246094,
                height: 53.98569107055664
              }}
            />
            <span
              className="font-bold tracking-tight text-white"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: '28px',
                lineHeight: '30.15px'
              }}
            >
              TaskMint
            </span>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-8 font-['Barlow_Condensed'] font-semibold text-[22px] leading-none tracking-normal text-white">
            <a href="#" className="hover:text-[#29FD98] transition-colors">Home</a>
            <a href="#earn" className="hover:text-[#29FD98] transition-colors">Earn</a>
            <a href="#how-it-works" className="hover:text-[#29FD98] transition-colors">How it Works</a>
            <a href="#features" className="hover:text-[#29FD98] transition-colors">Features</a>
            <a href="#faq" className="hover:text-[#29FD98] transition-colors">FAQ</a>
          </div>

          {/* Right Actions */}
          <div
            className="flex items-center"
            style={{ width: 282, height: 48, gap: 10 }}
          >
            <div
              className="hidden sm:flex items-center justify-center cursor-pointer text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none"
              style={{
                width: 104,
                height: 48,
                borderRadius: 10,
                /* Using a slightly tighter padding to ensure all 3 elements fit inside the 104px width */
                padding: '10px 14px',
                gap: 8,
                background: 'rgba(39, 112, 58, 1)',
                boxShadow: '0px 4px 0px 0px rgba(35, 80, 47, 1)'
              }}
            >
              <img src="/coins/globe.png" alt="Lang" className="w-5 h-5 object-contain" />
              <span className="font-['Barlow_Condensed'] font-semibold text-[18px] leading-none tracking-normal">
                Eng
              </span>
              <img src="/coins/arrow.png" alt="Arrow" className="w-3 h-3 object-contain" />
            </div>
            <button
              onClick={() => navigate('/login?tab=register')}
              className="flex items-center justify-center text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none"
              style={{
                width: 168,
                height: 48,
                borderRadius: 10,
                padding: '10px 24px',
                gap: 10,
                background: 'rgba(73, 178, 101, 1)',
                boxShadow: '0px 4px 0px 0px rgba(45, 110, 62, 1)'
              }}
            >
              <span className="font-['Barlow_Condensed'] font-bold text-[18px] leading-none tracking-normal">
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
        </nav>
      )}

      {/* Header Bottom Line */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-40"
        style={{
          top: 106,
          width: '100%',
          maxWidth: 1240,
          borderBottom: '1px solid rgba(255, 255, 255, 0.4)'
        }}
      />

      {/* HERO SECTION */}
      <section className="relative pt-[184px] pb-[63px] md:pb-[95px] px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-12 lg:gap-8">
        {/* Left text */}
        <div className="flex-1 w-full z-10">
          <div
            className="flex flex-col text-left"
            style={{ width: '100%', maxWidth: 654, gap: 40 }}
          >
            <h1
              className="font-bold text-white m-0"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 88,
                lineHeight: '90px',
                whiteSpace: 'nowrap'
              }}
            >
              Your Time Has Value<br />
              <span style={{ color: 'rgba(73, 178, 101, 1)' }}>Get Rewarded For It</span>
            </h1>
            <p
              className="m-0"
              style={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 22,
                lineHeight: '32px',
                color: 'rgba(209, 213, 219, 1)',
                fontWeight: 400,
                marginTop: -10
              }}
            >
              Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.
            </p>
          </div>

          <div
            className="flex items-center justify-start mt-[35px]"
            style={{
              width: 410,
              height: 48,
              gap: 10
            }}
          >
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center text-white transition-all hover:brightness-110 active:translate-y-[4px] active:shadow-none"
              style={{
                width: 200,
                height: 48,
                borderRadius: 10,
                padding: '10px 30px',
                gap: 10,
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
                width: 168,
                height: 48,
                borderRadius: 10,
                padding: '10px 24px',
                gap: 10,
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
        </div>

        {/* Right image */}
        <div
          className="flex-1 w-full relative z-0 flex justify-center lg:justify-end mt-12 lg:mt-[-50px]"
        >
          <div className="drop-shadow-2xl" style={{ width: 590, minWidth: 590, height: 590, transform: 'translateX(-30px)' }}>
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
        <div className="absolute z-20 left-1/2 -translate-x-1/2 w-[90%] md:w-full max-w-[1240px] bottom-0 translate-y-1/2 lg:translate-y-0 lg:bottom-auto lg:top-[603px]">
          <div
            className="flex flex-col md:flex-row items-center w-full p-6 md:p-[40px] gap-6 md:gap-[40px] rounded-[20px] min-h-[120px] md:h-[120px]"
            style={{
              backgroundColor: 'rgba(129, 129, 129, 0.2)',
              backdropFilter: 'blur(64px)',
              WebkitBackdropFilter: 'blur(64px)'
            }}
          >
            <div className="w-full flex items-center max-w-[540px]" style={{ height: 40, gap: 14 }}>
              <img src="/coins/people.png" alt="Users" className="w-[40px] h-[40px] object-contain" />
              <span style={{ display: 'inline-block', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 30, lineHeight: '24px', letterSpacing: '0%', textTransform: 'capitalize', color: 'rgba(255, 255, 255, 1)', verticalAlign: 'middle', opacity: 1, width: 428, height: 24 }}>Total Users</span>
              <span style={{ display: 'inline-block', width: 44, height: 24, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 60, lineHeight: '24px', letterSpacing: '0%', textAlign: 'center', verticalAlign: 'middle', textTransform: 'capitalize', color: 'rgba(255, 255, 255, 1)', opacity: 1 }}>
                {(stats.totalUsers || 16).toLocaleString()}
              </span>
            </div>

            <div className="hidden md:block w-px h-[60px] bg-white/10" />
            <div className="md:hidden w-full h-px bg-white/10" />

            <div className="w-full flex items-center max-w-[540px]" style={{ height: 40, gap: 14 }}>
              <img src="/coins/doller.png" alt="Paid" className="w-[40px] h-[40px] object-contain" />
              <span style={{ display: 'inline-block', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 30, lineHeight: '24px', letterSpacing: '0%', textTransform: 'capitalize', color: 'rgba(255, 255, 255, 1)', verticalAlign: 'middle', opacity: 1, width: 428, height: 24 }}>Total Paid</span>
              <span style={{ display: 'inline-block', width: 135, height: 24, fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: 60, lineHeight: '24px', letterSpacing: '0%', textAlign: 'center', verticalAlign: 'middle', textTransform: 'capitalize', color: 'rgba(255, 255, 255, 1)', opacity: 1 }}>
                ${(stats.totalPaidOut || 31.33).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="pt-0 pb-24 px-6 relative bg-[#050505]">
        <div className="max-w-7xl mx-auto">
          <div
            className="flex flex-col items-center justify-center mx-auto mb-14"
            style={{ width: 448, height: 102, gap: 30 }}
          >
            <h2
              className="font-bold text-white m-0"
              style={{
                width: 366,
                height: 55,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 78,
                lineHeight: '48px',
                textAlign: 'center'
              }}
            >
              How It Works
            </h2>
            <p
              className="m-0"
              style={{
                width: 448,
                height: 17,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 24,
                lineHeight: '28px',
                color: 'rgba(209, 213, 219, 1)',
                textAlign: 'center'
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
                className="p-[24px] hover:brightness-110 transition-all group"
                style={{
                  width: '100%',
                  maxWidth: 400,
                  height: 212,
                  borderRadius: 20,
                  background: 'rgba(26, 27, 26, 1)',
                  boxShadow: '0px 4px 80px 0px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(44px)',
                  WebkitBackdropFilter: 'blur(44px)',
                  border: 'none'
                }}
              >
                <div className="flex items-center">
                  <img
                    src={item.icon}
                    alt={item.title}
                    className="object-contain"
                    style={{ width: 44, height: 44 }}
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
                  className="flex flex-col"
                  style={{ width: 352, height: 84, gap: 12, marginTop: 34 }}
                >
                  <h3
                    className="font-bold text-white m-0"
                    style={{
                      width: 352,
                      height: 24,
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: 34,
                      lineHeight: '100%'
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="m-0"
                    style={{
                      color: 'rgba(189, 189, 189, 1)',
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 500,
                      fontSize: 19,
                      lineHeight: '24px',
                      width: 352,
                      height: 48,
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
          height: 864,
          padding: '120px 100px',
          gap: 10,
          background: 'rgba(26, 27, 26, 1)',
          backdropFilter: 'blur(75px)',
          WebkitBackdropFilter: 'blur(75px)'
        }}
      >
        <div
          className="flex flex-col mx-auto"
          style={{ width: 1240, maxWidth: '100%', height: 624, gap: 50 }}
        >
          <div
            className="flex flex-col items-center mx-auto"
            style={{ width: 429, height: 102, gap: 30 }}
          >
            <h2
              className="font-bold m-0"
              style={{
                width: 429,
                height: 55,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 78,
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
                width: 387,
                height: 17,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 24,
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
                  height: 226,
                  borderRadius: 20,
                  padding: '20px 12px 30px 12px',
                  gap: 22,
                  background: 'rgba(255, 255, 255, 0.08)',
                  boxShadow: '0px 4px 80px 0px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(44px)',
                  WebkitBackdropFilter: 'blur(44px)'
                }}
              >
                <div
                  className="flex items-center justify-center mb-6"
                  style={{ width: 94, height: 94, borderRadius: 20, gap: 10, background: 'transparent' }}
                >
                  <img src={item.icon} alt={item.title} style={{ width: 44, height: 44, objectFit: 'contain' }} />
                </div>
                <div
                  className="flex flex-col items-center"
                  style={{ width: 376, height: 60, gap: 12 }}
                >
                  <h3
                    className="font-bold m-0"
                    style={{
                      width: 376,
                      height: 24,
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontSize: 34,
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
                      fontSize: 19,
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
          style={{ width: 1240, maxWidth: '100%', height: 422, gap: 50 }}
        >
          <div
            className="flex flex-col items-center mx-auto"
            style={{ width: 542, height: 102, gap: 30 }}
          >
            <h2
              className="font-bold m-0"
              style={{
                width: 516,
                height: 55,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 78,
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
                width: 542,
                height: 17,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 24,
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
                  height: 270,
                  borderRadius: 20,
                  padding: '30px 20px',
                  gap: 22,
                  background: 'rgba(26, 27, 26, 1)',
                  boxShadow: '0px 4px 80px 0px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(44px)',
                  WebkitBackdropFilter: 'blur(44px)'
                }}
              >
                <div
                  className="flex items-center justify-center mb-6"
                  style={{ width: 94, height: 94, borderRadius: 100, gap: 10, background: 'transparent' }}
                >
                  <img src={item.icon} alt={item.title} style={{ width: 44, height: 44, objectFit: 'contain' }} />
                </div>
                <h3
                  className="font-bold m-0"
                  style={{
                    width: '100%',
                    height: 24,
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontSize: 34,
                    lineHeight: '100%',
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 1)'
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
                    fontSize: 19,
                    lineHeight: '24px',
                    textAlign: 'center',
                    color: 'rgba(189, 189, 189, 1)'
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-12 px-6 bg-[#050505]">
        <div
          className="flex flex-col mx-auto"
          style={{
            width: 1240,
            maxWidth: '100%',
            height: 622,
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
            style={{ width: 781, height: 102, gap: 30 }}
          >
            <h2
              className="font-bold m-0 whitespace-nowrap"
              style={{
                width: 781,
                height: 55,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontSize: 78,
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
                width: 279,
                height: 17,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 24,
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
                    minHeight: 92,
                    borderRadius: 20,
                    padding: '30px',
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
                        fontSize: 28,
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
                    className={`transition-all duration-300 flex items-start overflow-hidden ${isOpen ? 'opacity-100 max-h-[60px] mt-[32px]' : 'opacity-0 max-h-0 mt-0'}`}
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

      {/* STATIC PAYOUT OPTIONS */}
      <div
        className="flex mx-auto justify-center items-center"
        style={{
          width: 1440,
          maxWidth: '100%',
          height: 106,
          paddingTop: 30,
          paddingRight: 100,
          paddingBottom: 30,
          paddingLeft: 100,
          gap: 100,
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
        {[
          { Icon: FaBitcoin, text: "Litecoin" },
          { Icon: FaPaypal, text: "PayPal" },
          { Icon: FaAmazon, text: "Amazon" },
          { Icon: FiGift, text: "Gift Cards" }
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 text-white whitespace-nowrap">
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
        className="w-full flex justify-center border-t border-[#333]"
        style={{ background: 'rgba(44, 45, 44, 1)' }}
      >
        <div
          className="flex flex-col items-center text-center w-full mx-auto"
          style={{
            width: 1440,
            maxWidth: '100%',
            height: 406.9995422363281,
            paddingTop: 100,
            paddingRight: 100,
            paddingBottom: 30,
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
              width: 264.9997253417969,
              height: 73.99954223632812,
              gap: 10,
              opacity: 1,
              transform: 'rotate(0deg)'
            }}
          >
            <img
              src="/coins/logo copy.png"
              alt="Logo"
              style={{
                width: 73.99972534179688,
                height: 73.99954223632812,
                objectFit: 'contain',
                opacity: 1,
                transform: 'rotate(0deg)'
              }}
            />
            <span
              className="whitespace-nowrap flex items-center"
              style={{
                width: 181,
                height: 39,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: 56,
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
            style={{ width: 1104, maxWidth: '100%', height: 79, gap: 30 }}
          >
            <p
              className="m-0 p-0 flex items-center justify-center whitespace-nowrap"
              style={{
                width: 1104,
                maxWidth: '100%',
                height: 17,
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 400,
                fontSize: 24,
                lineHeight: '28px',
                textAlign: 'center',
                color: 'rgba(209, 213, 219, 1)'
              }}
            >
              Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.
            </p>
            <div
              className="flex justify-center items-center m-0 p-0"
              style={{ width: 772, maxWidth: '100%', height: 32, gap: 30 }}
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
                      height: 32,
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: 26,
                      lineHeight: '32px',
                      color: 'rgba(73, 178, 101, 1)'
                    }}
                  >
                    {link.name}
                  </a>
                  {idx < arr.length - 1 && (
                    <span
                      className="flex items-center justify-center"
                      style={{ color: '#fff', fontSize: 26, lineHeight: '32px' }}
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
            <div className="w-full h-px bg-[#444]" />
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
                  height: 14,
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 500,
                  fontSize: 20,
                  lineHeight: '20px',
                  color: 'rgba(255, 255, 255, 1)'
                }}
              >
                © 2026 TaskMint. All rights reserved.
              </p>
              <div
                className="flex items-center justify-between"
                style={{
                  width: 196,
                  height: 34,
                  gap: 20,
                  color: 'rgba(73, 178, 101, 1)'
                }}
              >
                <FaFacebook className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0" style={{ width: 34, height: 34, opacity: 1, transform: 'rotate(0deg)' }} />
                <FaInstagram className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0" style={{ width: 34, height: 34, opacity: 1, transform: 'rotate(0deg)' }} />
                <FaYoutube className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0" style={{ width: 34, height: 34, opacity: 1, transform: 'rotate(0deg)' }} />
                <FaDiscord className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0" style={{ width: 34, height: 34, opacity: 1, transform: 'rotate(0deg)' }} />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
