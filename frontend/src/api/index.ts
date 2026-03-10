import { apiClient } from './client';
import * as T from './types';

export const authService = {
    register: (data: any) =>
        apiClient.post<T.Token, any>('/auth/register', data),
    login: (data: any) =>
        apiClient.post<T.Token, any>('/auth/login', data),
};

export const userService = {
    getProfile: (userId: string) =>
        apiClient.get<T.Profile>(`/users/profile/${userId}`),
    updateProfile: (userId: string, data: Partial<T.Profile>) =>
        apiClient.patch<T.Profile>(`/users/profile/${userId}`, data),
    searchUsers: (query: string, lat?: number, lon?: number) => {
        let url = `/users/search?q=${encodeURIComponent(query)}`;
        if (lat !== undefined && lon !== undefined) {
            url += `&lat=${lat}&lon=${lon}`;
        }
        return apiClient.get<T.UserSearchResult[]>(url);
    },
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
    applyToSquad: (userId: string, squadId: string) =>
        apiClient.post<T.SquadMember>(`/social/squads/${squadId}/apply?user_id=${userId}`, {}),
    inviteToSquad: (adminId: string, userId: string, squadId: string) =>
        apiClient.post<T.SquadMember>(`/social/squads/${squadId}/invite?admin_id=${adminId}&user_id=${userId}`, {}),
    reviewApplication: (adminId: string, userId: string, squadId: string, approve: boolean) =>
        apiClient.post<T.SquadMember | null>(`/social/squads/${squadId}/applications/review?admin_id=${adminId}&user_id=${userId}&approve=${approve}`, {}),
    reviewInvitation: (userId: string, squadId: string, accept: boolean) =>
        apiClient.post<T.SquadMember | null>(`/social/squads/${squadId}/invitations/review?user_id=${userId}&accept=${accept}`, {}),
    leaveSquad: (userId: string, squadId: string) =>
        apiClient.post<{ status: string }>(`/social/squads/${squadId}/leave?user_id=${userId}`, {}),
    disbandSquad: (adminId: string, squadId: string) =>
        apiClient.delete<{ status: string }>(`/social/squads/${squadId}?admin_id=${adminId}`, {}),
    createBond: (userId1: string, userId2: string) =>
        apiClient.post<T.Bond>(`/social/bonds?user_id_1=${userId1}&user_id_2=${userId2}`, {}),
    getSquads: (userId: string) =>
        apiClient.get<T.Squad[]>(`/social/squads/${userId}`),
    getBonds: (userId: string) =>
        apiClient.get<T.Bond[]>(`/social/bonds/${userId}`),
    removeBond: (userId: string, targetId: string) =>
        apiClient.delete<{ status: string }>(`/social/bonds/${targetId}?user_id=${userId}`),
    report: (userId: string, targetId: string, targetType: string, reason: string) =>
        apiClient.post<T.Report>(`/social/reports?user_id=${userId}`, { target_id: targetId, target_type: targetType, reason }),
    block: (userId: string, blockedId: string) =>
        apiClient.post<T.Block>(`/social/blocks?user_id=${userId}`, { blocked_id: blockedId }),
};

export const subscriptionService = {
    subscribe: (userId: string, plan: 'monthly' | 'yearly') =>
        apiClient.post<{ status: string; expires_at: string }>('/subscription/subscribe', { user_id: userId, plan }),
};
