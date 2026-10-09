import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { FaFacebookF, FaInstagram, FaYoutube } from 'react-icons/fa';

const Footer = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isDe = i18n?.language?.startsWith('de');
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const { isDarkMode, toggleDarkMode } = useTheme();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const quickLinks = [
    { nameKey: 'nav.home', defaultName: 'Home', path: '/dashboard' },
    { nameKey: 'nav.earn', defaultName: 'Earn', path: '/dashboard' },
    { nameKey: 'nav.leaderboard', defaultName: 'Leaderboard', path: '/dashboard/leaderboard' },
    { nameKey: 'nav.affiliates', defaultName: 'Affiliates', path: '/dashboard/affiliates' },
    { nameKey: 'nav.withdraw', defaultName: 'Withdraw', path: '/dashboard/wallet' },
    { nameKey: 'nav.dailyBonus', defaultName: 'Daily Bonus', path: '/dashboard/daily-bonus' }
  ];

  const resourceLinks = [
    { nameKey: 'nav.features', defaultName: 'Features', href: '#features' },
    { nameKey: 'nav.faq', defaultName: 'FAQ', href: '#faq' },
    { nameKey: 'footer.blog', defaultName: 'Blog', href: '#' },
    { nameKey: 'footer.termsOfUse', defaultName: 'Terms of Use', href: '#' },
    { nameKey: 'footer.privacyPolicy', defaultName: 'Privacy Policy', href: '#' },
    { nameKey: 'footer.support', defaultName: 'Support', href: '#' }
  ];

  return (
    <footer className="w-full flex justify-center pt-0 pb-28 lg:pb-12 px-2 sm:px-4 md:px-8 lg:px-0 bg-transparent shrink-0">
      <div
        className="flex flex-col lg:flex-row justify-between w-full max-w-[440px] lg:max-w-[1328px] mx-auto items-center lg:items-start"
        style={{
          width: '100%',
          maxWidth: 1328,
          height: isMobile ? 'auto' : 362,
          justifyContent: 'space-between',
          opacity: 1,
          gap: 40
        }}
      >
        {/* Left Panel */}
        <div
          className="relative flex flex-col items-center shrink-0 overflow-hidden w-full max-w-[427px] mx-auto lg:mx-0 transition-colors duration-300"
          style={{
            width: 427,
            maxWidth: '100%',
            height: isMobile ? 420 : 362,
            justifyContent: 'space-between',
            opacity: 1,
            borderRadius: 24,
            paddingTop: 50,
            paddingRight: 32,
            paddingBottom: 24,
            paddingLeft: 32,
            background: isDarkMode ? 'rgba(34, 39, 48, 0.4)' : 'rgba(249, 247, 241, 1)',
            border: 'none'
          }}
        >
          {/* Background Image */}
          <img
            src={isMobile ? "/coins/image copy 18.png" : "/coins/image copy 16.png"}
            alt="Background graphics"
            className="absolute bottom-0 left-0 w-full h-auto z-0 pointer-events-none object-contain object-bottom-left"
            style={{
              maxHeight: '100%',
              maxWidth: '100%',
              objectPosition: 'bottom left',
              opacity: isDarkMode ? 0.35 : 1
            }}
          />

          {/* Logo area */}
          <div
            className="flex flex-col items-center z-10 w-full"
            style={{
              gap: 20
            }}
          >
            <svg
              width="229"
              height="41"
              viewBox="0 0 161 29"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="object-contain"
            >
              <path fillRule="evenodd" clipRule="evenodd" d="M5.26177 0H23.2747C26.1674 0 28.5344 2.36695 28.5344 5.25967V23.2726C28.5344 26.1653 26.1674 28.5344 23.2747 28.5344H5.26177C2.36695 28.5344 0 26.1653 0 23.2726V5.25967C0 2.36695 2.36695 0 5.26177 0ZM13.9124 14.8943C13.2431 14.6071 12.768 13.8935 11.9298 13.6992C10.6904 13.412 10.3631 14.6451 11.0197 15.3335C11.461 15.7917 12.2908 16.2499 12.7892 16.7313C13.1375 17.067 14.2059 18.1079 14.5945 18.3212C14.8922 17.2739 16.0197 15.4792 16.6215 14.6388C18.7372 11.6891 21.4462 10.0759 24.4909 7.99191C24.89 7.71741 26.009 7.11565 26.1843 6.71658C25.4073 6.37663 23.2684 7.18533 21.4398 8.07003C21.0999 7.23178 20.2743 6.63634 19.3199 6.63634H8.6359C7.37746 6.63634 6.34707 7.66674 6.34707 8.92517V19.6092C6.34707 20.8676 7.37746 21.8959 8.6359 21.8959H19.3199C20.363 21.8959 21.2498 21.1865 21.5222 20.2257L16.4483 20.2067H8.6359C8.3044 20.2067 8.03624 19.9386 8.03624 19.6092V8.92517C8.03624 8.59367 8.3044 8.32552 8.6359 8.32552H19.3199C19.6282 8.32552 19.8837 8.55989 19.9153 8.86183C19.4719 9.10887 19.1024 9.33269 18.8512 9.50794C17.2401 10.6186 16.0978 11.7609 14.9766 13.3001C14.605 13.8111 14.3115 14.4044 13.9124 14.8943Z" fill="#00A247"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M155.229 4.91809V9.59077H160.499V10.8767H155.229V20.317C155.229 22.4179 155.668 23.8939 158.084 23.8939C158.836 23.8939 159.684 23.6426 160.468 23.2668L161 24.521C160.029 24.9897 159.057 25.3043 158.084 25.3043C154.79 25.3043 153.724 23.3597 153.724 20.317V10.8767H150.432V9.59077H153.724V5.07434L155.229 4.91809ZM135.816 9.59289V12.3526C137.007 10.22 139.171 9.34162 141.336 9.30995C145.476 9.30995 148.331 11.85 148.331 16.1469V25.0847H146.794V16.1786C146.794 12.6651 144.63 10.7838 141.272 10.8154C138.074 10.8471 135.848 13.2605 135.848 16.4615V25.0847H134.311V9.59289H135.816ZM130.422 4.54225C130.422 6.17231 127.945 6.17231 127.945 4.54225C127.945 2.9122 130.422 2.9122 130.422 4.54225ZM129.921 9.52954V25.0847H128.384V9.52954H129.921ZM122.518 25.0847V15.8027C122.518 12.8234 120.51 10.7204 117.563 10.7204C114.615 10.7204 112.575 12.9163 112.575 15.8956V25.0847H111.038V15.8956C111.038 12.9163 109.001 10.7521 106.053 10.7521C103.103 10.7521 101.098 12.9163 101.098 15.8956V25.0847H99.5604V9.59289H101.003L101.034 12.1647C102.1 10.125 104.077 9.27828 106.085 9.27828C108.437 9.27828 110.914 10.3446 111.824 13.1043C112.763 10.5642 115.179 9.27828 117.563 9.27828C121.357 9.27828 124.055 11.9451 124.055 15.8027V25.0847H122.518ZM86.6699 3.16135V15.8344L91.8768 9.62245H96.4544V9.84204L90.1517 16.8986L97.3328 24.8039V25.0847H92.7234L86.6699 18.0915V25.0847H82.8439V3.16135H86.6699ZM77.637 13.7314C76.5391 12.6967 75.2848 12.3526 73.811 12.3526C71.991 12.3526 70.988 12.9163 70.988 13.8897C70.988 14.8927 71.8981 15.4564 73.8744 15.5831C76.7903 15.771 80.4917 16.4298 80.4917 20.5366C80.4917 23.2668 78.2641 25.6189 73.8427 25.6189C71.3955 25.6189 68.9505 25.2114 66.6912 22.8592L68.5725 20.1291C69.6705 21.3538 72.1789 22.2617 73.9039 22.2934C75.3482 22.325 76.6974 21.5734 76.6974 20.4437C76.6974 19.3774 75.819 18.9382 73.6231 18.8116C70.7051 18.5941 67.2233 17.5257 67.2233 14.0143C67.2233 10.4396 70.9247 9.18537 73.7477 9.18537C76.1632 9.18537 77.9812 9.65412 79.7696 11.2229L77.637 13.7314ZM60.6376 9.62245H64.3073V25.0847H60.7009L60.513 22.8276C59.6347 24.6455 57.2191 25.5239 55.4941 25.5556C50.9164 25.5873 47.5275 22.7642 47.5275 17.3377C47.5275 12.0063 51.0727 9.21493 55.5891 9.2466C57.6583 9.2466 59.6347 10.2179 60.513 11.755L60.6376 9.62245ZM51.3535 17.3377C51.3535 20.2875 53.3932 22.0442 55.9333 22.0442C61.9552 22.0442 61.9552 12.6651 55.9333 12.6651C53.3932 12.6651 51.3535 14.3901 51.3535 17.3377ZM41.2543 5.26438V9.65412H45.5195V12.948H41.2227V19.6287C41.2227 21.1025 42.0398 21.8246 43.2307 21.8246C43.8261 21.8246 44.5166 21.6346 45.0803 21.3538L46.1466 24.6139C45.0508 25.0552 44.1407 25.2431 42.9794 25.2726C39.6243 25.3993 37.4284 23.4863 37.4284 19.6287V12.948H34.542V9.65412H37.4284V5.67189L41.2543 5.26438Z" fill={isDarkMode ? "#FFFFFF" : "#383F47"}/>
            </svg>
            <p
              className={`m-0 text-[17px] sm:text-[18px] font-bold text-center transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif', lineHeight: '1.2' }}
            >
              {i18n.language?.startsWith('de') ? (
                <>
                  <span>{t('footer.tagline1', 'Aufgaben erledigen.')}</span>
                  <br className="block sm:hidden" />
                  <span className="hidden sm:inline"> </span>
                  <span>{t('footer.tagline2', 'Prämien verdienen.')}</span>
                </>
              ) : (
                t('footer.tagline', 'Complete tasks. Earn rewards.')
              )}
            </p>

            <div
              className="flex items-center justify-between transition-colors duration-300"
              style={{
                width: 'auto',
                minWidth: 'min(260px, 100%)',
                maxWidth: '100%',
                height: 44,
                gap: 16,
                borderRadius: 50,
                paddingTop: 8,
                paddingRight: 11,
                paddingBottom: 8,
                paddingLeft: 16,
                background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 1)',
                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.12)' : 'none'
              }}
            >
              <span
                className={`flex items-center m-0 whitespace-nowrap transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  fontWeight: 500,
                  fontSize: 14,
                  lineHeight: '1',
                  letterSpacing: 0
                }}
              >
                {t('footer.changeToDarkMode', 'Change to dark mode')}
              </span>
              <div
                className={`rounded-full flex items-center shrink-0 cursor-pointer transition-colors duration-300 ${isDarkMode ? 'justify-end' : 'justify-start'}`}
                onClick={toggleDarkMode}
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
            className="flex justify-end items-center z-10 relative w-full"
            style={{
              height: isMobile ? 28 : 36,
              gap: isMobile ? 6 : 5,
              transform: isMobile ? 'translate(18px, -2px)' : 'none',
            }}
          >
            {[
              { icon: <FaFacebookF size={isMobile ? 13 : 16} />, src: '/coins/fbo.png', alt: 'Facebook' },
              { icon: <FaInstagram size={isMobile ? 14 : 18} />, src: '/coins/iso.png', alt: 'Instagram' },
              { icon: <FaYoutube size={isMobile ? 14 : 18} />, src: '/coins/yoo.png', alt: 'YouTube' }
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-all"
                style={{
                  width: isMobile ? 28 : 36,
                  height: isMobile ? 28 : 36,
                  borderRadius: 75.42,
                  background: isDarkMode ? 'rgba(43, 45, 50, 1)' : 'transparent',
                  color: '#FFFFFF',
                  opacity: 1
                }}
              >
                {isDarkMode ? (
                  item.icon
                ) : (
                  <img
                    src={item.src}
                    alt={item.alt}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Area */}
        <div className="flex flex-col justify-between flex-1 min-w-0 pt-2 lg:pt-0 w-full max-w-[440px] lg:max-w-[861px] mx-auto lg:mx-0"
          style={{
            height: isMobile ? 'auto' : 362,
            justifyContent: 'space-between',
          }}
        >

          {/* Top Section */}
          <div
            className="flex flex-col lg:flex-row justify-between items-center lg:items-start w-full gap-8 lg:gap-0"
            style={{
              width: '100%',
              maxWidth: 861,
              height: isMobile ? 'auto' : 273,
              opacity: 1,
            }}
          >
            <div
              className="flex justify-start w-full lg:w-auto"
              style={{
                width: isMobile ? '100%' : 'auto',
                maxWidth: '100%',
                height: 273,
                paddingRight: 0,
                paddingLeft: isMobile ? 24 : 0,
                gap: isMobile ? 40 : 56,
                opacity: 1,
                transform: 'translateY(-3px)',
              }}
            >
              <div className="flex flex-col min-w-[135px]" style={{ height: 273, justifyContent: 'space-between' }}>
                <h4
                  className="m-0 text-left whitespace-nowrap transition-colors duration-300"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: 20,
                    lineHeight: '32px',
                    letterSpacing: '-0.02em',
                    textAlign: 'left',
                    color: isDarkMode ? '#FFFFFF' : '#0E0F0C',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t('footer.quickLinks', 'Quick Links')}
                </h4>
                <ul className="flex flex-col list-none p-0 m-0 justify-between" style={{ height: 220, opacity: 1 }}>
                  {quickLinks.map((link) => (
                    <li key={link.nameKey} className="flex items-center">
                      <button
                        onClick={() => {
                          if (link.path.startsWith('/')) {
                            navigate(link.path);
                          }
                        }}
                        className="no-underline hover:opacity-100 transition-opacity text-left cursor-pointer bg-transparent border-none p-0"
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 400,
                          fontSize: 14,
                          lineHeight: '20px',
                          letterSpacing: '0%',
                          opacity: isDarkMode ? 0.8 : 0.7,
                          color: isDarkMode ? '#FFFFFF' : '#0E0F0C',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {t(link.nameKey, link.defaultName)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col min-w-[135px]" style={{ height: 273, justifyContent: 'space-between' }}>
                <h4
                  className="m-0 text-left whitespace-nowrap transition-colors duration-300"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: 20,
                    lineHeight: '32px',
                    letterSpacing: '-0.02em',
                    textAlign: 'left',
                    color: isDarkMode ? '#FFFFFF' : '#0E0F0C',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t('footer.resources', 'Resources')}
                </h4>
                <ul className="flex flex-col list-none p-0 m-0 justify-between" style={{ height: 220, opacity: 1 }}>
                  {resourceLinks.map((link) => (
                    <li key={link.nameKey} className="flex items-center">
                      <a
                        href={link.href}
                        className="no-underline hover:opacity-100 transition-opacity text-left"
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 400,
                          fontSize: 14,
                          lineHeight: '20px',
                          letterSpacing: '0%',
                          opacity: isDarkMode ? 0.8 : 0.7,
                          color: isDarkMode ? '#FFFFFF' : '#0E0F0C',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {t(link.nameKey, link.defaultName)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Banner */}
            <div
              className="w-full lg:w-auto flex justify-center lg:justify-end items-center relative h-fit shrink-0"
              style={{
                width: isMobile ? 424 : 440,
                maxWidth: '100%',
                height: isMobile ? 'auto' : 273,
              }}
            >
              <img
                src={
                  isMobile
                    ? (isDe ? "/coins/image copy 19 german.png" : "/coins/image copy 19.png")
                    : (isDarkMode
                        ? (isDe ? "/coins/footerimageblackgerman.png" : "/coins/footerimageblackenglish.png")
                        : (isDe ? "/coins/image copy 17 german.png" : "/coins/image copy 17.png")
                      )
                }
                alt="Top Earner Graphic"
                className="pointer-events-none w-full h-full object-contain lg:object-right"
                style={{
                  width: isMobile ? 424 : '100%',
                  height: isMobile ? 'auto' : '100%',
                  objectFit: 'contain',
                  objectPosition: isMobile ? 'center' : 'right'
                }}
              />
            </div>
          </div>

          {/* Bottom Copyright Bar */}
          <div className="flex items-center justify-center lg:justify-start w-full mt-6 lg:mt-auto pt-2 lg:pt-4">
            <p
              className="m-0 text-center lg:text-left transition-colors duration-300"
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '20px',
                color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : '#000000',
                opacity: 1,
                textAlign: isMobile ? 'center' : 'left',
              }}
            >
              {t('footer.copyright', { year: new Date().getFullYear(), defaultValue: '© 2026 TaskMint. All rights reserved.' })}
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
