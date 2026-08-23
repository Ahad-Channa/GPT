import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();
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
    { name: 'Home', path: '/dashboard' },
    { name: 'Earn', path: '/dashboard' },
    { name: 'Leaderboard', path: '/dashboard/leaderboard' },
    { name: 'Affiliates', path: '/dashboard/affiliates' },
    { name: 'Withdraw', path: '/dashboard/wallet' },
    { name: 'Daily Bonus', path: '/dashboard/daily-bonus' }
  ];

  const resourceLinks = [
    { name: 'Features', href: '#features' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Blog', href: '#' },
    { name: 'Terms of Use', href: '#' },
    { name: 'Privacy Policy', href: '#' },
    { name: 'Support', href: '#' }
  ];

  return (
    <footer className="w-full flex justify-center pt-0 pb-12 px-4 md:px-8 lg:px-0 bg-transparent shrink-0">
      <div
        className="flex flex-col lg:flex-row justify-between w-full max-w-[440px] lg:max-w-[1328px] mx-auto items-center lg:items-start"
        style={{
          minHeight: isMobile ? 571 : 715,
          gap: 40
        }}
      >
        {/* Left Panel */}
        <div
          className="relative flex flex-col items-center shrink-0 overflow-hidden w-full max-w-[427px] h-[571px] lg:h-[715px] mx-auto lg:mx-0"
          style={{
            width: 427,
            maxWidth: '100%',
            height: isMobile ? 571 : 715,
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
            className="absolute bottom-0 left-[-13px] w-full h-auto z-0 pointer-events-none"
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
        <div className="flex flex-col flex-1 min-w-0 h-full pt-4 w-full max-w-[440px] lg:max-w-[861px] mx-auto lg:mx-0">

          {/* Top Section */}
          <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start w-full gap-8 lg:gap-0">
            <div
              className="flex justify-start w-full"
              style={{
                width: isMobile ? 424 : 289,
                maxWidth: '100%',
                height: 273,
                paddingRight: 0,
                paddingLeft: isMobile ? 24 : 0,
                gap: isMobile ? 104 : 80,
                transform: isMobile ? 'none' : 'translateY(-23.5px)'
              }}
            >
              <div className="flex flex-col" style={{ width: 108, height: 273, gap: 40 }}>
                <h4
                  className="m-0 text-left"
                  style={{
                    width: 108,
                    height: 13,
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: 20,
                    lineHeight: '32px',
                    letterSpacing: '-0.02em',
                    textAlign: 'left',
                    color: '#0E0F0C'
                  }}
                >
                  Quick Links
                </h4>
                <ul className="flex flex-col list-none p-0 m-0" style={{ width: 91, height: 220, gap: 32 }}>
                  {quickLinks.map((link) => (
                    <li key={link.name} className="flex items-center" style={{ height: 10 }}>
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
                          opacity: 0.56,
                          color: '#0E0F0C',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {link.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col" style={{ width: 108, height: 273, gap: 40 }}>
                <h4
                  className="m-0 text-left"
                  style={{
                    width: 108,
                    height: 13,
                    fontFamily: '"Bricolage Grotesque", sans-serif',
                    fontWeight: 700,
                    fontSize: 20,
                    lineHeight: '32px',
                    letterSpacing: '-0.02em',
                    textAlign: 'left',
                    color: '#0E0F0C'
                  }}
                >
                  Resources
                </h4>
                <ul className="flex flex-col list-none p-0 m-0" style={{ width: 91, height: 220, gap: 32 }}>
                  {resourceLinks.map((link) => (
                    <li key={link.name} className="flex items-center" style={{ height: 10 }}>
                      <a
                        href={link.href}
                        className="no-underline hover:opacity-100 transition-opacity text-left"
                        style={{
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: 400,
                          fontSize: 14,
                          lineHeight: '20px',
                          letterSpacing: '0%',
                          opacity: 0.56,
                          color: '#0E0F0C',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Banner */}
            <div
              className="w-full flex justify-center items-center relative h-fit"
              style={{
                width: isMobile ? 424 : 420,
                maxWidth: '100%',
                height: isMobile ? 199.28 : 'auto'
              }}
            >
              <img
                src="/coins/wybt.png"
                alt="Top Earner Graphic"
                className="pointer-events-none w-full h-full object-contain"
                style={{
                  width: isMobile ? 424 : '100%',
                  height: isMobile ? 199.28 : 'auto',
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
              className="bg-[#2a3044] hover:bg-[#1a1e2e] transition-colors text-white font-medium text-[15px] px-8 py-4 rounded-[24px] cursor-pointer"
              style={{ fontFamily: '"Poppins", sans-serif' }}
            >
              Leave a review
            </button>
          </div>

          {/* Bottom Section (Testimonials) */}
          <div
            className="flex items-center w-full overflow-x-auto hide-scrollbar lg:overflow-visible pb-2"
            style={{ gap: isMobile ? 16 : 14 }}
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
                className="shrink-0 lg:shrink lg:flex-1 min-w-0"
                style={isMobile ? {
                  width: 295,
                  height: 215,
                  borderRadius: 20,
                  objectFit: 'contain'
                } : {
                  width: 'calc((100% - 28px) / 3)',
                  maxWidth: 278,
                  height: 'auto',
                  borderRadius: 20,
                  objectFit: 'contain'
                }}
              />
            ))}
          </div>

          {/* Copyright */}
          <div className="mt-6 flex w-full justify-center lg:justify-start">
            <p
              className="m-0 text-center lg:text-left"
              style={{
                width: 853,
                maxWidth: '100%',
                fontFamily: '"Poppins", sans-serif',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '20px',
                color: 'rgba(0, 0, 0, 1)',
                transform: isMobile ? 'none' : 'translateY(-1px)'
              }}
            >
              © 2026 TaskMint. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
