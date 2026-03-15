"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { formatDateBRT } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Send, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function AdminNotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const perPage = 20;

    // Broadcast Form
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");

    const loadNotifications = async (page = 1) => {
        setLoading(true);
        try {
            const data = await fetchAPI(`/admin/notifications?page=${page}&per_page=${perPage}`);
            setNotifications(data.items);
            setTotalPages(data.pages);
            setTotal(data.total);
            setCurrentPage(page);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications(1);
    }, []);

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            await fetchAPI("/admin/notifications/broadcast", {
                method: "POST",
                body: JSON.stringify({
                    title,
                    message,
                    type: "system"
                })
            });
            toast.success("Notificação enviada para todos os usuários!");
            setTitle("");
            setMessage("");
            loadNotifications(1); // Refresh list and go to first page
        } catch (error) {
            toast.error("Erro ao enviar notificação.");
        } finally {
            setSending(false);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            loadNotifications(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            loadNotifications(currentPage + 1);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gerenciar Notificações</h1>
                <p className="text-muted-foreground">Envie alertas para todos os usuários e visualize o histórico.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Broadcast Form */}
                <Card className="md:col-span-1 glass-card shadow-lg shadow-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-primary" />
                            Nova Transmissão
                        </CardTitle>
                        <CardDescription>
                            Envie uma notificação para TODOS os usuários do sistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleBroadcast} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Título</label>
                                <Input
                                    placeholder="Ex: Manutenção Programada"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                    className="bg-background/50 border-white/10 focus:ring-primary/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Mensagem</label>
                                <Textarea
                                    placeholder="Ex: O sistema ficará fora do ar..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    required
                                    className="resize-none bg-background/50 border-white/10 focus:ring-primary/20 min-h-[120px]"
                                />
                            </div>
                            <Button type="submit" className="w-full shadow-lg shadow-primary/20" disabled={sending}>
                                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enviar para Todos
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* History List */}
                <Card className="md:col-span-2 glass-card animate-fade-in-up delay-100">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-muted-foreground" />
                                Histórico de Notificações
                            </CardTitle>
                            <div className="text-sm text-muted-foreground">
                                Total: {total} notificações
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border border-white/10 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="hover:bg-transparent border-white/10">
                                        <TableHead>Título</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Usuário</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                            </TableCell>
                                        </TableRow>
                                    ) : notifications.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                Nenhuma notificação encontrada.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        notifications.map((n) => (
                                            <TableRow key={n.id} className="hover:bg-white/5 border-white/5 transition-colors">
                                                <TableCell className="font-medium">{n.title}</TableCell>
                                                <TableCell className="capitalize">
                                                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs border border-primary/20">
                                                        {n.type}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {formatDateBRT(n.created_at)}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {n.user_email}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Página {currentPage} de {totalPages}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePreviousPage}
                                        disabled={currentPage === 1}
                                        className="bg-background/50 border-white/10"
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleNextPage}
                                        disabled={currentPage === totalPages}
                                        className="bg-background/50 border-white/10"
                                    >
                                        Próxima
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
