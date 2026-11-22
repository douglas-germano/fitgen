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
import { ErrorBoundary as RouteErrorBoundary, router } from 'expo-router';
import PostHog from 'posthog-react-native';
import type { ComponentType } from 'react';

const ACTIVE = !__DEV__ || process.env.EXPO_PUBLIC_ANALYTICS_IN_DEV === '1';
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;

export const sentryEnabled = ACTIVE && !!SENTRY_DSN;

/** Host of the FitGen API: the only place the `sentry-trace`/`baggage` headers go (links app spans to backend spans). */
const API_HOST = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/^https?:\/\//, '').split('/')[0];
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Query strings can carry reset/verification tokens; breadcrumbs keep only the path. */
const stripQuery = (url: unknown) => (typeof url === 'string' ? url.split('?')[0] : url);

if (sentryEnabled) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // EAS sets EXPO_PUBLIC_APP_ENV per build profile (preview / production), so tester builds don't mix with the store.
    environment: process.env.EXPO_PUBLIC_APP_ENV || (__DEV__ ? 'development' : 'production'),
    sendDefaultPii: false,
    // Performance: navigation, app start, slow/frozen frames, HTTP spans. Profiles are a share of the sampled traces.
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.5,
    tracePropagationTargets: API_HOST ? [new RegExp(`^https://${escapeRegExp(API_HOST)}`)] : [],
    // Session Replay only for sessions that hit an error; text, images and vectors are masked (health data on screen).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Screenshots on errors would capture health data unmasked, so they stay off.
    attachScreenshot: false,
    enableLogs: true,
    integrations: [
      Sentry.expoRouterIntegration({ enableTimeToInitialDisplay: true }),
      Sentry.mobileReplayIntegration({ maskAllText: true, maskAllImages: true, maskAllVectors: true }),
    ],
    // Offline phones aren't bugs; the HTTP breadcrumbs still show them on real issues.
    ignoreErrors: [/Network request failed/i, /The network connection was lost/i, /The Internet connection appears to be offline/i],
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data?.url) breadcrumb.data.url = stripQuery(breadcrumb.data.url);
      if (breadcrumb.category === 'navigation') {
        if (breadcrumb.data?.from) breadcrumb.data.from = stripQuery(breadcrumb.data.from);
        if (breadcrumb.data?.to) breadcrumb.data.to = stripQuery(breadcrumb.data.to);
      }
      return breadcrumb;
    },
  });
  // Breadcrumbs + spans for the imperative `router.push/replace/back` calls used across the app.
  Sentry.wrapExpoRouter(router as unknown as Sentry.ExpoRouter);
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
  // Product events double as breadcrumbs, so a crash report shows what the user had just done.
  if (sentryEnabled) Sentry.addBreadcrumb({ category: 'analytics', message: event, data: properties, level: 'info' });
}

export function trackScreen(name: string) {
  void posthog?.screen(name);
}

/** Ties crashes and events to the FitGen account. Safe to call repeatedly. */
export function identifyUser(userId: string, traits?: Props) {
  if (sentryEnabled) {
    Sentry.setUser({ id: userId });
    if (traits?.subscription_status !== undefined) Sentry.setTag('subscription_status', String(traits.subscription_status));
  }
  posthog?.identify(userId, traits);
}

export function resetUser() {
  if (sentryEnabled) {
    Sentry.setUser(null);
    Sentry.setTag('subscription_status', undefined);
  }
  posthog?.reset();
}

export function captureError(error: unknown, context?: Props) {
  if (sentryEnabled) Sentry.captureException(error, context ? { extra: context } : undefined);
}

type ApiLikeError = Error & { status?: number; endpoint?: string; data?: unknown };

/**
 * Global React Query error hook (QueryCache/MutationCache `onError`). Screens already show the error to the
 * user; this decides what is worth an issue in Sentry:
 *  - 4xx (validation, 401 session expiry, 402 paywall, 404) are expected answers → ignored;
 *  - 5xx/proxy errors → one issue per endpoint + status (Railway outages the backend itself never sees);
 *  - offline/network failures → ignored (they stay as breadcrumbs);
 *  - anything else (parsing, a bug in `select`/`mutationFn`) → reported as a regular exception.
 */
export function reportRequestError(error: unknown, context: { kind: 'query' | 'mutation'; key?: unknown }) {
  if (!sentryEnabled || !(error instanceof Error)) return;
  const e = error as ApiLikeError;
  if (e.name === 'ApiError') {
    const status = e.status ?? 0;
    if (status < 500) return;
    const endpoint = e.endpoint ?? 'unknown';
    Sentry.captureException(error, {
      level: 'warning',
      fingerprint: ['api-error', endpoint, String(status)],
      tags: { 'api.endpoint': endpoint, 'api.status': String(status), 'request.kind': context.kind },
    });
    return;
  }
  if (e instanceof TypeError || /network request failed|connection was lost|offline/i.test(e.message)) return;
  Sentry.captureException(error, {
    tags: { 'request.kind': context.kind },
    extra: context.key !== undefined ? { queryKey: safeKey(context.key) } : undefined,
  });
}

/** Query keys can hold ids/objects; only the first (static) part names the query, e.g. `['workout', 12]` → `workout`. */
function safeKey(key: unknown) {
  return Array.isArray(key) ? String(key[0]) : String(key);
}

/**
 * Root-layout error boundary (`export const ErrorBoundary = …` in `_layout.tsx`): Expo Router's fallback screen with
 * "Try again", and the render error sent to Sentry with the route attached.
 */
export const MonitoredErrorBoundary = sentryEnabled
  ? Sentry.wrapExpoRouterErrorBoundary(RouteErrorBoundary)
  : RouteErrorBoundary;

/** Wraps the root component so Sentry can measure app start and catch render errors. */
export const withMonitoring = <P extends Record<string, unknown>>(component: ComponentType<P>) =>
  sentryEnabled ? Sentry.wrap(component) : component;
