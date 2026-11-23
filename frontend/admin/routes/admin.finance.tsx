import { ReferralPrograms } from "@admin/ReferralPrograms";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, Download, Info, Receipt, TrendingDown, UserCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { fetchAPI, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, EmptyState, PageHeader, Pager, Panel, Pill, Segmented, StatTile, TableSkeleton } from "@admin/kit";
import { cn } from "@/lib/utils";

interface UserRef { id: string | null; name: string; email: string }
interface Summary {
    kpis: {
        mrr: number; arr: number; paying_subscribers: number; arpu: number;
        revenue_this_month: number; revenue_last_month: number; revenue_delta_pct: number | null; refunded_this_month: number;
        new_subscribers_30d: number; cancelled_30d: number; churn_rate_30d: number; past_due_count: number; past_due_amount: number;
    };
    revenue_by_month: { month: string; revenue: number; refunds: number; payments: number }[];
    by_plan: { plan: string; subscribers: number; mrr: number }[];
    by_status: Record<string, number>;
    by_method: { method: string; payments: number; revenue: number }[];
    upcoming_renewals: { count: number; amount: number; items: { user: UserRef; amount: number; date: string; plan: string }[] };
    at_risk: { user: UserRef; amount: number; since: string; plan: string }[];
}
interface Payment {
    id: string; user: UserRef; plan: string; amount: number; currency: string; status: string;
    method: string | null; date: string | null; external_id: string | null; notes: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://dev-api.fitgen.pro/api";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const monthLabel = (ym: string) =>
    new Date(`${ym}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");

const METHOD_LABEL: Record<string, string> = {
    pix: "Pix", credit_card: "Cartão", boleto: "Boleto", app_store: "App Store", play_store: "Google Play", outro: "Outro",
};
const PLAN_LABEL: Record<string, string> = { premium: "Premium", pro: "Pro", free: "Free" };
const STATUS_META: Record<string, { label: string; bar: string }> = {
    active: { label: "Ativas", bar: "bg-volt" },
    past_due: { label: "Em atraso", bar: "bg-destructive" },
    cancelled: { label: "Canceladas", bar: "bg-line-strong" },
    expired: { label: "Expiradas", bar: "bg-chip" },
};
const PAYMENT_STATUS: Record<string, { label: string; tone: "volt" | "danger" | "neutral" | "outline" }> = {
    completed: { label: "Pago", tone: "volt" },
    refunded: { label: "Reembolsado", tone: "danger" },
    failed: { label: "Falhou", tone: "danger" },
    pending: { label: "Pendente", tone: "neutral" },
};

function ShareRow({ label, value, share, note }: { label: string; value: string; share: number; note?: string }) {
    return (
        <li>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold">{label}</span>
                <span className="text-muted-foreground tabular">
                    <b className="text-foreground">{value}</b>
                    {note ? ` · ${note}` : ""}
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-volt-soft">
                <div className="h-full rounded-full bg-volt" style={{ width: `${Math.max(share, 0)}%` }} />
            </div>
        </li>
    );
}

function PersonRow({ user, right, sub }: { user: UserRef; right: string; sub: string }) {
    return (
        <li className="flex items-center gap-3 rounded-[var(--radius-md)] bg-background p-3">
            <Avatar name={user.name} size={36} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold tabular">{right}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
        </li>
    );
}

export const Route = createFileRoute("/admin/finance")({ component: FinancePage });

function FinancePage() {
    const [months, setMonths] = useState<"6" | "12">("6");
    const [summary, setSummary] = useState<Summary | null>(null);
    const [failed, setFailed] = useState(false);

    const [payments, setPayments] = useState<Payment[]>([]);
    const [methods, setMethods] = useState<string[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(true);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [status, setStatus] = useState<"all" | "completed" | "refunded" | "pending" | "failed">("all");
    const [method, setMethod] = useState("all");

    useEffect(() => {
        setFailed(false);
        fetchAPI(`/admin/finance/summary?months=${months}`)
            .then(setSummary)
            .catch(() => setFailed(true));
    }, [months]);

    useEffect(() => setPage(1), [status, method]);

    const loadPayments = useCallback(async () => {
        setLoadingPayments(true);
        try {
            const p = new URLSearchParams({ page: String(page), per_page: "10", status, method });
            const data = await fetchAPI(`/admin/finance/payments?${p}`);
            setPayments(data.items);
            setPages(data.pages);
            setTotal(data.total);
            setMethods(data.methods);
        } catch {
            toast.error("Erro ao carregar pagamentos");
        } finally {
            setLoadingPayments(false);
        }
    }, [page, status, method]);

    useEffect(() => {
        loadPayments();
    }, [loadPayments]);

    const exportCsv = async () => {
        try {
            const p = new URLSearchParams({ export: "true", status, method });
            const res = await fetch(`${API_URL}/admin/finance/payments?${p}`, { headers: { Authorization: `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error();
            const url = URL.createObjectURL(await res.blob());
            const a = document.createElement("a");
            a.href = url;
            a.download = "pagamentos.csv";
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Falha ao exportar CSV");
        }
    };

    const k = summary?.kpis;
    const statusTotal = summary ? Object.values(summary.by_status).reduce((a, b) => a + b, 0) : 0;
    const planMax = summary ? Math.max(...summary.by_plan.map((p) => p.mrr), 1) : 1;
    const methodTotal = summary ? summary.by_method.reduce((a, m) => a + m.revenue, 0) : 0;
    const noRevenueYet = !!summary && summary.revenue_by_month.every((m) => m.revenue === 0) && summary.kpis.mrr === 0;
    const delta = k?.revenue_delta_pct;

    return (
        <>
            <PageHeader
                title="Financeiro"
                description="Receita, assinaturas e pagamentos do FitGen."
                actions={
                    <Segmented
                        label="Período do gráfico"
                        value={months}
                        onChange={setMonths}
                        options={[
                            { value: "6", label: "6 meses" },
                            { value: "12", label: "12 meses" },
                        ]}
                    />
                }
            />

            {failed ? (
                <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-4 py-3 text-sm font-medium text-destructive">
                    Não foi possível carregar o resumo financeiro.
                </p>
            ) : null}

            {noRevenueYet ? (
                <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-volt-soft px-4 py-3 text-sm text-volt-ink">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    <p>
                        Ainda não há pagamentos registrados. Eles passam a aparecer aqui conforme os webhooks do Kiwify e do Herospark
                        chegarem. Se o gateway não enviar o valor, defina <code className="font-mono">BILLING_DEFAULT_PRICE_BRL</code> no backend.
                    </p>
                </div>
            ) : null}

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {k ? (
                    <>
                        <StatTile tone="volt" icon={Wallet} label="MRR" value={brl(k.mrr)} hint={`Receita recorrente mensal · ARR ${brl(k.arr)}`} />
                        <StatTile
                            icon={Receipt}
                            label="Receita do mês"
                            value={brl(k.revenue_this_month)}
                            hint={
                                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                                    {delta !== null && delta !== undefined ? (
                                        <span className={cn("inline-flex items-center gap-0.5 font-semibold", delta >= 0 ? "text-volt-ink" : "text-destructive")}>
                                            {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                                            {pct(Math.abs(delta))}
                                        </span>
                                    ) : null}
                                    <span>vs. mês anterior ({brl(k.revenue_last_month)})</span>
                                </span>
                            }
                        />
                        <StatTile
                            icon={UserCheck}
                            label="Assinantes pagantes"
                            value={k.paying_subscribers}
                            hint={`Ticket médio ${brl(k.arpu)} · +${k.new_subscribers_30d} em 30 dias`}
                        />
                        <StatTile
                            tone="inverse"
                            icon={TrendingDown}
                            label="Churn (30 dias)"
                            value={pct(k.churn_rate_30d)}
                            hint={`${k.cancelled_30d} cancelamentos · ${brl(k.refunded_this_month)} reembolsados no mês`}
                        />
                    </>
                ) : (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[148px] rounded-[var(--radius-lg)]" />)
                )}
            </div>

            {/* Chart + breakdowns */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Panel className="xl:col-span-2" title="Receita por mês" description="Pagamentos confirmados e reembolsos">
                    <div className="h-[360px]">
                        {!summary ? (
                            <Skeleton className="h-full w-full rounded-2xl bg-background" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={summary.revenue_by_month} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={4}>
                                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                                    <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        width={56}
                                        tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(".0", "")}k` : String(v))}
                                        tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "var(--chip)", opacity: 0.6 }}
                                        content={({ active, payload }) =>
                                            active && payload?.length ? (
                                                <div className="rounded-2xl bg-inverse px-3 py-2 text-xs text-inverse-foreground">
                                                    <p className="font-semibold capitalize opacity-70">{monthLabel(payload[0].payload.month)}</p>
                                                    <p className="font-bold">{brl(payload[0].payload.revenue)}</p>
                                                    <p className="opacity-70">{payload[0].payload.payments} pagamentos</p>
                                                    {payload[0].payload.refunds ? <p className="text-[#ffb4ab]">−{brl(payload[0].payload.refunds)} reembolsos</p> : null}
                                                </div>
                                            ) : null
                                        }
                                    />
                                    <Bar dataKey="revenue" fill="#a1ec03" radius={[10, 10, 0, 0]} maxBarSize={44} />
                                    <Bar dataKey="refunds" fill="var(--destructive)" radius={[10, 10, 0, 0]} maxBarSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Panel>

                <div className="grid gap-4">
                    <Panel title="Assinaturas" description="Situação e MRR por plano">
                        {summary ? (
                            <div className="space-y-5">
                                <div>
                                    <div className="flex h-3 overflow-hidden rounded-full bg-chip">
                                        {Object.entries(STATUS_META).map(([key, meta]) => {
                                            const n = summary.by_status[key] ?? 0;
                                            return n ? <div key={key} className={meta.bar} style={{ width: `${(n / statusTotal) * 100}%` }} title={`${meta.label}: ${n}`} /> : null;
                                        })}
                                    </div>
                                    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                                        {Object.entries(STATUS_META).map(([key, meta]) => (
                                            <li key={key} className="flex items-center gap-2">
                                                <span className={cn("size-2.5 rounded-full", meta.bar)} />
                                                <span className="text-muted-foreground">{meta.label}</span>
                                                <b className="ml-auto tabular">{summary.by_status[key] ?? 0}</b>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <ul className="space-y-4">
                                    {summary.by_plan.length === 0 ? (
                                        <li className="text-sm text-muted-foreground">Sem assinaturas ativas.</li>
                                    ) : (
                                        summary.by_plan.map((p) => (
                                            <ShareRow
                                                key={p.plan}
                                                label={PLAN_LABEL[p.plan] ?? p.plan}
                                                value={brl(p.mrr)}
                                                note={`${p.subscribers} assin.`}
                                                share={(p.mrr / planMax) * 100}
                                            />
                                        ))
                                    )}
                                </ul>
                            </div>
                        ) : (
                            <Skeleton className="h-40 rounded-2xl bg-background" />
                        )}
                    </Panel>

                    <Panel title="Formas de pagamento" description="Receita no período do gráfico">
                        {summary ? (
                            summary.by_method.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sem pagamentos no período.</p>
                            ) : (
                                <ul className="space-y-4">
                                    {summary.by_method.map((m) => (
                                        <ShareRow
                                            key={m.method}
                                            label={METHOD_LABEL[m.method] ?? m.method}
                                            value={brl(m.revenue)}
                                            note={`${Math.round(methodTotal ? (m.revenue / methodTotal) * 100 : 0)}%`}
                                            share={methodTotal ? (m.revenue / methodTotal) * 100 : 0}
                                        />
                                    ))}
                                </ul>
                            )
                        ) : (
                            <Skeleton className="h-28 rounded-2xl bg-background" />
                        )}
                    </Panel>
                </div>
            </div>

            {/* Renewals + at risk */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Panel
                    title="Próximas renovações"
                    description="Cobranças previstas nos próximos 30 dias"
                    action={summary ? <Pill tone="volt">{brl(summary.upcoming_renewals.amount)} · {summary.upcoming_renewals.count}</Pill> : undefined}
                >
                    {!summary ? (
                        <Skeleton className="h-40 rounded-2xl bg-background" />
                    ) : summary.upcoming_renewals.items.length === 0 ? (
                        <EmptyState icon={CalendarClock} title="Nenhuma renovação prevista" description="Quando houver cobranças agendadas, elas aparecem aqui." />
                    ) : (
                        <ul className="space-y-2">
                            {summary.upcoming_renewals.items.map((r, i) => (
                                <PersonRow key={i} user={r.user} right={brl(r.amount)} sub={dayLabel(r.date)} />
                            ))}
                        </ul>
                    )}
                </Panel>

                <Panel
                    title="Pagamentos em atraso"
                    description="Assinaturas que precisam de atenção"
                    action={k && k.past_due_count > 0 ? <Pill tone="danger">{brl(k.past_due_amount)} · {k.past_due_count}</Pill> : undefined}
                >
                    {!summary ? (
                        <Skeleton className="h-40 rounded-2xl bg-background" />
                    ) : summary.at_risk.length === 0 ? (
                        <EmptyState icon={AlertTriangle} title="Tudo em dia" description="Nenhuma assinatura com cobrança atrasada." />
                    ) : (
                        <ul className="space-y-2">
                            {summary.at_risk.map((r, i) => (
                                <PersonRow key={i} user={r.user} right={brl(r.amount)} sub={`desde ${dayLabel(r.since)}`} />
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>

            {/* Payments ledger */}
            <section className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Pagamentos</h2>
                        <p className="text-[13px] text-muted-foreground">Histórico completo de cobranças.</p>
                    </div>
                    <Button variant="outline" onClick={exportCsv}>
                        <Download /> Exportar CSV
                    </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Segmented
                        label="Status"
                        value={status}
                        onChange={setStatus}
                        options={[
                            { value: "all", label: "Todos" },
                            { value: "completed", label: "Pagos" },
                            { value: "refunded", label: "Reembolsados" },
                            { value: "pending", label: "Pendentes" },
                            { value: "failed", label: "Falhos" },
                        ]}
                    />
                    {methods.length > 0 ? (
                        <Segmented
                            label="Forma de pagamento"
                            value={method}
                            onChange={setMethod}
                            options={[{ value: "all", label: "Qualquer forma" }, ...methods.map((m) => ({ value: m, label: METHOD_LABEL[m] ?? m }))]}
                        />
                    ) : null}
                </div>

                <div className="overflow-hidden rounded-[var(--radius-lg)] bg-sunken">
                    {loadingPayments ? (
                        <TableSkeleton />
                    ) : payments.length === 0 ? (
                        <EmptyState icon={Receipt} title="Nenhum pagamento encontrado" description="Ajuste os filtros ou aguarde os próximos webhooks." />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Plano</TableHead>
                                    <TableHead>Forma</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((p) => {
                                    const st = PAYMENT_STATUS[p.status] ?? { label: p.status, tone: "neutral" as const };
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={p.user.name} />
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold">{p.user.name}</p>
                                                        <p className="truncate text-xs text-muted-foreground">{p.user.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{PLAN_LABEL[p.plan] ?? p.plan}</TableCell>
                                            <TableCell className="text-muted-foreground">{p.method ? METHOD_LABEL[p.method] ?? p.method : "—"}</TableCell>
                                            <TableCell><Pill tone={st.tone} dot>{st.label}</Pill></TableCell>
                                            <TableCell className="text-muted-foreground tabular">{p.date ? new Date(p.date).toLocaleDateString("pt-BR") : "—"}</TableCell>
                                            <TableCell className="text-right font-bold tabular">
                                                <span className={p.status === "refunded" ? "text-destructive" : ""}>
                                                    {p.status === "refunded" ? "−" : ""}
                                                    {brl(p.amount)}
                                                </span>
                                                {p.notes?.includes("assumido") ? <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">estimado</span> : null}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                    {!loadingPayments && payments.length > 0 ? <Pager page={page} pages={pages} total={total} noun="pagamentos" onChange={setPage} /> : null}
                </div>
            </section>
            <ReferralPrograms />
        </>
    );
}
