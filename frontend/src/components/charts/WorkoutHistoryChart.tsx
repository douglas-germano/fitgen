"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { chartColors, chartConfig } from '@/lib/chart-config';

interface WorkoutHistoryChartProps {
    data: any[];
}

export default function WorkoutHistoryChart({ data }: WorkoutHistoryChartProps) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <CartesianGrid strokeDasharray={chartConfig.gridStrokeDasharray} vertical={false} stroke={chartColors.grid} />
                <XAxis
                    dataKey="date"
                    tickLine={chartConfig.axis.tickLine}
                    axisLine={chartConfig.axis.axisLine}
                    tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }}
                />
                <YAxis
                    tickLine={chartConfig.axis.tickLine}
                    axisLine={chartConfig.axis.axisLine}
                    tickFormatter={(value) => `${value}m`}
                    tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }}
                />
                <Tooltip
                    contentStyle={chartConfig.tooltip}
                    cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
                />
                <Bar
                    dataKey="minutos"
                    fill={chartColors.workout}
                    radius={chartConfig.barRadius}
                    barSize={40}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
