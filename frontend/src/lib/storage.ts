/**
 * Storage Abstraction Layer
 *
 * Provides a unified interface for storage that works across:
 * - Capacitor (native iOS/Android) using Preferences API
 * - PWA/Web using localStorage
 *
 * This ensures token persistence across app restarts and background cycles.
 *
 * On native platforms, we use a hybrid approach:
 * - Capacitor Preferences for persistent storage (async)
 * - In-memory cache for synchronous access (required by fetchAPI)
 * - localStorage as fallback/sync layer
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const STORAGE_PREFIX = 'fitgen_';

// In-memory cache for synchronous access on native platforms
const memoryCache: Map<string, string> = new Map();

/**
 * Check if running in Capacitor native environment
 */
export const isNativePlatform = (): boolean => {
    return Capacitor.isNativePlatform();
};

/**
 * Get platform name for logging
 */
export const getPlatformName = (): string => {
    if (typeof window === 'undefined') return 'server';
    if (isNativePlatform()) return `capacitor-${Capacitor.getPlatform()}`;
    return 'web';
};

/**
 * Set item in storage
 */
export const setStorageItem = async (key: string, value: string): Promise<void> => {
    const fullKey = `${STORAGE_PREFIX}${key}`;

    try {
        // Always update memory cache for sync access
        memoryCache.set(fullKey, value);

        if (isNativePlatform()) {
            // Use Capacitor Preferences for native apps (persistent)
            await Preferences.set({
                key: fullKey,
                value: value,
            });
            // Also store in localStorage as backup for sync access
            if (typeof window !== 'undefined') {
                localStorage.setItem(fullKey, value);
            }
        } else {
            // Use localStorage for web/PWA
            if (typeof window !== 'undefined') {
                localStorage.setItem(fullKey, value);
            }
        }
    } catch (error) {
        console.error(`Storage SET failed for ${key}:`, error);
        throw error;
    }
};

/**
 * Get item from storage
 */
export const getStorageItem = async (key: string): Promise<string | null> => {
    const fullKey = `${STORAGE_PREFIX}${key}`;

    try {
        if (isNativePlatform()) {
            // Use Capacitor Preferences for native apps
            const { value } = await Preferences.get({ key: fullKey });
            // Update memory cache with the retrieved value
            if (value !== null) {
                memoryCache.set(fullKey, value);
            } else {
                memoryCache.delete(fullKey);
            }
            return value;
        } else {
            // Use localStorage for web/PWA
            if (typeof window !== 'undefined') {
                const value = localStorage.getItem(fullKey);
                return value;
            }
            return null;
        }
    } catch (error) {
        console.error(`Storage GET failed for ${key}:`, error);
        return null;
    }
};

/**
 * Remove item from storage
 */
export const removeStorageItem = async (key: string): Promise<void> => {
    const fullKey = `${STORAGE_PREFIX}${key}`;

    try {
        // Always remove from memory cache
        memoryCache.delete(fullKey);

        if (isNativePlatform()) {
            // Use Capacitor Preferences for native apps
            await Preferences.remove({ key: fullKey });
            // Also remove from localStorage backup
            if (typeof window !== 'undefined') {
                localStorage.removeItem(fullKey);
            }
        } else {
            // Use localStorage for web/PWA
            if (typeof window !== 'undefined') {
                localStorage.removeItem(fullKey);
            }
        }
    } catch (error) {
        console.error(`Storage REMOVE failed for ${key}:`, error);
        throw error;
    }
};

/**
 * Clear all storage (use with caution)
 */
export const clearStorage = async (): Promise<void> => {
    try {
        // Clear memory cache
        memoryCache.clear();

        if (isNativePlatform()) {
            // Use Capacitor Preferences for native apps
            await Preferences.clear();
            // Also clear localStorage backup
            if (typeof window !== 'undefined') {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith(STORAGE_PREFIX)) {
                        localStorage.removeItem(key);
                    }
                });
            }
        } else {
            // Use localStorage for web/PWA
            if (typeof window !== 'undefined') {
                // Only clear items with our prefix
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith(STORAGE_PREFIX)) {
                        localStorage.removeItem(key);
                    }
                });
            }
        }
    } catch (error) {
        console.error(`Storage CLEAR failed:`, error);
        throw error;
    }
};

/**
 * Synchronous versions for backward compatibility
 * On native platforms, uses memory cache first, then falls back to localStorage
 * On web, uses localStorage directly
 */
export const getStorageItemSync = (key: string): string | null => {
    const fullKey = `${STORAGE_PREFIX}${key}`;

    // Check memory cache first (especially important for native)
    const cachedValue = memoryCache.get(fullKey);
    if (cachedValue !== undefined) {
        return cachedValue;
    }

    // Fall back to localStorage
    if (typeof window !== 'undefined') {
        return localStorage.getItem(fullKey);
    }

    return null;
};

export const setStorageItemSync = (key: string, value: string): void => {
    const fullKey = `${STORAGE_PREFIX}${key}`;

    // Update memory cache
    memoryCache.set(fullKey, value);

    // Update localStorage
    if (typeof window !== 'undefined') {
        localStorage.setItem(fullKey, value);
    }
};

export const removeStorageItemSync = (key: string): void => {
    const fullKey = `${STORAGE_PREFIX}${key}`;

    // Remove from memory cache
    memoryCache.delete(fullKey);

    // Remove from localStorage
    if (typeof window !== 'undefined') {
        localStorage.removeItem(fullKey);
    }
};

/**
 * Initialize storage from Capacitor Preferences on app start
 * Call this on app initialization to sync Capacitor storage to memory cache
 */
export const initializeStorage = async (): Promise<void> => {
    if (!isNativePlatform()) return;

    try {
        // Load critical keys from Capacitor to memory cache
        const criticalKeys = ['token', 'refresh_token', 'user'];
        for (const key of criticalKeys) {
            const fullKey = `${STORAGE_PREFIX}${key}`;
            const { value } = await Preferences.get({ key: fullKey });
            if (value !== null) {
                memoryCache.set(fullKey, value);
                // Also sync to localStorage for backup
                if (typeof window !== 'undefined') {
                    localStorage.setItem(fullKey, value);
                }
            }
        }
    } catch (error) {
        console.error('Failed to initialize storage from Capacitor:', error);
    }
};
