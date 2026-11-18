import { useSyncExternalStore } from 'react';

import { lastFeedbackClosedAt } from '@/lib/feedback';

/** iOS presents one modal at a time; give a just-closed alert/menu time to leave the screen. */
const MODAL_SETTLE_MS = 400;

export type PremiumFeature = 'coach' | 'diet_plan' | 'meal_estimate' | 'workout_plan';

type State = { open: boolean; feature: PremiumFeature | null };

let state: State = { open: false, feature: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/**
 * Opens the purchase card (bottom sheet) from anywhere: screens, hooks or the API layer.
 * The sheet itself is rendered once by `PremiumSheetHost` in the root layout.
 * iOS can't present two modals at once: call this only after any open sheet is dismissed.
 */
export function openPremiumSheet(feature?: string | null) {
  const show = () => {
    state = { open: true, feature: (feature as PremiumFeature) ?? null };
    emit();
  };
  const wait = MODAL_SETTLE_MS - (Date.now() - lastFeedbackClosedAt());
  if (wait > 0) setTimeout(show, wait);
  else show();
}

export function closePremiumSheet() {
  if (!state.open) return;
  state = { ...state, open: false };
  emit();
}

export function usePremiumSheetState() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => state,
    () => state,
  );
}
