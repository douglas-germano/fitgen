import type { WorkoutDay, WorkoutPlan } from '@/types/api';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const DAY_LABELS: Record<string, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export function todaysWorkout(plan: WorkoutPlan | undefined): WorkoutDay | undefined {
  const today = DAYS[new Date().getDay()];
  return plan?.days?.find((d) => d.day_of_week === today);
}

/** Plan days ordered Monday → Sunday. */
export function sortedDays(plan: WorkoutPlan | undefined): WorkoutDay[] {
  const order = (d: WorkoutDay) => (DAYS.indexOf(d.day_of_week) + 6) % 7;
  return [...(plan?.days ?? [])].sort((a, b) => order(a) - order(b));
}

export function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** dd/MM/yyyy in Brasília time, like the site's `formatDateOnlyBRT`. */
export function formatDateBR(iso: string | null | undefined) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// ---------- Volt Fit display helpers ----------

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAY_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Monday → Sunday of the current week. */
export function currentWeek(from = new Date()): Date[] {
  const monday = new Date(from);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** "16 Nov 2026" (or "16 Nov" without the year). */
export function formatDayMonth(d: Date | string | null | undefined, withYear = true) {
  if (d == null || d === '') return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '-';
  const base = `${String(date.getDate()).padStart(2, '0')} ${MONTH_SHORT[date.getMonth()]}`;
  return withYear ? `${base} ${date.getFullYear()}` : base;
}

/** "Segunda, 16 Nov 2026" */
export function formatLongDate(d = new Date(), withYear = true) {
  return `${WEEKDAY_LONG[d.getDay()]}, ${formatDayMonth(d, withYear)}`;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Plan days scheduled from today on (up to 7 days ahead), with their date. */
export function upcomingWorkouts(plan: WorkoutPlan | undefined, count = 2) {
  const out: { date: Date; day: WorkoutDay }[] = [];
  for (let i = 0; i < 7 && out.length < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const day = plan?.days?.find((d) => d.day_of_week === DAYS[date.getDay()]);
    if (day) out.push({ date, day });
  }
  return out;
}

export const workoutTitle = (day: WorkoutDay) => day.name || day.focus || DAY_LABELS[day.day_of_week] || 'Treino';

/** "6 exercícios · 55 min" (duration estimated from sets × reps + rest). */
export function workoutSummary(day: WorkoutDay) {
  const minutes = Math.round(
    day.exercises.reduce((s, ex) => s + ex.sets * (45 + (ex.rest_seconds ?? 60)), 0) / 60,
  );
  return `${day.exercises.length} exercícios${minutes ? ` · ${minutes} min` : ''}`;
}

/** 1234.5 → "1.235" (pt-BR thousands). */
export const formatInt = (n: number) => Number.isFinite(n) ? Math.round(n).toLocaleString('pt-BR') : '—';

/** 1800 ml → "1,8 L" */
export const formatLiters = (ml: number, unit = true) =>
  `${(ml / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${unit ? ' L' : ''}`;

/** "82,4" */
export const formatDecimal = (n: number, digits = 1) =>
  Number.isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';

/** Whole weeks elapsed since an ISO date. */
export function weeksSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / (7 * 864e5)));
}

// ---------- Week strip, next workout and exercise summaries ----------

export type WeekCell = {
  date: Date;
  weekday: string;
  /** Planned workout for that weekday, if any. */
  day?: WorkoutDay;
  /** A workout was logged on that date (Apple Health imports don't count). */
  done: boolean;
  today: boolean;
};

/** Monday → Sunday of this week with the planned workout and whether it was trained. */
export function weekCells(plan: WorkoutPlan | undefined, sessions: { started_at: string; from_health?: boolean }[] = []): WeekCell[] {
  const now = new Date();
  return currentWeek(now).map((date) => ({
    date,
    weekday: WEEKDAY_SHORT[date.getDay()],
    day: plan?.days?.find((d) => d.day_of_week === DAYS[date.getDay()]),
    done: sessions.some((s) => !s.from_health && isSameDay(new Date(s.started_at), date)),
    today: isSameDay(date, now),
  }));
}

/** First planned workout after today, with its date ("Amanhã", "Quinta"…). */
export function nextWorkout(plan: WorkoutPlan | undefined): { date: Date; day: WorkoutDay } | undefined {
  for (let i = 1; i <= 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const day = plan?.days?.find((d) => d.day_of_week === DAYS[date.getDay()]);
    if (day) return { date, day };
  }
  return undefined;
}

/** "Amanhã" for tomorrow, otherwise the weekday name. */
export function relativeDayLabel(date: Date) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow) ? 'Amanhã' : WEEKDAY_LONG[date.getDay()];
}

/** Estimated minutes for a workout day (same estimate as `workoutSummary`). */
export function workoutMinutes(day: WorkoutDay) {
  return Math.round(day.exercises.reduce((s, ex) => s + ex.sets * (45 + (ex.rest_seconds ?? 60)), 0) / 60);
}

/** "8-12" → "8–12". */
export const repsLabel = (reps: string | number | null | undefined) => String(reps ?? '—').replace('-', '–');

/** "4 × 8–12 · 60 s" */
export function exerciseLine(ex: { sets: number; reps: string; rest_seconds?: number }) {
  return `${ex.sets} × ${repsLabel(ex.reps)}${ex.rest_seconds ? ` · ${ex.rest_seconds} s` : ''}`;
}
