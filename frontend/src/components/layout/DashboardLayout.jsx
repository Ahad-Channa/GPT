import Header from './Header';

const DashboardLayout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-[#08080c] font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 2xl:p-12 relative z-0 flex flex-col">
        {children}
      </main>
      <footer className="w-full border-t border-white/[0.04] py-8 mt-auto text-center text-slate-500 text-sm">
         <p>&copy; {new Date().getFullYear()} GPT. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default DashboardLayout;
