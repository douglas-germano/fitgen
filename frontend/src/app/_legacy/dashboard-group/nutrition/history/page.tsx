"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, TrendingDown, Calendar, ArrowLeft } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { chartColors, chartConfig } from '@/lib/chart-config';

type Period = 'dia' | 'semana' | 'mes' | 'ano';

interface HistoryData {
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    meals_count: number;
}

interface HistoryResponse {
    period: Period;
    start_date: string;
    end_date: string;
    data: HistoryData[];
    summary: {
        total_calories: number;
        avg_calories: number;
        max_calories: number;
        min_calories: number;
        total_days: number;
    };
}

export default function NutritionHistoryPage() {
    const router = useRouter();
    const [period, setPeriod] = useState<Period>('semana');
    const [data, setData] = useState<HistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const loadHistory = async (selectedPeriod: Period) => {
        setLoading(true);
        try {
            const result = await fetchAPI(`/nutrition/history?period=${selectedPeriod}`);
            setData(result);
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory(period);
    }, [period]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        if (period === 'dia') {
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        } else if (period === 'semana') {
            return `Sem ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
        } else if (period === 'mes') {
            return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        } else {
            return date.getFullYear().toString();
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Erro ao carregar histórico</p>
            </div>
        );
    }

    const chartData = data.data.map(d => ({
        ...d,
        name: formatDate(d.date)
    }));

    const trend = data.data.length >= 2
        ? data.data[data.data.length - 1].calories - data.data[0].calories
        : 0;

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col gap-4">
                <Button
                    variant="ghost"
                    className="w-fit pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={() => router.push('/diet')}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para Dieta
                </Button>

                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">Histórico de Dieta</h2>
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
            </div>

            {/* Period Selector */}
            <Card className="glass-card animate-fade-in-up delay-100">
                <CardContent className="pt-6">
                    <div className="flex gap-2">
                        {(['dia', 'semana', 'mes', 'ano'] as Period[]).map((p) => (
                            <Button
                                key={p}
                                variant={period === p ? 'default' : 'outline'}
                                onClick={() => setPeriod(p)}
                                className={`flex-1 ${period === p ? 'shadow-md shadow-primary/20' : 'bg-background/50 border-white/10 hover:bg-white/5'}`}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 animate-fade-in-up delay-200">
                <Card className="glass-card shadow-lg shadow-primary/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Média Diária
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.avg_calories}</div>
                        <p className="text-xs text-muted-foreground">kcal/dia</p>
                    </CardContent>
                </Card>

                <Card className="glass-card shadow-lg shadow-blue-900/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total do Período
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.total_calories.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">kcal total</p>
                    </CardContent>
                </Card>

                <Card className="glass-card shadow-lg shadow-yellow-900/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Máximo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.summary.max_calories}</div>
                        <p className="text-xs text-muted-foreground">kcal/dia</p>
                    </CardContent>
                </Card>

                <Card className="glass-card shadow-lg shadow-green-900/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Tendência
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold">
                                {trend > 0 ? '+' : ''}{trend}
                            </div>
                            {trend > 0 ? (
                                <TrendingUp className="h-5 w-5 text-green-500" />
                            ) : trend < 0 ? (
                                <TrendingDown className="h-5 w-5 text-red-500" />
                            ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            vs início do período
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Calories Line Chart */}
            <Card className="glass-card animate-fade-in-up delay-300">
                <CardHeader>
                    <CardTitle>Calorias ao Longo do Tempo</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray={chartConfig.gridStrokeDasharray} vertical={false} stroke={chartColors.grid} />
                            <XAxis
                                dataKey="name"
                                tickLine={chartConfig.axis.tickLine}
                                axisLine={chartConfig.axis.axisLine}
                                tick={{ fill: chartColors.axis, fontSize: chartConfig.axis.fontSize }}
                                dy={10}
                            />
                            <YAxis
                                tickLine={chartConfig.axis.tickLine}
                                axisLine={chartConfig.axis.axisLine}
                                tick={{ fill: chartColors.axis, fontSize: chartConfig.axis.fontSize }}
                            />
                            <Tooltip
                                contentStyle={chartConfig.tooltip}
                                labelStyle={{ color: chartColors.axis }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="calories"
                                stroke={chartColors.calories}
                                strokeWidth={chartConfig.lineStrokeWidth}
                                name="Calorias"
                                dot={{ fill: chartColors.calories, r: chartConfig.dotRadius, strokeWidth: 0 }}
                                activeDot={{ r: chartConfig.activeDotRadius }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Macros Bar Chart */}
            <Card className="glass-card animate-fade-in-up delay-300">
                <CardHeader>
                    <CardTitle>Distribuição de Macronutrientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray={chartConfig.gridStrokeDasharray} vertical={false} stroke={chartColors.grid} />
                            <XAxis
                                dataKey="name"
                                tickLine={chartConfig.axis.tickLine}
                                axisLine={chartConfig.axis.axisLine}
                                tick={{ fill: chartColors.axis, fontSize: chartConfig.axis.fontSize }}
                                dy={10}
                            />
                            <YAxis
                                tickLine={chartConfig.axis.tickLine}
                                axisLine={chartConfig.axis.axisLine}
                                tick={{ fill: chartColors.axis, fontSize: chartConfig.axis.fontSize }}
                            />
                            <Tooltip
                                contentStyle={chartConfig.tooltip}
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                            />
                            <Legend />
                            <Bar dataKey="protein" stackId="a" fill={chartColors.protein} name="Proteína (g)" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="carbs" stackId="a" fill={chartColors.carbs} name="Carboidratos (g)" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="fats" stackId="a" fill={chartColors.fats} name="Gorduras (g)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Empty State */}
            {data.data.length === 0 && (
                <Card className="glass-card border-dashed">
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                            Nenhum dado encontrado para este período
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
