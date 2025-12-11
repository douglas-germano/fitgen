"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAPI } from "@/lib/api";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    if (!token) {
        return (
            <Card className="glass-card shadow-2xl border-white/10">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight text-destructive">Link Inválido</CardTitle>
                    <CardDescription>
                        O link de redefinição de senha é inválido ou está faltando o token.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="border-t border-white/5 pt-6">
                    <Button className="w-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold" asChild>
                        <Link href="/forgot-password">Solicitar novo link</Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");

        if (password !== confirmPassword) {
            setError("As senhas não coincidem");
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError("A senha deve ter pelo menos 8 caracteres");
            setLoading(false);
            return;
        }

        try {
            await fetchAPI("/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ token, new_password: password }),
            });
            setMessage("Sua senha foi redefinida com sucesso!");
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err: any) {
            setError(err.message || "Falha ao redefinir senha");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="glass-card shadow-2xl border-white/10 w-full max-w-md">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">Redefinir Senha</CardTitle>
                <CardDescription>
                    Crie uma nova senha para sua conta
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    {message && (
                        <div className="text-sm font-medium text-green-600 bg-green-500/10 p-3 rounded-[var(--radius-md)] border border-green-500/20 animate-in fade-in slide-in-from-top-1">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-[var(--radius-md)] border border-destructive/20 animate-in fade-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="password">Nova Senha</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                className="bg-background/50 border-white/10 focus:ring-primary/20 backdrop-blur-sm pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            className="bg-background/50 border-white/10 focus:ring-primary/20 backdrop-blur-sm"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 border-t border-white/5 pt-6 mt-2">
                    <Button className="w-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold" type="submit" disabled={loading || !!message}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Redefinir Senha
                    </Button>
                    <div className="text-sm text-center text-muted-foreground">
                        <Link href="/login" className="flex items-center justify-center gap-1 hover:text-primary transition-colors hover:underline underline-offset-4">
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para o Login
                        </Link>
                    </div>
                </CardFooter>
            </form>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
