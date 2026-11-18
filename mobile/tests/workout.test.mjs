import assert from 'node:assert/strict';
import test from 'node:test';

import { formatDayMonth, weeksSince } from '../src/lib/workout.ts';

test('missing or invalid plan dates do not crash formatting or produce NaN progress', () => {
  for (const value of [undefined, null, '', 'invalid-date']) {
    assert.equal(formatDayMonth(value), '-');
    assert.equal(weeksSince(value), null);
  }
  assert.equal(formatDayMonth(new Date(NaN)), '-');
});

test('valid plan dates retain Portuguese formatting', () => {
  const date = new Date(2026, 10, 16, 12);
  assert.equal(formatDayMonth(date), '16 Nov 2026');
  assert.equal(formatDayMonth(date, false), '16 Nov');
  assert.equal(formatDayMonth('2026-11-16T12:00:00'), '16 Nov 2026');
});

test('elapsed weeks are whole and never negative', () => {
  const now = Date.now();
  assert.equal(weeksSince(new Date(now - 24 * 864e5).toISOString()), 3);
  assert.equal(weeksSince(new Date(now + 7 * 864e5).toISOString()), 0);
});
