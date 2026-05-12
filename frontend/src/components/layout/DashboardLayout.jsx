import { useState } from 'react';
import Header from './Header';
import LiveEarningsBar from '../LiveEarningsBar';
import ChatSidebar from '../chat/ChatSidebar';

const DashboardLayout = ({ children, showLiveBar = true, fullWidth = false }) => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#080b14] text-gray-300 overflow-x-hidden">
      {/* Ambient Background Glows */}
      <div className="ambient-bg" aria-hidden="true" />

      {/* Sticky Header — passes chat toggle down */}
      <Header onChatToggle={() => setChatOpen(o => !o)} chatOpen={chatOpen} />

      {/* Live Earnings Ticker */}
      {showLiveBar && <LiveEarningsBar />}

      {/* Main Content */}
      <main className={`relative z-10 w-full ${fullWidth ? 'max-w-[1600px]' : 'max-w-7xl'} mx-auto px-4 md:px-8 2xl:px-12 py-8 md:py-12 flex flex-col`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-600 text-xs font-mono tracking-widest uppercase">
            &copy; {new Date().getFullYear()} GPT Platform
          </p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-slate-600 text-xs font-mono">All Systems Operational</span>
          </div>
        </div>
      </footer>

      {/* Chat Sidebar */}
      <ChatSidebar isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
