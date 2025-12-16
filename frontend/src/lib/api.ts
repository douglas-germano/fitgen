import { getStorageItem, setStorageItem, removeStorageItem, getStorageItemSync } from './storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://fitgen.suacozinha.site/api";

/**
 * Get token synchronously (for immediate use in requests)
 * Note: This uses sync storage which works on web but may not be
 * up-to-date on Capacitor. For critical checks, use getTokenAsync()
 */
export const getToken = (): string | null => {
    if (typeof window !== "undefined") {
        return getStorageItemSync("token");
    }
    return null;
};

/**
 * Get token asynchronously (recommended for Capacitor)
 */
export const getTokenAsync = async (): Promise<string | null> => {
    return await getStorageItem("token");
};

/**
 * Set token (async to support Capacitor)
 */
export const setToken = async (token: string): Promise<void> => {
    await setStorageItem("token", token);
};

/**
 * Remove token (async to support Capacitor)
 */
export const removeToken = async (): Promise<void> => {
    await removeStorageItem("token");
}

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
    skipAuthRedirect?: boolean;
}

export const fetchAPI = async (endpoint: string, options: FetchOptions = {}) => {
    const token = getToken();

    const headers: Record<string, string> = {
        ...options.headers,
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        // If not JSON (e.g. 404 HTML, 500 HTML), read as text
        const text = await response.text();
        data = { message: text || response.statusText };
    }

    if (!response.ok) {
        if (response.status === 401 && !options.skipAuthRedirect) {
            removeToken();
            window.location.href = "/login";
            return null;
        }

        // Don't throw/crash on 429, just return empty data or specific error structure? 
        // Better to throw so components catch it, but we add the status.
        const error: any = new Error(data.msg || data.message || data.error || `Request failed with status ${response.status}`);
        Object.assign(error, data);
        error.status = response.status;
        throw error;
    }

    return data;
};
