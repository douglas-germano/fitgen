import { router } from 'expo-router';
import { useAuth } from '@/providers/auth';
import { useProfile } from '@/hooks/queries';

export type PremiumFeature = 'coach' | 'diet_plan' | 'meal_estimate' | 'workout_plan';

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

  /** Opens the paywall and returns false when `feature` is locked; true when the user may go on. */
  const requirePremium = (feature: PremiumFeature) => {
    if (!locked(feature)) return true;
    router.push('/paywall');
    return false;
  };

  return { isPremium, locked, requirePremium, loading: profile.isLoading };
}
