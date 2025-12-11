import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";

export function useWorkouts() {
    return useQuery({
        queryKey: ["workouts"],
        queryFn: () => fetchAPI("/workouts"),
    });
}

export function useWorkoutDetails(id: string) {
    return useQuery({
        queryKey: ["workout-details", id],
        queryFn: () => fetchAPI(`/workouts/${id}`),
        enabled: !!id,
    });
}

export function useActiveWorkoutPlan() {
    const { data: plans } = useWorkouts();
    const activePlan = plans?.find((p: any) => p.is_active);

    return useQuery({
        queryKey: ["workout-details", activePlan?.id],
        queryFn: () => fetchAPI(`/workouts/${activePlan.id}`),
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
