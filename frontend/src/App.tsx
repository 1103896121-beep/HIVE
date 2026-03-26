import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, Settings, Flame, ChevronLeft, MapPin, Clock, Zap, Maximize2 } from 'lucide-react';
import clsx from 'clsx';
import { AppSheets, type SheetType } from './components/AppSheets';
import { InteractionModal, type InteractionUser } from './components/InteractionModal';
import { GlobalMap } from './components/GlobalMap';
import { triggerHaptic } from './utils/haptics';
import { HiveGrid } from './components/HiveGrid';
import { useHiveSocket } from './hooks/useHiveSocket';
import { SubjectIcon } from './components/SubjectIcon';
import { AuthPage } from './components/AuthPage';
import { CustomModal } from './components/CustomModal';
import { useAppInit } from './hooks/useAppInit';
import { useTimer } from './hooks/useTimer';
import { useAppActions } from './hooks/useAppActions';
import { useLongPressFocus } from './hooks/useLongPressFocus';


export default function App() {
  const { t } = useTranslation();
  const isScreenshotMode = useMemo(() => new URLSearchParams(window.location.search).get('screenshot') === 'true', []);

  const {
    userId, isAuthenticated, subjects, squads, bonds, hiveTiles, ambientCount, userProfile, theme, currentSquad, currentLocation,
    setTheme, setCurrentSquad, setCurrentLocation, setUserProfile, setSquads, setBonds, setHiveTiles, handleSignOut, handleAuthSuccess
  } = useAppInit();

  const [currentSubject, setCurrentSubject] = useState('Work');
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [viewMode, setViewMode] = useState<'squad' | 'global'>('squad');
  const [lastNudge, setLastNudge] = useState<string | null>(null);
  const [interactionUser, setInteractionUser] = useState<InteractionUser | null>(null);
  const [sparkAward, setSparkAward] = useState<number | null>(null);
  const [sparkFadeOut, setSparkFadeOut] = useState(false);
  const [nudgeFlash, setNudgeFlash] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean; title: string; message: string; type: 'alert' | 'confirm'; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: () => { } });

  const showAlert = useCallback((title: string, message: string) => {
    setModalConfig({
      isOpen: true, title, message, type: 'alert',
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
    });
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setModalConfig({
      isOpen: true, title, message, type: 'confirm',
      onConfirm: () => { onConfirm(); setModalConfig(prev => ({ ...prev, isOpen: false })); },
    });
  }, []);

  const {
    isFocusing, timeLeft, maxTime, activeSessionId, toggleFocus, handleEndFocus, handleTimeSelect
  } = useTimer({
    userId, subjects, currentSubject, userProfile, setUserProfile, setHiveTiles,
    onOpenSubscription: () => setActiveSheet('subscription'),
    showAlert
  });

  const { holdProgress, handlePointerDown, handlePointerUp } = useLongPressFocus({
    activeSessionId, handleEndFocus, toggleFocus, setSparkAward, setSparkFadeOut
  });

  const { messages, sendNudge } = useHiveSocket(userId || '');

  useEffect(() => {
    if (!userId) return;
    const latest = messages[messages.length - 1];
    if (latest?.type === 'NUDGE_RECEIVED') {
      triggerHaptic('notification');
      setLastNudge(latest.sender_id || 'Someone');
      setNudgeFlash(true);
      const timer1 = setTimeout(() => setNudgeFlash(false), 800);
      const timer2 = setTimeout(() => setLastNudge(null), 3000);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [messages, userId]);

  useEffect(() => {
    const handleOpenSub = () => setActiveSheet('subscription');
    window.addEventListener('open-subscription', handleOpenSub);
    return () => window.removeEventListener('open-subscription', handleOpenSub);
  }, []);

  const trialStatus = useMemo(() => {
    if (!userProfile.trialStartAt) return { isExpired: false, daysLeft: 7, isPremium: false };
    const now = new Date();
    if (userProfile.subscriptionEndAt && new Date(userProfile.subscriptionEndAt) > now) {
      const remainingDays = Math.ceil((new Date(userProfile.subscriptionEndAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { isExpired: false, isPremium: true, daysLeft: remainingDays };
    }
    const start = new Date(userProfile.trialStartAt).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - start;
    return { isExpired: elapsed > sevenDaysMs, daysLeft: Math.max(0, Math.ceil((sevenDaysMs - elapsed) / (1000 * 60 * 60 * 24))), isPremium: false };
  }, [userProfile.trialStartAt, userProfile.subscriptionEndAt]);



  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const {
    ambientParticles,
    handleUpdateProfile, handleLeaveSquad, handleDisbandSquad,
    handleCreateSquad, handleBlock, handleCreateBond, handleGridUserClick
  } = useAppActions({
    userId, theme, userProfile, ambientCount,
    setUserProfile, setSquads, setCurrentSquad, setActiveSheet, setBonds,
    showAlert, showConfirm, setInteractionUser, t
  });

  return (
    <div className={clsx("flex h-screen items-center justify-center", isScreenshotMode ? "bg-black" : "bg-black/95")}>
      {!isAuthenticated ? (
        <AuthPage onSuccess={handleAuthSuccess} />
      ) : (
        /* 模拟 iOS 设备屏幕框 - 截图模式下充满全屏 */
        <div
          className={clsx(
            "relative flex flex-col font-sans transition-colors duration-500",
            isScreenshotMode 
              ? "w-full h-full" 
              : "w-full max-w-[400px] h-full sm:h-[850px] sm:border-[8px] border-zinc-900 sm:rounded-[48px] overflow-hidden shadow-2xl"
          )}
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >


          {/* 宏观地图层 (条件渲染) */}
          {viewMode === 'global' && (
            <GlobalMap onExit={() => setViewMode('squad')} />
          )}

          {/* 顶部导航栏 */}
          <div
            className="pt-12 pb-4 px-6 flex items-center justify-between z-10 glass-nav backdrop-blur-md absolute top-0 w-full border-b border-white/[0.03] transition-colors duration-500"
            style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.02)' }}
          >

            <button
              onClick={() => setActiveSheet('bonds')}
              className="p-2 transition-colors relative"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Zap size={22} style={{ color: 'var(--accent)' }} />
              {bonds.some(b => b.status === "PENDING" && b.requester_id !== userId) && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--accent)' }}></span>
              )}
            </button>

            <div className="flex flex-col items-center">
              <button
                onClick={() => setActiveSheet('squad')}
                className="text-white font-bold text-lg tracking-wide uppercase flex items-center gap-1 hover:opacity-80 active:scale-95 transition-all"
              >
                {currentSquad === 'Global Hive' ? t('nav.global') + ' Hive' : currentSquad} <ChevronLeft size={14} className="-rotate-90 text-zinc-600" />
              </button>
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }}></span>
                Live Room
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveSheet('theme')}
                className="p-2 transition-colors hover:opacity-80 active:scale-95"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Settings size={20} />
              </button>
              <button
                onClick={() => setActiveSheet('profile')}
                className="w-10 h-10 rounded-full border-2 transition-all p-0.5 overflow-hidden hover:scale-105 active:scale-95 shadow-lg relative"
                style={{
                  borderColor: activeSheet === 'profile' ? 'var(--accent)' : 'rgba(var(--accent-rgb), 0.2)',
                  boxShadow: activeSheet === 'profile' ? '0 0 15px rgba(var(--accent-rgb), 0.3)' : 'none'
                }}
              >
                <img src={userProfile.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />

                {/* 收到轻推时的提示光点 */}
                {lastNudge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F5A623] rounded-full flex items-center justify-center animate-bounce shadow-lg border-2 border-black">
                    <Zap size={8} className="text-black fill-current" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 核心滚动视窗 */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pt-32 pb-40 px-6 hide-scrollbar flex flex-col items-center">

            {/* 1.5 临期提醒条 (适用于试用期或订阅期) */}
            {!trialStatus.isExpired && trialStatus.daysLeft <= 3 && (
              <div
                className="w-full mb-6 z-20 px-4 py-3 rounded-2xl border flex items-center justify-between backdrop-blur-md animate-in fade-in"
                style={{
                  backgroundColor: 'rgba(var(--accent-rgb), 0.1)',
                  borderColor: 'rgba(var(--accent-rgb), 0.2)'
                }}
              >
                <div className="flex items-center gap-2">
                  <Zap size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                    {trialStatus.daysLeft === 0 
                      ? t('trial.expired') 
                      : trialStatus.isPremium 
                        ? t('nav.sub_expiring', { count: trialStatus.daysLeft, defaultValue: `Premium Ends in ${trialStatus.daysLeft}d` }) 
                        : t('trial.left', { count: trialStatus.daysLeft })}
                  </span>
                </div>
                <button
                  onClick={() => setActiveSheet('subscription')}
                  className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  {trialStatus.isPremium ? t('nav.renew', 'Renew') : t('trial.subscribe', 'Subscribe')}
                </button>
              </div>
            )}

            {/* 选择器药丸组 (Subject & Location) */}
            <div className="w-full flex gap-2 mb-8 mt-2">
              <button
                onClick={() => setActiveSheet('subject')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/5 text-zinc-300 hover:bg-white/10 active:scale-95 transition-all"
              >
                <SubjectIcon name={currentSubject} size={14} className="text-[#F5A623]" />
                <span className="text-xs font-bold uppercase tracking-wider">{t(`subjects.${currentSubject.toLowerCase()}`)}</span>
              </button>
              <button
                onClick={() => setActiveSheet('location')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/5 transition-all active:scale-95"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                <MapPin size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-bold uppercase tracking-wider">{currentLocation}</span>
              </button>

            </div>

            {/* 蜂窝网格 + 外围光点环 */}
            <div className="w-full flex flex-col items-center mb-6 relative min-h-[300px] justify-center">
              {/* L2 外围渐变粒子环 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] pointer-events-none z-0">
                {ambientParticles.map((particle) => (
                  <div
                    key={particle.id}
                    className="absolute rounded-full animate-pulse"
                    style={{
                      left: particle.x, top: particle.y,
                      width: particle.size, height: particle.size,
                      opacity: particle.opacity,
                      backgroundColor: 'var(--accent)',
                      animationDelay: `${particle.delay}s`,
                      animationDuration: `${particle.duration}s`,
                    }}
                  />
                ))}
              </div>

              {/* 背景光晕 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-[#F5A623]/[0.02] blur-3xl pointer-events-none"></div>

              {/* L1 核心蜂巢 3×3 - 现在使用动态 HiveGrid */}
              <HiveGrid
                tiles={hiveTiles}
                onUserClick={handleGridUserClick}
              />

            </div>

            {/* 把人数和宏观按钮移出星环以防遮挡 */}
            <div className="w-full flex flex-col items-center mb-8 z-20">
              {/* L2 人数统计 */}
              <div
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-md transition-colors duration-500 shadow-md"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex -space-x-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full border border-[#111]"
                      style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.3)' }}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                  {ambientCount > 0 ? `+${ambientCount} near ${currentLocation}` : `Searching...`}
                </span>
              </div>

              {/* 缩放进入宏观视角的按钮 */}
              <button
                onClick={() => setViewMode('global')}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/5 text-zinc-500 hover:text-[#F5A623] hover:border-[#F5A623]/30 transition-all group active:scale-95"
              >
                <Maximize2 size={12} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">{t('nav.global')} Hive</span>
              </button>
            </div>

            {/* 计时器环 - Shrinked */}
            <div 
              className={clsx("relative flex flex-col items-center mt-0 group", !isFocusing && "cursor-pointer")} 
              onClick={() => { if (!isFocusing) setActiveSheet('timer'); }}
            >
              <div className={clsx("absolute inset-0 rounded-full blur-[35px] transition-all duration-1000", isFocusing ? "bg-[#F5A623]/20 scale-110" : "bg-zinc-900/50 scale-100")}></div>
              <div className="relative w-[230px] h-[230px] rounded-full flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 230 230">
                  <circle cx="115" cy="115" r="111" className="stroke-zinc-900" strokeWidth="4" fill="none" />
                  <circle
                    cx="115" cy="115" r="111"
                    className="transition-all duration-1000"
                    style={{ stroke: isFocusing ? 'var(--accent)' : 'var(--text-secondary)' }}
                    strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="697"
                    strokeDashoffset={697 - (timeLeft / maxTime) * 697}
                  />
                </svg>
                <div className="text-center z-10 flex flex-col items-center relative">
                  <div className={clsx(
                    "text-3xl font-black tracking-tighter mb-1 transition-all duration-300",
                    isFocusing ? "scale-110 text-white" : "text-zinc-400"
                  )}>
                    {formatTime(timeLeft)}
                  </div>
                  
                  {/* 状态文字容器：确保文字绝对居中 */}
                  <div className="relative inline-flex items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 opacity-40">
                      {isFocusing ? t('timer.deep_work') : t('timer.ready_to_focus')}
                    </span>
                    
                    {/* 图标绝对定位在文字右侧，相对于容器右侧偏移，不干扰文字中轴线 */}
                    {!isFocusing && (
                      <Clock size={10} className="absolute -right-4 text-zinc-500 opacity-40" />
                    )}
                  </div>
                </div>

                {/* 星火奖励：独立层定位，彻底解决闪跳问题 */}
                {sparkAward !== null && (
                  <div className="absolute inset-0 z-[60] flex justify-center pointer-events-none">
                    <div className={clsx(
                      "mt-14 px-4 py-1.5 rounded-full flex items-center gap-2 transition-all duration-1000 h-fit",
                      "bg-[var(--accent)]/10 border border-[var(--accent)]/20 shadow-[0_8px_24px_rgba(var(--accent-rgb),0.3)] backdrop-blur-sm",
                      sparkFadeOut ? "opacity-0 -translate-y-2 scale-95" : "opacity-100 animate-in fade-in slide-in-from-bottom-4"
                    )}>
                      <Flame size={12} className="text-[var(--accent)] animate-pulse" />
                      <span className="text-[10px] font-black tracking-widest text-[var(--accent)] whitespace-nowrap">
                        +{sparkAward} {t('profile.plus_sparks', { count: 0 }).replace('0', '').trim()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* 底部悬浮控制底座 */}
          <div className="absolute bottom-0 w-full pt-10 pb-12 px-8 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent flex items-center justify-center z-20">
            <div className="relative flex items-center justify-center">
              {/* 长按进度环 */}
              {activeSessionId && (
                <svg className="absolute w-[100px] h-[100px] -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="46"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="50" cy="50" r="46"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="289"
                    strokeDashoffset={289 - (holdProgress / 100) * 289}
                    className="transition-all duration-75"
                    style={{ filter: 'drop-shadow(0 0 5px var(--accent))' }}
                  />
                </svg>
              )}

              <button
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className={clsx(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl z-20 relative overflow-hidden select-none",
                  isFocusing
                    ? "bg-zinc-900 border-2 border-zinc-800 text-zinc-400"
                    : "text-black hover:scale-105 active:scale-95 shadow-lg"
                )}
                style={{
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  touchAction: 'manipulation',
                  backgroundColor: isFocusing ? undefined : 'var(--accent)',
                  boxShadow: isFocusing ? undefined : '0 10px 30px rgba(var(--accent-rgb), 0.3)'
                }}
              >
                {/* 长按时的背景填充效果 */}
                {holdProgress > 0 && (
                  <div 
                    className="absolute inset-0 bg-white/10" 
                    style={{ height: `${holdProgress}%`, top: 'auto' }}
                  />
                )}
                
                {isFocusing ? <Square size={28} className="fill-current" /> : <Play size={32} className="ml-1 fill-current" />}
              </button>

              {/* 收到轻推或状态提示 */}
              {activeSessionId && isFocusing && <div className="absolute bottom-[-10px] w-24 h-1 bg-[#F5A623] blur-xl opacity-30"></div>}
            </div>
          </div>

          {/* 轻推收信时的全屏强烈橙色脉冲光效 */}
          {nudgeFlash && (
            <div className="absolute inset-0 z-[999] pointer-events-none animate-in fade-in zoom-in duration-300">
               <div className="absolute inset-0 border-[8px] border-[#F5A623] rounded-[48px] opacity-80 shadow-[inset_0_0_120px_rgba(245,166,35,0.7)] animate-pulse"></div>
            </div>
          )}

          {/* Sheets */}
          <AppSheets
            activeSheet={activeSheet} setActiveSheet={setActiveSheet}
            subjects={subjects} setCurrentSubject={setCurrentSubject}
            setCurrentLocation={setCurrentLocation}
            timeLeft={timeLeft} handleTimeSelect={handleTimeSelect}
            squads={squads} bonds={bonds} userId={userId || ''} hiveTiles={hiveTiles}
            handleCreateSquad={handleCreateSquad} handleLeaveSquad={handleLeaveSquad}
            handleDisbandSquad={handleDisbandSquad} showAlert={showAlert}
            sendNudge={sendNudge} handleBlock={handleBlock}
            theme={theme} setTheme={setTheme}
            userProfile={userProfile} handleUpdateProfile={handleUpdateProfile}
            handleSignOut={handleSignOut} isAuthenticated={isAuthenticated}
            trialStatus={trialStatus} setUserProfile={setUserProfile}
          />


          {/* Custom Modal for Alerts/Confirms inside the mobile frame */}
          <CustomModal
            isOpen={modalConfig.isOpen}
            title={modalConfig.title}
            message={modalConfig.message}
            type={modalConfig.type}
            onConfirm={() => {
              modalConfig.onConfirm?.();
              setModalConfig(prev => ({ ...prev, isOpen: false }));
            }}
            onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
          />

          {/* Grid Interaction Modal */}
          <InteractionModal
            user={interactionUser}
            bonds={bonds}
            onClose={() => setInteractionUser(null)}
            onCreateBond={handleCreateBond}
            onNudge={sendNudge}
          />
        </div>
      )}
    </div>
  );
}
