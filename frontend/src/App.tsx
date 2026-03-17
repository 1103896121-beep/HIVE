import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, X, Settings, Flame, ChevronLeft, MapPin, BookOpen, Clock, Zap, Maximize2 } from 'lucide-react';
import clsx from 'clsx';
import { Sheet } from './components/Sheet';
import { SubjectPicker } from './components/SubjectPicker';
import { LocationPicker } from './components/LocationPicker';
import { TimerSettings } from './components/TimerSettings';
import { SquadPortal } from './components/SquadPortal';
import { BondsPortal } from './components/BondsPortal';
import { ThemePicker } from './components/ThemePicker';
import type { Theme } from './components/ThemePicker';
import { ProfilePortal } from './components/ProfilePortal';
import type { UserProfile } from './components/ProfilePortal';
import { GlobalMap } from './components/GlobalMap';
import { HiveGrid } from './components/HiveGrid';
import { userService, socialService } from './api';
import type { HiveMatchTile } from './api/types';
import { useHiveSocket } from './hooks/useHiveSocket';
import { SubscriptionSheet } from './components/SubscriptionSheet';
import { AuthPage } from './components/AuthPage';
import { CustomModal } from './components/CustomModal';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useAppInit } from './hooks/useAppInit';
import { useTimer } from './hooks/useTimer';

interface InteractionUser {
  user_id: string;
  name: string;
  avatar_url?: string;
  subject?: string;
}



// Initial state for dynamic matching

type SheetType = 'subject' | 'location' | 'timer' | 'squad' | 'bonds' | 'theme' | 'profile' | 'subscription' | null;

interface ProfileUpdate {
    name?: string;
    bio?: string;
    city?: string;
    avatar_url?: string;
    theme_preference?: string;
    latitude?: number;
    longitude?: number;
    show_location?: boolean;
}

