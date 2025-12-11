import { getToken, setToken, removeToken } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://fitgen.suacozinha.site/api";

/**
 * Decode JWT token to get expiration time
 */
function decodeToken(token: string): { exp: number } | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Failed to decode token', error);
        return null;
    }
}

/**
 * Check if token should be refreshed (expires in less than 15 minutes)
 */
function shouldRefreshToken(token: string): boolean {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return false;

    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;

    // Refresh if token expires in less than 15 minutes (900000ms)
    return timeUntilExpiry < 15 * 60 * 1000;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<boolean> {
    try {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
            console.warn('No refresh token available');
            return false;
        }

        const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Failed to refresh token', response.status);

            // If refresh token expired (401), logout user
            if (response.status === 401 || response.status === 422) {
                console.warn('Refresh token expired, logging out');
                removeToken();
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }

            return false;
        }

        const data = await response.json();

        if (data.access_token) {
            setToken(data.access_token);
            console.log('✅ Access token refreshed successfully');
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
}

/**
 * Setup automatic token refresh
 * Checks every 10 minutes if token needs refresh
 */
export function setupTokenRefresh(): () => void {
    console.log('🔄 Token auto-refresh enabled');

    // Check immediately on setup
    const checkAndRefresh = async () => {
        const token = getToken();

        if (token && shouldRefreshToken(token)) {
            console.log('🔄 Token expiring soon, refreshing...');
            await refreshAccessToken();
        }
    };

    // Initial check
    checkAndRefresh();

    // Check every 10 minutes
    const intervalId = setInterval(checkAndRefresh, 10 * 60 * 1000);

    // Return cleanup function
    return () => {
        console.log('🛑 Token auto-refresh disabled');
        clearInterval(intervalId);
    };
}

/**
 * Get time until token expiration (in minutes)
 */
export function getTokenExpiryTime(): number | null {
    const token = getToken();
    if (!token) return null;

    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return null;

    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;

    return Math.floor(timeUntilExpiry / 1000 / 60); // Return in minutes
}
