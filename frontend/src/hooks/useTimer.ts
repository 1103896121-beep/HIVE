import { useState, useEffect, useCallback } from 'react';
import { focusService, userService, socialService } from '../api';
import { triggerHaptic } from '../utils/haptics';
import type { Subject, HiveMatchTile } from '../api/types';
import type { UserProfile } from '../components/ProfilePortal';

interface UseTimerProps {
    userId: string | null;
    subjects: Subject[];
    currentSubject: string;
    setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
    setHiveTiles: (tiles: HiveMatchTile[]) => void;
    onOpenSubscription: () => void;
    onComplete?: () => Promise<void>;
    showAlert: (title: string, message: string) => void;
}

/**
 * 播放倒计时结束铃声
 * NOTE: 使用 Web Audio API 合成简单的提示音
 * 避免加载外部音频文件（Capacitor WKWebView 中音频路径可能有问题）
 */
function playCompletionSound() {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

        // 播放多段长声音 (C5 → E5 → G5 → C6) 提高音量并加长时长
        const notes = [523.25, 659.25, 783.99, 1046.50, 523.25, 659.25, 783.99, 1046.50]; 
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle'; // triangle 更柔和但有穿透力
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(1.0, audioCtx.currentTime + i * 0.3); // 音量加大至 1.0
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.3 + 0.6); // 延长时间到 0.6s
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + i * 0.3);
            osc.stop(audioCtx.currentTime + i * 0.3 + 0.6);
        });
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
}

export function useTimer({
    userId,
    subjects,
    currentSubject,
    setUserProfile,
    setHiveTiles,
    onOpenSubscription,
    onComplete,
    showAlert
}: UseTimerProps) {
    const [isFocusing, setIsFocusing] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [maxTime, setMaxTime] = useState(25 * 60);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [targetEndTime, setTargetEndTime] = useState<number | null>(null);

    // Timer logic
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (isFocusing && targetEndTime) {
            timer = setInterval(() => {
                const now = Date.now();
                const diff = Math.max(0, Math.floor((targetEndTime - now) / 1000));
                setTimeLeft(diff);
                
                if (diff === 0) {
                    setIsFocusing(false);
                    setTargetEndTime(null);

                    // NOTE: 倒计时结束时播放声音和震动提醒用户
                    playCompletionSound();
                    triggerHaptic('notification');

                    if (onComplete) {
                        onComplete();
                    }
                }
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isFocusing, targetEndTime]);

    const handleEndFocus = useCallback(async (shouldResetTime = false) => {
        if (!userId || !activeSessionId) return null;
        
        // 1. 立即停止界面的倒计时避免视觉延迟
        setIsFocusing(false);
        const currentSessionId = activeSessionId;
        setActiveSessionId(null);
        setTargetEndTime(null);
        if (shouldResetTime) {
            setTimeLeft(maxTime);
        }

        try {
            // 后端现在自主计算，我们传 0 即可
            const response = await focusService.endSession(currentSessionId, 0);
            const actualMins = response?.duration_mins || 0;

            const updatedProfile = await userService.getProfile(userId);
            if (updatedProfile) {
                // NOTE: 必须使用函数式 setState 基于最新状态更新
                // 之前用 ...userProfile 展开的是闭包中的旧值，导致新头像被覆盖
                setUserProfile(prev => ({
                    ...prev,
                    totalFocus: updatedProfile.total_focus_mins,
                    sparks: updatedProfile.total_sparks,
                    trialStartAt: updatedProfile.trial_start_at,
                    subscriptionEndAt: updatedProfile.subscription_end_at,
                }));
            }

            const matchData = await socialService.getHiveMatching(userId);
            setHiveTiles(matchData.tiles);
            
            return { durationMins: actualMins };
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Session end failed';
            console.error('End focus failed:', errorMessage);
            showAlert('Error', 'Failed to end focus session.');
            return null;
        }
    }, [userId, activeSessionId, maxTime, setUserProfile, setHiveTiles, showAlert]);

    const toggleFocus = useCallback(async () => {
        if (!userId) return;
        try {
            if (!isFocusing) {
                if (!activeSessionId) {
                    const subject = subjects.find(s => s.name === currentSubject);
                    const session = await focusService.startSession(userId, subject?.id || 1);
                    setActiveSessionId(session.id);
                }
                setTargetEndTime(Date.now() + timeLeft * 1000);
                setIsFocusing(true);
            } else {
                setIsFocusing(false);
                setTargetEndTime(null);
            }

            const matchData = await socialService.getHiveMatching(userId);
            setHiveTiles(matchData.tiles);
        } catch (err: unknown) {
            const error = err as { response?: { status?: number }, message?: string };
            if (error.response?.status === 402) {
                onOpenSubscription();
            } else {
                console.error('Focus toggle failed:', error);
                showAlert('Error', error.message || 'Failed to toggle focus session.');
            }
        }
    }, [userId, isFocusing, activeSessionId, subjects, currentSubject, timeLeft, onOpenSubscription, setHiveTiles, showAlert]);

    const handleTimeSelect = useCallback((mins: number) => {
        const secs = mins * 60;
        setTimeLeft(secs);
        setMaxTime(secs);
        if (isFocusing) {
            setTargetEndTime(Date.now() + secs * 1000);
        }
    }, [isFocusing]);

    return {
        isFocusing,
        timeLeft,
        maxTime,
        activeSessionId,
        toggleFocus,
        handleEndFocus,
        handleTimeSelect
    };
}

