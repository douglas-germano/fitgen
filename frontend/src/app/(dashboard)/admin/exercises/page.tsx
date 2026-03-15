"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Loader2, Plus, Edit2, Trash2, Video, Search, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Exercise {
    id: string;
    name: string;
    category: string;
    difficulty_level: string;
    video_url?: string;
    description?: string;
}

export default function AdminExercisesPage() {
    const router = useRouter();
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [currentVideoExercise, setCurrentVideoExercise] = useState<{ name: string; url?: string }>({ name: "" });
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { toast } = useToast();

    // Form State
    const [formData, setFormData] = useState<Partial<Exercise>>({
        name: "", category: "strength", difficulty_level: "beginner", video_url: "", description: ""
    });

    const loadExercises = async () => {
        setLoading(true);
        try {
            const data = await fetchAPI(`/admin/exercises?search=${search}&per_page=100`);
            setExercises(data.items);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: `Falha ao carregar exercícios. ${error instanceof Error ? error.message : 'Verifique se é admin.'}`, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadExercises();
    }, [search]); // Reload on search change

    const handleEdit = (ex: Exercise) => {
        setEditingExercise(ex);
        setFormData({ ...ex });
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingExercise(null);
        setFormData({ name: "", category: "strength", difficulty_level: "beginner", video_url: "", description: "" });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingExercise) {
                await fetchAPI(`/admin/exercises/${editingExercise.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                toast({ title: "Sucesso", description: "Exercício atualizado." });
            } else {
                await fetchAPI('/admin/exercises', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                toast({ title: "Sucesso", description: "Exercício criado." });
            }
            setIsDialogOpen(false);
            loadExercises();
        } catch (error) {
            toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await fetchAPI(`/admin/exercises/${deleteId}`, { method: 'DELETE' });
            toast({ title: "Sucesso", description: "Exercício removido." });
            loadExercises();
        } catch (error) {
            toast({ title: "Erro", description: "Falha ao remover. Pode estar em uso.", variant: "destructive" });
        } finally {
            setDeleteId(null);
        }
    };

    const openVideo = (ex: Exercise) => {
        setCurrentVideoExercise({ name: ex.name, url: ex.video_url });
        setVideoModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in-up pb-12">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Exercícios</h1>
                        <p className="text-muted-foreground">Área Restrita (Admin)</p>
                    </div>
                </div>
                <Button onClick={handleCreate} className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                    <Plus className="mr-2 h-4 w-4" /> Novo Exercício
                </Button>
            </div>

            <div className="flex gap-2 items-center glass-card p-4 rounded-lg border-white/10 animate-fade-in-up delay-100">
                <Search className="h-4 w-4 text-muted-foreground ml-2" />
                <Input
                    placeholder="Buscar exercício..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="border-none shadow-none focus-visible:ring-0 bg-transparent text-lg placeholder:text-muted-foreground/50"
                />
            </div>

            <div className="rounded-md border-none glass-card animate-fade-in-up delay-200">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/10">
                            <TableHead>Nome</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Dificuldade</TableHead>
                            <TableHead>Vídeo</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex justify-center items-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : exercises.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Nenhum exercício encontrado</TableCell>
                            </TableRow>
                        ) : (
                            exercises.map((ex) => (
                                <TableRow key={ex.id} className="hover:bg-white/5 border-white/10 transition-colors">
                                    <TableCell className="font-medium">{ex.name}</TableCell>
                                    <TableCell className="capitalize">
                                        <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">{ex.category}</span>
                                    </TableCell>
                                    <TableCell className="capitalize">
                                        <span className="bg-secondary/20 text-secondary-foreground px-2 py-1 rounded text-xs">{ex.difficulty_level}</span>
                                    </TableCell>
                                    <TableCell>
                                        {ex.video_url ? (
                                            <Button variant="ghost" size="icon" onClick={() => openVideo(ex)} className="hover:text-green-500 hover:bg-green-500/10 transition-colors">
                                                <Video className="h-4 w-4 text-green-500" />
                                            </Button>
                                        ) : (
                                            <Video className="h-4 w-4 text-muted-foreground/30" />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ex)} className="hover:text-primary hover:bg-primary/10">
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={() => setDeleteId(ex.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingExercise ? 'Editar' : 'Novo'} Exercício</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Nome</Label>
                            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Categoria</Label>
                                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="strength">Força</SelectItem>
                                        <SelectItem value="cardio">Cardio</SelectItem>
                                        <SelectItem value="flexibility">Flexibilidade</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Dificuldade</Label>
                                <Select value={formData.difficulty_level} onValueChange={v => setFormData({ ...formData, difficulty_level: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">Iniciante</SelectItem>
                                        <SelectItem value="intermediate">Intermediário</SelectItem>
                                        <SelectItem value="advanced">Avançado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>URL do Vídeo (YouTube Embed)</Label>
                            <Input value={formData.video_url || ''} onChange={e => setFormData({ ...formData, video_url: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Descrição</Label>
                            <Textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSave}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Visualizar: {currentVideoExercise.name}</DialogTitle>
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
                                <p className="text-sm text-muted-foreground">Vídeo indisponível</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o exercício.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Deletar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
