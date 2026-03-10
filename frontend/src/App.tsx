import { useState, useEffect, useMemo } from 'react';
import { Play, Square, Settings, Users, Flame, ChevronLeft, MapPin, BookOpen, Clock, Zap, Maximize2, UserPlus } from 'lucide-react';
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
import type { Subject, Squad, BondEnriched } from './api/types';
import { useHiveSocket } from './hooks/useHiveSocket';
import { SubscriptionSheet } from './components/SubscriptionSheet';
import { subscriptionService } from './api';
import { AuthPage } from './components/AuthPage';
import { CustomModal } from './components/CustomModal';



// 模拟网络房间中的核心小组同伴 (L1 Squad: 9人)
const SQUAD_MEMBERS = [
  { id: 'f56b6938-72c6-4d0d-9b1e-e0921e25e97a', name: 'Alex', status: 'focus', subject: 'GRE', avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: '7a1b9204-629a-4e2b-8a8b-3e5f7a12b3c4', name: 'Mia', status: 'break', subject: 'Design', avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: 'a3b2c1d0-e4f5-46a7-b8c9-d0e1f2a3b4c5', name: 'David', status: 'focus', subject: 'Code', avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: 'd1e2f3a4-b5c6-47d8-9e0f-1a2b3c4d5e6f', name: 'Emma', status: 'offline', subject: '', avatar: 'https://i.pravatar.cc/150?u=4' },
  { id: 'c1d2e3f4-a5b6-47c8-9d0e-1f2a3b4c5d6e', name: 'Chris', status: 'focus', subject: 'Math', avatar: 'https://i.pravatar.cc/150?u=5' },
  { id: 'b1c2d3e4-f5a6-47b8-9c0d-1e2f3a4b5c6d', name: 'Zoe', status: 'focus', subject: 'Reading', avatar: 'https://i.pravatar.cc/150?u=6' },
  { id: 'a1b2c3d4-e5f6-47a8-9b0c-1d2e3f4a5b6c', name: 'Leo', status: 'focus', subject: 'Physics', avatar: 'https://i.pravatar.cc/150?u=7' },
  { id: '91a2b3c4-d5e6-4798-8a9b-0c1d2e3f4a5b', name: 'Nina', status: 'break', subject: 'Art', avatar: 'https://i.pravatar.cc/150?u=8' },
  { id: '8192a3b4-c5d6-4789-7a8b-9c0d1e2f3a4b', name: 'Sam', status: 'focus', subject: 'Lang', avatar: 'https://i.pravatar.cc/150?u=9' },
];

type SheetType = 'subject' | 'location' | 'timer' | 'squad' | 'bonds' | 'theme' | 'profile' | 'subscription' | null;



