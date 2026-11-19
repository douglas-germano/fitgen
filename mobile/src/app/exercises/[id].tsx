import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { BookOpen, History, Lock, Play } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { ExerciseGuide } from '@/components/exercise-guide';
import { Badge, BadgeIcon, Button, Card, EmptyState, Page, PageSkeleton, QueryError, Row, Text, TopBar } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
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
      <Page tab={false} topBar={<TopBar title="Exercício" back />}>
        <EmptyState icon={BookOpen} message="Exercício não encontrado na biblioteca." />
      </Page>
    );
  }

  const [primary, ...secondary] = exercise.muscle_groups;
  const gear = exercise.equipment_needed.map(equipmentLabel).join(', ');

  return (
    <Page
      tab={false}
      topBar={<TopBar title="Exercício" back />}
      contentStyle={{ gap: Spacing.five }}
      footer={exercise.video_url ? (
        <Button size="lg" icon={Play} title="Ver vídeo" onPress={() => WebBrowser.openBrowserAsync(exercise.video_url!)} />
      ) : undefined}>
      {exercise.animation_url ? (
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 440, aspectRatio: 1, backgroundColor: '#fff', borderRadius: Radius.md, overflow: 'hidden', justifyContent: 'center' }}>
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
      <View style={{ gap: Spacing.three }}>
        <Text variant="display">{exercise.name}</Text>
        <Row style={{ flexWrap: 'wrap' }}>
          <Badge label={LEVEL_LABELS[exercise.difficulty_level]} />
          <Badge label={CATEGORY_LABELS[exercise.category]} tone="chip" />
        </Row>
        {exercise.description ? <Text muted>{exercise.description}</Text> : null}
      </View>

      <View style={{ gap: Spacing.two }}>
        {primary && <Fact label="Músculo principal" value={muscleLabel(primary)} />}
        {secondary.length > 0 && <Fact label="Também trabalha" value={secondary.map(muscleLabel).join(', ')} />}
        {gear ? <Fact label="Equipamento" value={gear} /> : null}
      </View>

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
      <Text variant="titleLg">Histórico</Text>
      {loading ? <Text muted>Carregando acesso…</Text> : !isPremium || isPremiumRequired(history.error) ? (
        <Card style={{ gap: Spacing.three }}>
          <Row style={{ gap: Spacing.three }}>
            <BadgeIcon icon={Lock} size={40} />
            <Text variant="titleSm" style={{ flex: 1 }}>Histórico Premium</Text>
          </Row>
          <Text muted>Veja as datas, séries, cargas e repetições dos seus treinos neste exercício.</Text>
          <Button title="Conhecer o Premium" variant="soft" onPress={() => openPremiumSheet('exercise_history')} />
        </Card>
      ) : history.isLoading ? <Text muted>Carregando histórico…</Text> : (
        <>
          {sessions.map((session) => (
            <Card key={session.id} style={{ gap: Spacing.two }}>
              <Text variant="titleSm">{formatDayMonth(session.started_at)}</Text>
              {session.sets.map((set) => (
                <Row key={set.id} style={{ justifyContent: 'space-between', gap: Spacing.two }}>
                  <Text muted>Série {set.set_number}</Text>
                  <Text>{set.weight_kg === null ? '' : `${set.weight_kg.toLocaleString('pt-BR')} kg · `}{set.reps} reps</Text>
                </Row>
              ))}
            </Card>
          ))}
          {history.error ? (
            <>
              <Text muted>Não foi possível carregar o histórico.</Text>
              <Button title="Tentar novamente" variant="soft"
                onPress={() => { if (history.isFetchNextPageError) void history.fetchNextPage(); else void history.refetch(); }} />
            </>
          ) : sessions.length === 0 ? (
            <EmptyState icon={History} message="As séries aparecem aqui depois que você finalizar um treino com este exercício." />
          ) : null}
          {history.hasNextPage && !history.isFetchNextPageError ? (
            <Button title="Carregar mais" variant="soft" loading={history.isFetchingNextPage} onPress={() => history.fetchNextPage()} />
          ) : null}
        </>
      )}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ alignItems: 'flex-start', gap: Spacing.three }}>
      <Text variant="caption" style={{ width: 130 }}>{label}</Text>
      <Text variant="titleSm" style={{ flex: 1, fontSize: 14 }}>{value}</Text>
    </Row>
  );
}
