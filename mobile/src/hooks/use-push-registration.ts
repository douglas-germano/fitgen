import { router } from 'expo-router';
import { communityNotificationPath } from '@/lib/community';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registers the native device token (FCM on Android, APNs on iOS) with the
 * backend — the same `/notifications/register-device` contract the Capacitor
 * app used. Requires a development/production build; Expo Go can't receive push.
 */
export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const redirect = (notification: Notifications.Notification) => {
      const data = notification.request.content.data;
      const path = communityNotificationPath(data?.link_type, data?.link_id);
      if (path) router.push(path as `/community/activity/${string}`);
      Notifications.clearLastNotificationResponse();
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) redirect(last.notification);
    const sub = Notifications.addNotificationResponseReceivedListener(response => redirect(response.notification));
    return () => sub.remove();
  }, [enabled]);
  useEffect(() => {
    if (!enabled || !Device.isDevice) return;

    (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'FitGen',
            importance: AndroidImportance.DEFAULT,
          });
        }
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          ({ status } = await Notifications.requestPermissionsAsync());
        }
        if (status !== 'granted') return;

        const token = await Notifications.getDevicePushTokenAsync();
        await api('/notifications/register-device', {
          method: 'POST',
          body: { token: token.data, platform: Platform.OS },
        });
      } catch (error) {
        console.warn('Push registration failed', error);
      }
    })();
  }, [enabled]);
}
