import { AppAlert, AppActionSheet } from '@/lib/feedback';
import { QueryError, Button, Chip, Dialog, IconButton, Input, MoreButton, Page, PageSkeleton, Row, Text } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Dumbbell, Pencil, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

import { ExerciseFormSheet } from '@/components/exercise-form-sheet';
import { ExerciseThumbnail } from '@/components/exercise-thumbnail';
import { BackBar, Group, GroupRow, HeaderCard, SCREEN_COLUMN } from '@/components/grouped';
import { Spacing } from '@/constants/theme';
import { useRenameWorkout, useWorkoutPlan } from '@/hooks/queries';
import { useExercisePicker } from '@/hooks/use-exercise-picker';
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
import { muscleLabel } from '@/lib/exercise-library';

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
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: plan, isLoading, refetch, isRefetching, error } = useWorkoutPlan(id);
  const picker = useExercisePicker(id, 'plan');
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [renaming, setRenaming] = useState<RenameTarget | null>(null);

  if (isLoading) return <PageSkeleton title="Plano" back tab={false} />;
  if (error) return <QueryError title="Plano" back error={error} onRetry={refetch} />;
  if (!plan) {
    return (
      <Page tab={false} topBar={<BackBar />} contentStyle={SCREEN_COLUMN}>
        <Group>
          <GroupRow icon={Dumbbell} title="Plano não encontrado" />
        </Group>
      </Page>
    );
  }

  const days = sortedDays(plan);
  // Open on today's workout when the plan has one.
  const activeDay = days.find((d) => d.id === (picker.addition?.dayId ?? activeDayId)) ?? days.find(isToday) ?? days[0];
  const addition = picker.addition?.dayId === activeDay?.id ? picker.addition : null;
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
      topBar={<BackBar />}
      refreshing={isRefetching}
      onRefresh={refetch}
      contentStyle={SCREEN_COLUMN}
      footer={
        activeDay?.exercises.length ? (
          <Button size="lg" title={`Abrir treino · ${workoutTitle(activeDay)}`} onPress={() => router.push(`/workout/${plan.id}/play/${activeDay.id}`)} />
        ) : undefined
      }>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, paddingLeft: Spacing.two }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}>{plan.name}</Text>
          <Text muted style={{ fontSize: 13 }}>
            {days.length === 1 ? '1 treino por semana' : `${days.length} treinos por semana`} · desde {formatDayMonth(plan.created_at)}
          </Text>
        </View>
        <IconButton icon={Pencil} size="sm" label="Renomear plano" onPress={() => setRenaming({ kind: 'plan', id: plan.id, name: plan.name })} />
      </View>

      {days.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
          {days.map((d) => (
            <Chip key={d.id} label={dayChipLabel(d)} selected={d.id === activeDay?.id} onPress={() => setActiveDayId(d.id)} />
          ))}
        </ScrollView>
      )}

      {activeDay ? (
        <>
          <HeaderCard title={workoutTitle(activeDay)} value={isToday(activeDay) ? 'Hoje' : WEEKDAY_SHORT[DAY_INDEX[activeDay.day_of_week]]}
            action={<IconButton icon={Pencil} size="sm" label="Renomear treino" onPress={() => setRenaming({ kind: 'day', id: activeDay.id, name: workoutTitle(activeDay) })} />}>
            <Text muted style={{ fontSize: 13, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
              {activeDay.muscle_groups?.map(muscleLabel).join(', ') || activeDay.focus} · {workoutSummary(activeDay)}
            </Text>
          </HeaderCard>

          <Group title="Exercícios">
            {activeDay.exercises.length === 0 && (
              <GroupRow icon={CalendarDays} title="Nenhum exercício neste dia" />
            )}
            {activeDay.exercises.map((ex) => (
              <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingLeft: Spacing.three, paddingRight: Spacing.two, paddingVertical: Spacing.three }}>
                <ExerciseThumbnail exercise={ex} size={48} />
                <Pressable
                  style={({ pressed }) => ({ flex: 1, minWidth: 0, gap: 2, opacity: pressed ? 0.6 : 1 })}
                  disabled={!ex.exercise_library_id}
                  onPress={() => {
                    if (ex.exercise_library_id) {
                      router.push({ pathname: '/exercises/[id]', params: { id: ex.exercise_library_id } });
                    }
                  }}
                  accessibilityRole={ex.exercise_library_id ? 'button' : undefined}
                  accessibilityHint={ex.exercise_library_id ? 'Mostra como fazer o exercício' : undefined}>
                  <Text style={{ fontSize: 16, lineHeight: 22 }} numberOfLines={2}>{ex.name}</Text>
                  <Text muted style={{ fontSize: 13, lineHeight: 18 }} numberOfLines={1}>
                    {exerciseLine(ex)}
                    {ex.muscle_group ? ` · ${ex.muscle_group}` : ''}
                  </Text>
                  {ex.notes ? <Text muted style={{ fontSize: 13, lineHeight: 18 }} numberOfLines={1}>{ex.notes}</Text> : null}
                </Pressable>
                <MoreButton size="sm" onPress={() => exerciseMenu(ex)} />
              </View>
            ))}
            <GroupRow icon={Plus} title="Adicionar exercício" accessibilityLabel="Adicionar exercício" onPress={() => picker.open(activeDay.id)} />
          </Group>
        </>
      ) : (
        <Group>
          <GroupRow icon={Dumbbell} title="Este plano ainda não tem treinos" />
        </Group>
      )}

      {renaming && <RenameDialog target={renaming} onClose={() => setRenaming(null)} />}
      {(editing || addition) && activeDay && (
        <ExerciseFormSheet
          key={editing?.id ?? addition?.entry?.id ?? 'custom'}
          dayId={activeDay.id}
          exercise={editing}
          libraryExercise={addition?.entry}
          onClose={() => {
            if (addition) {
              setActiveDayId(addition.dayId);
              picker.clear();
            }
            setEditing(null);
          }}
          onSaved={reload}
        />
      )}
    </Page>
  );
}

type RenameTarget = { kind: 'plan' | 'day'; id: string; name: string };

/** Renames the plan or the selected workout ("Treino A – Peito e Tríceps"). */
function RenameDialog({ target, onClose }: { target: RenameTarget; onClose: () => void }) {
  const rename = useRenameWorkout();
  const [name, setName] = useState(target.name);
  const trimmed = name.trim();
  const save = async () => {
    if (!trimmed || rename.isPending) return;
    if (trimmed === target.name) { onClose(); return; }
    try {
      await rename.mutateAsync({ kind: target.kind, id: target.id, name: trimmed });
      onClose();
    } catch (e) {
      AppAlert.alert('Não foi possível renomear.', errorMessage(e));
    }
  };
  return (
    <Dialog visible onClose={onClose} title={target.kind === 'plan' ? 'Renomear plano' : 'Renomear treino'}>
      <Input label="Nome" value={name} onChangeText={setName} maxLength={80} autoFocus
        returnKeyType="done" onSubmitEditing={save} />
      <Row style={{ gap: Spacing.three }}>
        <Button title="Salvar" onPress={save} disabled={!trimmed} loading={rename.isPending} style={{ flex: 1 }} />
      </Row>
    </Dialog>
  );
}
