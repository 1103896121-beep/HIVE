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

// NOTE: 后端已迁移到使用 get_current_active_user 依赖注入（通过 JWT Token 获取用户 ID）
// 因此 focusService / socialService / subscriptionService 不再需要传递 user_id 参数
export const focusService = {
    getSubjects: () =>
        apiClient.get<T.Subject[]>('/focus/subjects'),
    startSession: (_userId: string, subjectId: number, squadId?: string) =>
        apiClient.post<T.FocusSession>('/focus/sessions', {
            subject_id: subjectId,
            squad_id: squadId,
        }),
    endSession: (sessionId: string, durationMins: number) =>
        apiClient.post<T.FocusSession>(`/focus/sessions/${sessionId}/end?duration_mins=${durationMins}`, {}),
    getHistory: (_userId: string, limit: number = 10) =>
        apiClient.get<T.FocusSession[]>(`/focus/history?limit=${limit}`),
};

export const socialService = {
    createSquad: (_userId: string, name: string, isPrivate: boolean = false) =>
        apiClient.post<T.Squad>('/social/squads', { name, is_private: isPrivate }),
    inviteToSquad: (_adminId: string, userId: string, squadId: string) =>
        apiClient.post<T.SquadMember>(`/social/squads/${squadId}/invite?user_id=${userId}`, {}),
    reviewInvitation: (_userId: string, squadId: string, accept: boolean) =>
        apiClient.post<T.SquadMember | null>(`/social/squads/${squadId}/invitations/review?accept=${accept}`, {}),
    leaveSquad: (_userId: string, squadId: string) =>
        apiClient.post<{ status: string }>(`/social/squads/${squadId}/leave`, {}),
    disbandSquad: (_adminId: string, squadId: string) =>
        apiClient.delete<{ status: string }>(`/social/squads/${squadId}`, {}),
    createBond: (_userId1: string, userId2: string) =>
        apiClient.post<T.Bond>(`/social/bonds?user_id_2=${userId2}`, {}),
    updateBondStatus: (_user1: string, user2: string, status: string) =>
        apiClient.patch<T.Bond>(`/social/bonds/status?user_id_2=${user2}&status=${status}`, {}),
    getSquads: () =>
        apiClient.get<T.Squad[]>('/social/squads'),
    getBonds: () =>
        apiClient.get<T.BondEnriched[]>('/social/bonds'),
    removeBond: (_userId: string, targetId: string) =>
        apiClient.delete<{ status: string }>(`/social/bonds/${targetId}`),
    report: (_userId: string, targetId: string, targetType: string, reason: string) =>
        apiClient.post<T.Report>('/social/reports', { target_id: targetId, target_type: targetType, reason }),
    block: (_userId: string, blockedId: string) =>
        apiClient.post<T.Block>('/social/blocks', { blocked_id: blockedId }),
    getHiveMatching: (_userId: string, lat?: number, lon?: number, radiusKm?: number) => {
        let url = '/social/hive/matching';
        const params: string[] = [];
        if (lat !== undefined && lon !== undefined && radiusKm !== undefined) {
            params.push(`lat=${lat}`, `lon=${lon}`, `radius_km=${radiusKm}`);
        }
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        return apiClient.get<T.HiveMatchingResponse>(url);
    },
};

export const presenceService = {
    heartbeat: (squadId?: string) =>
        apiClient.post<{ status: string; online_users: string[]; nudges: { sender_id: string }[] }>('/presence/heartbeat', { squad_id: squadId }),
    nudge: (receiverId: string) =>
        apiClient.post<{ status: string }>('/presence/nudge', { receiver_id: receiverId }),
    getStats: () =>
        apiClient.get<{ total_online: number; active_hives: number; total_sparks_today: number }>('/presence/stats'),
};

export const subscriptionService = {
    subscribe: (_userId: string, plan: 'monthly' | 'quarterly' | 'yearly' | 'lifetime') =>
        apiClient.post<{ status: string; expires_at: string }>('/subscription/subscribe', { plan }),
    verifyReceipt: (_userId: string, receiptData: string) =>
        apiClient.post<{ status: string; expires_at: string }>('/subscription/verify-receipt', { receipt_data: receiptData }),
};
