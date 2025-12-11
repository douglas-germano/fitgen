import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { Menu, User, Trophy, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        async function checkAdmin() {
            try {
                const user = await fetchAPI("/auth/me");
                if (user && user.role === 'admin') {
                    setIsAdmin(true);
                }
            } catch (error) {
                console.error("Failed to check admin status", error);
            }
        }
        checkAdmin();
    }, []);

    return (
        <header className="flex h-16 items-center border-b border-white/5 px-6 glass sticky top-0 z-30">
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
