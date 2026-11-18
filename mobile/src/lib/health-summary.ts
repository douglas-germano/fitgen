/** Calendar-day windows in the device's timezone, including today. */
export function healthWindows(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const previous = new Date(start);
  previous.setDate(previous.getDate() - 7);
  return { start, previous, end: now };
}

export function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export type ActivityDay = { date: string; steps: number | null };
export type SummarySession = { id: string; started_at: string; duration_seconds: number };
export type WeightPoint = { date: string; value: number };

export function weeklySummary(sessions: SummarySession[], weights: WeightPoint[], days: ActivityDay[], now = new Date()) {
  const { start, previous, end } = healthWindows(now);
  const unique = [...new Map(sessions.map(s => [s.id, s])).values()];
  function period(from: Date, to: Date, inclusive: boolean) {
    const inRange = (d: Date) => d >= from && (inclusive ? d <= to : d < to);
    const workouts = unique.filter(s => inRange(new Date(s.started_at)));
    const readings = weights.filter(w => Number.isFinite(w.value) && w.value > 0 && inRange(new Date(w.date)))
      .sort((a, b) => a.date.localeCompare(b.date));
    const activity = days.filter(d => d.date >= localDay(from) && (inclusive ? d.date <= localDay(to) : d.date < localDay(to)) && d.steps !== null);
    return {
      workouts: workouts.length,
      minutes: Math.round(workouts.reduce((sum, s) => sum + Math.max(0, s.duration_seconds), 0) / 60),
      steps: activity.length ? activity.reduce((sum, d) => sum + (d.steps ?? 0), 0) : null,
      coverage: activity.length,
      weight: readings.length ? readings[readings.length - 1].value : null,
    };
  }
  return { current: period(start, end, true), previous: period(previous, start, false) };
}

/** Reject our own exports so a FitGen workout/weight never loops back as an import. */
export function isFitGenSource(bundle: string, metadata?: Record<string, unknown>) {
  return bundle === 'com.douglas.fitgen' || metadata?.HKWorkoutBrandName === 'FitGen';
}
