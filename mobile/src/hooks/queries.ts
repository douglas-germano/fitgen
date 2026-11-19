import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { track } from '@/lib/analytics';
import { api, ApiError } from '@/lib/api';
import { uploadableFile } from '@/lib/upload';
import {
  connectHealth,
  bindHealthAccount,
  disconnectHealth,
  isHealthEnabled,
  readLatestBody,
  readTodayActivity,
  saveBodyToHealth,
  saveMealToHealth,
  saveWaterToHealth,
} from '@/lib/health';
import { normalizeNutrition, normalizeSessions, normalizeWorkout } from '@/lib/normalize';
import type {
  Achievement,
  AppNotification,
  ChatMessage,
  GamificationProgress,
  Streaks,
  DailyNutrition,
  DashboardMetrics,
  DietPlan,
  ActiveWorkoutSession,
  ExerciseSessionSummary,
  HistoryPoint,
  HydrationDaily,
  LibraryExercise,
  LibraryExerciseHistory,
  MealEstimate,
  MealType,
  Profile,
  WorkoutPlan,
} from '@/types/api';

// ---------- Profile & dashboard ----------

export const useProfile = (enabled = true) =>
  useQuery({ queryKey: ['profile'], queryFn: () => api<Profile>('/profile/me'), enabled });

export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: () => api<DashboardMetrics>('/metrics/dashboard') });

// ---------- Workouts ----------

