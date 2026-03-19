// NOTE: 默认使用相对路径，由 Vite 代理转发到后端，支持局域网跨设备访问
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(localStorage.getItem('hive_token')
                    ? { 'Authorization': `Bearer ${localStorage.getItem('hive_token')}` }
                    : {}),
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
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
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
