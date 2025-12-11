"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDateLongBRT } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchAPI } from "@/lib/api";
import { Loader2, ArrowLeft, Shield, Ban, CheckCircle, Trash2, UserCircle, Mail, Calendar, Activity, Dumbbell, Apple, TrendingDown } from "lucide-react";
import Link from "next/link";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface UserDetails {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    profile: {
        age: number;
        height: number;
        weight: number;
        fitness_goal: string;
    } | null;
    activity: {
        workouts: number;
        meals_logged: number;
        metrics_logged: number;
    };
}

export default function UserDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const [user, setUser] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editStatus, setEditStatus] = useState("");
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [newRole, setNewRole] = useState("");

    const loadUser = async () => {
        try {
            const data = await fetchAPI(`/admin/users/${userId}`);
            setUser(data);
            setEditName(data.name);
            setEditEmail(data.email);
            setEditStatus(data.status);
        } catch (e) {
            console.error("Failed to load user", e);
            router.push("/admin");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, [userId]);

    const handleSaveChanges = async () => {
        setSaving(true);
        try {
            await fetchAPI(`/admin/users/${userId}`, {
                method: "PUT",
                body: JSON.stringify({
                    name: editName,
                    email: editEmail,
                    subscription_status: editStatus
                })
            });
            await loadUser();
            setEditing(false);
        } catch (e) {
            console.error("Save failed", e);
            alert("Erro ao salvar alterações");
        } finally {
            setSaving(false);
        }
    };

    const handleChangeRole = async () => {
        setActionLoading(true);
        try {
            await fetchAPI(`/admin/users/${userId}/role`, {
                method: "PUT",
                body: JSON.stringify({ role: newRole })
            });
            await loadUser();
            setShowRoleModal(false);
        } catch (e) {
            console.error("Role change failed", e);
            alert("Erro ao alterar role");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSuspend = async () => {
        setActionLoading(true);
        try {
            await fetchAPI(`/admin/users/${userId}/suspend`, {
                method: "PUT"
            });
            await loadUser();
        } catch (e) {
            console.error("Suspend failed", e);
            alert("Erro ao suspender usuário");
        } finally {
            setActionLoading(false);
        }
    };

    const handleActivate = async () => {
        setActionLoading(true);
        try {
            await fetchAPI(`/admin/users/${userId}/activate`, {
                method: "PUT"
            });
            await loadUser();
        } catch (e) {
            console.error("Activate failed", e);
            alert("Erro ao ativar usuário");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        setActionLoading(true);
        try {
            await fetchAPI(`/admin/users/${userId}`, {
                method: "DELETE"
            });
            router.push("/admin");
        } catch (e) {
            console.error("Delete failed", e);
            alert("Erro ao deletar usuário");
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-muted-foreground">Usuário não encontrado</p>
                <Link href="/admin">
                    <Button>Voltar para Admin</Button>
                </Link>
            </div>
        );
    }

    const getRoleBadge = (role: string) => {
        if (role === "admin") {
            return <Badge className="bg-purple-500"><Shield className="h-3 w-3 mr-1" /> Admin</Badge>;
        }
        return <Badge variant="outline">Usuário</Badge>;
    };

    const getStatusBadge = (status: string) => {
        if (status === "active") {
            return <Badge className="bg-green-500">✓ Ativo</Badge>;
        }
        return <Badge className="bg-red-500">Suspenso</Badge>;
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Detalhes do Usuário</h1>
                        <p className="text-muted-foreground">Visualize e gerencie informações do usuário</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {editing ? (
                        <>
                            <Button variant="outline" onClick={() => setEditing(false)} className="glass-card hover:bg-white/10">
                                Cancelar
                            </Button>
                            <Button onClick={handleSaveChanges} disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Salvar
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => setEditing(true)} className="glass-card hover:bg-white/10" variant="outline">
                            Editar
                        </Button>
                    )}
                </div>
            </div>

            {/* User Info Card */}
            <Card className="glass-card animate-fade-in-up delay-100">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                                <UserCircle className="h-12 w-12 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">{user.name}</CardTitle>
                                <div className="flex items-center gap-2 mt-2">
                                    {getRoleBadge(user.role)}
                                    {getStatusBadge(user.status)}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Nome</label>
                            {editing ? (
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="mt-1 bg-background/50 border-white/10"
                                />
                            ) : (
                                <p className="text-lg">{user.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Mail className="h-4 w-4" /> E-mail
                            </label>
                            {editing ? (
                                <Input
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className="mt-1 bg-background/50 border-white/10"
                                />
                            ) : (
                                <p className="text-lg">{user.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Data de Cadastro
                            </label>
                            <p className="text-lg">
                                {formatDateLongBRT(user.created_at)}
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Status da Assinatura</label>
                            {editing ? (
                                <Select value={editStatus} onValueChange={setEditStatus}>
                                    <SelectTrigger className="mt-1 bg-background/50 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Ativo</SelectItem>
                                        <SelectItem value="suspended">Suspenso</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-lg capitalize">{user.status === "active" ? "Ativo" : "Suspenso"}</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Profile Info */}
            {user.profile && (
                <Card className="glass-card animate-fade-in-up delay-200">
                    <CardHeader>
                        <CardTitle>Informações de Perfil</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="bg-background/20 p-4 rounded-lg border border-white/5">
                                <p className="text-sm text-muted-foreground uppercase tracking-wide">Idade</p>
                                <p className="text-2xl font-bold">{user.profile.age} <span className="text-lg font-normal text-muted-foreground">anos</span></p>
                            </div>
                            <div className="bg-background/20 p-4 rounded-lg border border-white/5">
                                <p className="text-sm text-muted-foreground uppercase tracking-wide">Altura</p>
                                <p className="text-2xl font-bold">{user.profile.height} <span className="text-lg font-normal text-muted-foreground">cm</span></p>
                            </div>
                            <div className="bg-background/20 p-4 rounded-lg border border-white/5">
                                <p className="text-sm text-muted-foreground uppercase tracking-wide">Peso</p>
                                <p className="text-2xl font-bold">{user.profile.weight} <span className="text-lg font-normal text-muted-foreground">kg</span></p>
                            </div>
                            <div className="md:col-span-3 bg-background/20 p-4 rounded-lg border border-white/5">
                                <p className="text-sm text-muted-foreground uppercase tracking-wide">Objetivo</p>
                                <p className="text-lg font-medium capitalize">{user.profile.fitness_goal}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Activity Stats */}
            <div className="grid gap-4 md:grid-cols-3 animate-fade-in-up delay-300">
                <Card className="glass-card hover:bg-white/5 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Treinos</CardTitle>
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user.activity.workouts}</div>
                        <p className="text-xs text-muted-foreground">Planos de treino criados</p>
                    </CardContent>
                </Card>

                <Card className="glass-card hover:bg-white/5 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Refeições</CardTitle>
                        <Apple className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user.activity.meals_logged}</div>
                        <p className="text-xs text-muted-foreground">Refeições registradas</p>
                    </CardContent>
                </Card>

                <Card className="glass-card hover:bg-white/5 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Métricas</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{user.activity.metrics_logged}</div>
                        <p className="text-xs text-muted-foreground">Métricas corporais registradas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            <Card className="glass-card animate-fade-in-up delay-400">
                <CardHeader>
                    <CardTitle>Ações Administrativas</CardTitle>
                    <CardDescription>Gerencie permissões e status da conta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Subscription Status Management */}
                    <div className="p-4 border border-white/10 rounded-lg bg-background/20">
                        <div className="mb-3">
                            <p className="font-medium">Gerenciar Assinatura</p>
                            <p className="text-sm text-muted-foreground">
                                Ativo = Acesso liberado | Suspenso = Acesso bloqueado (dados preservados)
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={user.status === "active" ? "default" : "outline"}
                                size="sm"
                                className={user.status === "active" ? "bg-green-500 hover:bg-green-600 border-none" : "border-white/10 hover:bg-white/5"}
                                onClick={async () => {
                                    setSaving(true);
                                    try {
                                        await fetchAPI(`/admin/users/${userId}`, {
                                            method: "PUT",
                                            body: JSON.stringify({
                                                subscription_status: "active"
                                            })
                                        });
                                        await loadUser();
                                    } catch (e) {
                                        console.error("Failed to update status", e);
                                        alert("Erro ao atualizar status");
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving || user.status === "active"}
                            >
                                {user.status === "active" && "✓ "} Ativo
                            </Button>

                            <Button
                                variant={user.status === "suspended" ? "default" : "outline"}
                                size="sm"
                                className={user.status === "suspended" ? "bg-red-500 hover:bg-red-600 border-none" : "border-white/10 hover:bg-white/5"}
                                onClick={async () => {
                                    setSaving(true);
                                    try {
                                        await fetchAPI(`/admin/users/${userId}`, {
                                            method: "PUT",
                                            body: JSON.stringify({
                                                subscription_status: "suspended"
                                            })
                                        });
                                        await loadUser();
                                    } catch (e) {
                                        console.error("Failed to update status", e);
                                        alert("Erro ao atualizar status");
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving || user.status === "suspended"}
                            >
                                {user.status === "suspended" && "✓ "} Suspenso
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-background/20 hover:bg-background/30 transition-colors">
                        <div>
                            <p className="font-medium">Alterar Role</p>
                            <p className="text-sm text-muted-foreground">Promover ou despromover administrador</p>
                        </div>
                        <Button
                            variant="outline"
                            className="bg-transparent border-white/20 hover:bg-white/5"
                            onClick={() => {
                                setNewRole(user.role === "admin" ? "user" : "admin");
                                setShowRoleModal(true);
                            }}
                        >
                            <Shield className="h-4 w-4 mr-2" />
                            {user.role === "admin" ? "Despormover" : "Promover a Admin"}
                        </Button>
                    </div>

                    {user.status === "suspended" ? (
                        <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-background/20">
                            <div>
                                <p className="font-medium">Ativar Conta</p>
                                <p className="text-sm text-muted-foreground">Reativar acesso do usuário</p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleActivate}
                                disabled={actionLoading}
                                className="border-green-500/20 text-green-500 hover:bg-green-500/10 hover:text-green-400"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Ativar
                            </Button>
                        </div>
                    ) : user.role !== "admin" && (
                        <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-background/20">
                            <div>
                                <p className="font-medium">Suspender Conta</p>
                                <p className="text-sm text-muted-foreground">Bloquear acesso temporariamente</p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleSuspend}
                                disabled={actionLoading}
                                className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                            >
                                <Ban className="h-4 w-4 mr-2" />
                                Suspender
                            </Button>
                        </div>
                    )}

                    {user.role !== "admin" && (
                        <div className="flex items-center justify-between p-4 border border-red-500/20 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors">
                            <div>
                                <p className="font-medium text-destructive">Deletar Usuário</p>
                                <p className="text-sm text-muted-foreground">Remover permanentemente (não pode ser desfeito)</p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteModal(true)}
                                className="shadow-lg shadow-red-900/20"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Deletar
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Modal */}
            <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deletar Usuário Permanentemente?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza absoluta que deseja deletar <strong>{user.name}</strong>?
                            <br /><br />
                            Esta ação é <strong>irreversível</strong> e todos os dados do usuário serão perdidos:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>{user.activity.workouts} planos de treino</li>
                                <li>{user.activity.meals_logged} refeições registradas</li>
                                <li>{user.activity.metrics_logged} métricas corporais</li>
                            </ul>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deletar Permanentemente"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Role Change Modal */}
            <AlertDialog open={showRoleModal} onOpenChange={setShowRoleModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {newRole === "admin" ? "Promover a Administrador?" : "Despromover Administrador?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {newRole === "admin"
                                ? `Tem certeza que deseja promover ${user.name} a administrador? O usuário terá acesso total ao sistema.`
                                : `Tem certeza que deseja remover privilégios de administrador de ${user.name}?`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleChangeRole}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
