/**
 * Apple Health (HealthKit) integration — iOS development/production builds only.
 *
 * The native module is loaded lazily: Expo Go, Android and web don't ship it, and importing it there would crash.
 * Every write is best-effort: a Health failure never breaks the FitGen action that triggered it.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { QuantityTypeIdentifier, SampleForSaving } from '@kingstinct/react-native-healthkit';
import { healthWindows, isFitGenSource, localDay, type ActivityDay } from './health-summary';

type HealthKit = typeof import('@kingstinct/react-native-healthkit');

const STORAGE_KEY = 'fitgen.health.enabled';
const ACCOUNT_KEY = 'fitgen.health.account';

/** Bind device health data to the account that connected it, never a later login. */
export const bindHealthAccount = (userId: string) => SecureStore.setItemAsync(ACCOUNT_KEY, userId);

export async function healthAccountMatches(userId: string): Promise<boolean> {
  const account = await SecureStore.getItemAsync(ACCOUNT_KEY);
  if (account) return account === userId;
  // Upgrade an existing connection once. Future account changes must reconnect.
  if (!(await isHealthEnabled())) return false;
  await bindHealthAccount(userId);
  return true;
}

const READ = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKQuantityTypeIdentifierLeanBodyMass',
  'HKQuantityTypeIdentifierWaistCircumference',
  'HKWorkoutTypeIdentifier',
] as const;

const SHARE = [
  'HKWorkoutTypeIdentifier',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierDietaryWater',
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
  'HKQuantityTypeIdentifierBodyMass',
  'HKQuantityTypeIdentifierBodyFatPercentage',
  'HKQuantityTypeIdentifierLeanBodyMass',
  'HKQuantityTypeIdentifierWaistCircumference',
] as const;

let cached: HealthKit | null | undefined;

function healthKit(): HealthKit | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== 'ios' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hk: HealthKit = require('@kingstinct/react-native-healthkit');
    if (hk.isHealthDataAvailable()) cached = hk;
  } catch {
    // Native module missing (build without it) — Health stays unavailable.
  }
  return cached;
}

/** Whether this build/device can talk to Apple Health at all. */
export const isHealthAvailable = () => healthKit() !== null;

/** Why Health is unavailable, for the settings row. */
export function healthUnavailableReason(): string {
  if (Platform.OS !== 'ios') return 'Disponível apenas no iPhone';
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'Requer o app instalado (não funciona no Expo Go)';
  return 'O app Saúde não está disponível neste aparelho';
}

let enabled: boolean | null = null;

/** The user turned the integration on in FitGen (permissions themselves live in iOS Settings > Health). */
export async function isHealthEnabled(): Promise<boolean> {
  if (!isHealthAvailable()) return false;
  if (enabled === null) {
    try {
      enabled = (await SecureStore.getItemAsync(STORAGE_KEY)) === '1';
    } catch {
      enabled = false;
    }
  }
  return enabled;
}

async function setEnabled(value: boolean) {
  enabled = value;
  try {
    if (value) await SecureStore.setItemAsync(STORAGE_KEY, '1');
    else await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // Keep the in-memory value for this session.
  }
}

/** Shows the iOS permission sheet and turns syncing on. Returns false when Health is unavailable. */
export async function connectHealth(): Promise<boolean> {
  const hk = healthKit();
  if (!hk) return false;
  await hk.requestAuthorization({ toRead: READ, toShare: SHARE });
  await setEnabled(true);
  return true;
}

/** Stops syncing. iOS doesn't let apps revoke their own permissions, the user does that in Settings > Health. */
export const disconnectHealth = () => setEnabled(false);

/** Runs `fn` only when Health is connected; swallows errors so FitGen flows never fail because of Health. */
async function whenEnabled<T>(fn: (hk: HealthKit) => Promise<T>): Promise<T | undefined> {
  const hk = healthKit();
  if (!hk || !(await isHealthEnabled())) return undefined;
  try {
    return await fn(hk);
  } catch (error) {
    if (__DEV__) console.warn('[health]', error);
    return undefined;
  }
}

