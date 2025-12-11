"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAPI, setToken } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const data = await fetchAPI("/auth/login", {
                method: "POST",
                body: JSON.stringify(formData),
                skipAuthRedirect: true
            });

            if (data) {
                // Save tokens
                setToken(data.access_token);
                // Also save refresh token (manually for now as api.ts helper setToken only does one)
                if (typeof window !== "undefined" && data.refresh_token) {
                    localStorage.setItem("refresh_token", data.refresh_token);
                }

                // Redirect based on onboarding status
                if (data.onboarding_completed) {
                    router.push("/dashboard");
                } else {
                    router.push("/onboarding");
                }
            }
        } catch (err: any) {
            setError(err.message || "Falha ao realizar login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="glass-card shadow-2xl border-white/10">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">Bem vindo de volta</CardTitle>
                <CardDescription>
                    Digite seu email e senha para acessar sua conta
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Senha</Label>
                            <Link
                                href="/forgot-password"
                                className="text-xs text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-colors"
                            >
                                Esqueceu a senha?
                            </Link>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                        Entrar
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground border-t border-white/5 pt-6 mt-2">
                <p>
                    Não tem uma conta?{" "}
                    <Link href="/register" className="font-medium text-primary hover:underline underline-offset-4">
                        Comece grátis
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}
