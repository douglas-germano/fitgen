"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { MealLogger } from "@/components/diet/MealLogger";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentAchievements } from "@/components/dashboard/RecentAchievements";
import { useDashboardMetrics, useUser } from "@/hooks/useDashboard";

export default function DashboardPage() {
    const { data: user, isLoading: loadingUser } = useUser();
    const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useDashboardMetrics();
    const [isMealLoggerOpen, setIsMealLoggerOpen] = useState(false);

    if (loadingUser || loadingStats) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
                    <p className="text-muted-foreground">
                        Olá {user?.name?.split(' ')[0] || "Atleta"}, vamos evoluir hoje?
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            <StatsOverview stats={stats} />

            {/* Quick Actions */}
            <QuickActions onOpenMealLogger={() => setIsMealLoggerOpen(true)} />

            <MealLogger
                open={isMealLoggerOpen}
                onOpenChange={setIsMealLoggerOpen}
                onSuccess={() => refetchStats()}
            />

            {/* Recent Activity (Achievements) */}
            <RecentAchievements achievements={stats?.achievements} />
        </div>
    );
}
