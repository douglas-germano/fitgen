/**
 * Haptic Feedback Utility
 * Provides haptic feedback for iOS devices (via Capacitor)
 * with graceful degradation for web browsers
 */

// Type definitions for when Capacitor is available
interface HapticsPlugin {
    impact(options: { style: 'light' | 'medium' | 'heavy' }): Promise<void>;
    notification(options: { type: 'success' | 'warning' | 'error' }): Promise<void>;
    selectionStart(): Promise<void>;
    selectionChanged(): Promise<void>;
    selectionEnd(): Promise<void>;
}

/**
 * Check if Capacitor Haptics is available
 */
const isHapticsAvailable = (): boolean => {
    if (typeof window === 'undefined') return false;

    try {
        // @ts-ignore - Capacitor global
        return typeof window.Capacitor !== 'undefined' &&
            // @ts-ignore
            typeof window.Capacitor.Plugins?.Haptics !== 'undefined';
    } catch {
        return false;
    }
};

/**
 * Get Haptics plugin if available
 */
const getHaptics = (): HapticsPlugin | null => {
    try {
        // @ts-ignore
        return window.Capacitor?.Plugins?.Haptics || null;
    } catch {
        return null;
    }
};

/**
 * Light haptic feedback
 * Use for: button taps, toggle switches
 */
export const hapticLight = async (): Promise<void> => {
    if (!isHapticsAvailable()) return;

    try {
        const haptics = getHaptics();
        await haptics?.impact({ style: 'light' });
    } catch (error) {
        console.debug('Haptic feedback not available:', error);
    }
};

/**
 * Medium haptic feedback
 * Use for: confirmations, selections, important actions
 */
export const hapticMedium = async (): Promise<void> => {
    if (!isHapticsAvailable()) return;

    try {
        const haptics = getHaptics();
        await haptics?.impact({ style: 'medium' });
    } catch (error) {
        console.debug('Haptic feedback not available:', error);
    }
};

/**
 * Heavy haptic feedback
 * Use for: critical actions, errors, warnings
 */
export const hapticHeavy = async (): Promise<void> => {
    if (!isHapticsAvailable()) return;

    try {
        const haptics = getHaptics();
        await haptics?.impact({ style: 'heavy' });
    } catch (error) {
        console.debug('Haptic feedback not available:', error);
    }
};

/**
 * Success notification haptic
 * Use for: successful actions, achievements unlocked
 */
export const hapticSuccess = async (): Promise<void> => {
    if (!isHapticsAvailable()) return;

    try {
        const haptics = getHaptics();
        await haptics?.notification({ type: 'success' });
    } catch (error) {
        console.debug('Haptic feedback not available:', error);
    }
};

/**
 * Warning notification haptic
 * Use for: warnings, cautionary actions
 */
export const hapticWarning = async (): Promise<void> => {
    if (!isHapticsAvailable()) return;

    try {
        const haptics = getHaptics();
        await haptics?.notification({ type: 'warning' });
    } catch (error) {
        console.debug('Haptic feedback not available:', error);
    }
};

/**
 * Error notification haptic
 * Use for: errors, failed actions
 */
export const hapticError = async (): Promise<void> => {
    if (!isHapticsAvailable()) return;

    try {
        const haptics = getHaptics();
        await haptics?.notification({ type: 'error' });
    } catch (error) {
        console.debug('Haptic feedback not available:', error);
    }
};

/**
 * Selection start haptic
 * Use for: beginning of selection/drag operations
 */
export const hapticSelectionStart = async (): Promise<void> => {
    if (!isHapticsAvailable()) return;

    try {
        const haptics = getHaptics();
        await haptics?.selectionStart();
    } catch (error) {
        console.debug('Haptic feedback not available:', error);
    }
};

/**
 * Selection changed haptic
 * Use for: during selection/drag operations
 */
export const hapticSelectionChanged = async (): Promise<void> => {
    if (!isHapticsAvailable()) return;

    try {
        const haptics = getHaptics();
        await haptics?.selectionChanged();
    } catch (error) {
        console.debug('Haptic feedback not available:', error);
    }
};

/**
 * Selection end haptic
 * Use for: end of selection/drag operations
 */
export const hapticSelectionEnd = async (): Promise<void> => {
    if (!isHapticsAvailable()) return;

    try {
        const haptics = getHaptics();
        await haptics?.selectionEnd();
    } catch (error) {
        console.debug('Haptic feedback not available:', error);
    }
};

/**
 * Vibrate API fallback for web (non-iOS)
 * Not as sophisticated as iOS haptics but provides some feedback
 */
export const vibrateWeb = (duration: number = 10): void => {
    if (typeof window === 'undefined') return;

    try {
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    } catch (error) {
        console.debug('Vibration not available:', error);
    }
};
