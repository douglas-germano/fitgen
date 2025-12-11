
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Utensils, Droplets, Trophy, Activity } from "lucide-react";

interface StatsOverviewProps {
    stats: any;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up delay-100">
            <Card className="glass-card shadow-lg shadow-green-900/10 border-l-4 border-l-green-500 hover:scale-[1.02] transition-transform">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Treinos (7d)</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Dumbbell className="h-4 w-4 text-green-500" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.consistency?.workouts_last_7_days || 0}</div>
                    <p className="text-xs text-muted-foreground">Realizados na semana</p>
                </CardContent>
            </Card>
            <Card className="glass-card shadow-lg shadow-orange-900/10 border-l-4 border-l-orange-500 hover:scale-[1.02] transition-transform">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Calorias</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Utensils className="h-4 w-4 text-orange-500" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.nutrition?.calories || 0}</div>
                    <p className="text-xs text-muted-foreground">Consumidas hoje</p>
                </CardContent>
            </Card>
            <Card className="glass-card shadow-lg shadow-blue-900/10 border-l-4 border-l-blue-500 hover:scale-[1.02] transition-transform">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Água</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Droplets className="h-4 w-4 text-blue-500" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{((stats?.hydration?.consumed_ml || 0) / 1000).toFixed(1)}L</div>
                    <p className="text-xs text-muted-foreground">Ingeridos hoje</p>
                </CardContent>
            </Card>
            <Card className="glass-card shadow-lg shadow-yellow-900/10 border-l-4 border-l-yellow-500 hover:scale-[1.02] transition-transform">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Streak</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold flex items-center gap-2">
                        {stats?.consistency?.current_streak || 0}
                        <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />
                    </div>
                    <p className="text-xs text-muted-foreground">Dias seguidos</p>
                </CardContent>
            </Card>
        </div>
    );
}
