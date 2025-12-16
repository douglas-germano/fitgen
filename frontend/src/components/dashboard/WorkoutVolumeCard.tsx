import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, TrendingUp, TrendingDown } from "lucide-react";

interface WorkoutVolumeCardProps {
    volumeData: {
        volume_kg: number;
        change_percentage: number;
    };
}

export function WorkoutVolumeCard({ volumeData }: WorkoutVolumeCardProps) {
    const { volume_kg, change_percentage } = volumeData;
    const isPositive = change_percentage >= 0;
    const isSignificant = Math.abs(change_percentage) > 0.1; // Only show if > 0.1%

    // Format large numbers with comma separator
    const formatVolume = (kg: number) => {
        return kg.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    };

    return (
        <Card className="glass-card shadow-lg shadow-purple-900/10 border-l-4 border-l-purple-500 hover:scale-[1.02] transition-transform">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Volume de Treino
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Dumbbell className="h-4 w-4 text-purple-500" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {formatVolume(volume_kg)} kg
                </div>
                {isSignificant && (
                    <div className="flex items-center gap-1 mt-1">
                        {isPositive ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span
                            className={`text-xs font-medium ${isPositive ? "text-green-500" : "text-red-500"
                                }`}
                        >
                            {isPositive ? "+" : ""}
                            {change_percentage.toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                            vs semana passada
                        </span>
                    </div>
                )}
                {!isSignificant && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Total desta semana
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