const SOURCE = { HKWasUserEntered: true };

// ---------- Writes ----------

export function saveWaterToHealth(ml: number) {
  return whenEnabled(async (hk) => {
    const now = new Date();
    await hk.saveQuantitySample('HKQuantityTypeIdentifierDietaryWater', 'mL', ml, now, now, SOURCE);
  });
}

export type HealthMeal = { name?: string; calories: number; protein: number; carbs: number; fats: number };

export function saveMealToHealth(meal: HealthMeal) {
  return whenEnabled(async (hk) => {
    const now = new Date();
    const sample = (quantityType: QuantityTypeIdentifier, unit: string, quantity: number): SampleForSaving & { quantity: number } =>
      ({ quantityType, unit, quantity, startDate: now, endDate: now });
    const samples = [
      sample('HKQuantityTypeIdentifierDietaryEnergyConsumed', 'kcal', meal.calories),
      sample('HKQuantityTypeIdentifierDietaryProtein', 'g', meal.protein),
      sample('HKQuantityTypeIdentifierDietaryCarbohydrates', 'g', meal.carbs),
      sample('HKQuantityTypeIdentifierDietaryFatTotal', 'g', meal.fats),
    ].filter((s) => Number.isFinite(s.quantity) && s.quantity > 0);
    if (!samples.length) return;
    await hk.saveCorrelationSample('HKCorrelationTypeIdentifierFood', samples, now, now,
      meal.name ? { HKFoodType: meal.name } : undefined);
  });
}

export type HealthBody = {
  weight_kg?: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  waist_cm?: number;
};

export function saveBodyToHealth(entry: HealthBody) {
  return whenEnabled(async (hk) => {
    const now = new Date();
    const writes: Promise<unknown>[] = [];
    if (entry.weight_kg) writes.push(hk.saveQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg', entry.weight_kg, now, now));
    // HealthKit stores percentages as a fraction (0.18 = 18%).
    if (entry.body_fat_percentage) writes.push(hk.saveQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', '%', entry.body_fat_percentage / 100, now, now));
    if (entry.muscle_mass_kg) writes.push(hk.saveQuantitySample('HKQuantityTypeIdentifierLeanBodyMass', 'kg', entry.muscle_mass_kg, now, now));
    if (entry.waist_cm) writes.push(hk.saveQuantitySample('HKQuantityTypeIdentifierWaistCircumference', 'cm', entry.waist_cm, now, now));
    await Promise.all(writes);
  });
}

/** Saves a finished FitGen session as a strength-training workout. */
export function saveWorkoutToHealth({ durationSeconds, calories, name }: { durationSeconds: number; calories: number; name?: string }) {
  return whenEnabled(async (hk) => {
    const end = new Date();
    const start = new Date(end.getTime() - Math.max(60, durationSeconds) * 1000);
    await hk.saveWorkoutSample(
      hk.WorkoutActivityType.traditionalStrengthTraining,
      [],
      start,
      end,
      calories > 0 ? { energyBurned: calories } : undefined,
      name ? { HKWorkoutBrandName: 'FitGen', FitGenWorkout: name } : { HKWorkoutBrandName: 'FitGen' },
    );
  });
}

// ---------- Reads ----------

export type HealthActivity = { steps: number; activeKcal: number; distanceKm: number };

/** Today's steps, active energy and walking/running distance. */
export function readTodayActivity() {
  return whenEnabled<HealthActivity>(async (hk) => {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const filter = { date: { startDate, endDate: new Date() } };
    const [steps, energy, distance] = await Promise.all([
      hk.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], { filter, unit: 'count' }),
      hk.queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], { filter, unit: 'kcal' }),
      hk.queryStatisticsForQuantity('HKQuantityTypeIdentifierDistanceWalkingRunning', ['cumulativeSum'], { filter, unit: 'km' }),
    ]);
    return {
      steps: Math.round(steps.sumQuantity?.quantity ?? 0),
      activeKcal: Math.round(energy.sumQuantity?.quantity ?? 0),
      distanceKm: distance.sumQuantity?.quantity ?? 0,
    };
  });
}

