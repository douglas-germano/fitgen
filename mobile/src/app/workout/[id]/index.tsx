import { AppAlert, AppActionSheet } from '@/lib/feedback';
import { QueryError ,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  MoreButton,
  Page,
  PageSkeleton,
  Row,
  Text,
  TopBar,
} from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Dumbbell, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { ExerciseFormSheet } from '@/components/exercise-form-sheet';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { useWorkoutPlan } from '@/hooks/queries';
import { api, errorMessage } from '@/lib/api';
import {
  exerciseLine,
  formatDayMonth,
  isSameDay,
  sortedDays,
  WEEKDAY_SHORT,
  workoutSummary,
  workoutTitle,
} from '@/lib/workout';
import type { Exercise, WorkoutDay } from '@/types/api';

const DAY_INDEX: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

/** Date of this week's occurrence of a plan day (to tell which chip is "Hoje"). */
function isToday(day: WorkoutDay) {
  const now = new Date();
  const target = new Date(now);
  target.setDate(now.getDate() + (DAY_INDEX[day.day_of_week] - now.getDay()));
  return isSameDay(target, now);
}

/** "Seg · Peito" — or "Hoje · Peito" for today's workout. */
const dayChipLabel = (day: WorkoutDay) => `${isToday(day) ? 'Hoje' : WEEKDAY_SHORT[DAY_INDEX[day.day_of_week]] ?? ''} · ${workoutTitle(day)}`;

export default function WorkoutPlanScreen() {
  const Colors = useColors();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: plan, isLoading, refetch, isRefetching, error } = useWorkoutPlan(id);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null);

  if (isLoading) return <PageSkeleton title="Plano" back tab={false} />;
  if (error) return <QueryError title="Plano" back error={error} onRetry={refetch} />;
  if (!plan) {
    return (
      <Page tab={false} topBar={<TopBar title="Plano" back />}>
        <EmptyState icon={Dumbbell} message="Plano não encontrado." />
      </Page>
    );
  }

  const days = sortedDays(plan);
  // Open on today's workout when the plan has one.
  const activeDay = days.find((d) => d.id === activeDayId) ?? days.find(isToday) ?? days[0];
  const reload = () => queryClient.invalidateQueries({ queryKey: ['workout', id] });

  const remove = (ex: Exercise) =>
    AppAlert.alert('Remover Exercício?', `"${ex.name}" será removido deste treino.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/workouts/exercises/${ex.id}`, { method: 'DELETE' });
            reload();
          } catch (e) {
            AppAlert.alert('Erro ao remover exercício.', errorMessage(e));
          }
        },
      },
    ]);

  const exerciseMenu = (ex: Exercise) => {
    if (Platform.OS === 'ios') {
      AppActionSheet.showActionSheetWithOptions(
        { title: ex.name, options: ['Editar', 'Remover', 'Cancelar'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
        (i) => (i === 0 ? setEditing(ex) : i === 1 ? remove(ex) : undefined),
      );
    } else {
      AppAlert.alert(ex.name, undefined, [
        { text: 'Editar', onPress: () => setEditing(ex) },
        { text: 'Remover', style: 'destructive', onPress: () => remove(ex) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  return (
    <Page
      tab={false}
      topBar={<TopBar title={plan.name} back />}
      refreshing={isRefetching}
      onRefresh={refetch}
      contentStyle={{ gap: Spacing.five }}
      footer={
        activeDay?.exercises.length ? (
          <Button size="lg" title={`Abrir Treino · ${workoutTitle(activeDay)}`} onPress={() => router.push(`/workout/${plan.id}/play/${activeDay.id}`)} />
        ) : undefined
      }>
      <View style={{ gap: Spacing.three }}>
        <Text muted>
          {days.length === 1 ? '1 treino por semana' : `${days.length} treinos por semana`} · desde {formatDayMonth(plan.created_at)}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
          {days.map((d) => (
            <Chip key={d.id} label={dayChipLabel(d)} selected={d.id === activeDay?.id} onPress={() => setActiveDayId(d.id)} />
          ))}
        </ScrollView>
      </View>

      {activeDay ? (
        <>
          <View style={{ gap: 4 }}>
            <Row style={{ gap: Spacing.two }}>
              <Text variant="display" style={{ flexShrink: 1 }}>{workoutTitle(activeDay)}</Text>
              {isToday(activeDay) && <Badge label="Hoje" />}
            </Row>
            <Text muted>
              {activeDay.muscle_groups?.join(', ') || activeDay.focus} · {workoutSummary(activeDay)}
            </Text>
          </View>

          {activeDay.exercises.length === 0 && <EmptyState icon={Dumbbell} message="Nenhum exercício neste dia." />}

          {activeDay.exercises.length > 0 && (
            <Card style={{ gap: 0, paddingVertical: Spacing.one, paddingHorizontal: Spacing.four }}>
              {activeDay.exercises.map((ex, i) => (
                <Row
                  key={ex.id}
                  style={{
                    gap: Spacing.three,
                    paddingVertical: Spacing.three,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: Colors.line,
                  }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceChip, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700' }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="titleSm" style={{ fontSize: 15 }} numberOfLines={2}>
                      {ex.name}
                    </Text>
                    <Text variant="caption" style={{ fontSize: 12 }}>
                      {exerciseLine(ex)}
                      {ex.muscle_group ? ` · ${ex.muscle_group}` : ''}
                    </Text>
                    {ex.notes ? (
                      <Text variant="caption" style={{ fontSize: 12 }} numberOfLines={1}>
                        {ex.notes}
                      </Text>
                    ) : null}
                  </View>
                  <MoreButton size="sm" onPress={() => exerciseMenu(ex)} />
                </Row>
              ))}
            </Card>
          )}

          <Button variant="soft" size="lg" icon={Plus} title="Adicionar Exercício" onPress={() => setEditing('new')} />
        </>
      ) : (
        <EmptyState icon={Dumbbell} message="Este plano ainda não tem treinos." />
      )}

      {editing && activeDay && (
        <ExerciseFormSheet dayId={activeDay.id} exercise={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
    </Page>
  );
}
