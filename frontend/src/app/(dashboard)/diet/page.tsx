"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Utensils, ShoppingCart, Apple, ArrowRight, Activity, Plus, Sparkles, Flame, CheckCircle2, Edit, Trash2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { WeeklyMacrosChart } from "@/components/diet/WeeklyMacrosChart";
import { MealLogger } from "@/components/diet/MealLogger";
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

// Tipagem mínima para DailyStats (usada no dashboard nutricional)
type DailyStats = {
    totals?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fats?: number;
    };
    meals?: any[];
    [key: string]: any;
};

export default function DietPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [hasPlan, setHasPlan] = useState(false);
    const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
    const [planTargets, setPlanTargets] = useState<{ calories: number; protein: number; carbs: number; fats: number } | null>(null);
    const [historyData, setHistoryData] = useState<any[]>([]);

    // AI Modal States
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [editingMealId, setEditingMealId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Edit Logic
    const [editData, setEditData] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleEdit = (meal: any) => {
        setEditData({ ...meal });
        setIsEditOpen(true);
    };

    const saveEdit = async () => {
        if (!editData) return;
        setLoading(true);
        try {
            await fetchAPI(`/nutrition/log/${editData.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    name: editData.name,
                    meal_type: editData.meal_type,
                    calories: parseFloat(editData.calories),
                    protein: parseFloat(editData.macro_protein),
                    carbs: parseFloat(editData.macro_carbs),
                    fats: parseFloat(editData.macro_fats),
                    portion_size: editData.portion_size || "1 porção"
                })
            });
            toast.success("Refeição atualizada!");
            setIsEditOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar.");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        try {
            await fetchAPI(`/nutrition/log/${deleteId}`, { method: "DELETE" });
            toast.success("Refeição excluída com sucesso!");
            fetchData();
        } catch (error) {
            toast.error("Erro ao excluir refeição.");
        } finally {
            setDeleteId(null);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Get Plan (for targets)
            let targets = null;
            try {
                const planData = await fetchAPI("/diet/plan");
                if (planData && planData.weekly_plan) {
                    setHasPlan(true);
                    // Estimate daily calories from macros if not explicit
                    // Protein = 4, Carbs = 4, Fats = 9
                    const p = planData.macro_targets?.protein || 0;
                    const c = planData.macro_targets?.carbs || 0;
                    const f = planData.macro_targets?.fats || 0;
                    const cal = (p * 4) + (c * 4) + (f * 9);

                    targets = {
                        protein: p,
                        carbs: c,
                        fats: f,
                        calories: cal > 0 ? cal : 2000 // Default to 2000 if calculation fails
                    };
                    setPlanTargets(targets);
                } else {
                    setHasPlan(false);
                }
            } catch (e) {
                setHasPlan(false);
            }

            // 2. Get Daily Stats
            try {
                const dailyData = await fetchAPI("/nutrition/daily");
                setDailyStats(dailyData);
            } catch (e) {
                console.error("Error fetching daily stats", e);
            }

            // 3. Get History (Last 7 days)
            try {
                const history = await fetchAPI("/nutrition/history?days=7");
                setHistoryData(history);
            } catch (e) {
                console.error("Error fetching history", e);
            }

        } catch (error) {
            console.error("Error loading dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-200px)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Helper to calculate percentage
    const getProgress = (current: number, target: number) => {
        if (!target || target === 0) return 0;
        return Math.min(Math.round((current / target) * 100), 100);
    };

    const currentCals = dailyStats?.totals?.calories || 0;
    const targetCals = planTargets?.calories || 2000;

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header Stats */}
            <div className="flex items-center justify-between px-4 md:px-8 pt-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Nutricional</h1>
                    <p className="text-muted-foreground">
                        Acompanhe seu progresso diário e mantenha o foco.
                    </p>
                </div>
                <Button onClick={() => router.push("/diet/history")} variant="outline" className="hidden md:flex">
                    <Activity className="mr-2 h-4 w-4" />
                    Histórico Completo
                </Button>
            </div>

            {/* Daily Summary Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-fade-in-up delay-100">
                <Card className="glass-card shadow-lg shadow-orange-900/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Calorias</CardTitle>
                        <Flame className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{currentCals} <span className="text-sm text-muted-foreground font-normal">/ {targetCals} kcal</span></div>
                        <Progress value={getProgress(currentCals, targetCals)} className="h-2 mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                            {getProgress(currentCals, targetCals)}% da meta diária
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-lg shadow-blue-900/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Proteínas</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dailyStats?.totals?.protein || 0}g <span className="text-sm text-muted-foreground font-normal">/ {planTargets?.protein || 0}g</span></div>
                        <Progress value={getProgress(dailyStats?.totals?.protein || 0, planTargets?.protein || 0)} className="h-2 mt-2" />
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-lg shadow-green-900/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Carboidratos</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dailyStats?.totals?.carbs || 0}g <span className="text-sm text-muted-foreground font-normal">/ {planTargets?.carbs || 0}g</span></div>
                        <Progress value={getProgress(dailyStats?.totals?.carbs || 0, planTargets?.carbs || 0)} className="h-2 mt-2" />
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-lg shadow-yellow-900/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gorduras</CardTitle>
                        <Activity className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dailyStats?.totals?.fats || 0}g <span className="text-sm text-muted-foreground font-normal">/ {planTargets?.fats || 0}g</span></div>
                        <Progress value={getProgress(dailyStats?.totals?.fats || 0, planTargets?.fats || 0)} className="h-2 mt-2" />
                    </CardContent>
                </Card>
            </div>

            {/* Main Actions Area */}

            <div className="grid gap-6 md:grid-cols-2 animate-fade-in-up delay-200">
                {/* Left Column - Actions & Plan */}
                <div className="space-y-6">

                    {/* Plan Status Card */}
                    {hasPlan ? (
                        <Card className="glass-card bg-primary/5 border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Utensils className="h-5 w-5 text-primary" />
                                    Seu Plano Alimentar
                                </CardTitle>
                                <CardDescription>
                                    Você tem um plano ativo e personalizado.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Acesse seu plano semanal para ver receitas, lista de compras e instruções detalhadas.
                                </p>
                                <Button onClick={() => router.push("/diet/plan")} className="w-full sm:w-auto">
                                    Ver Meu Plano
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="glass-card border-dashed">
                            <CardHeader>
                                <CardTitle>Sem plano ativo</CardTitle>
                                <CardDescription>Crie um plano personalizado para atingir seus objetivos mais rápido.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => router.push("/diet/onboarding")} variant="outline" className="w-full sm:w-auto">
                                    Criar Plano Agora
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* AI Food Logger Card */}
                    <Card className="glass-card relative overflow-hidden shadow-lg shadow-purple-900/10">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <Sparkles className="w-24 h-24" />
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-purple-500" />
                                Registrar com IA
                            </CardTitle>
                            <CardDescription>
                                Descreva o que você comeu e deixe nossa IA calcular os macros.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                size="lg"
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-md shadow-purple-900/20"
                                onClick={() => setIsAiModalOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar Refeição
                            </Button>

                            <MealLogger
                                open={isAiModalOpen}
                                onOpenChange={setIsAiModalOpen}
                                onSuccess={fetchData}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Recent Meals */}
                <div>
                    <Card className="glass-card h-full">
                        <CardHeader>
                            <CardTitle>Refeições de Hoje</CardTitle>
                            <CardDescription>
                                {dailyStats?.meals?.length || 0} refeições registradas
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {dailyStats?.meals && dailyStats.meals.length > 0 ? (
                                    <>
                                        {dailyStats.meals.slice(0, 3).map((meal: any) => (
                                            <div key={meal.id} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium leading-none">{meal.name}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">{meal.meal_type}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-right mr-3">
                                                        <p className="font-medium">{meal.calories} kcal</p>
                                                        <p className="text-xs text-muted-foreground">P:{meal.macro_protein}g C:{meal.macro_carbs}g G:{meal.macro_fats}g</p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500" onClick={() => handleEdit(meal)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => setDeleteId(meal.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {dailyStats.meals.length > 3 && (
                                            <div className="text-center pt-2">
                                                <Button variant="link" size="sm" className="text-xs text-muted-foreground" onClick={() => router.push('/diet/history')}>
                                                    +{dailyStats.meals.length - 3} mais refeições · Ver todas
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Utensils className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                        <p>Nenhuma refeição registrada hoje.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="glass-card">
                    <DialogHeader>
                        <DialogTitle>Editar Refeição</DialogTitle>
                        <DialogDescription>Ajuste os valores nutricionais manualmente.</DialogDescription>
                    </DialogHeader>
                    {editData && (
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome / Alimento</Label>
                                <Input
                                    value={editData.name}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    className="bg-white/5"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select value={editData.meal_type} onValueChange={(v) => setEditData({ ...editData, meal_type: v })}>
                                        <SelectTrigger className="bg-white/5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="breakfast">Café da Manhã</SelectItem>
                                            <SelectItem value="lunch">Almoço</SelectItem>
                                            <SelectItem value="dinner">Jantar</SelectItem>
                                            <SelectItem value="snack">Lanche</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Calorias</Label>
                                    <Input
                                        type="number"
                                        value={editData.calories}
                                        onChange={(e) => setEditData({ ...editData, calories: e.target.value })}
                                        className="bg-white/5"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">Prot (g)</Label>
                                    <Input
                                        type="number"
                                        value={editData.macro_protein}
                                        onChange={(e) => setEditData({ ...editData, macro_protein: e.target.value })}
                                        className="bg-white/5"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Carb (g)</Label>
                                    <Input
                                        type="number"
                                        value={editData.macro_carbs}
                                        onChange={(e) => setEditData({ ...editData, macro_carbs: e.target.value })}
                                        className="bg-white/5"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Gord (g)</Label>
                                    <Input
                                        type="number"
                                        value={editData.macro_fats}
                                        onChange={(e) => setEditData({ ...editData, macro_fats: e.target.value })}
                                        className="bg-white/5"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                        <Button onClick={saveEdit}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Refeição?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover esta refeição do seu diário?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
