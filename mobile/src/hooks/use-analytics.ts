import { useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import { identifyUser, resetUser, trackScreen } from '@/lib/analytics';
import type { Profile } from '@/types/api';

/** Keeps the Sentry/PostHog identity in sync with the signed-in FitGen user. */
export function useAnalyticsIdentity(profile: Profile | undefined, signedIn: boolean) {
  const wasSignedIn = useRef(false);
  const userId = profile?.id;
  const status = profile?.subscription_status ?? null;
  const hasAccess = profile?.has_access ?? null;

  useEffect(() => {
    if (signedIn && userId) {
      wasSignedIn.current = true;
      identifyUser(userId, { subscription_status: status, has_access: hasAccess });
    } else if (!signedIn && wasSignedIn.current) {
      // Only on an actual sign-out, so anonymous visitors keep one id across launches.
      wasSignedIn.current = false;
      resetUser();
    }
  }, [signedIn, userId, status, hasAccess]);
}

/**
 * Sends a screen view to PostHog on every route change (expo-router has no navigation container to hook).
 * Uses the route template (`/workout/[id]/play/[dayId]`), not the URL, so ids don't split one screen into many.
 */
export function useScreenTracking() {
  const segments = useSegments() as string[];
  const screen = '/' + segments.filter((s) => !s.startsWith('(')).join('/');
  useEffect(() => {
    trackScreen(screen);
  }, [screen]);
}
