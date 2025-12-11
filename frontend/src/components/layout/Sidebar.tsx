"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard,
    Dumbbell,
    Utensils,
    Droplets,
    User,
    LogOut,
    Menu,
    X,
    Trophy,
    Settings,
    Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeToken } from "@/lib/api";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
    { href: "/workouts", label: "Treinos", icon: Dumbbell },
    { href: "/diet", label: "Dieta", icon: Utensils },
    { href: "/hydration", label: "Hidratação", icon: Droplets },
    { href: "/metrics", label: "Métricas", icon: Activity },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
        removeToken();
        router.push("/login");
    };

    const closeSidebar = () => setIsOpen(false);

    return (
        <div
            className={`
                ${className}
                flex flex-col h-full glass border-r border-white/5
            `}
        >
            <div className="h-16 px-4 lg:px-6 border-b border-border flex items-center">
                <h1 className="text-xl lg:text-2xl font-bold tracking-tight">
                    FitGen
                </h1>
            </div>

            <nav className="flex-1 p-3 lg:p-4 space-y-1 lg:space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 lg:px-4 py-3 lg:py-3 rounded-md transition-colors touch-manipulation ${isActive
                                ? "bg-primary text-primary-foreground font-medium"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted"
                                }`}
                        >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <span className="text-sm lg:text-base">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-3 lg:p-4 border-t border-border space-y-1 lg:space-y-2">

                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start px-3 lg:px-4 py-3 text-sm lg:text-base text-muted-foreground hover:bg-muted hover:text-foreground touch-manipulation"
                >
                    <LogOut className="h-5 w-5 mr-3 flex-shrink-0" />
                    Sair
                </Button>
            </div>
        </div>
    );
}
