"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, ArrowLeft, Check, ChevronRight } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { AILoading } from "@/components/ui/ai-loading";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// --- Types ---
interface FormData {
    gender: string;
    age: string;
    weight_kg: string;
    height_cm: string;
    fitness_goal: string;
    target_weight_kg: string;
    routine_activity: string;
    training_days_count: string;
    experience_level: string;
    training_location: string;
    injuries: string;
    diet_restriction: string;
    allergies: string;
    meals_per_day: string;
    dislikes: string;
    extra_info: string;
}

// --- Option Card Component (Mobile Optimized) ---
interface OptionProps {
    value: string;
    label: string;
    selected: boolean;
    onClick: () => void;
    description?: string;
}

function OptionCard({ value, label, selected, onClick, description }: OptionProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative flex flex-col p-5 cursor-pointer rounded-2xl border-2 transition-all duration-200 touch-manipulation active:scale-[0.98]",
                selected
                    ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                    : "border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10"
            )}
        >
            <div className={cn("font-bold text-lg", selected ? "text-primary" : "text-foreground")}>
                {label}
            </div>
            {description && (
                <div className="text-sm text-muted-foreground mt-1 leading-snug">{description}</div>
            )}
            {selected && (
                <div className="absolute top-5 right-5 text-primary animate-in zoom-in spin-in-90 duration-300">
                    <Check className="w-6 h-6" />
                </div>
            )}
        </div>
    );
}