export default function App() {
  const { t } = useTranslation();
  const isScreenshotMode = useMemo(() => new URLSearchParams(window.location.search).get('screenshot') === 'true', []);

  const {
    userId, isAuthenticated, subjects, squads, bonds, hiveTiles, ambientCount, userProfile, theme, currentSquad,
    setTheme, setCurrentSquad, setUserProfile, setSquads, setBonds, setHiveTiles, setAmbientCount, handleSignOut, handleAuthSuccess
  } = useAppInit();

  const [currentSubject, setCurrentSubject] = useState('Coding');
  const [currentLocation, setCurrentLocation] = useState('Global');
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [viewMode, setViewMode] = useState<'squad' | 'global'>('squad');
  const [lastNudge, setLastNudge] = useState<string | null>(null);
  const [interactionUser, setInteractionUser] = useState<InteractionUser | null>(null);

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

  const { messages, sendNudge } = useHiveSocket(userId || '');

  useEffect(() => {
    if (!userId) return;
    const latest = messages[messages.length - 1];
    if (latest?.type === 'NUDGE_RECEIVED') {
      setLastNudge(latest.sender_id || 'Someone');
      const timer = setTimeout(() => setLastNudge(null), 3000);
      return () => clearTimeout(timer);
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
      return { isExpired: false, isPremium: true, daysLeft: 0 };
    }
    const start = new Date(userProfile.trialStartAt).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - start;
    return { isExpired: elapsed > sevenDaysMs, daysLeft: Math.max(0, Math.ceil((sevenDaysMs - elapsed) / (1000 * 60 * 60 * 24))), isPremium: false };
  }, [userProfile.trialStartAt, userProfile.subscriptionEndAt]);

  const dynamicAmbientCount = useMemo(() => {
    if (currentLocation === 'Global') return ambientCount || 24302; 
    let hash = 0;
    for (let i = 0; i < currentLocation.length; i++) {
        hash = ((hash << 5) - hash) + currentLocation.charCodeAt(i);
        hash |= 0;
    }
    return (Math.floor(Math.abs(hash) % 150)) + (ambientCount % 100);
  }, [currentLocation, ambientCount]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!userId) return;
    try {
      const { avatar, ...rest } = updates;
      const updateData: ProfileUpdate = {
        ...rest,
        avatar_url: avatar,
        theme_preference: theme,
      };
      
      await userService.updateProfile(userId, updateData);
      const freshProfile = await userService.getProfile(userId);
      if (freshProfile) {
        setUserProfile({
          name: freshProfile.name,
          avatar: freshProfile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + userId,
          bio: freshProfile.bio || '',
          city: freshProfile.city || '',
          totalFocus: freshProfile.total_focus_mins,
          sparks: freshProfile.total_sparks,
          trialStartAt: freshProfile.trial_start_at,
          subscriptionEndAt: freshProfile.subscription_end_at,
          latitude: freshProfile.latitude,
          longitude: freshProfile.longitude,
          showLocation: freshProfile.show_location,
        });
      }
    } catch (err) { console.error('Update profile failed:', err); }
  };

  const handleLeaveSquad = async (squadId: string) => {
    if (!userId) return;
    showConfirm(t('squad.leave'), t('squad.leave_confirm'), async () => {
      try {
        await socialService.leaveSquad(userId, squadId);
        setSquads([]);
        setCurrentSquad('Global Hive');
        setActiveSheet(null);
      } catch (err: unknown) { 
        const msg = err instanceof Error ? err.message : 'Failed to leave squad.';
        showAlert('Error', msg); 
      }
    });
  };

  const handleDisbandSquad = async (squadId: string) => {
    if (!userId) return;
    showConfirm(t('squad.disband'), t('squad.disband_confirm'), async () => {
      try {
        await socialService.disbandSquad(userId, squadId);
        setSquads([]);
        setCurrentSquad('Global Hive');
        setActiveSheet(null);
      } catch (err: unknown) { 
        const msg = err instanceof Error ? err.message : 'Failed to disband squad.';
        showAlert('Error', msg); 
      }
    });
  };

  const handleCreateSquad = async (name: string) => {
    if (!userId) return;
    try {
      const squad = await socialService.createSquad(userId, name);
      setSquads([squad]);
      setCurrentSquad(squad.name);
      setActiveSheet(null);
    } catch (err: unknown) { 
      const msg = err instanceof Error ? err.message : 'Create squad failed.';
      showAlert('Error', msg); 
    }
  };

  const handleBlock = async (blockedId: string) => {
    if (!userId) return;
    showConfirm(t('bonds.block'), t('bonds.block_confirm'), async () => {
      try {
        await socialService.block(userId, blockedId);
        const fetchedBonds = await socialService.getBonds(userId);
        setBonds(fetchedBonds);
        showAlert(t('bonds.block'), t('bonds.block_success'));
      } catch (err) { showAlert('Error', 'Failed to block user.'); }
    });
  };

  const handleCreateBond = async (targetId: string) => {
    if (!userId) return;
    try {
      await socialService.createBond(userId, targetId);
      showAlert(t('common.success'), t('bonds.request_sent'));
      const fetchedBonds = await socialService.getBonds(userId);
      setBonds(fetchedBonds);
    } catch (err: unknown) { 
      const msg = err instanceof Error ? err.message : 'Failed to send bond request.';
      showAlert('Error', msg); 
    }
  };

  const handleGridUserClick = (member: HiveMatchTile) => {
    if (member.status === 'offline') return;
    setInteractionUser({
      user_id: member.user_id,
      name: member.name || 'Anonymous',
      avatar_url: member.avatar_url,
      subject: member.subject
    });
  };

  const getTrialDaysRemaining = () => {
    if (userProfile.subscriptionEndAt && new Date(userProfile.subscriptionEndAt) > new Date()) return Infinity;
    const start = new Date(userProfile.trialStartAt);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil((end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  };

  const ambientParticles = useMemo(() => {
    const count = Math.min(dynamicAmbientCount, 150);
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radiusBase = 130 + Math.random() * 40;
      return { id: `amb-${i}`, x: Math.cos(angle) * radiusBase + 170, y: Math.sin(angle) * radiusBase + 170, size: 2 + Math.random() * 3, opacity: 0.15 + Math.random() * 0.25, delay: Math.random() * 3, duration: 2 + Math.random() * 2 };
    });
  }, [dynamicAmbientCount]);

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
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--accent)' }}></span>
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

            {/* 1.5 试用期提醒条 (Moved into scroll flow to prevent overlap) */}
            {getTrialDaysRemaining() !== Infinity && getTrialDaysRemaining() <= 3 && (
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
                    {getTrialDaysRemaining() === 0 ? t('trial.expired') : t('trial.left', { count: getTrialDaysRemaining() })}
                  </span>
                </div>
                <button
                  onClick={() => setActiveSheet('subscription')}
                  className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  {t('trial.subscribe', 'Subscribe')}
                </button>
              </div>
            )}

            {/* 选择器药丸组 (Subject & Location) */}
            <div className="w-full flex gap-2 mb-8 mt-2">
              <button
                onClick={() => setActiveSheet('subject')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/5 text-zinc-300 hover:bg-white/10 active:scale-95 transition-all"
              >
                <BookOpen size={14} className="text-[#F5A623]" />
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
            <div className="w-full flex flex-col items-center mb-10 relative">
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

              {/* L2 人数统计 */}
              <div
                className="mt-6 flex items-center gap-2 z-20 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-md transition-colors duration-500"
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
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">+{ambientCount} near {currentLocation}</span>
              </div>


              {/* 缩放进入宏观视角的按钮 */}
              <button
                onClick={() => setViewMode('global')}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/5 text-zinc-500 hover:text-[#F5A623] hover:border-[#F5A623]/30 transition-all group active:scale-95"
              >
                <Maximize2 size={12} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">{t('nav.global')} Hive</span>
              </button>
            </div>

            {/* 计时器环 */}
            <div className="relative flex flex-col items-center mt-2 cursor-pointer group" onClick={() => setActiveSheet('timer')}>
              <div className={clsx("absolute inset-0 rounded-full blur-[40px] transition-all duration-1000", isFocusing ? "bg-[#F5A623]/20 scale-110" : "bg-zinc-900/50 scale-100")}></div>
              <div className="relative w-[280px] h-[280px] rounded-full flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 280 280">
                  <circle cx="140" cy="140" r="136" className="stroke-zinc-900" strokeWidth="4" fill="none" />
                  <circle
                    cx="140" cy="140" r="136"
                    className="transition-all duration-1000"
                    style={{ stroke: isFocusing ? 'var(--accent)' : 'var(--text-secondary)' }}
                    strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="854"
                    strokeDashoffset={854 - (timeLeft / maxTime) * 854}
                  />

                </svg>
                <div className="text-center z-10 flex flex-col items-center">
                  <div className={clsx("text-6xl font-black font-mono tracking-tighter tabular-nums transition-colors duration-500", isFocusing ? "text-white" : "text-zinc-400 group-hover:text-zinc-200")}>
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-xs text-zinc-500 font-bold uppercase tracking-[0.3em] mt-3 flex items-center gap-1.5 font-sans">
                    {isFocusing ? t('timer.deep_work') : t('timer.ready_to_focus')}
                    {!isFocusing && <Clock size={12} className="text-zinc-700" />}
                  </div>
                  {isFocusing && (
                    <div className="mt-4 px-4 py-1.5 rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid rgba(var(--accent-rgb), 0.2)' }}>
                      <Flame size={12} style={{ color: 'var(--accent)' }} />
                      <span className="text-[10px] font-black tracking-widest" style={{ color: 'var(--accent)' }}>{t('profile.plus_sparks', { count: 12 })}</span>
                    </div>

                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 底部悬浮控制底座 */}
          <div className="absolute bottom-0 w-full pt-10 pb-12 px-8 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent flex items-center justify-center gap-8 z-20">
            {/* 只有在专注或暂停（session存在）时显示的“结束并保存”按钮 */}
            {activeSessionId && (
                <button
                onClick={() => handleEndFocus(true)}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-zinc-500 hover:text-red-400 hover:border-red-400/30 transition-all active:scale-90"
                title={t('common.end', 'End and Reset')}
                >
                <X size={20} />
                </button>
            )}

            <button
              onClick={toggleFocus}
              className={clsx(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl z-20",
                isFocusing
                  ? "bg-zinc-900 border-2 border-zinc-800 text-zinc-400 hover:text-white"
                  : "text-black hover:scale-105 active:scale-95 shadow-lg"
              )}
              style={{
                backgroundColor: isFocusing ? undefined : 'var(--accent)',
                boxShadow: isFocusing ? undefined : '0 10px 30px rgba(var(--accent-rgb), 0.3)'
              }}
            >
              {isFocusing ? <Square size={28} className="fill-current" /> : <Play size={32} className="ml-1 fill-current" />}
            </button>

            {/* 占位符以保持主按钮居中 */}
            {activeSessionId && <div className="w-12" />}
            
            {activeSessionId && isFocusing && <div className="absolute bottom-6 w-full h-1 bg-[#F5A623] blur-xl opacity-30"></div>}
          </div>

          {/* Sheets */}
          <Sheet
            isOpen={activeSheet === 'subject'}
            onClose={() => setActiveSheet(null)}
            title={t('sheets.select_subject')}
          >
            <SubjectPicker
              subjects={subjects}
              onSelect={(s) => { setCurrentSubject(s); setActiveSheet(null); }}
            />
          </Sheet>

          <Sheet
            isOpen={activeSheet === 'location'}
            onClose={() => setActiveSheet(null)}
            title={t('sheets.choose_location')}
          >
            <LocationPicker onSelect={(l) => { setCurrentLocation(l); setActiveSheet(null); }} />
          </Sheet>

          <Sheet
            isOpen={activeSheet === 'timer'}
            onClose={() => setActiveSheet(null)}
            title={t('sheets.focus_duration')}
          >
            <TimerSettings current={timeLeft} onSelect={handleTimeSelect} />
          </Sheet>

          <Sheet
            isOpen={activeSheet === 'squad'}
            onClose={() => setActiveSheet(null)}
            title={t('sheets.hive_hq')}
          >
            <SquadPortal
              squads={squads}
              bonds={bonds}
              userId={userId ?? ''}
              onCreate={handleCreateSquad}
              onLeave={handleLeaveSquad}
              onDisband={handleDisbandSquad}
              onAlert={showAlert}
            />
          </Sheet>

          <Sheet
            isOpen={activeSheet === 'bonds'}
            onClose={() => setActiveSheet(null)}
            title={t('sheets.digital_bonds')}
          >
            <BondsPortal
              bonds={bonds}
              userId={userId || ''}
              onNudge={sendNudge}
              onBlock={handleBlock}
              onAlert={showAlert}
            />
          </Sheet>

          <Sheet
            isOpen={activeSheet === 'theme'}
            onClose={() => setActiveSheet(null)}
            title={t('nav.settings')}
          >
            <div className="space-y-8 pb-8">
              <LanguageSwitcher />

              <div className="h-px w-full bg-white/5 mx-2"></div>

              <ThemePicker current={theme} onSelect={(t) => { setTheme(t); }} />
            </div>
          </Sheet>

          <Sheet
            isOpen={activeSheet === 'profile'}
            onClose={() => setActiveSheet(null)}
            title={t('sheets.personal_profile')}
          >
            <ProfilePortal
              userId={userId || ''}
              profile={userProfile}
              onUpdate={handleUpdateProfile}
              onSignOut={handleSignOut}
              onAlert={showAlert}
            />
          </Sheet>

          <Sheet
            isOpen={activeSheet === 'subscription' || (isAuthenticated && trialStatus.isExpired && !trialStatus.isPremium)}
            onClose={() => {
              // 强制逻辑：若试用过期且非会员，不允许手动关闭弹窗
              if (trialStatus.isExpired && !trialStatus.isPremium) return;
              setActiveSheet(null);
            }}
            title={t('sheets.hive_membership')}
          >
            <SubscriptionSheet
              userId={userId || ''}
              onSuccess={(expiresAt: string) => {
                setUserProfile(prev => ({ ...prev, subscriptionEndAt: expiresAt }));
              }}
              onClose={() => setActiveSheet(null)}
              onAlert={showAlert}
            />
          </Sheet>


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
          {interactionUser && (
            <div className="absolute inset-0 z-[110] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-[300px] bg-zinc-900 border border-white/10 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 border-2 border-white/5">
                  <img src={interactionUser.avatar_url || `https://i.pravatar.cc/150?u=${interactionUser.user_id}`} alt={interactionUser.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{interactionUser.name}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-8">
                  {interactionUser.subject 
                    ? (t(`subjects.${interactionUser.subject.toLowerCase()}`, interactionUser.subject) as string)
                    : (t('common.relaxing') as string)}
                </p>

                <div className="flex w-full flex-col gap-3">
                  <button
                    onClick={() => {
                      handleCreateBond(interactionUser.user_id);
                      setInteractionUser(null);
                    }}
                    className="w-full py-4 rounded-2xl bg-[var(--accent)] text-black text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                    style={{ boxShadow: '0 8px 20px rgba(var(--accent-rgb), 0.3)' }}
                  >
                    {t('bonds.request_bond')}
                  </button>
                  <button
                    onClick={() => {
                      sendNudge(interactionUser.user_id);
                      setInteractionUser(null);
                    }}
                    className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all"
                  >
                    {t('bonds.nudge')}
                  </button>
                </div>

                <button
                  onClick={() => setInteractionUser(null)}
                  className="mt-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-zinc-400 p-2"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
