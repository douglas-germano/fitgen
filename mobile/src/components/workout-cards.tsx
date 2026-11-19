import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, Play, Route, Trophy } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ExerciseThumbnail } from '@/components/exercise-thumbnail';
import { RouteThumbnail } from '@/components/outdoor-summary';
import { Button, IconButton, Row, SectionHeader, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useExerciseLibrary, useProfile, useRecentRecords } from '@/hooks/queries';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/community';
import { distanceLabel } from '@/lib/outdoor';
import { readPending, type OutdoorRecord } from '@/lib/outdoor-recording';
import { useColors } from '@/providers/theme';
import type { ExerciseSessionSummary } from '@/types/api';

const minutes = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;
const kg = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

/** The latest run or walk with its route, or a way to start the first one. */
export function OutdoorCard({ last }: { last: ExerciseSessionSummary | undefined }) {
  const colors = useColors();
  const owner = useProfile().data?.id;
  // The history list carries no route; pending records have it locally, saved ones come from the detail endpoint.
  const route = useQuery({
    queryKey: ['outdoor-route', last?.id],
    enabled: !!last && !!owner,
    staleTime: Infinity,
    queryFn: async () => readPending(owner!).find((record) => record.id === last!.id)?.route
      ?? (await api<OutdoorRecord>(`/exercises/outdoor/${encodeURIComponent(last!.id)}`)).route,
  });

  return (
    <View style={{ gap: Spacing.three }}>
      <SectionHeader title="Ao ar livre" />
      {last ? (
        <Row style={{ gap: Spacing.three }}>
          <Pressable
            onPress={() => router.push({ pathname: '/outdoor/[id]', params: { id: last.id } })}
            accessibilityRole="button"
            accessibilityLabel={`${last.outdoor_type === 'walk' ? 'Última caminhada' : 'Última corrida'}: ${distanceLabel(last.distance_meters ?? 0)}, ${minutes(last.duration_seconds)}, ${timeAgo(last.started_at)}`}
            accessibilityHint="Abre o resumo com o trajeto"
            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, opacity: pressed ? 0.65 : 1 })}>
            <RouteThumbnail route={route.data} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label" muted>{last.outdoor_type === 'walk' ? 'Última caminhada' : 'Última corrida'} · {timeAgo(last.started_at)}</Text>
              <Text variant="titleLg" style={{ fontVariant: ['tabular-nums'] }}>{distanceLabel(last.distance_meters ?? 0)}</Text>
              <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>{minutes(last.duration_seconds)}</Text>
            </View>
            <ChevronRight size={18} color={colors.inkMuted} />
          </Pressable>
          <IconButton icon={Play} label="Iniciar corrida ou caminhada" variant="volt" onPress={() => router.push('/outdoor')} />
        </Row>
      ) : (
        <Row style={{ gap: Spacing.three }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceChip, alignItems: 'center', justifyContent: 'center' }}>
            <Route size={22} color={colors.inkMuted} />
          </View>
          <Text variant="titleSm" style={{ flex: 1 }}>Corrida e caminhada com GPS</Text>
          <Button size="sm" title="Iniciar" icon={Play} onPress={() => router.push('/outdoor')} />
        </Row>
      )}
    </View>
  );
}

/** New heaviest sets from the last two weeks. Renders nothing when there are none. */
export function RecordsCard() {
  const colors = useColors();
  const records = useRecentRecords().data;
  const library = useExerciseLibrary().data;
  if (!records?.length) return null;

  return (
    <View style={{ gap: Spacing.three }}>
      <SectionHeader title="Recordes" />
      <View>
        {records.map((record, index) => {
          const exercise = library?.find((item) => item.id === record.exercise_library_id);
          return (
            <Row key={record.exercise_library_id}
              accessible
              accessibilityLabel={`Recorde em ${record.name}: ${kg(record.weight_kg)}, ${kg(record.weight_kg - record.previous_kg)} a mais, ${timeAgo(record.achieved_at)}`}
              style={{
                gap: Spacing.three, minHeight: 56, paddingVertical: Spacing.two,
                borderTopWidth: index ? StyleSheet.hairlineWidth : 0, borderColor: colors.line,
              }}>
              {exercise ? (
                <ExerciseThumbnail size={44} exercise={{
                  id: exercise.id, name: exercise.name, sets: 0, reps: '',
                  animation_url: exercise.animation_url, exercise_library_id: exercise.id,
                }} />
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: colors.voltSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={20} color={colors.voltInk} />
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="titleSm" numberOfLines={1}>{record.name}</Text>
                <Text variant="caption">{timeAgo(record.achieved_at)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text variant="titleMd" style={{ fontVariant: ['tabular-nums'] }}>{kg(record.weight_kg)}</Text>
                <Text variant="label" color={colors.voltInk} style={{ fontVariant: ['tabular-nums'] }}>+{kg(record.weight_kg - record.previous_kg)}</Text>
              </View>
            </Row>
          );
        })}
      </View>
    </View>
  );
}
