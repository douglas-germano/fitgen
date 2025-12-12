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
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border h-20 pb-safe">
            <nav className="flex items-center justify-around h-full px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center min-w-[64px] rounded-md transition-all",
                                item.isCenter && "relative -mt-6",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {item.isCenter ? (
                                // Botão central destacado com gradiente
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-full blur-md opacity-50" />
                                    <div className={cn(
                                        "relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all",
                                        isActive
                                            ? "bg-gradient-to-br from-primary to-primary/80 scale-110"
                                            : "bg-gradient-to-br from-primary/90 to-primary/70"
                                    )}>
                                        <Icon className="h-6 w-6 text-primary-foreground" />
                                    </div>
                                </div>
                            ) : (
                                <Icon className={cn("h-5 w-5 mb-1", isActive && "fill-current")} />
                            )}
                            <span className={cn(
                                "text-[10px] font-medium",
                                item.isCenter && "mt-1"
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
