"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAPI, setToken } from "@/lib/api";
import { setStorageItem } from "@/lib/storage";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("As senhas não coincidem");
            setLoading(false);
            return;
        }

        try {
            const data = await fetchAPI("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone || undefined
                }),
            });

            // Auto-login logic
            if (data.access_token) {
                // Store tokens using async storage layer
                await Promise.all([
                    setToken(data.access_token),
                    setStorageItem("refresh_token", data.refresh_token)
                ]);

                toast.success("Conta criada! Vamos configurar seu perfil.");
                router.push("/onboarding");
            } else {
                // Fallback if no token (shouldn't happen with new backend)
                router.push("/login?registered=true");
            }
        } catch (err: any) {
            setError(err.message || "Falha ao registrar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="glass-card shadow-2xl border-white/10">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">Crie sua conta</CardTitle>
                <CardDescription>
                    Digite seus dados abaixo para criar sua conta
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                            id="name"
                            placeholder="Seu nome"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="bg-background/50 border-white/10 focus:ring-primary/20 backdrop-blur-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="bg-background/50 border-white/10 focus:ring-primary/20 backdrop-blur-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">WhatsApp / Celular (Opcional)</Label>
                        <Input
                            id="phone"
                            placeholder="Ex: 11999990000"
                            value={formData.phone}
                            onChange={(e) => {
                                // Only allow numbers
                                const val = e.target.value.replace(/\D/g, "");
                                setFormData({ ...formData, phone: val });
                            }}
                            className="bg-background/50 border-white/10 focus:ring-primary/20 backdrop-blur-sm"
                        />
                        <p className="text-xs text-muted-foreground"> Apenas números com DDD (Ex: 11999999999) </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            className="bg-background/50 border-white/10 focus:ring-primary/20 backdrop-blur-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                            className="bg-background/50 border-white/10 focus:ring-primary/20 backdrop-blur-sm"
                        />
                    </div>
                    {error && (
                        <div className="text-sm font-medium text-destructive animate-in fade-in slide-in-from-top-1 bg-destructive/10 p-3 rounded-md border border-destructive/20">
                            {error}
                        </div>
                    )}
                    <Button type="submit" className="w-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Registrar
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground border-t border-white/5 pt-6 mt-2">
                <p>
                    Já tem uma conta?{" "}
                    <Link href="/login" className="font-medium text-primary hover:underline underline-offset-4">
                        Entrar
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}
