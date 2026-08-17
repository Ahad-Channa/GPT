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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[1240px] mx-auto pb-12 pt-4 px-2 sm:px-4 md:px-0">

        {/* Heading Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 relative w-full">
           <div className="flex flex-col gap-[6px]">
             <h1 className="m-0 p-0 font-bold text-[36px] sm:text-[48px] md:text-[68px] leading-[120%] text-white font-['Barlow_Condensed'] whitespace-nowrap">Daily Bonus</h1>
             <p className="m-0 p-0 font-medium text-[16px] sm:text-[20px] md:text-[26px] leading-[130%] text-[#888888] font-['Barlow_Condensed']">Claim your daily reward and keep your streak going!</p>
           </div>
           <div className="hidden md:block absolute right-[-3px] -top-5 opacity-100 pointer-events-none w-[380px] h-[212px] z-0">
              <img 
                 src="/coins/dailybonus.png" 
                 alt="Daily Bonus" 
                 className="absolute inset-0 w-full h-full object-contain object-right z-10"
              />
              <div 
                 className="absolute inset-0 z-20 mix-blend-color"
                 style={{
                   backgroundColor: 'rgba(73, 178, 101, 1)',
                   WebkitMaskImage: 'url(/coins/dailybonus.png)',
                   WebkitMaskSize: 'contain',
                   WebkitMaskRepeat: 'no-repeat',
                   WebkitMaskPosition: 'right',
                   maskImage: 'url(/coins/dailybonus.png)',
                   maskSize: 'contain',
                   maskRepeat: 'no-repeat',
                   maskPosition: 'right'
                 }}
              />
           </div>
        </div>


        {/* Main Content Wrapper */}
        <div className="flex flex-col gap-[20px] relative z-10 w-full max-w-[1240px]">
           {/* Today's Reward Card */}
           <div className="w-full">
             <div className="bg-[#242424] rounded-[16px] md:rounded-[20px] p-6 md:px-[40px] md:py-[30px] border border-[#2A2A2E] flex flex-col md:flex-row items-center justify-center md:justify-between gap-6 md:gap-[40px] w-full md:w-[1240px] shrink-0 min-h-auto md:min-h-[190px] backdrop-blur-[94px]">
                
                {/* Left Section */}
                <div className="flex flex-col items-center md:items-start justify-center md:justify-between w-full md:w-[252px] h-auto md:h-[130px] shrink-0 text-center md:text-left gap-2 md:gap-0">
                   <div className="flex flex-col items-center md:items-start gap-0">
                      <h2 className="text-white text-[20px] md:text-[22px] font-bold font-['Barlow_Condensed'] leading-none tracking-normal m-0 p-0 whitespace-nowrap">Today's Reward</h2>
                      <div className="flex items-center gap-2 md:gap-[6px] mt-1 md:mt-0">
                         <img src="/coins/Coin.png" alt="Coin" className="w-[40px] h-[40px] md:w-[52px] md:h-[52px] shrink-0" />
                         <span 
                           className="font-bold text-[48px] md:text-[70px] font-['Barlow_Condensed'] leading-[120%] whitespace-nowrap"
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
                   <div className="flex items-center justify-center md:justify-start gap-[6px] md:gap-[10px]">
                      <span className="text-white text-[16px] md:text-[18px] font-semibold font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap">Next Reward Tomorrow</span>
                      <div className="flex items-center gap-[4px]">
                         <img src="/coins/Coin.png" alt="Coin" className="w-[12px] h-[12px] md:w-[15px] md:h-[15px] shrink-0" />
                         <span 
                           className="font-bold text-[16px] md:text-[20px] font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap pt-[1px] md:pt-[2px]"
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
                
                {/* Divider */}
                <div className="w-full md:w-[1px] h-[1px] md:h-[130px] bg-white/10 shrink-0 my-2 md:my-0" />

                {/* Middle Section: Progress */}
                <div className="flex flex-col w-full md:w-[560px] h-auto md:h-[89px] gap-4 md:gap-[20px] justify-center shrink-0">
                   <div className="flex justify-between items-center w-full">
                      <span className="text-white text-[18px] md:text-[22px] font-medium font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap">Progress to unlock</span>
                      <div className="flex items-center gap-[4px] md:gap-[3px]">
                         <img src="/coins/Coin.png" alt="Coin" className="w-[20px] h-[20px] md:w-[22px] md:h-[22px] shrink-0" />
                         <span 
                           className="font-bold text-[20px] md:text-[24px] font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap"
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
                   <div className="w-full h-[8px] md:h-[12px] bg-[#3A3A3A] rounded-[30px] overflow-hidden shrink-0">
                      <div 
                         className="h-full bg-[#4ADE80] rounded-[30px] transition-all duration-500 ease-out"
                         style={{ width: `${Math.min(100, Math.max(0, (status.earned / status.required) * 100))}%` }}
                      />
                   </div>
                   
                   <div className="flex items-center justify-start flex-nowrap w-full gap-[4px] md:gap-[6px]">
                      <span className="text-white text-[14px] md:text-[16px] font-medium font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap flex-shrink-0">Earn</span>
                      <div className="flex items-center gap-[4px] md:gap-[3px] flex-shrink-0">
                         <img src="/coins/Coin.png" alt="Coin" className="w-[14px] h-[14px] md:w-[15px] md:h-[15px] shrink-0" />
                         <span 
                           className="font-bold text-[14px] md:text-[16px] font-['Barlow_Condensed'] leading-none tracking-normal pt-[1px]"
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
                      <span className="text-white text-[14px] md:text-[16px] font-medium font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap text-ellipsis overflow-hidden">more to unlock your bonus</span>
                   </div>
                </div>

                {/* Divider */}
                <div className="w-full md:w-[1px] h-[1px] md:h-[130px] bg-white/10 shrink-0 my-2 md:my-0" />

                {/* Right Section: Actions */}
                <div className="flex flex-col items-center justify-center md:justify-between w-full md:w-[188px] h-auto md:h-[130px] shrink-0 md:-ml-[20px] gap-4 md:gap-0">
                   <button 
                      onClick={claimBonus}
                      disabled={claiming || !status.gateUnlocked || status.alreadyClaimed}
                      className={`w-[183px] h-[44px] md:h-[48px] rounded-[10px] px-2 md:pl-[30px] md:pr-[30px] flex items-center justify-center gap-2 md:gap-[10px] font-bold text-white transition-all
                         ${!status.gateUnlocked ? 'bg-[#49B265] shadow-[0px_2px_0px_0px_#276D3A] md:shadow-[0px_4px_0px_0px_#276D3A] mix-blend-luminosity cursor-not-allowed' : 
                           status.alreadyClaimed ? 'bg-[#3A3A3A] cursor-not-allowed text-gray-500' :
                           'bg-[#49B265] shadow-[0px_2px_0px_0px_#276D3A] md:shadow-[0px_4px_0px_0px_#276D3A] hover:bg-[#3fa055] hover:scale-105 active:scale-95'}`}
                   >
                      {status.alreadyClaimed ? <FiCheckCircle className="text-[18px] md:text-lg shrink-0" /> : !status.gateUnlocked ? <img src="/coins/lockpe.png" alt="Lock" className="w-[20px] h-[20px] md:w-[24px] md:h-[24px] shrink-0 brightness-0 invert" /> : <FiUnlock className="text-[18px] md:text-lg shrink-0" />}
                      <span className="font-medium text-[18px] md:text-[18px] font-['Barlow_Condensed'] leading-none text-white whitespace-nowrap pt-[1px] md:pt-[2px]">
                         {claiming ? 'Claiming...' : status.alreadyClaimed ? 'Claimed' : 'Claim Reward'}
                      </span>
                   </button>
                   <div className="flex flex-col items-center justify-center w-full h-[40px] md:h-[50px] gap-[2px] md:gap-[2px]">
                      <span className="text-white/40 text-[16px] md:text-[18px] font-semibold font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap">Resets in</span>
                      <div className="text-white text-[30px] md:text-[36px] font-semibold font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap flex justify-center items-center">
                         {resetTimer || '00 : 00 : 00'}
                      </div>
                   </div>
                </div>

             </div>
           </div>

         {/* Second Card: Current Streak */}
         <div className="flex flex-col justify-between w-full md:w-[1240px] min-h-[120px] md:min-h-[200px] md:h-[240px] rounded-[20px] p-5 md:pt-[30px] md:pr-[20px] md:pb-[30px] md:pl-[20px] bg-[#242424] shrink-0 relative gap-4 md:gap-0" style={{ backdropFilter: 'blur(94px)' }}>
           <div className="flex items-center justify-between w-full h-auto md:h-[50px] relative z-10">
              <h2 className="text-white text-[24px] sm:text-[32px] md:text-[42px] font-bold font-['Barlow_Condensed'] leading-[120%] tracking-normal whitespace-nowrap">Current Streak</h2>
              <span 
                 className="font-bold text-[32px] sm:text-[42px] md:text-[54px] font-['Barlow_Condensed'] leading-[120%] tracking-normal whitespace-nowrap"
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
           <div className="w-full overflow-y-auto md:overflow-visible hide-scrollbar pb-2 md:pb-0 pt-4 md:pt-0 -mt-4 md:mt-0">
              <div className="relative z-10 w-full md:w-[1200px] h-auto md:h-[95px] flex flex-col md:flex-row items-center md:items-center justify-start md:justify-between shrink-0 gap-4 md:gap-0 mt-2 md:mt-0">
                 {/* Desktop Background Line */}
                 <div className="hidden md:block absolute left-[33px] top-[33px] -translate-y-1/2 w-[1134px] h-[9px] bg-[#49B265]/[0.19] z-0">
                     <div className="absolute left-0 top-0 h-[9px] bg-[#49B265] z-0 transition-all duration-500" style={{ width: `${progressLinePercent}%` }}></div>
                 </div>

                 {/* Mobile Background Line */}
                 <div className="md:hidden absolute left-[50%] -translate-x-1/2 top-[41px] w-[8px] h-[calc(100%-82px)] bg-[#49B265]/[0.19] z-0">
                     <div className="absolute left-0 top-0 w-[8px] bg-[#49B265] z-0 transition-all duration-500" style={{ height: `${progressLinePercent}%` }}></div>
                 </div>
                 
                 {/* Nodes */}
                 {displayDays.map((day, index) => {
                    const isPast = day < todayDayNumber;
                    const isToday = day === todayDayNumber;
                    
                    let nodeClass = '';
                    let innerContent = null;
                    
                    if (isToday) {
                      if (status.alreadyClaimed) {
                        nodeClass = 'bg-[#49B265] text-white w-[64px] h-[64px] md:w-[66px] md:h-[66px]';
                        innerContent = <img src="/coins/retik.png" alt="Claimed" className="w-[32px] h-[32px] md:w-[26px] md:h-[26px] brightness-0 invert" />;
                      } else {
                        nodeClass = 'bg-[#122c19] border-[3px] md:border-2 border-[#49B265] w-[64px] h-[64px] md:w-[66px] md:h-[66px]';
                        innerContent = <span className="text-white text-[30px] md:text-[36px] font-semibold font-['Barlow_Condensed'] leading-[130%] tracking-normal text-center pt-[1px] md:pt-0">{day}</span>;
                      }
                    } else if (isPast) {
                      nodeClass = 'bg-[#49B265] text-white w-[64px] h-[64px] md:w-[66px] md:h-[66px]';
                      innerContent = <img src="/coins/retik.png" alt="Claimed" className="w-[32px] h-[32px] md:w-[26px] md:h-[26px] brightness-0 invert" />;
                    } else {
                      nodeClass = 'bg-[#2b3f30] w-[64px] h-[64px] md:w-[66px] md:h-[66px]';
                      innerContent = <img src="/coins/lockpe.png" alt="Locked" className="w-[32px] h-[32px] md:w-[26px] md:h-[26px]" />;
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
                      <div key={day} className="relative z-10 flex flex-col items-center justify-center md:justify-center w-full md:w-[66px] h-[82px] md:h-[95px] md:gap-[16px] shrink-0">
                         <div className={`rounded-full flex items-center justify-center transition-all shrink-0 relative ${nodeClass}`}>
                            {innerContent}
                            {/* Mobile Text */}
                            <span className={`md:hidden absolute top-1/2 -translate-y-1/2 font-['Barlow_Condensed'] font-bold text-[24px] leading-[130%] tracking-normal whitespace-nowrap ${index % 2 === 0 ? 'right-[calc(100%+16px)] text-right' : 'left-[calc(100%+16px)] text-left'} ${textClass}`}>
                               {isToday ? 'Today' : `Day ${day}`}
                            </span>
                         </div>
                         {/* Desktop Text */}
                         <span className={`hidden md:block font-['Barlow_Condensed'] font-bold text-[18px] leading-[130%] tracking-normal whitespace-nowrap text-center ${textClass}`}>
                            {isToday ? 'Today' : `Day ${day}`}
                         </span>
                      </div>
                    );
                 })}
              </div>
           </div>
         </div>

         {/* Third Card section: Milestones */}
         <div className="flex flex-col w-full md:w-[1240px] h-auto md:h-[384px] gap-4 md:gap-[18px] rounded-[20px] p-5 md:p-[20px] bg-white/[0.14] shrink-0 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full md:w-[1200px] h-auto md:h-[133px] gap-2 md:gap-[16px] shrink-0 relative">
               <div className="flex flex-col justify-center w-full md:w-[852px] h-auto md:h-[85px] gap-1 md:gap-[6px] shrink-0">
                  <h2 className="w-full md:w-[852px] h-auto md:h-[50px] m-0 p-0 text-white text-[24px] sm:text-[32px] md:text-[42px] font-bold font-['Barlow_Condensed'] leading-[120%] tracking-normal whitespace-nowrap">Streak Milestones</h2>
                  <p className="w-full md:w-[852px] h-auto md:h-[29px] m-0 p-0 text-[#888888] text-[16px] sm:text-[18px] md:text-[22px] font-medium font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap">Bonus coins for hitting these streaks</p>
               </div>
               <div className="hidden md:flex w-[332px] h-[133px] shrink-0 pointer-events-none z-0 items-center justify-center">
                  <img src="/coins/streakmil.png" alt="Milestones" className="w-[332px] h-[133px] object-contain" />
               </div>
            </div>

           <div className="w-full overflow-y-auto md:overflow-visible hide-scrollbar pb-2 md:pb-0">
              <div className="flex flex-col md:flex-row w-full md:w-[1200px] h-auto md:h-[193px] justify-start gap-4 md:gap-[14px] shrink-0 relative z-10">
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
                      <div key={milestone.target} className="flex flex-col w-full md:w-[390.66px] h-auto md:h-[193px] gap-3 md:gap-[16px] rounded-[16px] md:rounded-[20px] p-4 md:p-[16px] bg-black/[0.36] backdrop-blur-[44px] shrink-0 relative items-start md:items-start">
                         {reached && (
                            <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#49B265] flex items-center justify-center text-white border-2 md:border-4 border-[#1c1c1e] shadow-lg z-10">
                               <FiCheckCircle className="text-sm md:text-sm" />
                            </div>
                         )}
                         <div className="flex flex-row items-center w-full md:w-[358.66px] h-auto md:h-[91px] gap-3 md:gap-[16px] shrink-0">
                            <img src={`/coins/st${milestone.target}.png`} alt={`${milestone.target} Day Streak`} className="w-[54px] h-[60px] md:w-[81px] md:h-[91px] object-contain shrink-0" />
                            <div className="flex flex-col flex-1 min-w-0 h-auto gap-1 md:gap-1 shrink-0 items-start justify-center">
                               <h3 className="w-full text-left h-auto m-0 p-0 text-white text-[20px] md:text-[32px] font-semibold font-['Barlow_Condensed'] leading-[110%] md:leading-[120%] tracking-normal whitespace-normal md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">{milestone.title}</h3>
                               <p className="w-full text-left h-auto m-0 p-0 text-white/60 text-[16px] md:text-[18px] font-medium font-['Barlow_Condensed'] leading-[110%] md:leading-[120%] tracking-normal whitespace-normal md:whitespace-nowrap md:overflow-hidden md:text-ellipsis">{milestone.sub}</p>
                            </div>
                         </div>
                         
                         <div className="w-full md:w-[358.66px] h-[6px] md:h-[12px] bg-white/[0.1] rounded-[30px] shrink-0 mt-2 md:mt-0">
                            <div className="h-full bg-[#49B265] rounded-[30px] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                         </div>
                         <div className="flex flex-row justify-between items-center w-full md:w-[358.66px] h-auto md:h-[26px] shrink-0 gap-[2px] md:gap-0 mt-1 md:mt-0">
                            <div className="flex items-center w-auto h-auto md:h-[26px] gap-[4px] md:gap-[4px] shrink-0 overflow-visible">
                               <img src="/coins/Coin.png" alt="Coin" className="w-[16px] h-[16px] md:w-[26px] md:h-[26px] shrink-0 object-contain overflow-visible" />
                               <span className="w-auto h-auto m-0 p-0 text-[18px] md:text-[28px] font-bold font-['Barlow_Condensed'] leading-none tracking-normal whitespace-nowrap bg-gradient-to-b from-[#FEDF77] to-[#FCB91E] text-transparent bg-clip-text flex items-center shrink-0 pb-[1px] md:pb-[2px]">
                                  {milestone.reward}
                               </span>
                            </div>
                            <span className="w-auto h-auto m-0 p-0 text-white text-[14px] md:text-[22px] font-semibold font-['Barlow_Condensed'] leading-[130%] tracking-normal whitespace-nowrap text-right shrink-0">
                               {milestone.current} / {milestone.target} Days
                            </span>
                         </div>
                      </div>
                    )
                 })}
              </div>
           </div>
        </div>

        </div>

      </motion.div>
    </DashboardLayout>
  );
}
