"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { fetchAPI } from "@/lib/api";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface DietOnboardingModalProps {
    open: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export function DietOnboardingModal({ open, onClose, onComplete }: DietOnboardingModalProps) {
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
            // Save preferences
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

            // Generate diet plan
            await fetchAPI("/diet/generate", {
                method: "POST"
            });

            onComplete();
            onClose();
        } catch (e) {
            console.error("Failed to save diet preferences", e);
            alert("Erro ao salvar preferências. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const toggleRestriction = (value: string) => {
        setRestrictions(prev =>
            prev.includes(value)
                ? prev.filter(r => r !== value)
                : [...prev, value]
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configure sua Dieta Personalizada</DialogTitle>
                    <Progress value={progress} className="mt-2" />
                    <p className="text-sm text-muted-foreground">Passo {step} de {totalSteps}</p>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Step 1: Objetivo */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">1. Qual é seu principal objetivo?</Label>
                            <RadioGroup value={goal} onValueChange={setGoal}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="emagrecimento" id="emagrecimento" />
                                    <Label htmlFor="emagrecimento" className="cursor-pointer">Emagrecimento</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="ganho_massa" id="ganho_massa" />
                                    <Label htmlFor="ganho_massa" className="cursor-pointer">Ganho de massa muscular</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="manutencao" id="manutencao" />
                                    <Label htmlFor="manutencao" className="cursor-pointer">Manutenção de peso</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="saude" id="saude" />
                                    <Label htmlFor="saude" className="cursor-pointer">Saúde e bem-estar geral</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {/* Step 2: Restrições */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">2. Você tem alguma restrição alimentar?</Label>
                            <div className="space-y-2">
                                {["vegetariano", "vegano", "sem_lactose", "sem_gluten"].map((r) => (
                                    <div key={r} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={r}
                                            checked={restrictions.includes(r)}
                                            onCheckedChange={() => toggleRestriction(r)}
                                        />
                                        <Label htmlFor={r} className="cursor-pointer capitalize">
                                            {r.replace("_", " ")}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Alergias */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">3. Possui alergias alimentares?</Label>
                            <Textarea
                                placeholder="Ex: amendoim, frutos do mar..."
                                value={allergies}
                                onChange={(e) => setAllergies(e.target.value)}
                                className="min-h-[100px]"
                            />
                            <p className="text-sm text-muted-foreground">Deixe em branco se não tiver</p>
                        </div>
                    )}

                    {/* Step 4: Orçamento */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">4. Quanto você pode investir mensalmente em alimentação?</Label>
                            <RadioGroup value={budget} onValueChange={setBudget}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="ate_300" id="ate_300" />
                                    <Label htmlFor="ate_300" className="cursor-pointer">Até R$ 300</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="300_500" id="300_500" />
                                    <Label htmlFor="300_500" className="cursor-pointer">R$ 300 - R$ 500</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="500_800" id="500_800" />
                                    <Label htmlFor="500_800" className="cursor-pointer">R$ 500 - R$ 800</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="acima_800" id="acima_800" />
                                    <Label htmlFor="acima_800" className="cursor-pointer">Acima de R$ 800</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {/* Step 5: Acesso a Ingredientes */}
                    {step === 5 && (
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">5. Que tipo de ingredientes você tem acesso?</Label>
                            <RadioGroup value={ingredientAccess} onValueChange={setIngredientAccess}>
                                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent">
                                    <RadioGroupItem value="basicos" id="basicos" />
                                    <Label htmlFor="basicos" className="cursor-pointer flex-1">
                                        <div className="font-semibold">Básicos e econômicos</div>
                                        <div className="text-sm text-muted-foreground">Arroz, feijão, frango, ovos, frutas/verduras comuns</div>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent">
                                    <RadioGroupItem value="intermediarios" id="intermediarios" />
                                    <Label htmlFor="intermediarios" className="cursor-pointer flex-1">
                                        <div className="font-semibold">Intermediários</div>
                                        <div className="text-sm text-muted-foreground">Carnes variadas, grãos especiais</div>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent">
                                    <RadioGroupItem value="sofisticados" id="sofisticados" />
                                    <Label htmlFor="sofisticados" className="cursor-pointer flex-1">
                                        <div className="font-semibold">Sofisticados</div>
                                        <div className="text-sm text-muted-foreground">Importados, orgânicos, especiarias raras</div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {/* Step 6: Refeições por dia */}
                    {step === 6 && (
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">6. Quantas refeições você faz por dia?</Label>
                            <RadioGroup value={mealsPerDay} onValueChange={setMealsPerDay}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="3" id="3meals" />
                                    <Label htmlFor="3meals" className="cursor-pointer">3 refeições</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="4" id="4meals" />
                                    <Label htmlFor="4meals" className="cursor-pointer">4 refeições</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="5" id="5meals" />
                                    <Label htmlFor="5meals" className="cursor-pointer">5-6 refeições (fracionadas)</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {/* Step 7: Cozinha em casa */}
                    {step === 7 && (
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">7. Você cozinha em casa?</Label>
                            <RadioGroup value={cooksAtHome} onValueChange={setCooksAtHome}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="sim_todas" id="sim_todas" />
                                    <Label htmlFor="sim_todas" className="cursor-pointer">Sim, preparo todas as refeições</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="as_vezes" id="as_vezes" />
                                    <Label htmlFor="as_vezes" className="cursor-pointer">Às vezes, preparo algumas refeições</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="raramente" id="raramente" />
                                    <Label htmlFor="raramente" className="cursor-pointer">Raramente, prefiro refeições prontas</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="nao" id="nao" />
                                    <Label htmlFor="nao" className="cursor-pointer">Não cozinho</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {/* Step 8: Tempo de preparo */}
                    {step === 8 && (
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">8. Quanto tempo você tem para preparar refeições?</Label>
                            <RadioGroup value={prepTime} onValueChange={setPrepTime}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="menos_15" id="menos_15" />
                                    <Label htmlFor="menos_15" className="cursor-pointer">Menos de 15 minutos</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="15_30" id="15_30" />
                                    <Label htmlFor="15_30" className="cursor-pointer">15-30 minutos</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="30_60" id="30_60" />
                                    <Label htmlFor="30_60" className="cursor-pointer">30-60 minutos</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="mais_60" id="mais_60" />
                                    <Label htmlFor="mais_60" className="cursor-pointer">Mais de 1 hora</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {/* Step 9: Alimentos que não gosta */}
                    {step === 9 && (
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">9. Existe algum alimento que você não gosta?</Label>
                            <Textarea
                                placeholder="Ex: brócolis, fígado, beterraba..."
                                value={dislikes}
                                onChange={(e) => setDislikes(e.target.value)}
                                className="min-h-[100px]"
                            />
                            <p className="text-sm text-muted-foreground">Deixe em branco se não houver</p>
                        </div>
                    )}

                    {/* Step 10: Meta de calorias */}
                    {step === 10 && (
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">10. Meta diária de calorias</Label>
                            <div className="space-y-2">
                                <Input
                                    type="number"
                                    placeholder="2000"
                                    value={calorieGoal}
                                    onChange={(e) => setCalorieGoal(e.target.value)}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Recomendado: 1500-1800 para emagrecimento, 2000-2500 para manutenção, 2500+ para ganho de massa
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={step === 1 || loading}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>

                    {step < totalSteps ? (
                        <Button onClick={handleNext} disabled={loading}>
                            Próximo
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Gerando Plano...
                                </>
                            ) : (
                                "Criar Minha Dieta"
                            )}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
