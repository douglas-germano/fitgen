"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
    const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());
    const [unreadCount, setUnreadCount] = useState(0);

    const markAsRead = async (id: string) => {
        try {
            await fetchAPI(`/notifications/${id}/read`, { method: "POST" });
            setShownNotifications(prev => new Set([...prev, id]));
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

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

    const showNotificationToast = (notification: Notification) => {
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
    };

    useEffect(() => {
        const checkForNotifications = async () => {
            try {
                const notifications: Notification[] = await fetchAPI("/notifications/unread");

                setUnreadCount(notifications.length);

                // Show new notifications as toasts
                notifications.forEach(notification => {
                    if (!shownNotifications.has(notification.id)) {
                        showNotificationToast(notification);
                        setShownNotifications(prev => new Set([...prev, notification.id]));
                    }
                });
            } catch (error) {
                // Silently fail - don't spam console
            }
        };

        // Check immediately
        checkForNotifications();

        // Then check every 30 seconds
        const interval = setInterval(checkForNotifications, 30000);

        return () => clearInterval(interval);
    }, [shownNotifications]);

    return (
        <NotificationContext.Provider value={{ unreadCount, markAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
}
