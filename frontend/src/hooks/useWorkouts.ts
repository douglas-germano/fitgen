import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import type { WorkoutPlan } from "@/types/api";

export function useWorkouts() {
    return useQuery<WorkoutPlan[]>({
        queryKey: ["workouts"],
        queryFn: () => fetchAPI("/workouts"),
    });
}

export function useWorkoutDetails(id: string) {
    return useQuery<WorkoutPlan>({
        queryKey: ["workout-details", id],
        queryFn: () => fetchAPI(`/workouts/${id}`),
        enabled: !!id,
    });
}

export function useActiveWorkoutPlan() {
    const { data: plans } = useWorkouts();
    const activePlan = plans?.find((p) => p.is_active);

    return useQuery<WorkoutPlan>({
        queryKey: ["workout-details", activePlan?.id],
        queryFn: () => fetchAPI(`/workouts/${activePlan!.id}`),
        enabled: !!activePlan?.id,
    });
}

export function useExerciseHistory() {
    return useQuery({
        queryKey: ["exercise-history"],
        queryFn: () => fetchAPI("/exercises/history"),
    });
}

export function useGenerateWorkout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => fetchAPI("/onboarding/generate-workout", { method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["workouts"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        },
    });
}
