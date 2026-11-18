import { useEffect } from 'react';

import { identifyPurchaser, purchasesEnabled, resetPurchaser } from '@/lib/purchases';

/** Keeps the RevenueCat identity in sync with the signed-in FitGen user. */
export function usePurchasesIdentity(userId: string | undefined, signedIn: boolean) {
  useEffect(() => {
    if (!purchasesEnabled) return;
    if (signedIn && userId) void identifyPurchaser(userId);
    if (!signedIn) void resetPurchaser();
  }, [signedIn, userId]);
}
