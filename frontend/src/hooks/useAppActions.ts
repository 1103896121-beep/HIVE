import { useMemo } from 'react';
import type { TFunction } from 'i18next';
import { userService, socialService } from '../api';
import type { UserProfile } from '../components/ProfilePortal';
import type { Squad, BondEnriched, HiveMatchTile } from '../api/types';
import type { SheetType } from '../components/AppSheets';
import type { InteractionUser } from '../components/InteractionModal';

interface AppActionProps {
  userId: string | null;
  theme: string;
  userProfile: UserProfile;
  ambientCount: number;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  setSquads: React.Dispatch<React.SetStateAction<Squad[]>>;
  setCurrentSquad: React.Dispatch<React.SetStateAction<string>>;
  setActiveSheet: React.Dispatch<React.SetStateAction<SheetType>>;
  setBonds: React.Dispatch<React.SetStateAction<BondEnriched[]>>;
  showAlert: (title: string, msg: string) => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  setInteractionUser: React.Dispatch<React.SetStateAction<InteractionUser | null>>;
  t: TFunction<"translation", undefined>;
}

export function useAppActions({
  userId, theme, userProfile, ambientCount,
  setUserProfile, setSquads, setCurrentSquad, setActiveSheet, setBonds,
  showAlert, showConfirm, setInteractionUser, t
}: AppActionProps) {

  const dynamicAmbientCount = useMemo(() => {
    return ambientCount || 0;
  }, [ambientCount]);

  const ambientParticles = useMemo(() => {
    const count = Math.min(dynamicAmbientCount, 150);
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radiusBase = 130 + Math.random() * 40;
      return { id: `amb-${i}`, x: Math.cos(angle) * radiusBase + 170, y: Math.sin(angle) * radiusBase + 170, size: 2 + Math.random() * 3, opacity: 0.15 + Math.random() * 0.25, delay: Math.random() * 3, duration: 2 + Math.random() * 2 };
    });
  }, [dynamicAmbientCount]);

  const getTrialDaysRemaining = () => {
    if (userProfile.subscriptionEndAt && new Date(userProfile.subscriptionEndAt) > new Date()) return Infinity;
    const start = new Date(userProfile.trialStartAt || Date.now());
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil((end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!userId) return;
    
    // 1. 乐观更新：立即更新本地状态，让 UI 秒变
    setUserProfile(prev => ({ ...prev, ...updates }));

    try {
      // 2. 映射字段并发送请求
      const { avatar, showLocation, ...rest } = updates;
      // 显式保留原始 updates 里的字段，防止被 rest 过滤掉不认识的字段
      const payload: Record<string, unknown> = { ...rest, theme_preference: theme };
      if (avatar !== undefined) payload.avatar_url = avatar;
      if (showLocation !== undefined) payload.show_location = showLocation;

      await userService.updateProfile(userId, payload as Partial<import('../api/types').Profile>);
      
      // 3. 静默后台同步最新数据（防止后端有额外逻辑如自动生成城市名）
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
    } catch (err) { 
      console.error('Update profile failed:', err); 
      // FIXME: 如果极度重要且失败频率高，此处应增加回退逻辑（从之前的 prev 恢复）
    }
  };

  const handleLeaveSquad = async (squadId: string) => {
    if (!userId) return;
    showConfirm(t('squad.leave'), t('squad.leave_confirm'), async () => {
      try {
        await socialService.leaveSquad(userId, squadId);
        setSquads([]); setCurrentSquad('Global Hive'); setActiveSheet(null);
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
        setSquads([]); setCurrentSquad('Global Hive'); setActiveSheet(null);
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
      setSquads([squad]); setCurrentSquad(squad.name);
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
        const fetchedBonds = await socialService.getBonds();
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
      const fetchedBonds = await socialService.getBonds();
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

  return {
    dynamicAmbientCount,
    ambientParticles,
    getTrialDaysRemaining,
    handleUpdateProfile,
    handleLeaveSquad,
    handleDisbandSquad,
    handleCreateSquad,
    handleBlock,
    handleCreateBond,
    handleGridUserClick
  };
}
