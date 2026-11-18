"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
    Bell,
    Dumbbell,
    LayoutDashboard,
    ListChecks,
    LogOut,
    Menu,
    Moon,
    Wallet,
    ScrollText,
    Sun,
    Users,
    UsersRound,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { removeToken } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/admin/kit";

const NAV = [
    { href: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
    { href: "/admin/finance", label: "Financeiro", icon: Wallet, exact: false },
    { href: "/admin/users", label: "Usuários", icon: Users, exact: false },
    { href: "/admin/workouts", label: "Treinos", icon: ListChecks, exact: false },
    { href: "/admin/clubs", label: "Clubes", icon: UsersRound, exact: false },
    { href: "/admin/exercises", label: "Exercícios", icon: Dumbbell, exact: false },
    { href: "/admin/notifications", label: "Notificações", icon: Bell, exact: false },
    { href: "/admin/audit-logs", label: "Auditoria", icon: ScrollText, exact: false },
];

export type AdminUser = { name?: string; email?: string } | undefined;

export function Brand({ className }: { className?: string }) {
    return (
        <Link href="/admin" aria-label="FitGen Admin" className={cn("flex items-center gap-2.5 rounded-full outline-offset-4", className)}>
            {/* Light theme: full wordmark. Dark theme: symbol + live text (the wordmark is black). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/fitgen-logo.png" alt="FitGen" width={112} height={32} className="h-8 w-auto dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/fitgen-mark.png" alt="" width={32} height={31} className="hidden h-8 w-auto dark:block" />
            <span className="hidden text-lg font-extrabold italic tracking-tight dark:inline">FitGen</span>
            <span className="rounded-full bg-inverse px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-inverse-foreground">
                Admin
            </span>
        </Link>
    );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();
    return (
        <nav aria-label="Navegação do painel" className="flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
                return (
                    <Link
                        key={href}
                        href={href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                            "flex h-11 items-center gap-3 rounded-full px-4 text-sm font-semibold transition-colors",
                            active
                                ? "bg-inverse text-inverse-foreground"
                                : "text-muted-foreground hover:bg-chip hover:text-foreground",
                        )}
                    >
                        <Icon className={cn("size-[18px]", active && "text-volt")} strokeWidth={2} />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}

function SidebarFooter({ user }: { user: AdminUser }) {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const name = user?.name ?? "Administrador";
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-chip p-3">
                <Avatar name={name} size={36} />
                <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold leading-4">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email ?? "—"}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-chip text-foreground transition-colors hover:bg-line"
                >
                    {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
                </button>
                <button
                    type="button"
                    onClick={async () => {
                        await removeToken();
                        router.push("/login");
                    }}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-chip text-[13px] font-semibold text-foreground transition-colors hover:bg-line"
                >
                    <LogOut className="size-4" /> Sair
                </button>
            </div>
        </div>
    );
}

export function AdminShell({ user, children }: { user: AdminUser; children: ReactNode }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    useEffect(() => setOpen(false), [pathname]);

    return (
        <div className="min-h-screen bg-ground lg:p-3">
            {/* Desktop sidebar (floats on the ground colour) */}
            <aside className="fixed inset-y-3 left-3 z-20 hidden w-[248px] flex-col justify-between px-2 py-3 lg:flex">
                <div className="space-y-8">
                    <div className="px-2 pt-1">
                        <Brand />
                    </div>
                    <NavList />
                </div>
                <SidebarFooter user={user} />
            </aside>

            {/* Mobile top bar */}
            <div className="sticky top-0 z-30 flex items-center justify-between bg-background px-4 py-3 lg:hidden">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Abrir menu"
                    className="grid size-10 place-items-center rounded-full bg-chip"
                >
                    <Menu className="size-5" />
                </button>
                <Brand />
                <Avatar name={user?.name ?? "A"} size={40} />
            </div>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="left" className="flex w-[280px] flex-col justify-between bg-background p-4">
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <div className="space-y-8 pt-2">
                        <Brand />
                        <NavList onNavigate={() => setOpen(false)} />
                    </div>
                    <SidebarFooter user={user} />
                </SheetContent>
            </Sheet>

            <main className="min-h-[calc(100vh-1.5rem)] bg-background px-4 py-6 sm:px-8 sm:py-8 lg:ml-[260px] lg:rounded-[var(--radius-2xl)]">
                <div className="mx-auto w-full max-w-[1180px] space-y-6">{children}</div>
            </main>
        </div>
    );
}
