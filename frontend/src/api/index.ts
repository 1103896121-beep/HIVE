import { apiClient } from './client';
import * as T from './types';

export const userService = {
    getProfile: (userId: string) =>
        apiClient.get<T.Profile>(`/users/profile/${userId}`),
    updateProfile: (userId: string, data: Partial<T.Profile>) =>
        apiClient.patch<T.Profile>(`/users/profile/${userId}`, data),
};

export const focusService = {
    getSubjects: () =>
        apiClient.get<T.Subject[]>('/focus/subjects'),
    startSession: (userId: string, subjectId: number, squadId?: string) =>
        apiClient.post<T.FocusSession>(`/focus/sessions?user_id=${userId}`, {
            subject_id: subjectId,
            squad_id: squadId,
        }),
    endSession: (sessionId: string, durationMins: number) =>
        apiClient.post<T.FocusSession>(`/focus/sessions/${sessionId}/end?duration_mins=${durationMins}`, {}),
    getHistory: (userId: string, limit: number = 10) =>
        apiClient.get<T.FocusSession[]>(`/focus/history/${userId}?limit=${limit}`),
};

export const socialService = {
    createSquad: (userId: string, name: string, isPrivate: boolean = false) =>
        apiClient.post<T.Squad>(`/social/squads?user_id=${userId}`, { name, is_private: isPrivate }),
    joinSquad: (userId: string, inviteCode: string) =>
        apiClient.post<T.Squad>(`/social/squads/join?invite_code=${inviteCode}&user_id=${userId}`, {}),
    createBond: (userId1: string, userId2: string) =>
        apiClient.post<T.Bond>(`/social/bonds?user_id_1=${userId1}&user_id_2=${userId2}`, {}),
    getSquads: (userId: string) =>
        apiClient.get<T.Squad[]>(`/social/squads/${userId}`),
    getBonds: (userId: string) =>
        apiClient.get<T.Bond[]>(`/social/bonds/${userId}`),
    report: (userId: string, targetId: string, targetType: string, reason: string) =>
        apiClient.post<T.Report>(`/social/reports?user_id=${userId}`, { target_id: targetId, target_type: targetType, reason }),
    block: (userId: string, blockedId: string) =>
        apiClient.post<T.Block>(`/social/blocks?user_id=${userId}`, { blocked_id: blockedId }),
};
