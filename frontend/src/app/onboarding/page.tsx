"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ArrowLeft, Check, Dumbbell, Calendar, Target, Activity, HeartPulse } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        // Step 1: Biometrics
        age: "",
        gender: "male",
        height_cm: "",
        weight_kg: "",

        // Step 2: Experience & Lifestyle
        experience_level: "beginner",
        activity_level: "sedentary",

        // Step 3: Goals
        fitness_goal: "weight_loss",
        target_weight_kg: "",

        // Step 4: Availability
        available_days: [] as string[], // ['monday', 'wednesday']
        workout_duration_minutes: "60",

        // Step 5: Config
        equipment: "gym",
        injuries: "",
        dietary_restrictions: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleDay = (day: string) => {
        setFormData(prev => {
            const days = prev.available_days.includes(day)
                ? prev.available_days.filter(d => d !== day)
                : [...prev.available_days, day];
            return { ...prev, available_days: days };
        });
    };

    const handleNext = () => {
        if (step === 1 && (!formData.age || !formData.height_cm || !formData.weight_kg)) {
            toast.error("Por favor, preencha todos os campos obrigatórios.");
            return;
        }
        if (step === 3 && (!formData.target_weight_kg)) {
            // Optional: Auto-fill target weight with current weight if empty? 
            // Better to enforce or default. Let's default if empty.
            if (!formData.target_weight_kg) setFormData({ ...formData, target_weight_kg: formData.weight_kg });
        }
        if (step === 4 && formData.available_days.length === 0) {
            toast.error("Por favor, selecione pelo menos um dia para treinar.");
            return;
        }
        setStep(step + 1);
    };

    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            // Sort days to be nice
            const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const sortedDays = [...formData.available_days].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

            // 1. Submit Onboarding Data
            await fetchAPI("/onboarding", {
                method: "POST",
                body: JSON.stringify({
                    age: parseInt(formData.age),
                    gender: formData.gender,
                    height_cm: parseFloat(formData.height_cm),
                    current_weight_kg: parseFloat(formData.weight_kg),
                    target_weight_kg: parseFloat(formData.target_weight_kg || formData.weight_kg),
                    fitness_goal: formData.fitness_goal,
                    experience_level: formData.experience_level,
                    activity_level: formData.activity_level,
                    available_days: sortedDays,
                    workout_duration_minutes: parseInt(formData.workout_duration_minutes),
                    equipment_available: [formData.equipment], // Sending as array for compatibility
                    injuries_limitations: formData.injuries,
                    dietary_restrictions: formData.dietary_restrictions
                }),
            });

            // 2. Trigger Workout Generation
            await fetchAPI("/onboarding/generate-workout", { method: "POST" });

            toast.success("Perfil configurado com sucesso!");
            router.push("/dashboard");
        } catch (error) {
            console.error("Onboarding failed", error);
            toast.error("Erro ao salvar perfil. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const daysOfWeek = [
        { id: 'monday', label: 'Seg', full: 'Segunda' },
        { id: 'tuesday', label: 'Ter', full: 'Terça' },
        { id: 'wednesday', label: 'Qua', full: 'Quarta' },
        { id: 'thursday', label: 'Qui', full: 'Quinta' },
        { id: 'friday', label: 'Sex', full: 'Sexta' },
        { id: 'saturday', label: 'Sáb', full: 'Sábado' },
        { id: 'sunday', label: 'Dom', full: 'Domingo' },
    ];

    return (
        <div className="flex items-center justify-center">
            <Card className="w-full max-w-2xl glass-card shadow-2xl border-white/10 animate-fade-in-up">
                <CardHeader>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <div
                                    key={s}
                                    className={`h-1.5 w-8 rounded-full transition-all duration-300 ${s <= step ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]' : 'bg-white/10'}`}
                                />
                            ))}
                        </div>
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Etapa {step} de 5</span>
                    </div>
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                        {step === 1 && "Vamos começar pelo básico"}
                        {step === 2 && "Seu Estilo de Vida"}
                        {step === 3 && "Qual é o seu objetivo?"}
                        {step === 4 && "Disponibilidade para Treinar"}
                        {step === 5 && "Detalhes Finais"}
                    </CardTitle>
                    <CardDescription>
                        {step === 1 && "Precisamos desses dados para calcular seu metabolismo."}
                        {step === 2 && "Para adaptar o volume e intensidade dos treinos."}
                        {step === 3 && "Defina onde você quer chegar."}
                        {step === 4 && "A IA vai criar um plano que se encaixa na sua rotina."}
                        {step === 5 && "Equipamentos e cuidados especiais."}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 min-h-[300px]">
                    {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="gender">Gênero Biológico</Label>
                                <select
                                    id="gender" name="gender"
                                    className="flex h-10 w-full rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 backdrop-blur-sm"
                                    value={formData.gender} onChange={handleChange}
                                >
                                    <option value="male" className="bg-background">Masculino</option>
                                    <option value="female" className="bg-background">Feminino</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="age">Idade</Label>
                                <Input id="age" name="age" type="number" placeholder="Anos" value={formData.age} onChange={handleChange} className="bg-background/50 border-white/10 focus:ring-primary/20" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="height_cm">Altura (cm)</Label>
                                <Input id="height_cm" name="height_cm" type="number" placeholder="175" value={formData.height_cm} onChange={handleChange} className="bg-background/50 border-white/10 focus:ring-primary/20" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="weight_kg">Peso Atual (kg)</Label>
                                <Input id="weight_kg" name="weight_kg" type="number" step="0.1" placeholder="70.5" value={formData.weight_kg} onChange={handleChange} className="bg-background/50 border-white/10 focus:ring-primary/20" />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="space-y-3">
                                <Label>Nível de Experiência em Treino</Label>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { val: 'beginner', label: 'Iniciante', desc: 'Nunca treinei ou estou parado há meses.' },
                                        { val: 'intermediate', label: 'Intermediário', desc: 'Treino regularmente há pelo menos 6 meses.' },
                                        { val: 'advanced', label: 'Avançado', desc: 'Treino intenso e consistente há anos.' },
                                    ].map((opt) => (
                                        <div
                                            key={opt.val}
                                            onClick={() => setFormData({ ...formData, experience_level: opt.val })}
                                            className={cn(
                                                "p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-white/5",
                                                formData.experience_level === opt.val
                                                    ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                                                    : "border-white/10 bg-background/30"
                                            )}
                                        >
                                            <div className={`font-semibold ${formData.experience_level === opt.val ? 'text-primary' : 'text-foreground'}`}>{opt.label}</div>
                                            <div className="text-sm text-muted-foreground">{opt.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="activity_level">Nível de Atividade Diária (Trabalho/Rotina)</Label>
                                <select
                                    id="activity_level" name="activity_level"
                                    className="flex h-10 w-full rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 backdrop-blur-sm"
                                    value={formData.activity_level} onChange={handleChange}
                                >
                                    <option value="sedentary" className="bg-background">Sedentário (Trabalho sentado, pouco movimento)</option>
                                    <option value="lightly_active" className="bg-background">Levemente Ativo (Caminhadas ocasionais)</option>
                                    <option value="moderately_active" className="bg-background">Moderadamente Ativo (Trabalho de pé/movimento)</option>
                                    <option value="very_active" className="bg-background">Muito Ativo (Trabalho braçal pesado)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { val: 'weight_loss', label: 'Perder Peso', icon: ArrowRight },
                                    { val: 'muscle_gain', label: 'Hipertrofia', icon: Dumbbell },
                                    { val: 'endurance', label: 'Condicionamento', icon: HeartPulse },
                                    { val: 'maintenance', label: 'Manter Saúde', icon: Activity },
                                ].map((goal) => (
                                    <div
                                        key={goal.val}
                                        onClick={() => setFormData({ ...formData, fitness_goal: goal.val })}
                                        className={cn(
                                            "flex items-center space-x-4 p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-white/5 hover:scale-[1.02]",
                                            formData.fitness_goal === goal.val
                                                ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.15)]"
                                                : "border-white/10 bg-background/30"
                                        )}
                                    >
                                        <goal.icon className={cn("h-6 w-6", formData.fitness_goal === goal.val ? "text-primary" : "text-muted-foreground")} />
                                        <span className={cn("font-medium", formData.fitness_goal === goal.val ? "text-primary" : "text-foreground")}>{goal.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="target_weight_kg">Peso Alvo (kg)</Label>
                                <Input
                                    id="target_weight_kg"
                                    name="target_weight_kg"
                                    type="number"
                                    step="0.1"
                                    placeholder={formData.weight_kg || "70"}
                                    value={formData.target_weight_kg}
                                    onChange={handleChange}
                                    className="bg-background/50 border-white/10 focus:ring-primary/20"
                                />
                                <p className="text-xs text-muted-foreground">Opcional. Se não preencher, usaremos seu peso atual.</p>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="space-y-3">
                                <Label className="text-base">Quais dias você pode treinar?</Label>
                                <p className="text-sm text-muted-foreground mb-2">Selecione os dias da semana disponíveis.</p>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                    {daysOfWeek.map((day) => (
                                        <div
                                            key={day.id}
                                            onClick={() => toggleDay(day.id)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-md border cursor-pointer transition-all duration-200 aspect-square",
                                                formData.available_days.includes(day.id)
                                                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20 transform scale-105"
                                                    : "border-white/10 bg-background/30 text-muted-foreground hover:bg-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <span className="font-bold text-lg leading-none">{day.label}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm text-muted-foreground text-right">
                                    {formData.available_days.length} dias selecionados
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="workout_duration_minutes">Tempo Disponível por Treino</Label>
                                <div className="flex items-center space-x-4 bg-background/30 p-4 rounded-lg border border-white/5">
                                    <Input
                                        id="workout_duration_minutes"
                                        name="workout_duration_minutes"
                                        type="range"
                                        min="20"
                                        max="120"
                                        step="10"
                                        value={formData.workout_duration_minutes}
                                        onChange={handleChange}
                                        className="flex-1 cursor-pointer accent-primary"
                                    />
                                    <span className="font-bold w-24 text-right tabular-nums text-primary">{formData.workout_duration_minutes} min</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="equipment">Equipamento Disponível</Label>
                                <select
                                    id="equipment" name="equipment"
                                    className="flex h-10 w-full rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 backdrop-blur-sm"
                                    value={formData.equipment} onChange={handleChange}
                                >
                                    <option value="gym" className="bg-background">Academia Completa</option>
                                    <option value="home_dumbbells" className="bg-background">Em Casa (Halteres/Elásticos)</option>
                                    <option value="bodyweight" className="bg-background">Em Casa (Apenas Peso do Corpo)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="injuries">Lesões ou Limitações (Opcional)</Label>
                                <Input
                                    id="injuries"
                                    name="injuries"
                                    placeholder="Ex: Dor lombar, joelho direito..."
                                    value={formData.injuries}
                                    onChange={handleChange}
                                    className="bg-background/50 border-white/10 focus:ring-primary/20"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dietary_restrictions">Restrições Alimentares (Opcional)</Label>
                                <Input
                                    id="dietary_restrictions"
                                    name="dietary_restrictions"
                                    placeholder="Ex: Vegano, Intolerante à lactose..."
                                    value={formData.dietary_restrictions}
                                    onChange={handleChange}
                                    className="bg-background/50 border-white/10 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                    )}

                </CardContent>

                <CardFooter className="flex justify-between border-t border-white/5 p-6 bg-white/5">
                    <Button variant="ghost" onClick={handleBack} disabled={step === 1 || isLoading} className="hover:bg-white/10">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>

                    {step < 5 ? (
                        <Button onClick={handleNext} className="shadow-lg shadow-primary/20 hover:shadow-primary/40">
                            Próximo <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[140px] shadow-lg shadow-primary/20 hover:shadow-primary/40 animate-pulse">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                                <>
                                    Finalizar <Check className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
