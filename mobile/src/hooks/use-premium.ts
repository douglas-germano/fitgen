import { useAuth } from '@/providers/auth';
import { useProfile } from '@/hooks/queries';
import { openPremiumSheet, type PremiumFeature } from '@/lib/premium-sheet';

export type { PremiumFeature };

/**
 * Freemium state from `profile/me`. Older backends don't send `is_premium`: fall back to
 * `has_access` so nothing gets locked by mistake.
 */
export function usePremium() {
  const { status } = useAuth();
  const profile = useProfile(status === 'signedIn');
  const data = profile.data;
  const isPremium = data?.is_premium ?? data?.has_access ?? true;
  const locked = (feature: PremiumFeature) => !isPremium && (data?.premium_features ?? []).includes(feature);

  /**
   * Opens the purchase card and returns false when `feature` is locked; true when the user may go on.
   * Call it from a screen, not from inside another open sheet (iOS shows one modal at a time).
   */
  const requirePremium = (feature: PremiumFeature) => {
    if (!locked(feature)) return true;
    openPremiumSheet(feature);
    return false;
  };

  return { isPremium, locked, requirePremium, loading: profile.isLoading };
}
