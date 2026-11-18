"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAPI } from "@/lib/api";
import { ArrowLeft, Save, ShoppingCart, Loader2, Edit2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShoppingItem {
    item: string;
    quantidade: string;
    preco_aprox: number;
    checked?: boolean; // Optional: for UI state
}

interface DietPlan {
    id: string;
    shopping_list: ShoppingItem[];
}

export default function ShoppingListPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Edit states
    const [editPrice, setEditPrice] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await fetchAPI("/diet/plan");
            if (data && data.shopping_list) {
                setItems(data.shopping_list);
            }
        } catch (error) {
            console.error("Failed to load shopping list", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveList = async () => {
        setSaving(true);
        try {
            await fetchAPI("/diet/shopping-list", {
                method: "PUT",
                body: JSON.stringify({ shopping_list: items })
            });
            // Optional: Show success toast
        } catch (error) {
            console.error("Failed to save shopping list", error);
            alert("Erro ao salvar mudanças.");
        } finally {
            setSaving(false);
        }
    };

    const startEditing = (index: number, currentPrice: number) => {
        setEditingIndex(index);
        setEditPrice(currentPrice.toString());
    };

    const saveEdit = (index: number) => {
        const newItems = [...items];
        const price = parseFloat(editPrice.replace(',', '.'));

        if (!isNaN(price)) {
            newItems[index].preco_aprox = price;
            setItems(newItems);
            // Auto-save to backend
            handleSaveList();
        }
        setEditingIndex(null);
    };

    const toggleCheck = (index: number) => {
        const newItems = [...items];
        newItems[index].checked = !newItems[index].checked;
        setItems(newItems);
    };

    const totalEstimated = items.reduce((sum, item) => sum + (item.preco_aprox || 0), 0);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in-up">
            <div className="flex flex-col gap-4">
                <Button
                    variant="ghost"
                    className="w-fit pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={() => router.push('/diet/plan')}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o Plano
                </Button>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Lista de Mercado</h2>
                        <p className="text-muted-foreground">Gerencie seus itens e gastos semanais</p>
                    </div>
                    <div className="glass-card border-white/10 px-6 py-3 rounded-lg text-right backdrop-blur-md bg-white/5">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Gasto</p>
                        <p className="text-2xl font-bold text-green-500">R$ {totalEstimated.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <Card className="glass-card animate-fade-in-up delay-100">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                        Itens da Semana
                    </CardTitle>
                    <CardDescription>
                        Clique no preço para editar o valor real pago.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {items.length === 0 ? (
                            <p className="text-center text-muted-foreground py-12 border border-dashed border-white/10 rounded-lg">Nenhum item na lista.</p>
                        ) : (
                            items.map((item, index) => (
                                <div
                                    key={index}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 
                                        ${item.checked
                                            ? 'bg-muted/20 border-white/5 opacity-60'
                                            : 'bg-background/40 hover:bg-white/5 border-white/10 hover:border-primary/20'
                                        }`}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div
                                            className={`h-6 w-6 rounded border flex items-center justify-center cursor-pointer transition-all ${item.checked ? 'bg-primary border-primary text-primary-foreground' : 'border-white/20 hover:border-primary'}`}
                                            onClick={() => toggleCheck(index)}
                                        >
                                            {item.checked && <Check className="h-3.5 w-3.5" />}
                                        </div>
                                        <div className={`${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                                            <p className="font-medium text-sm">{item.item}</p>
                                            <p className="text-xs text-muted-foreground">{item.quantidade}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 min-w-[120px] justify-end">
                                        {editingIndex === index ? (
                                            <div className="flex items-center gap-2 animate-in fade-in">
                                                <span className="text-xs text-muted-foreground">R$</span>
                                                <Input
                                                    type="number"
                                                    value={editPrice}
                                                    onChange={(e) => setEditPrice(e.target.value)}
                                                    className="h-8 w-24 text-right bg-background/50 border-white/10 focus:ring-primary/20"
                                                    autoFocus
                                                    onBlur={() => saveEdit(index)}
                                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(index)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group">
                                                <span className="text-sm font-medium font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                                                    R$ {item.preco_aprox?.toFixed(2)}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                                                    onClick={() => startEditing(index, item.preco_aprox)}
                                                    title="Editar preço"
                                                >
                                                    <Edit2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
