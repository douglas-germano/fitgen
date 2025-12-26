"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
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

// --- Option Card Component ---
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
                "relative flex flex-col p-4 cursor-pointer rounded-xl border transition-all duration-200",
                selected
                    ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
            )}
        >
            <div className="font-medium text-base">{label}</div>
            {description && (
                <div className="text-xs text-muted-foreground mt-1">{description}</div>
            )}
            {selected && (
                <div className="absolute top-4 right-4 text-primary">
                    <Check className="w-5 h-5" />
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
        diet_restriction: "Nenhuma restrição",
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
    };

    const nextStep = () => {
        const val = formData;
        if (step === 1 && !val.gender) return toast.error("Selecione uma opção.");
        if (step === 2 && !val.age) return toast.error("Informe sua idade.");
        if (step === 3 && !val.weight_kg) return toast.error("Informe seu peso.");
        if (step === 4 && !val.height_cm) return toast.error("Informe sua altura.");
        if (step === 5 && !val.fitness_goal) return toast.error("Selecione seu objetivo.");
        if (step === 7 && !val.routine_activity) return toast.error("Selecione sua rotina.");
        if (step === 8 && !val.training_days_count) return toast.error("Selecione os dias.");
        if (step === 9 && !val.experience_level) return toast.error("Selecione sua experiência.");
        if (step === 10 && !val.training_location) return toast.error("Selecione onde vai treinar.");
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

            const act = formData.routine_activity;
            let activity = "sedentary";
            if (act.includes("Sedentária")) activity = "sedentary";
            if (act.includes("Levemente")) activity = "lightly_active";
            if (act.includes("Moderadamente")) activity = "moderately_active";
            if (act.includes("Muito ativa")) activity = "very_active";

            let outputExp = "beginner";
            if (formData.experience_level.includes("Intermediário")) outputExp = "intermediate";
            if (formData.experience_level.includes("Avançado")) outputExp = "advanced";

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

    const progress = (step / TOTAL_STEPS) * 100;

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-b from-background to-background/95">
            {isLoading && <AILoading mode="workout" />}

            <div className="w-full max-w-3xl animate-fade-in-up">
                {/* Progress Indicator */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="ml-4 text-sm text-muted-foreground">
                        {step} / {TOTAL_STEPS}
                    </span>
                </div>

                {/* Main Card */}
                <Card className="glass-card shadow-xl shadow-primary/5 border-white/10">
                    <CardHeader className="space-y-2 pb-6">
                        {/* Dynamic Title & Description */}
                        {step === 1 && (
                            <>
                                <CardTitle className="text-2xl">Qual é o seu sexo biológico?</CardTitle>
                                <CardDescription>Isso nos ajuda a calcular suas necessidades nutricionais</CardDescription>
                            </>
                        )}
                        {step === 2 && (
                            <>
                                <CardTitle className="text-2xl">Qual a sua idade?</CardTitle>
                                <CardDescription>Em anos</CardDescription>
                            </>
                        )}
                        {step === 3 && (
                            <>
                                <CardTitle className="text-2xl">Qual o seu peso atual?</CardTitle>
                                <CardDescription>Em quilogramas (kg)</CardDescription>
                            </>
                        )}
                        {step === 4 && (
                            <>
                                <CardTitle className="text-2xl">Qual a sua altura?</CardTitle>
                                <CardDescription>Em centímetros (cm)</CardDescription>
                            </>
                        )}
                        {step === 5 && (
                            <>
                                <CardTitle className="text-2xl">Qual é o seu principal objetivo?</CardTitle>
                                <CardDescription>Selecione o que melhor descreve sua meta</CardDescription>
                            </>
                        )}
                        {step === 6 && (
                            <>
                                <CardTitle className="text-2xl">Qual sua meta de peso?</CardTitle>
                                <CardDescription>Se não tiver uma meta específica, pode repetir o peso atual</CardDescription>
                            </>
                        )}
                        {step === 7 && (
                            <>
                                <CardTitle className="text-2xl">Como é sua rotina diária?</CardTitle>
                                <CardDescription>Nos ajuda a calcular seu gasto calórico</CardDescription>
                            </>
                        )}
                        {step === 8 && (
                            <>
                                <CardTitle className="text-2xl">Quantos dias por semana vai treinar?</CardTitle>
                                <CardDescription>Planejamento realista funciona melhor</CardDescription>
                            </>
                        )}
                        {step === 9 && (
                            <>
                                <CardTitle className="text-2xl">Experiência com musculação?</CardTitle>
                                <CardDescription>Para ajustar a intensidade dos treinos</CardDescription>
                            </>
                        )}
                        {step === 10 && (
                            <>
                                <CardTitle className="text-2xl">Onde você vai treinar?</CardTitle>
                                <CardDescription>Para montar treinos adequados aos equipamentos disponíveis</CardDescription>
                            </>
                        )}
                        {step === 11 && (
                            <>
                                <CardTitle className="text-2xl">Possui alguma lesão ou limitação?</CardTitle>
                                <CardDescription>Vamos adaptar os exercícios para sua segurança</CardDescription>
                            </>
                        )}
                        {step === 12 && (
                            <>
                                <CardTitle className="text-2xl">Segue alguma restrição alimentar?</CardTitle>
                                <CardDescription>Para personalizar sua dieta</CardDescription>
                            </>
                        )}
                        {step === 13 && (
                            <>
                                <CardTitle className="text-2xl">Tem alergia a algum alimento?</CardTitle>
                                <CardDescription>Importante para sua segurança</CardDescription>
                            </>
                        )}
                        {step === 14 && (
                            <>
                                <CardTitle className="text-2xl">Quantas refeições por dia?</CardTitle>
                                <CardDescription>Para distribuir melhor sua nutrição</CardDescription>
                            </>
                        )}
                        {step === 15 && (
                            <>
                                <CardTitle className="text-2xl">Alimentos que não gosta?</CardTitle>
                                <CardDescription>Vamos evitá-los na sua dieta</CardDescription>
                            </>
                        )}
                        {step === 16 && (
                            <>
                                <CardTitle className="text-2xl">Mais alguma informação?</CardTitle>
                                <CardDescription>Qualquer contexto adicional para personalizar seu plano</CardDescription>
                            </>
                        )}
                    </CardHeader>

                    <CardContent className="space-y-6 pb-6">
                        {/* Step 1: Gender */}
                        {step === 1 && (
                            <div className="grid grid-cols-2 gap-3">
                                {["Masculino", "Feminino"].map(opt => (
                                    <OptionCard
                                        key={opt}
                                        label={opt}
                                        value={opt}
                                        selected={formData.gender === opt}
                                        onClick={() => handleOptionSelect("gender", opt)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Step 2: Age */}
                        {step === 2 && (
                            <div>
                                <Input
                                    name="age"
                                    type="number"
                                    autoFocus
                                    value={formData.age}
                                    onChange={handleChange}
                                    className="h-16 text-center text-3xl bg-white/5 border-white/10"
                                    placeholder="25"
                                />
                            </div>
                        )}

                        {/* Step 3: Weight */}
                        {step === 3 && (
                            <div>
                                <Input
                                    name="weight_kg"
                                    type="number"
                                    step="0.1"
                                    autoFocus
                                    value={formData.weight_kg}
                                    onChange={handleChange}
                                    className="h-16 text-center text-3xl bg-white/5 border-white/10"
                                    placeholder="70.0"
                                />
                            </div>
                        )}

                        {/* Step 4: Height */}
                        {step === 4 && (
                            <div>
                                <Input
                                    name="height_cm"
                                    type="number"
                                    autoFocus
                                    value={formData.height_cm}
                                    onChange={handleChange}
                                    className="h-16 text-center text-3xl bg-white/5 border-white/10"
                                    placeholder="175"
                                />
                            </div>
                        )}

                        {/* Step 5: Goal */}
                        {step === 5 && (
                            <div className="space-y-3">
                                {[
                                    "Perder gordura",
                                    "Ganhar massa muscular",
                                    "Perder gordura e ganhar massa (recomposição)",
                                    "Melhorar condicionamento físico",
                                    "Manter o peso atual com mais saúde"
                                ].map(opt => (
                                    <OptionCard
                                        key={opt}
                                        label={opt}
                                        value={opt}
                                        selected={formData.fitness_goal === opt}
                                        onClick={() => handleOptionSelect("fitness_goal", opt)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Step 6: Target Weight */}
                        {step === 6 && (
                            <div>
                                <Input
                                    name="target_weight_kg"
                                    type="number"
                                    step="0.1"
                                    autoFocus
                                    value={formData.target_weight_kg}
                                    onChange={handleChange}
                                    className="h-16 text-center text-3xl bg-white/5 border-white/10"
                                    placeholder={formData.weight_kg || "70.0"}
                                />
                            </div>
                        )}

                        {/* Step 7: Routine */}
                        {step === 7 && (
                            <div className="space-y-3">
                                {[
                                    { l: "Sedentária", d: "Trabalho sentado, pouca movimentação" },
                                    { l: "Levemente ativa", d: "Caminhadas curtas, algumas tarefas em pé" },
                                    { l: "Moderadamente ativa", d: "Em movimento boa parte do dia" },
                                    { l: "Muito ativa", d: "Trabalho físico ou sempre em movimento" }
                                ].map(opt => (
                                    <OptionCard
                                        key={opt.l}
                                        label={opt.l}
                                        value={opt.l}
                                        description={opt.d}
                                        selected={formData.routine_activity.includes(opt.l)}
                                        onClick={() => handleOptionSelect("routine_activity", opt.l + " (" + opt.d + ")")}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Step 8: Days */}
                        {step === 8 && (
                            <div className="grid grid-cols-3 gap-3">
                                {["2", "3", "4", "5", "6"].map(d => (
                                    <div
                                        key={d}
                                        onClick={() => handleOptionSelect("training_days_count", d)}
                                        className={cn(
                                            "h-20 rounded-xl cursor-pointer border flex flex-col items-center justify-center transition-all",
                                            formData.training_days_count === d
                                                ? "bg-primary border-primary text-white shadow-md shadow-primary/30"
                                                : "bg-white/5 border-white/10 hover:bg-white/10"
                                        )}
                                    >
                                        <div className="text-2xl font-bold">{d}</div>
                                        <div className="text-sm">dias</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Step 9: Experience */}
                        {step === 9 && (
                            <div className="space-y-3">
                                {[
                                    { l: "Iniciante", d: "Menos de 6 meses ou nunca treinei" },
                                    { l: "Intermediário", d: "6 meses a 2 anos constante" },
                                    { l: "Avançado", d: "Mais de 2 anos constante" }
                                ].map(opt => (
                                    <OptionCard
                                        key={opt.l}
                                        label={opt.l}
                                        value={opt.l}
                                        description={opt.d}
                                        selected={formData.experience_level.includes(opt.l)}
                                        onClick={() => handleOptionSelect("experience_level", opt.l + " (" + opt.d + ")")}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Step 10: Location */}
                        {step === 10 && (
                            <div className="space-y-3">
                                {[
                                    "Academia completa",
                                    "Academia básica (poucos equipamentos)",
                                    "Em casa com equipamentos (halteres, barras, etc.)",
                                    "Em casa sem equipamentos (apenas peso corporal)"
                                ].map(opt => (
                                    <OptionCard
                                        key={opt}
                                        label={opt}
                                        value={opt}
                                        selected={formData.training_location === opt}
                                        onClick={() => handleOptionSelect("training_location", opt)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Step 11: Injuries */}
                        {step === 11 && (
                            <div className="space-y-4">
                                <OptionCard
                                    label="Não possuo limitações"
                                    value="Não possuo limitações"
                                    selected={formData.injuries === "Não possuo limitações"}
                                    onClick={() => handleOptionSelect("injuries", "Não possuo limitações")}
                                />
                                <div>
                                    <Label className="text-sm text-muted-foreground mb-2 block">Ou descreva sua lesão:</Label>
                                    <Textarea
                                        name="injuries"
                                        placeholder="Ex: Dor no joelho esquerdo..."
                                        value={formData.injuries === "Não possuo limitações" ? "" : formData.injuries}
                                        onChange={(e) => handleOptionSelect("injuries", e.target.value)}
                                        className="bg-white/5 border-white/10"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 12: Diet */}
                        {step === 12 && (
                            <div className="space-y-3">
                                {[
                                    "Nenhuma restrição",
                                    "Vegetariano",
                                    "Vegano",
                                    "Low carb / Cetogênica",
                                    "Sem lactose",
                                    "Sem glúten"
                                ].map(opt => (
                                    <OptionCard
                                        key={opt}
                                        label={opt}
                                        value={opt}
                                        selected={formData.diet_restriction === opt}
                                        onClick={() => handleOptionSelect("diet_restriction", opt)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Step 13: Allergies */}
                        {step === 13 && (
                            <div className="space-y-4">
                                <OptionCard
                                    label="Não"
                                    value="Não"
                                    selected={formData.allergies === "Não"}
                                    onClick={() => handleOptionSelect("allergies", "Não")}
                                />
                                <div>
                                    <Label className="text-sm text-muted-foreground mb-2 block">Ou liste as alergias:</Label>
                                    <Textarea
                                        placeholder="Ex: Amendoim, Camarão..."
                                        value={formData.allergies === "Não" ? "" : formData.allergies}
                                        onChange={(e) => handleOptionSelect("allergies", e.target.value)}
                                        className="bg-white/5 border-white/10"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 14: Meals */}
                        {step === 14 && (
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    "3 refeições",
                                    "4 refeições",
                                    "5 refeições",
                                    "6 ou mais refeições"
                                ].map(opt => (
                                    <OptionCard
                                        key={opt}
                                        label={opt}
                                        value={opt}
                                        selected={formData.meals_per_day === opt}
                                        onClick={() => handleOptionSelect("meals_per_day", opt)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Step 15: Dislikes */}
                        {step === 15 && (
                            <Textarea
                                name="dislikes"
                                placeholder="Ex: Fígado, Jiló, Peixe..."
                                value={formData.dislikes}
                                onChange={handleChange}
                                className="bg-white/5 border-white/10 min-h-[100px]"
                                autoFocus
                            />
                        )}

                        {/* Step 16: Extra */}
                        {step === 16 && (
                            <Textarea
                                name="extra_info"
                                placeholder="Ex: Trabalho à noite, não sei cozinhar..."
                                value={formData.extra_info}
                                onChange={handleChange}
                                className="bg-white/5 border-white/10 min-h-[100px]"
                                autoFocus
                            />
                        )}
                    </CardContent>

                    {/* Navigation Footer */}
                    <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between gap-4">
                        {step > 1 ? (
                            <Button
                                onClick={prevStep}
                                variant="ghost"
                                className="flex-1"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar
                            </Button>
                        ) : (
                            <div className="flex-1" />
                        )}

                        <Button
                            onClick={nextStep}
                            disabled={isLoading}
                            className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : step === TOTAL_STEPS ? (
                                "Finalizar"
                            ) : (
                                <>
                                    Continuar
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
