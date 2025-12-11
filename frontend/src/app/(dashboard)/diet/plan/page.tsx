"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fetchAPI } from "@/lib/api";
import { Loader2, RefreshCw, ShoppingCart, Utensils, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface Meal {
    nome: string;
    calorias: number;
    ingredientes: string[];
    preparo: string;
}

interface DayPlan {
    cafe?: Meal;
    almoco?: Meal;
    jantar?: Meal;
    lanche?: Meal;
}

interface ShoppingItem {
    item: string;
    quantidade: string;
    preco_aprox: number;
}

interface DietPlan {
    id: string;
    weekly_plan: Record<string, DayPlan>;
    shopping_list: ShoppingItem[];
    macro_targets: {
        protein: number;
        carbs: number;
        fats: number;
    };
    calories?: number;
    created_at: string;
}

const diasSemana = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
const diasMap: Record<string, string> = {
    'segunda': 'Seg', 'terça': 'Ter', 'terca': 'Ter',
    'quarta': 'Qua', 'quinta': 'Qui', 'sexta': 'Sex',
    'sábado': 'Sáb', 'sabado': 'Sáb', 'domingo': 'Dom'
};

const diasMapFull: Record<string, string> = {
    'segunda': 'Segunda', 'terça': 'Terça', 'terca': 'Terça',
    'quarta': 'Quarta', 'quinta': 'Quinta', 'sexta': 'Sexta',
    'sábado': 'Sábado', 'sabado': 'Sábado', 'domingo': 'Domingo'
};

const refeicaoMap: Record<string, string> = {
    'cafe': '☕ Café', 'almoco': '🍽️ Almoço',
    'jantar': '🌙 Jantar', 'lanche': '🥤 Lanche'
};

export default function DietPlanPage() {
    const router = useRouter();
    const [plan, setPlan] = useState<DietPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState('segunda');
    const [refreshingDay, setRefreshingDay] = useState<string | null>(null);

    const loadPlan = async () => {
        setLoading(true);
        try {
            const data = await fetchAPI("/diet/plan");
            setPlan(data);
        } catch (error: any) {
            console.error("Failed to load diet plan", error);
            if (error.message?.includes('404')) {
                router.push('/diet/onboarding');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlan();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!plan) {
        return (
            <Card className="border-dashed">
                <CardHeader className="text-center py-12">
                    <CardTitle>Nenhuma Dieta Ativa</CardTitle>
                    <CardDescription>Você ainda não tem um plano alimentar gerado.</CardDescription>
                    <div className="pt-4">
                        <Button onClick={() => router.push('/diet/onboarding')}>
                            <Utensils className="mr-2 h-4 w-4" />
                            Criar Plano Alimentar
                        </Button>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    const totalCalories = plan.calories || (plan.macro_targets
        ? (plan.macro_targets.protein * 4) + (plan.macro_targets.carbs * 4) + (plan.macro_targets.fats * 9)
        : 2000);

    // Helper to find plan key regardless of accents (e.g., 'terça' vs 'terca')
    const getPlanForDay = (day: string) => {
        if (!plan.weekly_plan) return {};

        // Try exact match
        if (plan.weekly_plan[day]) return plan.weekly_plan[day];

        // Try normalized match (remove accents)
        const normalizedDay = day.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (plan.weekly_plan[normalizedDay]) return plan.weekly_plan[normalizedDay];

        // Try common variations explicitly if needed
        const alternatives: Record<string, string> = {
            'terça': 'terca', 'sábado': 'sabado',
            'terca': 'terça', 'sabado': 'sábado'
        };
        if (alternatives[day] && plan.weekly_plan[alternatives[day]]) {
            return plan.weekly_plan[alternatives[day]];
        }

        return {};
    };

    const currentDayPlan = getPlanForDay(selectedDay);
    const totalCost = plan.shopping_list?.reduce((sum, item) => sum + (item.preco_aprox || 0), 0) || 0;

    // Refresh Logic


    const handleRefreshDay = async (day: string) => {
        if (refreshingDay) return;
        setRefreshingDay(day);
        try {
            const res = await fetchAPI("/diet/regenerate-day", {
                method: "POST",
                body: JSON.stringify({ day })
            });

            // Check if plan exists before updating
            if (plan && plan.weekly_plan) {
                // Update local state with new data without full reload
                const updatedPlan = { ...plan };
                // Handle different key formats (accents) just in case, though API returns normalized
                const dayKey = Object.keys(updatedPlan.weekly_plan).find(k =>
                    k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ===
                    day.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                ) || day.toLowerCase();

                if (res.day_plan) {
                    updatedPlan.weekly_plan[dayKey] = res.day_plan;
                    setPlan(updatedPlan);
                }
            }
        } catch (error) {
            console.error("Failed to refresh day", error);
            alert("Erro ao atualizar o dia. Tente novamente.");
        } finally {
            setRefreshingDay(null);
        }
    };

    return (
        <div className="w-full max-w-full overflow-hidden space-y-6 animate-fade-in-up">
            {/* Header & Nav */}
            <div className="flex flex-col gap-4">
                <Button
                    variant="ghost"
                    className="w-fit pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={() => router.push('/diet')}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para Dieta
                </Button>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Meu Plano Alimentar</h2>
                        <p className="text-muted-foreground">Sua dieta personalizada da semana</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.push('/diet/shopping')} size="sm" className="glass-card hover:bg-white/10">
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Lista de Compras
                        </Button>
                        <Button variant="outline" onClick={loadPlan} size="sm" className="glass-card hover:bg-white/10">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Atualizar Plano
                        </Button>
                    </div>
                </div>
            </div>

            {/* Macros Summary (Dashboard Style) */}
            {plan.macro_targets && (
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-in-up delay-100">
                    <Card className="glass-card shadow-lg shadow-primary/5">
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Calorias</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalCalories}</div>
                            <Progress value={100} className="h-2 mt-2 bg-muted/30" />
                            <p className="text-xs text-muted-foreground mt-1">Meta diária</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card shadow-lg shadow-blue-900/10">
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Proteína</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-500">{plan.macro_targets.protein}g</div>
                            <Progress value={100} className="h-2 mt-2 bg-blue-950/30" indicatorClassName="bg-blue-500" />
                            <p className="text-xs text-muted-foreground mt-1">Meta diária</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card shadow-lg shadow-yellow-900/10">
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Carboidratos</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-500">{plan.macro_targets.carbs}g</div>
                            <Progress value={100} className="h-2 mt-2 bg-yellow-950/30" indicatorClassName="bg-yellow-500" />
                            <p className="text-xs text-muted-foreground mt-1">Meta diária</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card shadow-lg shadow-red-900/10">
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Gorduras</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">{plan.macro_targets.fats}g</div>
                            <Progress value={100} className="h-2 mt-2 bg-red-950/30" indicatorClassName="bg-red-500" />
                            <p className="text-xs text-muted-foreground mt-1">Meta diária</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Day Selector */}
            <Card className="glass-card animate-fade-in-up delay-200">
                <CardContent className="p-4">
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 sm:pb-0">
                        {diasSemana.map((dia) => (
                            <Button
                                key={dia}
                                variant={selectedDay === dia ? "default" : "ghost"}
                                onClick={() => setSelectedDay(dia)}
                                className={`flex-shrink-0 relative transition-all ${selectedDay === dia ? 'shadow-md shadow-primary/20 scale-105' : 'text-muted-foreground hover:bg-white/5'}`}
                            >
                                {diasMapFull[dia]}
                                {selectedDay === dia && (
                                    <span
                                        className="ml-2 hover:bg-white/20 rounded-full p-0.5 cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRefreshDay(dia);
                                        }}
                                        title="Gerar novo cardápio para este dia"
                                    >
                                        <RefreshCw className={`h-3 w-3 ${refreshingDay === dia ? 'animate-spin' : ''}`} />
                                    </span>
                                )}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Meals Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 animate-fade-in-up delay-300">
                {Object.entries(currentDayPlan).map(([tipo, refeicao]) => {
                    const meal = refeicao as Meal;
                    const icons: Record<string, string> = {
                        'cafe': '☕', 'almoco': '🍽️', 'jantar': '🌙', 'lanche': '🍎'
                    };

                    return (
                        <Card key={tipo} className="flex flex-col h-full glass-card hover:bg-white/5 transition-all duration-300 outline-none border-white/10 hover:border-primary/20 hover:shadow-lg">
                            <CardHeader className="pb-3 border-b border-white/5 bg-white/5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardDescription className="text-xs font-medium uppercase tracking-wider mb-1 text-primary/80">
                                            {refeicaoMap[tipo] || tipo}
                                        </CardDescription>
                                        <CardTitle className="text-lg leading-tight">
                                            {meal.nome}
                                        </CardTitle>
                                    </div>
                                    <Badge variant="secondary" className="font-mono bg-background/50 border-white/10 text-foreground">
                                        {meal.calorias} kcal
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 p-5 space-y-4">
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
                                        <Utensils className="h-3.5 w-3.5" /> Ingredientes
                                    </h4>
                                    <ul className="text-sm text-muted-foreground space-y-1 pl-1">
                                        {meal.ingredientes?.map((ing, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="block w-1 h-1 rounded-full bg-primary/50 mt-1.5 flex-shrink-0" />
                                                <span className="leading-relaxed">{ing}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {meal.preparo && (
                                    <div className="space-y-2 pt-2 border-t border-white/5">
                                        <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
                                            <Badge variant="outline" className="h-5 px-1 py-0 text-[10px] border-primary/20 text-primary">PREPARO</Badge>
                                        </h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {meal.preparo}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
