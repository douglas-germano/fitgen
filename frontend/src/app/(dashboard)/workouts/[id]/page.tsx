"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
import { fetchAPI } from "@/lib/api";
import Link from "next/link";
import { Loader2, Clock, Play, Plus, Edit2, Trash2, Timer, CheckCircle2, ArrowLeft } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Exercise {
    id: string;
    name: string;
    sets: number;
    reps: number;
    rest_seconds: number;
    notes?: string;
}

interface WorkoutDay {
    id: string;
    name: string; // backend uses 'name'
    muscle_groups: string; // backend uses 'muscle_groups' instead of focus
    exercises: Exercise[];
}

interface WorkoutPlanDetail {
    id: string;
    name: string; // backend uses 'name'
    days: WorkoutDay[];
}

export default function WorkoutDetailPage() {
    const params = useParams();
    const [plan, setPlan] = useState<WorkoutPlanDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeDayId, setActiveDayId] = useState<string | null>(null);
    const [isSessionOpen, setIsSessionOpen] = useState(false);

    // Exercise Management State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleEditClick = (ex: Exercise) => {
        setEditingExercise(ex);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await fetchAPI(`/workouts/exercises/${deleteId}`, { method: 'DELETE' });
            // reload
            const data = await fetchAPI(`/workouts/${params.id}`);
            setPlan(data);
            setPlan(data);
        } catch (e) { console.error(e); } finally { setDeleteId(null); }
    };

    const handleSuccess = async () => {
        setIsAddOpen(false);
        setEditingExercise(null);
        const data = await fetchAPI(`/workouts/${params.id}`);
        setPlan(data);
    };

    useEffect(() => {
        async function loadPlan() {
            try {
                const data = await fetchAPI(`/workouts/${params.id}`);
                setPlan(data);
                if (data.days.length > 0) {
                    setActiveDayId(data.days[0].id);
                }
            } catch (error) {
                console.error("Failed to load plan details", error);
            } finally {
                setLoading(false);
            }
        }
        loadPlan();
    }, [params.id]);

    if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (!plan) return <div>Plano não encontrado</div>;

    const activeDay = plan.days.find(d => d.id === activeDayId) || plan.days[0];

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/workouts">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold">{plan.name}</h2>
                        <p className="text-muted-foreground">{plan.days.length} Divisão de Dias</p>
                    </div>
                </div>
                <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all" onClick={() => setIsSessionOpen(true)}>
                    <Play className="h-4 w-4" /> Iniciar Treino
                </Button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {plan.days.map(day => (
                    <Button
                        key={day.id}
                        variant={activeDayId === day.id ? "default" : "outline"}
                        onClick={() => setActiveDayId(day.id)}
                        className={activeDayId === day.id ? "shadow-md shadow-primary/20" : "bg-background/50 border-white/10 hover:bg-white/5"}
                    >
                        {day.name}
                    </Button>
                ))}
            </div>

            {/* Active Day Exercises */}
            <Card className="h-full border-none shadow-none md:shadow-lg glass-card animate-fade-in-up delay-100">
                <CardHeader className="px-0 md:px-6 border-b border-white/5">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                            <CardTitle className="text-xl md:text-2xl text-primary/90">{activeDay.name}</CardTitle>
                            <CardDescription className="line-clamp-2">Foco: {activeDay.muscle_groups}</CardDescription>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setIsAddOpen(true)} className="shrink-0 bg-white/10 hover:bg-white/20 border-white/5">
                            <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Adicionar Exercício</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0 md:p-6">
                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-md border-none">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-white/10">
                                    <TableHead>Exercício</TableHead>
                                    <TableHead>Séries</TableHead>
                                    <TableHead>Repetições</TableHead>
                                    <TableHead>Descanso</TableHead>
                                    <TableHead>Observações</TableHead>
                                    <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeDay.exercises.map((exercise) => (
                                    <TableRow key={exercise.id} className="hover:bg-white/5 border-white/5 transition-colors group">
                                        <TableCell className="font-medium max-w-[200px] truncate">{exercise.name}</TableCell>
                                        <TableCell><span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">{exercise.sets}</span></TableCell>
                                        <TableCell><span className="bg-secondary/20 text-secondary-foreground px-2 py-1 rounded text-xs">{exercise.reps}</span></TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Clock className="h-3 w-3" /> {exercise.rest_seconds}s
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">{exercise.notes || "-"}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 hover:text-primary" onClick={() => handleEditClick(exercise)}>
                                                    <Edit2 className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={() => setDeleteId(exercise.id)}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {activeDay.exercises.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                            Nenhum exercício encontrado para este dia.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile List View */}
                    <div className="md:hidden space-y-4 p-4">
                        {activeDay.exercises.map((exercise) => (
                            <div key={exercise.id} className="glass-card rounded-lg border-white/10 p-4 space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className="font-semibold text-base">{exercise.name}</h4>
                                    <div className="flex gap-1 shrink-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(exercise)}>
                                            <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleteId(exercise.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div className="bg-background/30 p-2 rounded text-center border border-white/5">
                                        <span className="block text-xs text-muted-foreground uppercase">Séries</span>
                                        <span className="font-medium text-primary">{exercise.sets}</span>
                                    </div>
                                    <div className="bg-background/30 p-2 rounded text-center border border-white/5">
                                        <span className="block text-xs text-muted-foreground uppercase">Reps</span>
                                        <span className="font-medium">{exercise.reps}</span>
                                    </div>
                                    <div className="bg-background/30 p-2 rounded text-center border border-white/5">
                                        <span className="block text-xs text-muted-foreground uppercase">Descanso</span>
                                        <span className="font-medium flex items-center justify-center gap-1">
                                            <Clock className="h-3 w-3" /> {exercise.rest_seconds}s
                                        </span>
                                    </div>
                                </div>

                                {exercise.notes && (
                                    <div className="text-sm text-muted-foreground bg-background/20 p-2 rounded border border-white/5">
                                        <span className="font-medium text-xs uppercase block mb-1 text-primary/70">Observações</span>
                                        {exercise.notes}
                                    </div>
                                )}
                            </div>
                        ))}
                        {activeDay.exercises.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-white/10">
                                Nenhum exercício encontrado. Toque em "Adicionar" para começar.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <WorkoutSessionRunner
                activeDay={activeDay}
                open={isSessionOpen}
                onOpenChange={setIsSessionOpen}
            />

            <ExerciseDialog
                open={isAddOpen || !!editingExercise}
                onOpenChange={(val: boolean) => {
                    if (!val) {
                        setIsAddOpen(false);
                        setEditingExercise(null);
                    }
                }}
                mode={editingExercise ? 'edit' : 'add'}
                exercise={editingExercise}
                dayId={activeDay.id}
                onSuccess={handleSuccess}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover Exercício?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover este exercício do plano?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}


function ExerciseDialog({ open, onOpenChange, mode, exercise, dayId, onSuccess }: any) {
    const [formData, setFormData] = useState({
        name: "", sets: 3, reps: "12", rest_seconds: 60, notes: ""
    });

    useEffect(() => {
        if (mode === 'edit' && exercise) {
            setFormData({
                name: exercise.name,
                sets: exercise.sets,
                reps: exercise.reps,
                rest_seconds: exercise.rest_seconds,
                notes: exercise.notes || ""
            });
        } else {
            setFormData({ name: "", sets: 3, reps: "12", rest_seconds: 60, notes: "" });
        }
    }, [mode, exercise, open]);

    const handleSubmit = async () => {
        try {
            if (mode === 'add') {
                await fetchAPI(`/workouts/day/${dayId}/exercises`, {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            } else {
                await fetchAPI(`/workouts/exercises/${exercise.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            }
            onSuccess();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === 'add' ? 'Adicionar Exercício' : 'Editar Exercício'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Nome do Exercício</Label>
                        <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label>Séries</Label>
                            <Input type="number" value={formData.sets} onChange={e => setFormData({ ...formData, sets: Number(e.target.value) })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Repetições</Label>
                            <Input value={formData.reps} onChange={e => setFormData({ ...formData, reps: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Descanso (s)</Label>
                            <Input type="number" value={formData.rest_seconds} onChange={e => setFormData({ ...formData, rest_seconds: Number(e.target.value) })} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Observações</Label>
                        <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit}>Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ... existing WorkoutSessionRunner ...
function WorkoutSessionRunner({ activeDay, open, onOpenChange }: { activeDay: WorkoutDay, open: boolean, onOpenChange: (open: boolean) => void }) {
    // ...

    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [finished, setFinished] = useState(false);
    const [calories, setCalories] = useState(300); // estimativa inicial
    const [loading, setLoading] = useState(false);

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (open && isActive && !finished) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [open, isActive, finished]);

    // Reset when opened
    useEffect(() => {
        if (open) {
            setSeconds(0);
            setIsActive(true);
            setFinished(false);
        } else {
            setIsActive(false);
        }
    }, [open]);

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            await fetchAPI("/workouts/session/complete", {
                method: "POST",
                body: JSON.stringify({
                    workout_day_id: activeDay.id,
                    duration_seconds: seconds,
                    calories_burned: Number(calories),
                    difficulty: 3, // default medium
                    notes: "Concluído via app"
                })
            });
            alert("Treino salvo com sucesso! 🔥");
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save session", error);
            alert("Erro ao salvar treino.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Timer className="h-5 w-5 text-primary" />
                        Treino em Andamento
                    </DialogTitle>
                    <DialogDescription>
                        {activeDay.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                    <div className="text-6xl font-mono font-bold tracking-widest text-primary">
                        {formatTime(seconds)}
                    </div>

                    {!finished ? (
                        <div className="text-sm text-muted-foreground animate-pulse">
                            Foco total! Complete seus exercícios.
                        </div>
                    ) : (
                        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center justify-center text-green-500 gap-2 mb-4">
                                <CheckCircle2 className="h-6 w-6" />
                                <span className="font-bold text-lg">Treino Finalizado!</span>
                            </div>
                            <div className="space-y-2">
                                <Label>Calorias Estimadas (kj/kcal)</Label>
                                <Input
                                    type="number"
                                    value={calories}
                                    onChange={(e) => setCalories(Number(e.target.value))}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    {!finished ? (
                        <>
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button size="lg" className="w-full sm:w-auto bg-green-600 hover:bg-green-700" onClick={() => { setFinished(true); setIsActive(false); }}>
                                Concluir Treino
                            </Button>
                        </>
                    ) : (
                        <Button className="w-full" size="lg" onClick={handleFinish} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar e Fechar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
