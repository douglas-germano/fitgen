"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAPI } from "@/lib/api";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");

        try {
            await fetchAPI("/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email }),
            });
            setMessage("Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.");
        } catch (err: any) {
            // Even if email not found, for security, we usually show the same success message
            // But if it's a server error, we show it.
            // Let's assume the API returns 404 if not found or we just want to be generic
            if (err.message && !err.message.includes("not found")) {
                setError(err.message || "Falha ao solicitar redefinição");
            } else {
                setMessage("Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="glass-card shadow-2xl border-white/10">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">Recuperar Senha</CardTitle>
                <CardDescription>
                    Digite seu email para receber o link de redefinição
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
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-background/50 border-white/10 focus:ring-primary/20 backdrop-blur-sm"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 border-t border-white/5 pt-6 mt-2">
                    <Button className="w-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold" type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar Link
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
