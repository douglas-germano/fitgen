"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Camera, Image as ImageIcon, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api";
import { AILoading } from "@/components/ui/ai-loading";

interface MealLoggerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function MealLogger({ open, onOpenChange, onSuccess }: MealLoggerProps) {
    const [aiDescription, setAiDescription] = useState("");
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [isEstimating, setIsEstimating] = useState(false);
    const [estimatedFood, setEstimatedFood] = useState<any>(null);
    const [selectedMealType, setSelectedMealType] = useState("snack");
    const [isLogging, setIsLogging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setSelectedImages(prev => [...prev, ...files]);
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleEstimate = async () => {
        if (!aiDescription.trim() && selectedImages.length === 0) return;

        setIsEstimating(true);
        try {
            let body: any;

            if (selectedImages.length > 0) {
                const formData = new FormData();
                if (aiDescription.trim()) {
                    formData.append("description", aiDescription);
                }
                selectedImages.forEach(file => {
                    formData.append("images", file);
                });

                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://fitgen.suacozinha.site/api'}/nutrition/estimate`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.msg || "Falha na estimativa");
                }
                body = await response.json();

            } else {
                body = await fetchAPI("/nutrition/estimate", {
                    method: "POST",
                    body: JSON.stringify({ description: aiDescription })
                });
            }

            setEstimatedFood(body);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro ao analisar alimento. Tente novamente.");
        } finally {
            setIsEstimating(false);
        }
    };

    const handleLogFood = async () => {
        if (!estimatedFood) return;

        setIsLogging(true);
        try {
            await fetchAPI("/nutrition/log", {
                method: "POST",
                body: JSON.stringify({
                    name: estimatedFood.name,
                    meal_type: selectedMealType,
                    calories: estimatedFood.calories,
                    protein: estimatedFood.protein,
                    carbs: estimatedFood.carbs,
                    fats: estimatedFood.fats,
                    portion_size: estimatedFood.portion_size
                })
            });

            toast.success("Refeição registrada!");
            if (onSuccess) onSuccess();
            onOpenChange(false);

            // Allow animation to finish before resetting
            setTimeout(() => {
                setEstimatedFood(null);
                setAiDescription("");
                setSelectedImages([]);
            }, 300);

        } catch (error) {
            console.error(error);
            toast.error("Erro ao registrar refeição.");
        } finally {
            setIsLogging(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            onOpenChange(val);
            if (!val) {
                // Reset on close?
                // keeping state might be nice, but diet page cleared it.
                // Let's clear after a delay to avoid jumpiness or assume parent handles
            }
        }}>
            {isEstimating && <AILoading mode="diet" />}
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Adicionar com IA</DialogTitle>
                    <DialogDescription>
                        Descreva sua refeição ou envie uma foto para análise automática.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {!estimatedFood ? (
                        <div className="space-y-4">
                            <Textarea
                                placeholder="Descreva sua refeição..."
                                value={aiDescription}
                                onChange={(e) => setAiDescription(e.target.value)}
                                rows={4}
                            />

                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleImageSelect}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isEstimating}
                                    >
                                        <ImageIcon className="mr-2 h-3.5 w-3.5" />
                                        Galeria
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs"
                                        onClick={() => {
                                            if (fileInputRef.current) {
                                                fileInputRef.current.setAttribute("capture", "environment");
                                                fileInputRef.current.click();
                                                fileInputRef.current.removeAttribute("capture");
                                            }
                                        }}
                                        disabled={isEstimating}
                                    >
                                        <Camera className="mr-2 h-3.5 w-3.5" />
                                        foto
                                    </Button>
                                </div>

                                {selectedImages.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto py-2 px-1">
                                        {selectedImages.map((file, i) => (
                                            <div key={i} className="relative w-16 h-16 flex-shrink-0 border rounded-md overflow-hidden group shadow-sm">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => removeImage(i)}
                                                    className="absolute top-0 right-0 h-5 w-5 rounded-none rounded-bl-md"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={handleEstimate}
                                disabled={(!aiDescription.trim() && selectedImages.length === 0) || isEstimating}
                                className="w-full"
                            >
                                {isEstimating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Analisando...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Analisar com IA
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-muted p-4 rounded-lg space-y-2">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold text-lg">{estimatedFood.name}</h3>
                                    <Button variant="ghost" size="sm" onClick={() => setEstimatedFood(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">{estimatedFood.portion_size}</p>
                                <div className="grid grid-cols-4 gap-2 text-center text-sm mt-2">
                                    <div className="bg-background p-2 rounded">
                                        <div className="font-bold">{estimatedFood.calories}</div>
                                        <div className="text-xs text-muted-foreground">kcal</div>
                                    </div>
                                    <div className="bg-background p-2 rounded">
                                        <div className="font-bold">{estimatedFood.protein}g</div>
                                        <div className="text-xs text-muted-foreground">Prot</div>
                                    </div>
                                    <div className="bg-background p-2 rounded">
                                        <div className="font-bold">{estimatedFood.carbs}g</div>
                                        <div className="text-xs text-muted-foreground">Carb</div>
                                    </div>
                                    <div className="bg-background p-2 rounded">
                                        <div className="font-bold">{estimatedFood.fats}g</div>
                                        <div className="text-xs text-muted-foreground">Gord</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo de Refeição</label>
                                <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="breakfast">Café da Manhã</SelectItem>
                                        <SelectItem value="lunch">Almoço</SelectItem>
                                        <SelectItem value="dinner">Jantar</SelectItem>
                                        <SelectItem value="snack">Lanche</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button onClick={handleLogFood} className="w-full" disabled={isLogging}>
                                {isLogging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                Confirmar e Registrar
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
