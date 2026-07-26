import React, { useState, useEffect } from 'react';
import Header from './Header';
import LiveEarningsBar from '../LiveEarningsBar';
import ChatSidebar from '../chat/ChatSidebar';
import { FaFacebook, FaInstagram, FaYoutube, FaDiscord } from 'react-icons/fa';

const DashboardLayout = ({ children, showLiveBar = true, fullWidth = false }) => {
  const [chatOpen, setChatOpen] = useState(() => {
    return localStorage.getItem('chatOpen') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('chatOpen', chatOpen);
    window.dispatchEvent(new Event('chatToggle'));
  }, [chatOpen]);

  return (
    <div className="relative min-h-[100dvh] bg-black text-gray-300 overflow-x-hidden flex flex-col">
      {/* Ambient Background Glows */}
      {/* <div className="ambient-bg" aria-hidden="true" /> */}

      {/* Sticky Header — passes chat toggle down */}
      <Header onChatToggle={() => setChatOpen(o => !o)} chatOpen={chatOpen} />

      {/* Live Earnings Ticker */}
      {showLiveBar && <LiveEarningsBar />}

      {/* Main Content Wrapper */}
      <div 
        className="transition-all duration-300 ease-in-out w-full flex-1"
      >
        <main className={`relative z-10 w-full ${fullWidth ? 'max-w-[1600px]' : 'max-w-7xl'} mx-auto px-1 md:px-8 2xl:px-12 pt-4 pb-8 md:py-12 flex flex-col`}>
          {children}
        </main>
      </div>



      {/* FOOTER */}
      <footer
        className="w-full flex justify-center border-t border-[#333] shrink-0 items-start relative z-10"
        style={{ background: 'rgba(44, 45, 44, 1)', boxShadow: '0 500px 0 0 rgba(44, 45, 44, 1)' }}
      >
        <div
          className="flex flex-col items-center text-center w-full mx-auto px-4 lg:px-[100px] py-4 lg:pt-[40px] lg:pb-[22px] gap-4 lg:gap-[30px]"
          style={{
            maxWidth: 1440,
            opacity: 1,
            transform: 'rotate(0deg)',
            justifyContent: 'space-between'
          }}
        >
          {/* Top Logo */}
          <div
            className="relative flex items-center justify-center w-full h-[28px] lg:h-[52px] lg:gap-[10px]"
          >
            <img
              src="/coins/logo copy.png"
              alt="Logo"
              className="absolute right-[calc(50%+42px)] lg:static w-[28px] h-[28px] lg:w-[52px] lg:h-[52px] object-contain"
            />
            <span
              className="whitespace-nowrap flex items-center text-[22px] lg:text-[46px]"
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
            className="flex flex-col items-center text-center w-full max-w-[1104px] gap-2 lg:gap-[30px]"
          >
            <p
              className="m-0 p-0 flex items-center justify-center whitespace-normal lg:whitespace-nowrap px-4 lg:px-0 text-[11px] leading-[14px] lg:text-[20px] lg:leading-[28px]"
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
              className="flex justify-center items-center m-0 p-0 flex-wrap lg:flex-nowrap gap-x-2 gap-y-1 lg:gap-[20px] w-full px-4 lg:px-0"
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
                    className="hover:opacity-80 transition-opacity whitespace-nowrap flex items-center justify-center text-[10px] lg:text-[16px]"
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
          <div className="w-full flex flex-col items-center gap-2 mt-2 lg:mt-0 px-4 lg:px-0">
            <div
              className="w-full border-t border-white/30"
              style={{ maxWidth: 1240 }}
            />
            <div
              className="flex flex-col-reverse lg:flex-row items-center justify-between w-full gap-2 lg:gap-0 pb-2 lg:pb-0"
              style={{ maxWidth: 1240 }}
            >
              <p
                className="m-0 p-0 flex items-center text-center lg:text-left text-[10px] lg:text-[16px]"
                style={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 1)'
                }}
              >
                © 2026 TaskMint. All rights reserved.
              </p>
              <div
                className="flex items-center justify-center lg:justify-between gap-3 lg:gap-[20px]"
                style={{
                  color: 'rgba(73, 178, 101, 1)'
                }}
              >
                <FaFacebook className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0 w-[14px] h-[14px] lg:w-[26px] lg:h-[26px]" />
                <FaInstagram className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0 w-[14px] h-[14px] lg:w-[26px] lg:h-[26px]" />
                <FaYoutube className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0 w-[14px] h-[14px] lg:w-[26px] lg:h-[26px]" />
                <FaDiscord className="hover:opacity-80 cursor-pointer transition-opacity flex-shrink-0 w-[14px] h-[14px] lg:w-[26px] lg:h-[26px]" />
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Chat Sidebar */}
      <ChatSidebar isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
