/**
 * Android counterpart of the Apple Health integration: Health Connect (Android 14+ built in, Android 9–13 via the
 * "Health Connect" Play Store app). `health.ts` delegates here on Android, so every caller keeps one API.
 */
import { Linking } from 'react-native';
import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  insertRecords,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  ExerciseType,
  MealType,
  aggregateGroupByPeriod,
} from 'react-native-health-connect';
import type { Permission, RecordType } from 'react-native-health-connect';

import { healthWindows, localDay, type ActivityDay } from './health-summary';
import type { HealthActivity, HealthBody, HealthBodyReading, HealthImportSample, HealthMeal } from './health';

export const OWN_PACKAGE = 'com.douglas.fitgen';
const PLAY_STORE = 'market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding';

const read = (...types: RecordType[]): Permission[] => types.map((recordType) => ({ accessType: 'read', recordType }));
const write = (...types: RecordType[]): Permission[] => types.map((recordType) => ({ accessType: 'write', recordType }));

const READ = read('Steps', 'ActiveCaloriesBurned', 'Distance', 'Weight', 'BodyFat', 'LeanBodyMass', 'ExerciseSession');
const WRITE = write('ExerciseSession', 'ActiveCaloriesBurned', 'Hydration', 'Nutrition', 'Weight', 'BodyFat', 'LeanBodyMass');

/** Health Connect isn't there (Android 9–13 without the app) or needs an update: send the user to the Play Store. */
async function ensureSdk() {
  const status = await getSdkStatus();
  if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return;
  void Linking.openURL(PLAY_STORE).catch(() => undefined);
  throw new Error(
    status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
      ? 'Atualize o Health Connect na Play Store e tente de novo.'
      : 'Instale o Health Connect na Play Store e tente de novo.',
  );
}

let ready: Promise<boolean> | null = null;
const init = () => (ready ??= initialize().catch((error) => { ready = null; throw error; }));

/** Shows the Health Connect permission sheet. Returns false when the user granted nothing. */
export async function connect(): Promise<boolean> {
  await ensureSdk();
  await init();
  const granted = await requestPermission([...READ, ...WRITE]);
  // Lets the first sync reach back 90 days instead of Health Connect's default 30. Optional on older versions.
  await requestPermission([{ accessType: 'read', recordType: 'ReadHealthDataHistory' }]).catch(() => undefined);
  return granted.length > 0;
}

/** The permissions the user can revoke any time in Health Connect: a sync with none granted is a failure, not "empty". */
async function granted(type: RecordType, access: 'read' | 'write' = 'read') {
  const all = await getGrantedPermissions();
  return all.some((p) => p.recordType === type && p.accessType === access);
}

const iso = (date: Date) => date.toISOString();
const between = (startTime: Date, endTime: Date) => ({ operator: 'between' as const, startTime: iso(startTime), endTime: iso(endTime) });
const manual = { recordingMethod: 3 };
const fromOthers = (record: { metadata?: { dataOrigin?: string } }) => record.metadata?.dataOrigin !== OWN_PACKAGE;

async function readAll<T extends RecordType>(recordType: T, start: Date, end: Date, ascendingOrder = true) {
  const records: Awaited<ReturnType<typeof readRecords<T>>>['records'] = [];
  let pageToken: string | undefined;
  do {
    const page = await readRecords(recordType, { timeRangeFilter: between(start, end), ascendingOrder, pageSize: 1000, pageToken });
    records.push(...page.records);
    pageToken = page.pageToken || undefined;
  } while (pageToken);
  return records;
}

// ---------- Writes ----------

export async function saveWater(ml: number) {
  await init();
  const end = new Date();
  const start = new Date(end.getTime() - 1000);
  await insertRecords([{ recordType: 'Hydration', startTime: iso(start), endTime: iso(end), volume: { unit: 'milliliters', value: ml }, metadata: manual }]);
}

export async function saveMeal(meal: HealthMeal) {
  await init();
  const end = new Date();
  const start = new Date(end.getTime() - 1000);
  await insertRecords([{
    recordType: 'Nutrition', startTime: iso(start), endTime: iso(end), name: meal.name, mealType: MealType.UNKNOWN,
    energy: { unit: 'kilocalories', value: meal.calories },
    protein: { unit: 'grams', value: meal.protein },
    totalCarbohydrate: { unit: 'grams', value: meal.carbs },
    totalFat: { unit: 'grams', value: meal.fats },
    metadata: manual,
  }]);
}

export async function saveBody(entry: HealthBody) {
  await init();
  const time = iso(new Date());
  // Health Connect keeps one record type per insert call.
  if (entry.weight_kg) await insertRecords([{ recordType: 'Weight', time, weight: { unit: 'kilograms', value: entry.weight_kg }, metadata: manual }]);
  if (entry.body_fat_percentage) await insertRecords([{ recordType: 'BodyFat', time, percentage: entry.body_fat_percentage, metadata: manual }]);
  if (entry.muscle_mass_kg) await insertRecords([{ recordType: 'LeanBodyMass', time, mass: { unit: 'kilograms', value: entry.muscle_mass_kg }, metadata: manual }]);
  // Health Connect has no waist circumference record.
}

