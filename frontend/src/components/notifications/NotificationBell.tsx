"use client";

import { useEffect, useState, useRef } from "react";
import { fetchAPI } from "@/lib/api";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

export function NotificationBell() {
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);
    const lastNotificationIdRef = useRef<string | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const loadNotifications = async (isFirstLoad = false) => {
        try {
            const data: Notification[] = await fetchAPI("/notifications/");

            // Calculate unread
            const unread = data.filter(n => !n.is_read).length;
            setUnreadCount(unread);

            // Check for new notification (top of list)
            if (data.length > 0) {
                const latest = data[0];

                // If it's not the first load, and the ID is different from last seen, IT IS NEW
                if (!isFirstLoad && lastNotificationIdRef.current && latest.id !== lastNotificationIdRef.current) {
                    // Only show toast if window is visible (otherwise SW handles it)
                    if (!document.hidden) {
                        toast(latest.title, {
                            description: latest.message,
                            action: {
                                label: "Ver",
                                onClick: () => router.push("/notifications"),
                            },
                        });
                    }
                }

                lastNotificationIdRef.current = latest.id;
            }

        } catch (e: any) {
            console.error("Failed to load notifications", e);
            // If 429 Too Many Requests, stop polling to be safe
            if (e.status === 429 && intervalRef.current) {
                console.warn("Stopping notification polling due to rate limiting.");
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
    };

    useEffect(() => {
        // Initial load
        loadNotifications(true);

        // Poll every 30 seconds (slower to verify fix) instead of 10s
        intervalRef.current = setInterval(() => loadNotifications(false), 30000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return (
        <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => router.push("/notifications")}
            aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border border-background animate-pulse"
                    aria-hidden="true" />
            )}
            <span className="sr-only">
                {unreadCount > 0 ? `${unreadCount} notificações não lidas` : 'Ver notificações'}
            </span>
        </Button>
    );
}
