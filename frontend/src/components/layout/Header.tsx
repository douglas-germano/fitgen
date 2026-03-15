"use client";

import { User, Trophy, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUser } from "@/hooks/useDashboard";

export function Header() {
    const { data: user } = useUser();
    const isAdmin = user?.role === "admin" || user?.is_admin === true;

    return (
        <header className="flex items-center border-b border-white/5 px-6 glass sticky top-0 z-30 pt-[max(env(safe-area-inset-top),32px)] h-[calc(4rem+max(env(safe-area-inset-top),32px))]">
            <div className="flex flex-1 items-center justify-between">
                <h2 className="text-lg font-semibold md:hidden">FitGen</h2>
                <div className="ml-auto flex items-center gap-2">
                    {isAdmin && (
                        <Link href="/admin">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                aria-label="Painel de administração"
                            >
                                <Shield className="h-5 w-5" />
                                <span className="sr-only">Admin</span>
                            </Button>
                        </Link>
                    )}
                    <NotificationBell />
                    <Link href="/achievements">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full text-yellow-500 hover:text-yellow-600"
                            aria-label="Ver conquistas"
                        >
                            <Trophy className="h-5 w-5" />
                            <span className="sr-only">Conquistas</span>
                        </Button>
                    </Link>
                    <ThemeToggle />
                    <Link href="/profile">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            aria-label="Ver perfil"
                        >
                            <User className="h-5 w-5" />
                            <span className="sr-only">Perfil</span>
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}
