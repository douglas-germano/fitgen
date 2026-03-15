import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Extract a user-friendly error message from any error shape.
 * Falls back to `fallback` if nothing useful is found.
 */
export function getErrorMessage(error: unknown, fallback = "Ocorreu um erro inesperado."): string {
    if (!error) return fallback;
    if (typeof error === "string") return error;
    if (error instanceof Error) {
        const apiError = error as any;
        return apiError.msg || apiError.message || fallback;
    }
    if (typeof error === "object" && error !== null) {
        const obj = error as Record<string, any>;
        return obj.msg || obj.message || obj.error || fallback;
    }
    return fallback;
}
