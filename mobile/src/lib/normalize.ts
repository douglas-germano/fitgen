import type { DailyNutrition, ExerciseSessionSummary, WorkoutPlan } from '@/types/api';

const number = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** The API has legacy plans with null collections and numeric repetitions. */
export function normalizeWorkout(plan: WorkoutPlan): WorkoutPlan {
  return { ...plan, days: (plan.days ?? []).map((day) => ({
    ...day,
    muscle_groups: Array.isArray(day.muscle_groups) ? day.muscle_groups : [],
    exercises: (day.exercises ?? []).map((exercise) => ({
      ...exercise,
      sets: Math.max(0, Math.floor(number(exercise.sets))),
      reps: String(exercise.reps ?? '—'),
      rest_seconds: Math.max(0, number(exercise.rest_seconds)),
    })),
  })) };
}

export function normalizeNutrition(daily: DailyNutrition): DailyNutrition {
  return { ...daily, meals: (daily.meals ?? []).map((meal) => ({
    ...meal,
    calories: number(meal.calories), protein: number(meal.protein), carbs: number(meal.carbs), fats: number(meal.fats),
  })) };
}

export function normalizeSessions(sessions: ExerciseSessionSummary[]): ExerciseSessionSummary[] {
  return sessions.filter((session) => session.started_at && Number.isFinite(new Date(session.started_at).getTime())).map((session) => ({
    ...session, duration_seconds: Math.max(0, number(session.duration_seconds)), calories: number(session.calories), workout_name: session.workout_name || 'Treino',
  }));
}