// --- Config ---
const TOTAL_STEPS = 16;

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Iniciando...");

    // Smooth scroll to top on step change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    const [formData, setFormData] = useState<FormData>({
        gender: "",
        age: "",
        weight_kg: "",
        height_cm: "",
        fitness_goal: "",
        target_weight_kg: "",
        routine_activity: "",
        training_days_count: "",
        experience_level: "",
        training_location: "",
        injuries: "",
        diet_restriction: "Nenhuma restrição", // Default
        allergies: "Não",
        meals_per_day: "",
        dislikes: "",
        extra_info: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleOptionSelect = (key: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        // Auto-advance for single selection steps could be nice, 
        // but 'Next' button is safer for misclicks. 
        // Let's keep manual Next for consistency, or auto-advance on simple choices?
        // User asked for "optimized", auto-advance is optimized.
        // Let's auto-advance after 300ms for simple choice questions.
        // Except for multi-choice or complex ones. 
        // Actually, let's keep it manual to avoid "Wait I clicked wrong".
    };

    const nextStep = () => {
        // Validation per step
        const val = formData;
        if (step === 1 && !val.gender) return toast.error("Selecione uma opção.");
        if (step === 2 && !val.age) return toast.error("Informe sua idade.");
        if (step === 3 && !val.weight_kg) return toast.error("Informe seu peso.");
        if (step === 4 && !val.height_cm) return toast.error("Informe sua altura.");
        if (step === 5 && !val.fitness_goal) return toast.error("Selecione seu objetivo.");
        // Step 6 is target weight, optional? Let's say optional or default to current.
        if (step === 7 && !val.routine_activity) return toast.error("Selecione sua rotina.");
        if (step === 8 && !val.training_days_count) return toast.error("Selecione os dias.");
        if (step === 9 && !val.experience_level) return toast.error("Selecione sua experiência.");
        if (step === 10 && !val.training_location) return toast.error("Selecione onde vai treinar.");
        // 11 Injuries is optional/input
        // 12 Diet Restr has default
        // 13 Allergies has default
        if (step === 14 && !val.meals_per_day) return toast.error("Selecione quantas refeições.");

        if (step < TOTAL_STEPS) setStep(step + 1);
        else handleSubmit();
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            // --- Logic Mapping (Same as before) ---
            let daysMap: Record<string, string[]> = {
                "2": ["tuesday", "thursday"],
                "3": ["monday", "wednesday", "friday"],
                "4": ["monday", "tuesday", "thursday", "friday"],
                "5": ["monday", "tuesday", "wednesday", "thursday", "friday"],
                "6": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
            };
            const selectedDays = daysMap[formData.training_days_count] || daysMap["3"];

            let backendGoalProfile = "improve_health";
            let backendGoalDiet = "saude";

            switch (formData.fitness_goal) {
                case "Perder gordura":
                    backendGoalProfile = "lose_weight";
                    backendGoalDiet = "emagrecimento";
                    break;
                case "Ganhar massa muscular":
                    backendGoalProfile = "gain_muscle";
                    backendGoalDiet = "ganho_massa";
                    break;
                case "Perder gordura e ganhar massa (recomposição)":
                    backendGoalProfile = "gain_muscle";
                    backendGoalDiet = "ganho_massa";
                    break;
                case "Melhorar condicionamento físico":
                    backendGoalProfile = "improve_health";
                    backendGoalDiet = "saude";
                    break;
                case "Manter o peso atual com mais saúde":
                    backendGoalProfile = "maintain";
                    backendGoalDiet = "manutencao";
                    break;
            }

            let equipmentMap: Record<string, string> = {
                "Academia completa": "gym",
                "Academia básica (poucos equipamentos)": "gym_basic",
                "Em casa com equipamentos (halteres, barras, etc.)": "home_dumbbells",
                "Em casa sem equipamentos (apenas peso corporal)": "bodyweight"
            };
            const equipment = equipmentMap[formData.training_location] || "gym";

            let routineMap: Record<string, string> = {
                "Sedentária": "sedentary",
                "Levemente ativa": "lightly_active",
                "Moderadamente ativa": "moderately_active",
                "Muito ativa": "very_active"
            };
            // Need to match exact strings from OptionCards
            // Or just use includes
            const act = formData.routine_activity;
            let activity = "sedentary";
            if (act.includes("Sedentária")) activity = "sedentary";
            if (act.includes("Levemente")) activity = "lightly_active";
            if (act.includes("Moderadamente")) activity = "moderately_active";
            if (act.includes("Muito ativa")) activity = "very_active";

            let outputExp = "beginner";
            if (formData.experience_level.includes("Intermediário")) outputExp = "intermediate";
            if (formData.experience_level.includes("Avançado")) outputExp = "advanced";

            // --- API Calls ---
            setLoadingMessage("Salvando seu perfil...");
            await fetchAPI("/onboarding", {
                method: "POST",
                body: JSON.stringify({
                    gender: formData.gender === "Masculino" ? "male" : "female",
                    age: parseInt(formData.age),
                    current_weight_kg: parseFloat(formData.weight_kg),
                    height_cm: parseFloat(formData.height_cm),
                    target_weight_kg: parseFloat(formData.target_weight_kg || formData.weight_kg),
                    fitness_goal: backendGoalProfile,
                    experience_level: outputExp,
                    activity_level: activity,
                    available_days: selectedDays,
                    workout_duration_minutes: 60,
                    equipment_available: [equipment],
                    injuries_limitations: `${formData.injuries}. ${formData.extra_info ? 'Obs: ' + formData.extra_info : ''}`,
                    dietary_restrictions: formData.diet_restriction
                })
            });

            setLoadingMessage("Configurando preferências...");
            await fetchAPI("/diet/onboarding", {
                method: "POST",
                body: JSON.stringify({
                    goal: backendGoalDiet,
                    restrictions: [formData.diet_restriction],
                    allergies: formData.allergies === "Não" ? "" : formData.allergies,
                    dislikes: formData.dislikes + (formData.extra_info ? `\n\n[OBSERVAÇÃO]: ${formData.extra_info}` : ""),
                    meals_per_day: parseInt(formData.meals_per_day.split(" ")[0]),
                    budget: "300_500",
                    ingredient_access: "basicos",
                    cooks_at_home: "sim_todas",
                    prep_time: "30_60",
                    calorie_goal: 2000
                })
            });

            setLoadingMessage("Criando seu treino com IA...");
            await fetchAPI("/onboarding/generate-workout", { method: "POST" });

            setLoadingMessage("Montando dieta personalizada...");
            await fetchAPI("/diet/generate", { method: "POST" });

            toast.success("Tudo pronto!");
            router.push("/dashboard");

        } catch (error) {
            console.error(error);
            toast.error("Erro ao configurar perfil. Tente novamente.");
            setIsLoading(false);
        }
    };

    // Calculate progress
    const progress = (step / TOTAL_STEPS) * 100;

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
            {isLoading && <AILoading mode="workout" />}

            <Card className="w-full max-w-lg glass-card shadow-2xl border-white/10 animate-fade-in-up min-h-[600px] flex flex-col">
                <CardHeader className="pb-6">
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full mb-6 overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="flex justify-between items-center text-sm text-muted-foreground uppercase tracking-wider font-mono">
                        <span>Pergunta {step} de {TOTAL_STEPS}</span>
                        {step > 1 && <span className="cursor-pointer hover:text-white" onClick={prevStep}>Voltar</span>}
                    </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-center gap-6">

                    {/* 1. GENDER */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                                Qual é o seu sexo biológico?
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {["Masculino", "Feminino"].map(opt => (
                                    <OptionCard
                                        key={opt} label={opt} value={opt}
                                        selected={formData.gender === opt}
                                        onClick={() => handleOptionSelect("gender", opt)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. AGE */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Qual a sua idade?</h2>
                            <Input
                                name="age" type="number" autoFocus
                                value={formData.age} onChange={handleChange}
                                className="h-20 text-5xl text-center bg-transparent border-b-2 border-white/20 rounded-none focus:border-primary px-0 focus-visible:ring-0 placeholder:text-white/10"
                                placeholder="0"
                            />
                        </div>
                    )}

                    {/* 3. WEIGHT */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Qual o seu peso atual (kg)?</h2>
                            <Input
                                name="weight_kg" type="number" step="0.1" autoFocus
                                value={formData.weight_kg} onChange={handleChange}
                                className="h-20 text-5xl text-center bg-transparent border-b-2 border-white/20 rounded-none focus:border-primary px-0 focus-visible:ring-0 placeholder:text-white/10"
                                placeholder="0.0"
                            />
                        </div>
                    )}

                    {/* 4. HEIGHT */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Qual a sua altura (cm)?</h2>
                            <Input
                                name="height_cm" type="number" autoFocus
                                value={formData.height_cm} onChange={handleChange}
                                className="h-20 text-5xl text-center bg-transparent border-b-2 border-white/20 rounded-none focus:border-primary px-0 focus-visible:ring-0 placeholder:text-white/10"
                                placeholder="170"
                            />
                        </div>
                    )}

                    {/* 5. GOAL */}
                    {step === 5 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold leading-tight">Qual é o seu principal objetivo?</h2>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    "Perder gordura",
                                    "Ganhar massa muscular",
                                    "Perder gordura e ganhar massa (recomposição)",
                                    "Melhorar condicionamento físico",
                                    "Manter o peso atual com mais saúde"
                                ].map(opt => (
                                    <OptionCard
                                        key={opt} label={opt} value={opt}
                                        selected={formData.fitness_goal === opt}
                                        onClick={() => handleOptionSelect("fitness_goal", opt)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 6. TARGET WEIGHT */}
                    {step === 6 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Qual sua meta de peso (kg)?</h2>
                            <CardDescription className="text-lg">Se não tiver meta específica, pode repetir seu peso atual.</CardDescription>
                            <Input
                                name="target_weight_kg" type="number" step="0.1" autoFocus
                                value={formData.target_weight_kg} onChange={handleChange}
                                className="h-20 text-5xl text-center bg-transparent border-b-2 border-white/20 rounded-none focus:border-primary px-0 focus-visible:ring-0 placeholder:text-white/10"
                                placeholder={formData.weight_kg || "70"}
                            />
                        </div>
                    )}

                    {/* 7. ROUTINE */}
                    {step === 7 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold leading-tight">Como é sua rotina diária?</h2>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { l: "Sedentária", d: "Trabalho sentado, pouca movimentação" },
                                    { l: "Levemente ativa", d: "Caminhadas curtas, algumas tarefas em pé" },
                                    { l: "Moderadamente ativa", d: "Em movimento boa parte do dia" },
                                    { l: "Muito ativa", d: "Trabalho físico ou sempre em movimento" },
                                ].map(opt => (
                                    <OptionCard
                                        key={opt.l} label={opt.l} value={opt.l} description={opt.d}
                                        selected={formData.routine_activity.includes(opt.l)}
                                        onClick={() => handleOptionSelect("routine_activity", opt.l + " (" + opt.d + ")")}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 8. DAYS */}
                    {step === 8 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Quantos dias por semana vai treinar?</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {["2", "3", "4", "5", "6"].map(d => (
                                    <div
                                        key={d}
                                        onClick={() => handleOptionSelect("training_days_count", d)}
                                        className={cn(
                                            "h-24 rounded-2xl flex items-center justify-center cursor-pointer border-2 transition-all text-3xl font-bold",
                                            formData.training_days_count === d
                                                ? "bg-primary border-primary text-primary-foreground shadow-lg"
                                                : "bg-white/5 border-white/10 hover:bg-white/10"
                                        )}
                                    >
                                        {d} Dias
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 9. EXPERIENCE */}
                    {step === 9 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Experiência com musculação?</h2>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { l: "Iniciante", d: "Menos de 6 meses ou nunca treinei" },
                                    { l: "Intermediário", d: "6 meses a 2 anos constante" },
                                    { l: "Avançado", d: "Mais de 2 anos constante" },
                                ].map(opt => (
                                    <OptionCard
                                        key={opt.l} label={opt.l} value={opt.l} description={opt.d}
                                        selected={formData.experience_level.includes(opt.l)}
                                        onClick={() => handleOptionSelect("experience_level", opt.l + " (" + opt.d + ")")}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 10. LOCATION */}
                    {step === 10 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Onde você vai treinar?</h2>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    "Academia completa",
                                    "Academia básica (poucos equipamentos)",
                                    "Em casa com equipamentos (halteres, barras, etc.)",
                                    "Em casa sem equipamentos (apenas peso corporal)"
                                ].map(opt => (
                                    <OptionCard
                                        key={opt} label={opt} value={opt}
                                        selected={formData.training_location === opt}
                                        onClick={() => handleOptionSelect("training_location", opt)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 11. INJURIES */}
                    {step === 11 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Possui alguma lesão ou limitação?</h2>
                            <div className="space-y-4">
                                <OptionCard
                                    label="Não possuo limitações" value="Não possuo limitações"
                                    selected={formData.injuries === "Não possuo limitações"}
                                    onClick={() => handleOptionSelect("injuries", "Não possuo limitações")}
                                />
                                <div>
                                    <Label className="mb-2 block text-muted-foreground">Ou descreva sua lesão:</Label>
                                    <Textarea
                                        name="injuries"
                                        placeholder="Ex: Dor no joelho esquerdo..."
                                        value={formData.injuries === "Não possuo limitações" ? "" : formData.injuries}
                                        onChange={(e) => handleOptionSelect("injuries", e.target.value)}
                                        className="bg-white/5 border-white/10 min-h-[100px] text-lg"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 12. DIET RESTR */}
                    {step === 12 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Segue alguma restrição alimentar?</h2>
                            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                {[
                                    "Nenhuma restrição",
                                    "Vegetariano",
                                    "Vegano",
                                    "Low carb / Cetogênica",
                                    "Sem lactose",
                                    "Sem glúten"
                                ].map(opt => (
                                    <OptionCard
                                        key={opt} label={opt} value={opt}
                                        selected={formData.diet_restriction === opt}
                                        onClick={() => handleOptionSelect("diet_restriction", opt)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 13. ALLERGIES */}
                    {step === 13 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Tem alergia a algum alimento?</h2>
                            <div className="space-y-4">
                                <OptionCard
                                    label="Não" value="Não"
                                    selected={formData.allergies === "Não"}
                                    onClick={() => handleOptionSelect("allergies", "Não")}
                                />
                                <div>
                                    <Label className="mb-2 block text-muted-foreground">Ou liste as alergias:</Label>
                                    <Textarea
                                        placeholder="Ex: Amendoim, Camarão..."
                                        value={formData.allergies === "Não" ? "" : formData.allergies}
                                        onChange={(e) => handleOptionSelect("allergies", e.target.value)}
                                        className="bg-white/5 border-white/10 min-h-[100px] text-lg"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 14. MEALS */}
                    {step === 14 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Quantas refeições por dia?</h2>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    "3 refeições",
                                    "4 refeições",
                                    "5 refeições",
                                    "6 ou mais refeições"
                                ].map(opt => (
                                    <OptionCard
                                        key={opt} label={opt} value={opt}
                                        selected={formData.meals_per_day === opt}
                                        onClick={() => handleOptionSelect("meals_per_day", opt)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 15. DISLIKES */}
                    {step === 15 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Alimentos que não gosta?</h2>
                            <CardDescription className="text-lg">Liste alimentos que você quer evitar na dieta.</CardDescription>
                            <Textarea
                                name="dislikes"
                                placeholder="Ex: Fígado, Jiló, Peixe..."
                                value={formData.dislikes}
                                onChange={handleChange}
                                className="bg-white/5 border-white/10 min-h-[150px] text-lg"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* 16. EXTRA INFO */}
                    {step === 16 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <h2 className="text-3xl font-bold">Mais alguma informação?</h2>
                            <CardDescription className="text-lg">Contexto livre para a IA personalizar seu plano.</CardDescription>
                            <Textarea
                                name="extra_info"
                                placeholder="Ex: Trabalho à noite, não sei cozinhar..."
                                value={formData.extra_info}
                                onChange={handleChange}
                                className="bg-white/5 border-white/10 min-h-[150px] text-lg"
                                autoFocus
                            />
                        </div>
                    )}

                </CardContent>

                <CardFooter className="pt-6 border-t border-white/5">
                    {step < TOTAL_STEPS ? (
                        <Button
                            onClick={nextStep}
                            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 rounded-xl"
                        >
                            Próximo <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-purple-600 shadow-[0_0_20px_rgba(var(--primary),0.4)] animate-pulse rounded-xl"
                        >
                            {isLoading ? <Loader2 className="mr-2 w-5 h-5 animate-spin" /> : "Finalizar e Gerar"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
