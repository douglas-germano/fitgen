import { fetchAPI } from "@/lib/api";
import type { APIError } from "@/types/api";

export interface GamificationProgress {
    xp: number;
    level: number;
    next_level_xp: number;
    progress_percent: number;
}

export interface UserStreaks {
    workout_streak: number;
    nutrition_streak: number;
    hydration_streak: number;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon_url: string;
    xp_reward: number;
    unlocked: boolean;
    unlocked_at: string | null;
}

export const gamificationService = {
    getProgress: async (): Promise<GamificationProgress | null> => {
        try {
            return await fetchAPI('/gamification/progress');
        } catch (error) {
            const apiError = error as APIError;
            console.error("Failed to fetch progress", apiError);
            // Fallback for visual testing if backend is down/empty
            if (apiError?.status === 404) return null;
            return { xp: 0, level: 1, next_level_xp: 100, progress_percent: 0 };
        }
    },

    getStreaks: async (): Promise<UserStreaks> => {
        try {
            return await fetchAPI('/gamification/streaks');
        } catch (error) {
            console.error("Failed to fetch streaks", error);
            return { workout_streak: 0, nutrition_streak: 0, hydration_streak: 0 };
        }
    },

    getAchievements: async (): Promise<Achievement[]> => {
        try {
            return await fetchAPI('/gamification/achievements');
        } catch (error) {
            console.error("Failed to fetch achievements", error);
            return [];
        }
    }
};
