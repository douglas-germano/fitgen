"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Play, Pause, Square, CheckCircle2, Clock, Flame, ChevronDown, ChevronUp, Video, ArrowLeft, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from 'canvas-confetti';

interface Exercise {
    id: string;
    name: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    notes: string;
    order: number;
    video_url?: string;
}

interface WorkoutDay {
    id: string;
    name: string;
    exercises: Exercise[];
}

export default function WorkoutSessionPage() {
    const router = useRouter();
    const params = useParams();
    const planId = params.id as string;
    const dayId = params.dayId as string;

    const [loading, setLoading] = useState(true);
    const [dayData, setDayData] = useState<WorkoutDay | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionTimer, setSessionTimer] = useState(0); // seconds
    const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Active Exercise State
    const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
    const [exerciseTimer, setExerciseTimer] = useState(0);
    const [isExerciseRunning, setIsExerciseRunning] = useState(false);
    const exerciseIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Logs State
    const [logs, setLogs] = useState<Record<string, { weight: string; reps: string }[]>>({});

    // Modals
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [currentVideoExercise, setCurrentVideoExercise] = useState<{ name: string; url?: string }>({ name: "" });

    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [finishStats, setFinishStats] = useState({ duration: 0, calories: 0 });
    const [showFinishDialog, setShowFinishDialog] = useState(false);

    // Load Data & Start Session
    useEffect(() => {
        async function initSession() {
            try {
                // 1. Get Workout Details
                const planDetails = await fetchAPI(`/workouts/${planId}`);
                const day = planDetails.days.find((d: any) => d.id === dayId);

                if (!day) throw new Error("Day not found");
                setDayData(day);

                // Initialize logs structure
                const initialLogs: any = {};
                day.exercises.forEach((ex: Exercise) => {
                    initialLogs[ex.id] = Array(ex.sets).fill({ weight: "", reps: "" });
                });
                setLogs(initialLogs);
                setActiveExerciseId(day.exercises[0]?.id);

                // 2. Start Session on Backend
                try {
                    const sessionParams = { workout_day_id: dayId };
                    const res = await fetchAPI("/exercises/sessions/start", {
                        method: "POST",
                        body: JSON.stringify(sessionParams)
                    });
                    setSessionId(res.session_id);
                    toast.success("Sessão iniciada! Bom treino.");
                } catch (err: any) {
                    // 409 means active session exists, we should ideally fetch it. 
                    // For simplicity, we might just assume we are resuming or ignoring the error if it returns the ID.
                    // The current API 409 returns session_id.
                    if (err.session_id) {
                        setSessionId(err.session_id);
                        toast.info("Retomando sessão ativa.");
                    } else {
                        console.error(err);
                    }
                }

                setLoading(false);
            } catch (e) {
                console.error(e);
                toast.error("Erro ao carregar treino.");
                router.push("/workouts");
            }
        }
        initSession();

        return () => {
            if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current);
            if (exerciseIntervalRef.current) clearInterval(exerciseIntervalRef.current);
        };
    }, [planId, dayId, router]);

    // Global Session Timer
    useEffect(() => {
        if (!loading && sessionId) {
            sessionIntervalRef.current = setInterval(() => {
                setSessionTimer(prev => prev + 1);
            }, 1000);
        }
    }, [loading, sessionId]);

    // Exercise Timer
    useEffect(() => {
        if (isExerciseRunning) {
            exerciseIntervalRef.current = setInterval(() => {
                setExerciseTimer(prev => prev + 1);
            }, 1000);
        } else {
            if (exerciseIntervalRef.current) clearInterval(exerciseIntervalRef.current);
        }
        return () => {
            if (exerciseIntervalRef.current) clearInterval(exerciseIntervalRef.current);
        }
    }, [isExerciseRunning]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleExerciseTimer = () => {
        setIsExerciseRunning(!isExerciseRunning);
    };

    const handleLogChange = (exId: string, setIndex: number, field: 'weight' | 'reps', value: string) => {
        setLogs(prev => {
            const exerciseLogs = [...prev[exId]];
            exerciseLogs[setIndex] = { ...exerciseLogs[setIndex], [field]: value };
            return { ...prev, [exId]: exerciseLogs };
        });
    };

    const saveSet = async (exId: string, setIndex: number) => {
        if (!sessionId) return;

        const log = logs[exId][setIndex];
        if (!log.weight || !log.reps) {
            toast.error("Preencha peso e repetições.");
            return;
        }

        try {
            await fetchAPI(`/exercises/sessions/${sessionId}/log-set`, {
                method: "POST",
                body: JSON.stringify({
                    exercise_id: exId,
                    set_number: setIndex + 1,
                    reps_done: parseInt(log.reps),
                    weight_used_kg: parseFloat(log.weight)
                })
            });
            toast.success(`Série ${setIndex + 1} registrada!`);
        } catch (e) {
            toast.error("Erro ao salvar série.");
        }
    };

    const finishSession = async () => {
        if (!sessionId) return;

        // Dialog logic moved to confirmFinishSession
        setShowFinishDialog(true);
    };

    const confirmFinishSession = async () => {
        setShowFinishDialog(false);

        try {
            const res = await fetchAPI(`/exercises/sessions/${sessionId}/finish`, {
                method: "PUT",
                body: JSON.stringify({ notes: "Treino finalizado via App" })
            });

            setFinishStats({
                duration: res.duration,
                calories: res.calories || 0  // Use backend calories
            });
            setSuccessModalOpen(true);
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        } catch (e) {
            toast.error("Erro ao finalizar treino.");
        }
    };

    const openVideo = (exercise: Exercise) => {
        setCurrentVideoExercise({ name: exercise.name, url: exercise.video_url });
        setVideoModalOpen(true);
    };

    if (loading || !dayData) return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

    return (
        <div className="pb-24 space-y-6">
            {/* Header Sticky */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="font-bold text-lg leading-none">{dayData.name}</h2>
                        <span className="text-xs text-muted-foreground flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" /> {formatTime(sessionTimer)}
                        </span>
                    </div>
                </div>
                <Button variant="destructive" size="sm" onClick={finishSession}>
                    Finalizar
                </Button>
            </div>

            <div className="px-4 space-y-4">
                {dayData.exercises.map((exercise, index) => {
                    const isActive = activeExerciseId === exercise.id;
                    return (
                        <Card key={exercise.id} className={cn("transition-all duration-300", isActive ? "border-primary shadow-lg ring-1 ring-primary/20" : "opacity-90")}>
                            <CardHeader className="pb-3 cursor-pointer" onClick={() => setActiveExerciseId(exercise.id)}>
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <div className={cn("flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm", isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{exercise.name}</CardTitle>
                                            <CardDescription>{exercise.sets} séries x {exercise.reps}</CardDescription>
                                        </div>
                                    </div>
                                    {isActive ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
                                </div>
                            </CardHeader>

                            {isActive && (
                                <CardContent className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant={isExerciseRunning ? "secondary" : "default"}
                                            className="flex-1"
                                            onClick={toggleExerciseTimer}
                                        >
                                            {isExerciseRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                                            {isExerciseRunning ? "Pausar" : "Iniciar"} ({formatTime(exerciseTimer)})
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={() => openVideo(exercise)}>
                                            <Video className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Sets Log */}
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground text-center mb-1">
                                            <div className="col-span-1">Set</div>
                                            <div className="col-span-2">Kg</div>
                                            <div className="col-span-2">Reps</div>
                                            <div className="col-span-2"></div>
                                        </div>
                                        {Array.from({ length: exercise.sets }).map((_, i) => (
                                            <div key={i} className="grid grid-cols-7 gap-2 items-center">
                                                <div className="col-span-1 text-center font-bold text-muted-foreground">
                                                    {i + 1}
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="kg"
                                                        className="h-8 text-center"
                                                        value={logs[exercise.id]?.[i]?.weight || ""}
                                                        onChange={(e) => handleLogChange(exercise.id, i, 'weight', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="reps"
                                                        className="h-8 text-center"
                                                        value={logs[exercise.id]?.[i]?.reps || ""}
                                                        onChange={(e) => handleLogChange(exercise.id, i, 'reps', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Button variant="ghost" size="sm" className="w-full h-8" onClick={() => saveSet(exercise.id, i)}>
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {exercise.notes && (
                                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                            <span className="font-semibold">Nota:</span> {exercise.notes}
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Video Modal Placeholder */}
            <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Como fazer: {currentVideoExercise.name}</DialogTitle>
                    </DialogHeader>
                    <div className="aspect-video bg-black/10 flex flex-col items-center justify-center rounded-lg overflow-hidden">
                        {currentVideoExercise.url ? (
                            currentVideoExercise.url.includes("youtube.com") || currentVideoExercise.url.includes("youtu.be") ? (
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={currentVideoExercise.url.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/")}
                                    title={currentVideoExercise.name}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            ) : (
                                <div className="text-center p-6">
                                    <Video className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                                    <p className="text-sm text-muted-foreground mb-4">Este vídeo não pode ser incorporado.</p>
                                    <Button onClick={() => window.open(currentVideoExercise.url, '_blank')}>
                                        Assistir no Navegador
                                    </Button>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center">
                                <Video className="h-12 w-12 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Vídeo demonstrativo indisponível</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Success Modal */}
            <Dialog open={successModalOpen} onOpenChange={(open) => { if (!open) router.push('/dashboard'); }}>
                <DialogContent className="sm:max-w-md text-center">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex flex-col items-center gap-2">
                            <Trophy className="h-12 w-12 text-yellow-500" />
                            Treino Concluído!
                        </DialogTitle>
                        <DialogDescription className="text-lg">
                            Parabéns! Você está um passo mais perto do seu objetivo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="bg-muted p-4 rounded-lg">
                            <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                            <div className="text-xl font-bold">{Math.floor(finishStats.duration / 60)} min</div>
                            <div className="text-xs text-muted-foreground">Duração</div>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                            <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                            <div className="text-xl font-bold">{finishStats.calories}</div>
                            <div className="text-xs text-muted-foreground">Calorias (est.)</div>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button className="w-full" size="lg" onClick={() => router.push('/dashboard')}>
                            Voltar para o Painel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Finalizar Treino?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja finalizar? Certifique-se de ter registrado todas as séries.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmFinishSession}>Finalizar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
