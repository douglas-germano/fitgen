"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { fetchAPI } from "@/lib/api";
import { Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";

interface OptionCardProps {
    value: string;
    selected: boolean;
    onClick: () => void;
    title: string;
    description?: string;
    multiSelect?: boolean;
}

function OptionCard({ value, selected, onClick, title, description, multiSelect }: OptionCardProps) {
    return (
        <div
            onClick={onClick}
            className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all touch-manipulation ${selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                }`}
        >
            <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded ${multiSelect ? '' : 'rounded-full'} border-2 flex items-center justify-center transition-colors ${selected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    }`}>
                    {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1">
                    <div className="font-medium">{title}</div>
                    {description && (
                        <div className="text-sm text-muted-foreground mt-1">{description}</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DietOnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form state
    const [goal, setGoal] = useState("");
    const [restrictions, setRestrictions] = useState<string[]>([]);
    const [allergies, setAllergies] = useState("");
    const [budget, setBudget] = useState("");
    const [ingredientAccess, setIngredientAccess] = useState("");
    const [mealsPerDay, setMealsPerDay] = useState("");
    const [cooksAtHome, setCooksAtHome] = useState("");
    const [prepTime, setPrepTime] = useState("");
    const [dislikes, setDislikes] = useState("");
    const [calorieGoal, setCalorieGoal] = useState("2000");

    const totalSteps = 10;
    const progress = (step / totalSteps) * 100;

    const handleNext = () => {
        if (step < totalSteps) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await fetchAPI("/diet/onboarding", {
                method: "POST",
                body: JSON.stringify({
                    goal,
                    restrictions,
                    allergies,
                    budget,
                    ingredient_access: ingredientAccess,
                    meals_per_day: parseInt(mealsPerDay),
                    cooks_at_home: cooksAtHome,
                    prep_time: prepTime,
                    dislikes,
                    calorie_goal: parseInt(calorieGoal)
                })
            });

            await fetchAPI("/diet/generate", { method: "POST" });
            router.push("/diet/plan");
        } catch (e: any) {
            alert(`Erro: ${e.message || 'Tente novamente.'}`);
            setLoading(false);
        }
    };

    const toggleRestriction = (value: string) => {
        setRestrictions(prev =>
            prev.includes(value) ? prev.filter(r => r !== value) : [...prev, value]
        );
    };

    return (
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-8">
            <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold">Configure sua Dieta Personalizada</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                    Responda 10 perguntas rápidas para criar um plano alimentar ideal
                </p>
            </div>

            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">Passo {step} de {totalSteps}</p>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">
                        {step === 1 && "1. Qual é seu principal objetivo?"}
                        {step === 2 && "2. Você tem alguma restrição alimentar?"}
                        {step === 3 && "3. Possui alergias alimentares?"}
                        {step === 4 && "4. Qual seu orçamento mensal?"}
                        {step === 5 && "5. Que tipo de ingredientes você tem acesso?"}
                        {step === 6 && "6. Quantas refeições por dia?"}
                        {step === 7 && "7. Você cozinha em casa?"}
                        {step === 8 && "8. Tempo disponível para preparo?"}
                        {step === 9 && "9. Alimentos que você não gosta?"}
                        {step === 10 && "10. Meta diária de calorias"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                    {/* Step 1: Objetivo */}
                    {step === 1 && (
                        <div className="space-y-3">
                            <OptionCard
                                value="emagrecimento"
                                selected={goal === "emagrecimento"}
                                onClick={() => setGoal("emagrecimento")}
                                title="Emagrecimento"
                            />
                            <OptionCard
                                value="ganho_massa"
                                selected={goal === "ganho_massa"}
                                onClick={() => setGoal("ganho_massa")}
                                title="Ganho de massa muscular"
                            />
                            <OptionCard
                                value="manutencao"
                                selected={goal === "manutencao"}
                                onClick={() => setGoal("manutencao")}
                                title="Manutenção de peso"
                            />
                            <OptionCard
                                value="saude"
                                selected={goal === "saude"}
                                onClick={() => setGoal("saude")}
                                title="Saúde e bem-estar geral"
                            />
                        </div>
                    )}

                    {/* Step 2: Restrições */}
                    {step === 2 && (
                        <div className="space-y-3">
                            <OptionCard
                                value="vegetariano"
                                selected={restrictions.includes("vegetariano")}
                                onClick={() => toggleRestriction("vegetariano")}
                                title="Vegetariano"
                                multiSelect
                            />
                            <OptionCard
                                value="vegano"
                                selected={restrictions.includes("vegano")}
                                onClick={() => toggleRestriction("vegano")}
                                title="Vegano"
                                multiSelect
                            />
                            <OptionCard
                                value="sem_lactose"
                                selected={restrictions.includes("sem_lactose")}
                                onClick={() => toggleRestriction("sem_lactose")}
                                title="Sem lactose"
                                multiSelect
                            />
                            <OptionCard
                                value="sem_gluten"
                                selected={restrictions.includes("sem_gluten")}
                                onClick={() => toggleRestriction("sem_gluten")}
                                title="Sem glúten"
                                multiSelect
                            />
                            <p className="text-xs sm:text-sm text-muted-foreground">Selecione todas que se aplicam</p>
                        </div>
                    )}

                    {/* Step 3: Alergias */}
                    {step === 3 && (
                        <div className="space-y-3">
                            <Textarea
                                placeholder="Ex: amendoim, frutos do mar, lactose..."
                                value={allergies}
                                onChange={(e) => setAllergies(e.target.value)}
                                className="min-h-[120px]"
                            />
                            <p className="text-xs sm:text-sm text-muted-foreground">Deixe em branco se não tiver alergias</p>
                        </div>
                    )}

                    {/* Step 4: Orçamento */}
                    {step === 4 && (
                        <div className="space-y-3">
                            <OptionCard
                                value="ate_300"
                                selected={budget === "ate_300"}
                                onClick={() => setBudget("ate_300")}
                                title="Até R$ 300/mês"
                            />
                            <OptionCard
                                value="300_500"
                                selected={budget === "300_500"}
                                onClick={() => setBudget("300_500")}
                                title="R$ 300 - R$ 500/mês"
                            />
                            <OptionCard
                                value="500_800"
                                selected={budget === "500_800"}
                                onClick={() => setBudget("500_800")}
                                title="R$ 500 - R$ 800/mês"
                            />
                            <OptionCard
                                value="acima_800"
                                selected={budget === "acima_800"}
                                onClick={() => setBudget("acima_800")}
                                title="Acima de R$ 800/mês"
                            />
                        </div>
                    )}

                    {/* Step 5: Acesso a Ingredientes */}
                    {step === 5 && (
                        <div className="space-y-3">
                            <OptionCard
                                value="basicos"
                                selected={ingredientAccess === "basicos"}
                                onClick={() => setIngredientAccess("basicos")}
                                title="✓ Básicos e econômicos"
                                description="Arroz, feijão, frango, ovos, frutas/verduras comuns"
                            />
                            <OptionCard
                                value="intermediarios"
                                selected={ingredientAccess === "intermediarios"}
                                onClick={() => setIngredientAccess("intermediarios")}
                                title="Intermediários"
                                description="Carnes variadas, grãos especiais"
                            />
                            <OptionCard
                                value="sofisticados"
                                selected={ingredientAccess === "sofisticados"}
                                onClick={() => setIngredientAccess("sofisticados")}
                                title="Sofisticados"
                                description="Importados, orgânicos, especiarias raras"
                            />
                        </div>
                    )}

                    {/* Step 6: Refeições por dia */}
                    {step === 6 && (
                        <div className="space-y-3">
                            <OptionCard
                                value="3"
                                selected={mealsPerDay === "3"}
                                onClick={() => setMealsPerDay("3")}
                                title="3 refeições"
                            />
                            <OptionCard
                                value="4"
                                selected={mealsPerDay === "4"}
                                onClick={() => setMealsPerDay("4")}
                                title="4 refeições"
                            />
                            <OptionCard
                                value="5"
                                selected={mealsPerDay === "5"}
                                onClick={() => setMealsPerDay("5")}
                                title="5-6 refeições (fracionadas)"
                            />
                        </div>
                    )}

                    {/* Step 7: Cozinha em casa */}
                    {step === 7 && (
                        <div className="space-y-3">
                            <OptionCard
                                value="sim_todas"
                                selected={cooksAtHome === "sim_todas"}
                                onClick={() => setCooksAtHome("sim_todas")}
                                title="Sim, todas as refeições"
                            />
                            <OptionCard
                                value="as_vezes"
                                selected={cooksAtHome === "as_vezes"}
                                onClick={() => setCooksAtHome("as_vezes")}
                                title="Às vezes"
                            />
                            <OptionCard
                                value="raramente"
                                selected={cooksAtHome === "raramente"}
                                onClick={() => setCooksAtHome("raramente")}
                                title="Raramente"
                            />
                            <OptionCard
                                value="nao"
                                selected={cooksAtHome === "nao"}
                                onClick={() => setCooksAtHome("nao")}
                                title="Não cozinho"
                            />
                        </div>
                    )}

                    {/* Step 8: Tempo de preparo */}
                    {step === 8 && (
                        <div className="space-y-3">
                            <OptionCard
                                value="menos_15"
                                selected={prepTime === "menos_15"}
                                onClick={() => setPrepTime("menos_15")}
                                title="Menos de 15 minutos"
                            />
                            <OptionCard
                                value="15_30"
                                selected={prepTime === "15_30"}
                                onClick={() => setPrepTime("15_30")}
                                title="15-30 minutos"
                            />
                            <OptionCard
                                value="30_60"
                                selected={prepTime === "30_60"}
                                onClick={() => setPrepTime("30_60")}
                                title="30-60 minutos"
                            />
                            <OptionCard
                                value="mais_60"
                                selected={prepTime === "mais_60"}
                                onClick={() => setPrepTime("mais_60")}
                                title="Mais de 1 hora"
                            />
                        </div>
                    )}

                    {/* Step 9: Alimentos que não gosta */}
                    {step === 9 && (
                        <div className="space-y-3">
                            <Textarea
                                placeholder="Ex: brócolis, peixe, tomate..."
                                value={dislikes}
                                onChange={(e) => setDislikes(e.target.value)}
                                className="min-h-[120px]"
                            />
                            <p className="text-xs sm:text-sm text-muted-foreground">Opcional - ajuda a criar um plano mais personalizado</p>
                        </div>
                    )}

                    {/* Step 10: Meta de calorias */}
                    {step === 10 && (
                        <div className="space-y-4">
                            <Input
                                type="number"
                                value={calorieGoal}
                                onChange={(e) => setCalorieGoal(e.target.value)}
                                placeholder="2000"
                                className="text-lg"
                            />
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Meta diária de calorias (padrão: 2000 kcal)
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex gap-3">
                <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={step === 1}
                    className="flex-1 touch-manipulation"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
                {step < totalSteps ? (
                    <Button onClick={handleNext} className="flex-1 touch-manipulation">
                        Próximo
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button onClick={handleSubmit} disabled={loading} className="flex-1 touch-manipulation">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            "Gerar Plano Alimentar"
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
