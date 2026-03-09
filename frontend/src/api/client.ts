const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
        return this.request<T>(url, { ...options, method: 'GET' });
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
}

export const apiClient = APIClient.getInstance();
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
