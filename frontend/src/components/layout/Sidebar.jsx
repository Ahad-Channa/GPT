import { Link, useLocation } from 'react-router-dom';
import { 
  FiDollarSign, 
  FiTarget, 
  FiRepeat, 
  FiGift, 
  FiAward, 
  FiTag, 
  FiUsers, 
  FiHelpCircle 
} from 'react-icons/fi';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { name: 'Earn', icon: <FiDollarSign />, path: '/dashboard' },
    { name: 'Offers', icon: <FiTarget />, path: '/dashboard/offers' },
    { name: 'Withdraw', icon: <FiRepeat />, path: '/dashboard/withdraw' },
    { name: 'Rewards', icon: <FiGift />, path: '/dashboard/rewards' },
    { name: 'Leaders', icon: <FiAward />, path: '/dashboard/leaders', badge: 'LIVE' },
    { name: 'Coupons', icon: <FiTag />, path: '/dashboard/coupons' },
    { name: 'Affiliates', icon: <FiUsers />, path: '/dashboard/affiliates' },
    { name: 'Support', icon: <FiHelpCircle />, path: '/dashboard/faq' },
  ];

  return (
    <aside className="w-72 bg-[#08080c] border-r border-white/5 hidden md:flex flex-col h-full relative z-30">
      
      {/* Brand */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <span className="font-bold text-white text-sm">N</span>
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          GPT<span className="text-slate-500 font-medium tracking-normal">Platform</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-[18px] transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {item.icon}
                </span>
                <span className="font-medium text-sm tracking-wide">{item.name}</span>
              </div>
              
              {item.badge && (
                <span className="text-[9px] uppercase font-bold tracking-widest bg-violet-500/20 text-violet-300 px-2.5 py-1 rounded-full border border-violet-500/20">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
};

export default Sidebar;
