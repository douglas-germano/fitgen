"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// import { fetchAPI } from "@/lib/api"; // Not used anymore directly
import { useNutritionHistory } from "@/hooks/useNutrition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
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

export default function HistoryPage() {
    const router = useRouter();

    // Filter State
    const [filterType, setFilterType] = useState<"week" | "month" | "custom">("week");
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().setDate(new Date().getDate() - 30)),
        to: new Date(),
    });

    const { data: historyData = [], isLoading: loading } = useNutritionHistory(filterType, date);

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
                    <div className="flex items-center bg-muted/50 p-1 rounded-lg w-full sm:w-auto grid grid-cols-3 sm:flex">
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

            {/* Chart Section */}
            <div className="space-y-4">
                {/* Chart Section */}
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
            </div>

            {/* Detailed Table */}
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
        </div>
    );
}
