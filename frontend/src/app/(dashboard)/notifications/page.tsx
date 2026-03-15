"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { formatDateBRT } from "@/lib/date";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Bell, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const data = await fetchAPI("/notifications/");
            setNotifications(data);

            // Mark all as read when opening this page? 
            // Or maybe just leave them until manually acted upon?
            // Let's mark them as read one by one or maybe backend should have a 'mark all read'.
            // For now, let's just mark visible ones as read in background
            data.forEach((n: Notification) => {
                if (!n.is_read) {
                    fetchAPI(`/notifications/${n.id}/read`, { method: "POST" });
                }
            });

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetchAPI(`/notifications/${id}`, { method: "DELETE" });
            setNotifications(prev => prev.filter(n => n.id !== id));
            toast.success("Notificação removida.");
        } catch (error) {
            toast.error("Erro ao remover notificação.");
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto animate-fade-in-up">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Suas Notificações</h1>
                    <p className="text-muted-foreground">Alertas de metas, conquistas e avisos.</p>
                </div>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="p-12 text-center text-muted-foreground">Carregando...</div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground glass-card rounded-lg border-white/10">
                        <Bell className="h-10 w-10 mb-4 opacity-50" />
                        <p>Nenhuma notificação por enquanto.</p>
                    </div>
                ) : (
                    notifications.map((n, index) => (
                        <Card
                            key={n.id}
                            className={cn(
                                "glass-card transition-all hover:scale-[1.02] duration-300",
                                !n.is_read ? "border-l-4 border-l-primary shadow-lg shadow-primary/5" : "opacity-80 hover:opacity-100",
                                `animate-fade-in-up delay-${Math.min(index * 100, 500)}`
                            )}
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <CardContent className="p-4 flex gap-4 items-start">
                                <div className={cn(
                                    "p-2 rounded-full shrink-0 ring-1 ring-inset ring-white/10",
                                    n.type === 'goal' ? "bg-green-500/20 text-green-500" :
                                        n.type === 'system' ? "bg-amber-500/20 text-amber-500" :
                                            "bg-blue-500/20 text-blue-500"
                                )}>
                                    <Bell className="h-5 w-5" />
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className={cn("font-semibold leading-none", !n.is_read ? "text-foreground" : "text-muted-foreground")}>{n.title}</h4>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDateBRT(n.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {n.message}
                                    </p>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 -mt-1 -mr-1"
                                    onClick={(e) => handleDelete(n.id, e)}
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Excluir</span>
                                </Button>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <div className="flex justify-center pt-8">
                <Button variant="outline" onClick={() => router.push('/dashboard')} className="glass-card hover:bg-white/10">
                    Voltar ao Dashboard
                </Button>
            </div>
        </div>
    );
}
