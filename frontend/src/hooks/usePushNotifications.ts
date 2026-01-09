"use client";

import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || 'BLzSS4PWis8jTZWkoj4ZO-X72PWmWva50qpJ6J2rRV3RjPSXV6_0X7AOf0kv0EL_eAFJHxshb89EfDyh37dnuXU';

export function usePushNotifications() {
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            // Mobile: use Capacitor FCM
            initMobilePush();
        } else {
            // Web/PWA: use Web Push API
            initWebPush();
        }
    }, []);
}

// ========== MOBILE (Capacitor + FCM) ==========

async function initMobilePush() {
    try {
        // 1. Check permission status
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            // 2. Request permission if not yet determined
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            console.log('❌ Push notification permission denied');
            return;
        }

        // 3. Register with FCM/APNs
        await PushNotifications.register();
        console.log('✅ Mobile push notifications registered');

    } catch (error) {
        console.error('Error initializing mobile push notifications:', error);
    }

    // Listen for successful registration
    PushNotifications.addListener('registration', async (token) => {
        console.log('📱 Push registration success, token:', token.value);

        // Send token to backend
        try {
            await fetchAPI('/notifications/register-device', {
                method: 'POST',
                body: JSON.stringify({
                    token: token.value,
                    platform: Capacitor.getPlatform(), // 'ios' or 'android'
                    device_name: `${Capacitor.getPlatform()} Device`
                })
            });
            console.log('✅ Mobile device token registered with backend');
        } catch (error) {
            console.error('❌ Failed to register mobile device token:', error);
        }
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
        console.error('❌ Error on mobile registration:', error);
    });

    // Handle notification received while app is in FOREGROUND
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('📬 Push notification received (foreground):', notification);

        // Show as toast
        toast(notification.title, {
            description: notification.body,
            duration: 5000,
        });
    });

    // Handle notification tap (app in background or killed)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('👆 Push notification tapped:', action);

        const data = action.notification.data;

        // Navigate based on link_type
        if (data.link_type) {
            const routes: Record<string, string> = {
                'hydration': '/hydration',
                'nutrition': '/diet',
                'workout': '/workouts',
                'achievement': '/achievements',
                'goal': '/dashboard'
            };

            const route = routes[data.link_type] || '/dashboard';
            window.location.href = route;
        }
    });
}

// ========== WEB/PWA (Web Push API) ==========

async function initWebPush() {
    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('❌ Web Push not supported in this browser');
        return;
    }

    try {
        // 1. Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered');

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;

        // 2. Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('❌ Web notification permission denied');
            return;
        }

        // 3. Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        console.log('✅ Web Push subscription created:', subscription);

        // 4. Send subscription to backend
        await fetchAPI('/notifications/register-device', {
            method: 'POST',
            body: JSON.stringify({
                platform: 'web',
                subscription: subscription.toJSON(),
                device_name: getBrowserName()
            })
        });

        console.log('✅ Web Push subscription registered with backend');

    } catch (error) {
        console.error('❌ Error initializing web push:', error);
    }
}

// Helper: Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Helper: Get browser name
function getBrowserName() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Web Browser';
}
