"use client";

import { useState } from "react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User as UserIcon, LogOut, Lock, HelpCircle, BookOpen, Mail, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { removeToken } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import { useUser } from "@/hooks/useDashboard";

export default function ProfilePage() {
    const router = useRouter();
    const { data: user, isLoading: loading, refetch } = useUser();

    // Name Edit State
    const [isNameOpen, setIsNameOpen] = useState(false);
    const [nameLoading, setNameLoading] = useState(false);
    const [newName, setNewName] = useState("");

    // Password Change State
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [passData, setPassData] = useState({
        old_password: "",
        new_password: "",
        confirm_password: ""
    });

    const handleChangeName = async () => {
        if (!newName || newName.trim() === "") {
            toast.error("Digite um nome válido.");
            return;
        }

        setNameLoading(true);
        try {
            await fetchAPI("/profile/me", {
                method: "PUT",
                body: JSON.stringify({ name: newName })
            });

            toast.success("Nome atualizado com sucesso!");
            setIsNameOpen(false);
            setNewName("");
            refetch();
        } catch (error: any) {
            toast.error(error.message || "Erro ao atualizar nome.");
        } finally {
            setNameLoading(false);
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

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-8 animate-fade-in-up max-w-4xl mx-auto pb-20">
            {/* Header Section */}
            <div className="flex flex-col items-center gap-4 border-b border-white/5 pb-6">
                <div className="text-center space-y-1">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Configurações da Conta</h1>
                    <p className="text-muted-foreground text-lg">Gerencie suas informações e preferências</p>
                </div>
            </div>

            {/* Profile Picture Card */}
            <Card className="glass-card shadow-xl shadow-purple-900/10 border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-primary" />
                        Foto de Perfil
                    </CardTitle>
                    <CardDescription>Personalize como você aparece no app</CardDescription>
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
                            Esta foto será exibida no seu perfil. Clique na imagem acima para alterar.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Name Card */}
            <Card className="glass-card shadow-xl shadow-blue-900/10 border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Edit2 className="h-5 w-5 text-primary" />
                        Nome
                    </CardTitle>
                    <CardDescription>Seu nome de exibição</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-lg font-medium">{user?.name || "Não definido"}</p>
                        </div>
                        <Dialog open={isNameOpen} onOpenChange={setIsNameOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="border-white/10 hover:bg-white/5"
                                    onClick={() => setNewName(user?.name || "")}
                                >
                                    <Edit2 className="mr-2 h-4 w-4" /> Editar
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] glass-card border-white/10">
                                <DialogHeader>
                                    <DialogTitle>Alterar Nome</DialogTitle>
                                    <DialogDescription>
                                        Digite seu novo nome de exibição.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new-name">Novo Nome</Label>
                                        <Input
                                            id="new-name"
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="bg-white/5 border-white/10"
                                            placeholder="Digite seu nome"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsNameOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleChangeName} disabled={nameLoading}>
                                        {nameLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Salvar
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>

            {/* Email Card */}
            <Card className="glass-card shadow-xl shadow-emerald-900/10 border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        Email
                    </CardTitle>
                    <CardDescription>Seu endereço de email</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-lg font-medium">{user?.email || "Não definido"}</p>
                    <p className="text-sm text-muted-foreground mt-2">O email não pode ser alterado</p>
                </CardContent>
            </Card>

            {/* Password Card */}
            <Card className="glass-card shadow-xl shadow-amber-900/10 border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        Senha
                    </CardTitle>
                    <CardDescription>Altere sua senha de acesso</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>

            {/* Onboarding Card */}
            <Card className="glass-card shadow-xl shadow-indigo-900/10 border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Configuração Inicial
                    </CardTitle>
                    <CardDescription>Complete ou refaça o processo de configuração</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        className="border-white/10 hover:bg-white/5"
                        onClick={() => router.push("/onboarding")}
                    >
                        <BookOpen className="mr-2 h-4 w-4" /> Ir para Onboarding
                    </Button>
                </CardContent>
            </Card>

            {/* Help & Support Card */}
            <Card className="glass-card shadow-xl shadow-violet-900/10 border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        Ajuda e Suporte
                    </CardTitle>
                    <CardDescription>Precisa de ajuda? Entre em contato conosco</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Se você tiver alguma dúvida ou problema, nossa equipe está pronta para ajudar.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            className="border-white/10 hover:bg-white/5"
                            onClick={() => window.open("mailto:suporte@fitgen.com", "_blank")}
                        >
                            <Mail className="mr-2 h-4 w-4" /> Email de Suporte
                        </Button>
                        <Button
                            variant="outline"
                            className="border-white/10 hover:bg-white/5"
                            onClick={() => window.open("https://wa.me/5500000000000", "_blank")}
                        >
                            <HelpCircle className="mr-2 h-4 w-4" /> WhatsApp
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Logout Card */}
            <Card className="glass-card shadow-xl shadow-red-900/10 border-red-500/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-400">
                        <LogOut className="h-5 w-5" />
                        Sair da Conta
                    </CardTitle>
                    <CardDescription>Encerrar sua sessão atual</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="destructive"
                        onClick={handleLogout}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40"
                    >
                        <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
