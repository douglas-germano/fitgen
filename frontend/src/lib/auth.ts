import { getTokenAsync, setToken, removeToken } from './api';
import { getStorageItem, removeStorageItem } from './storage';

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
 * Check if token should be refreshed (expires in less than 30 minutes)
 * Increased from 15 to 30 minutes to catch expiration earlier
 */
function shouldRefreshToken(token: string): boolean {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return false;

    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;

    // Refresh if token expires in less than 30 minutes (1800000ms)
    // Increased from 15 to 30 minutes for better safety margin
    return timeUntilExpiry < 30 * 60 * 1000;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(retryCount = 0): Promise<boolean> {
    const maxRetries = 3;

    try {
        const refreshToken = await getStorageItem('refresh_token');

        if (!refreshToken) {
            console.warn('No refresh token available');
            return false;
        }

        console.log(`🔄 Attempting to refresh token (attempt ${retryCount + 1}/${maxRetries + 1})...`);

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
                await removeToken();
                await removeStorageItem('refresh_token');
                window.location.href = '/login';
                return false;
            }

            // Retry on network errors or 5xx errors
            if (retryCount < maxRetries && (response.status >= 500 || response.status === 0)) {
                console.log(`⏳ Retrying token refresh in ${(retryCount + 1) * 2} seconds...`);
                await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
                return refreshAccessToken(retryCount + 1);
            }

            return false;
        }

        const data = await response.json();

        if (data.access_token) {
            await setToken(data.access_token);
            console.log('✅ Access token refreshed successfully');
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error refreshing token:', error);

        // Retry on network errors
        if (retryCount < maxRetries) {
            console.log(`⏳ Retrying token refresh in ${(retryCount + 1) * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
            return refreshAccessToken(retryCount + 1);
        }

        return false;
    }
}

/**
 * Setup automatic token refresh
 * Checks every 5 minutes if token needs refresh (reduced from 10 minutes)
 * Also listens to visibility changes to refresh when user returns to app
 */
export function setupTokenRefresh(): () => void {
    console.log('🔄 Token auto-refresh enabled');

    // Check and refresh if needed
    const checkAndRefresh = async () => {
        const token = await getTokenAsync();

        if (token && shouldRefreshToken(token)) {
            console.log('🔄 Token expiring soon, refreshing...');
            await refreshAccessToken();
        }
    };

    // Initial check
    checkAndRefresh();

    // Check every 5 minutes (reduced from 10 minutes)
    const intervalId = setInterval(checkAndRefresh, 5 * 60 * 1000);

    // Listen for visibility changes (when user returns to app)
    const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible') {
            console.log('👁️ App became visible, checking token status...');
            await checkAndRefresh();
        }
    };

    // Listen for online event (when connection is restored)
    const handleOnline = async () => {
        console.log('🌐 Connection restored, checking token status...');
        await checkAndRefresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    // Return cleanup function
    return () => {
        console.log('🛑 Token auto-refresh disabled');
        clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
    };
}

/**
 * Get time until token expiration (in minutes)
 */
export async function getTokenExpiryTime(): Promise<number | null> {
    const token = await getTokenAsync();
    if (!token) return null;

    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return null;

    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;

    return Math.floor(timeUntilExpiry / 1000 / 60); // Return in minutes
}

