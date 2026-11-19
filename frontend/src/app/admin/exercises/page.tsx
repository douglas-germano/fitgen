"use client";

import { useCallback, useEffect, useState } from "react";
import { Dumbbell, Film, Pencil, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { EmptyState, Field, PageHeader, Pager, Pill, SearchField, TableSkeleton } from "@/components/admin/kit";

interface Exercise {
    id: string;
    name: string;
    category: string;
    difficulty_level: string;
    video_url?: string;
    animation_url?: string | null;
    description?: string;
}

type ExerciseMedia = { name: string; url: string; kind: "animation" | "video" };

const CATEGORY: Record<string, string> = { strength: "Força", cardio: "Cardio", flexibility: "Flexibilidade" };
const LEVEL: Record<string, string> = { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" };
const EMPTY: Partial<Exercise> = { name: "", category: "strength", difficulty_level: "beginner", video_url: "", description: "" };

function embedUrl(url: string) {
    return url.replace("watch?v=", "embed/").replace("youtu.be/", "www.youtube.com/embed/");
}

export default function AdminExercisesPage() {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [editing, setEditing] = useState<Exercise | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<Partial<Exercise>>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [media, setMedia] = useState<ExerciseMedia | null>(null);
    const [animationError, setAnimationError] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAPI(`/admin/exercises?search=${encodeURIComponent(search)}&page=${page}&per_page=20`);
            setExercises(data.items);
            setPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch (e) {
            toast.error(`Falha ao carregar exercícios. ${e instanceof Error ? e.message : ""}`.trim());
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

    useEffect(() => setPage(1), [search]);

    const openMedia = (exercise: Exercise, kind: ExerciseMedia["kind"]) => {
        const url = kind === "animation" ? exercise.animation_url : exercise.video_url;
        if (!url) return;
        setAnimationError(false);
        setMedia({ name: exercise.name, url, kind });
    };

    const openForm = (ex: Exercise | null) => {
        setEditing(ex);
        setForm(ex ? {
            name: ex.name,
            category: ex.category,
            difficulty_level: ex.difficulty_level,
            video_url: ex.video_url,
            description: ex.description,
        } : EMPTY);
        setFormOpen(true);
    };

    const save = async () => {
        if (!form.name?.trim()) {
            toast.error("Informe o nome do exercício");
            return;
        }
        setSaving(true);
        try {
            await fetchAPI(editing ? `/admin/exercises/${editing.id}` : "/admin/exercises", {
                method: editing ? "PUT" : "POST",
                body: JSON.stringify(form),
            });
            toast.success(editing ? "Exercício atualizado" : "Exercício criado");
            setFormOpen(false);
            load();
        } catch {
            toast.error("Falha ao salvar");
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await fetchAPI(`/admin/exercises/${deleteId}`, { method: "DELETE" });
            toast.success("Exercício removido");
            load();
        } catch {
            toast.error("Falha ao remover. Ele pode estar em uso.");
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <>
            <PageHeader
                title="Exercícios"
                description="Catálogo oficial usado nos planos de treino."
                actions={
                    <Button onClick={() => openForm(null)}>
                        <Plus /> Novo exercício
                    </Button>
                }
            />

            <SearchField value={search} onChange={setSearch} placeholder="Buscar exercício" className="max-w-md" />

            <div className="overflow-hidden rounded-[var(--radius-lg)] bg-sunken">
                {loading ? (
                    <TableSkeleton />
                ) : exercises.length === 0 ? (
                    <EmptyState
                        icon={Dumbbell}
                        title="Nenhum exercício encontrado"
                        description={search ? "Tente outro termo de busca." : "Cadastre o primeiro exercício do catálogo."}
                        action={!search ? <Button onClick={() => openForm(null)}><Plus /> Novo exercício</Button> : undefined}
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Nome</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Dificuldade</TableHead>
                                <TableHead>Mídia</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {exercises.map((ex) => (
                                <TableRow key={ex.id}>
                                    <TableCell className="font-semibold">{ex.name}</TableCell>
                                    <TableCell><Pill tone="volt">{CATEGORY[ex.category] ?? ex.category}</Pill></TableCell>
                                    <TableCell><Pill>{LEVEL[ex.difficulty_level] ?? ex.difficulty_level}</Pill></TableCell>
                                    <TableCell>
                                        {ex.animation_url || ex.video_url ? (
                                            <div className="flex flex-wrap gap-2">
                                                {ex.animation_url ? (
                                                    <Button variant="secondary" size="sm" onClick={() => openMedia(ex, "animation")}>
                                                        <Film /> Ver animação
                                                    </Button>
                                                ) : null}
                                                {ex.video_url ? (
                                                    <Button variant="secondary" size="sm" onClick={() => openMedia(ex, "video")}>
                                                        <Video /> Assistir
                                                    </Button>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Sem mídia</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon-sm" onClick={() => openForm(ex)} aria-label={`Editar ${ex.name}`}>
                                                <Pencil />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-destructive hover:bg-danger-soft"
                                                onClick={() => setDeleteId(ex.id)}
                                                aria-label={`Excluir ${ex.name}`}
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
                {!loading && exercises.length > 0 ? <Pager page={page} pages={pages} total={total} noun="exercícios" onChange={setPage} /> : null}
            </div>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight">{editing ? "Editar exercício" : "Novo exercício"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <Field label="Nome">
                            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Categoria">
                                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CATEGORY).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Dificuldade">
                                <Select value={form.difficulty_level} onValueChange={(v) => setForm({ ...form, difficulty_level: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(LEVEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                        <Field label="URL do vídeo" hint="Link do YouTube (watch ou embed).">
                            <Input value={form.video_url ?? ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=…" />
                        </Field>
                        <Field label="Descrição">
                            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </Field>
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button>
                        <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!media} onOpenChange={(o) => !o && setMedia(null)}>
                <DialogContent className={media?.kind === "animation" ? "sm:max-w-lg" : "sm:max-w-3xl"}>
                    <DialogHeader>
                        <DialogTitle className="pr-10 text-xl font-bold tracking-tight">{media?.name}</DialogTitle>
                        <DialogDescription className="sr-only">
                            {media?.kind === "animation" ? "Animação do exercício" : "Vídeo do exercício"}
                        </DialogDescription>
                    </DialogHeader>
                    {media?.kind === "animation" ? (
                        <div className="grid aspect-square max-h-[65dvh] place-items-center overflow-hidden rounded-[var(--radius-md)] bg-white">
                            {animationError ? (
                                <p role="status" className="p-6 text-center text-sm text-black">Não foi possível carregar a animação.</p>
                            ) : (
                                // The original GIF streams from the backend, preserving animation on a static export.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={media.url}
                                    alt={`Demonstração de ${media.name}`}
                                    className="max-h-[65dvh] w-full object-contain"
                                    onError={() => setAnimationError(true)}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="aspect-video overflow-hidden rounded-[var(--radius-md)] bg-sunken">
                            {media && /youtube\.com|youtu\.be/.test(media.url) ? (
                                <iframe
                                    className="size-full"
                                    src={embedUrl(media.url)}
                                    title={media.name}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : (
                                <div className="grid size-full place-items-center p-6 text-center">
                                    <div className="space-y-3">
                                        <p className="text-sm text-muted-foreground">Este vídeo não pode ser incorporado.</p>
                                        {media ? <Button onClick={() => window.open(media.url, "_blank")}>Abrir em nova aba</Button> : null}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir exercício?</AlertDialogTitle>
                        <AlertDialogDescription>Ele sai do catálogo permanentemente. Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
