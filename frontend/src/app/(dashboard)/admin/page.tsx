"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, CreditCard, Activity, AlertTriangle, Dumbbell, Bell } from "lucide-react";

export default function AdminPage() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadStats() {
            try {
                const data = await fetchAPI("/admin/stats");
                setStats(data);
            } catch (e: any) {
                setError("Acesso negado: Você não é administrador.");
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-destructive">
                <AlertTriangle className="h-12 w-12 mb-4" />
                <h2 className="text-xl font-bold">Acesso Restrito</h2>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
                <p className="text-muted-foreground">Visão geral e estatísticas do sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up delay-100">
                <Card className="glass-card shadow-lg shadow-blue-900/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Usuários Totais</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.users?.total || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            +{stats?.users?.new_last_7_days || 0} nos últimos 7 dias
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-lg shadow-green-900/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Assinaturas Ativas</CardTitle>
                        <CreditCard className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.users?.active_subs || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Usuários pagantes
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-lg shadow-purple-900/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Treinos Criados</CardTitle>
                        <Activity className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.workouts?.total || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.workouts?.ai_generated || 0} gerados por IA
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-lg shadow-orange-900/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Atividade</CardTitle>
                        <Activity className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.activity?.meals_logged || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Refeições registradas
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions / Navigation */}
            <h2 className="text-lg font-semibold mt-8 mb-4">Gerenciamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up delay-200">
                <Card className="glass-card cursor-pointer hover:bg-white/5 transition-all hover:scale-105 duration-300 group" onClick={() => router.push('/admin/users')}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
                            <Users className="h-5 w-5" />
                            Gerenciar Usuários
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Visualizar, editar, suspender ou excluir usuários do sistema.
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card cursor-pointer hover:bg-white/5 transition-all hover:scale-105 duration-300 group" onClick={() => router.push('/admin/exercises')}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
                            <Dumbbell className="h-5 w-5" />
                            Gerenciar Exercícios
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Adicionar, editar e remover exercícios do catálogo oficial.
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card cursor-pointer hover:bg-white/5 transition-all hover:scale-105 duration-300 group" onClick={() => router.push('/admin/notifications')}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
                            <Bell className="h-5 w-5" />
                            Notificações
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Enviar alertas em massa e visualizar histórico de notificações.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
