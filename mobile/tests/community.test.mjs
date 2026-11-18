import assert from 'node:assert/strict';
import test from 'node:test';

import { challengeWhen, daysLeft, describeActivity, normalizeCode, reactionEmoji, timeAgo } from '../src/lib/community.ts';

const user = { id: 'u', name: 'Ana Souza', profile_picture: null, level: 2 };

test('feed headlines read naturally and never show undefined/NaN', () => {
  const workout = describeActivity({ type: 'workout_completed', user, payload: { workout_name: 'Treino A', duration_seconds: 2700, calories: 310 } });
  assert.equal(workout.title, 'Ana concluiu Treino A');
  assert.equal(workout.detail, '45 min · 310 kcal');
  assert.equal(describeActivity({ type: 'workout_completed', user, payload: {} }).detail, undefined);
  assert.equal(describeActivity({ type: 'streak', user, payload: { days: 7, category: 'workout' } }).title, 'Ana chegou a 7 dias seguidos de treino');
  for (const type of ['workout_completed', 'streak', 'achievement', 'hydration_goal', 'challenge_completed', 'group_joined', 'post', 'unknown']) {
    const d = describeActivity({ type, user, payload: {} });
    assert.ok(!/undefined|NaN/.test(`${d.title} ${d.detail ?? ''}`), type);
  }
});

test('relative times', () => {
  const now = Date.parse('2026-11-17T12:00:00Z');
  assert.equal(timeAgo('2026-11-17T11:59:30Z', now), 'agora');
  assert.equal(timeAgo('2026-11-17T11:15:00Z', now), '45 min');
  assert.equal(timeAgo('2026-11-17T09:00:00Z', now), '3 h');
  assert.equal(timeAgo('2026-11-16T09:00:00Z', now), 'ontem');
  assert.equal(timeAgo('invalid', now), '');
});

test('challenge countdown', () => {
  const today = new Date(2026, 10, 17);
  assert.equal(daysLeft('2026-11-17', today), 1);
  assert.equal(challengeWhen({ status: 'active', start_date: '2026-11-10', end_date: '2026-11-23' }, today), '7 dias restantes');
  assert.equal(challengeWhen({ status: 'active', start_date: '2026-11-10', end_date: '2026-11-17' }, today), 'Último dia');
  assert.equal(challengeWhen({ status: 'upcoming', start_date: '2026-11-18', end_date: '2026-11-30' }, today), 'Começa amanhã');
  assert.equal(challengeWhen({ status: 'ended', start_date: '2026-11-01', end_date: '2026-11-10' }, today), 'Encerrado');
});

test('invite codes are normalized from pasted text', () => {
  assert.equal(normalizeCode(' ab-cd 23ef '), 'ABCD23EF');
  assert.equal(reactionEmoji(null), '🔥');
  assert.equal(reactionEmoji('clap'), '👏');
});

test('notification links allow only known targets and valid identifiers', async () => {
  const { communityNotificationPath } = await import('../src/lib/community.ts');
  const id = '12345678-1234-1234-1234-123456789abc';
  assert.equal(communityNotificationPath('community_group', id), `/community/group/${id}`);
  assert.equal(communityNotificationPath('community_friends', 'anything'), '/notifications');
  assert.equal(communityNotificationPath('community_activity', '../../private'), null);
  assert.equal(communityNotificationPath('unknown', id), null);
  assert.equal(communityNotificationPath('community_follow_request', id), '/notifications');
});

test('post photos are always 4:5 or 9:16, defaulting to 4:5', async () => {
  const { imageAspect, IMAGE_RATIOS } = await import('../src/lib/community.ts');
  assert.deepEqual(IMAGE_RATIOS.map((r) => r.value), ['4:5', '9:16']);
  assert.equal(imageAspect('4:5'), 4 / 5);
  assert.equal(imageAspect('9:16'), 9 / 16);
  for (const bad of [undefined, null, '', '1:1', 3]) assert.equal(imageAspect(bad), 4 / 5);
});

test('feed crop is the largest centred rectangle in the chosen format', async () => {
  const { centerCropRect, imageAspect, FEED_MAX_WIDTH, FEED_JPEG_QUALITY } = await import('../src/lib/community.ts');
  assert.equal(FEED_MAX_WIDTH, 1080);
  assert.equal(FEED_JPEG_QUALITY, 0.8);
  // landscape 4000x3000 -> 4:5 keeps full height, trims the sides evenly
  assert.deepEqual(centerCropRect(4000, 3000, imageAspect('4:5')), { originX: 800, originY: 0, width: 2400, height: 3000 });
  // 3000x4000 (0.75) is wider than 9:16 (0.5625): keeps full height, trims the sides
  assert.deepEqual(centerCropRect(3000, 4000, imageAspect('9:16')), { originX: 375, originY: 0, width: 2250, height: 4000 });
  // a very tall photo is trimmed top and bottom instead
  assert.deepEqual(centerCropRect(1000, 3000, imageAspect('4:5')), { originX: 0, originY: 875, width: 1000, height: 1250 });
  // already in format: untouched
  assert.deepEqual(centerCropRect(800, 1000, 4 / 5), { originX: 0, originY: 0, width: 800, height: 1000 });
  for (const [w, h] of [[1001, 777], [333, 1999], [4032, 3024], [1080, 1920]]) for (const r of ['4:5', '9:16']) {
    const c = centerCropRect(w, h, imageAspect(r));
    assert.ok(c.originX >= 0 && c.originY >= 0 && c.originX + c.width <= w && c.originY + c.height <= h, `${w}x${h} ${r} stays inside`);
    assert.ok(Math.abs(c.width / c.height - imageAspect(r)) < 0.01, `${w}x${h} ${r} ratio`);
  }
  assert.equal(centerCropRect(0, 100, 0.8), null);
});
