import { getStorageItem, setStorageItem, removeStorageItem } from './storage';
import type { APIError } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://dev-api.fitgen.pro/api";

export const getToken = () => getStorageItem("token");
export const setToken = (token: string) => setStorageItem("token", token);
export const removeToken = () => removeStorageItem("token");

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

        // Create typed error with status code
        const error = new Error(data.msg || data.message || data.error || `Request failed with status ${response.status}`) as APIError;
        Object.assign(error, data);
        error.status = response.status;
        throw error;
    }

    return data;
};
