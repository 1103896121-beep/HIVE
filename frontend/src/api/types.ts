export interface UserBasic {
    id: string;
    email: string;
}

export interface UserSearchResult {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    city?: string;
    bio?: string;
    total_focus_mins: number;
    total_sparks: number;
}

export interface Profile {
    user_id: string;
    name: string;
    avatar_url?: string;
    bio?: string;
    city?: string;
    theme_preference: string;
    daily_goal_mins: number;
    total_focus_mins: number;
    total_sparks: number;
    trial_start_at: string;
    subscription_end_at?: string;
    updated_at: string;
}

export interface Subject {
    id: number;
    name: string;
    icon?: string;
    color_hex?: string;
}

export interface FocusSession {
    id: string;
    user_id: string;
    subject_id: number;
    squad_id?: string;
    start_time: string;
    end_time?: string;
    duration_mins: number;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'INTERRUPTED';
}

export interface Squad {
    id: string;
    name: string;
    created_at: string;
    created_by: string;
    is_private: boolean;
}

export interface SquadMember {
    squad_id: string;
    user_id: string;
    role: 'ADMIN' | 'MEMBER';
    status: 'ACTIVE' | 'PENDING_APPROVAL' | 'PENDING_INVITE';
    joined_at: string;
}

export interface Bond {
    user_id_1: string;
    user_id_2: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    created_at: string;
}

export interface BondEnriched extends Bond {
    other_user: {
        user_id: string;
        name: string;
        avatar_url?: string;
        city?: string;
        total_focus_mins: number;
        total_sparks: number;
    };
}

export interface Report {
    id: number;
    reporter_id: string;
    target_id: string;
    target_type: string;
    reason: string;
    created_at: string;
    status: string;
}

export interface Block {
    user_id: string;
    blocked_id: string;
    created_at: string;
}

export interface Token {
    access_token: string;
    token_type: string;
    user_id: string;
}
