import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as summary from '../src/lib/health-summary.ts';

function setup({ sdk = 3, granted = [{ accessType: 'read', recordType: 'Weight' }] } = {}) {
  const inserted = [];
  const opened = [];
  const hc = {
    SdkAvailabilityStatus: { SDK_UNAVAILABLE: 1, SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2, SDK_AVAILABLE: 3 },
    ExerciseType: { RUNNING: 56, WALKING: 79, BIKING: 8, SWIMMING_POOL: 74, SWIMMING_OPEN_WATER: 73, STRENGTH_TRAINING: 70, CALISTHENICS: 13, YOGA: 83, HIGH_INTENSITY_INTERVAL_TRAINING: 36 },
    MealType: { UNKNOWN: 0 },
    getSdkStatus: async () => sdk,
    initialize: async () => true,
    requestPermission: async (p) => p,
    getGrantedPermissions: async () => granted,
    insertRecords: async (r) => { inserted.push(...r); return ['id']; },
    readRecords: async (type) => ({ records: type === 'Weight'
      ? [{ time: '2026-11-01T10:00:00Z', weight: { inKilograms: 79.8 }, metadata: { id: 'w1', dataOrigin: 'scale.app' } },
         { time: '2026-11-02T10:00:00Z', weight: { inKilograms: 80 }, metadata: { id: 'w2', dataOrigin: 'com.douglas.fitgen' } }]
      : type === 'ExerciseSession'
        ? [{ startTime: '2026-11-01T10:00:00Z', endTime: '2026-11-01T10:30:00Z', exerciseType: 56, metadata: { id: 's1', dataOrigin: 'watch.app' } },
           { startTime: '2026-11-01T11:00:00Z', endTime: '2026-11-01T11:30:00Z', exerciseType: 70, metadata: { id: 's2', dataOrigin: 'com.douglas.fitgen' } }]
        : [] }),
    aggregateRecord: async () => ({ ACTIVE_CALORIES_TOTAL: { inKilocalories: 123 } }),
    aggregateGroupByPeriod: async () => [{ startTime: '2026-11-12T00:00', endTime: '2026-11-13T00:00', result: { COUNT_TOTAL: 4200 } }],
  };
  const exports = {};
  const require = (id) => ({ 'react-native': { Linking: { openURL: async (u) => { opened.push(u); } } },
    'react-native-health-connect': hc, './health-summary': summary }[id]);
  const code = ts.transpileModule(fs.readFileSync(new URL('../src/lib/health-connect.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { require, exports, Date, Promise, Number, Math, Error });
  return { exports, inserted, opened };
}

test('imports keep original dates, ids, duration and calories, and exclude FitGen own records', async () => {
  const { exports } = setup();
  const rows = await exports.readImports();
  assert.equal(rows.length, 2);
  assert.equal(rows.map((r) => r.sample_id).join(), 'w1,s1');
  assert.equal(rows[0].kind, 'weight');
  assert.equal(rows[0].weight_kg, 79.8);
  assert.equal(rows[1].workout_name, 'Corrida');
  assert.equal(rows[1].duration_seconds, 1800);
  assert.equal(rows[1].calories, 123);
  assert.equal(rows[1].source, 'watch.app');
});

test('a sync with no read permission fails instead of reporting an empty import', async () => {
  const { exports } = setup({ granted: [] });
  await assert.rejects(exports.readImports(), /Permita a leitura/);
});

test('missing Health Connect sends the user to the Play Store', async () => {
  const { exports, opened } = setup({ sdk: 1 });
  await assert.rejects(exports.connect(), /Instale o Health Connect/);
  assert.match(opened[0], /com\.google\.android\.apps\.healthdata/);
});

test('step days come back as local calendar dates', async () => {
  const { exports } = setup();
  assert.deepEqual(JSON.parse(JSON.stringify(await exports.readFortnight())), [{ date: '2026-11-12', steps: 4200 }]);
});

test('workouts are written as strength sessions with active energy; waist is skipped', async () => {
  const { exports, inserted } = setup();
  await exports.saveWorkout({ durationSeconds: 1800, calories: 200, name: 'Peito' });
  await exports.saveBody({ waist_cm: 80 });
  assert.equal(inserted.map((r) => r.recordType).join(), 'ExerciseSession,ActiveCaloriesBurned');
  assert.equal(inserted[0].exerciseType, 70);
});
