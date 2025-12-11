
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

interface RecentAchievementsProps {
    achievements: any[];
}

export function RecentAchievements({ achievements }: RecentAchievementsProps) {
    return (
        <div className="animate-fade-in-up delay-300">
            <Card>
                <CardHeader>
                    <CardTitle>Conquistas Recentes</CardTitle>
                    <CardDescription>Suas últimas vitórias desbloqueadas.</CardDescription>
                </CardHeader>
                <CardContent>
                    {achievements && achievements.length > 0 ? (
                        <div className="space-y-4">
                            {achievements.map((ach: any, i: number) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                        <Trophy className="h-5 w-5 text-yellow-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{ach.name}</p>
                                        <p className="text-xs text-muted-foreground">{ach.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Trophy className="h-8 w-8 mb-2 opacity-20" />
                            <p>Nenhuma conquista recente.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
