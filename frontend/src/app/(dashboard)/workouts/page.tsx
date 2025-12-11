"use client";

import { useState } from "react";
import Link from "next/link";
// import { fetchAPI } from "@/lib/api";
import { useActiveWorkoutPlan, useExerciseHistory, useGenerateWorkout } from "@/hooks/useWorkouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Plus, Calendar, ChevronRight, Loader2, Play, History, TrendingUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkoutPlan {
    id: string;
    name: string;
    description: string;
    goal: string;
    difficulty: string;
    is_active: boolean;
    created_at: string;
    // We need details to find today's workout, so we might need to fetch details or assume structure
    days?: any[];
}

interface WorkoutSession {
    id: string;
    started_at: string;
    duration_seconds: number;
    workout_name: string;
    calories: number;
}

export default function WorkoutsPage() {
    const { data: activePlan, isLoading: loadingPlan } = useActiveWorkoutPlan();
    const { data: history = [], isLoading: loadingHistory } = useExerciseHistory();
    const generateMutation = useGenerateWorkout();

    const [showGenerateDialog, setShowGenerateDialog] = useState(false);

    // Derived state
    const loading = loadingPlan || loadingHistory;

    // Determine Today's Workout
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayIndex = new Date().getDay();
    const todayName = daysOfWeek[todayIndex];
    const todaysWorkout = activePlan?.days?.find((d: any) => d.day_of_week === todayName);

    const handleGenerate = async () => {
        setShowGenerateDialog(false);
        try {
            await generateMutation.mutateAsync();
            window.location.reload(); // Still safest to reload to ensure fresh full state, or just let invalidation handle it
        } catch (e) {
            alert("Erro ao gerar plano.");
        }
    };

    // Format Data for Chart (Aggregate by Date)
    const chartData = (() => {
        const grouped = history.reduce((acc: any, session: WorkoutSession) => {
            const date = new Date(session.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

            if (!acc[date]) {
                acc[date] = {
                    date,
                    minutos: 0,
                    timestamp: new Date(session.started_at).getTime() // Keep for sorting
                };
            }
            acc[date].minutos += Math.round(session.duration_seconds / 60);
            return acc;
        }, {});

        // Convert to array, sort by date, and take last 7 entries
        return Object.values(grouped)
            .sort((a: any, b: any) => a.timestamp - b.timestamp)
            .slice(-7);
    })();

    if (loading) return <div className="flex h-[calc(100vh-200px)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Meus Treinos</h1>
                    <p className="text-muted-foreground">Acompanhe sua rotina e evolução.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/workouts/history">
                        <Button variant="outline" size="sm">
                            <History className="mr-2 h-4 w-4" /> Histórico
                        </Button>
                    </Link>
                    <Button onClick={() => setShowGenerateDialog(true)} size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Novo Plano
                    </Button>
                </div>
            </div>

            {!activePlan ? (
                <Card className="glass-card border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                        <div className="bg-primary/10 p-4 rounded-full">
                            <Dumbbell className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Nenhum plano ativo</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                                A IA pode criar um plano personalizado para você agora mesmo.
                            </p>
                        </div>
                        <Button onClick={() => setShowGenerateDialog(true)}>Gerar Plano</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Today's Workout Card (Large) */}
                    <Card className="glass-card lg:col-span-2 border-primary/20 shadow-lg shadow-primary/5">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center mb-2">
                                <Badge variant="outline" className="text-primary border-primary">Treino de Hoje</Badge>
                                <span className="text-sm text-muted-foreground capitalize">
                                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}
                                </span>
                            </div>
                            <CardTitle className="text-2xl">
                                {todaysWorkout ? todaysWorkout.name : "Dia de Descanso"}
                            </CardTitle>
                            <CardDescription>
                                {todaysWorkout ?
                                    `${todaysWorkout.exercises.length} exercícios • Foco: ${todaysWorkout.muscle_groups.join(', ')}`
                                    : "Recupere suas energias para o próximo treino!"
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {todaysWorkout ? (
                                <div className="space-y-4">
                                    <div className="flex -space-x-2 overflow-hidden py-2">
                                        {todaysWorkout.exercises.slice(0, 5).map((ex: any, i: number) => (
                                            <div key={i} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted border-2 border-background text-[10px] font-bold" title={ex.name}>
                                                {i + 1}
                                            </div>
                                        ))}
                                        {todaysWorkout.exercises.length > 5 && (
                                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted border-2 border-background text-[10px] font-bold">
                                                +{todaysWorkout.exercises.length - 5}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-12 flex items-center text-muted-foreground text-sm">
                                    Aproveite para se hidratar e dormir bem.
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            {todaysWorkout ? (
                                <Link href={`/workouts/${activePlan.id}/play/${todaysWorkout.id}`} className="w-full">
                                    <Button className="w-full text-lg h-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                                        <Play className="mr-2 h-5 w-5" /> Iniciar Treino
                                    </Button>
                                </Link>
                            ) : (
                                <Button variant="secondary" className="w-full" disabled>
                                    Sem treino hoje
                                </Button>
                            )}
                        </CardFooter>
                    </Card>

                    {/* Plan Details Card (Small) */}
                    <Card className="glass-card flex flex-col justify-between">
                        <CardHeader>
                            <CardTitle className="text-lg">Seu Plano</CardTitle>
                            <CardDescription className="line-clamp-2">{activePlan.name}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Frequência:</span>
                                <span className="font-medium">{activePlan.days.length}x / semana</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Início:</span>
                                <span className="font-medium">{new Date(activePlan.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="pt-2">
                                <div className="text-xs text-muted-foreground mb-1">Progresso Estimado</div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[25%]" />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/workouts/${activePlan.id}`} className="w-full">
                                <Button variant="ghost" className="w-full hover:bg-primary/10 hover:text-primary">
                                    Ver Detalhes do Plano
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>

                    {/* History Chart (Full Width) */}
                    <Card className="glass-card lg:col-span-3">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Histórico de Execuções
                            </CardTitle>
                            <CardDescription>Duração dos seus últimos treinos (minutos)</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            {history.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                        <XAxis
                                            dataKey="date"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 12, fill: '#888' }}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${value}m`}
                                            tick={{ fontSize: 12, fill: '#888' }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                            cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                                        />
                                        <Bar
                                            dataKey="minutos"
                                            fill="var(--primary)"
                                            radius={[4, 4, 0, 0]}
                                            barSize={40}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                    <Clock className="h-8 w-8 mb-2 opacity-50" />
                                    <p>Nenhum treino realizado ainda.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
            <AlertDialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Gerar Novo Plano?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Isso substituirá seu plano de treino atual por um novo gerado pela IA. Todo o progresso do plano atual será arquivado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleGenerate}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
