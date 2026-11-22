import assert from 'node:assert/strict';
import test from 'node:test';

import { profileWeek } from '../src/lib/profile-week.ts';

test('profile week uses local Monday through Sunday and only includes sessions already started', () => {
  const session = (id, day, extra = {}) => ({
    id, started_at: new Date(2026, 10, day, 9).toISOString(), duration_seconds: 900, ...extra,
  });
  const week = profileWeek([
    session('previous-week', 15, { outdoor_type: 'run', distance_meters: 1000 }),
    session('strength', 16, { distance_meters: 100 }),
    session('run', 18, { outdoor_type: 'run', distance_meters: 8400 }),
    session('future', 22, { outdoor_type: 'bike', distance_meters: 15000 }),
    { ...session('invalid', 19), started_at: 'invalid' },
  ], new Date(2026, 10, 21, 12));

  assert.equal(week.days[0].date.getDay(), 1);
  assert.equal(week.days[6].date.getDay(), 0);
  assert.deepEqual(week.days.filter(day => day.active).map(day => day.date.getDate()), [16, 18]);
  assert.deepEqual(week.sessions.map(session => session.id), ['run', 'strength']);
  assert.equal(week.seconds, 1800);
  assert.equal(week.outdoorMeters, 8400);
});
