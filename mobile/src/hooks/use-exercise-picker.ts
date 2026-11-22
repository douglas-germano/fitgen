import { router, useLocalSearchParams } from 'expo-router';

import { useExerciseLibrary } from '@/hooks/queries';

export type ExercisePickerSource = 'plan' | 'session';

export function useExercisePicker(workoutId: string, source: ExercisePickerSource) {
  const { exerciseDay, exerciseChoice } = useLocalSearchParams<{
    exerciseDay?: string;
    exerciseChoice?: string;
  }>();
  const { data } = useExerciseLibrary(!!exerciseChoice && exerciseChoice !== 'custom');
  const entry = data?.find((item) => item.id === exerciseChoice);
  const addition = exerciseDay && (entry || exerciseChoice === 'custom')
    ? { dayId: exerciseDay, entry: entry ?? null }
    : null;

  return {
    addition,
    open: (dayId: string) => router.push({
      pathname: '/exercises',
      params: { workoutId, workoutDay: dayId, source },
    }),
    clear: () => router.setParams({ exerciseChoice: undefined, exerciseDay: undefined }),
  };
}
