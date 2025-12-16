"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Dumbbell,
    Utensils,
    Activity,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
    { href: "/workouts", label: "Treino", icon: Dumbbell },
    { href: "/coach", label: "IA Coach", icon: Sparkles, isCenter: true },
    { href: "/diet", label: "Dieta", icon: Utensils },
    { href: "/metrics", label: "Medidas", icon: Activity },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
            <nav className="flex items-center justify-between px-6 py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] supports-[backdrop-filter]:bg-black/20">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    const isCenter = item.isCenter;

                    if (isCenter) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative -mt-12 group"
                            >
                                <div className={cn(
                                    "absolute inset-0 bg-primary/20 rounded-full blur-xl transition-all duration-300",
                                    isActive ? "opacity-100 scale-125" : "opacity-0 group-hover:opacity-100"
                                )} />
                                <div className={cn(
                                    "relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border border-white/20",
                                    isActive
                                        ? "bg-gradient-to-br from-primary to-primary/80 scale-110 shadow-primary/25"
                                        : "bg-gradient-to-b from-zinc-800 to-zinc-900 group-active:scale-95"
                                )}>
                                    <Icon className={cn(
                                        "h-7 w-7 transition-colors duration-300",
                                        isActive ? "text-white" : "text-primary group-hover:text-white"
                                    )} />
                                </div>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 transition-all duration-300",
                                isActive
                                    ? "text-primary"
                                    : "text-zinc-400 hover:text-white"
                            )}
                        >
                            <Icon className={cn(
                                "h-6 w-6 transition-all duration-300",
                                isActive && "fill-current"
                            )} />
                            <span className={cn(
                                "text-[10px] font-medium transition-all duration-300",
                                isActive ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