export default function App() {
  const [isFocusing, setIsFocusing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [maxTime, setMaxTime] = useState(25 * 60);

  // 状态控制
  const [viewMode, setViewMode] = useState<'squad' | 'global'>('squad');
  const [currentSubject, setCurrentSubject] = useState('Code');
  const [currentLocation, setCurrentLocation] = useState('Global');
  const [currentSquad, setCurrentSquad] = useState('Global Hive');

  // UI 控制
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [theme, setTheme] = useState<Theme>('classic');
  const [lastNudge, setLastNudge] = useState<string | null>(null);

  // 用户与会话状态
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('hive_user_id'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('hive_token'));

  // TEMPORARY: Expose userId for backend syncing
  useEffect(() => {
    if (userId) {
      console.log(`ACTIVE_HIVE_USER_ID: ${userId}`);
    }
  }, [userId]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [bonds, setBonds] = useState<BondEnriched[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [interactionUser, setInteractionUser] = useState<any | null>(null);

  // 用户个人资料
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'David',
    avatar: 'https://i.pravatar.cc/150?u=my-unique-id',
    bio: 'Coding the future, one hexagon at a time. 🐝',
    city: 'Beijing',
    goal: 120,
    totalFocus: 45,
    sparks: 128,
    trialStartAt: new Date().toISOString(),
  });
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: () => { },
  });

  const showAlert = (title: string, message: string) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: 'alert',
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm: () => {
        onConfirm();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

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
    if (!isAuthenticated || !userId) return;

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
            city: profile.city || '',
            goal: profile.daily_goal_mins,
            totalFocus: profile.total_focus_mins,
            sparks: profile.total_sparks,
            trialStartAt: profile.trial_start_at,
            subscriptionEndAt: profile.subscription_end_at,
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

        if (fetchedSquads.length > 0) {
          setCurrentSquad(fetchedSquads[0].name);
        } else {
          setCurrentSquad('Global Hive');
        }
      } catch (err: any) {
        console.error('Failed to init data:', err);
        if (err.message.includes('401')) {
          handleSignOut();
        }
      }
    };
    initData();
  }, [userId, isAuthenticated]);


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

  const { messages, sendNudge } = useHiveSocket(userId || '');

  // 监听 WebSocket 消息处理“轻推”视觉反馈
  useEffect(() => {
    if (!userId) return;
    const latest = messages[messages.length - 1];
    if (latest?.type === 'NUDGE_RECEIVED') {
      setLastNudge(latest.sender_id || 'Someone');
      const timer = setTimeout(() => setLastNudge(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [messages, userId]);

  // 处理资料更新
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!userId) return;
    try {
      const resp = await userService.updateProfile(userId, {
        name: updates.name,
        bio: updates.bio,
        city: updates.city,
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

  const handleLeaveSquad = async (squadId: string) => {
    if (!userId) return;
    showConfirm('Leave Hive', 'Are you sure you want to leave this Hive?', async () => {
      try {
        await socialService.leaveSquad(userId, squadId);
        setSquads([]);
        setCurrentSquad('Global Hive');
        setActiveSheet(null);
      } catch (err: any) {
        showAlert('Error', err.message || 'Failed to leave squad.');
      }
    });
  };

  const handleDisbandSquad = async (squadId: string) => {
    if (!userId) return;
    showConfirm('Disband Hive', 'Are you sure you want to DISBAND this Hive forever?', async () => {
      try {
        await socialService.disbandSquad(userId, squadId);
        setSquads([]);
        setCurrentSquad('Global Hive');
        setActiveSheet(null);
      } catch (err: any) {
        showAlert('Error', err.message || 'Failed to disband squad.');
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
    } catch (err: any) {
      showAlert('Error', err.message || 'Create squad failed.');
    }
  };

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    if (!userId) return;
    setIsSubscribing(true);
    try {
      const resp = await subscriptionService.subscribe(userId, plan);
      if (resp.status === 'success') {
        const profile = await userService.getProfile(userId);
        setUserProfile(prev => ({
          ...prev,
          subscriptionEndAt: profile.subscription_end_at
        }));
        setActiveSheet(null);
        showAlert('Success', `You are now subscribed to Hive ${plan === 'monthly' ? 'Monthly' : 'Annual'}.`);
      }
    } catch (err) {
      console.error('Subscription failed:', err);
      showAlert('Error', 'Subscription failed. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const getTrialDaysRemaining = () => {
    if (userProfile.subscriptionEndAt && new Date(userProfile.subscriptionEndAt) > new Date()) {
      return Infinity;
    }
    const start = new Date(userProfile.trialStartAt);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diff = end.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };




  const handleBlock = async (blockedId: string) => {
    if (!userId) return;
    showConfirm('Block User', 'Are you sure you want to block this user? They will no longer be able to interact with you.', async () => {
      try {
        await socialService.block(userId, blockedId);
        const fetchedBonds = await socialService.getBonds(userId);
        setBonds(fetchedBonds);
        showAlert('Blocked', 'User blocked successfully.');
      } catch (err) {
        console.error('Block failed:', err);
        showAlert('Error', 'Failed to block user.');
      }
    });
  };

  const handleCreateBond = async (targetId: string) => {
    if (!userId) return;
    try {
      await socialService.createBond(userId, targetId);
      showAlert('Success', 'Bond request sent successfully!');
      // Refresh bonds
      const fetchedBonds = await socialService.getBonds(userId);
      setBonds(fetchedBonds);
    } catch (err: any) {
      console.error('Add bond failed:', err);
      // Ensure we display a string and try to get the most human-readable message
      const errorMsg = err.message || (typeof err === 'string' ? err : 'Failed to send bond request.');
      showAlert('Error', errorMsg);
    }
  };

  const handleGridUserClick = (member: any) => {
    if (member.status === 'offline') return;
    setInteractionUser(member);
  };

  const handleSignOut = () => {
    localStorage.removeItem('hive_token');
    localStorage.removeItem('hive_user_id');
    setIsAuthenticated(false);
    setUserId(null);
  };

  const handleAuthSuccess = (uId: string, token: string) => {
    localStorage.setItem('hive_token', token);
    localStorage.setItem('hive_user_id', uId);
    setUserId(uId);
    setIsAuthenticated(true);
  };

  const toggleFocus = async () => {
    if (!userId) return;
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
            city: updatedProfile.city || '',
            goal: updatedProfile.daily_goal_mins,
            totalFocus: updatedProfile.total_focus_mins,
            sparks: updatedProfile.total_sparks,
            trialStartAt: updatedProfile.trial_start_at,
            subscriptionEndAt: updatedProfile.subscription_end_at,
          });
        }
        setIsFocusing(false);
        setActiveSessionId(null);
      }
    } catch (err: any) {
      if (err.response?.status === 402) {
        setActiveSheet('subscription');
      } else {
        console.error('Focus toggle failed:', err);
        showAlert('Error', 'Failed to toggle focus session.');
      }
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
      {!isAuthenticated ? (
        <AuthPage onSuccess={handleAuthSuccess} />
      ) : (
        /* 模拟 iOS 设备屏幕框 */
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

          {/* 1.5 试用期提醒条 */}
          {getTrialDaysRemaining() !== Infinity && getTrialDaysRemaining() <= 3 && (
            <div
              className="absolute top-28 left-6 right-6 z-20 px-4 py-2 rounded-2xl border flex items-center justify-between backdrop-blur-md animate-in slide-in-from-top-4"
              style={{
                backgroundColor: 'rgba(var(--accent-rgb), 0.1)',
                borderColor: 'rgba(var(--accent-rgb), 0.2)'
              }}
            >
              <div className="flex items-center gap-2">
                <Zap size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                  {getTrialDaysRemaining() === 0 ? 'Trial Expired' : `${getTrialDaysRemaining()} Days Trial Left`}
                </span>
              </div>
              <button
                onClick={() => setActiveSheet('subscription')}
                className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                Subscribe
              </button>
            </div>
          )}


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
                        onClick={() => handleGridUserClick(member)}
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

                          {/* 悬停时的微小添加标识 */}
                          {!isOffline && (
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <UserPlus size={12} className="text-[#F5A623]" />
                            </div>
                          )}
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
            title="Hive HQ"
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
            title="Digital Bonds"
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
              userId={userId || ''}
              profile={userProfile}
              onUpdate={handleUpdateProfile}
              onSignOut={handleSignOut}
            />
          </Sheet>

          <Sheet
            isOpen={activeSheet === 'subscription'}
            onClose={() => setActiveSheet(null)}
            title="Hive Membership"
          >
            <SubscriptionSheet
              onSubscribe={handleSubscribe}
              isLoading={isSubscribing}
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
                  <img src={interactionUser.avatar} alt={interactionUser.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{interactionUser.name}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-8">{interactionUser.subject || 'Relaxing'}</p>

                <div className="flex w-full flex-col gap-3">
                  <button
                    onClick={() => {
                      handleCreateBond(interactionUser.id);
                      setInteractionUser(null);
                    }}
                    className="w-full py-4 rounded-2xl bg-[var(--accent)] text-black text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                    style={{ boxShadow: '0 8px 20px rgba(var(--accent-rgb), 0.3)' }}
                  >
                    申请好友
                  </button>
                  <button
                    onClick={() => {
                      sendNudge(interactionUser.id);
                      setInteractionUser(null);
                    }}
                    className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all"
                  >
                    轻推
                  </button>
                </div>

                <button
                  onClick={() => setInteractionUser(null)}
                  className="mt-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-zinc-400 p-2"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
