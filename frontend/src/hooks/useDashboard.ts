import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";

export function useUser() {
    return useQuery({
        queryKey: ["user"],
        queryFn: async () => {
            // We can use /profile/me which returns aggregated user+profile data
            // This matches what ProfilePage expects
            return fetchAPI("/profile/me");
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useDashboardMetrics() {
    return useQuery({
        queryKey: ["dashboard-metrics"],
        queryFn: () => fetchAPI("/metrics/dashboard"),
        // Refetch every 5 minutes or on window focus if stale
        staleTime: 1000 * 60 * 5,
    });
}
