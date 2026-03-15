import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import type { DailyNutritionStats, DietPlan } from "@/types/api";
import { format } from "date-fns";

// Minimal local type for date range used by hooks (compatible with react-day-picker)
type DateRange = { from?: Date | undefined; to?: Date | undefined };

// Type for meal update payload
interface MealUpdateData {
    name?: string;
    meal_type?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
}

export function useNutritionHistory(filterType: "day" | "week" | "month" | "custom", dateRange?: DateRange) {
    return useQuery({
        queryKey: ["nutrition-history", filterType, dateRange?.from, dateRange?.to],
        queryFn: async () => {
            let url = "/nutrition/history";
            if (filterType === "day") {
                // For day filter, use daily endpoint which returns meals array
                url = "/nutrition/daily";
            } else if (filterType === "week") {
                url += "?days=7";
            } else if (filterType === "month") {
                url += "?days=30";
            } else if (filterType === "custom" && dateRange?.from && dateRange?.to) {
                const start = format(dateRange.from, "yyyy-MM-dd");
                const end = format(dateRange.to, "yyyy-MM-dd");
                url += `?start_date=${start}&end_date=${end}`;
            } else if (filterType === "custom") {
                // If custom but no dates, don't fetch or return empty
                return [];
            } else {
                url += "?days=7";
            }
            return fetchAPI(url);
        },
        enabled: !(filterType === "custom" && (!dateRange?.from || !dateRange?.to)),
    });
}

export function useDailyNutrition() {
    return useQuery<DailyNutritionStats>({
        queryKey: ["nutrition-daily"],
        queryFn: () => fetchAPI("/nutrition/daily"),
    });
}

export function useDietPlan() {
    return useQuery<DietPlan>({
        queryKey: ["diet-plan"],
        queryFn: () => fetchAPI("/diet/plan"),
        retry: false, // Don't retry if 404/no plan
    });
}

export function useDeleteMeal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => fetchAPI(`/nutrition/log/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["nutrition-daily"] });
            queryClient.invalidateQueries({ queryKey: ["nutrition-history"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        },
    });
}

export function useUpdateMeal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: MealUpdateData }) =>
            fetchAPI(`/nutrition/log/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["nutrition-daily"] });
            queryClient.invalidateQueries({ queryKey: ["nutrition-history"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        },
    });
}

export function useDietPlanTargets() {
    return useQuery({
        queryKey: ["diet-plan-targets"],
        queryFn: async () => {
            const planData = await fetchAPI("/diet/plan");
            if (planData && planData.weekly_plan) {
                const p = planData.macro_targets?.protein || 0;
                const c = planData.macro_targets?.carbs || 0;
                const f = planData.macro_targets?.fats || 0;
                const cal = (p * 4) + (c * 4) + (f * 9);
                return {
                    hasPlan: true,
                    targets: { protein: p, carbs: c, fats: f, calories: cal > 0 ? cal : 2000 },
                };
            }
            return { hasPlan: false, targets: null };
        },
        retry: false,
    });
}

export function useWeeklyNutritionHistory() {
    return useQuery({
        queryKey: ["nutrition-history", "week"],
        queryFn: () => fetchAPI("/nutrition/history?days=7"),
    });
}