export type HealthBodyReading = HealthBody & { date?: Date };

/** Most recent body measurements in Health, to import into FitGen. */
export function readLatestBody() {
  return whenEnabled<HealthBodyReading>(async (hk) => {
    const [weight, fat, lean, waist] = await Promise.all([
      hk.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg'),
      hk.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', '%'),
      hk.getMostRecentQuantitySample('HKQuantityTypeIdentifierLeanBodyMass', 'kg'),
      hk.getMostRecentQuantitySample('HKQuantityTypeIdentifierWaistCircumference', 'cm'),
    ]);
    const round = (v?: number, digits = 1) => (v === undefined ? undefined : Number(v.toFixed(digits)));
    return {
      weight_kg: round(weight?.quantity),
      body_fat_percentage: round(fat ? fat.quantity * 100 : undefined),
      muscle_mass_kg: round(lean?.quantity),
      waist_cm: round(waist?.quantity),
      date: weight?.endDate,
    };
  });
}

export type HealthImportSample = {
  sample_id: string; kind: 'workout' | 'weight'; source: string; started_at: string;
  ended_at?: string; duration_seconds?: number; workout_name?: string; calories?: number; weight_kg?: number;
};

/** Errors propagate to the sync status; a failed read is never reported as a successful sync. */
export async function readHealthImports(): Promise<HealthImportSample[]> {
  const hk = healthKit();
  if (!hk || !(await isHealthEnabled())) return [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  const filter = { date: { startDate, endDate: new Date() } };
  const [workouts, weights] = await Promise.all([
    hk.queryWorkoutSamples({ filter, limit: 0, ascending: true }),
    hk.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', { filter, limit: 0, unit: 'kg', ascending: true }),
  ]);
  const names: Record<number, string> = {
    [hk.WorkoutActivityType.running]: 'Corrida', [hk.WorkoutActivityType.walking]: 'Caminhada',
    [hk.WorkoutActivityType.cycling]: 'Ciclismo', [hk.WorkoutActivityType.swimming]: 'Natação',
    [hk.WorkoutActivityType.traditionalStrengthTraining]: 'Musculação',
    [hk.WorkoutActivityType.functionalStrengthTraining]: 'Treino funcional',
    [hk.WorkoutActivityType.yoga]: 'Yoga', [hk.WorkoutActivityType.highIntensityIntervalTraining]: 'Treino intervalado',
  };
  const samples: HealthImportSample[] = weights.filter(w => !isFitGenSource(w.sourceRevision.source.bundleIdentifier, w.metadata) && w.quantity > 0)
    .map(w => ({ sample_id: w.uuid, kind: 'weight', source: w.sourceRevision.source.name,
      started_at: w.startDate.toISOString(), weight_kg: w.quantity }));
  for (const w of workouts) {
    if (isFitGenSource(w.sourceRevision.source.bundleIdentifier, w.metadata) || w.duration.quantity <= 0) continue;
    const energy = await w.getStatistic('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal');
    samples.push({ sample_id: w.uuid, kind: 'workout', source: w.sourceRevision.source.name,
      started_at: w.startDate.toISOString(), ended_at: w.endDate.toISOString(),
      duration_seconds: w.duration.quantity, workout_name: names[w.workoutActivityType] ?? 'Treino do Apple Saúde',
      calories: energy?.sumQuantity?.quantity ?? 0 });
  }
  return samples;
}

export async function readHealthFortnight(): Promise<ActivityDay[]> {
  const hk = healthKit();
  if (!hk || !(await isHealthEnabled())) return [];
  const { previous, end } = healthWindows();
  const stats = await hk.queryStatisticsCollectionForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], previous,
    { day: 1 }, { filter: { date: { startDate: previous, endDate: end } }, unit: 'count' });
  return stats.filter(s => s.startDate).map(s => ({ date: localDay(s.startDate!), steps: s.sumQuantity?.quantity ?? null }));
}
