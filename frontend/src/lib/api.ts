const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export const getToken = (): string | null => {
    if (typeof window !== "undefined") {
        return localStorage.getItem("token");
    }
    return null;
};

export const setToken = (token: string) => {
    if (typeof window !== "undefined") {
        localStorage.setItem("token", token);
    }
};

export const removeToken = () => {
    if (typeof window !== "undefined") {
        localStorage.removeItem("token");
    }
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
