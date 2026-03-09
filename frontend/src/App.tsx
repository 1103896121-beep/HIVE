import { useState, useEffect, useMemo } from 'react';
import { Play, Square, Settings, Users, Flame, ChevronLeft, MapPin, BookOpen, Clock, Zap, Maximize2 } from 'lucide-react';
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
import { userService, focusService, socialService } from './api';
import type { Subject, Squad, Bond } from './api/types';
import { useHiveSocket } from './hooks/useHiveSocket';



// 模拟网络房间中的核心小组同伴 (L1 Squad: 9人)
const SQUAD_MEMBERS = [
  { id: 1, name: 'Alex', status: 'focus', subject: 'GRE', avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: 2, name: 'Mia', status: 'break', subject: 'Design', avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: 3, name: 'David', status: 'focus', subject: 'Code', avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: 4, name: 'Emma', status: 'offline', subject: '', avatar: 'https://i.pravatar.cc/150?u=4' },
  { id: 5, name: 'Chris', status: 'focus', subject: 'Math', avatar: 'https://i.pravatar.cc/150?u=5' },
  { id: 6, name: 'Zoe', status: 'focus', subject: 'Reading', avatar: 'https://i.pravatar.cc/150?u=6' },
  { id: 7, name: 'Leo', status: 'focus', subject: 'Physics', avatar: 'https://i.pravatar.cc/150?u=7' },
  { id: 8, name: 'Nina', status: 'break', subject: 'Art', avatar: 'https://i.pravatar.cc/150?u=8' },
  { id: 9, name: 'Sam', status: 'focus', subject: 'Lang', avatar: 'https://i.pravatar.cc/150?u=9' },
];

type SheetType = 'subject' | 'location' | 'timer' | 'squad' | 'bonds' | 'theme' | 'profile' | null;



