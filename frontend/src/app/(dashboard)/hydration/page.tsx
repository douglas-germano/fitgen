"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, Droplets, Settings, CupSoda, Calendar, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { chartColors, chartConfig } from '@/lib/chart-config';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HydrationStats {
    date: string;
    total_intake_ml: number;
    daily_goal_ml: number;
    percentage: number;
}

export default function HydrationPage() {
    const [stats, setStats] = useState<HydrationStats | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingAmount, setAddingAmount] = useState<string>("");
    const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);
    const [newGoal, setNewGoal] = useState<string>("");

    const loadData = async () => {
        try {
            const [dailyData, historyData] = await Promise.all([
                fetchAPI("/hydration/daily"),
                fetchAPI("/hydration/history")
            ]);

            setStats(dailyData);
            setNewGoal(dailyData.daily_goal_ml.toString());

            // Format history for chart
            const formattedHistory = historyData.map((item: any) => ({
                ...item,
                formattedDate: format(new Date(item.date), 'dd/MM', { locale: ptBR }),
                fullDate: format(new Date(item.date), "dd 'de' MMMM", { locale: ptBR })
            }));
            setHistory(formattedHistory);
        } catch (error) {
            toast.error("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAddWater = async (amount: number) => {
        try {
            await fetchAPI("/hydration/log", {
                method: "POST",
                body: JSON.stringify({ amount_ml: amount }),
            });
            toast.success(`${amount}ml registrados!`);
            loadData();
            setAddingAmount("");
        } catch (error) {
            toast.error("Erro ao registrar consumo.");
        }
    };

    const handleUpdateGoal = async () => {
        const goal = parseInt(newGoal);
        if (!goal || goal <= 0) {
            toast.error("Meta inválida.");
            return;
        }

        try {
            await fetchAPI("/hydration/goal", {
                method: "POST",
                body: JSON.stringify({ goal_amount_ml: goal }),
            });
            toast.success("Meta atualizada!");
            setIsUpdatingGoal(false);
            loadData();
        } catch (error) {
            toast.error("Erro ao atualizar meta.");
        }
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-200px)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const percentage = Math.min(stats?.percentage || 0, 100);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Hidratação</h1>
                    <p className="text-muted-foreground">
                        Mantenha-se hidratado para melhor performance.
                    </p>
                </div>
                <Dialog open={isUpdatingGoal} onOpenChange={setIsUpdatingGoal}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-sm">
                            <Settings className="mr-2 h-4 w-4" />
                            Meta: {stats?.daily_goal_ml}ml
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-card border-none text-foreground backdrop-blur-xl">
                        <DialogHeader>
                            <DialogTitle>Definir Meta Diária</DialogTitle>
                            <DialogDescription>
                                Qual seu objetivo de consumo de água (em ml)?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Meta (ml)</Label>
                                <Input
                                    type="number"
                                    value={newGoal}
                                    onChange={(e) => setNewGoal(e.target.value)}
                                    className="bg-background/50 border-white/10"
                                />
                            </div>
                            <Button onClick={handleUpdateGoal} className="w-full">
                                Salvar Meta
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Progress Card */}
                <Card className="glass-card md:col-span-2 lg:col-span-1 shadow-lg shadow-blue-500/20 border-l-4 border-l-blue-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                        <Droplets className="w-48 h-48 -mr-12 -mt-12 text-blue-500" />
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CupSoda className="h-5 w-5 text-blue-500" />
                            Progresso Diário
                        </CardTitle>
                        <CardDescription>
                            Você bebeu {stats?.percentage}% da sua meta hoje.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-6 relative">
                        <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                            {/* Background Circle */}
                            <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50" cy="50" r="45"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    className="text-muted/10"
                                />
                                <circle
                                    cx="50" cy="50" r="45"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    strokeDasharray={`${(percentage / 100) * 283} 283`}
                                    strokeLinecap="round"
                                    className="text-blue-500 transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="flex flex-col items-center z-10">
                                <span className="text-4xl font-bold">{stats?.total_intake_ml}</span>
                                <span className="text-xs text-muted-foreground uppercase">ml hoje</span>
                            </div>
                        </div>
                        <div className="w-full text-center space-y-2 max-w-xs">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>0ml</span>
                                <span>{stats?.daily_goal_ml}ml</span>
                            </div>
                            <Progress value={percentage} className="h-2 w-full bg-blue-950/20" indicatorClassName="bg-gradient-to-r from-blue-400 to-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions Card */}
                <Card className="glass-card flex flex-col justify-between shadow-lg shadow-blue-900/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Registro Rápido
                        </CardTitle>
                        <CardDescription>Adicione água com um clique.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                className="h-24 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-500/10 transition-all bg-background/40 border-white/5"
                                onClick={() => handleAddWater(200)}
                            >
                                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <CupSoda className="h-4 w-4 text-blue-500" />
                                </div>
                                <span className="font-semibold">200 ml</span>
                                <span className="text-xs text-muted-foreground">Copo</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-24 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-500/10 transition-all bg-background/40 border-white/5"
                                onClick={() => handleAddWater(500)}
                            >
                                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <Droplets className="h-4 w-4 text-blue-500" />
                                </div>
                                <span className="font-semibold">500 ml</span>
                                <span className="text-xs text-muted-foreground">Garrafa</span>
                            </Button>
                        </div>

                        <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <Input
                                    type="number"
                                    placeholder="Outra quantidade..."
                                    value={addingAmount}
                                    onChange={(e) => setAddingAmount(e.target.value)}
                                    className="pr-12 bg-background/50 border-white/10"
                                />
                                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">ml</span>
                            </div>
                            <Button onClick={() => handleAddWater(parseInt(addingAmount))} disabled={!addingAmount} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* History Chart */}
            <Card className="glass-card animate-fade-in-up delay-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        Histórico de Hidratação
                    </CardTitle>
                    <CardDescription>Seu consumo de água nos últimos 30 dias.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full mt-4">
                        {/* Chart Gradients - Absolute to avoid layout shift */}
                        <div className="absolute opacity-0 pointer-events-none">
                            <svg style={{ height: 0, width: 0 }}>
                                <defs>
                                    <linearGradient id="colorHydration" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>

                        {history.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history}>
                                    <CartesianGrid strokeDasharray={chartConfig.gridStrokeDasharray} vertical={false} stroke={chartColors.grid} />
                                    <XAxis
                                        dataKey="formattedDate"
                                        tickLine={chartConfig.axis.tickLine}
                                        axisLine={chartConfig.axis.axisLine}
                                        tickMargin={10}
                                        tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }}
                                    />
                                    <YAxis
                                        domain={[0, 'auto']}
                                        tickLine={chartConfig.axis.tickLine}
                                        axisLine={chartConfig.axis.axisLine}
                                        tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }}
                                        width={40}
                                    />
                                    <Tooltip
                                        contentStyle={chartConfig.tooltip}
                                        labelStyle={{ color: chartColors.axis, marginBottom: '4px' }}
                                        itemStyle={{ color: chartColors.hydration }}
                                        formatter={(value: any) => [`${value} ml`, 'Consumo']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={chartColors.hydration}
                                        strokeWidth={chartConfig.areaStrokeWidth}
                                        fillOpacity={1}
                                        fill="url(#colorHydration)"
                                    />
                                    {/* Goal Line */}
                                    {stats?.daily_goal_ml && (
                                        <ReferenceLine y={stats.daily_goal_ml} stroke={chartColors.grid} strokeDasharray="3 3" strokeWidth={1.5} />
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground opacity-50">
                                <Droplets className="h-12 w-12 mb-2" />
                                <p>Sem dados de histórico ainda.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
