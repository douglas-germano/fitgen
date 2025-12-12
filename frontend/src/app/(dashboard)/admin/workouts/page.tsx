"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Eye, Trash2, RefreshCw, Dumbbell, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface WorkoutPlan {
    id: string;
    user: { id: string; name: string; email: string };
    name: string;
    description: string;
    is_active: boolean;
    generated_by_ai: boolean;
    created_at: string;
    num_days: number;
}

interface WorkoutDetail {
    id: string;
    user: { id: string; name: string; email: string };
    name: string;
    description: string;
    is_active: boolean;
    generated_by_ai: boolean;
    created_at: string;
    days: Array<{
        id: string;
        name: string;
        day_of_week: string;
        muscle_groups: string[];
        exercises: Array<{
            id: string;
            name: string;
            sets: number;
            reps: string;
            weight_kg: number;
            notes: string;
        }>;
    }>;
}

export default function AdminWorkoutsPage() {
    const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalWorkouts, setTotalWorkouts] = useState(0);

    // Detail view
    const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDetail | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Delete confirmation
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [workoutToDelete, setWorkoutToDelete] = useState<WorkoutPlan | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadWorkouts();
    }, [currentPage, searchTerm]);

    async function loadWorkouts() {
        setLoading(true);
        try {
            const data = await fetchAPI(`/admin/workouts?page=${currentPage}&per_page=10`);
            setWorkouts(data.workouts || []);
            setTotalPages(data.pages || 1);
            setTotalWorkouts(data.total || 0);
        } catch (e) {
            toast.error("Erro ao carregar treinos");
        } finally {
            setLoading(false);
        }
    }

    async function viewDetails(planId: string) {
        setLoadingDetail(true);
        setDetailOpen(true);
        try {
            const data = await fetchAPI(`/admin/workouts/${planId}`);
            setSelectedWorkout(data);
        } catch (e) {
            toast.error("Erro ao carregar detalhes");
            setDetailOpen(false);
        } finally {
            setLoadingDetail(false);
        }
    }

    async function confirmDelete() {
        if (!workoutToDelete) return;
        setDeleting(true);
        try {
            await fetchAPI(`/admin/workouts/${workoutToDelete.id}`, { method: "DELETE" });
            toast.success("Treino deletado com sucesso");
            setDeleteDialogOpen(false);
            loadWorkouts();
        } catch (e) {
            toast.error("Erro ao deletar treino");
        } finally {
            setDeleting(false);
            setWorkoutToDelete(null);
        }
    }

    async function regenerateWorkout(planId: string) {
        try {
            await fetchAPI(`/admin/workouts/${planId}/regenerate`, { method: "POST" });
            toast.success("Treino regenerado com sucesso");
            loadWorkouts();
        } catch (e) {
            toast.error("Erro ao regenerar treino");
        }
    }

    if (loading && currentPage === 1) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-200px)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gerenciar Treinos</h1>
                <p className="text-muted-foreground">Visualize e gerencie todos os planos de treino dos usuários.</p>
            </div>

            <Card className="glass-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Dumbbell className="h-5 w-5" />
                            Planos de Treino ({totalWorkouts})
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-64"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Plano</TableHead>
                                <TableHead>Dias</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>IA</TableHead>
                                <TableHead>Criado</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workouts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        Nenhum treino encontrado
                                    </TableCell>
                                </TableRow>
                            ) : (
                                workouts.map((workout) => (
                                    <TableRow key={workout.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{workout.user.name}</div>
                                                <div className="text-sm text-muted-foreground">{workout.user.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{workout.name}</div>
                                        </TableCell>
                                        <TableCell>{workout.num_days} dias</TableCell>
                                        <TableCell>
                                            {workout.is_active ? (
                                                <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Ativo
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">
                                                    <XCircle className="h-3 w-3 mr-1" />
                                                    Inativo
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {workout.generated_by_ai && <Badge variant="outline">IA</Badge>}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(workout.created_at).toLocaleDateString("pt-BR")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => viewDetails(workout.id)}
                                                    title="Ver detalhes"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => regenerateWorkout(workout.id)}
                                                    title="Regenerar treino"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setWorkoutToDelete(workout);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                    title="Deletar"
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >
                                Anterior
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Página {currentPage} de {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(currentPage + 1)}
                            >
                                Próxima
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Plano de Treino</DialogTitle>
                        <DialogDescription>
                            {selectedWorkout && `${selectedWorkout.user.name} - ${selectedWorkout.name}`}
                        </DialogDescription>
                    </DialogHeader>
                    {loadingDetail ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : selectedWorkout ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Status:</span>{" "}
                                    <Badge variant={selectedWorkout.is_active ? "default" : "secondary"}>
                                        {selectedWorkout.is_active ? "Ativo" : "Inativo"}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Gerado por IA:</span>{" "}
                                    {selectedWorkout.generated_by_ai ? "Sim" : "Não"}
                                </div>
                            </div>

                            {selectedWorkout.days.map((day, idx) => (
                                <Card key={day.id} className="border">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg">{day.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            {day.day_of_week && `${day.day_of_week} - `}
                                            {day.muscle_groups?.join(", ")}
                                        </p>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {day.exercises.map((ex, exIdx) => (
                                                <div key={ex.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                                                    <div className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                                                        {exIdx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium">{ex.name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {ex.sets} séries × {ex.reps}
                                                            {ex.weight_kg && ` • ${ex.weight_kg}kg`}
                                                        </div>
                                                        {ex.notes && (
                                                            <div className="text-xs text-muted-foreground mt-1">{ex.notes}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja deletar o plano de treino "{workoutToDelete?.name}" do usuário{" "}
                            {workoutToDelete?.user.name}? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deletar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
