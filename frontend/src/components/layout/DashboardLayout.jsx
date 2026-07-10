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
    <div className="relative min-h-screen bg-black text-gray-300 overflow-x-hidden flex flex-col">
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
        <main className={`relative z-10 w-full ${fullWidth ? 'max-w-[1600px]' : 'max-w-7xl'} mx-auto px-4 md:px-8 2xl:px-12 py-8 md:py-12 flex flex-col`}>
          {children}
        </main>
      </div>



      {/* FOOTER */}
      <footer
        className="w-full flex justify-center border-t border-[#333] shrink-0 items-start"
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

      {/* Chat Sidebar */}
      <ChatSidebar isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
