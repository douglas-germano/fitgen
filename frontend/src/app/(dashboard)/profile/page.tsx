"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User as UserIcon, LogOut, CreditCard, Activity, Target, Settings, ChevronRight, Save, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { removeToken } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import { useUser } from "@/hooks/useDashboard";

export default function ProfilePage() {
    const router = useRouter();
    const { data: user, isLoading: loading, refetch } = useUser();
    const [saving, setSaving] = useState(false);

    // Password Change State
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [passData, setPassData] = useState({
        old_password: "",
        new_password: "",
        confirm_password: ""
    });

    // Form states
    const [physicalData, setPhysicalData] = useState({
        age: "",
        gender: "",
        height_cm: "",
        current_weight_kg: "",
        target_weight_kg: ""
    });

    const [goalsData, setGoalsData] = useState({
        fitness_goal: "",
        activity_level: "",
        workout_duration_minutes: "",
        available_days: [] as string[],
        equipment_available: [] as string[]
    });

    // Update local state when user data is loaded
    useEffect(() => {
        if (user) {
            setPhysicalData({
                age: user.age || "",
                gender: user.gender || "",
                height_cm: user.height_cm || "",
                current_weight_kg: user.current_weight_kg || "",
                target_weight_kg: user.target_weight_kg || ""
            });

            setGoalsData({
                fitness_goal: user.fitness_goal || "",
                activity_level: user.activity_level || "",
                workout_duration_minutes: user.workout_duration_minutes || "",
                available_days: user.available_days || [],
                equipment_available: user.equipment_available || []
            });
        }
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...physicalData,
                ...goalsData,
                age: physicalData.age ? parseInt(String(physicalData.age)) : null,
                height_cm: physicalData.height_cm ? parseFloat(String(physicalData.height_cm)) : null,
                current_weight_kg: physicalData.current_weight_kg ? parseFloat(String(physicalData.current_weight_kg)) : null,
                target_weight_kg: physicalData.target_weight_kg ? parseFloat(String(physicalData.target_weight_kg)) : null,
                workout_duration_minutes: goalsData.workout_duration_minutes ? parseInt(String(goalsData.workout_duration_minutes)) : null
            };

            await fetchAPI("/profile/me", {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            toast.success("Perfil atualizado com sucesso!");
            refetch();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar perfil.");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passData.old_password || !passData.new_password || !passData.confirm_password) {
            toast.error("Preencha todos os campos.");
            return;
        }

        if (passData.new_password !== passData.confirm_password) {
            toast.error("As novas senhas não coincidem.");
            return;
        }

        setPassLoading(true);
        try {
            await fetchAPI("/auth/change-password", {
                method: "POST",
                body: JSON.stringify({
                    old_password: passData.old_password,
                    new_password: passData.new_password
                })
            });

            toast.success("Senha alterada com sucesso!");
            setIsPasswordOpen(false);
            setPassData({ old_password: "", new_password: "", confirm_password: "" });
        } catch (error: any) {
            toast.error(error.message || "Erro ao alterar senha.");
        } finally {
            setPassLoading(false);
        }
    };

    const handleLogout = () => {
        removeToken();
        window.location.href = "/login";
    };

    const toggleArrayItem = (array: string[], item: string) => {
        if (array.includes(item)) {
            return array.filter(i => i !== item);
        } else {
            return [...array, item];
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-8 animate-fade-in-up max-w-5xl mx-auto pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Meu Perfil</h1>
                    <p className="text-muted-foreground text-lg">Gerencie suas medidas, metas e preferências.</p>
                </div>
                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
                </Button>
            </div>

            <Tabs defaultValue="physical" className="w-full">
                <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent h-auto p-0 mb-8">
                    <TabsTrigger
                        value="physical"
                        className="flex flex-col md:flex-row items-center justify-center gap-2 py-3 px-2 border border-white/10 bg-white/5 data-[state=active]:bg-primary/20 data-[state=active]:border-primary data-[state=active]:text-primary rounded-lg transition-all hover:bg-white/10"
                    >
                        <Activity className="w-4 h-4" />
                        <span className="text-xs md:text-sm font-medium">Físico</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="goals"
                        className="flex flex-col md:flex-row items-center justify-center gap-2 py-3 px-2 border border-white/10 bg-white/5 data-[state=active]:bg-primary/20 data-[state=active]:border-primary data-[state=active]:text-primary rounded-lg transition-all hover:bg-white/10"
                    >
                        <Target className="w-4 h-4" />
                        <span className="text-xs md:text-sm font-medium line-clamp-1">Objetivos</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="account"
                        className="flex flex-col md:flex-row items-center justify-center gap-2 py-3 px-2 border border-white/10 bg-white/5 data-[state=active]:bg-primary/20 data-[state=active]:border-primary data-[state=active]:text-primary rounded-lg transition-all hover:bg-white/10"
                    >
                        <UserIcon className="w-4 h-4" />
                        <span className="text-xs md:text-sm font-medium">Conta</span>
                    </TabsTrigger>
                </TabsList>

                {/* TAB: PHYSICAL */}
                <TabsContent value="physical" className="mt-8 space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Avatar/Summary Card (Visual Only for now) */}
                        <Card className="glass-card shadow-xl shadow-black/20 border-white/10 overflow-hidden md:col-span-1">
                            <div className="h-32 bg-gradient-to-br from-primary/20 to-purple-500/20" />
                            <CardContent className="-mt-12 px-6 pb-6 text-center relative z-10">
                                <div className="mx-auto w-fit">
                                    <ProfileAvatarUpload
                                        currentImage={user?.profile_picture}
                                        userName={user?.name}
                                        size="md"
                                        className="shadow-lg border-4 border-background"
                                    />
                                </div>
                                <h3 className="mt-4 text-xl font-bold">{user.name}</h3>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                <div className="mt-6 flex justify-center gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-primary">{physicalData.current_weight_kg || "--"}</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Kg Atual</div>
                                    </div>
                                    <div className="w-px bg-white/10" />
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-500">{physicalData.target_weight_kg || "--"}</div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Meta</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Form Section */}
                        <Card className="glass-card shadow-xl shadow-black/20 border-white/10 md:col-span-2">
                            <CardHeader>
                                <CardTitle>Biometria</CardTitle>
                                <CardDescription>Mantenha seus dados atualizados para cálculos precisos de macros e treino.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-muted-foreground tracking-wider">Idade</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={physicalData.age}
                                                onChange={(e) => setPhysicalData({ ...physicalData, age: e.target.value })}
                                                className="bg-white/5 border-white/10 focus:border-primary/50 text-lg h-12"
                                                placeholder="00"
                                            />
                                            <span className="absolute right-4 top-3 text-muted-foreground text-sm">anos</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-muted-foreground tracking-wider">Gênero</Label>
                                        <Select value={physicalData.gender} onValueChange={(v) => setPhysicalData({ ...physicalData, gender: v })}>
                                            <SelectTrigger className="bg-white/5 border-white/10 h-12 text-base">
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Masculino</SelectItem>
                                                <SelectItem value="female">Feminino</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-muted-foreground tracking-wider">Altura</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={physicalData.height_cm}
                                                onChange={(e) => setPhysicalData({ ...physicalData, height_cm: e.target.value })}
                                                className="bg-white/5 border-white/10 focus:border-primary/50 text-lg h-12"
                                                placeholder="000"
                                            />
                                            <span className="absolute right-4 top-3 text-muted-foreground text-sm">cm</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-muted-foreground tracking-wider">Peso Atual</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={physicalData.current_weight_kg}
                                                onChange={(e) => setPhysicalData({ ...physicalData, current_weight_kg: e.target.value })}
                                                className="bg-white/5 border-white/10 focus:border-primary/50 text-lg h-12"
                                                placeholder="00.0"
                                            />
                                            <span className="absolute right-4 top-3 text-muted-foreground text-sm">kg</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-muted-foreground tracking-wider">Peso Meta</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={physicalData.target_weight_kg}
                                                onChange={(e) => setPhysicalData({ ...physicalData, target_weight_kg: e.target.value })}
                                                className="bg-white/5 border-white/10 focus:border-green-500/50 text-lg h-12"
                                                placeholder="00.0"
                                            />
                                            <span className="absolute right-4 top-3 text-muted-foreground text-sm">kg</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full md:w-auto min-w-[140px] shadow-lg shadow-primary/20 hover:shadow-primary/40 font-semibold"
                            size="lg"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Alterações
                        </Button>
                    </div>
                </TabsContent>

                {/* TAB: GOALS */}
                <TabsContent value="goals" className="mt-8 space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                    <Card className="glass-card shadow-xl shadow-black/20 border-white/10">
                        <CardHeader>
                            <CardTitle>Configuração de Treino</CardTitle>
                            <CardDescription>Personalize a experiência do algoritmo.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground tracking-wider">Objetivo Principal</Label>
                                    <Select value={goalsData.fitness_goal} onValueChange={(v) => setGoalsData({ ...goalsData, fitness_goal: v })}>
                                        <SelectTrigger className="bg-white/5 border-white/10 h-12">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="lose_weight">Perder Peso</SelectItem>
                                            <SelectItem value="gain_muscle">Hipertrofia</SelectItem>
                                            <SelectItem value="maintain">Manter Peso</SelectItem>
                                            <SelectItem value="improve_health">Saúde Geral</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground tracking-wider">Nível de Atividade</Label>
                                    <Select value={goalsData.activity_level} onValueChange={(v) => setGoalsData({ ...goalsData, activity_level: v })}>
                                        <SelectTrigger className="bg-white/5 border-white/10 h-12">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sedentary">Sedentário</SelectItem>
                                            <SelectItem value="light">Leve (1-3x/sem)</SelectItem>
                                            <SelectItem value="moderate">Moderado (3-5x/sem)</SelectItem>
                                            <SelectItem value="active">Ativo (6-7x/sem)</SelectItem>
                                            <SelectItem value="very_active">Atleta</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground tracking-wider">Duração do Treino</Label>
                                    <Select value={String(goalsData.workout_duration_minutes || "")} onValueChange={(v) => setGoalsData({ ...goalsData, workout_duration_minutes: v })}>
                                        <SelectTrigger className="bg-white/5 border-white/10 h-12">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="30">30 minutos</SelectItem>
                                            <SelectItem value="45">45 minutos</SelectItem>
                                            <SelectItem value="60">60 minutos</SelectItem>
                                            <SelectItem value="90">90 minutos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-xs uppercase text-muted-foreground tracking-wider">Disponibilidade</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                    {[
                                        { id: 'monday', label: 'Seg' },
                                        { id: 'tuesday', label: 'Ter' },
                                        { id: 'wednesday', label: 'Qua' },
                                        { id: 'thursday', label: 'Qui' },
                                        { id: 'friday', label: 'Sex' },
                                        { id: 'saturday', label: 'Sáb' },
                                        { id: 'sunday', label: 'Dom' },
                                    ].map((day) => {
                                        const isSelected = goalsData.available_days?.includes(day.id);
                                        return (
                                            <div
                                                key={day.id}
                                                onClick={() => setGoalsData({ ...goalsData, available_days: toggleArrayItem(goalsData.available_days, day.id) })}
                                                className={cn(
                                                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer",
                                                    isSelected
                                                        ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                                        : "bg-white/5 border-white/5 hover:bg-white/10 text-muted-foreground"
                                                )}
                                            >
                                                <span className="font-bold">{day.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-xs uppercase text-muted-foreground tracking-wider">Equipamentos Disponíveis</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        { id: 'bodyweight', label: 'Peso do Corpo' },
                                        { id: 'dumbbells', label: 'Halteres' },
                                        { id: 'barbell', label: 'Barra' },
                                        { id: 'machines', label: 'Máquinas' },
                                        { id: 'resistance_bands', label: 'Elásticos' },
                                        { id: 'kettlebell', label: 'Kettlebell' },
                                    ].map((eq) => {
                                        const isSelected = goalsData.equipment_available?.includes(eq.id);
                                        return (
                                            <div
                                                key={eq.id}
                                                onClick={() => setGoalsData({ ...goalsData, equipment_available: toggleArrayItem(goalsData.equipment_available, eq.id) })}
                                                className={cn(
                                                    "flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer",
                                                    isSelected
                                                        ? "bg-primary/10 border-primary/50"
                                                        : "bg-white/5 border-white/5 hover:bg-white/10"
                                                )}
                                            >
                                                <Checkbox
                                                    id={`eq-${eq.id}`}
                                                    checked={isSelected}
                                                    onCheckedChange={() => { }}
                                                    className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                />
                                                <label className="text-sm font-medium cursor-pointer flex-1">
                                                    {eq.label}
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full md:w-auto min-w-[140px] shadow-lg shadow-primary/20 hover:shadow-primary/40 font-semibold"
                            size="lg"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Alterações
                        </Button>
                    </div>
                </TabsContent>

                {/* TAB: ACCOUNT */}
                <TabsContent value="account" className="mt-8 space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                    {/* Profile Picture Card */}
                    <Card className="glass-card shadow-lg shadow-purple-900/5 border-white/10">
                        <CardHeader>
                            <CardTitle>Foto de Perfil</CardTitle>
                            <CardDescription>Personalize como você aparece no app.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col md:flex-row items-center gap-8">
                            <ProfileAvatarUpload
                                currentImage={user?.profile_picture}
                                userName={user?.name}
                                size="xl"
                            />
                            <div className="space-y-2 text-center md:text-left flex-1">
                                <h3 className="font-medium text-lg">Sua Imagem</h3>
                                <p className="text-muted-foreground text-sm max-w-sm">
                                    Esta foto será exibida no seu perfil, nos rankings e na comunidade.
                                    Recomendamos uma imagem quadrada de pelo menos 500x500px.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card shadow-lg shadow-blue-900/5 border-white/10">
                        <CardHeader>
                            <CardTitle>Credenciais</CardTitle>
                            <CardDescription>Informações de acesso.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground tracking-wider">Nome</Label>
                                    <Input value={user?.name || ""} disabled className="bg-white/5 border-transparent text-lg h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground tracking-wider">Email</Label>
                                    <Input value={user?.email || ""} disabled className="bg-white/5 border-transparent text-lg h-12" />
                                </div>
                            </div>

                            <div className="mt-8 border-t border-white/5 pt-6">
                                <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="border-white/10 hover:bg-white/5">
                                            <Lock className="mr-2 h-4 w-4" /> Alterar Senha
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
                                        <DialogHeader>
                                            <DialogTitle>Alterar Senha</DialogTitle>
                                            <DialogDescription>
                                                Digite sua senha atual e a nova senha desejada.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="old-pass">Senha Atual</Label>
                                                <Input
                                                    id="old-pass"
                                                    type="password"
                                                    value={passData.old_password}
                                                    onChange={(e) => setPassData({ ...passData, old_password: e.target.value })}
                                                    className="bg-white/5 border-white/10"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="new-pass">Nova Senha</Label>
                                                <Input
                                                    id="new-pass"
                                                    type="password"
                                                    value={passData.new_password}
                                                    onChange={(e) => setPassData({ ...passData, new_password: e.target.value })}
                                                    className="bg-white/5 border-white/10"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirm-pass">Confirmar Nova Senha</Label>
                                                <Input
                                                    id="confirm-pass"
                                                    type="password"
                                                    value={passData.confirm_password}
                                                    onChange={(e) => setPassData({ ...passData, confirm_password: e.target.value })}
                                                    className="bg-white/5 border-white/10"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setIsPasswordOpen(false)}>Cancelar</Button>
                                            <Button onClick={handleChangePassword} disabled={passLoading}>
                                                {passLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Salvar
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
