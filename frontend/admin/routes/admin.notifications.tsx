import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api";
import { formatDateBRT } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, Field, PageHeader, Pager, Panel, Pill, TableSkeleton } from "@admin/kit";

interface AdminNotification {
    id: string;
    title: string;
    message: string;
    type: string;
    user_email: string;
    created_at: string;
}

export const Route = createFileRoute("/admin/notifications")({ component: AdminNotificationsPage });

function AdminNotificationsPage() {
    const [items, setItems] = useState<AdminNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAPI(`/admin/notifications?page=${page}&per_page=10`);
            setItems(data.items);
            setPages(data.pages);
            setTotal(data.total);
        } catch {
            toast.error("Erro ao carregar o histórico");
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        load();
    }, [load]);

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            await fetchAPI("/admin/notifications/broadcast", {
                method: "POST",
                body: JSON.stringify({ title, message, type: "system" }),
            });
            toast.success("Notificação enviada para todos os usuários");
            setTitle("");
            setMessage("");
            if (page === 1) load();
            else setPage(1);
        } catch {
            toast.error("Erro ao enviar notificação");
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <PageHeader title="Notificações" description="Envie avisos para todos os usuários e consulte o histórico." />

            <div className="grid items-start gap-4 xl:grid-cols-[380px_1fr]">
                <Panel title="Nova transmissão" description="Chega para TODOS os usuários, no app.">
                    <form onSubmit={handleBroadcast} className="space-y-4">
                        <Field label="Título">
                            <Input placeholder="Ex.: Manutenção programada" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required />
                        </Field>
                        <Field label="Mensagem">
                            <Textarea
                                placeholder="Ex.: O app ficará indisponível amanhã às 02h."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="min-h-32 resize-none"
                                required
                            />
                        </Field>
                        <Button type="submit" size="lg" className="w-full" disabled={sending || !title.trim() || !message.trim()}>
                            {sending ? <Loader2 className="animate-spin" /> : <Send />} Enviar para todos
                        </Button>
                    </form>
                </Panel>

                <div className="overflow-hidden rounded-[var(--radius-lg)] bg-sunken">
                    <div className="px-5 pt-5">
                        <h2 className="text-base font-bold tracking-tight">Histórico</h2>
                        <p className="text-[13px] text-muted-foreground tabular">{total} notificações enviadas</p>
                    </div>
                    <div className="pt-3">
                        {loading ? (
                            <TableSkeleton rows={5} />
                        ) : items.length === 0 ? (
                            <EmptyState icon={Bell} title="Nenhuma notificação ainda" description="As transmissões enviadas aparecem aqui." />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Notificação</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Destinatário</TableHead>
                                        <TableHead>Data</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((n) => (
                                        <TableRow key={n.id}>
                                            <TableCell className="max-w-[320px] whitespace-normal">
                                                <p className="font-semibold">{n.title}</p>
                                                <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                                            </TableCell>
                                            <TableCell><Pill tone="volt">{n.type}</Pill></TableCell>
                                            <TableCell className="text-muted-foreground">{n.user_email}</TableCell>
                                            <TableCell className="text-muted-foreground tabular">{formatDateBRT(n.created_at)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                        {!loading && items.length > 0 ? <Pager page={page} pages={pages} onChange={setPage} /> : null}
                    </div>
                </div>
            </div>
        </>
    );
}
