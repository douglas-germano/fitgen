"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import { ArrowLeft, Clock, CheckCircle2, Play, Pause, ChevronRight, ListOrdered } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function WorkoutSessionPage() {
    const params = useParams();
    const router = useRouter();
    const [dayData, setDayData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Session State
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(true); // Timer starts automatically
    const [completedExercises, setCompletedExercises] = useState<string[]>([]);
    const [isListOpen, setIsListOpen] = useState(false);

    // Rest Timer State
    const [isResting, setIsResting] = useState(false);
    const [restSeconds, setRestSeconds] = useState(0);
    const [showFinishDialog, setShowFinishDialog] = useState(false);

    useEffect(() => {
        async function loadDay() {
            try {
                // We fetch all plans to find the active one and then the specific day
                const plans = await fetchAPI("/workouts");
                const active = plans.find((p: any) => p.is_active);
                if (active) {
                    const fullPlan = await fetchAPI(`/workouts/${active.id}`);
                    const day = fullPlan.days.find((d: any) => d.id === params.dayId);
                    if (day) {
                        setDayData(day);
                    } else {
                        console.error("Day not found in active plan");
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        loadDay();
    }, [params.dayId]);

    // Global Timer
    useEffect(() => {
        let interval: any;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    // Rest Timer
    useEffect(() => {
        let interval: any;
        if (isResting && restSeconds > 0) {
            interval = setInterval(() => {
                setRestSeconds(s => s - 1);
            }, 1000);
        } else if (isResting && restSeconds === 0) {
            setIsResting(false);
        }
        return () => clearInterval(interval);
    }, [isResting, restSeconds]);

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleNext = () => {
        if (!dayData) return;

        // Mark current as completed
        const currentEx = dayData.exercises[currentExerciseIndex];
        if (!completedExercises.includes(currentEx.id)) {
            setCompletedExercises([...completedExercises, currentEx.id]);
        }

        if (currentExerciseIndex < dayData.exercises.length - 1) {
            setCurrentExerciseIndex(prev => prev + 1);

            // Start Rest
            if (currentEx.rest_seconds > 0) {
                setRestSeconds(currentEx.rest_seconds);
                setIsResting(true);
            }
        } else {
            // Finish
            handleFinish();
        }
    };

    const handlePrevious = () => {
        if (currentExerciseIndex > 0) {
            setCurrentExerciseIndex(prev => prev - 1);
        }
    };

    const handleFinish = async () => {
        setShowFinishDialog(true);
    };

    const confirmFinish = async () => {
        setShowFinishDialog(false);
        try {
            await fetchAPI("/workouts/session/complete", {
                method: "POST",
                body: JSON.stringify({
                    workout_day_id: dayData.id,
                    duration_seconds: seconds,
                    calories_burned: 300, // Estimate
                    difficulty: 3,
                    notes: "Concluído via Sessão Guiada"
                })
            });
            alert("Treino concluído com sucesso!");
            router.push("/workouts");
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar treino.");
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!dayData) return <div className="p-8">Dia de treino não encontrado.</div>;

    const currentExercise = dayData?.exercises[currentExerciseIndex];
    const progress = dayData ? ((currentExerciseIndex) / dayData.exercises.length) * 100 : 0;

    return (
        <div className="mx-auto max-w-lg space-y-6 pb-20 animate-fade-in-up">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-muted-foreground">Tempo Total</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-xl font-mono font-bold tracking-wider ${!isActive ? 'opacity-50' : ''}`}>{formatTime(seconds)}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsActive(!isActive)}>
                            {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsListOpen(true)}>
                    <ListOrdered className="h-5 w-5" />
                </Button>
            </div>

            <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Mudar Exercício</DialogTitle>
                        <DialogDescription>Escolha qual exercício realizar agora.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        {dayData.exercises.map((ex: any, idx: number) => (
                            <div
                                key={ex.id}
                                onClick={() => {
                                    setCurrentExerciseIndex(idx);
                                    setIsListOpen(false);
                                    if (isResting) setIsResting(false); // Cancel rest if switching
                                }}
                                className={`
                                    p-4 rounded-lg border cursor-pointer transition-colors flex items-center justify-between
                                    ${currentExerciseIndex === idx ? 'bg-primary/20 border-primary shadow-md' : 'hover:bg-white/5 border-white/10'}
                                `}
                            >
                                <div>
                                    <div className="font-medium">{ex.name}</div>
                                    <div className="text-xs text-muted-foreground">{ex.sets} séries x {ex.reps} reps</div>
                                </div>
                                {completedExercises.includes(ex.id) && (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                )}
                                {currentExerciseIndex === idx && !completedExercises.includes(ex.id) && (
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                )}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Progress Bar */}
            <div className="w-full bg-secondary/30 h-2 rounded-full overflow-hidden backdrop-blur-sm">
                <div className="bg-primary h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]" style={{ width: `${progress}%` }} />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col justify-center gap-6">

                {isResting ? (
                    <Card className="glass-card border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)] animate-pulse">
                        <CardHeader className="text-center">
                            <CardTitle className="text-blue-500 dark:text-blue-400">Descanso</CardTitle>
                            <CardDescription>Respire fundo e prepare-se</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center py-8">
                            <span className="text-6xl font-bold font-mono text-blue-500 dark:text-blue-400 drop-shadow-md">{formatTime(restSeconds)}</span>
                        </CardContent>
                        <CardFooter className="justify-center">
                            <Button variant="outline" onClick={() => setIsResting(false)} className="hover:bg-blue-500/10 border-blue-500/30">Pular Descanso</Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <Card className="glass-card shadow-xl border-white/10">
                        <CardHeader>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-1 rounded-full uppercase tracking-wider">
                                    Exercício {currentExerciseIndex + 1} de {dayData.exercises.length}
                                </span>
                            </div>
                            <CardTitle className="text-2xl md:text-3xl text-gradient">{currentExercise.name}</CardTitle>
                            <CardDescription className="text-lg mt-2 font-light">
                                <span className="font-bold text-foreground text-xl">{currentExercise.sets}</span> séries x <span className="font-bold text-foreground text-xl">{currentExercise.reps}</span> repetições
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-background/40 p-4 rounded-lg border border-white/5 backdrop-blur-md">
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                                    <Clock className="h-4 w-4" /> Intervalo de Descanso
                                </h4>
                                <p className="text-3xl font-mono text-foreground font-bold">{currentExercise.rest_seconds}s</p>
                            </div>

                            {currentExercise.notes && (
                                <div className="bg-background/30 p-4 rounded-lg border border-white/5">
                                    <h4 className="text-xs font-semibold mb-1 uppercase text-muted-foreground">Observações</h4>
                                    <p className="text-sm text-foreground/80 leading-relaxed">{currentExercise.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="grid grid-cols-2 gap-4 mt-auto pt-4">
                <Button variant="outline" size="lg" onClick={handlePrevious} disabled={currentExerciseIndex === 0} className="glass-card hover:bg-white/10">
                    Anterior
                </Button>
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20" onClick={handleNext}>
                    {currentExerciseIndex === dayData.exercises.length - 1 ? (
                        <>Finalizar <CheckCircle2 className="ml-2 h-4 w-4" /></>
                    ) : (
                        <>Próximo <ChevronRight className="ml-2 h-4 w-4" /></>
                    )}
                </Button>
            </div>
            <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Finalizar Treino?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja finalizar e salvar seu progresso?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmFinish}>Finalizar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
