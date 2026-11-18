/**
 * In-app subscriptions via RevenueCat (App Store / Google Play).
 *
 * Each platform is disabled until its public SDK key is set (RevenueCat dashboard → Project →
 * API keys): `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (`appl_…`) and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
 * (`goog_…`), or a shared `test_…` Test Store key while developing. While disabled
 * nothing is imported, configured or shown, so builds without the key behave as before.
 *
 * Identity: we log in with the FitGen user id, so the backend webhook
 * (`/api/webhooks/revenuecat`) can map purchases to `users.id`.
 */
import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

/** Entitlement identifier configured in RevenueCat. */
export const PREMIUM_ENTITLEMENT = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT ?? 'premium';

/**
 * RevenueCat "Test Store" keys (`test_…`) simulate purchases without a store account, but the SDK refuses
 * them in release builds (it can crash the app). They only count as configured in development builds.
 */
const isTestStoreKey = !!API_KEY?.startsWith('test_');

export const purchasesEnabled = !!API_KEY && (!isTestStoreKey || __DEV__);

let configured: Promise<typeof import('react-native-purchases').default> | null = null;

function sdk() {
  if (!purchasesEnabled) return Promise.reject(new Error('Compras indisponíveis neste build.'));
  configured ??= import('react-native-purchases').then(({ default: Purchases }) => {
    Purchases.configure({ apiKey: API_KEY! });
    return Purchases;
  });
  return configured;
}

/** Ties purchases to the FitGen account. Safe to call repeatedly. */
export async function identifyPurchaser(userId: string) {
  if (!purchasesEnabled) return;
  try {
    const Purchases = await sdk();
    if ((await Purchases.getAppUserID()) !== userId) await Purchases.logIn(userId);
  } catch (error) {
    console.warn('RevenueCat logIn failed', error);
  }
}

export async function resetPurchaser() {
  if (!purchasesEnabled || !configured) return;
  try {
    const Purchases = await sdk();
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
  } catch (error) {
    console.warn('RevenueCat logOut failed', error);
  }
}

export async function currentOffering(): Promise<PurchasesOffering | null> {
  const Purchases = await sdk();
  return (await Purchases.getOfferings()).current;
}

export const isPremium = (info: CustomerInfo) => !!info.entitlements.active[PREMIUM_ENTITLEMENT];

export async function customerInfo(): Promise<CustomerInfo> {
  return (await sdk()).getCustomerInfo();
}

/** Resolves with the new customer info, or `null` when the user cancelled the sheet. */
export async function purchase(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  const Purchases = await sdk();
  try {
    return (await Purchases.purchasePackage(pkg)).customerInfo;
  } catch (error) {
    if ((error as { userCancelled?: boolean }).userCancelled) return null;
    throw error;
  }
}

export async function restore(): Promise<CustomerInfo> {
  return (await sdk()).restorePurchases();
}