export default function App() {
  const [isFocusing, setIsFocusing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [maxTime, setMaxTime] = useState(25 * 60);

  // 状态控制
  const [viewMode, setViewMode] = useState<'squad' | 'global'>('squad');
  const [currentSubject, setCurrentSubject] = useState('Code');
  const [currentLocation, setCurrentLocation] = useState('Global');
  const [currentSquad, setCurrentSquad] = useState('Hive #402');

  // UI 控制
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [theme, setTheme] = useState<Theme>('classic');
  const [lastNudge, setLastNudge] = useState<string | null>(null);

  // 用户与会话状态
  const [userId] = useState<string>('00000000-0000-0000-0000-000000000001'); // 演示用固定 UUID
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // 用户个人资料
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'David',
    avatar: 'https://i.pravatar.cc/150?u=my-unique-id',
    bio: 'Coding the future, one hexagon at a time. 🐝',
    goal: 120,
    totalFocus: 45,
    sparks: 128
  });

  // Calculate a dynamic but consistent number of ambient users based on the location name
  const dynamicAmbientCount = useMemo(() => {
    if (currentLocation === 'Global') return 24302; // Global default from map

    // Simple string hash to generate a consistent pseudo-random number
    let hash = 0;
    for (let i = 0; i < currentLocation.length; i++) {
      hash = ((hash << 5) - hash) + currentLocation.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    // Generate a number between 12 and 1500 depending on the hash
    return Math.floor(Math.abs(hash) % 1488) + 12;
  }, [currentLocation]);

  // 初始化加载
  useEffect(() => {
    const initData = async () => {
      try {
        // 加载科目
        const fetchedSubjects = await focusService.getSubjects();
        setSubjects(fetchedSubjects);

        // 加载个人资料
        const profile = await userService.getProfile(userId);
        if (profile) {
          setUserProfile({
            name: profile.name,
            avatar: profile.avatar_url || 'https://i.pravatar.cc/150?u=my-unique-id',
            bio: profile.bio || '',
            goal: profile.daily_goal_mins,
            totalFocus: profile.total_focus_mins,
            sparks: profile.total_sparks
          });
          setTheme(profile.theme_preference as any);
        }

        // 加载社交数据
        const [fetchedSquads, fetchedBonds] = await Promise.all([
          socialService.getSquads(userId),
          socialService.getBonds(userId)
        ]);
        setSquads(fetchedSquads);
        setBonds(fetchedBonds);
      } catch (err) {
        console.error('Failed to init data:', err);
      }
    };
    initData();
  }, [userId]);


  // 同步主题到 DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);


  // 格式化时间
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 模拟倒计时
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isFocusing && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsFocusing(false);
    }
    return () => clearInterval(timer);
  }, [isFocusing, timeLeft]);

  const { messages, sendNudge } = useHiveSocket(userId);

  // 监听 WebSocket 消息处理“轻推”视觉反馈
  useEffect(() => {
    const latest = messages[messages.length - 1];
    if (latest?.type === 'NUDGE_RECEIVED') {
      setLastNudge(latest.sender_id || 'Someone');
      const timer = setTimeout(() => setLastNudge(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // 处理资料更新
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const resp = await userService.updateProfile(userId, {
        name: updates.name,
        bio: updates.bio,
        avatar_url: updates.avatar,
        daily_goal_mins: updates.goal,
        theme_preference: theme
      });
      if (resp) {
        setUserProfile(prev => ({ ...prev, ...updates }));
      }
    } catch (err) {
      console.error('Update profile failed:', err);
    }
  };

  const handleJoinSquad = async (inviteCode: string) => {
    try {
      const squad = await socialService.joinSquad(userId, inviteCode);
      setSquads(prev => [...prev.filter(s => s.id !== squad.id), squad]);
      setCurrentSquad(squad.name);
    } catch (err) {
      console.error('Join squad failed:', err);
    }
  };

  const handleCreateSquad = async (name: string) => {
    try {
      const squad = await socialService.createSquad(userId, name);
      setSquads(prev => [...prev, squad]);
      setCurrentSquad(squad.name);
    } catch (err) {
      console.error('Create squad failed:', err);
    }
  };

  const handleReport = async (targetId: string, type: 'USER' | 'SQUAD') => {
    const reason = window.prompt(`Reason for reporting this ${type.toLowerCase()}:`);
    if (!reason) return;
    try {
      await socialService.report(userId, targetId, type, reason);
      alert('Report submitted. Our team will review it shortly.');
    } catch (err) {
      console.error('Report failed:', err);
    }
  };

  const handleBlock = async (blockedId: string) => {
    if (!window.confirm('Are you sure you want to block this user? They will no longer be able to interact with you.')) return;
    try {
      await socialService.block(userId, blockedId);
      // 刷新羁绊列表以过滤掉已屏蔽的用户
      const fetchedBonds = await socialService.getBonds(userId);
      setBonds(fetchedBonds);
      alert('User blocked successfully.');
    } catch (err) {
      console.error('Block failed:', err);
    }
  };

  const toggleFocus = async () => {
    try {
      if (!isFocusing) {
        // 开始专注
        const subject = subjects.find(s => s.name === currentSubject);
        const session = await focusService.startSession(userId, subject?.id || 1);
        setActiveSessionId(session.id);
        setIsFocusing(true);
      } else {
        // 结束专注
        if (activeSessionId) {
          const durationMins = Math.floor((maxTime - timeLeft) / 60);
          await focusService.endSession(activeSessionId, durationMins);

          // 更新本地资料统计
          const updatedProfile = await userService.getProfile(userId);
          setUserProfile({
            name: updatedProfile.name,
            avatar: updatedProfile.avatar_url || userProfile.avatar,
            bio: updatedProfile.bio || '',
            goal: updatedProfile.daily_goal_mins,
            totalFocus: updatedProfile.total_focus_mins,
            sparks: updatedProfile.total_sparks
          });
        }
        setIsFocusing(false);
        setActiveSessionId(null);
      }
    } catch (err) {
      console.error('Focus toggle failed:', err);
    }
  };

  const handleTimeSelect = (mins: number) => {
    const secs = mins * 60;
    setTimeLeft(secs);
    setMaxTime(secs);
    setActiveSheet(null);
  };

  // Generate particles only when the dynamicAmbientCount changes
  const ambientParticles = useMemo(() => {
    const count = Math.min(dynamicAmbientCount, 150); // limit to 150
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radiusBase = 130 + Math.random() * 40;
      const x = Math.cos(angle) * radiusBase + 170;
      const y = Math.sin(angle) * radiusBase + 170;
      const size = 2 + Math.random() * 3;
      const opacity = 0.15 + Math.random() * 0.25;
      const delay = Math.random() * 3;
      const duration = 2 + Math.random() * 2;
      return { id: `amb-${i}`, x, y, size, opacity, delay, duration };
    });
  }, [dynamicAmbientCount]);

  return (
    <div className="flex h-screen items-center justify-center bg-black/95">
      {/* 模拟 iOS 设备屏幕框 */}
      <div
        className="relative w-full max-w-[400px] h-full sm:h-[850px] sm:border-[8px] border-zinc-900 sm:rounded-[48px] overflow-hidden shadow-2xl flex flex-col font-sans transition-colors duration-500"
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
              {currentSquad} <ChevronLeft size={14} className="-rotate-90 text-zinc-600" />
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

          {/* 选择器药丸组 (Subject & Location) */}
          <div className="w-full flex gap-2 mb-8 mt-2">
            <button
              onClick={() => setActiveSheet('subject')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/5 text-zinc-300 hover:bg-white/10 active:scale-95 transition-all"
            >
              <BookOpen size={14} className="text-[#F5A623]" />
              <span className="text-xs font-bold uppercase tracking-wider">{currentSubject}</span>
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

            {/* L1 核心蜂窝 3×3 */}
            <div className="grid grid-cols-3 gap-x-1 gap-y-0 w-fit relative z-10 transition-transform duration-700">
              {SQUAD_MEMBERS.map((member, index) => {
                const isFocus = member.status === 'focus';
                const isOffline = member.status === 'offline';
                const offsetClass = index % 3 === 1 ? 'translate-y-[34px]' : '';

                return (
                  <div key={member.id} className={clsx("flex flex-col items-center", offsetClass)}>
                    <div
                      onClick={() => sendNudge(member.id.toString())}
                      className={clsx(
                        "w-[66px] h-[76px] hex-clip relative group transition-all duration-500 cursor-pointer active:scale-95",
                        isFocus ? "bg-[#F5A623] breathing" : isOffline ? "bg-zinc-900 border border-zinc-800 opacity-40" : "bg-zinc-800"
                      )}
                    >
                      <div className="absolute inset-[2px] hex-clip bg-[#111] overflow-hidden">
                        {!isOffline ? (
                          <img src={member.avatar} alt={member.name} className={clsx("w-full h-full object-cover transition-opacity", !isFocus && "opacity-50 grayscale")} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            <Users size={18} />
                          </div>
                        )}
                        {isFocus && <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(var(--accent-rgb), 0.4), transparent)' }}></div>}

                        {/* 悬浮 Nudge 提示 */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <Zap size={14} className="text-[#F5A623] animate-bounce" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 text-center">
                      <div className="text-[10px] font-bold text-zinc-300">{member.name}</div>
                      <div className={clsx("text-[7px] font-black uppercase tracking-widest", isFocus ? "text-[#F5A623]" : "text-zinc-600")}>
                        {isFocus ? member.subject : (isOffline ? 'OFF' : 'BREAK')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

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
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">+{dynamicAmbientCount} near {currentLocation}</span>
            </div>


            {/* 缩放进入宏观视角的按钮 */}
            <button
              onClick={() => setViewMode('global')}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/5 text-zinc-500 hover:text-[#F5A623] hover:border-[#F5A623]/30 transition-all group active:scale-95"
            >
              <Maximize2 size={12} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Explore Global Hive</span>
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
                  {isFocusing ? "Deep Work" : "Ready to focus"}
                  {!isFocusing && <Clock size={12} className="text-zinc-700" />}
                </div>
                {isFocusing && (
                  <div className="mt-4 px-4 py-1.5 rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid rgba(var(--accent-rgb), 0.2)' }}>
                    <Flame size={12} style={{ color: 'var(--accent)' }} />
                    <span className="text-[10px] font-black tracking-widest" style={{ color: 'var(--accent)' }}>+12 Sparks</span>
                  </div>

                )}
              </div>
            </div>
          </div>
        </div>

        {/* 底部悬浮控制底座 */}
        <div className="absolute bottom-0 w-full pt-10 pb-12 px-8 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent flex justify-center z-20">
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
          {isFocusing && <div className="absolute bottom-6 w-full h-1 bg-[#F5A623] blur-xl opacity-30"></div>}
        </div>

        {/* Sheets */}
        <Sheet
          isOpen={activeSheet === 'subject'}
          onClose={() => setActiveSheet(null)}
          title="Select Subject"
        >
          <SubjectPicker
            subjects={subjects}
            onSelect={(s) => { setCurrentSubject(s); setActiveSheet(null); }}
          />
        </Sheet>

        <Sheet
          isOpen={activeSheet === 'location'}
          onClose={() => setActiveSheet(null)}
          title="Choose Location"
        >
          <LocationPicker onSelect={(l) => { setCurrentLocation(l); setActiveSheet(null); }} />
        </Sheet>

        <Sheet
          isOpen={activeSheet === 'timer'}
          onClose={() => setActiveSheet(null)}
          title="Focus Duration"
        >
          <TimerSettings current={timeLeft} onSelect={handleTimeSelect} />
        </Sheet>

        <Sheet
          isOpen={activeSheet === 'squad'}
          onClose={() => setActiveSheet(null)}
          title="Join a Hive"
        >
          <SquadPortal
            squads={squads}
            onJoin={handleJoinSquad}
            onCreate={handleCreateSquad}
            onReport={handleReport}
          />
        </Sheet>

        <Sheet
          isOpen={activeSheet === 'bonds'}
          onClose={() => setActiveSheet(null)}
          title="Digital Bonds"
        >
          <BondsPortal
            bonds={bonds}
            userId={userId}
            onNudge={sendNudge}
            onReport={handleReport}
            onBlock={handleBlock}
          />
        </Sheet>

        <Sheet
          isOpen={activeSheet === 'theme'}
          onClose={() => setActiveSheet(null)}
          title="Personalize Hive"
        >
          <ThemePicker current={theme} onSelect={(t) => { setTheme(t); }} />
        </Sheet>

        <Sheet
          isOpen={activeSheet === 'profile'}
          onClose={() => setActiveSheet(null)}
          title="Personal Profile"
        >
          <ProfilePortal
            userId={userId}
            profile={userProfile}
            onUpdate={handleUpdateProfile}
          />
        </Sheet>




      </div>
    </div>
  );
}
