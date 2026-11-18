/** Community building blocks: feed card, reaction bar, challenge card, settings row. */
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Award,
  Droplets,
  Dumbbell,
  Flame,
  Globe,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, Switch, View } from 'react-native';

import { Avatar, Badge, BadgeIcon, Card, ProgressBar, Row, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { imageQueryOptions, imageUri, useBlockUser, useDeleteActivity, useReact, useReport, type ImagePayload } from '@/hooks/community';
import { api, API_URL, errorMessage } from '@/lib/api';
import { challengeWhen, describeActivity, imageAspect, metricUnit, REACTIONS, timeAgo } from '@/lib/community';
import { AppActionSheet, AppAlert } from '@/lib/feedback';
import { useColors } from '@/providers/theme';
import type { Challenge, CommunityActivity, ReactionKind } from '@/types/api';

const TYPE_ICONS: Record<string, LucideIcon> = {
  workout_completed: Dumbbell,
  streak: Flame,
  achievement: Award,
  hydration_goal: Droplets,
  challenge_completed: Trophy,
  group_joined: UserPlus,
  post: PenLine,
};

export const staticUrl = (path: string) =>
  /^https?:\/\//.test(path) ? path : `${API_URL.replace(/\/api\/?$/, '')}/static/${path.replace(/^\//, '')}`;

export const openProfile = (userId: string) => router.push(`/community/user/${userId}`);

/** Report / delete / block menu shared by feed cards and the post screen. */
export function useActivityMenu() {
  const del = useDeleteActivity();
  const report = useReport();
  const block = useBlockUser();
  return (a: CommunityActivity, after?: () => void) => {
    const options = a.is_mine ? ['Excluir publicação', 'Cancelar'] : ['Denunciar publicação', `Bloquear ${a.user.name.split(' ')[0]}`, 'Cancelar'];
    AppActionSheet.showActionSheetWithOptions(
      { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: a.is_mine ? 0 : [0, 1] },
      (index) => {
        if (a.is_mine && index === 0) {
          AppAlert.alert('Excluir publicação?', 'Ela some do feed de todo mundo.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Excluir', style: 'destructive', onPress: () => del.mutate(a.id, { onSuccess: after, onError: (e) => AppAlert.alert('Erro ao excluir', errorMessage(e)) }) },
          ]);
        } else if (!a.is_mine && index === 0) {
          report.mutate({ target_type: 'activity', target_id: a.id }, {
            onSuccess: () => AppAlert.alert('Denúncia enviada', 'Obrigado! Nossa equipe vai analisar. Publicações com várias denúncias saem do ar automaticamente.'),
            onError: (e) => AppAlert.alert('Erro ao denunciar', errorMessage(e)),
          });
        } else if (!a.is_mine && index === 1) {
          AppAlert.alert(`Bloquear ${a.user.name}?`, 'Vocês deixam de ver as publicações um do outro e a amizade é desfeita.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Bloquear', style: 'destructive', onPress: () => block.mutate({ userId: a.user.id, block: true }, { onSuccess: after, onError: (e) => AppAlert.alert('Erro ao bloquear', errorMessage(e)) }) },
          ]);
        }
      },
    );
  };
}

