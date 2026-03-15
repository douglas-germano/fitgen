"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { toast } from "sonner";
import { Bell, TrendingUp, Droplets, Utensils, Trophy } from "lucide-react";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    created_at: string;
    link_type?: string;
    link_id?: string;
}

const NotificationContext = createContext<{
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
}>({
    unreadCount: 0,
    markAsRead: async () => { },
});

export function useNotifications() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    // Use ref to track shown notification IDs — avoids re-triggering the effect
    const shownRef = useRef<Set<string>>(new Set());
    const [unreadCount, setUnreadCount] = useState(0);

    const markAsRead = useCallback(async (id: string) => {
        try {
            await fetchAPI(`/notifications/${id}/read`, { method: "POST" });
            shownRef.current.add(id);
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'goal':
                return <Trophy className="h-5 w-5" />;
            case 'achievement':
                return <TrendingUp className="h-5 w-5" />;
            case 'hydration':
                return <Droplets className="h-5 w-5" />;
            case 'nutrition':
                return <Utensils className="h-5 w-5" />;
            default:
                return <Bell className="h-5 w-5" />;
        }
    };

    useEffect(() => {
        const checkForNotifications = async () => {
            try {
                const notifications: Notification[] = await fetchAPI("/notifications/unread");

                setUnreadCount(notifications.length);

                // Show new notifications as toasts (using ref — no state update needed)
                notifications.forEach(notification => {
                    if (!shownRef.current.has(notification.id)) {
                        shownRef.current.add(notification.id);

                        const icon = getIcon(notification.type);
                        toast(notification.title, {
                            description: notification.message,
                            icon,
                            duration: 5000,
                            action: {
                                label: "OK",
                                onClick: () => markAsRead(notification.id),
                            },
                            onDismiss: () => markAsRead(notification.id),
                            onAutoClose: () => markAsRead(notification.id),
                        });
                    }
                });
            } catch (error) {
                // Silently fail — don't spam console
            }
        };

        // Check immediately
        checkForNotifications();

        // Then check every 30 seconds — single stable interval
        const interval = setInterval(checkForNotifications, 30000);

        return () => clearInterval(interval);
    }, [markAsRead]);

    return (
        <NotificationContext.Provider value={{ unreadCount, markAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
}
