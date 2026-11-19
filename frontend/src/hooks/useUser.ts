import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";

export function useUser() {
    return useQuery({
        queryKey: ["user"],
        queryFn: () => fetchAPI("/profile/me"),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
