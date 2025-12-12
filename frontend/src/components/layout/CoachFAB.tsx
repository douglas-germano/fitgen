"use client";

import { useState } from "react";
import { Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";

export function CoachFAB() {
    const pathname = usePathname();
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(true);

    // Esconde FAB se já estiver na página do coach
    if (pathname === "/coach") {
        return null;
    }

    // Esconde se usuário fechou manualmente
    if (!isVisible) {
        return null;
    }

    return (
        <>
            {/* Botão flutuante para mobile */}
            <div className="fixed bottom-20 right-4 z-50 md:hidden">
                <Button
                    size="lg"
                    className="h-14 w-14 rounded-full shadow-lg shadow-primary/50 hover:shadow-xl hover:shadow-primary/60 transition-all"
                    onClick={() => router.push("/coach")}
                >
                    <Bot className="h-6 w-6" />
                </Button>
            </div>
        </>
    );
}
