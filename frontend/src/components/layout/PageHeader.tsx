"use client";

import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Collapse header after scrolling 50px (Apple HIG pattern)
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div
            className={cn(
                "sticky top-16 z-20 -mx-6 px-6 pb-4 glass border-b border-white/5 transition-all duration-300 ease-out",
                isScrolled
                    ? "pt-3" // Collapsed state
                    : "pt-6", // Expanded state (Large Title)
                className
            )}
        >
            <div className="flex flex-col gap-4">
                {/* Title with smooth size transition */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h1
                            className={cn(
                                "font-bold tracking-tight transition-all duration-300 ease-out",
                                isScrolled
                                    ? "text-xl md:text-2xl" // Collapsed: smaller
                                    : "text-2xl md:text-3xl" // Expanded: Large Title (Apple HIG)
                            )}
                        >
                            {title}
                        </h1>
                        {description && (
                            <p
                                className={cn(
                                    "text-muted-foreground transition-all duration-300 ease-out overflow-hidden",
                                    isScrolled
                                        ? "text-xs opacity-0 max-h-0" // Hide on scroll
                                        : "text-sm opacity-100 max-h-10 mt-1" // Show when expanded
                                )}
                            >
                                {description}
                            </p>
                        )}
                    </div>

                    {/* Actions - visible on desktop, hidden on mobile when we use FAB */}
                    {actions && (
                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                            {actions}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
