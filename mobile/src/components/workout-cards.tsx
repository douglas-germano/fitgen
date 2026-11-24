import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, Play, Trophy } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { ExerciseThumbnail } from '@/components/exercise-thumbnail';
import { RouteThumbnail } from '@/components/outdoor-summary';
import { Group, HeaderCard } from '@/components/grouped';
import { Button, Row, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useExerciseLibrary, useProfile, useRecentRecords } from '@/hooks/queries';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/community';
import { distanceLabel, OUTDOOR_NAMES } from '@/lib/outdoor';
import { readPending, type OutdoorRecord } from '@/lib/outdoor-recording';
import { useColors } from '@/providers/theme';
import type { ExerciseSessionSummary } from '@/types/api';

const minutes = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;
const kg = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;

/** The latest outdoor activity with its route, or a way to start the first one. */
export function OutdoorCard({ last }: { last: ExerciseSessionSummary | undefined }) {
  const colors = useColors();
  const owner = useProfile().data?.id;
  // The history list carries no route; pending records have it locally, saved ones come from the detail endpoint.
  const route = useQuery({
    queryKey: ['outdoor-route', owner, last?.id],
    enabled: !!last && !!owner,
    staleTime: Infinity,
    queryFn: async () => readPending(owner!).find((record) => record.id === last!.id)?.route
      ?? (await api<OutdoorRecord>(`/exercises/outdoor/${encodeURIComponent(last!.id)}`)).route,
  });
  const recent = last?.outdoor_type ? OUTDOOR_NAMES[last.outdoor_type].recent : 'Última atividade';

  return (
    <HeaderCard title="Atividades ao ar livre">
      <Text muted style={{ fontSize: 13, paddingHorizontal: Spacing.four, marginTop: -Spacing.two, paddingBottom: Spacing.three }}>Corrida, caminhada e pedal com GPS</Text>
      {last && (
        <Pressable
          onPress={() => router.push({ pathname: '/outdoor/[id]', params: { id: last.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${recent}: ${distanceLabel(last.distance_meters ?? 0)}, ${minutes(last.duration_seconds)}, ${timeAgo(last.started_at)}`}
          accessibilityHint="Abre o resumo com o trajeto"
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: Spacing.three,
            paddingHorizontal: Spacing.four, paddingBottom: Spacing.three,
            opacity: pressed ? 0.65 : 1,
          })}>
          <RouteThumbnail route={route.data} size={52} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ fontSize: 16, lineHeight: 22 }} numberOfLines={1}>{recent}</Text>
            <Text muted style={{ fontSize: 13, lineHeight: 18 }}>{distanceLabel(last.distance_meters ?? 0)} · {minutes(last.duration_seconds)} · {timeAgo(last.started_at)}</Text>
          </View>
          <ChevronRight size={16} color={colors.inkMuted} />
        </Pressable>
      )}
      <View style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
        <Button size="lg" title="Iniciar atividade" icon={Play} onPress={() => router.push('/outdoor')} />
      </View>
    </HeaderCard>
  );
}

/** New heaviest sets from the last two weeks. Renders nothing when there are none. */
export function RecordsCard() {
  const colors = useColors();
  const records = useRecentRecords().data;
  const library = useExerciseLibrary().data;
  if (!records?.length) return null;

  return (
    <Group title="Recordes">
      {records.map((record) => {
        const exercise = library?.find((item) => item.id === record.exercise_library_id);
        return (
          <Row key={record.exercise_library_id}
            accessible
            accessibilityLabel={`Recorde em ${record.name}: ${kg(record.weight_kg)}, ${kg(record.weight_kg - record.previous_kg)} a mais, ${timeAgo(record.achieved_at)}`}
            style={{ gap: Spacing.three, paddingLeft: Spacing.three, paddingRight: Spacing.four, paddingVertical: Spacing.three }}>
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
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={{ fontSize: 16, lineHeight: 22 }} numberOfLines={1}>{record.name}</Text>
              <Text muted style={{ fontSize: 13, lineHeight: 18 }}>{timeAgo(record.achieved_at)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{kg(record.weight_kg)}</Text>
              <Text style={{ fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] }} color={colors.voltInk}>+{kg(record.weight_kg - record.previous_kg)}</Text>
            </View>
          </Row>
        );
      })}
    </Group>
  );
}
