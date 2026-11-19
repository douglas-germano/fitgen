import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Eye, ListChecks, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Avatar, EmptyState, PageHeader, Pager, Pill, Segmented, TableSkeleton } from "@admin/kit";

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

interface WorkoutDetail extends Omit<WorkoutPlan, "num_days"> {
    days: Array<{
        id: string;
        name: string;
        day_of_week: string;
        muscle_groups: string[];
        exercises: Array<{ id: string; name: string; sets: number; reps: string; weight_kg: number; notes: string }>;
    }>;
}

export const Route = createFileRoute("/admin/workouts")({ component: AdminWorkoutsPage });

function AdminWorkoutsPage() {
    const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [active, setActive] = useState<"all" | "true" | "false">("all");

    const [selected, setSelected] = useState<WorkoutDetail | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [toDelete, setToDelete] = useState<WorkoutPlan | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [regenerating, setRegenerating] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAPI(`/admin/workouts?page=${page}&per_page=10&is_active=${active}`);
            setWorkouts(data.workouts || []);
            setPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch {
            toast.error("Erro ao carregar treinos");
        } finally {
            setLoading(false);
        }
    }, [page, active]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => setPage(1), [active]);

    async function viewDetails(id: string) {
        setLoadingDetail(true);
        setSelected(null);
        setDetailOpen(true);
        try {
            setSelected(await fetchAPI(`/admin/workouts/${id}`));
        } catch {
            toast.error("Erro ao carregar detalhes");
            setDetailOpen(false);
        } finally {
            setLoadingDetail(false);
        }
    }

    async function confirmDelete() {
        if (!toDelete) return;
        setDeleting(true);
        try {
            await fetchAPI(`/admin/workouts/${toDelete.id}`, { method: "DELETE" });
            toast.success("Treino excluído");
            setToDelete(null);
            load();
        } catch {
            toast.error("Erro ao excluir treino");
        } finally {
            setDeleting(false);
        }
    }

    async function regenerate(id: string) {
        setRegenerating(id);
        try {
            await fetchAPI(`/admin/workouts/${id}/regenerate`, { method: "POST" });
            toast.success("Treino regenerado");
            load();
        } catch {
            toast.error("Erro ao regenerar treino");
        } finally {
            setRegenerating(null);
        }
    }

    return (
        <>
            <PageHeader title="Treinos" description="Planos de treino de todos os usuários." />

            <Segmented
                label="Status do plano"
                value={active}
                onChange={setActive}
                options={[
                    { value: "all", label: "Todos" },
                    { value: "true", label: "Ativos" },
                    { value: "false", label: "Inativos" },
                ]}
            />

            <div className="overflow-hidden rounded-[var(--radius-lg)] bg-sunken">
                {loading ? (
                    <TableSkeleton />
                ) : workouts.length === 0 ? (
                    <EmptyState icon={ListChecks} title="Nenhum treino encontrado" description="Quando os usuários criarem planos, eles aparecem aqui." />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Usuário</TableHead>
                                <TableHead>Plano</TableHead>
                                <TableHead>Dias</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Criado</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workouts.map((w) => (
                                <TableRow key={w.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={w.user.name} />
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold">{w.user.name}</p>
                                                <p className="truncate text-xs text-muted-foreground">{w.user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{w.name}</span>
                                            {w.generated_by_ai ? (
                                                <Pill tone="outline"><Sparkles className="size-3" /> IA</Pill>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell className="tabular">{w.num_days}</TableCell>
                                    <TableCell>
                                        {w.is_active ? <Pill tone="volt" dot>Ativo</Pill> : <Pill tone="neutral">Inativo</Pill>}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground tabular">
                                        {new Date(w.created_at).toLocaleDateString("pt-BR")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon-sm" onClick={() => viewDetails(w.id)} aria-label={`Ver ${w.name}`}>
                                                <Eye />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                disabled={regenerating === w.id}
                                                onClick={() => regenerate(w.id)}
                                                aria-label={`Regenerar ${w.name}`}
                                            >
                                                <RefreshCw className={regenerating === w.id ? "animate-spin" : ""} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-destructive hover:bg-danger-soft"
                                                onClick={() => setToDelete(w)}
                                                aria-label={`Excluir ${w.name}`}
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                {!loading && workouts.length > 0 ? <Pager page={page} pages={pages} total={total} noun="planos" onChange={setPage} /> : null}
            </div>

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight">{selected?.name ?? "Plano de treino"}</DialogTitle>
                        <DialogDescription>{selected ? `${selected.user.name} · ${selected.user.email}` : "Carregando…"}</DialogDescription>
                    </DialogHeader>
                    {loadingDetail || !selected ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="size-6 animate-spin text-volt-ink" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {selected.is_active ? <Pill tone="volt" dot>Ativo</Pill> : <Pill>Inativo</Pill>}
                                {selected.generated_by_ai ? <Pill tone="outline"><Sparkles className="size-3" /> Gerado por IA</Pill> : null}
                            </div>
                            {selected.days.map((day) => (
                                <section key={day.id} className="rounded-[var(--radius-md)] bg-sunken p-4">
                                    <h3 className="font-bold">{day.name}</h3>
                                    <p className="mb-3 text-[13px] text-muted-foreground">
                                        {[day.day_of_week, day.muscle_groups?.join(", ")].filter(Boolean).join(" · ")}
                                    </p>
                                    <ol className="space-y-2">
                                        {day.exercises.map((ex, i) => (
                                            <li key={ex.id} className="flex items-start gap-3 rounded-2xl bg-background p-3">
                                                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-volt text-xs font-bold text-on-volt">
                                                    {i + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="font-semibold">{ex.name}</p>
                                                    <p className="text-[13px] text-muted-foreground tabular">
                                                        {ex.sets} séries × {ex.reps}
                                                        {ex.weight_kg ? ` · ${ex.weight_kg} kg` : ""}
                                                    </p>
                                                    {ex.notes ? <p className="mt-1 text-xs text-muted-foreground">{ex.notes}</p> : null}
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </section>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir plano de treino?</AlertDialogTitle>
                        <AlertDialogDescription>
                            “{toDelete?.name}” de {toDelete?.user.name} será removido. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDelete();
                            }}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? <Loader2 className="animate-spin" /> : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
