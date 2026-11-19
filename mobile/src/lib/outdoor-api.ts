import { api } from './api';
import { clearPending, readPending, type OutdoorRecord } from './outdoor-recording';

export async function syncOutdoor(owner: string, record: OutdoorRecord) {
  const saved = await api<OutdoorRecord>(`/exercises/outdoor/${record.id}`, {
    method: 'PUT',
    body: {
      owner_id: owner,
      activity_type: record.outdoor_type,
      duration_seconds: record.duration_seconds,
      started_at: record.started_at,
      completed_at: record.completed_at,
      route: record.route,
    },
  });
  clearPending(owner, record.id);
  return saved;
}

export async function outdoorHistory(owner: string) {
  const pending = readPending(owner);
  const uploads = await Promise.allSettled(pending.map((record) => syncOutdoor(owner, record)));
  const saved = await api<Omit<OutdoorRecord, 'route'>[]>('/exercises/outdoor').catch(() => []);
  const recorded = new Map([
    ...readPending(owner),
    ...uploads.flatMap((upload) => upload.status === 'fulfilled' ? [upload.value] : []),
    ...saved,
  ].map((record) => [record.id, record]));
  return [...recorded.values()];
}
