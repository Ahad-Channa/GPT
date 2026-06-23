import { useState, useEffect } from 'react';
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
    <div className="relative min-h-screen bg-black text-gray-300 overflow-x-hidden">
      {/* Ambient Background Glows */}
      {/* <div className="ambient-bg" aria-hidden="true" /> */}

      {/* Sticky Header — passes chat toggle down */}
      <Header onChatToggle={() => setChatOpen(o => !o)} chatOpen={chatOpen} />

      {/* Live Earnings Ticker */}
      {showLiveBar && <LiveEarningsBar />}

      {/* Main Content Wrapper */}
      <div 
        className="transition-all duration-300 ease-in-out w-full"
      >
        <main className={`relative z-10 w-full ${fullWidth ? 'max-w-[1600px]' : 'max-w-7xl'} mx-auto px-4 md:px-8 2xl:px-12 py-8 md:py-12 flex flex-col`}>
          {children}
        </main>
      </div>



      {/* Footer */}
      <footer className="w-full flex justify-center border-t border-[#333] bg-[rgba(44,45,44,1)] relative z-10">
        <div className="flex flex-col items-center text-center w-full max-w-[1440px] pt-[100px] px-8 md:px-[100px] pb-[30px] gap-[30px]">
          {/* Top Logo */}
          <div className="flex items-center justify-center gap-[10px]">
            <img src="/coins/logo copy.png" alt="Logo" className="w-[74px] h-[74px] object-contain" />
            <span className="flex items-center font-bold text-[56px] leading-[100%] text-white font-['Barlow_Condensed'] whitespace-nowrap">
              TaskMint
            </span>
          </div>

          {/* Middle Content */}
          <div className="flex flex-col items-center text-center max-w-full gap-[30px]">
            <p className="m-0 p-0 flex items-center justify-center text-[24px] leading-[28px] text-gray-300 font-['Barlow_Condensed'] text-center">
              Complete offers, surveys, and tasks to earn real rewards. Join thousands of users already earning every day.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-[30px] gap-y-4">
              {[
                { name: 'Features', href: '#' },
                { name: 'FAQ', href: '#' },
                { name: 'Blog', href: '#' },
                { name: 'Terms of Use', href: '#' },
                { name: 'Privacy Policy', href: '#' },
                { name: 'Support', href: '#' }
              ].map((link, idx, arr) => (
                <div key={link.name} className="flex items-center">
                  <a href={link.href} className="hover:opacity-80 transition-opacity flex items-center justify-center font-bold text-[26px] leading-[32px] text-[#49B265] font-['Barlow_Condensed'] whitespace-nowrap">
                    {link.name}
                  </a>
                  {idx < arr.length - 1 && (
                    <span className="flex items-center justify-center text-white text-[26px] leading-[32px] ml-[30px] hidden sm:block">&bull;</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Divider & Copyright */}
          <div className="w-full flex flex-col items-center gap-4 mt-8">
            <div className="w-full h-px bg-[#444]" />
            <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-[1240px] gap-4 sm:gap-0 mt-4">
              <p className="m-0 p-0 flex items-center font-medium text-[20px] leading-[20px] text-white font-['Barlow_Condensed']">
                © 2026 TaskMint. All rights reserved.
              </p>
              <div className="flex items-center gap-[20px] text-[#49B265]">
                <FaFacebook className="w-[34px] h-[34px] hover:opacity-80 cursor-pointer transition-opacity" />
                <FaInstagram className="w-[34px] h-[34px] hover:opacity-80 cursor-pointer transition-opacity" />
                <FaYoutube className="w-[34px] h-[34px] hover:opacity-80 cursor-pointer transition-opacity" />
                <FaDiscord className="w-[34px] h-[34px] hover:opacity-80 cursor-pointer transition-opacity" />
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
