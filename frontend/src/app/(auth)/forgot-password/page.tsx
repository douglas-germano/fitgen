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
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
                    <CardDescription>
                        Digite seu email para receber o link de redefinição
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {message && (
                            <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md border border-green-200">
                                {message}
                            </div>
                        )}
                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
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
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Link
                        </Button>
                        <div className="text-sm text-center text-muted-foreground">
                            <Link href="/login" className="flex items-center justify-center gap-1 hover:text-primary transition-colors">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar para o Login
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
