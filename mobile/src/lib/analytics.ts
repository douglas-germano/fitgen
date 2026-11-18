/**
 * Crash reporting (Sentry, project `fitgen-mobile`) and product analytics (PostHog).
 *
 * Each one is off until its public key is set: `EXPO_PUBLIC_SENTRY_DSN` and
 * `EXPO_PUBLIC_POSTHOG_KEY` (`phc_…`, optional `EXPO_PUBLIC_POSTHOG_HOST`, default US cloud).
 * Development builds send nothing unless `EXPO_PUBLIC_ANALYTICS_IN_DEV=1`, so testing on the
 * simulator doesn't pollute production data.
 *
 * Privacy: the only identity sent is the FitGen user id (same one RevenueCat uses). No names,
 * e-mails or health values go to either service; nothing is used for ad tracking, so the
 * app needs no ATT prompt. The data types are declared in app.json → ios.privacyManifests.
 */
import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';
import type { ComponentType } from 'react';

const ACTIVE = !__DEV__ || process.env.EXPO_PUBLIC_ANALYTICS_IN_DEV === '1';
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;

export const sentryEnabled = ACTIVE && !!SENTRY_DSN;

if (sentryEnabled) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    integrations: [Sentry.expoRouterIntegration()],
  });
}

const posthog: PostHog | null =
  ACTIVE && POSTHOG_KEY
    ? new PostHog(POSTHOG_KEY, {
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        captureAppLifecycleEvents: true,
        // Anonymous visitors (login/register screens) don't create person profiles.
        personProfiles: 'identified_only',
      })
    : null;

export const analyticsEnabled = !!posthog;

/** Names of the product events, kept in one place so the PostHog funnels stay consistent. */
export type AnalyticsEvent =
  | 'signed_up'
  | 'logged_in'
  | 'onboarding_completed'
  | 'paywall_viewed'
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_cancelled'
  | 'purchase_failed'
  | 'purchase_restored'
  | 'workout_completed'
  | 'meal_logged'
  | 'water_logged';

type Props = Record<string, string | number | boolean | null>;

export function track(event: AnalyticsEvent, properties?: Props) {
  posthog?.capture(event, properties);
}

export function trackScreen(name: string) {
  void posthog?.screen(name);
}

/** Ties crashes and events to the FitGen account. Safe to call repeatedly. */
export function identifyUser(userId: string, traits?: Props) {
  if (sentryEnabled) Sentry.setUser({ id: userId });
  posthog?.identify(userId, traits);
}

export function resetUser() {
  if (sentryEnabled) Sentry.setUser(null);
  posthog?.reset();
}

export function captureError(error: unknown, context?: Props) {
  if (sentryEnabled) Sentry.captureException(error, context ? { extra: context } : undefined);
}

/** Wraps the root component so Sentry can measure app start and catch render errors. */
export const withMonitoring = <P extends Record<string, unknown>>(component: ComponentType<P>) =>
  sentryEnabled ? Sentry.wrap(component) : component;
