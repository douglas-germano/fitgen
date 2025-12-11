"use client";

import { ComposedChart, Bar, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface HistoryData {
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

interface WeeklyMacrosChartProps {
    data: HistoryData[];
    loading?: boolean;
    title?: string;
}

export function WeeklyMacrosChart({ data, loading, title = "Evolução Semanal" }: WeeklyMacrosChartProps) {
    if (loading) {
        return (
            <div className="flex h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Sem dados para o período.
            </div>
        );
    }

    // Format dates for XAxis (e.g., "11/12")
    const formattedData = data.map(item => {
        const d = new Date(item.date);
        return {
            ...item,
            shortDate: `${d.getDate()}/${d.getMonth() + 1}`
        };
    });

    return (
        <Card className="glass-card shadow-lg shadow-black/20 w-full">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>Consumo de macronutrientes e calorias.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={formattedData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="shortDate"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                yAxisId="left"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}g`}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#f97316"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#f3f4f6" }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="protein" name="Proteínas" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                            <Bar yAxisId="left" dataKey="carbs" name="Carbs" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                            <Bar yAxisId="left" dataKey="fats" name="Gorduras" stackId="a" fill="#eab308" radius={[4, 4, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="calories" name="Calorias" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
