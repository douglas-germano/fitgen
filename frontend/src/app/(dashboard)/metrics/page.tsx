"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, TrendingUp, Scale, Activity, Ruler, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartColors, chartConfig } from '@/lib/chart-config';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MetricsPage() {
    const [loading, setLoading] = useState(true);
    const [weightHistory, setWeightHistory] = useState<any[]>([]);
    const [fatHistory, setFatHistory] = useState<any[]>([]);
    const [muscleHistory, setMuscleHistory] = useState<any[]>([]);

    // Log Modal State
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [isLogging, setIsLogging] = useState(false);
    const [newData, setNewData] = useState({
        weight_kg: "",
        body_fat_percentage: "",
        muscle_mass_kg: "",
        waist_cm: "",
        notes: ""
    });

    const fetchHistory = async () => {
        try {
            // Parallel fetch for different metric types
            const [weights, fats, muscles] = await Promise.all([
                fetchAPI("/metrics/history?type=weight&limit=30"),
                fetchAPI("/metrics/history?type=fat&limit=30"),
                fetchAPI("/metrics/history?type=muscle&limit=30")
            ]);

            // Format dates for charts
            const formatDate = (data: any[]) => data.map(item => ({
                ...item,
                formattedDate: format(new Date(item.date), 'dd/MM', { locale: ptBR }),
                fullDate: format(new Date(item.date), "dd 'de' MMMM", { locale: ptBR })
            }));

            setWeightHistory(formatDate(weights));
            setFatHistory(formatDate(fats));
            setMuscleHistory(formatDate(muscles));
        } catch (error) {
            toast.error("Erro ao carregar histórico.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleLogMetrics = async () => {
        setIsLogging(true);
        try {
            const payload: any = {};
            if (newData.weight_kg) payload.weight_kg = parseFloat(newData.weight_kg);
            if (newData.body_fat_percentage) payload.body_fat_percentage = parseFloat(newData.body_fat_percentage);
            if (newData.muscle_mass_kg) payload.muscle_mass_kg = parseFloat(newData.muscle_mass_kg);
            if (newData.waist_cm) payload.waist_cm = parseFloat(newData.waist_cm);
            payload.notes = newData.notes;

            await fetchAPI("/metrics/log", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            toast.success("Medidas registradas com sucesso!");
            setIsLogOpen(false);
            setNewData({
                weight_kg: "",
                body_fat_percentage: "",
                muscle_mass_kg: "",
                waist_cm: "",
                notes: ""
            });
            fetchHistory();
        } catch (error) {
            toast.error("Erro ao registrar medidas.");
        } finally {
            setIsLogging(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-200px)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Latest values
    const currentWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].value : "--";
    const currentFat = fatHistory.length > 0 ? fatHistory[fatHistory.length - 1].value + "%" : "--";
    const currentMuscle = muscleHistory.length > 0 ? muscleHistory[muscleHistory.length - 1].value + "kg" : "--";

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Métricas Corporais</h1>
                    <p className="text-muted-foreground">
                        Acompanhe sua evolução física ao longo do tempo.
                    </p>
                </div>
                <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all text-primary-foreground">
                            <Plus className="mr-2 h-4 w-4" />
                            Registrar Medidas
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] glass-card border-none text-foreground backdrop-blur-xl">
                        <DialogHeader>
                            <DialogTitle>Nova Medição</DialogTitle>
                            <DialogDescription>
                                Preencha os campos que deseja atualizar hoje.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Peso (kg)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        className="bg-background/50 border-white/10"
                                        value={newData.weight_kg}
                                        onChange={(e) => setNewData({ ...newData, weight_kg: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>% Gordura</Label>
                                    <Input
                                        type="number"
                                        placeholder="Auto (vazio)"
                                        step="0.1"
                                        className="bg-background/50 border-white/10"
                                        value={newData.body_fat_percentage}
                                        onChange={(e) => setNewData({ ...newData, body_fat_percentage: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Massa Muscular (kg)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        className="bg-background/50 border-white/10"
                                        value={newData.muscle_mass_kg}
                                        onChange={(e) => setNewData({ ...newData, muscle_mass_kg: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cintura (cm)</Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        className="bg-background/50 border-white/10"
                                        value={newData.waist_cm}
                                        onChange={(e) => setNewData({ ...newData, waist_cm: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Notas</Label>
                                <Input
                                    placeholder="Ex: Pós-treino, em jejum..."
                                    className="bg-background/50 border-white/10"
                                    value={newData.notes}
                                    onChange={(e) => setNewData({ ...newData, notes: e.target.value })}
                                />
                            </div>
                            <Button onClick={handleLogMetrics} disabled={isLogging} className="w-full">
                                {isLogging ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Registro"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-3 animate-fade-in-up delay-100">
                <Card className="glass-card shadow-lg shadow-blue-900/10 border-l-4 border-l-blue-500 hover:scale-[1.02] transition-transform">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Peso Atual</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Scale className="h-4 w-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold leading-none">{currentWeight} <span className="text-sm font-normal text-muted-foreground">kg</span></div>
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-lg shadow-orange-900/10 border-l-4 border-l-orange-500 hover:scale-[1.02] transition-transform">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gordura Corporal</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-orange-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold leading-none">{currentFat}</div>
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-lg shadow-green-900/10 border-l-4 border-l-green-500 hover:scale-[1.02] transition-transform">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Massa Muscular</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold leading-none">{currentMuscle}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <Card className="glass-card animate-fade-in-up delay-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Evolução
                    </CardTitle>
                    <CardDescription>Acompanhe graficamente seu progresso nos últimos 30 registros.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="weight" className="w-full">
                        <TabsList className="mb-4 bg-background/50 border border-white/5 p-1 rounded-lg">
                            <TabsTrigger value="weight" className="rounded-md data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500">Peso</TabsTrigger>
                            <TabsTrigger value="fat" className="rounded-md data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-500">% Gordura</TabsTrigger>
                            <TabsTrigger value="muscle" className="rounded-md data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500">Massa Muscular</TabsTrigger>
                        </TabsList>

                        {/* Chart Gradients */}
                        {/* Chart Gradients - Absolute to avoid layout shift */}
                        <div className="absolute opacity-0 pointer-events-none">
                            <svg style={{ height: 0, width: 0 }}>
                                <defs>
                                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorMuscle" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>

                        <TabsContent value="weight">
                            <div className="h-[300px] w-full mt-4">
                                {weightHistory.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={weightHistory}>
                                            <CartesianGrid strokeDasharray={chartConfig.gridStrokeDasharray} vertical={false} stroke={chartColors.grid} />
                                            <XAxis
                                                dataKey="formattedDate"
                                                tickLine={chartConfig.axis.tickLine}
                                                axisLine={chartConfig.axis.axisLine}
                                                tickMargin={10}
                                                tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }}
                                            />
                                            <YAxis
                                                domain={['auto', 'auto']}
                                                tickLine={chartConfig.axis.tickLine}
                                                axisLine={chartConfig.axis.axisLine}
                                                tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }}
                                                width={30}
                                            />
                                            <Tooltip
                                                contentStyle={chartConfig.tooltip}
                                                labelStyle={{ color: chartColors.axis, marginBottom: '4px' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke={chartColors.weight}
                                                strokeWidth={chartConfig.areaStrokeWidth}
                                                fillOpacity={1}
                                                fill="url(#colorWeight)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground opacity-50">
                                        <Scale className="h-12 w-12 mb-2" />
                                        <p>Sem dados de peso ainda.</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="fat">
                            <div className="h-[300px] w-full mt-4">
                                {fatHistory.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={fatHistory}>
                                            <CartesianGrid strokeDasharray={chartConfig.gridStrokeDasharray} vertical={false} stroke={chartColors.grid} />
                                            <XAxis dataKey="formattedDate" tickLine={chartConfig.axis.tickLine} axisLine={chartConfig.axis.axisLine} tickMargin={10} tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }} />
                                            <YAxis domain={['auto', 'auto']} tickLine={chartConfig.axis.tickLine} axisLine={chartConfig.axis.axisLine} tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }} width={30} />
                                            <Tooltip
                                                contentStyle={chartConfig.tooltip}
                                                labelStyle={{ color: chartColors.axis }}
                                            />
                                            <Area type="monotone" dataKey="value" stroke={chartColors.bodyFat} strokeWidth={chartConfig.areaStrokeWidth} fillOpacity={1} fill="url(#colorFat)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground opacity-50">
                                        <Activity className="h-12 w-12 mb-2" />
                                        <p>Sem dados de gordura ainda.</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="muscle">
                            <div className="h-[300px] w-full mt-4">
                                {muscleHistory.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={muscleHistory}>
                                            <CartesianGrid strokeDasharray={chartConfig.gridStrokeDasharray} vertical={false} stroke={chartColors.grid} />
                                            <XAxis dataKey="formattedDate" tickLine={chartConfig.axis.tickLine} axisLine={chartConfig.axis.axisLine} tickMargin={10} tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }} />
                                            <YAxis domain={['auto', 'auto']} tickLine={chartConfig.axis.tickLine} axisLine={chartConfig.axis.axisLine} tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }} width={30} />
                                            <Tooltip
                                                contentStyle={chartConfig.tooltip}
                                                labelStyle={{ color: chartColors.axis }}
                                            />
                                            <Area type="monotone" dataKey="value" stroke={chartColors.muscle} strokeWidth={chartConfig.areaStrokeWidth} fillOpacity={1} fill="url(#colorMuscle)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground opacity-50">
                                        <TrendingUp className="h-12 w-12 mb-2" />
                                        <p>Sem dados de massa muscular.</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
