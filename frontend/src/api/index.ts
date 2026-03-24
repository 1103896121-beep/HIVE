import { apiClient } from './client';
import * as T from './types';

export const authService = {
    register: (data: unknown) =>
        apiClient.post<T.Token, unknown>('/auth/register', data),
    login: (data: unknown) =>
        apiClient.post<T.Token, unknown>('/auth/login', data),
    appleLogin: (identityToken: string, fullName?: string) =>
        apiClient.post<T.Token, unknown>('/auth/apple', { identity_token: identityToken, full_name: fullName }),
    forgotPassword: (email: string) =>
        apiClient.post<{ status: string }>('/auth/forgot-password', { email }),
    resetPassword: (data: T.ResetPasswordData) =>
        apiClient.post<{ status: string }>('/auth/reset-password', data),
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
    updatePassword: (userId: string, data: T.PasswordUpdate) =>
        apiClient.post<{ status: string; message: string }>(`/users/profile/${userId}/password`, data),
    deleteAccount: (userId: string) =>
        apiClient.delete<{ status: string; message: string }>(`/users/profile/${userId}`),
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
    inviteToSquad: (adminId: string, userId: string, squadId: string) =>
        apiClient.post<T.SquadMember>(`/social/squads/${squadId}/invite?admin_id=${adminId}&user_id=${userId}`, {}),
    reviewInvitation: (userId: string, squadId: string, accept: boolean) =>
        apiClient.post<T.SquadMember | null>(`/social/squads/${squadId}/invitations/review?user_id=${userId}&accept=${accept}`, {}),
    leaveSquad: (userId: string, squadId: string) =>
        apiClient.post<{ status: string }>(`/social/squads/${squadId}/leave?user_id=${userId}`, {}),
    disbandSquad: (adminId: string, squadId: string) =>
        apiClient.delete<{ status: string }>(`/social/squads/${squadId}?admin_id=${adminId}`, {}),
    createBond: (userId1: string, userId2: string) =>
        apiClient.post<T.Bond>(`/social/bonds?user_id_1=${userId1}&user_id_2=${userId2}`, {}),
    updateBondStatus: (user1: string, user2: string, status: string) =>
        apiClient.patch<T.Bond>(`/social/bonds/status?user_id_1=${user1}&user_id_2=${user2}&status=${status}`, {}),
    getSquads: (userId: string) =>
        apiClient.get<T.Squad[]>(`/social/squads`),
    getBonds: (userId: string) =>
        apiClient.get<T.BondEnriched[]>(`/social/bonds`),
    removeBond: (userId: string, targetId: string) =>
        apiClient.delete<{ status: string }>(`/social/bonds/${targetId}?user_id=${userId}`),
    report: (userId: string, targetId: string, targetType: string, reason: string) =>
        apiClient.post<T.Report>(`/social/reports?user_id=${userId}`, { target_id: targetId, target_type: targetType, reason }),
    block: (userId: string, blockedId: string) =>
        apiClient.post<T.Block>(`/social/blocks?user_id=${userId}`, { blocked_id: blockedId }),
    getHiveMatching: (userId: string) =>
        apiClient.get<T.HiveMatchingResponse>(`/social/hive/matching?user_id=${userId}`),
};

export const presenceService = {
    heartbeat: (squadId?: string) =>
        apiClient.post<{ status: string; online_users: string[]; nudges: { sender_id: string }[] }>('/presence/heartbeat', { squad_id: squadId }),
    nudge: (receiverId: string) =>
        apiClient.post<{ status: string }>('/presence/nudge', { receiver_id: receiverId }),
};

export const subscriptionService = {
    subscribe: (userId: string, plan: 'monthly' | 'quarterly' | 'yearly' | 'lifetime') =>
        apiClient.post<{ status: string; expires_at: string }>('/subscription/subscribe', { user_id: userId, plan }),
    verifyReceipt: (userId: string, receiptData: string) =>
        apiClient.post<{ status: string; expires_at: string }>('/subscription/verify-receipt', { user_id: userId, receipt_data: receiptData }),
};
