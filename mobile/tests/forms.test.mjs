import assert from 'node:assert/strict';
import test from 'node:test';
import { decimal, passwordError, validEmail } from '../src/lib/forms.ts';
import { normalizeNutrition, normalizeSessions, normalizeWorkout } from '../src/lib/normalize.ts';

test('decimal keyboard values reject negatives, partial numbers and non-finite values', () => {
  assert.equal(decimal('82,4'), 82.4);
  assert.equal(decimal('0'), 0);
  for (const value of ['', '5abc', '-2', 'Infinity', '1,2,3']) assert.equal(decimal(value), undefined);
});

test('password and email validation match account requirements', () => {
  assert.equal(passwordError('ValidPass1'), '');
  for (const value of ['short', 'longpassword', 'UPPERCASE1', 'lowercase1']) assert.ok(passwordError(value));
  assert.ok(validEmail(' user@example.com '));
  assert.equal(validEmail('invalid-email'), false);
});

test('legacy workout payloads normalize missing lists and numeric repetitions', () => {
  const normalized = normalizeWorkout({ id: '1', days: [{ id: '2', exercises: [{ sets: null, reps: 12, rest_seconds: null }], muscle_groups: null }] });
  assert.equal(normalized.days[0].exercises[0].reps, '12');
  assert.equal(normalized.days[0].exercises[0].sets, 0);
  assert.deepEqual(normalized.days[0].muscle_groups, []);
  assert.deepEqual(normalizeWorkout({ id: '1', days: null }).days, []);
});

test('nutrition and history payloads do not leak NaN into UI', () => {
  assert.equal(normalizeNutrition({ meals: [{ calories: null, fats: null, protein: '12', carbs: 20 }] }).meals[0].protein, 12);
  const sessions = normalizeSessions([{ started_at: 'invalid' }, { started_at: '2026-11-16T12:00:00', duration_seconds: null, calories: null }]);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].duration_seconds, 0);
});
