// NOTE: 生产环境通过 VITE_API_URL 在构建时注入 API 地址
// 运行时 fallback：通过 Capacitor.isNativePlatform() 检测原生环境
import { Capacitor } from '@capacitor/core';

const PRODUCTION_API = 'https://hive.merchlens.app';
const API_BASE_URL = import.meta.env.VITE_API_URL || (Capacitor.isNativePlatform() ? PRODUCTION_API : '');

// NOTE: 在 Capacitor WKWebView 中，跨域 cookie 不可用（samesite=lax 阻止发送）
// 因此改用 localStorage 存储 JWT，通过 Authorization Header 发送
const TOKEN_KEY = 'hive_access_token';

export function setAuthToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

class APIClient {
    private static instance: APIClient;

    private constructor() { }

    public static getInstance(): APIClient {
        if (!APIClient.instance) {
            APIClient.instance = new APIClient();
        }
        return APIClient.instance;
    }

    async request<T>(url: string, options: RequestInit = {}): Promise<T> {
        const token = getAuthToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        // 如果有 token，自动附加 Authorization Header
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            credentials: 'include',
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            // NOTE: 401 表示 Token 过期或无效，自动清除本地状态触发重新登录
            // 避免用户卡在"认证失败"的死循环中
            if (response.status === 401) {
                clearAuthToken();
                localStorage.removeItem('hive_user_id');
                window.location.reload();
            }

            throw new Error(errorData.detail || `Request failed with status ${response.status}`);
        }

        return response.json();
    }

    get<T>(url: string, options: RequestInit = {}): Promise<T> {
        return this.request<T>(url, {
            ...options,
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                ...options.headers
            }
        });
    }

    post<T, B = unknown>(url: string, body: B, options: RequestInit = {}): Promise<T> {
        return this.request<T>(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    patch<T, B = unknown>(url: string, body: B, options: RequestInit = {}): Promise<T> {
        return this.request<T>(url, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    }

    delete<T, B = unknown>(url: string, body?: B, options: RequestInit = {}): Promise<T> {
        return this.request<T>(url, {
            ...options,
            method: 'DELETE',
            ...(body ? { body: JSON.stringify(body) } : {})
        });
    }
}

export const apiClient = APIClient.getInstance();
export const WS_BASE_URL = API_BASE_URL
    ? API_BASE_URL.replace(/^http/, 'ws')
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
