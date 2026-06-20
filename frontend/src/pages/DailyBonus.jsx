import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useDailyBonus } from '../contexts/DailyBonusContext';
import { FiGift, FiUnlock, FiLock, FiClock, FiCheckCircle } from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function useCountdown(target) {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    if (!target) { setDisplay(''); return; }
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setDisplay('00 : 00 : 00'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(`${String(h).padStart(2,'0')} : ${String(m).padStart(2,'0')} : ${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return display;
}

export default function DailyBonus() {
  const { currentUser } = useAuth();
  const { status, loading, fetchStatus } = useDailyBonus();
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null);

  const resetTimer = useCountdown(status?.nextClaimAt || status?.cycleResetAt || null);

  useEffect(() => {
    if (resetTimer === '00 : 00 : 00') fetchStatus();
  }, [resetTimer, fetchStatus]);

  const claimBonus = async () => {
    setClaiming(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`${API}/wallet/daily-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setClaimResult({ coins: data.rewardAmount });
        fetchStatus();
      } else {
        alert(data.error || 'Failed to claim bonus');
      }
    } catch (err) { console.error(err); }
    finally { setClaiming(false); }
  };

  if (loading || !status) return (
    <DashboardLayout hideStartEarning={true}>
      <div className="flex items-center justify-center h-80">
        <div className="w-12 h-12 rounded-full border-2 border-[#49B265] border-t-transparent animate-spin" />
      </div>
    </DashboardLayout>
  );

  const progressPercent = Math.min(100, Math.floor((status.earned / status.required) * 100));
  const remainingCoins  = Math.max(0, status.required - status.earned);
  const streak          = status.streak || 0;
  
  const todayDayNumberRaw = status.alreadyClaimed ? Math.max(1, streak) : streak + 1;
  const todayDayNumber = ((todayDayNumberRaw - 1) % 30) + 1;
  const cycleStart = Math.floor((todayDayNumber - 1) / 10) * 10 + 1;
  const displayDays = Array.from({ length: 10 }, (_, i) => cycleStart + i);
  const progressLinePercent = Math.min(100, ((todayDayNumber - cycleStart) / 9) * 100);

  return (
    <DashboardLayout hideStartEarning={true}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[1240px] mx-auto pb-12 pt-4">

        {/* Heading Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative">
           <div className="flex flex-col gap-[6px]">
             <h1 className="m-0 p-0 font-bold text-[68px] leading-[120%] text-white font-['Barlow_Condensed'] whitespace-nowrap">Daily Bonus</h1>
             <p className="m-0 p-0 font-medium text-[26px] leading-[130%] text-[#888888] font-['Barlow_Condensed']">Claim your daily reward and keep your streak going!</p>
           </div>
           <div className="hidden md:block absolute right-0 -top-5 opacity-100 pointer-events-none w-[380px] h-[212px] z-0">
              <img 
                 src="/coins/dailybonus.png" 
                 alt="Daily Bonus" 
                 className="absolute inset-0 w-full h-full object-contain z-10"
              />
              <div 
                 className="absolute inset-0 z-20 mix-blend-color"
                 style={{
                   backgroundColor: 'rgba(73, 178, 101, 1)',
                   WebkitMaskImage: 'url(/coins/dailybonus.png)',
                   WebkitMaskSize: 'contain',
                   WebkitMaskRepeat: 'no-repeat',
                   WebkitMaskPosition: 'center',
                   maskImage: 'url(/coins/dailybonus.png)',
                   maskSize: 'contain',
                   maskRepeat: 'no-repeat',
                   maskPosition: 'center'
                 }}
              />
           </div>
        </div>


        {/* Main Content Wrapper */}
        <div className="flex flex-col gap-[20px] relative z-10 w-full max-w-[1240px]">
           {/* Today's Reward Card */}
           <div className="bg-[#242424] rounded-[20px] px-6 md:px-[40px] py-[30px] border border-[#2A2A2E] flex flex-col md:flex-row items-center justify-between gap-[40px] w-[1240px] shrink-0 min-h-[190px] backdrop-blur-[94px]">
              
              {/* Left Section */}
              <div className="flex flex-col items-start justify-between w-[252px] h-[130px] shrink-0">
                 <div className="flex flex-col gap-0">
                    <h2 className="text-white text-[22px] font-bold font-['Barlow_Condensed'] leading-none tracking-normal m-0 p-0 whitespace-nowrap">Today's Reward</h2>
                    <div className="flex items-center gap-[6px]">
                       <img src="/coins/coinfix.png" alt="Coin" className="w-[52px] h-[52px] shrink-0" />
                       <span 
                         className="font-bold text-[70px] font-['Barlow_Condensed'] leading-[120%] whitespace-nowrap"
                         style={{
                           backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                           WebkitBackgroundClip: 'text',
                           backgroundClip: 'text',
                           color: 'transparent'
                         }}
                       >
                         {status.rewardToday || 100}
                       </span>
                    </div>
                 </div>
                 <div className="flex items-center gap-[10px]">
                    <span className="text-white text-[18px] font-semibold font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap">Next Reward Tomorrow</span>
                    <div className="flex items-center gap-[4px]">
                       <img src="/coins/coinfix.png" alt="Coin" className="w-[15px] h-[15px] shrink-0" />
                       <span 
                         className="font-bold text-[20px] font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap pt-[2px]"
                         style={{
                           backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                           WebkitBackgroundClip: 'text',
                           backgroundClip: 'text',
                           color: 'transparent'
                         }}
                       >
                         120 Coins
                       </span>
                    </div>
                 </div>
              </div>
              
              {/* Vertical Divider */}
              <div className="w-[1px] h-[130px] bg-white/10 shrink-0" />

              {/* Middle Section: Progress */}
              <div className="flex flex-col w-[560px] h-[89px] gap-[20px] justify-center shrink-0">
                 <div className="flex justify-between items-center w-full">
                    <span className="text-white text-[22px] font-medium font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap">Progress to unlock</span>
                    <div className="flex items-center gap-[3px]">
                       <img src="/coins/coinfix.png" alt="Coin" className="w-[22px] h-[22px] shrink-0" />
                       <span 
                         className="font-bold text-[24px] font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap"
                         style={{
                           backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                           WebkitBackgroundClip: 'text',
                           backgroundClip: 'text',
                           color: 'transparent'
                         }}
                       >
                         {status.earned?.toLocaleString() || 0} / {(status.required || 5000).toLocaleString()}
                       </span>
                    </div>
                 </div>
                 
                 {/* Progress Bar Container */}
                 <div className="w-[560px] h-[12px] bg-[#3A3A3A] rounded-[30px] overflow-hidden shrink-0">
                    <div 
                       className="h-full bg-[#4ADE80] rounded-[30px] transition-all duration-500 ease-out"
                       style={{ width: `${Math.min(100, Math.max(0, (status.earned / status.required) * 100))}%` }}
                    />
                 </div>
                 
                 <div className="flex items-center w-[560px] gap-[6px]">
                    <span className="text-white text-[16px] font-medium font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap">Earn</span>
                    <div className="flex items-center gap-[3px]">
                       <img src="/coins/coinfix.png" alt="Coin" className="w-[15px] h-[15px] shrink-0" />
                       <span 
                         className="font-bold text-[16px] font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap pt-[1px]"
                         style={{
                           backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                           WebkitBackgroundClip: 'text',
                           backgroundClip: 'text',
                           color: 'transparent'
                         }}
                       >
                         {Math.max(0, status.required - status.earned).toLocaleString()}
                       </span>
                    </div>
                    <span className="text-white text-[16px] font-medium font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap">more to unlock your bonus</span>
                 </div>
              </div>

              {/* Vertical Divider */}
              <div className="w-[1px] h-[130px] bg-white/10 shrink-0" />

              {/* Right Section: Actions */}
              <div className="flex flex-col items-center justify-between w-[188px] h-[130px] shrink-0 -ml-[20px]">
                 <button 
                    onClick={claimBonus}
                    disabled={claiming || !status.gateUnlocked || status.alreadyClaimed}
                    className={`w-[183px] h-[48px] rounded-[10px] pt-[10px] pb-[10px] pl-[30px] pr-[30px] flex items-center justify-center gap-[10px] font-bold text-white transition-all
                       ${!status.gateUnlocked ? 'bg-[#49B265] shadow-[0px_4px_0px_0px_#276D3A] mix-blend-luminosity cursor-not-allowed' : 
                         status.alreadyClaimed ? 'bg-[#3A3A3A] cursor-not-allowed text-gray-500' :
                         'bg-[#49B265] shadow-[0px_4px_0px_0px_#276D3A] hover:bg-[#3fa055] hover:scale-105 active:scale-95'}`}
                 >
                    {status.alreadyClaimed ? <FiCheckCircle className="text-lg shrink-0" /> : !status.gateUnlocked ? <img src="/coins/lockpe.png" alt="Lock" className="w-[24px] h-[24px] shrink-0 brightness-0 invert" /> : <FiUnlock className="text-lg shrink-0" />}
                    <span className="font-medium text-[18px] font-['Barlow_Condensed'] leading-none text-white whitespace-nowrap pt-[2px]">
                       {claiming ? 'Claiming...' : status.alreadyClaimed ? 'Claimed' : 'Claim Reward'}
                    </span>
                 </button>
                 <div className="flex flex-col items-center justify-center w-[188px] h-[50px] gap-[2px]">
                    <span className="text-white/40 text-[18px] font-semibold font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap">Day rest in</span>
                    <div className="text-white text-[36px] font-semibold font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap flex justify-center items-center">
                       {resetTimer || '00 : 00 : 00'}
                    </div>
                 </div>
              </div>

           </div>

         {/* Second Card: Current Streak */}
         <div className="flex flex-col justify-between w-[1240px] h-[240px] rounded-[20px] pt-[30px] pr-[20px] pb-[30px] pl-[20px] bg-[#242424] shrink-0 relative" style={{ backdropFilter: 'blur(94px)' }}>
           <div className="flex items-center justify-between w-full h-[50px] relative z-10">
              <h2 className="text-white text-[42px] font-bold font-['Barlow_Condensed'] leading-[120%] tracking-normal whitespace-nowrap">Current Streak</h2>
              <span 
                 className="font-bold text-[54px] font-['Barlow_Condensed'] leading-[120%] tracking-normal whitespace-nowrap"
                 style={{
                   backgroundImage: 'linear-gradient(180deg, #FEDF77 0%, #FCB91E 100%)',
                   WebkitBackgroundClip: 'text',
                   backgroundClip: 'text',
                   color: 'transparent'
                 }}
              >
                 {streak || 0} Days
              </span>
           </div>
           
           {/* Horizontal Timeline */}
           <div className="relative z-10 w-[1220px] h-[95px] -ml-[10px] flex items-center justify-between shrink-0">
                 {/* Background Line */}
                 <div className="absolute left-[10px] top-[33px] -translate-y-1/2 w-[1200px] h-[9px] bg-[#49B265]/[0.19] z-0">
                     {/* Progress Line */}
                     <div className="absolute left-0 top-0 h-[9px] bg-[#49B265] z-0 transition-all duration-500" style={{ width: `${progressLinePercent}%` }}></div>
                 </div>
                 
                 {/* Nodes */}
                 {displayDays.map(day => {
                    const isPast = day < todayDayNumber;
                    const isToday = day === todayDayNumber;
                    
                    let nodeClass = '';
                    let innerContent = null;
                    
                    if (isToday) {
                      if (status.alreadyClaimed) {
                        nodeClass = 'bg-[#49B265] text-white w-[66px] h-[66px] flex items-center justify-center';
                        innerContent = <img src="/coins/retik.png" alt="Claimed" className="w-[26px] h-[26px] brightness-0 invert" />;
                      } else {
                        nodeClass = 'bg-[#122c19] border-2 border-[#49B265] w-[66px] h-[66px]';
                        innerContent = <span className="text-white text-[36px] font-semibold font-['Barlow_Condensed'] leading-[130%] tracking-normal text-center">{day}</span>;
                      }
                    } else if (isPast) {
                      nodeClass = 'bg-[#49B265] text-white w-[66px] h-[66px] flex items-center justify-center';
                      innerContent = <img src="/coins/retik.png" alt="Claimed" className="w-[26px] h-[26px] brightness-0 invert" />;
                    } else {
                      nodeClass = 'bg-[#2b3f30] w-[66px] h-[66px]';
                      innerContent = <img src="/coins/lockpe.png" alt="Locked" className="w-[26px] h-[26px]" />;
                    }
                    
                    let textClass = '';
                    if (isToday) {
                       textClass = 'text-white';
                    } else if (isPast) {
                       textClass = 'text-[#49B265]';
                    } else {
                       textClass = 'text-[#2b3f30]';
                    }

                    return (
                      <div key={day} className="relative z-10 flex flex-col items-center justify-center w-[66px] h-[95px] gap-[16px] shrink-0">
                         <div className={`rounded-full flex items-center justify-center transition-all shrink-0 ${nodeClass}`}>
                            {innerContent}
                         </div>
                         <span className={`font-['Barlow_Condensed'] font-bold text-[18px] leading-[130%] tracking-normal whitespace-nowrap text-center ${textClass}`}>
                            {isToday ? 'Today' : `Day ${day}`}
                         </span>
                      </div>
                    )
                 })}
              </div>
           </div>

         {/* Third Card section: Milestones */}
         <div className="flex flex-col w-[1240px] h-[384px] gap-[18px] rounded-[20px] p-[20px] bg-white/[0.14] shrink-0 relative z-10">
            <div className="flex items-center w-[1200px] h-[133px] gap-[16px] shrink-0 relative">
               <div className="flex flex-col justify-center w-[852px] h-[85px] gap-[6px] shrink-0">
                  <h2 className="w-[852px] h-[50px] m-0 p-0 text-white text-[42px] font-bold font-['Barlow_Condensed'] leading-[120%] tracking-normal whitespace-nowrap">Streak Milestones</h2>
                  <p className="w-[852px] h-[29px] m-0 p-0 text-[#888888] text-[22px] font-medium font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap">Bonus coins for hitting these streaks</p>
               </div>
               <div className="w-[332px] h-[133px] shrink-0 pointer-events-none z-0 flex items-center justify-center">
                  <img src="/coins/streakmil.png" alt="Milestones" className="w-[332px] h-[133px] object-contain" />
               </div>
            </div>

           <div className="flex w-[1200px] h-[193px] gap-[14px] shrink-0 relative z-10">
              {[
                 { title: '10 Day Streak', sub: 'Keep going!', target: 10, reward: status.rewardDay10 ?? 500, current: Math.min(streak, 10) },
                 { title: '20 Day Streak', sub: 'Almost there!', target: 20, reward: status.rewardDay20 ?? 2500, current: Math.min(streak, 20) },
                 { title: '30 Day Streak', sub: 'Ultimate champion!', target: 30, reward: status.rewardDay30 ?? 5000, current: Math.min(streak, 30) },
              ].map(milestone => {
                 const progress = Math.min(100, (milestone.current / milestone.target) * 100);
                 const reached = streak >= milestone.target;
                 
                 const badgeColors = {
                    10: 'from-green-500 to-green-700 shadow-[0_0_20px_rgba(34,197,94,0.3)] border-green-400/30',
                    20: 'from-blue-500 to-blue-700 shadow-[0_0_20px_rgba(59,130,246,0.3)] border-blue-400/30',
                    30: 'from-amber-400 to-amber-600 shadow-[0_0_20px_rgba(251,191,36,0.3)] border-amber-400/30'
                 };
                 const badgeBg = badgeColors[milestone.target] || 'from-gray-500 to-gray-700 border-gray-400/30';

                 return (
                   <div key={milestone.target} className="flex flex-col w-[390.66px] h-[193px] gap-[16px] rounded-[20px] p-[16px] bg-black/[0.36] backdrop-blur-[44px] shrink-0 relative">
                      {reached && (
                         <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#49B265] flex items-center justify-center text-white border-4 border-[#1c1c1e] shadow-lg">
                            <FiCheckCircle className="text-sm" />
                         </div>
                      )}
                      <div className="flex items-center w-[358.66px] h-[91px] gap-[16px] shrink-0">
                         <img src={`/coins/st${milestone.target}.png`} alt={`${milestone.target} Day Streak`} className="w-[81px] h-[91px] object-contain shrink-0" />
                         <div className="flex flex-col w-[261.66px] h-[51px] gap-[16px] shrink-0">
                            <h3 className="w-[152px] h-[22px] m-0 p-0 text-white text-[32px] font-semibold font-['Barlow_Condensed'] leading-[120%] tracking-normal whitespace-nowrap">{milestone.title}</h3>
                            <p className="w-[261.66px] h-[13px] m-0 p-0 text-white/60 text-[18px] font-medium font-['Barlow_Condensed'] leading-[120%] tracking-normal whitespace-nowrap">{milestone.sub}</p>
                         </div>
                      </div>
                      
                      <div className="w-[358.66px] h-[12px] bg-white/[0.1] rounded-[30px] shrink-0">
                         <div className="h-full bg-[#49B265] rounded-[30px] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center w-[358.66px] h-[26px] shrink-0">
                         <div className="flex items-center w-auto h-[26px] gap-[4px] shrink-0 overflow-visible">
                            <img src="/coins/coinfinal.png" alt="Coin" className="w-[26px] h-[26px] shrink-0 object-contain overflow-visible" style={{ filter: 'drop-shadow(0px 0px 14px rgba(254, 198, 53, 0.6))' }} />
                            <span className="w-auto h-auto m-0 p-0 text-[28px] font-bold font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap bg-gradient-to-b from-[#FEDF77] to-[#FCB91E] text-transparent bg-clip-text flex items-center shrink-0 pb-[2px]">
                               {milestone.reward}
                            </span>
                         </div>
                         <span className="w-auto h-auto m-0 p-0 text-white text-[22px] font-semibold font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap text-right shrink-0">
                            {milestone.current} / {milestone.target} Days
                         </span>
                      </div>
                   </div>
                 )
              })}
           </div>
        </div>

        </div>

      </motion.div>
    </DashboardLayout>
  );
}
