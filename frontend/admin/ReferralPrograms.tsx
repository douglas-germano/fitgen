import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Partner = { owner_id: string; email: string; code: string; enabled: boolean; signups: number; qualified: number };
type Commission = {
    id: string;
    payment_id: string;
    partner_email: string;
    payment_amount: string;
    received_amount: string | null;
    amount: string;
    currency: string;
    status: string;
    payout_reference: string | null;
};
const statusLabel: Record<string, string> = {
    pending: "Pendente", approved: "Aprovada", paid: "Paga", void: "Anulada", reversed: "Estornada",
};

export function ReferralPrograms() {
    const [client] = useState(() => new QueryClient());
    return <QueryClientProvider client={client}><ReferralProgramsPanel /></QueryClientProvider>;
}

function ReferralProgramsPanel() {
    const [email, setEmail] = useState("");
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("pending");
    const [values, setValues] = useState<Record<string, string>>({});
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const partners = useQuery<Partner[]>({
        queryKey: ["admin-referral-partners"],
        queryFn: () => fetchAPI("/admin/referral-partners"),
    });
    const commissions = useQuery<{ items: Commission[]; pages: number }>({
        queryKey: ["admin-referral-commissions", page, status],
        queryFn: () => fetchAPI(`/admin/referral-commissions?page=${page}&status=${status}`),
    });
    async function update(endpoint: string, method: string, body: Record<string, unknown>) {
        setError("");
        setBusy(true);
        try {
            await fetchAPI(`/admin/${endpoint}`, { method, body: JSON.stringify(body) });
            if (method === "PATCH") {
                const id = endpoint.split("/").at(-1)!;
                setValues((previous) => ({ ...previous, [id]: "" }));
            }
            await Promise.all([partners.refetch(), commissions.refetch()]);
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : "Falha ao salvar.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="mt-8 space-y-5 rounded-xl border p-5" aria-labelledby="partner-heading">
            <h2 id="partner-heading" className="text-lg font-semibold">FitGen Parceiros</h2>
            <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
                event.preventDefault();
                void update("referral-partners", "POST", { email, enabled: true });
            }}>
                <label className="grid gap-1">Email da conta FitGen
                    <Input type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </label>
                <Button disabled={busy} type="submit">Ativar parceiro</Button>
            </form>
            {partners.isPending && <p>Carregando parceiros…</p>}
            <ul className="space-y-2">
                {partners.data?.map((partner) => (
                    <li key={partner.owner_id} className="flex flex-wrap items-center gap-2">
                        <span>{partner.email} · {partner.code} · {partner.signups} cadastros · {partner.qualified} conversões</span>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => {
                            void update("referral-partners", "POST", { email: partner.email, enabled: !partner.enabled });
                        }}>{partner.enabled ? "Desativar convites" : "Reativar convites"}</Button>
                    </li>
                ))}
            </ul>
            <h3 className="font-semibold">Comissões recorrentes</h3>
            <p className="text-sm">Confira o líquido e eventuais estornos no extrato do provedor antes de aprovar. Depois do repasse, registre o comprovante ou a referência.</p>
            <label className="flex items-center gap-2">Estado
                <select className="rounded-md border bg-background p-2" value={status} onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                }}>
                    {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
            </label>
            {!!error && <p role="alert">{error}</p>}
            {(partners.isError || commissions.isError) && <p role="alert">Falha ao carregar dados de parceiros.</p>}
            {commissions.isPending && <p>Carregando comissões…</p>}
            {commissions.data?.items.length === 0 && <p>Nenhuma comissão neste estado.</p>}
            <ul className="space-y-3">
                {commissions.data?.items.map((row) => (
                    <li key={row.id} className="space-y-2 rounded-lg border p-3">
                        <div>{row.partner_email} · {row.payment_id}</div>
                        <div>Cobrança {row.currency} {row.payment_amount} · {row.received_amount ? "Comissão" : "Estimativa"} {row.currency} {row.amount}</div>
                        {row.payout_reference && <div>Repasse {row.payout_reference}</div>}
                        <div className="flex flex-wrap items-end gap-2">
                            {["pending", "approved"].includes(row.status) && (
                                <label className="grid gap-1">
                                    {row.status === "pending" ? `Líquido recebido em ${row.currency}` : "Referência do repasse"}
                                    <Input inputMode={row.status === "pending" ? "decimal" : "text"} maxLength={255} value={values[row.id] ?? ""}
                                        onChange={(event) => setValues({ ...values, [row.id]: event.target.value })} />
                                </label>
                            )}
                            {row.status === "pending" && <Button disabled={busy || !values[row.id]?.trim()} onClick={() => {
                                void update(`referral-commissions/${row.id}`, "PATCH", { status: "approved", received_amount: values[row.id].trim().replace(",", ".") });
                            }}>Aprovar</Button>}
                            {row.status === "approved" && <Button disabled={busy || !values[row.id]?.trim()} onClick={() => {
                                void update(`referral-commissions/${row.id}`, "PATCH", { status: "paid", payout_reference: values[row.id].trim() });
                            }}>Registrar repasse</Button>}
                            {["pending", "approved", "paid"].includes(row.status) && <Button variant="outline" disabled={busy} onClick={() => {
                                void update(`referral-commissions/${row.id}`, "PATCH", { status: row.status === "paid" ? "reversed" : "void" });
                            }}>{row.status === "paid" ? "Registrar estorno" : "Anular"}</Button>}
                        </div>
                    </li>
                ))}
            </ul>
            <div className="flex gap-2">
                {page > 1 && <Button variant="outline" onClick={() => setPage(page - 1)}>Anterior</Button>}
                {page < (commissions.data?.pages ?? 0) && <Button variant="outline" onClick={() => setPage(page + 1)}>Próxima</Button>}
            </div>
        </section>
    );
}
