"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Calendar, Clock, Flame, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkoutSession {
    id: string;
    started_at: string;
    duration_seconds: number;
    workout_name: string;
    calories: number;
}

export default function HistoryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<WorkoutSession[]>([]);
    const [filterDay, setFilterDay] = useState<number | null>(7); // Default 7 days

    useEffect(() => {
        async function loadHistory() {
            setLoading(true);
            try {
                let url = "/exercises/history?limit=100";
                if (filterDay) {
                    url += `&days=${filterDay}`;
                }
                const data = await fetchAPI(url);
                setHistory(data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        loadHistory();
    }, [filterDay]);

    // Calculate Stats
    const totalWorkouts = history.length;
    const totalTimeMinutes = Math.floor(history.reduce((acc, curr) => acc + curr.duration_seconds, 0) / 60);
    const totalCalories = history.reduce((acc, curr) => acc + curr.calories, 0);

    return (
        <div className="space-y-6 animate-fade-in-up pb-12">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Histórico de Treinos</h1>
                        <p className="text-muted-foreground">Veja sua consistência e evolução.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {[
                        { label: "Últimos 7 Dias", value: 7 },
                        { label: "Últimos 30 Dias", value: 30 },
                        { label: "Todo o Período", value: null }
                    ].map((f) => (
                        <Button
                            key={f.label}
                            variant={filterDay === f.value ? "default" : "outline"}
                            onClick={() => setFilterDay(f.value)}
                            size="sm"
                            className={filterDay === f.value ? "shadow-md shadow-primary/20" : "bg-background/50 border-white/10 hover:bg-white/5"}
                        >
                            {f.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-4 animate-fade-in-up delay-100">
                <Card className="glass-card shadow-lg shadow-primary/10">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <Dumbbell className="h-5 w-5 text-primary mb-2" />
                        <div className="text-2xl font-bold">{totalWorkouts}</div>
                        <div className="text-xs text-muted-foreground">Treinos</div>
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-lg shadow-blue-900/10">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <Clock className="h-5 w-5 text-blue-500 mb-2" />
                        <div className="text-2xl font-bold">{totalTimeMinutes}m</div>
                        <div className="text-xs text-muted-foreground">Tempo Total</div>
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-lg shadow-orange-900/10">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <Flame className="h-5 w-5 text-orange-500 mb-2" />
                        <div className="text-2xl font-bold">{totalCalories}</div>
                        <div className="text-xs text-muted-foreground">Kcal</div>
                    </CardContent>
                </Card>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground glass-card rounded-lg border-white/10 border-dashed">
                    <HistoryIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhum treino encontrado neste período.</p>
                </div>
            ) : (
                <div className="space-y-4 animate-fade-in-up delay-200">
                    {history.map((session, index) => (
                        <Card key={session.id} className="overflow-hidden glass-card border-l-4 border-l-primary hover:scale-[1.01] transition-transform duration-300">
                            <div className="flex items-center">
                                <div className="p-4 flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-semibold text-lg">{session.workout_name}</h3>
                                        <span className="text-xs text-muted-foreground flex items-center bg-background/50 border border-white/5 px-2 py-1 rounded">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {new Date(session.started_at).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                                        <span className="flex items-center">
                                            <Clock className="h-3 w-3 mr-1 text-blue-400" />
                                            {Math.round(session.duration_seconds / 60)} min
                                        </span>
                                        <span className="flex items-center">
                                            <Flame className="h-3 w-3 mr-1 text-orange-400" />
                                            {session.calories} kcal
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function HistoryIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
            <path d="M3 3v9h9" />
            <path d="M12 7v5l4 2" />
        </svg>
    )
}
