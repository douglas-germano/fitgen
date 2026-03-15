"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { chartColors, chartConfig } from '@/lib/chart-config';

interface HydrationHistoryChartProps {
    data: any[];
    goalMl?: number;
}

export default function HydrationHistoryChart({ data, goalMl }: HydrationHistoryChartProps) {
    return (
        <>
            <svg style={{ height: 0, width: 0, position: 'absolute' }}>
                <defs>
                    <linearGradient id="colorHydration" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                </defs>
            </svg>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <CartesianGrid strokeDasharray={chartConfig.gridStrokeDasharray} vertical={false} stroke={chartColors.grid} />
                    <XAxis
                        dataKey="formattedDate"
                        tickLine={chartConfig.axis.tickLine}
                        axisLine={chartConfig.axis.axisLine}
                        tickMargin={10}
                        tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }}
                    />
                    <YAxis
                        domain={[0, 'auto']}
                        tickLine={chartConfig.axis.tickLine}
                        axisLine={chartConfig.axis.axisLine}
                        tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }}
                        width={40}
                    />
                    <Tooltip
                        contentStyle={chartConfig.tooltip}
                        labelStyle={{ color: chartColors.axis, marginBottom: '4px' }}
                        itemStyle={{ color: chartColors.hydration }}
                        formatter={(value: any) => [`${value} ml`, 'Consumo']}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={chartColors.hydration}
                        strokeWidth={chartConfig.areaStrokeWidth}
                        fillOpacity={1}
                        fill="url(#colorHydration)"
                    />
                    {goalMl && (
                        <ReferenceLine y={goalMl} stroke={chartColors.grid} strokeDasharray="3 3" strokeWidth={1.5} />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </>
    );
}
