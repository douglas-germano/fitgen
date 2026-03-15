"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartColors, chartConfig } from '@/lib/chart-config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, Activity, TrendingUp } from "lucide-react";

interface MetricsEvolutionChartsProps {
    weightHistory: any[];
    fatHistory: any[];
    muscleHistory: any[];
    leanMassHistory: any[];
}

function ChartEmpty({ icon: Icon, text }: { icon: any; text: string }) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <Icon className="h-12 w-12 mb-2" />
            <p>{text}</p>
        </div>
    );
}

function MetricAreaChart({ data, strokeColor, fillId }: { data: any[]; strokeColor: string; fillId: string }) {
    return (
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
                    domain={['auto', 'auto']}
                    tickLine={chartConfig.axis.tickLine}
                    axisLine={chartConfig.axis.axisLine}
                    tick={{ fontSize: chartConfig.axis.fontSize, fill: chartColors.axis }}
                    width={30}
                />
                <Tooltip
                    contentStyle={chartConfig.tooltip}
                    labelStyle={{ color: chartColors.axis, marginBottom: '4px' }}
                />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={strokeColor}
                    strokeWidth={chartConfig.areaStrokeWidth}
                    fillOpacity={1}
                    fill={`url(#${fillId})`}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

export default function MetricsEvolutionCharts({ weightHistory, fatHistory, muscleHistory, leanMassHistory }: MetricsEvolutionChartsProps) {
    return (
        <Tabs defaultValue="weight" className="w-full">
            <TabsList className="mb-4 bg-background/50 border border-white/5 p-1 rounded-lg">
                <TabsTrigger value="weight" className="rounded-md data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500">Peso</TabsTrigger>
                <TabsTrigger value="fat" className="rounded-md data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-500">% Gordura</TabsTrigger>
                <TabsTrigger value="muscle" className="rounded-md data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500">Massa Muscular</TabsTrigger>
                <TabsTrigger value="leanmass" className="rounded-md data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-500">Massa Magra</TabsTrigger>
            </TabsList>

            {/* Chart Gradients */}
            <svg style={{ height: 0, width: 0, position: 'absolute' }}>
                <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMuscle" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLeanMass" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                </defs>
            </svg>

            <TabsContent value="weight">
                <div className="h-[300px] w-full mt-4">
                    {weightHistory.length > 0 ? (
                        <MetricAreaChart data={weightHistory} strokeColor={chartColors.weight} fillId="colorWeight" />
                    ) : (
                        <ChartEmpty icon={Scale} text="Sem dados de peso ainda." />
                    )}
                </div>
            </TabsContent>

            <TabsContent value="fat">
                <div className="h-[300px] w-full mt-4">
                    {fatHistory.length > 0 ? (
                        <MetricAreaChart data={fatHistory} strokeColor={chartColors.bodyFat} fillId="colorFat" />
                    ) : (
                        <ChartEmpty icon={Activity} text="Sem dados de gordura ainda." />
                    )}
                </div>
            </TabsContent>

            <TabsContent value="muscle">
                <div className="h-[300px] w-full mt-4">
                    {muscleHistory.length > 0 ? (
                        <MetricAreaChart data={muscleHistory} strokeColor={chartColors.muscle} fillId="colorMuscle" />
                    ) : (
                        <ChartEmpty icon={TrendingUp} text="Sem dados de massa muscular." />
                    )}
                </div>
            </TabsContent>

            <TabsContent value="leanmass">
                <div className="h-[300px] w-full mt-4">
                    {leanMassHistory.length > 0 ? (
                        <MetricAreaChart data={leanMassHistory} strokeColor="#06b6d4" fillId="colorLeanMass" />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <TrendingUp className="h-12 w-12 mb-2" />
                            <p>Massa magra calculada pela Fórmula de Boer.</p>
                            <p className="text-xs mt-1">Registre seu peso para ver a evolução.</p>
                        </div>
                    )}
                </div>
            </TabsContent>
        </Tabs>
    );
}