export async function saveWorkout({ durationSeconds, calories, name }: { durationSeconds: number; calories: number; name?: string }) {
  await init();
  const end = new Date();
  const start = new Date(end.getTime() - Math.max(60, durationSeconds) * 1000);
  await insertRecords([{
    recordType: 'ExerciseSession', startTime: iso(start), endTime: iso(end),
    exerciseType: ExerciseType.STRENGTH_TRAINING, title: name ?? 'Treino FitGen', metadata: { recordingMethod: 1 },
  }]);
  if (calories > 0) {
    await insertRecords([{
      recordType: 'ActiveCaloriesBurned', startTime: iso(start), endTime: iso(end),
      energy: { unit: 'kilocalories', value: calories }, metadata: { recordingMethod: 1 },
    }]);
  }
}

// ---------- Reads ----------

export async function readToday(): Promise<HealthActivity> {
  await init();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const timeRangeFilter = between(start, new Date());
  const [steps, energy, distance] = await Promise.all([
    aggregateRecord({ recordType: 'Steps', timeRangeFilter }),
    aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter }),
    aggregateRecord({ recordType: 'Distance', timeRangeFilter }),
  ]);
  return {
    steps: Math.round(steps.COUNT_TOTAL ?? 0),
    activeKcal: Math.round(energy.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0),
    distanceKm: distance.DISTANCE?.inKilometers ?? 0,
  };
}

export async function readLatestBodyReading(): Promise<HealthBodyReading> {
  await init();
  const end = new Date();
  const start = new Date(end.getTime() - 365 * 24 * 3600 * 1000);
  const latest = async <T extends 'Weight' | 'BodyFat' | 'LeanBodyMass'>(type: T) =>
    (await readRecords(type, { timeRangeFilter: between(start, end), ascendingOrder: false, pageSize: 1 })).records[0];
  const [weight, fat, lean] = await Promise.all([latest('Weight'), latest('BodyFat'), latest('LeanBodyMass')]);
  const round = (v?: number) => (v === undefined ? undefined : Number(v.toFixed(1)));
  return {
    weight_kg: round(weight?.weight.inKilograms ?? undefined),
    body_fat_percentage: round(fat?.percentage),
    muscle_mass_kg: round(lean?.mass.inKilograms ?? undefined),
    date: weight ? new Date(weight.time) : undefined,
  };
}

const EXERCISE_NAMES: Record<number, string> = {
  [ExerciseType.RUNNING]: 'Corrida', [ExerciseType.WALKING]: 'Caminhada', [ExerciseType.BIKING]: 'Ciclismo',
  [ExerciseType.SWIMMING_POOL]: 'Natação', [ExerciseType.SWIMMING_OPEN_WATER]: 'Natação',
  [ExerciseType.STRENGTH_TRAINING]: 'Musculação', [ExerciseType.CALISTHENICS]: 'Treino funcional',
  [ExerciseType.YOGA]: 'Yoga', [ExerciseType.HIGH_INTENSITY_INTERVAL_TRAINING]: 'Treino intervalado',
};

/** Errors propagate to the sync status; a failed read is never reported as a successful sync. */
export async function readImports(): Promise<HealthImportSample[]> {
  await init();
  if (!(await granted('ExerciseSession')) && !(await granted('Weight'))) {
    throw new Error('Permita a leitura de treinos e peso no Health Connect.');
  }
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 90);
  const [sessions, weights] = await Promise.all([readAll('ExerciseSession', start, end), readAll('Weight', start, end)]);

  const samples: HealthImportSample[] = weights
    .filter((w) => fromOthers(w) && w.weight.inKilograms > 0 && w.metadata?.id)
    .map((w) => ({
      sample_id: w.metadata!.id!, kind: 'weight' as const, source: w.metadata?.dataOrigin ?? 'Health Connect',
      started_at: w.time, weight_kg: w.weight.inKilograms,
    }));

  for (const s of sessions) {
    const duration = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000;
    if (!fromOthers(s) || !s.metadata?.id || duration <= 0) continue;
    const energy = await aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: { operator: 'between', startTime: s.startTime, endTime: s.endTime } })
      .catch(() => undefined);
    samples.push({
      sample_id: s.metadata.id, kind: 'workout', source: s.metadata.dataOrigin ?? 'Health Connect',
      started_at: s.startTime, ended_at: s.endTime, duration_seconds: duration,
      workout_name: s.title || EXERCISE_NAMES[s.exerciseType] || 'Treino do Health Connect',
      calories: energy?.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0,
    });
  }
  return samples;
}

export async function readFortnight(): Promise<ActivityDay[]> {
  await init();
  const { previous, end } = healthWindows();
  const days = await aggregateGroupByPeriod({
    recordType: 'Steps', timeRangeFilter: between(previous, end), timeRangeSlicer: { period: 'DAYS', length: 1 },
  });
  // Group starts come back as local date-times ("2026-11-12T00:00"), already in the device's calendar.
  return days.map((d) => ({ date: d.startTime.slice(0, 10) || localDay(new Date(d.startTime)), steps: d.result.COUNT_TOTAL ?? 0 }));
}
