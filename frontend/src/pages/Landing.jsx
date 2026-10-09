import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import AuthModal from '../components/AuthModal';
import LanguageToggle from '../components/LanguageToggle';
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
  const { isDarkMode } = useTheme();
  const { t, i18n } = useTranslation();
  const isDe = i18n?.language?.startsWith('de');
  const [stats, setStats] = useState({ totalUsers: 0, totalPaidOut: 0 });
  const [openFaq, setOpenFaq] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
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
    document.body.style.backgroundColor = isDarkMode ? 'rgba(12, 14, 17, 1)' : '#FAFAFA';
    return () => {
      document.body.style.backgroundColor = originalBg;
    };
  }, [isDarkMode]);

  return (
    <div className={`w-full min-h-screen font-sans overflow-x-hidden selection:bg-[#24324D] selection:text-white flex flex-col items-center transition-colors duration-300 ${isDarkMode ? 'bg-[rgba(12,14,17,1)] text-white' : 'bg-[#FAFAFA] text-gray-900'}`}>
      <div
        className="min-h-screen relative font-sans flex flex-col mx-auto w-full transition-colors duration-300"
        style={{
          maxWidth: '1440px',
          background: isDarkMode ? 'rgba(12, 14, 17, 1)' : 'linear-gradient(0deg, #FAFAFA, #FAFAFA), linear-gradient(0deg, #FFFFFF, #FFFFFF)'
        }}
      >
        {/* Absolute Right Hero Image (Locked to 1328px content container) */}
        {!isMobile && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full pointer-events-none z-0"
            style={{ maxWidth: '1328px' }}
          >
            <div
              className="absolute top-0 pointer-events-none"
              style={{ width: 755, height: 587, right: '-30px' }}
            >
              <img
                src={
                  isDarkMode
                    ? (isDe ? "/coins/HerosectionBlackGerman.png" : "/coins/HerosectionBlackEnglish.png")
                    : (isDe ? "/coins/Hero section german desktop.png" : "/coins/hero section image.png")
                }
                alt="Hero Background"
                className="w-full h-full object-fill"
              />
            </div>
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
              <svg
                width={isMobile ? '160' : '161'}
                height={isMobile ? '28.5' : '28.53'}
                viewBox="0 0 161 29"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="object-contain"
              >
                <path fillRule="evenodd" clipRule="evenodd" d="M5.26177 0H23.2747C26.1674 0 28.5344 2.36695 28.5344 5.25967V23.2726C28.5344 26.1653 26.1674 28.5344 23.2747 28.5344H5.26177C2.36695 28.5344 0 26.1653 0 23.2726V5.25967C0 2.36695 2.36695 0 5.26177 0ZM13.9124 14.8943C13.2431 14.6071 12.768 13.8935 11.9298 13.6992C10.6904 13.412 10.3631 14.6451 11.0197 15.3335C11.461 15.7917 12.2908 16.2499 12.7892 16.7313C13.1375 17.067 14.2059 18.1079 14.5945 18.3212C14.8922 17.2739 16.0197 15.4792 16.6215 14.6388C18.7372 11.6891 21.4462 10.0759 24.4909 7.99191C24.89 7.71741 26.009 7.11565 26.1843 6.71658C25.4073 6.37663 23.2684 7.18533 21.4398 8.07003C21.0999 7.23178 20.2743 6.63634 19.3199 6.63634H8.6359C7.37746 6.63634 6.34707 7.66674 6.34707 8.92517V19.6092C6.34707 20.8676 7.37746 21.8959 8.6359 21.8959H19.3199C20.363 21.8959 21.2498 21.1865 21.5222 20.2257L16.4483 20.2067H8.6359C8.3044 20.2067 8.03624 19.9386 8.03624 19.6092V8.92517C8.03624 8.59367 8.3044 8.32552 8.6359 8.32552H19.3199C19.6282 8.32552 19.8837 8.55989 19.9153 8.86183C19.4719 9.10887 19.1024 9.33269 18.8512 9.50794C17.2401 10.6186 16.0978 11.7609 14.9766 13.3001C14.605 13.8111 14.3115 14.4044 13.9124 14.8943Z" fill="#00A247"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M155.229 4.91809V9.59077H160.499V10.8767H155.229V20.317C155.229 22.4179 155.668 23.8939 158.084 23.8939C158.836 23.8939 159.684 23.6426 160.468 23.2668L161 24.521C160.029 24.9897 159.057 25.3043 158.084 25.3043C154.79 25.3043 153.724 23.3597 153.724 20.317V10.8767H150.432V9.59077H153.724V5.07434L155.229 4.91809ZM135.816 9.59289V12.3526C137.007 10.22 139.171 9.34162 141.336 9.30995C145.476 9.30995 148.331 11.85 148.331 16.1469V25.0847H146.794V16.1786C146.794 12.6651 144.63 10.7838 141.272 10.8154C138.074 10.8471 135.848 13.2605 135.848 16.4615V25.0847H134.311V9.59289H135.816ZM130.422 4.54225C130.422 6.17231 127.945 6.17231 127.945 4.54225C127.945 2.9122 130.422 2.9122 130.422 4.54225ZM129.921 9.52954V25.0847H128.384V9.52954H129.921ZM122.518 25.0847V15.8027C122.518 12.8234 120.51 10.7204 117.563 10.7204C114.615 10.7204 112.575 12.9163 112.575 15.8956V25.0847H111.038V15.8956C111.038 12.9163 109.001 10.7521 106.053 10.7521C103.103 10.7521 101.098 12.9163 101.098 15.8956V25.0847H99.5604V9.59289H101.003L101.034 12.1647C102.1 10.125 104.077 9.27828 106.085 9.27828C108.437 9.27828 110.914 10.3446 111.824 13.1043C112.763 10.5642 115.179 9.27828 117.563 9.27828C121.357 9.27828 124.055 11.9451 124.055 15.8027V25.0847H122.518ZM86.6699 3.16135V15.8344L91.8768 9.62245H96.4544V9.84204L90.1517 16.8986L97.3328 24.8039V25.0847H92.7234L86.6699 18.0915V25.0847H82.8439V3.16135H86.6699ZM77.637 13.7314C76.5391 12.6967 75.2848 12.3526 73.811 12.3526C71.991 12.3526 70.988 12.9163 70.988 13.8897C70.988 14.8927 71.8981 15.4564 73.8744 15.5831C76.7903 15.771 80.4917 16.4298 80.4917 20.5366C80.4917 23.2668 78.2641 25.6189 73.8427 25.6189C71.3955 25.6189 68.9505 25.2114 66.6912 22.8592L68.5725 20.1291C69.6705 21.3538 72.1789 22.2617 73.9039 22.2934C75.3482 22.325 76.6974 21.5734 76.6974 20.4437C76.6974 19.3774 75.819 18.9382 73.6231 18.8116C70.7051 18.5941 67.2233 17.5257 67.2233 14.0143C67.2233 10.4396 70.9247 9.18537 73.7477 9.18537C76.1632 9.18537 77.9812 9.65412 79.7696 11.2229L77.637 13.7314ZM60.6376 9.62245H64.3073V25.0847H60.7009L60.513 22.8276C59.6347 24.6455 57.2191 25.5239 55.4941 25.5556C50.9164 25.5873 47.5275 22.7642 47.5275 17.3377C47.5275 12.0063 51.0727 9.21493 55.5891 9.2466C57.6583 9.2466 59.6347 10.2179 60.513 11.755L60.6376 9.62245ZM51.3535 17.3377C51.3535 20.2875 53.3932 22.0442 55.9333 22.0442C61.9552 22.0442 61.9552 12.6651 55.9333 12.6651C53.3932 12.6651 51.3535 14.3901 51.3535 17.3377ZM41.2543 5.26438V9.65412H45.5195V12.948H41.2227V19.6287C41.2227 21.1025 42.0398 21.8246 43.2307 21.8246C43.8261 21.8246 44.5166 21.6346 45.0803 21.3538L46.1466 24.6139C45.0508 25.0552 44.1407 25.2431 42.9794 25.2726C39.6243 25.3993 37.4284 23.4863 37.4284 19.6287V12.948H34.542V9.65412H37.4284V5.67189L41.2543 5.26438Z" fill={isDarkMode ? "#FFFFFF" : "#383F47"}/>
              </svg>
            </div>

            {/* Links (Desktop) */}
            <div className="hidden lg:flex items-center gap-[40px]">
              <a href="#hero" className="hover:opacity-80 transition-opacity" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: isDarkMode ? '#FFFFFF' : 'rgba(30, 30, 30, 1)' }}>{t('nav.home')}</a>
              <a href="#earn" className="hover:opacity-80 transition-opacity" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: isDarkMode ? '#FFFFFF' : 'rgba(30, 30, 30, 1)' }}>{t('nav.earn')}</a>
              <a href="#how-it-works" className="hover:opacity-80 transition-opacity whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: isDarkMode ? '#FFFFFF' : 'rgba(30, 30, 30, 1)' }}>{t('nav.howItWorks')}</a>
              <a href="#features" className="hover:opacity-80 transition-opacity" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: isDarkMode ? '#FFFFFF' : 'rgba(30, 30, 30, 1)' }}>{t('nav.features')}</a>
              <a href="#faq" className="hover:opacity-80 transition-opacity" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500, fontSize: '16px', lineHeight: '28px', color: isDarkMode ? '#FFFFFF' : 'rgba(30, 30, 30, 1)' }}>{t('nav.faq')}</a>
            </div>

            {/* Right Actions (Desktop) */}
            <div className="hidden lg:flex items-center gap-[10px]">
              <LanguageToggle />
              <button
                onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'login' })}
                className="flex items-center justify-center hover:opacity-90 transition-all shadow-sm whitespace-nowrap cursor-pointer"
                style={{
                  height: '49px',
                  padding: '19px 28px',
                  gap: '10px',
                  borderRadius: '80px',
                  border: isDarkMode ? 'none' : '1px solid rgba(0, 0, 0, 0.1)',
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 1)',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '28px',
                  color: isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
                }}
              >
                {t('nav.login')}
              </button>
              <button
                onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'register' })}
                className="flex items-center justify-center hover:opacity-90 transition-all shadow-sm whitespace-nowrap cursor-pointer"
                style={{
                  height: '49px',
                  padding: '19px 28px',
                  gap: '10px',
                  borderRadius: '80px',
                  border: 'none',
                  background: isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(36, 50, 77, 1)',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: '28px',
                  color: isDarkMode ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)'
                }}
              >
                {t('nav.createAccount')}
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
            <div
              className={`rounded-3xl p-6 shadow-2xl flex flex-col gap-4 transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-[rgba(18,22,28,0.98)] border border-white/10'
                  : 'bg-white border border-gray-100 shadow-xl'
              }`}
            >
              <div className="flex flex-col gap-3 text-left">
                <a
                  href="#hero"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 px-3 font-medium text-[16px] rounded-xl transition-colors ${
                    isDarkMode ? 'text-white hover:bg-white/10' : 'text-[#1E1E1E] hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {t('nav.home')}
                </a>
                <a
                  href="#earn"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 px-3 font-medium text-[16px] rounded-xl transition-colors ${
                    isDarkMode ? 'text-white hover:bg-white/10' : 'text-[#1E1E1E] hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {t('nav.earn')}
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 px-3 font-medium text-[16px] rounded-xl transition-colors ${
                    isDarkMode ? 'text-white hover:bg-white/10' : 'text-[#1E1E1E] hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {t('nav.howItWorks')}
                </a>
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 px-3 font-medium text-[16px] rounded-xl transition-colors ${
                    isDarkMode ? 'text-white hover:bg-white/10' : 'text-[#1E1E1E] hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {t('nav.features')}
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 px-3 font-medium text-[16px] rounded-xl transition-colors ${
                    isDarkMode ? 'text-white hover:bg-white/10' : 'text-[#1E1E1E] hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {t('nav.faq')}
                </a>
              </div>

              <div className={`flex items-center justify-center gap-[14px] pt-3 pb-1 border-t w-full ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
                <LanguageToggle />
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModal({ isOpen: true, tab: 'login' });
                  }}
                  className="flex items-center justify-center hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap cursor-pointer"
                  style={{
                    width: '120px',
                    height: '52px',
                    borderRadius: '80px',
                    border: isDarkMode ? 'none' : '1px solid rgba(0, 0, 0, 0.15)',
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 1)',
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    color: isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
                  }}
                >
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModal({ isOpen: true, tab: 'register' });
                  }}
                  className="flex items-center justify-center hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap cursor-pointer"
                  style={{
                    width: '205px',
                    height: '52px',
                    borderRadius: '80px',
                    border: 'none',
                    background: isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(36, 50, 77, 1)',
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    color: isDarkMode ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)',
                  }}
                >
                  {t('nav.createAccount')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header Bottom Line */}
        {!isDarkMode && (
          <div
            className="absolute left-1/2 -translate-x-1/2 z-40 top-[44px] lg:top-[106px]"
            style={{
              width: '100%',
              maxWidth: 1240,
              borderBottom: '1px solid rgba(255, 255, 255, 0.4)'
            }}
          />
        )}

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
              className="z-10 flex flex-col gap-6 lg:gap-8"
              style={!isMobile ? {
                width: 664,
                minHeight: 469,
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
                style={!isMobile ? { width: 608, gap: 24 } : { maxWidth: 424 }}
              >
                <h1
                  className="m-0 transition-colors duration-300"
                  style={!isMobile ? {
                    width: '100%',
                    maxWidth: 608,
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: 55,
                    lineHeight: '60px',
                    letterSpacing: '-0.02em',
                    color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)'
                  } : {
                    width: '100%',
                    maxWidth: 424,
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: 'clamp(42px, 14vw, 64px)',
                    lineHeight: 'clamp(38px, 12.5vw, 56px)',
                    letterSpacing: '-0.02em',
                    textAlign: 'center',
                    color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)'
                  }}
                >
                  {isMobile ? (
                    <>
                      {t('hero.titleMobileLine1')}<br />
                      {t('hero.titleMobileLine2')}<br />
                      {t('hero.titleMobileLine3')}<br />
                      {t('hero.titleMobileLine4')}
                    </>
                  ) : (
                    <>
                      {t('hero.titleLine1')}<br />
                      {t('hero.titleLine2')}
                    </>
                  )}
                </h1>
                <p
                  className="m-0 whitespace-pre-line transition-colors duration-300"
                  style={!isMobile ? {
                    width: '100%',
                    maxWidth: 608,
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: 16,
                    lineHeight: '26px',
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 1)'
                  } : {
                    width: '100%',
                    maxWidth: 400,
                    fontFamily: '"Poppins", sans-serif',
                    fontWeight: 500,
                    fontSize: 'clamp(13px, 3.8vw, 15.5px)',
                    lineHeight: '26px',
                    letterSpacing: '0%',
                    textAlign: 'center',
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 1)'
                  }}
                >
                  {isMobile ? (
                    <>
                      <span className="block">{t('hero.subtitleMobileLine1')}</span>
                      <span className="block">{t('hero.subtitleMobileLine2')}</span>
                      <span className="block">{t('hero.subtitleMobileLine3')}</span>
                    </>
                  ) : (
                    t('hero.subtitle')
                  )}
                </p>

                <div
                  className={isMobile ? "flex items-center justify-center mx-auto gap-3" : "flex items-center gap-3"}
                  style={{ width: 'auto', minHeight: 49 }}
                >
                  <button
                    onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'register' })}
                    className="flex items-center justify-center transition-all hover:bg-[#2A3544] cursor-pointer whitespace-nowrap"
                    style={{
                      minWidth: 150,
                      height: 49,
                      padding: '0 28px',
                      borderRadius: 80,
                      backgroundColor: 'rgba(36, 50, 77, 1)',
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: 16,
                      color: 'rgba(255, 255, 255, 1)'
                    }}
                  >
                    {t('hero.startEarning')}
                  </button>
                  <button
                    onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'login' })}
                    className="flex items-center justify-center transition-all hover:opacity-90 cursor-pointer whitespace-nowrap"
                    style={{
                      minWidth: 99,
                      height: 49,
                      padding: '0 28px',
                      borderRadius: 80,
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(239, 239, 239, 1)',
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 500,
                      fontSize: 16,
                      color: 'rgba(0, 0, 0, 1)'
                    }}
                  >
                    {t('nav.login')}
                  </button>
                </div>
              </div>

              {/* Stats below buttons */}
              <div
                className={isMobile ? "flex items-center justify-between w-full mx-auto" : "flex items-center"}
                style={!isMobile ? { minWidth: 460, gap: 48, marginTop: 8 } : { maxWidth: 360, marginTop: 32, gap: 20 }}
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
                    }}
                  />
                  <div className="flex flex-col justify-center">
                    <span className="uppercase whitespace-nowrap transition-colors duration-300" style={{
                      fontFamily: '"Poppins", sans-serif', fontWeight: 500, fontSize: 12,
                      lineHeight: '16px', letterSpacing: '0.08em', color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(14, 15, 12, 1)',
                      marginBottom: 4
                    }}>
                      {t('hero.totalUsers')}
                    </span>
                    <span className="transition-colors duration-300" style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, fontSize: 30,
                      lineHeight: '32px', letterSpacing: '-0.02em', color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)',
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
                      transform: 'translateY(2px)',
                    }}
                  />
                  <div className="flex flex-col justify-center">
                    <span className="uppercase whitespace-nowrap transition-colors duration-300" style={{
                      fontFamily: '"Poppins", sans-serif', fontWeight: 500, fontSize: 12,
                      lineHeight: '16px', letterSpacing: '0.08em', color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(14, 15, 12, 1)',
                      marginBottom: 4
                    }}>
                      {t('hero.totalPaid')}
                    </span>
                    <span className="transition-colors duration-300" style={{
                      fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, fontSize: 30,
                      lineHeight: '32px', letterSpacing: '-0.02em', color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)',
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
                    src={isDe ? "/coins/Hero section german mobile.png" : "/coins/mobile hero.png"}
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
              className="flex flex-col items-center justify-center mx-auto text-center"
              style={!isMobile ? { maxWidth: 650, gap: 16 } : { width: '100%', maxWidth: 400, gap: 16 }}
            >
              <h2
                className="m-0 text-center transition-colors duration-300"
                style={!isMobile ? {
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: 50,
                  lineHeight: '58px',
                  color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)',
                  letterSpacing: '-0.02em'
                } : {
                  width: '100%',
                  maxWidth: 301,
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(36px, 10vw, 48px)',
                  lineHeight: '52px',
                  letterSpacing: '-0.02em',
                  textAlign: 'center',
                  color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)'
                }}
              >
                {t('howItWorks.title')}
              </h2>
              <p
                className="m-0 text-center transition-colors duration-300"
                style={!isMobile ? {
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 16,
                  lineHeight: '26px',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 1)'
                } : {
                  width: '100%',
                  maxWidth: 400,
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 18,
                  lineHeight: '28px',
                  letterSpacing: '0%',
                  textAlign: 'center',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 1)'
                }}
              >
                {isMobile ? (
                  <>
                    {t('howItWorks.subtitleMobileLine1')}<br />{t('howItWorks.subtitleMobileLine2')}
                  </>
                ) : (
                  t('howItWorks.subtitle')
                )}
              </p>
            </div>

            {/* Steps */}
            <div className="relative flex flex-col lg:flex-row items-start justify-between mx-auto w-full gap-[40px] lg:gap-[20px]">

              {[
                {
                  icon: '/coins/s1.png',
                  step: t('howItWorks.step1Label'),
                  title: t('howItWorks.step1Title'),
                  desc: t('howItWorks.step1Desc')
                },
                {
                  icon: '/coins/s2.png',
                  step: t('howItWorks.step2Label'),
                  title: t('howItWorks.step2Title'),
                  desc: t('howItWorks.step2Desc')
                },
                {
                  icon: '/coins/s3.png',
                  step: t('howItWorks.step3Label'),
                  title: t('howItWorks.step3Title'),
                  desc: t('howItWorks.step3Desc')
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
                        className="uppercase transition-colors duration-300"
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 500,
                          fontSize: 12,
                          lineHeight: '28px',
                          letterSpacing: '0.08em',
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(14, 15, 12, 1)',
                          opacity: 1,
                          textAlign: isMobile ? 'center' : 'left'
                        }}
                      >
                        {item.step}
                      </span>
                      <h3
                        className="m-0 transition-colors duration-300"
                        style={{
                          width: isMobile ? '100%' : 'auto',
                          maxWidth: isMobile ? 360 : 'none',
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          fontWeight: 700,
                          fontSize: isMobile ? 24 : 22,
                          lineHeight: isMobile ? '32px' : '28px',
                          color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)',
                          letterSpacing: '-0.02em',
                          opacity: 1,
                          textAlign: isMobile ? 'center' : 'left'
                        }}
                      >
                        {item.title}
                      </h3>
                    </div>
                    <p
                      className="m-0 transition-colors duration-300"
                      style={{
                        width: isMobile ? '100%' : 'auto',
                        maxWidth: isMobile ? 360 : 'none',
                        fontFamily: '"Poppins", sans-serif',
                        fontWeight: 500,
                        fontSize: 12,
                        lineHeight: '20px',
                        letterSpacing: '0%',
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 1)',
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
          className="mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-between w-full max-w-[1328px] px-4 md:px-8 lg:px-0 lg:h-[558px] py-12 lg:py-0 relative z-10"
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
            className="order-1 lg:order-2 flex flex-col w-full lg:flex-1 justify-start lg:pt-1"
          >
            {/* Heading & Sub */}
            <div
              className="flex flex-col items-start w-full"
              style={!isMobile ? { gap: 12, marginBottom: 60 } : { gap: 12, marginBottom: 24 }}
            >
              <h2
                className="m-0 text-left transition-colors duration-300"
                style={!isMobile ? {
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: 50,
                  lineHeight: '56px',
                  letterSpacing: '-0.02em',
                  color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)'
                } : {
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(36px, 10vw, 48px)',
                  lineHeight: '52px',
                  letterSpacing: '-0.02em',
                  color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)'
                }}
              >
                {t('whyChooseUs.title')}
              </h2>
              <p
                className="m-0 text-left transition-colors duration-300"
                style={!isMobile ? {
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 16,
                  lineHeight: '26px',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 1)'
                } : {
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 16,
                  lineHeight: '24px',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 1)'
                }}
              >
                {t('whyChooseUs.subtitle')}
              </p>
            </div>

            {/* Features Grid */}
            <div
              className="grid grid-cols-1 lg:grid-cols-2 w-full gap-x-6 gap-y-1"
              style={!isMobile ? { maxWidth: 608 } : { gap: 0 }}
            >
              {(isMobile ? [
                { icon: '/coins/multi.png', title: t('whyChooseUs.multipleOfferwalls'), desc: t('whyChooseUs.multipleOfferwallsDesc') },
                { icon: '/coins/fast copy.png', title: t('whyChooseUs.fastPayouts'), desc: t('whyChooseUs.fastPayoutsDesc') },
                { icon: '/coins/daily.png', title: t('whyChooseUs.dailyBonus'), desc: t('whyChooseUs.dailyBonusDesc') },
                { icon: '/coins/vip copy.png', title: t('whyChooseUs.vipProgress'), desc: t('whyChooseUs.vipProgressDesc') },
                { icon: '/coins/referl.png', title: t('whyChooseUs.referralSystem'), desc: t('whyChooseUs.referralSystemDesc') },
                { icon: '/coins/live copy.png', title: t('whyChooseUs.liveActivity'), desc: t('whyChooseUs.liveActivityDesc') },
              ] : [
                { icon: '/coins/multi.png', title: t('whyChooseUs.multipleOfferwalls'), desc: t('whyChooseUs.multipleOfferwallsDesc') },
                { icon: '/coins/vip copy.png', title: t('whyChooseUs.vipProgress'), desc: t('whyChooseUs.vipProgressDesc') },
                { icon: '/coins/fast copy.png', title: t('whyChooseUs.fastPayouts'), desc: t('whyChooseUs.fastPayoutsDesc') },
                { icon: '/coins/referl.png', title: t('whyChooseUs.referralSystem'), desc: t('whyChooseUs.referralSystemDesc') },
                { icon: '/coins/daily.png', title: t('whyChooseUs.dailyBonus'), desc: t('whyChooseUs.dailyBonusDesc') },
                { icon: '/coins/live copy.png', title: t('whyChooseUs.liveActivity'), desc: t('whyChooseUs.liveActivityDesc') },
              ]).map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-row items-center pt-[16px] pb-[16px] lg:pt-[16px] lg:pb-[18px] gap-[16px] group cursor-pointer w-full"
                  style={!isMobile ? { width: 292, borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(226, 226, 225, 1)' } : { width: '100%', borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(226, 226, 225, 1)' }}
                >
                  <div
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{ width: 48, height: 48 }}
                  >
                    <img
                      src={item.icon}
                      alt={item.title}
                      className="w-full h-full object-contain transition-all duration-300"
                      style={isDarkMode ? { filter: 'brightness(0) invert(1)' } : {}}
                    />
                  </div>
                  <div
                    className="flex flex-col items-start text-left w-full"
                    style={{ gap: 2, paddingTop: 2 }}
                  >
                    <div
                      className="m-0 font-medium transition-colors duration-300"
                      style={{
                        fontFamily: '"Bricolage Grotesque", sans-serif',
                        fontWeight: 600,
                        fontSize: 18,
                        lineHeight: '22px',
                        color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)'
                      }}
                    >
                      {item.title}
                    </div>
                    <p
                      className={`m-0 transition-colors duration-300 ${isDarkMode ? 'text-[rgba(255,255,255,0.7)] group-hover:text-white' : 'text-[#0e0f0c] group-hover:text-gray-500'}`}
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
              className="flex flex-row items-center mt-6 lg:mt-8 gap-3"
              style={{ width: 'auto', height: 49 }}
            >
              <button
                onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'register' })}
                className="flex items-center justify-center text-white cursor-pointer hover:bg-[#1E2631] transition-colors whitespace-nowrap"
                style={{
                  minWidth: 150,
                  height: 49,
                  borderRadius: 80,
                  padding: '0 28px',
                  background: 'rgba(36, 50, 77, 1)'
                }}
              >
                <span style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 16,
                  color: 'rgba(255, 255, 255, 1)'
                }}>
                  {t('hero.startEarning')}
                </span>
              </button>
              <button
                onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'login' })}
                className="flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap"
                style={{
                  minWidth: 99,
                  height: 49,
                  borderRadius: 80,
                  padding: '0 28px',
                  background: isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(239, 239, 239, 1)',
                  color: 'rgba(0, 0, 0, 1)'
                }}
              >
                <span style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 16,
                  color: 'rgba(0, 0, 0, 1)'
                }}>
                  {t('nav.login')}
                </span>
              </button>
            </div>
          </div>

          {/* Image (Second on mobile, First on Desktop) */}
          <div
            className="order-2 lg:order-1 flex-shrink-0 w-full lg:w-[640px] h-auto lg:h-[558px] px-0 mt-6 lg:mt-0 flex justify-center lg:justify-start overflow-hidden rounded-[24px] lg:rounded-[32px]"
            style={isMobile ? { width: '100%', maxWidth: '100%' } : {}}
          >
            <img
              src={
                isMobile
                  ? (isDe ? "/coins/Germanwhychosusmobile.png" : "/coins/whychosemobile.png")
                  : (isDarkMode
                      ? (isDe ? "/coins/WhycoseusBlackGerman.png" : "/coins/WhycoseusBlackEnglish.png")
                      : (isDe ? "/coins/Germanwhychosus.png" : "/coins/why chose us.png")
                    )
              }
              alt="Why Choose Us"
              className="w-full h-auto object-cover rounded-[24px] lg:rounded-[32px]"
              style={
                isMobile
                  ? {
                    width: '100%',
                    opacity: 1,
                    clipPath: isDe ? 'inset(0 3px 0 0 round 24px)' : undefined
                  }
                  : {
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    left: '-16px',
                    clipPath: isDe ? 'inset(0 3px 0 0 round 32px)' : undefined
                  }
              }
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
              className="flex flex-col items-center justify-center mx-auto px-4 text-center"
              style={!isMobile ? { maxWidth: 652, gap: 16 } : { width: '100%', maxWidth: 400, gap: 16 }}
            >
              <h2
                className="m-0 text-center transition-colors duration-300"
                style={!isMobile ? {
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: 50,
                  lineHeight: '56px',
                  letterSpacing: '-0.02em',
                  color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)'
                } : {
                  width: '100%',
                  maxWidth: 400,
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(36px, 10vw, 48px)',
                  lineHeight: '52px',
                  letterSpacing: '-0.02em',
                  textAlign: 'center',
                  color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)'
                }}
              >
                {t('startEarningWith.title')}
              </h2>
              <p
                className="m-0 text-center transition-colors duration-300"
                style={!isMobile ? {
                  maxWidth: 534,
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 16,
                  lineHeight: '26px',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 1)'
                } : {
                  width: '100%',
                  maxWidth: 400,
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 'clamp(14px, 3.9vw, 17.5px)',
                  lineHeight: '28px',
                  letterSpacing: '0%',
                  textAlign: 'center',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 1)'
                }}
              >
                {isMobile ? (
                  <>
                    <span className="block">{t('startEarningWith.subtitleMobileLine1')}</span>
                    <span className="block">{t('startEarningWith.subtitleMobileLine2')}</span>
                  </>
                ) : (
                  t('startEarningWith.subtitle')
                )}
              </p>
            </div>

            <div
              className="grid grid-cols-1 lg:grid-cols-3 mx-auto w-full px-0"
              style={!isMobile ? { width: 1328, maxWidth: '100%', height: 368, gap: 22 } : { maxWidth: 440, height: 'auto', gap: 20 }}
            >
              {(isDe
                ? ['/coins/sew1german.png', '/coins/sew2german.png', '/coins/sew3german.png']
                : (isDarkMode
                    ? ['/coins/sewBlackenglish.png', '/coins/sew2Blackenglish.png', '/coins/sew3Blackenglish.png']
                    : ['/coins/sew1.png', '/coins/Mask group.png', '/coins/sew3.png']
                  )
              ).map((imgSrc, idx) => (
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
                className="m-0 text-center lg:text-left w-full max-w-[424px] lg:max-w-[562px] transition-colors duration-300"
                style={{
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)'
                }}
              >
                <span className="block text-[40px] sm:text-[48px] lg:text-[50px] leading-[44px] sm:leading-[48px] lg:leading-[54px]">
                  {t('faqSection.title')}<br />{t('faqSection.titleLine2')}
                </span>
              </h2>
              <p
                className="m-0 text-center lg:text-left w-full max-w-[314px] lg:max-w-[279px] transition-colors duration-300"
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 1)'
                }}
              >
                <span className="block text-[18px] lg:text-[16px] leading-[28px]">
                  {t('faqSection.subtitle')}
                </span>
              </p>
            </div>

            {/* Right Side */}
            <div
              className="flex flex-col items-center lg:items-start w-full max-w-[424px] lg:max-w-[652px] lg:w-[55%] lg:-translate-y-[20px] gap-3"
            >
              {[
                { q: t('faqSection.q1'), a: t('faqSection.a1') },
                { q: t('faqSection.q2'), a: t('faqSection.a2') },
                { q: t('faqSection.q3'), a: t('faqSection.a3') },
                { q: t('faqSection.q4'), a: t('faqSection.a4') },
                { q: t('faqSection.q5'), a: t('faqSection.a5') },
                { q: t('faqSection.q6'), a: t('faqSection.a6') }
              ].map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div
                    key={i}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex flex-col justify-start cursor-pointer transition-all duration-300 overflow-hidden w-full max-w-[424px] lg:max-w-[652px]"
                    style={{
                      borderRadius: 20,
                      padding: '24px 20px',
                      gap: isOpen ? 16 : 0,
                      background: isDarkMode
                        ? (isOpen
                            ? 'rgba(43, 51, 64, 0.4)'
                            : 'linear-gradient(0deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.06)), linear-gradient(0deg, rgba(43, 51, 64, 0.1), rgba(43, 51, 64, 0.1))')
                        : (isOpen ? 'rgba(246, 245, 237, 1)' : 'transparent'),
                      border: 'none',
                    }}
                  >
                    <div
                      className="flex justify-between items-center w-full"
                    >
                      <span
                        className="m-0 font-medium text-[18px] sm:text-[20px] leading-[26px] transition-colors duration-300"
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                          color: isDarkMode ? '#FFFFFF' : '#0E0F0C'
                        }}
                      >
                        {faq.q}
                      </span>
                      <div
                        className="transition-transform duration-300 flex items-center justify-center shrink-0 ml-2"
                        style={{
                          transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                          filter: isDarkMode ? 'brightness(0) invert(1)' : 'none'
                        }}
                      >
                        <img src="/coins/arup.png" alt="Toggle FAQ" style={{ width: 16, height: 10, objectFit: 'contain' }} />
                      </div>
                    </div>
                    {isOpen && (
                      <div
                        className="transition-all duration-300 flex items-start overflow-hidden pt-2"
                      >
                        <p
                          className="m-0 transition-colors duration-300"
                          style={{
                            width: 394,
                            maxWidth: '100%',
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 400,
                            fontSize: 14,
                            lineHeight: '20px',
                            color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 0.7)'
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
            className="flex lg:hidden flex-col items-center justify-between mx-auto w-full relative transition-colors duration-300"
            style={{
              maxWidth: 424,
              minHeight: 517,
              borderRadius: 24,
              paddingTop: 40,
              paddingBottom: 40,
              background: isDarkMode ? 'rgba(34, 39, 48, 0.4)' : 'rgba(239, 239, 239, 1)',
              border: 'none',
              overflow: 'hidden',
              gap: 28
            }}
          >
            {/* 1. Heading */}
            <div className="flex flex-col items-center justify-center w-full px-6 text-center">
              <h2
                className="m-0 text-center transition-colors duration-300"
                style={{
                  maxWidth: 376,
                  width: '100%',
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(38px, 12vw, 56px)',
                  lineHeight: 'clamp(42px, 12vw, 56px)',
                  letterSpacing: '-0.02em',
                  color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)'
                }}
              >
                {t('cta.startEarningToday')}
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
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 1)' : 'rgba(142, 249, 165, 1)',
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
                  {t('cta.startEarning')}
                </span>
              </button>
            </div>

            {/* 3. Marquee Carousel */}
            <div
              className="flex w-full overflow-hidden relative items-center transition-colors duration-300"
              style={{
                width: '100%',
                height: 64,
                paddingTop: 16,
                paddingBottom: 16,
                background: isDarkMode ? 'rgba(43, 51, 64, 0.1)' : 'rgba(222, 223, 247, 1)',
                border: 'none',
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
                            color: isDarkMode ? 'rgba(194, 213, 243, 1)' : 'rgba(99, 101, 168, 1)',
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
                className="m-0 text-center transition-colors duration-300"
                style={{
                  maxWidth: 376,
                  width: '100%',
                  fontFamily: '"Bricolage Grotesque", sans-serif',
                  fontWeight: 700,
                  fontSize: 24,
                  lineHeight: '32px',
                  letterSpacing: '-0.02em',
                  color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)'
                }}
              >
                {t('cta.joinNow')}
              </p>
            </div>
          </div>

          {/* DESKTOP VERSION (>= 1024px) */}
          <div
            className="hidden lg:flex flex-col mx-auto w-full relative transition-colors duration-300"
            style={{
              maxWidth: 1328,
              borderRadius: 24,
              padding: '36px 40px 16px 40px',
              background: isDarkMode ? 'rgba(34, 39, 48, 0.4)' : 'rgba(239, 239, 239, 1)',
              border: 'none',
              overflow: 'hidden',
              gap: 28
            }}
          >
            <div
              className="flex flex-col w-full z-10 gap-3"
            >
              <div
                className="flex items-center justify-between w-full"
              >
                <h2
                  className="m-0 transition-colors duration-300"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: 50,
                    lineHeight: '54px',
                    letterSpacing: '-0.02em',
                    color: isDarkMode ? '#FFFFFF' : 'rgba(14, 15, 12, 1)'
                  }}
                >
                  {t('cta.startEarningToday')}
                </h2>
                <button
                  onClick={() => currentUser ? navigate('/dashboard') : setAuthModal({ isOpen: true, tab: 'register' })}
                  className="flex items-center justify-center transition-all hover:opacity-90 active:translate-y-[2px] h-[48px] rounded-[24px] px-8 cursor-pointer whitespace-nowrap shrink-0"
                  style={{
                    background: isDarkMode ? '#FFFFFF' : '#2D3346',
                    color: isDarkMode ? 'rgba(14, 15, 12, 1)' : 'white',
                    minWidth: 160
                  }}
                >
                  <span
                    className="whitespace-nowrap m-0 p-0 text-[16px] font-medium"
                    style={{
                      fontFamily: '"Poppins", sans-serif',
                      color: isDarkMode ? 'rgba(14, 15, 12, 1)' : 'white'
                    }}
                  >
                    {t('cta.startEarning')}
                  </span>
                </button>
              </div>

              <p
                className="m-0 transition-colors duration-300"
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 16,
                  lineHeight: '26px',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(14, 15, 12, 1)'
                }}
              >
                {t('cta.joinNow')}
              </p>
            </div>

            <div
              className="flex w-full overflow-hidden mx-auto transition-colors duration-300"
              style={{
                width: '100%',
                borderRadius: 20,
                padding: '16px 20px',
                background: isDarkMode ? 'rgba(43, 51, 64, 0.1)' : 'rgba(222, 223, 247, 1)',
                border: 'none',
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
                            fontFamily: '"Bricolage Grotesque", sans-serif',
                            fontWeight: 700,
                            fontSize: 20,
                            lineHeight: '28px',
                            letterSpacing: '-0.02em',
                            color: isDarkMode ? 'rgba(194, 213, 243, 1)' : 'rgba(99, 101, 168, 1)',
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
