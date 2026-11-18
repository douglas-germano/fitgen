import assert from 'node:assert/strict';
import test from 'node:test';
import { healthWindows, localDay, weeklySummary, isFitGenSource } from '../src/lib/health-summary.ts';

test('weekly windows use local calendar dates including today, even across month boundaries', () => {
  const now = new Date(2026, 10, 3, 12);
  const { start, previous, end } = healthWindows(now);
  assert.equal(localDay(start), '2026-10-28');
  assert.equal(localDay(previous), '2026-10-21');
  assert.equal(end.getTime(), now.getTime());
  assert.equal(start.getHours(), 0);
});

test('summary excludes future/outside data, deduplicates IDs and handles missing readings', () => {
  const now = new Date(2026, 10, 17, 12);
  const session = {id:'a',started_at:new Date(2026,10,11).toISOString(),duration_seconds:1800};
  const result = weeklySummary([session, session, {id:'b',started_at:new Date(2026,10,10).toISOString(),duration_seconds:3600},
    {id:'future',started_at:new Date(2026,10,18).toISOString(),duration_seconds:99}],
    [{date:new Date(2026,10,10).toISOString(),value:81},{date:new Date(2026,10,12).toISOString(),value:80}],
    [{date:'2026-11-11',steps:5000},{date:'2026-11-12',steps:null},{date:'2026-11-10',steps:3000}],now);
  assert.equal(result.current.workouts,1);
  assert.equal(result.previous.workouts,1);
  assert.equal(result.current.minutes,30);
  assert.equal(result.previous.minutes,60);
  assert.equal(result.current.steps,5000);
  assert.equal(result.current.coverage,1);
  assert.equal(result.current.weight,80);
  assert.equal(result.previous.weight,81);
  assert.equal(weeklySummary([],[],[],now).current.weight,null);
  assert.equal(weeklySummary([],[],[],now).current.steps,null);
});

test('own samples cannot loop back as imports, external samples remain eligible', () => {
  assert.equal(isFitGenSource('com.douglas.fitgen'),true);
  assert.equal(isFitGenSource('other', {HKWorkoutBrandName:'FitGen'}),true);
  assert.equal(isFitGenSource('com.apple.health'),false);
});
