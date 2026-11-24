import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Activity, BookOpen, Dumbbell, Gauge, History, LayoutGrid, Lock, Play, Target } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { ExerciseGuide } from '@/components/exercise-guide';
import { BackBar, Group, GROUP_RADIUS, GroupRow, GroupTitle, HeaderCard, SCREEN_COLUMN } from '@/components/grouped';
import { Button, Page, PageSkeleton, QueryError, Row, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useExerciseLibrary, useLibraryExerciseHistory } from '@/hooks/queries';
import { usePremium } from '@/hooks/use-premium';
import { isPremiumRequired } from '@/lib/api';
import { CATEGORY_LABELS, equipmentLabel, LEVEL_LABELS, muscleLabel } from '@/lib/exercise-library';
import { openPremiumSheet } from '@/lib/premium-sheet';
import { formatDayMonth } from '@/lib/workout';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = useExerciseLibrary();
  const exercise = library.data?.find((ex) => ex.id === id);
  const [failedAnimation, setFailedAnimation] = useState<string>();

  if (library.isLoading) return <PageSkeleton title="Exercício" back tab={false} />;
  if (library.error && !library.data) return <QueryError title="Exercício" back error={library.error} onRetry={library.refetch} />;
  if (!exercise) {
    return (
      <Page tab={false} topBar={<BackBar />} contentStyle={SCREEN_COLUMN}>
        <Group>
          <GroupRow icon={BookOpen} title="Exercício não encontrado na biblioteca" />
        </Group>
      </Page>
    );
  }

  const [primary, ...secondary] = exercise.muscle_groups;
  const gear = exercise.equipment_needed.map(equipmentLabel).join(', ');

  return (
    <Page
      tab={false}
      topBar={<BackBar />}
      contentStyle={SCREEN_COLUMN}
      footer={exercise.video_url ? (
        <Button size="lg" icon={Play} title="Ver vídeo" onPress={() => WebBrowser.openBrowserAsync(exercise.video_url!)} />
      ) : undefined}>
      {exercise.animation_url ? (
        <View style={{ alignSelf: 'center', width: '100%', aspectRatio: 1, backgroundColor: '#fff', borderRadius: GROUP_RADIUS, borderCurve: 'continuous', overflow: 'hidden', justifyContent: 'center' }}>
          {failedAnimation === exercise.animation_url ? (
            <Text style={{ textAlign: 'center', color: '#303030', padding: Spacing.four }}>Animação indisponível no momento.</Text>
          ) : (
            <Image source={exercise.animation_url} autoplay contentFit="contain"
              accessibilityLabel={`Demonstração de ${exercise.name}`}
              style={{ width: '100%', height: '100%' }}
              onError={() => setFailedAnimation(exercise.animation_url ?? undefined)} />
          )}
        </View>
      ) : null}
      <View style={{ gap: Spacing.two, paddingHorizontal: Spacing.two }}>
        <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}>{exercise.name}</Text>
        {exercise.description ? <Text muted>{exercise.description}</Text> : null}
      </View>

      <Group>
        <GroupRow icon={Gauge} title="Nível" value={LEVEL_LABELS[exercise.difficulty_level]} />
        <GroupRow icon={LayoutGrid} title="Categoria" value={CATEGORY_LABELS[exercise.category]} />
        {primary ? <GroupRow icon={Target} title="Músculo principal" value={muscleLabel(primary)} /> : null}
        {secondary.length > 0 ? <GroupRow icon={Activity} title="Também trabalha" caption={secondary.map(muscleLabel).join(', ')} /> : null}
        {gear ? <GroupRow icon={Dumbbell} title="Equipamento" caption={gear} /> : null}
      </Group>

      <ExerciseGuide exercise={exercise} />
      <ExerciseHistory id={exercise.id} />
    </Page>
  );
}

function ExerciseHistory({ id }: { id: string }) {
  const { isPremium, loading } = usePremium();
  const history = useLibraryExerciseHistory(id, !loading && isPremium);
  const sessions = history.data?.pages.flatMap((page) => page.sessions) ?? [];

  return (
    <View style={{ gap: Spacing.three }}>
      <GroupTitle title="Histórico" />
      {loading ? <Text muted>Carregando acesso…</Text> : !isPremium || isPremiumRequired(history.error) ? (
        <Group>
          <GroupRow icon={Lock} title="Histórico Premium" captionLines={3}
            caption="Veja as datas, séries, cargas e repetições dos seus treinos neste exercício."
            onPress={() => openPremiumSheet('exercise_history')} />
        </Group>
      ) : history.isLoading ? <Text muted>Carregando histórico…</Text> : (
        <>
          {sessions.map((session) => (
            <HeaderCard key={session.id} title={formatDayMonth(session.started_at)}>
              <View style={{ gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
                {session.sets.map((set) => (
                  <Row key={set.id} style={{ justifyContent: 'space-between', gap: Spacing.two }}>
                    <Text muted>Série {set.set_number}</Text>
                    <Text style={{ fontVariant: ['tabular-nums'] }}>{set.weight_kg === null ? '' : `${set.weight_kg.toLocaleString('pt-BR')} kg · `}{set.reps} reps</Text>
                  </Row>
                ))}
              </View>
            </HeaderCard>
          ))}
          {history.error ? (
            <>
              <Text muted>Não foi possível carregar o histórico.</Text>
              <Button title="Tentar novamente" variant="soft"
                onPress={() => { if (history.isFetchNextPageError) void history.fetchNextPage(); else void history.refetch(); }} />
            </>
          ) : sessions.length === 0 ? (
            <Group>
              <GroupRow icon={History} title="Nenhuma série ainda" captionLines={3}
                caption="As séries aparecem aqui depois que você finalizar um treino com este exercício." />
            </Group>
          ) : null}
          {history.hasNextPage && !history.isFetchNextPageError ? (
            <Button title="Carregar mais" variant="soft" loading={history.isFetchingNextPage} onPress={() => history.fetchNextPage()} />
          ) : null}
        </>
      )}
    </View>
  );
}

