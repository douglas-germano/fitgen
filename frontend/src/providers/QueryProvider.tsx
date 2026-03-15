"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { initializeStorage } from "@/lib/storage";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                // 5 minutes stale time
                staleTime: 5 * 60 * 1000,
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    }));

    // Initialize storage on app start (syncs Capacitor to memory cache)
    useEffect(() => {
        initializeStorage();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </QueryClientProvider>
    );
}
