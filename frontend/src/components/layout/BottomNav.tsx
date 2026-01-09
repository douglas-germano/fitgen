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
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-3xl border-t border-white/5 pb-[max(env(safe-area-inset-bottom),48px)] pt-3 supports-[backdrop-filter]:bg-[#0A0A0A]/60">
            <nav className="flex items-center justify-around px-2 relative">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300",
                                isActive ? "text-white" : "text-white/40 hover:text-white/70"
                            )}
                        >
                            {/* Active Glow Background */}
                            {isActive && (
                                <div className="absolute inset-0 bg-white/5 rounded-2xl blur-sm scale-110" />
                            )}

                            {/* Icon */}
                            <div className="relative">
                                <Icon className={cn(
                                    "h-6 w-6 transition-all duration-300",
                                    isActive && "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] scale-110"
                                )} />
                            </div>

                            {/* Label */}
                            <span className={cn(
                                "text-[10px] font-medium mt-1 transition-all duration-300",
                                isActive ? "opacity-100 text-white" : "opacity-0 h-0 overflow-hidden"
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
