// Service Worker for Web Push Notifications

self.addEventListener('push', function (event) {
    console.log('[Service Worker] Push received:', event);

    const data = event.data ? event.data.json() : {};

    const options = {
        body: data.body || 'Nova notificação',
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/badge.png',
        data: data.data || {},
        vibrate: [200, 100, 200],
        tag: 'fitgen-notification',
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'FitGen', options)
    );
});

self.addEventListener('notificationclick', function (event) {
    console.log('[Service Worker] Notification clicked:', event.notification);

    event.notification.close();

    const data = event.notification.data;
    let urlToOpen = '/dashboard';

    // Navigate based on link_type
    if (data.link_type) {
        const routes = {
            'hydration': '/hydration',
            'nutrition': '/diet',
            'workout': '/workouts',
            'achievement': '/achievements',
            'goal': '/dashboard'
        };
        urlToOpen = routes[data.link_type] || '/dashboard';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUnmatched: true }).then(function (clientList) {
            // Check if there's already a window open
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window if none exists
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

self.addEventListener('pushsubscriptionchange', function (event) {
    console.log('[Service Worker] Push subscription changed');

    event.waitUntil(
        self.registration.pushManager.subscribe(event.oldSubscription.options)
            .then(function (subscription) {
                console.log('[Service Worker] Subscription refreshed');
                // TODO: Send new subscription to backend
            })
    );
});
