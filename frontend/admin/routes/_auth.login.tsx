import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAPI, removeToken, setToken } from "@/lib/api";
import { setStorageItem } from "@/lib/storage";

export const Route = createFileRoute("/_auth/login")({ component: LoginPage });

function LoginPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({ email: "", password: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const data = await fetchAPI("/auth/login", {
                method: "POST",
                body: JSON.stringify(formData),
                skipAuthRedirect: true,
            });
            if (!data) return;

            setToken(data.access_token);
            setStorageItem("refresh_token", data.refresh_token);
            queryClient.clear();

            // The web app is admin-only: refuse any other account.
            const me = await fetchAPI("/profile/me", { skipAuthRedirect: true });
            if (me?.role !== "admin" && me?.is_admin !== true) {
                removeToken();
                setError("Esta conta não tem acesso ao painel. Use o app FitGen no seu celular.");
                return;
            }
            void navigate({ to: "/admin" });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Falha ao realizar login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1 text-center">
                <h1 className="text-[28px] font-bold leading-9 tracking-[-0.02em]">Entrar no painel</h1>
                <p className="text-sm text-muted-foreground">Acesso exclusivo para administradores.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[13px] font-semibold">E-mail</Label>
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="voce@fitgen.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-[13px] font-semibold">Senha</Label>
                        <Link to="/forgot-password" className="text-xs font-semibold text-volt-ink underline-offset-4 hover:underline">
                            Esqueceu a senha?
                        </Link>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                    />
                </div>

                {error && (
                    <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-4 py-3 text-sm font-medium text-destructive">
                        {error}
                    </p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="animate-spin" />}
                    Entrar
                </Button>
            </form>
        </div>
    );
}