/** The whole exercise library; it changes rarely, so it stays cached for a day. */
export const useExerciseLibrary = () =>
  useQuery({
    queryKey: ['exercise-library'],
    queryFn: () => api<LibraryExercise[]>('/exercises/library'),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

export const useLibraryExerciseHistory = (id: string | undefined, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: ['exercise-history', id],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api<LibraryExerciseHistory>(`/exercises/library/${id}/history?page=${pageParam}`),
    getNextPageParam: (lastPage, _pages, lastPageParam) => lastPage.has_more ? lastPageParam + 1 : undefined,
    enabled: !!id && enabled,
  });

export const useWorkoutPlans = () =>
  useQuery({ queryKey: ['workouts'], queryFn: () => api<WorkoutPlan[]>('/workouts') });

export const useWorkoutPlan = (id: string | undefined) =>
  useQuery({
    queryKey: ['workout', id],
    queryFn: () => api<WorkoutPlan>(`/workouts/${id}`).then(normalizeWorkout),
    enabled: !!id,
  });

export function useActiveWorkoutPlan() {
  const plans = useWorkoutPlans();
  const activeId = plans.data?.find((p) => p.is_active)?.id;
  const plan = useWorkoutPlan(activeId);
  return {
    plan: plan.data,
    isLoading: plans.isLoading || (!!activeId && plan.isLoading),
    error: plans.error ?? plan.error,
    refetch: () => Promise.all([plans.refetch(), ...(activeId ? [plan.refetch()] : [])]),
  };
}

export const useWorkoutHistory = () =>
  useQuery({
    queryKey: ['workout-history'],
    queryFn: async () => {
      const [native, imported] = await Promise.all([
        api<ExerciseSessionSummary[]>('/exercises/history?days=90&limit=500'),
        api<ExerciseSessionSummary[]>('/health/workouts'),
      ]);
      return normalizeSessions([...native, ...imported]);
    },
  });

/** The workout session in progress, or `null` (the API answers 404 when there is none). */
export const useActiveSession = () =>
  useQuery({
    queryKey: ['workout-active-session'],
    queryFn: async () => {
      try {
        return await api<ActiveWorkoutSession>('/exercises/sessions/active');
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    // Resuming is time-sensitive: always re-check when the tab regains focus.
    staleTime: 0,
  });

export function useGenerateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/onboarding/generate-workout', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
      qc.invalidateQueries({ queryKey: ['workout'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---------- Nutrition ----------

export const useDailyNutrition = () =>
  useQuery({ queryKey: ['nutrition-daily'], queryFn: () => api<DailyNutrition>('/nutrition/daily').then(normalizeNutrition) });

export const useDietPlan = () =>
  useQuery({
    queryKey: ['diet-plan'],
    // 404 means "no plan yet" — treat it as empty instead of an error.
    queryFn: () => api<DietPlan>('/diet/plan').catch((error) => {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }),
  });

function useInvalidateNutrition() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['nutrition-daily'] });
    qc.invalidateQueries({ queryKey: ['nutrition-history'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export const useEstimateMeal = () =>
  useMutation({
    mutationFn: async ({ description, photos = [] }: { description: string; photos?: string[] }) => {
      if (!photos.length) {
        return api<MealEstimate>('/nutrition/estimate', { method: 'POST', body: { description } });
      }
      // Same multipart contract as the site: `description` + one or more `images`.
      const form = new FormData();
      form.append('description', description);
      for (const photo of await Promise.all(photos.map(uploadableFile))) {
        form.append('images', photo);
      }
      return api<MealEstimate>('/nutrition/estimate', { method: 'POST', body: form });
    },
  });

export function useLogMeal() {
  const invalidate = useInvalidateNutrition();
  return useMutation({
    mutationFn: (meal: MealEstimate & { meal_type: MealType }) =>
      api('/nutrition/log', { method: 'POST', body: meal }),
    onSuccess: (_data, meal) => {
      invalidate();
      track('meal_logged', { meal_type: meal.meal_type });
      void saveMealToHealth(meal);
    },
  });
}

export function useDeleteMeal() {
  const invalidate = useInvalidateNutrition();
  return useMutation({
    mutationFn: (id: string) => api(`/nutrition/log/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

// ---------- Hydration ----------

export const useHydration = () =>
  useQuery({ queryKey: ['hydration'], queryFn: () => api<HydrationDaily>('/hydration/daily') });

export const useHydrationHistory = () =>
  useQuery({
    queryKey: ['hydration-history'],
    queryFn: () => api<HistoryPoint[]>('/hydration/history'),
  });

function useInvalidateHydration() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['hydration'] });
    qc.invalidateQueries({ queryKey: ['hydration-history'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useLogWater() {
  const invalidate = useInvalidateHydration();
  return useMutation({
    mutationFn: (amount_ml: number) =>
      api('/hydration/log', { method: 'POST', body: { amount_ml } }),
    onSuccess: (_data, amount_ml) => {
      invalidate();
      track('water_logged');
      void saveWaterToHealth(amount_ml);
    },
  });
}

export function useSetWaterGoal() {
  const invalidate = useInvalidateHydration();
  return useMutation({
    mutationFn: (goal_amount_ml: number) =>
      api('/hydration/goal', { method: 'POST', body: { goal_amount_ml } }),
    onSuccess: invalidate,
  });
}

// ---------- Body metrics ----------

export type MetricType = 'weight' | 'fat' | 'muscle';

export const useMetricHistory = (type: MetricType) =>
  useQuery({
    queryKey: ['metric-history', type],
    queryFn: () => api<HistoryPoint[]>(`/metrics/history?type=${type}&limit=30`),
  });

export type MetricsEntry = {
  weight_kg?: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  waist_cm?: number;
  notes?: string;
};

/** `fromHealth` marks an entry imported from Apple Health, so it isn't written back there. */
export function useLogMetrics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fromHealth: _, ...entry }: MetricsEntry & { fromHealth?: boolean }) =>
      api('/metrics/log', { method: 'POST', body: entry }),
    onSuccess: (_data, { fromHealth, ...entry }) => {
      if (!fromHealth) void saveBodyToHealth(entry);
      qc.invalidateQueries({ queryKey: ['metric-history'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// ---------- Apple Health ----------

export const useHealthEnabled = () =>
  useQuery({ queryKey: ['health', 'enabled'], queryFn: isHealthEnabled, staleTime: Infinity });

/** Today's steps/energy/distance from Apple Health; `undefined` data when not connected. */
export function useHealthActivity() {
  const { data: enabled } = useHealthEnabled();
  return useQuery({
    queryKey: ['health', 'activity'],
    queryFn: async () => (await readTodayActivity()) ?? null,
    enabled: !!enabled,
    staleTime: 60_000,
  });
}

export function useConnectHealth() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  return useMutation({
    mutationFn: async (connect: boolean) => {
      if (!connect) { await disconnectHealth(); return false; }
      if (!profile?.id) throw new Error('Entre na sua conta para conectar o Saúde');
      const connected = await connectHealth();
      if (connected) await bindHealthAccount(profile.id);
      return connected;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health'] }),
  });
}

export const useLatestHealthBody = () =>
  useMutation({ mutationFn: async () => (await readLatestBody()) ?? null });

// ---------- AI coach ----------

export const useChatHistory = () =>
  useQuery({
    queryKey: ['chat'],
    queryFn: () => api<ChatMessage[]>('/chat/history?limit=50'),
  });

// ---------- Notifications & gamification ----------

export const useNotifications = () =>
  useQuery({ queryKey: ['notifications'], queryFn: () => api<AppNotification[]>('/notifications/'), staleTime: 0, refetchInterval: 15_000 });

export const useUnreadNotifications = () =>
  useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api<AppNotification[]>('/notifications/unread'),
    refetchInterval: 15_000,
  });

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export const useAchievements = () =>
  useQuery({ queryKey: ['achievements'], queryFn: () => api<Achievement[]>('/gamification/achievements') });

export const useGamificationProgress = () =>
  useQuery({ queryKey: ['gamification-progress'], queryFn: () => api<GamificationProgress>('/gamification/progress') });

export const useStreaks = () =>
  useQuery({ queryKey: ['streaks'], queryFn: () => api<Streaks>('/gamification/streaks') });

export type MealUpdate = {
  name?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  meal_type?: MealType;
};

export function useUpdateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MealUpdate }) =>
      api(`/nutrition/log/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutrition-daily'] });
      qc.invalidateQueries({ queryKey: ['nutrition-history'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
