"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FABProps {
    onClick: () => void;
    icon: ReactNode;
    label?: string;
    className?: string;
}

/**
 * Floating Action Button (FAB)
 * Apple HIG: Primary action in thumb-friendly zone (bottom-right)
 * Positioned in the "thumb zone" for easy one-handed mobile use
 */
export function FAB({ onClick, icon, label, className }: FABProps) {
    return (
        <Button
            onClick={onClick}
            size="lg"
            className={cn(
                // Positioning: Fixed bottom-right (thumb zone)
                "fixed bottom-6 right-6 z-40",
                // Mobile: Show FAB
                "sm:hidden",
                // Size: 56x56px (Apple HIG minimum touch target)
                "h-14 w-14 rounded-full p-0",
                // Shadow: Elevated appearance
                "shadow-2xl shadow-primary/30",
                // Animation
                "transition-all duration-300 ease-out",
                "hover:scale-110 active:scale-95",
                // Ensure it's above content
                "backdrop-blur-sm",
                className
            )}
            aria-label={label}
        >
            <span className="flex items-center justify-center">
                {icon}
            </span>
        </Button>
    );
}
