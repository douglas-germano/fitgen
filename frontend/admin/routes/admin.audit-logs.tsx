import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, Pager, Pill, SearchField, TableSkeleton } from "@admin/kit";

interface AuditLog {
    id: string;
    user_email: string;
    user_role: string;
    action: string;
    resource_type: string;
    resource_id: string | null;
    description: string | null;
    created_at: string;
    ip_address: string | null;
}

const ACTION_TONE: Record<string, "volt" | "danger" | "inverse" | "neutral"> = {
    create: "volt",
    activate: "volt",
    grant_achievement: "volt",
    delete: "danger",
    suspend: "danger",
    update: "inverse",
};

export const Route = createFileRoute("/admin/audit-logs")({ component: AuditLogsPage });

function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [action, setAction] = useState("");
    const [resource, setResource] = useState("");

    useEffect(() => setPage(1), [action, resource]);

    useEffect(() => {
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const p = new URLSearchParams({ page: String(page), per_page: "20" });
                if (action) p.set("action", action);
                if (resource) p.set("resource_type", resource);
                const data = await fetchAPI(`/admin/audit-logs?${p}`);
                setLogs(data.logs);
                setPages(data.pages);
            } catch {
                toast.error("Erro ao carregar os logs");
            } finally {
                setLoading(false);
            }
        }, 350);
        return () => clearTimeout(t);
    }, [page, action, resource]);

    return (
        <>
            <PageHeader title="Auditoria" description="Tudo o que os administradores fizeram no sistema." />

            <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
                <SearchField value={action} onChange={setAction} placeholder="Ação (create, update, delete…)" />
                <SearchField value={resource} onChange={setResource} placeholder="Recurso (user, workout, exercise…)" />
            </div>

            <div className="overflow-hidden rounded-[var(--radius-lg)] bg-sunken">
                {loading ? (
                    <TableSkeleton />
                ) : logs.length === 0 ? (
                    <EmptyState icon={ScrollText} title="Nenhum log encontrado" description="Ajuste os filtros para ver outros registros." />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Quem</TableHead>
                                <TableHead>Ação</TableHead>
                                <TableHead>Recurso</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Quando</TableHead>
                                <TableHead>IP</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        <p className="font-semibold">{log.user_email}</p>
                                        <p className="text-xs text-muted-foreground">{log.user_role}</p>
                                    </TableCell>
                                    <TableCell><Pill tone={ACTION_TONE[log.action] ?? "neutral"}>{log.action}</Pill></TableCell>
                                    <TableCell>
                                        <p>{log.resource_type}</p>
                                        {log.resource_id ? (
                                            <p className="max-w-[110px] truncate font-mono text-[11px] text-muted-foreground" title={log.resource_id}>
                                                {log.resource_id}
                                            </p>
                                        ) : null}
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate text-muted-foreground" title={log.description ?? undefined}>
                                        {log.description || "—"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground tabular">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{log.ip_address || "—"}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                {!loading && logs.length > 0 ? <Pager page={page} pages={pages} onChange={setPage} /> : null}
            </div>
        </>
    );
}
