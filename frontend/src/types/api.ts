/**
 * Centralized API types for FitGen
 *
 * These types represent the data structures returned by the backend API.
 */

// ===========================================
// Error Types
// ===========================================

export interface APIError extends Error {
    status: number;
    msg?: string;
    message: string;
    error?: string;
}

// ===========================================
// User & Auth Types
// ===========================================

export interface User {
    id: string;
    email: string;
    name: string;
    is_admin: boolean;
    phone?: string;
    created_at: string;
    profile_image?: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token?: string;
    user: User;
}

// ===========================================
// Workout Types
// ===========================================

export interface Exercise {
    id: string;
    name: string;
    sets: number;
    reps: string;
    rest_seconds?: number;
    notes?: string;
    muscle_group?: string;
    equipment?: string;
    video_url?: string;
}

export interface WorkoutDay {
    id: string;
    name?: string;
    day_of_week: string;
    focus: string;
    muscle_groups?: string[];
    exercises: Exercise[];
    duration_minutes?: number;
    order?: number;
}

export interface WorkoutPlan {
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
    days: WorkoutDay[];
    created_at: string;
    updated_at?: string;
    difficulty?: string;
    weeks?: number;
}

export interface WorkoutSession {
    id: string;
    workout_day_id: string;
    started_at: string;
    completed_at?: string;
    duration_minutes?: number;
    notes?: string;
    exercises_completed: number;
    total_volume?: number;
}

export interface ExerciseLog {
    exercise_id: string;
    sets: SetLog[];
}

export interface SetLog {
    set_number: number;
    reps: number;
    weight?: number;
    completed: boolean;
}

// ===========================================
// Nutrition Types
// ===========================================

export interface Meal {
    id: string;
    name: string;
    meal_type: "breakfast" | "lunch" | "dinner" | "snack";
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    logged_at: string;
    image_url?: string;
    foods?: FoodItem[];
}

export interface FoodItem {
    id: string;
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface DietPlan {
    id: string;
    name: string;
    daily_calories: number;
    daily_protein: number;
    daily_carbs: number;
    daily_fat: number;
    meals: DietPlanMeal[];
    is_active: boolean;
}

export interface DietPlanMeal {
    id: string;
    meal_type: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    foods: FoodItem[];
}

export interface DailyNutritionStats {
    date: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    goal_calories: number;
    goal_protein: number;
    goal_carbs: number;
    goal_fat: number;
    meals: Meal[];
}

// ===========================================
// Hydration Types
// ===========================================

export interface HydrationEntry {
    id: string;
    amount_ml: number;
    logged_at: string;
}

export interface HydrationStats {
    date: string;
    total_ml: number;
    goal_ml: number;
    entries: HydrationEntry[];
}

// ===========================================
// Gamification Types
// ===========================================

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    points: number;
    unlocked_at?: string;
    progress?: number;
    target?: number;
}

export interface Streak {
    type: "workout" | "nutrition" | "hydration";
    current: number;
    best: number;
    last_activity_date: string;
}

export interface LeaderboardEntry {
    user_id: string;
    user_name: string;
    rank: number;
    xp: number;
    level: number;
    avatar_url?: string;
}

// ===========================================
// Dashboard Types
// ===========================================

export interface DashboardStats {
    workouts_this_week: number;
    workouts_total: number;
    current_streak: number;
    calories_today: number;
    calories_goal: number;
    protein_today: number;
    protein_goal: number;
    water_today: number;
    water_goal: number;
    xp: number;
    level: number;
}

export interface DashboardMetrics {
    stats: DashboardStats;
    recent_achievements: Achievement[];
    today_workout?: WorkoutDay;
    weekly_progress: WeeklyProgress[];
}

export interface WeeklyProgress {
    day: string;
    workouts: number;
    calories: number;
    water: number;
}

// ===========================================
// Metrics Types
// ===========================================

export interface BodyMetric {
    id: string;
    date: string;
    weight?: number;
    body_fat_percentage?: number;
    muscle_mass?: number;
    notes?: string;
}

// ===========================================
// Notification Types
// ===========================================

export interface Notification {
    id: string;
    title: string;
    body: string;
    type: string;
    read: boolean;
    created_at: string;
    link_type?: string;
    link_id?: string;
}
