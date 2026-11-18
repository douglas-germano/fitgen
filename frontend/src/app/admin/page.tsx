"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CreditCard, ListChecks, Repeat, Users, Wallet } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { Panel, PageHeader, Segmented, StatTile } from "@/components/admin/kit";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
    users?: { total?: number; new_last_7_days?: number; new_last_30_days?: number; active_subs?: number; premium_subs?: number };
    revenue?: { mrr?: number };
    subscriptions?: { total_active?: number; free?: number; premium?: number; pro?: number };
    workouts?: { total?: number; ai_generated?: number };
}
interface GrowthPoint { date: string; new_users: number; total_users: number }
interface Retention { users_30d_ago: number; active_users: number; retention_rate: number }

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");

export default function AdminOverviewPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [retention, setRetention] = useState<Retention | null>(null);
    const [growth, setGrowth] = useState<GrowthPoint[] | null>(null);
    const [days, setDays] = useState<"7" | "30" | "90">("30");
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([fetchAPI("/admin/stats"), fetchAPI("/admin/analytics/retention").catch(() => null)])
            .then(([s, r]) => {
                setStats(s);
                setRetention(r);
            })
            .catch(() => setError("Não foi possível carregar as estatísticas."));
    }, []);

    useEffect(() => {
        setGrowth(null);
        fetchAPI(`/admin/analytics/growth?days=${days}`)
            .then((g) => setGrowth(g?.data ?? []))
            .catch(() => setGrowth([]));
    }, [days]);

    const plans = [
        { label: "Free", value: stats?.subscriptions?.free ?? 0 },
        { label: "Premium", value: stats?.subscriptions?.premium ?? 0 },
        { label: "Pro", value: stats?.subscriptions?.pro ?? 0 },
    ];
    const planTotal = plans.reduce((a, p) => a + p.value, 0);

    return (
        <>
            <PageHeader title="Visão geral" description="Como o FitGen está indo agora." />

            {error ? (
                <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-4 py-3 text-sm font-medium text-destructive">
                    {error}
                </p>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats ? (
                    <>
                        <StatTile
                            tone="volt"
                            label="Receita mensal (MRR)"
                            icon={Wallet}
                            value={brl(stats.revenue?.mrr ?? 0)}
                            hint={`${stats.subscriptions?.total_active ?? 0} assinaturas ativas`}
                        />
                        <StatTile
                            label="Usuários"
                            icon={Users}
                            value={stats.users?.total ?? 0}
                            hint={`+${stats.users?.new_last_7_days ?? 0} nos últimos 7 dias`}
                        />
                        <StatTile
                            label="Assinantes pagantes"
                            icon={CreditCard}
                            value={stats.users?.premium_subs ?? 0}
                            hint="Premium e Pro"
                        />
                        <StatTile
                            label="Planos de treino"
                            icon={ListChecks}
                            value={stats.workouts?.total ?? 0}
                            hint={`${stats.workouts?.ai_generated ?? 0} gerados por IA`}
                        />
                    </>
                ) : (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[148px] rounded-[var(--radius-lg)]" />)
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Panel
                    className="xl:col-span-2"
                    title="Novos usuários"
                    description="Cadastros por dia no período"
                    action={
                        <Segmented
                            label="Período"
                            value={days}
                            onChange={setDays}
                            options={[
                                { value: "7", label: "7d" },
                                { value: "30", label: "30d" },
                                { value: "90", label: "90d" },
                            ]}
                        />
                    }
                >
                    <div className="h-[260px]">
                        {growth === null ? (
                            <Skeleton className="h-full w-full rounded-2xl bg-background" />
                        ) : growth.length === 0 ? (
                            <div className="grid h-full place-items-center text-sm text-muted-foreground">
                                Nenhum cadastro neste período.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growth} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="voltFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#a1ec03" stopOpacity={0.55} />
                                            <stop offset="100%" stopColor="#a1ec03" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={shortDate}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                                        minTickGap={24}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: "var(--line-strong)", strokeDasharray: "3 4" }}
                                        content={({ active, payload }) =>
                                            active && payload?.length ? (
                                                <div className="rounded-2xl bg-inverse px-3 py-2 text-xs text-inverse-foreground">
                                                    <p className="opacity-70">{shortDate(payload[0].payload.date)}</p>
                                                    <p className="font-bold">{payload[0].payload.new_users} novos usuários</p>
                                                </div>
                                            ) : null
                                        }
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="new_users"
                                        stroke="var(--foreground)"
                                        strokeWidth={2}
                                        fill="url(#voltFill)"
                                        activeDot={{ r: 5, fill: "#a1ec03", stroke: "var(--foreground)", strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Panel>

                <div className="grid gap-4">
                    <Panel title="Planos" description="Assinaturas ativas por plano">
                        <ul className="space-y-4">
                            {plans.map((p) => {
                                const pct = planTotal ? Math.round((p.value / planTotal) * 100) : 0;
                                return (
                                    <li key={p.label}>
                                        <div className="mb-1.5 flex items-baseline justify-between text-sm">
                                            <span className="font-semibold">{p.label}</span>
                                            <span className="text-muted-foreground tabular">
                                                <b className="text-foreground">{p.value}</b> · {pct}%
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-volt-soft">
                                            <div className="h-full rounded-full bg-volt" style={{ width: `${pct}%` }} />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </Panel>

                    <StatTile
                        tone="inverse"
                        icon={Repeat}
                        label="Retenção (30 dias)"
                        value={retention ? `${retention.retention_rate}%` : "—"}
                        hint={
                            retention
                                ? `${retention.active_users} de ${retention.users_30d_ago} usuários antigos ativos na semana`
                                : "Sem dados suficientes"
                        }
                    />
                </div>
            </div>
        </>
    );
}
