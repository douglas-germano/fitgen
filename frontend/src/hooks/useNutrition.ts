import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
// Minimal local type for date range used by hooks (compatible with react-day-picker)
type DateRange = { from?: Date | undefined; to?: Date | undefined };
import { format } from "date-fns";

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
    return useQuery({
        queryKey: ["nutrition-daily"],
        queryFn: () => fetchAPI("/nutrition/daily"),
    });
}

export function useDietPlan() {
    return useQuery({
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
        mutationFn: ({ id, data }: { id: string; data: any }) =>
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
