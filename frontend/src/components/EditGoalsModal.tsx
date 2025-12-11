"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchAPI } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface EditGoalsModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentGoals: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
}

export function EditGoalsModal({ open, onClose, onSuccess, currentGoals }: EditGoalsModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        calorie_goal: "",
        protein: "",
        carbs: "",
        fats: ""
    });

    useEffect(() => {
        if (open) {
            setFormData({
                calorie_goal: String(currentGoals.calories || 0),
                protein: String(currentGoals.protein || 0),
                carbs: String(currentGoals.carbs || 0),
                fats: String(currentGoals.fats || 0)
            });
        }
    }, [open, currentGoals]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await fetchAPI("/diet/goals", {
                method: "PUT",
                body: JSON.stringify({
                    calorie_goal: parseInt(formData.calorie_goal) || 0,
                    macro_goals: {
                        protein: parseInt(formData.protein) || 0,
                        carbs: parseInt(formData.carbs) || 0,
                        fats: parseInt(formData.fats) || 0
                    }
                })
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to update goals", error);
            alert("Erro ao atualizar metas. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Metas Nutricionais</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label>Meta de Calorias (kcal)</Label>
                            <Input
                                type="number"
                                value={formData.calorie_goal}
                                onChange={(e) => handleChange("calorie_goal", e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Proteína (g)</Label>
                                <Input
                                    type="number"
                                    value={formData.protein}
                                    onChange={(e) => handleChange("protein", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Carboidratos (g)</Label>
                                <Input
                                    type="number"
                                    value={formData.carbs}
                                    onChange={(e) => handleChange("carbs", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Gorduras (g)</Label>
                                <Input
                                    type="number"
                                    value={formData.fats}
                                    onChange={(e) => handleChange("fats", e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Salvar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
