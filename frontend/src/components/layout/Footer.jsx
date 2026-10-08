import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isDe = i18n?.language?.startsWith('de');
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [isDarkMode, setIsDarkMode] = useState(false);

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
          className="relative flex flex-col items-center shrink-0 overflow-hidden w-full max-w-[427px] mx-auto lg:mx-0"
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
            background: 'rgba(249, 247, 241, 1)'
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
              objectPosition: 'bottom left'
            }}
          />

          {/* Logo area */}
          <div
            className="flex flex-col items-center z-10 w-full"
            style={{
              gap: 20
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
            <p
              className="m-0 text-[17px] sm:text-[18px] font-bold text-gray-900 text-center"
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
              className="flex items-center justify-between"
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
                background: 'rgba(255, 255, 255, 1)'
              }}
            >
              <span
                className="flex items-center text-gray-800 m-0 whitespace-nowrap"
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
            className="flex justify-end items-center z-10 relative w-full"
            style={{
              height: isMobile ? 28 : 36,
              gap: isMobile ? 6 : 5,
              transform: isMobile ? 'translate(18px, -2px)' : 'none',
            }}
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
                  width: isMobile ? 28 : 36,
                  height: isMobile ? 28 : 36,
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
                  className="m-0 text-left whitespace-nowrap"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: 20,
                    lineHeight: '32px',
                    letterSpacing: '-0.02em',
                    textAlign: 'left',
                    color: '#0E0F0C',
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
                          opacity: 0.7,
                          color: '#0E0F0C',
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
                  className="m-0 text-left whitespace-nowrap"
                  style={{
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: 20,
                    lineHeight: '32px',
                    letterSpacing: '-0.02em',
                    textAlign: 'left',
                    color: '#0E0F0C',
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
                          opacity: 0.7,
                          color: '#0E0F0C',
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
                  isDe
                    ? (isMobile ? "/coins/image copy 19 german.png" : "/coins/image copy 17 german.png")
                    : (isMobile ? "/coins/image copy 19.png" : "/coins/image copy 17.png")
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
              className="m-0 text-center lg:text-left text-black"
              style={{
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '20px',
                color: '#000000',
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
