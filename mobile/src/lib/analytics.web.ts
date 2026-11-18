/** The web build (PWA) ships without crash reporting or analytics; same API as analytics.ts, all no-ops. */
import type { ComponentType } from 'react';

import type { AnalyticsEvent } from './analytics';

type Props = Record<string, string | number | boolean | null>;

export const sentryEnabled = false;
export const analyticsEnabled = false;
export type { AnalyticsEvent };

export function track(_event: AnalyticsEvent, _properties?: Props) {}
export function trackScreen(_name: string) {}
export function identifyUser(_userId: string, _traits?: Props) {}
export function resetUser() {}
export function captureError(_error: unknown, _context?: Props) {}
export const withMonitoring = <P extends Record<string, unknown>>(component: ComponentType<P>) => component;
