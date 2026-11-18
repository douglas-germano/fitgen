/** Pure helpers for the community screens (labels, copy, links). */
import type { ActivityType, ChallengeMetric, ImageRatio, CommunityActivity, ReactionKind } from '@/types/api';

export const REACTIONS: { kind: ReactionKind; emoji: string; label: string }[] = [
  { kind: 'fire', emoji: '🔥', label: 'Fogo' },
  { kind: 'clap', emoji: '👏', label: 'Palmas' },
  { kind: 'muscle', emoji: '💪', label: 'Força' },
  { kind: 'heart', emoji: '❤️', label: 'Coração' },
];

export const IMAGE_RATIOS: { value: ImageRatio; label: string; aspect: number }[] = [
  { value: '4:5', label: 'Retrato 4:5', aspect: 4 / 5 },
  { value: '9:16', label: 'Vertical 9:16', aspect: 9 / 16 },
];

/** Width/height of a post photo. Unknown or missing formats fall back to 4:5. */
export const imageAspect = (ratio: unknown) => IMAGE_RATIOS.find((r) => r.value === ratio)?.aspect ?? 4 / 5;

/** Instagram's feed width: wider photos are scaled down to this. */
export const FEED_MAX_WIDTH = 1080;
export const FEED_JPEG_QUALITY = 0.8;

/** Largest centred rectangle with the target aspect ratio (width / height) inside width×height. */
export function centerCropRect(width: number, height: number, aspect: number) {
  if (!(width > 0) || !(height > 0)) return null;
  if (width / height > aspect) {
    const w = Math.round(height * aspect);
    return { originX: Math.floor((width - w) / 2), originY: 0, width: w, height };
  }
  const h = Math.round(width / aspect);
  return { originX: 0, originY: Math.floor((height - h) / 2), width, height: h };
}

export const reactionEmoji = (kind: ReactionKind | null | undefined) => REACTIONS.find((r) => r.kind === kind)?.emoji ?? '🔥';

export const METRICS: { value: ChallengeMetric; label: string; unit: string; defaultTarget: number }[] = [
  { value: 'workouts', label: 'Treinos', unit: 'treinos', defaultTarget: 12 },
  { value: 'active_days', label: 'Dias ativos', unit: 'dias', defaultTarget: 20 },
  { value: 'workout_minutes', label: 'Minutos', unit: 'min', defaultTarget: 600 },
  { value: 'hydration_days', label: 'Meta de água', unit: 'dias', defaultTarget: 15 },
  { value: 'meals', label: 'Refeições', unit: 'refeições', defaultTarget: 60 },
];

export const metricUnit = (metric: string) => METRICS.find((m) => m.value === metric)?.unit ?? '';

function first(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function minutes(seconds: unknown) {
  const total = Math.round(Number(seconds) / 60);
  return Number.isFinite(total) && total > 0 ? total : 0;
}

const STREAK_LABELS: Record<string, string> = { workout: 'de treino', nutrition: 'registrando refeições', hydration: 'batendo a meta de água' };

/** Headline and detail line for a feed card. */
export function describeActivity(a: Pick<CommunityActivity, 'type' | 'payload' | 'user'>): { title: string; detail?: string } {
  const p = a.payload ?? {};
  const who = first(a.user.name);
  switch (a.type as ActivityType) {
    case 'workout_completed': {
      const min = minutes(p.duration_seconds);
      const kcal = Number(p.calories) || 0;
      return {
        title: `${who} concluiu ${String(p.workout_name || 'um treino')}`,
        detail: [min ? `${min} min` : null, kcal ? `${kcal} kcal` : null].filter(Boolean).join(' · ') || undefined,
      };
    }
    case 'streak':
      return { title: `${who} chegou a ${Number(p.days) || 0} dias seguidos ${STREAK_LABELS[String(p.category)] ?? ''}`.trim() };
    case 'achievement':
      return { title: `${who} desbloqueou "${String(p.name ?? 'uma conquista')}"`, detail: p.description ? String(p.description) : undefined };
    case 'hydration_goal':
      return { title: `${who} bateu a meta de água do dia`, detail: p.amount_ml ? `${(Number(p.amount_ml) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L` : undefined };
    case 'challenge_completed':
      return { title: `${who} completou o desafio "${String(p.title ?? '')}"` };
    case 'group_joined':
      return { title: `${who} entrou no grupo`, detail: p.group_name ? String(p.group_name) : undefined };
    case 'post':
    default:
      return { title: a.user.name };
  }
}

/** "agora", "5 min", "3 h", "ontem", "12 nov". */
export function timeAgo(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, now - t) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 2 * 86400) return 'ontem';
  return new Date(t).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** Days left (inclusive of today) until an ISO date. */
export function daysLeft(endIso: string, today = new Date()) {
  const [y, m, d] = endIso.split('-').map(Number);
  const end = new Date(y, (m ?? 1) - 1, d ?? 1);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((end.getTime() - start.getTime()) / 864e5) + 1;
}

export function challengeWhen(c: { status: string; start_date: string; end_date: string }, today = new Date()) {
  if (c.status === 'ended') return 'Encerrado';
  if (c.status === 'upcoming') {
    const n = daysLeft(c.start_date, today) - 1;
    return n <= 1 ? 'Começa amanhã' : `Começa em ${n} dias`;
  }
  const left = daysLeft(c.end_date, today);
  return left <= 1 ? 'Último dia' : `${left} dias restantes`;
}

export const inviteLink = (code: string) => {
  const base = typeof window !== 'undefined' && window.location?.protocol.startsWith('http')
    ? window.location.origin + '/'
    : 'fitgen://';
  return `${base}community/join/${encodeURIComponent(code)}`;
};

export const groupInviteMessage = (groupName: string, code: string) =>
  `Bora treinar juntos? Entre no meu grupo "${groupName}" no FitGen.\n\nCódigo: ${code}\n${inviteLink(code)}`;

/** Codes are typed from messages: uppercase, no spaces, our alphabet only. */
export const normalizeCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

/** Only route known community notification targets. */
export function communityNotificationPath(type: unknown, id: unknown): string | null {
  if (type === 'community_friends' || type === 'community_follow_request') return '/notifications';
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) return null;
  const routes: Record<string, string> = { community_activity: 'activity', community_group: 'group', community_challenge: 'challenge', community_user: 'user' };
  return typeof type === 'string' && routes[type] ? `/community/${routes[type]}/${id}` : null;
}
