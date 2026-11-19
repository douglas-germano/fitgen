import { useEffect } from "react";
import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { AdminShell } from "@admin/AdminShell";
import { Button } from "@/components/ui/button";
import { getToken, removeToken } from "@/lib/api";
import { setupTokenRefresh } from "@/lib/auth";
import { useUser } from "@/hooks/useUser";

export const Route = createFileRoute("/admin")({
    ssr: false,
    beforeLoad: () => {
        if (!getToken()) {
            throw redirect({ to: "/login", replace: true });
        }
    },
    component: AdminLayout,
});

function AdminLayout() {
    const navigate = useNavigate();
    const { data: user, isLoading, isError } = useUser();

    useEffect(() => setupTokenRefresh(), []);

    if (isLoading) {
        return (
            <div className="grid min-h-screen place-items-center bg-background">
                <Loader2 className="size-7 animate-spin text-volt-ink" aria-label="Carregando" />
            </div>
        );
    }

    const isAdmin = user?.role === "admin" || user?.is_admin === true;
    if (isError || !isAdmin) {
        return (
            <div className="grid min-h-screen place-items-center bg-ground p-4">
                <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-background p-8 text-center">
                    <span className="mx-auto grid size-14 place-items-center rounded-full bg-danger-soft text-destructive">
                        <ShieldAlert className="size-6" />
                    </span>
                    <h1 className="mt-4 text-xl font-bold tracking-tight">Acesso restrito</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Este painel é exclusivo para administradores do FitGen.
                    </p>
                    <Button
                        className="mt-6 w-full"
                        variant="inverse"
                        onClick={() => {
                            removeToken();
                            void navigate({ to: "/login", replace: true });
                        }}
                    >
                        Entrar com outra conta
                    </Button>
                </div>
            </div>
        );
    }

    return <AdminShell user={user}><Outlet /></AdminShell>;
}