/** One-tap reactions: tap an emoji to react, tap it again to remove. */
export function ReactionBar({ activity, onComments }: { activity: CommunityActivity; onComments?: () => void }) {
  const Colors = useColors();
  const react = useReact();
  const choose = (kind: ReactionKind) => {
    Haptics.selectionAsync();
    react.mutate({ id: activity.id, kind: activity.my_reaction === kind ? null : kind }, {
      onError: (e) => AppAlert.alert('Não foi possível reagir', errorMessage(e)),
    });
  };
  return (
    <Row style={{ gap: Spacing.two, flexWrap: 'wrap' }}>
      {REACTIONS.map((r) => {
        const on = activity.my_reaction === r.kind;
        const count = activity.reactions[r.kind] ?? 0;
        return (
          <Pressable
            key={r.kind}
            onPress={() => choose(r.kind)}
            disabled={react.isPending}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${r.label}${count ? `, ${count}` : ''}`}
            hitSlop={4}
            style={({ pressed }) => ({
              height: 32,
              minWidth: 44,
              paddingHorizontal: Spacing.three,
              borderRadius: Radius.full,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              backgroundColor: on ? (pressed ? Colors.voltStrong : Colors.volt) : pressed ? Colors.surfaceChip : Colors.surfaceSunken,
            })}>
            <Text style={{ fontSize: 15, lineHeight: 18 }}>{r.emoji}</Text>
            {count > 0 && <Text variant="label" color={on ? Colors.onVolt : Colors.inkMuted} style={{ fontVariant: ['tabular-nums'], fontWeight: '600' }}>{count}</Text>}
          </Pressable>
        );
      })}
      {onComments && (
        <Pressable
          onPress={onComments}
          accessibilityRole="button"
          accessibilityLabel={activity.comment_count ? `${activity.comment_count} comentários` : 'Comentar'}
          hitSlop={4}
          style={({ pressed }) => ({
            height: 32,
            paddingHorizontal: Spacing.three,
            borderRadius: Radius.full,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginLeft: 'auto',
            backgroundColor: pressed ? Colors.surfaceChip : Colors.surfaceSunken,
          })}>
          <MessageCircle size={16} color={Colors.ink} />
          <Text variant="label" style={{ fontWeight: '600' }}>{activity.comment_count || 'Comentar'}</Text>
        </Pressable>
      )}
    </Row>
  );
}

/**
 * Feed item in the Instagram style: no card, the post sits on the page background.
 * Header (author) → photo (4:5 or 9:16, with side margins) → reactions/comments → caption, closed by a hairline.
 */
export function ActivityCard({ activity: a, showGroup = true, detail = false }: { activity: CommunityActivity; showGroup?: boolean; detail?: boolean }) {
  const Colors = useColors();
  const menu = useActivityMenu();
  const { title, detail: line } = describeActivity(a);
  const open = detail ? undefined : () => router.push(`/community/activity/${a.id}`);
  const isPost = a.type === 'post';
  const icon = TYPE_ICONS[a.type] ?? Users;

  return (
    <View style={{ gap: Spacing.three, paddingVertical: Spacing.four, borderBottomWidth: detail ? 0 : 1, borderBottomColor: Colors.line }}>
      <Row style={{ gap: Spacing.three }}>
        <Pressable onPress={() => openProfile(a.user.id)} accessibilityRole="button" accessibilityLabel={`Perfil de ${a.user.name}`} hitSlop={4}>
          <Avatar name={a.user.name} uri={a.user.profile_picture} size={40} />
        </Pressable>
        <Pressable style={{ flex: 1, gap: 1 }} onPress={() => openProfile(a.user.id)} accessibilityRole="button">
          <Text variant="titleSm" numberOfLines={1}>{a.user.name}</Text>
          <Row style={{ gap: 6 }}>
            <Text variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
              {[timeAgo(a.created_at), showGroup ? a.group?.name : null].filter(Boolean).join(' · ')}
            </Text>
            {a.audience === 'public' ? <Globe size={11} color={Colors.inkMuted} accessibilityLabel="Público" /> : null}
          </Row>
        </Pressable>
        <Pressable onPress={() => menu(a, detail ? () => router.back() : undefined)} accessibilityRole="button" accessibilityLabel="Mais opções" hitSlop={10}
          style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? Colors.surfaceChip : 'transparent' })}>
          <MoreHorizontal size={20} color={Colors.ink} />
        </Pressable>
      </Row>

      {!isPost && (
        <Pressable onPress={open} disabled={!open} accessibilityRole={open ? 'button' : undefined} accessibilityLabel={open ? 'Abrir publicação' : undefined}
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: Colors.surfaceSunken, borderRadius: Radius.md, borderCurve: 'continuous', padding: Spacing.three }}>
          <BadgeIcon icon={icon} size={36} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="titleSm" numberOfLines={3}>{title}</Text>
            {line ? <Text variant="caption" numberOfLines={2}>{line}</Text> : null}
          </View>
        </Pressable>
      )}

      {a.image ? (
        <ActivityImage id={a.id} aspect={imageAspect(a.payload?.ratio)} />
      ) : null}

      <ReactionBar activity={a} onComments={open} />

      {a.text ? (
        <Pressable onPress={open} disabled={!open} accessibilityRole={open ? 'button' : undefined}>
          <Text style={{ fontSize: 15, lineHeight: 21 }} numberOfLines={detail ? undefined : 6}>
            <Text style={{ fontSize: 15, lineHeight: 21, fontWeight: '700' }}>{a.user.name.split(' ')[0]} </Text>
            {a.text}
          </Text>
        </Pressable>
      ) : null}
      {!detail && a.comment_count > 0 ? (
        <Pressable onPress={open} accessibilityRole="button" hitSlop={6}>
          <Text variant="caption">Ver {a.comment_count === 1 ? '1 comentário' : `os ${a.comment_count} comentários`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ChallengeCard({ challenge: c, onPress }: { challenge: Challenge; onPress?: () => void }) {
  const Colors = useColors();
  const progress = c.my_progress ?? 0;
  const pct = c.target ? (progress / c.target) * 100 : 0;
  return (
    <Card onPress={onPress ?? (() => router.push(`/community/challenge/${c.id}`))} accessibilityLabel={`Desafio ${c.title}`}>
      <Row style={{ gap: Spacing.three }}>
        <BadgeIcon icon={c.completed ? Trophy : c.is_public ? Globe : Users} size={36} tone={c.completed || c.joined ? 'volt' : 'chip'} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="titleSm" numberOfLines={1}>{c.title}</Text>
          <Text variant="caption" numberOfLines={1}>
            {[c.is_public ? 'FitGen' : c.group?.name, challengeWhen(c), `${c.participant_count} ${c.participant_count === 1 ? 'participante' : 'participantes'}`].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {c.completed ? <Badge label="Concluído" /> : null}
      </Row>
      {c.joined ? (
        <View style={{ gap: Spacing.two }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="label" color={Colors.inkMuted}>Seu progresso</Text>
            <Text variant="label" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {Math.min(progress, c.target)}/{c.target} {metricUnit(c.metric)}
            </Text>
          </Row>
          <ProgressBar value={pct} />
        </View>
      ) : (
        <Text variant="caption">Meta: {c.target} {metricUnit(c.metric)} · toque para participar</Text>
      )}
    </Card>
  );
}

/** Label + caption + native switch, for privacy settings. */
export function SwitchRow({ title, caption, value, onChange, disabled }: {
  title: string;
  caption?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const Colors = useColors();
  return (
    <Row style={{ gap: Spacing.three, paddingVertical: Spacing.two }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="titleSm">{title}</Text>
        {caption ? <Text variant="caption">{caption}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={title}
        trackColor={{ false: Colors.line, true: Colors.volt }}
        thumbColor={Colors.surface}
        ios_backgroundColor={Colors.line}
      />
    </Row>
  );
}


function ActivityImage({ id, aspect }: { id: string; aspect: number }) {
  const query = useQuery({ queryKey: ['community', 'image', id], queryFn: () => api<ImagePayload>(`/community/activities/${id}/image`), ...imageQueryOptions });
  const uri = imageUri(query.data);
  if (!uri) return <View style={{ width: '100%', aspectRatio: aspect, alignItems: 'center', justifyContent: 'center', backgroundColor: undefined }}><Text variant="caption">{query.error ? 'Foto indisponível' : 'Carregando foto…'}</Text></View>;
  return <Image source={{ uri }} cachePolicy={query.data?.url ? 'disk' : 'none'} recyclingKey={id} style={{ width: '100%', aspectRatio: aspect, borderRadius: Radius.md, borderCurve: 'continuous' }} contentFit="cover" accessibilityLabel="Foto da publicação" />;
}
