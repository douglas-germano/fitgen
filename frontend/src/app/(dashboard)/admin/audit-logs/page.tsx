"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function AuditLogsPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [actionFilter, setActionFilter] = useState("");
    const [resourceFilter, setResourceFilter] = useState("");

    useEffect(() => {
        loadLogs();
    }, [page, actionFilter, resourceFilter]);

    async function loadLogs() {
        setLoading(true);
        try {
            let url = `/admin/audit-logs?page=${page}&per_page=20`;
            if (actionFilter) url += `&action=${actionFilter}`;
            if (resourceFilter) url += `&resource_type=${resourceFilter}`;

            const data = await fetchAPI(url);
            setLogs(data.logs);
            setTotalPages(data.pages);
        } catch (error) {
            console.error("Failed to load audit logs", error);
        } finally {
            setLoading(false);
        }
    }

    const getActionBadge = (action: string) => {
        const colors: Record<string, string> = {
            create: "bg-green-500",
            update: "bg-blue-500",
            delete: "bg-red-500",
            suspend: "bg-orange-500",
            activate: "bg-emerald-500",
            grant_achievement: "bg-purple-500"
        };
        return <Badge className={colors[action] || "bg-gray-500"}>{action}</Badge>;
    };

    return (
        <div className="space-y-6 p-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h1>
                    <p className="text-muted-foreground">Histórico completo de ações administrativas</p>
                </div>
                <Link href="/admin">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-muted-foreground">Ação</label>
                            <Input
                                placeholder="Ex: create, update, delete"
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground">Tipo de Recurso</label>
                            <Input
                                placeholder="Ex: user, workout, exercise"
                                value={resourceFilter}
                                onChange={(e) => setResourceFilter(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card className="glass-card">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Ação</TableHead>
                                <TableHead>Recurso</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>IP</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Nenhum log encontrado
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-white/5">
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{log.user_email}</div>
                                                <div className="text-xs text-muted-foreground">{log.user_role}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getActionBadge(log.action)}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">{log.resource_type}</div>
                                            {log.resource_id && (
                                                <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                                                    {log.resource_id}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {log.description || "-"}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {log.ip_address || "-"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Página {page} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                        >
                            Próximo
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
