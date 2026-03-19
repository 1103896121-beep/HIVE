import { useState, useEffect, useCallback } from 'react';
import { focusService, userService, socialService } from '../api';
import type { Subject, HiveMatchTile } from '../api/types';
import type { UserProfile } from '../components/ProfilePortal';

interface UseTimerProps {
    userId: string | null;
    subjects: Subject[];
    currentSubject: string;
    userProfile: UserProfile;
    setUserProfile: (profile: UserProfile) => void;
    setHiveTiles: (tiles: HiveMatchTile[]) => void;
    onOpenSubscription: () => void;
    showAlert: (title: string, message: string) => void;
}

export function useTimer({
    userId,
    subjects,
    currentSubject,
    userProfile,
    setUserProfile,
    setHiveTiles,
    onOpenSubscription,
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
                }
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isFocusing, targetEndTime]);

    const handleEndFocus = useCallback(async (shouldResetTime = false) => {
        if (!userId || !activeSessionId) return null;
        try {
            // 后端现在自主计算，我们传 0 即可
            const response = await focusService.endSession(activeSessionId, 0);
            const actualMins = response?.duration_mins || 0;

            const updatedProfile = await userService.getProfile(userId);
            if (updatedProfile) {
                setUserProfile({
                    ...userProfile,
                    totalFocus: updatedProfile.total_focus_mins,
                    sparks: updatedProfile.total_sparks,
                    trialStartAt: updatedProfile.trial_start_at,
                    subscriptionEndAt: updatedProfile.subscription_end_at,
                });
            }

            setIsFocusing(false);
            setActiveSessionId(null);
            setTargetEndTime(null);
            if (shouldResetTime) {
                setTimeLeft(maxTime);
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
    }, [userId, activeSessionId, maxTime, userProfile, setUserProfile, setHiveTiles, showAlert]);

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
