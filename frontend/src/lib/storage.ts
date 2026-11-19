const STORAGE_PREFIX = "fitgen_";

export function getStorageItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    try {
        return window.localStorage.getItem(STORAGE_PREFIX + key);
    } catch {
        return null;
    }
}

export function setStorageItem(key: string, value: string): void {
    window.localStorage.setItem(STORAGE_PREFIX + key, value);
}

export function removeStorageItem(key: string): void {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
}
