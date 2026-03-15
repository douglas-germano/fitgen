"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, TrendingUp, Scale, Activity, Calendar, HeartPulse, Flame } from "lucide-react";
import { useUser } from "@/hooks/useDashboard";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { MetricsSkeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WorkoutVolumeCard } from "@/components/dashboard/WorkoutVolumeCard";

const MetricsEvolutionCharts = dynamic(() => import("@/components/charts/MetricsEvolutionCharts"), { ssr: false });

export default function MetricsPage() {
    const { data: user } = useUser();
    const [loading, setLoading] = useState(true);
    const [weightHistory, setWeightHistory] = useState<any[]>([]);
    const [fatHistory, setFatHistory] = useState<any[]>([]);
    const [muscleHistory, setMuscleHistory] = useState<any[]>([]);
    const [leanMassHistory, setLeanMassHistory] = useState<any[]>([]);
    const [workoutVolume, setWorkoutVolume] = useState<any>(null);

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
            const [weights, fats, muscles, dashboard] = await Promise.all([
                fetchAPI("/metrics/history?type=weight&limit=30"),
                fetchAPI("/metrics/history?type=fat&limit=30"),
                fetchAPI("/metrics/history?type=muscle&limit=30"),
                fetchAPI("/metrics/dashboard")
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
            setWorkoutVolume(dashboard?.workout_volume || null);

            // Calculate Lean Mass using Boer Formula
            if (user?.height_cm && user?.gender && weights.length > 0) {
                const leanMass = weights.map((weightData: any) => {
                    const weight = weightData.value;
                    let leanMassValue = 0;

                    if (user.gender === 'male') {
                        // Boer formula for men: 0.407 × Weight + 0.267 × Height - 19.2
                        leanMassValue = (0.407 * weight) + (0.267 * user.height_cm) - 19.2;
                    } else {
                        // Boer formula for women: 0.252 × Weight + 0.473 × Height - 48.3
                        leanMassValue = (0.252 * weight) + (0.473 * user.height_cm) - 48.3;
                    }

                    return {
                        date: weightData.date,
                        value: parseFloat(leanMassValue.toFixed(1)),
                        formattedDate: weightData.formattedDate,
                        fullDate: weightData.fullDate
                    };
                });

                setLeanMassHistory(leanMass);
            }
        } catch (error) {
            toast.error(getErrorMessage(error, "Erro ao carregar histórico."));
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
            toast.error(getErrorMessage(error, "Erro ao registrar medidas."));
        } finally {
            setIsLogging(false);
        }
    };

    if (loading) {
        return <MetricsSkeleton />;
    }

    // Latest values
    const currentWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].value : "--";
    const currentFat = fatHistory.length > 0 ? fatHistory[fatHistory.length - 1].value + "%" : "--";
    const currentMuscle = muscleHistory.length > 0 ? muscleHistory[muscleHistory.length - 1].value + "kg" : "--";
    // Calculos de IMC e em metrics/page.tsx
    let bmiValue = "--";
    let bmiClassification = "";
    let bmrValue = "--";

    if (user?.height_cm && currentWeight !== "--") {
        const heightM = user.height_cm / 100;
        const weight = typeof currentWeight === 'number' ? currentWeight : parseFloat(currentWeight);

        // IMC
        const bmi = weight / (heightM * heightM);
        bmiValue = bmi.toFixed(1);

        if (bmi < 18.5) bmiClassification = "Abaixo";
        else if (bmi < 24.9) bmiClassification = "Normal";
        else if (bmi < 29.9) bmiClassification = "Sobrepeso";
        else bmiClassification = "Obesidade";

        // TMB (Harris-Benedict)
        if (user.age && user.gender) {
            let bmr = 0;
            if (user.gender === 'male') {
                bmr = 88.36 + (13.4 * weight) + (4.8 * user.height_cm) - (5.7 * user.age);
            } else {
                bmr = 447.6 + (9.2 * weight) + (3.1 * user.height_cm) - (4.3 * user.age);
            }
            bmrValue = Math.round(bmr).toString();
        }
    }

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
                                Preencha apenas o peso. % Gordura e Massa Muscular são calculados automaticamente.
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
                                        placeholder="Auto (vazio)"
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6 animate-fade-in-up delay-100">
                {/* Workout Volume Card */}
                {workoutVolume && (
                    <WorkoutVolumeCard volumeData={workoutVolume} />
                )}

                <Card className="glass-card shadow-lg shadow-blue-900/10 border-l-4 border-l-blue-500 hover:scale-[1.02] transition-transform">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Peso</CardTitle>
                        <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Scale className="h-3 w-3 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-xl md:text-2xl font-bold leading-none">{currentWeight} <span className="text-xs font-normal text-muted-foreground">kg</span></div>
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-lg shadow-orange-900/10 border-l-4 border-l-orange-500 hover:scale-[1.02] transition-transform">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Gordura</CardTitle>
                        <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center">
                            <Activity className="h-3 w-3 text-orange-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-xl md:text-2xl font-bold leading-none">{currentFat}</div>
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-lg shadow-green-900/10 border-l-4 border-l-green-500 hover:scale-[1.02] transition-transform">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Músculo</CardTitle>
                        <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-xl md:text-2xl font-bold leading-none">{currentMuscle}</div>
                    </CardContent>
                </Card>

                {/* IMC Card */}
                <Card className="glass-card shadow-lg shadow-purple-900/10 border-l-4 border-l-purple-500 hover:scale-[1.02] transition-transform">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">IMC</CardTitle>
                        <div className="h-6 w-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                            <HeartPulse className="h-3 w-3 text-purple-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="flex flex-col gap-1">
                            <span className="text-xl md:text-2xl font-bold leading-none">{bmiValue}</span>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase truncate">{bmiClassification || "--"}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* TMB Card */}
                <Card className="glass-card shadow-lg shadow-red-900/10 border-l-4 border-l-red-500 hover:scale-[1.02] transition-transform">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground">TMB</CardTitle>
                        <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center">
                            <Flame className="h-3 w-3 text-red-500" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-xl md:text-2xl font-bold leading-none">{bmrValue} <span className="text-xs font-normal text-muted-foreground">kcal</span></div>
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
                    <MetricsEvolutionCharts
                        weightHistory={weightHistory}
                        fatHistory={fatHistory}
                        muscleHistory={muscleHistory}
                        leanMassHistory={leanMassHistory}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
