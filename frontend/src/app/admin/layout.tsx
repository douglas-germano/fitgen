"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { getToken, removeToken } from "@/lib/api";
import { setupTokenRefresh } from "@/lib/auth";
import { useUser } from "@/hooks/useDashboard";

export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [hasToken, setHasToken] = useState(false);
    const { data: user, isLoading, isError } = useUser();

    useEffect(() => {
        if (!getToken()) {
            router.replace("/login");
            return;
        }
        setHasToken(true);
        return setupTokenRefresh();
    }, [router]);

    if (!hasToken || isLoading) {
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
                        onClick={async () => {
                            await removeToken();
                            router.replace("/login");
                        }}
                    >
                        Entrar com outra conta
                    </Button>
                </div>
            </div>
        );
    }

    return <AdminShell user={user}>{children}</AdminShell>;
}
