import { addDays, startOfWeek } from 'date-fns';

import type { ExerciseSessionSummary } from '@/types/api';

export function profileWeek(sessions: ExerciseSessionSummary[], now: Date) {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => ({ date: addDays(start, i), active: false }));
  const current = sessions.filter(({ started_at }) => {
    const date = new Date(started_at);
    return date >= start && date <= now;
  });
  let seconds = 0;
  let outdoorMeters = 0;

  for (const session of current) {
    const day = (new Date(session.started_at).getDay() + 6) % 7;
    days[day].active = true;
    seconds += session.duration_seconds;
    if (session.outdoor_type && Number.isFinite(session.distance_meters)) {
      outdoorMeters += Math.max(0, session.distance_meters ?? 0);
    }
  }

  return {
    days,
    sessions: current.sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at)),
    seconds,
    outdoorMeters,
  };
}
