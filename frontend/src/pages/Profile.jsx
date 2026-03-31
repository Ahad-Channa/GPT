import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { FiHexagon, FiStar, FiMail, FiCalendar } from 'react-icons/fi';

const Profile = () => {
    const { currentUser, mongoUser } = useAuth();

    return (
        <DashboardLayout>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto mt-8 md:mt-12 w-full"
            >
                <div className="glass-card p-8 md:p-12 relative overflow-hidden flex flex-col items-center text-center">
                    
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-cyan-500 to-violet-600 p-[3px] shadow-2xl shrink-0 mb-6 relative z-10 transition-transform hover:scale-105 duration-300">
                        <img 
                            src={currentUser?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} 
                            alt="Avatar" 
                            className="w-full h-full rounded-[1.8rem] object-cover bg-[#08080c]"
                        />
                    </div>
                    
                    <div className="relative z-10 w-full animate-fade-in-up">
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                            {mongoUser?.displayName || 'User Profile'}
                        </h1>
                        <div className="flex items-center justify-center gap-2 text-slate-400 mb-10 text-sm">
                            <FiMail /> {currentUser?.email}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-left w-full mt-4">
                            
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
                                <div className="absolute -top-4 -right-4 w-16 h-16 bg-cyan-500/20 blur-xl rounded-full" />
                                <div className="text-cyan-400 mb-4 bg-cyan-500/10 w-12 h-12 flex items-center justify-center rounded-xl relative z-10">
                                  <FiHexagon size={24} />
                                </div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Balance</p>
                                <p className="text-2xl font-bold text-white relative z-10">{mongoUser?.walletBalance?.toFixed(2) || '0.00'} PTS</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
                                <div className="absolute -top-4 -right-4 w-16 h-16 bg-violet-500/20 blur-xl rounded-full" />
                                <div className="text-violet-400 mb-4 bg-violet-500/10 w-12 h-12 flex items-center justify-center rounded-xl relative z-10">
                                  <FiStar size={24} />
                                </div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">VIP Rank</p>
                                <p className="text-2xl font-bold text-white relative z-10">Level {mongoUser?.vipLevel || 1}</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:col-span-1 sm:col-span-2 group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
                                <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500/20 blur-xl rounded-full" />
                                <div className="text-emerald-400 mb-4 bg-emerald-500/10 w-12 h-12 flex items-center justify-center rounded-xl relative z-10">
                                  <FiCalendar size={24} />
                                </div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Join Date</p>
                                <p className="text-lg font-bold text-white relative z-10">{mongoUser?.createdAt ? new Date(mongoUser.createdAt).toLocaleDateString() : 'Dec 2026'}</p>
                            </div>

                        </div>
                    </div>
                </div>
            </motion.div>
        </DashboardLayout>
    );
};

export default Profile;
