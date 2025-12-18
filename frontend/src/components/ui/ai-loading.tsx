"use client";

import { useEffect, useState } from "react";
import { Brain, Sparkles, Dumbbell, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

interface AILoadingProps {
    mode?: "workout" | "diet" | "general";
}

export function AILoading({ mode = "general" }: AILoadingProps) {
    const [text, setText] = useState("Iniciando IA...");

    // Dynamic text sequence
    useEffect(() => {
        const sequences = {
            workout: [
                "Analisando seu perfil físico...",
                "Calculando volume de treino ideal...",
                "Selecionando exercícios...",
                "Otimizando descanso e séries...",
                "Finalizando seu plano personalizado..."
            ],
            diet: [
                "Calculando taxa metabólica...",
                "Definindo macro e micronutrientes...",
                "Selecionando alimentos preferidos...",
                "Gerando receitas...",
                "Montando seu cardápio..."
            ],
            general: [
                "Processando dados...",
                "Consultando inteligência artificial...",
                "Gerando recomendações...",
                "Quase lá..."
            ]
        };

        const currentSeq = sequences[mode];
        let i = 0;

        const interval = setInterval(() => {
            setText(currentSeq[i % currentSeq.length]);
            i++;
        }, 3000); // Change text every 3 seconds

        return () => clearInterval(interval);
    }, [mode]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center mb-8">
                {/* Pulsing circles background */}
                <div className="absolute w-32 h-32 bg-primary/20 rounded-full animate-ping" />
                <div className="absolute w-24 h-24 bg-primary/40 rounded-full animate-pulse delay-75" />

                {/* Icon container */}
                <div className="relative z-10 p-6 bg-background rounded-full border border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.5)]">
                    {mode === 'workout' && <Dumbbell className="w-12 h-12 text-primary animate-bounce-slow" />}
                    {mode === 'diet' && <Utensils className="w-12 h-12 text-primary animate-bounce-slow" />}
                    {mode === 'general' && <Brain className="w-12 h-12 text-primary animate-bounce-slow" />}
                </div>

                {/* Orbiting particles */}
                <div className="absolute inset-0 animate-spin-slow">
                    <div className="absolute -top-4 left-1/2 w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                </div>
                <div className="absolute inset-0 animate-reverse-spin-slow">
                    <div className="absolute -bottom-4 left-1/2 w-3 h-3 bg-purple-400 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                </div>
            </div>

            {/* Text Content */}
            <div className="text-center space-y-2 max-w-md px-6">
                <h3 className="text-2xl font-bold text-white tracking-tight animate-pulse">
                    Criando seu Plano com IA
                </h3>
                <p className="text-lg text-muted-foreground min-h-[1.75rem] transition-all duration-500">
                    {text}
                </p>
            </div>

            {/* Loading Bar */}
            <div className="mt-8 w-64 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-primary to-purple-500 animate-progress-indeterminate" />
            </div>

            <div className="mt-4 flex items-center text-xs text-white/40">
                <Sparkles className="w-3 h-3 mr-1" />
                <span>Powered by Gemini AI</span>
            </div>
        </div>
    );
}
