"use client";

import { ComposedChart, Bar, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { chartColors, chartConfig } from "@/lib/chart-config";

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
                        <ComposedChart data={formattedData} margin={chartConfig.defaultMargin}>
                            <CartesianGrid
                                strokeDasharray={chartConfig.gridStrokeDasharray}
                                stroke={chartColors.grid}
                                vertical={false}
                            />
                            <XAxis
                                dataKey="shortDate"
                                stroke={chartColors.axis}
                                fontSize={chartConfig.axis.fontSize}
                                tickLine={chartConfig.axis.tickLine}
                                axisLine={chartConfig.axis.axisLine}
                            />
                            <YAxis
                                yAxisId="left"
                                stroke={chartColors.axis}
                                fontSize={chartConfig.axis.fontSize}
                                tickLine={chartConfig.axis.tickLine}
                                axisLine={chartConfig.axis.axisLine}
                                tickFormatter={(value) => `${value}g`}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke={chartColors.calories}
                                fontSize={chartConfig.axis.fontSize}
                                tickLine={chartConfig.axis.tickLine}
                                axisLine={chartConfig.axis.axisLine}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip
                                contentStyle={chartConfig.tooltip}
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                            />
                            <Legend />
                            <Bar
                                yAxisId="left"
                                dataKey="protein"
                                name="Proteínas"
                                stackId="a"
                                fill={chartColors.protein}
                                radius={[0, 0, 4, 4]}
                            />
                            <Bar
                                yAxisId="left"
                                dataKey="carbs"
                                name="Carbs"
                                stackId="a"
                                fill={chartColors.carbs}
                                radius={[0, 0, 0, 0]}
                            />
                            <Bar
                                yAxisId="left"
                                dataKey="fats"
                                name="Gorduras"
                                stackId="a"
                                fill={chartColors.fats}
                                radius={[4, 4, 0, 0]}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="calories"
                                name="Calorias"
                                stroke={chartColors.calories}
                                strokeWidth={chartConfig.lineStrokeWidth}
                                dot={{ r: chartConfig.dotRadius }}
                                activeDot={{ r: chartConfig.activeDotRadius }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
