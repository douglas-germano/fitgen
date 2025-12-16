/**
 * Storage Abstraction Layer
 * 
 * Provides a unified interface for storage that works across:
 * - Capacitor (native iOS/Android) using Preferences API
 * - PWA/Web using localStorage
 * 
 * This ensures token persistence across app restarts and background cycles
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const STORAGE_PREFIX = 'fitgen_';

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
        if (isNativePlatform()) {
            // Use Capacitor Preferences for native apps
            await Preferences.set({
                key: fullKey,
                value: value,
            });
            console.log(`✅ [${getPlatformName()}] Storage SET: ${key}`);
        } else {
            // Use localStorage for web/PWA
            if (typeof window !== 'undefined') {
                localStorage.setItem(fullKey, value);
                console.log(`✅ [${getPlatformName()}] Storage SET: ${key}`);
            }
        }
    } catch (error) {
        console.error(`❌ [${getPlatformName()}] Storage SET failed for ${key}:`, error);
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
            console.log(`🔍 [${getPlatformName()}] Storage GET: ${key} = ${value ? 'found' : 'null'}`);
            return value;
        } else {
            // Use localStorage for web/PWA
            if (typeof window !== 'undefined') {
                const value = localStorage.getItem(fullKey);
                console.log(`🔍 [${getPlatformName()}] Storage GET: ${key} = ${value ? 'found' : 'null'}`);
                return value;
            }
            return null;
        }
    } catch (error) {
        console.error(`❌ [${getPlatformName()}] Storage GET failed for ${key}:`, error);
        return null;
    }
};

/**
 * Remove item from storage
 */
export const removeStorageItem = async (key: string): Promise<void> => {
    const fullKey = `${STORAGE_PREFIX}${key}`;

    try {
        if (isNativePlatform()) {
            // Use Capacitor Preferences for native apps
            await Preferences.remove({ key: fullKey });
            console.log(`🗑️ [${getPlatformName()}] Storage REMOVE: ${key}`);
        } else {
            // Use localStorage for web/PWA
            if (typeof window !== 'undefined') {
                localStorage.removeItem(fullKey);
                console.log(`🗑️ [${getPlatformName()}] Storage REMOVE: ${key}`);
            }
        }
    } catch (error) {
        console.error(`❌ [${getPlatformName()}] Storage REMOVE failed for ${key}:`, error);
        throw error;
    }
};

/**
 * Clear all storage (use with caution)
 */
export const clearStorage = async (): Promise<void> => {
    try {
        if (isNativePlatform()) {
            // Use Capacitor Preferences for native apps
            await Preferences.clear();
            console.log(`🧹 [${getPlatformName()}] Storage CLEARED`);
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
                console.log(`🧹 [${getPlatformName()}] Storage CLEARED`);
            }
        }
    } catch (error) {
        console.error(`❌ [${getPlatformName()}] Storage CLEAR failed:`, error);
        throw error;
    }
};

/**
 * Synchronous versions for backward compatibility (web only)
 * These will only work on web platform, not in Capacitor
 */
export const getStorageItemSync = (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    const fullKey = `${STORAGE_PREFIX}${key}`;
    return localStorage.getItem(fullKey);
};

export const setStorageItemSync = (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    const fullKey = `${STORAGE_PREFIX}${key}`;
    localStorage.setItem(fullKey, value);
};

export const removeStorageItemSync = (key: string): void => {
    if (typeof window === 'undefined') return;
    const fullKey = `${STORAGE_PREFIX}${key}`;
    localStorage.removeItem(fullKey);
};
