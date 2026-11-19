import type { LocationObject } from 'expo-location';

import { estimatedCalories, metersBetween, outdoorName, type OutdoorRoute, type OutdoorType, type RoutePoint } from './outdoor';
import { outdoorStorage } from './outdoor-storage';

export type OutdoorDraft = {
  id: string;
  owner: string;
  type: OutdoorType;
  weight?: number | null;
  started: number;
  runningSince: number | null;
  activeMs: number;
  lastFix: number | null;
  lastPointAt: number | null;
  background: boolean;
  route: OutdoorRoute;
  meters: number;
};

export type OutdoorRecord = {
  id: string;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  workout_name: string;
  outdoor_type: OutdoorType;
  distance_meters: number;
  calories: number | null;
  route: OutdoorRoute;
};

const activeKey = 'outdoor.active';
const draftKey = (owner: string) => `outdoor.draft.${owner}`;
const pendingKey = (owner: string) => `outdoor.pending.${owner}`;

let cachedDraft: { key: string; raw: string | null; value: OutdoorDraft | null } | undefined;

export function readDraft(owner: string): OutdoorDraft | null {
  const key = draftKey(owner);
  const raw = outdoorStorage.getItemSync(key);
  if (cachedDraft?.key === key && cachedDraft.raw === raw) return cachedDraft.value;
  const value: OutdoorDraft | null = raw ? JSON.parse(raw) : null;
  cachedDraft = { key, raw, value };
  return value;
}

export function writeDraft(draft: OutdoorDraft) {
  const key = draftKey(draft.owner);
  const raw = JSON.stringify(draft);
  outdoorStorage.setItemSync(key, raw);
  cachedDraft = { key, raw, value: draft };
  if (draft.runningSince !== null) outdoorStorage.setItemSync(activeKey, draft.owner);
  else if (outdoorStorage.getItemSync(activeKey) === draft.owner) outdoorStorage.removeItemSync(activeKey);
}

export function readPending(owner: string): OutdoorRecord[] {
  const raw = outdoorStorage.getItemSync(pendingKey(owner));
  return raw ? JSON.parse(raw) : [];
}

export function clearPending(owner: string, id: string) {
  const records = readPending(owner).filter((record) => record.id !== id);
  if (records.length) outdoorStorage.setItemSync(pendingKey(owner), JSON.stringify(records));
  else outdoorStorage.removeItemSync(pendingKey(owner));
}

export function removeDraft(owner: string) {
  outdoorStorage.removeItemSync(draftKey(owner));
  if (outdoorStorage.getItemSync(activeKey) === owner) outdoorStorage.removeItemSync(activeKey);
}

export function durationSeconds(draft: OutdoorDraft, now: number) {
  const current = draft.runningSince === null ? 0 : Math.max(0, now - draft.runningSince);
  return Math.min(86400, Math.floor((draft.activeMs + current) / 1000));
}

export function pauseDraft(draft: OutdoorDraft, now: number) {
  if (draft.runningSince === null) return draft;
  const activeMs = Math.min(86_400_000, draft.activeMs + Math.max(0, now - draft.runningSince));
  const paused = { ...draft, activeMs, runningSince: null, lastPointAt: null };
  writeDraft(paused);
  return paused;
}

export function recoverOutdoorDraft() {
  const owner = outdoorStorage.getItemSync(activeKey);
  if (!owner) return false;
  const draft = readDraft(owner);
  if (draft?.runningSince != null) pauseDraft(draft, Math.max(draft.runningSince, draft.lastFix ?? 0));
  else outdoorStorage.removeItemSync(activeKey);
  return true;
}

export function finishDraft(draft: OutdoorDraft, now: number): OutdoorRecord {
  const record = {
    id: draft.id,
    outdoor_type: draft.type,
    workout_name: outdoorName(draft.type),
    started_at: new Date(draft.started).toISOString(),
    completed_at: new Date(now).toISOString(),
    duration_seconds: durationSeconds(draft, now),
    distance_meters: Math.round(draft.meters * 10) / 10,
    calories: estimatedCalories(draft.type, draft.meters, draft.weight),
    route: draft.route,
  };
  const pending = readPending(draft.owner).filter((item) => item.id !== record.id);
  outdoorStorage.setItemSync(pendingKey(draft.owner), JSON.stringify([...pending, record]));
  removeDraft(draft.owner);
  return record;
}

export function recordLocations(locations: LocationObject[], expectedOwner?: string) {
  const owner = expectedOwner ?? outdoorStorage.getItemSync(activeKey);
  if (!owner) return;
  const draft = readDraft(owner);
  if (!draft || draft.runningSince === null) return;

  const route = draft.route.slice();
  let { lastPointAt, lastFix, meters } = draft;
  for (const { coords, timestamp } of locations) {
    const { accuracy, latitude, longitude } = coords;
    if (durationSeconds(draft, timestamp) >= 86400) continue;
    if (timestamp < draft.runningSince || timestamp <= (lastFix ?? 0) ||
        !Number.isFinite(timestamp) || accuracy === null || !Number.isFinite(accuracy) || accuracy > 30 || accuracy < 0 ||
        !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
        !Number.isFinite(longitude) || Math.abs(longitude) > 180) continue;

    const point: RoutePoint = [Number(latitude.toFixed(6)), Number(longitude.toFixed(6))];
    const previous = route.at(-1)?.at(-1);
    const sincePoint = lastPointAt === null ? Infinity : timestamp - lastPointAt;
    const gpsGap = lastFix !== null && timestamp - lastFix > 45_000;
    lastFix = timestamp;

    if (!previous || lastPointAt === null || gpsGap) {
      route.push([point]);
    } else {
      if (sincePoint < 3_000) continue;
      const delta = metersBetween(previous, point);
      if (delta < Math.max(5, accuracy / 2) || delta / (sincePoint / 1000) > 11) continue;
      route[route.length - 1] = [...route[route.length - 1], point];
      meters += delta;
    }
    lastPointAt = timestamp;
  }
  if (lastFix !== draft.lastFix) writeDraft({ ...draft, route, meters, lastFix, lastPointAt });
}
