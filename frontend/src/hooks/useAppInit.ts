import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { userService, focusService, socialService } from '../api';
import { clearAuthToken } from '../api/client';
import type { Subject, Squad, BondEnriched, HiveMatchTile } from '../api/types';
import type { UserProfile } from '../components/ProfilePortal';
import type { Theme } from '../components/ThemePicker';

export function useAppInit() {
    const { i18n } = useTranslation();
    const [userId, setUserId] = useState<string | null>(localStorage.getItem('hive_user_id'));
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('hive_user_id'));
    
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [squads, setSquads] = useState<Squad[]>([]);
    const [bonds, setBonds] = useState<BondEnriched[]>([]);
    const [hiveTiles, setHiveTiles] = useState<HiveMatchTile[]>([]);
    const [ambientCount, setAmbientCount] = useState(24302);
    const [theme, setTheme] = useState<Theme>('classic');
    const [currentSquad, setCurrentSquad] = useState('Global Hive');

    const [userProfile, setUserProfile] = useState<UserProfile>({
        name: '...',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
        bio: 'Focusing on the moment... 🐝',
        city: '...',
        totalFocus: 0,
        sparks: 0,
        trialStartAt: new Date().toISOString(),
        showLocation: true,
    });

    const handleSignOut = () => {
        localStorage.removeItem('hive_user_id');
        clearAuthToken();
        setIsAuthenticated(false);
        setUserId(null);
    };

    const handleAuthSuccess = (uId: string) => {
        localStorage.setItem('hive_user_id', uId);
        setUserId(uId);
        setIsAuthenticated(true);
    };

    // Periodic background sync for dynamic social data (Bonds, Squads, Matches)
    useEffect(() => {
        if (!isAuthenticated || !userId) return;
        const syncSocialData = async () => {
            try {
                const [fetchedSquads, fetchedBonds, matchData] = await Promise.all([
                    socialService.getSquads(),
                    socialService.getBonds(),
                    socialService.getHiveMatching(userId)
                ]);
                setSquads(fetchedSquads);
                setBonds(fetchedBonds);
                setHiveTiles(matchData.tiles);
                setAmbientCount(matchData.ambient_count);
            } catch (err) {
                console.error('Background sync failed:', err);
            }
        };
        const timer = setInterval(syncSocialData, 30000);
        return () => clearInterval(timer);
    }, [userId, isAuthenticated]);

    // Initialize data once on mount
    useEffect(() => {
        if (!isAuthenticated || !userId) return;

        const initData = async () => {
            try {
                const fetchedSubjects = await focusService.getSubjects();
                setSubjects(fetchedSubjects);

                const profile = await userService.getProfile(userId);
                if (profile) {
                    setUserProfile({
                        name: profile.name,
                        avatar: profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + userId,
                        bio: profile.bio || '',
                        city: profile.city || '',
                        totalFocus: profile.total_focus_mins,
                        sparks: profile.total_sparks,
                        trialStartAt: profile.trial_start_at,
                        subscriptionEndAt: profile.subscription_end_at,
                        latitude: profile.latitude,
                        longitude: profile.longitude,
                        showLocation: profile.show_location,
                    });
                    setTheme(profile.theme_preference as Theme);
                }

                const [fetchedSquads, fetchedBonds] = await Promise.all([
                    socialService.getSquads(),
                    socialService.getBonds()
                ]);
                setSquads(fetchedSquads);
                setBonds(fetchedBonds);

                if (fetchedSquads.length > 0) {
                    setCurrentSquad(fetchedSquads[0].name);
                }

                const matchData = await socialService.getHiveMatching(userId);
                setHiveTiles(matchData.tiles);
                setAmbientCount(matchData.ambient_count);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Initialization failed';
                console.error('Failed to init data:', errorMessage);
                if (err instanceof Error && err.message?.includes('401')) {
                    handleSignOut();
                }
            }
        };
        initData();
    }, [userId, isAuthenticated]);

    // Sync theme and language
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        document.documentElement.lang = i18n.language || 'en';
    }, [i18n.language]);

    return {
        userId,
        isAuthenticated,
        subjects,
        squads,
        bonds,
        hiveTiles,
        ambientCount,
        userProfile,
        theme,
        currentSquad,
        setTheme,
        setCurrentSquad,
        setUserProfile,
        setSquads,
        setBonds,
        setHiveTiles,
        setAmbientCount,
        handleSignOut,
        handleAuthSuccess,
    };
}
