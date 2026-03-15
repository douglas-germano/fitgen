"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// import { fetchAPI } from "@/lib/api"; // Not used anymore directly
import { useNutritionHistory } from "@/hooks/useNutrition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { WeeklyMacrosChart } from "@/components/diet/WeeklyMacrosChart";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
// import { DateRange } from "react-day-picker"; // Removed to avoid build error

type DateRange = {
    from: Date | undefined;
    to?: Date | undefined;
};
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchAPI } from "@/lib/api";
import { toast } from "sonner";

export default function HistoryPage() {
    const router = useRouter();

    // Filter State - Changed default to "day"
    const [filterType, setFilterType] = useState<"day" | "week" | "month" | "custom">("day");
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().setDate(new Date().getDate() - 30)),
        to: new Date(),
    });

    const { data: historyData = [], isLoading: loading, refetch } = useNutritionHistory(filterType, date);

    // Edit and Delete states
    const [editData, setEditData] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleEdit = (meal: any) => {
        setEditData({ ...meal });
        setIsEditOpen(true);
    };

    const saveEdit = async () => {
        if (!editData) return;
        setIsSaving(true);
        try {
            await fetchAPI(`/nutrition/log/${editData.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    name: editData.name,
                    meal_type: editData.meal_type,
                    calories: parseFloat(editData.calories),
                    protein: parseFloat(editData.protein || editData.macro_protein),
                    carbs: parseFloat(editData.carbs || editData.macro_carbs),
                    fats: parseFloat(editData.fats || editData.macro_fats),
                })
            });
            toast.success("Refeição atualizada!");
            setIsEditOpen(false);
            refetch();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar.");
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        try {
            await fetchAPI(`/nutrition/log/${deleteId}`, { method: "DELETE" });
            toast.success("Refeição excluída com sucesso!");
            refetch();
        } catch (error) {
            toast.error("Erro ao excluir refeição.");
        } finally {
            setDeleteId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Histórico</h1>
                        <p className="text-sm md:text-base text-muted-foreground">
                            Visualize sua evolução nutricional.
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="flex items-center bg-muted/50 p-1 rounded-lg w-full sm:w-auto grid grid-cols-4 sm:flex">
                        <Button
                            variant={filterType === "day" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setFilterType("day")}
                            className="text-xs w-full sm:w-auto"
                        >
                            Hoje
                        </Button>
                        <Button
                            variant={filterType === "week" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setFilterType("week")}
                            className="text-xs w-full sm:w-auto"
                        >
                            7 Dias
                        </Button>
                        <Button
                            variant={filterType === "month" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setFilterType("month")}
                            className="text-xs w-full sm:w-auto"
                        >
                            30 Dias
                        </Button>
                        <Button
                            variant={filterType === "custom" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setFilterType("custom")}
                            className="text-xs w-full sm:w-auto"
                        >
                            Outro
                        </Button>
                    </div>

                    {filterType === "custom" && (
                        <div className="grid gap-2 w-full sm:w-auto">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant={"outline"}
                                        className={cn(
                                            "w-full sm:w-[260px] justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.from ? (
                                            date.to ? (
                                                <>
                                                    {format(date.from, "dd/MM", { locale: ptBR })} -{" "}
                                                    {format(date.to, "dd/MM", { locale: ptBR })}
                                                </>
                                            ) : (
                                                format(date.from, "dd/MM/yyyy", { locale: ptBR })
                                            )
                                        ) : (
                                            <span>Selecione uma data</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={date?.from}
                                        selected={date}
                                        onSelect={setDate}
                                        numberOfMonths={2}
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </div>
            </div>

            {/* Chart Section - Hide for day filter since it expects array data */}
            {filterType !== "day" && (
                <div className="space-y-4">
                    <WeeklyMacrosChart
                        data={historyData}
                        title={
                            filterType === 'week' ? "Últimos 7 Dias" :
                                filterType === 'month' ? "Últimos 30 Dias" :
                                    "Período Selecionado"
                        }
                        loading={loading}
                    />
                </div>
            )}

            {/* Detailed Table or Meals List */}
            {filterType === "day" ? (
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5" />
                            Refeições de Hoje
                        </CardTitle>
                        <CardDescription>
                            {(historyData as any)?.meals?.length || 0} refeições registradas
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {(historyData as any)?.meals && (historyData as any).meals.length > 0 ? (
                                (historyData as any).meals.map((meal: any) => (
                                    <div key={meal.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{meal.name}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{meal.meal_type || 'snack'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right mr-3">
                                                <p className="font-medium text-sm">{meal.calories} kcal</p>
                                                <p className="text-xs text-muted-foreground">
                                                    P:{meal.protein || meal.macro_protein || 0}g ·
                                                    C:{meal.carbs || meal.macro_carbs || 0}g ·
                                                    G:{meal.fats || meal.macro_fats || 0}g
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500" onClick={() => handleEdit(meal)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => setDeleteId(meal.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CalendarIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                    <p>Nenhuma refeição registrada hoje.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5" />
                            Detalhamento Diário
                        </CardTitle>
                        <CardDescription>
                            Registros consolidados por dia.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-white/5">
                                    <TableHead>Data</TableHead>
                                    <TableHead>Refeições</TableHead>
                                    <TableHead>Calorias</TableHead>
                                    <TableHead>Proteínas</TableHead>
                                    <TableHead>Carboidratos</TableHead>
                                    <TableHead>Gorduras</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historyData && historyData.length > 0 ? (
                                    [...historyData].reverse().map((day) => (
                                        <TableRow key={day.date} className="hover:bg-white/5">
                                            <TableCell className="font-medium">
                                                {new Date(day.date).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                            <TableCell>{day.meal_count}</TableCell>
                                            <TableCell>{day.calories} kcal</TableCell>
                                            <TableCell className="text-blue-400 font-medium">{day.protein}g</TableCell>
                                            <TableCell className="text-green-400 font-medium">{day.carbs}g</TableCell>
                                            <TableCell className="text-yellow-400 font-medium">{day.fats}g</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            Nenhum registro encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="glass-card">
                    <DialogHeader>
                        <DialogTitle>Editar Refeição</DialogTitle>
                        <DialogDescription>Ajuste os valores nutricionais manualmente.</DialogDescription>
                    </DialogHeader>
                    {editData && (
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome / Alimento</Label>
                                <Input
                                    value={editData.name}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    className="bg-white/5"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select value={editData.meal_type} onValueChange={(v) => setEditData({ ...editData, meal_type: v })}>
                                        <SelectTrigger className="bg-white/5">
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
                                <div className="space-y-2">
                                    <Label>Calorias</Label>
                                    <Input
                                        type="number"
                                        value={editData.calories}
                                        onChange={(e) => setEditData({ ...editData, calories: e.target.value })}
                                        className="bg-white/5"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">Prot (g)</Label>
                                    <Input
                                        type="number"
                                        value={editData.protein || editData.macro_protein || 0}
                                        onChange={(e) => setEditData({ ...editData, protein: e.target.value, macro_protein: e.target.value })}
                                        className="bg-white/5"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Carb (g)</Label>
                                    <Input
                                        type="number"
                                        value={editData.carbs || editData.macro_carbs || 0}
                                        onChange={(e) => setEditData({ ...editData, carbs: e.target.value, macro_carbs: e.target.value })}
                                        className="bg-white/5"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Gord (g)</Label>
                                    <Input
                                        type="number"
                                        value={editData.fats || editData.macro_fats || 0}
                                        onChange={(e) => setEditData({ ...editData, fats: e.target.value, macro_fats: e.target.value })}
                                        className="bg-white/5"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                        <Button onClick={saveEdit} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Refeição?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover esta refeição do seu diário?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
