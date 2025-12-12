"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { getToken } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Initialize push notifications
    usePushNotifications();

    useEffect(() => {
        const token = getToken();
        if (!token) {
            router.push("/login");
        } else {
            // eslint-disable-next-line
            setIsAuthenticated(true);

            // Setup automatic token refresh
            const { setupTokenRefresh } = require("@/lib/auth");
            const cleanup = setupTokenRefresh();

            // Cleanup on unmount
            return cleanup;
        }
    }, []); // Run only once on mount

    if (!isAuthenticated) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <NotificationProvider>
            <div className="flex min-h-screen bg-background text-foreground">
                {/* Sidebar for Desktop */}
                <aside className="hidden md:block w-64 shrink-0 bg-card border-r border-border fixed inset-y-0 z-20">
                    <Sidebar />
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all duration-300">
                    <Header />
                    <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden">
                        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 w-full mb-16 md:mb-0">
                            {children}
                        </div>
                    </main>
                </div>

                {/* Bottom Nav for Mobile */}
                <BottomNav />
            </div>
        </NotificationProvider>
    );
}
