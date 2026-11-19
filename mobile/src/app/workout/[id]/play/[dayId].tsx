import { track } from '@/lib/analytics';
import { AppAlert, AppActionSheet } from '@/lib/feedback';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUpRight, ChevronRight, Dumbbell, Flame, Heart, Play, Plus, Timer } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Confetti } from '@/components/confetti';
import { ExerciseFormSheet } from '@/components/exercise-form-sheet';
import { ExerciseThumbnail } from '@/components/exercise-thumbnail';
import {
  Button,
  EmptyState,
  IconButton,
  ListItem,
  MetricTile,
  MoreButton,
  ProgressBar,
  QueryError,
  Row,
  Text,
  TopBar,
} from '@/components/ui';
import { clock, defaultSets, RestCard, SetsSheet, volumeOf, type SetEntry } from '@/components/workout-session';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { Motion } from '@/constants/motion';
import { useActiveSession, useStreaks, useWorkoutPlan } from '@/hooks/queries';
import { saveWorkoutToHealth } from '@/lib/health';
import { api, ApiError, errorMessage } from '@/lib/api';
import { exerciseLine, formatInt, workoutMinutes, workoutTitle } from '@/lib/workout';
import type { Exercise } from '@/types/api';

/** Rough strength-training burn used for the final estimate (kcal per minute). */
const KCAL_PER_MIN = 6;

/** Keeps the screen on while mounted — nobody wants the phone to lock between sets. */
function KeepAwake() {
  useKeepAwake();
  return null;
}

/**
 * The workout: the exercise list is the hub. Before "Iniciar" it is a preview (edit the list, see the
 * estimate); after it, tap any exercise — in any order — to log its sets in the card that rises.
 */
export default function WorkoutScreen() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const { data: plan, isLoading, error, refetch } = useWorkoutPlan(id);
  const active = useActiveSession();
  const day = plan?.days?.find((d) => d.id === dayId);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, SetEntry[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Index of an already finished set being corrected (in the open exercise), or null. */
  const [editing, setEditing] = useState<number | null>(null);
  const [formFor, setFormFor] = useState<Exercise | 'new' | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  /** Wall-clock end of the rest, so the countdown survives the app being backgrounded. */
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState<{ duration: number; calories: number } | null>(null);
  const restored = useRef(false);
  const startedAt = useRef<number | null>(null);

  // A session already open for this very workout (left earlier, or opened from the banner) resumes in place.
  useEffect(() => {
    const open = active.data;
    if (!day || !open || open.workout_day_id !== day.id || restored.current || finished) return;
    restored.current = true;
    startedAt.current = Date.now() - open.elapsed_seconds * 1000;
    setSessionId(open.session_id);
    setElapsed(open.elapsed_seconds);
    setLogs(
      Object.fromEntries(
        day.exercises.map((ex) => [
          ex.id,
          defaultSets(ex).map((entry, i) => {
            const saved = open.logs.find((log) => log.exercise_id === ex.id && log.set_number === i + 1);
            return saved ? { weight: String(saved.weight_used_kg ?? 0), reps: String(saved.reps_done ?? 0), done: true } : entry;
          }),
        ]),
      ),
    );
  }, [active.data, day, finished]);

  // Session clock + rest countdown.
  useEffect(() => {
    if (finished || !sessionId) return;
    const t = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000)));
      if (restEnd !== null) {
        const left = Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
        setRestLeft(left);
        if (left === 0) {
          setRestEnd(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    }, 1000);
    return () => clearInterval(t);
  }, [finished, sessionId, restEnd]);

  const exercises = day?.exercises ?? [];
  const setsFor = (ex: Exercise) => logs[ex.id] ?? defaultSets(ex);
  const started = !!sessionId;
  // A different workout is still open: it must be resumed or finished before this one can start.
  const other = active.data && day && active.data.workout_day_id !== day.id ? active.data : null;

  if (error) return <QueryError title="Treino" back error={error} onRetry={refetch} />;

  if (isLoading || !day) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', gap: Spacing.four }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.inkMuted} />
        ) : (
          <>
            <Text muted>Treino não encontrado.</Text>
            <Button variant="soft" title="Voltar" onPress={() => router.back()} />
          </>
        )}
      </View>
    );
  }

  const allSets = exercises.flatMap(setsFor);
  const doneCount = allSets.filter((s) => s.done).length;
  const progress = allSets.length ? Math.round((doneCount / allSets.length) * 100) : 0;
  const volume = volumeOf(allSets);
  const selected = exercises.find((e) => e.id === selectedId);
  const reload = () => queryClient.invalidateQueries({ queryKey: ['workout', id] });

  if (finished) {
    const fullLogs = Object.fromEntries(exercises.map((ex) => [ex.id, setsFor(ex)]));
    return <WorkoutDone name={workoutTitle(day)} stats={finished} logs={fullLogs} />;
  }

  // ---------- rest ----------
  const startRest = (seconds: number) => {
    setRestTotal(seconds);
    setRestLeft(seconds);
    setRestEnd(Date.now() + seconds * 1000);
  };
  const skipRest = () => {
    setRestEnd(null);
    setRestLeft(0);
  };
  const adjustRest = (delta: number) => {
    if (restEnd === null) return;
    const end = restEnd + delta * 1000;
    setRestEnd(end);
    setRestTotal((t) => Math.max(1, t + delta));
    setRestLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
  };

  // ---------- session ----------
  const start = async () => {
    if (sessionId || starting || !exercises.length) return;
    setStarting(true);
    try {
      const res = await api<{ session_id: string }>('/exercises/sessions/start', { method: 'POST', body: { workout_day_id: day.id } });
      restored.current = true;
      startedAt.current = Date.now();
      setElapsed(0);
      setSessionId(res.session_id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      queryClient.invalidateQueries({ queryKey: ['workout-active-session'] });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Already open: the effect above resumes it if it is this workout, otherwise the banner explains.
        const open = (await active.refetch()).data;
        if (open && open.workout_day_id !== day.id) AppAlert.alert('Há um treino em andamento', 'Retome ou finalize essa sessão antes de iniciar outro treino.');
      } else {
        AppAlert.alert('Erro ao iniciar treino.', errorMessage(e));
      }
    } finally {
      setStarting(false);
    }
  };

  const updateSet = (ex: Exercise, i: number, patch: Partial<SetEntry>) =>
    setLogs((prev) => ({ ...prev, [ex.id]: (prev[ex.id] ?? defaultSets(ex)).map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));

  /** Validates and sends one set. An empty weight counts as bodyweight (0 kg). */
  const submitSet = async (ex: Exercise, setIndex: number): Promise<boolean> => {
    if (saving || finishing) return false;
    const entry = setsFor(ex)[setIndex];
    const reps = parseInt(entry.reps, 10);
    const weight = entry.weight.trim() === '' ? 0 : parseFloat(entry.weight.replace(',', '.'));
    if (!Number.isInteger(reps) || reps <= 0 || !Number.isFinite(weight) || weight < 0) {
      AppAlert.alert('Informe as repetições', 'Use o + e o − para ajustar o peso e as repetições da série.');
      return false;
    }
    if (!sessionId) {
      AppAlert.alert('Sessão ainda não iniciada', 'Aguarde um instante e tente novamente.');
      return false;
    }
    setSaving(true);
    try {
      await api(`/exercises/sessions/${sessionId}/log-set`, {
        method: 'POST',
        body: { exercise_id: ex.id, set_number: setIndex + 1, reps_done: reps, weight_used_kg: weight },
      });
      return true;
    } catch (e) {
      AppAlert.alert('Erro ao salvar série.', errorMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const completeSet = async (ex: Exercise) => {
    const sets = setsFor(ex);
    const current = sets.findIndex((s) => !s.done);
    if (current === -1) return;
    const entry = sets[current];
    if (!(await submitSet(ex, current))) return;
    setLogs((prev) => ({
      ...prev,
      // The next untouched set inherits this set's weight AND reps — same load is the common case.
      [ex.id]: (prev[ex.id] ?? defaultSets(ex)).map((s, i) =>
        i === current ? { ...s, done: true } : i === current + 1 && !s.weight ? { ...s, weight: entry.weight, reps: entry.reps } : s,
      ),
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // No rest after the very last set of the workout.
    const lastOfWorkout = doneCount + 1 === allSets.length;
    if (ex.rest_seconds && !lastOfWorkout) startRest(ex.rest_seconds);
  };

  const saveEdit = async (ex: Exercise) => {
    if (editing === null) return;
    if (!(await submitSet(ex, editing))) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(null);
  };

  const finish = async () => {
    if (!sessionId || finishing || saving) return;
    setFinishing(true);
    try {
      const res = await api<{ duration?: number; calories?: number }>(`/exercises/sessions/${sessionId}/finish`, {
        method: 'PUT',
        body: { notes: 'Treino finalizado via App' },
      });
      queryClient.invalidateQueries({ queryKey: ['workout-history'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-history'] });
      queryClient.invalidateQueries({ queryKey: ['workout-active-session'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-progress'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const stats = { duration: res.duration ?? elapsed, calories: Math.round(res.calories ?? (elapsed / 60) * KCAL_PER_MIN) };
      void saveWorkoutToHealth({ durationSeconds: stats.duration, calories: stats.calories, name: workoutTitle(day) });
      track('workout_completed', { duration_min: Math.round(stats.duration / 60) });
      setSelectedId(null);
      setFinished(stats);
    } catch (e) {
      AppAlert.alert('Erro ao finalizar treino.', errorMessage(e));
    } finally {
      setFinishing(false);
    }
  };

  const confirmFinish = () =>
    AppAlert.alert(
      'Finalizar Treino?',
      doneCount < allSets.length
        ? `Você registrou ${doneCount} de ${allSets.length} séries. Deseja finalizar mesmo assim?`
        : 'Todas as séries foram registradas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Finalizar', onPress: finish },
      ],
    );

  const confirmLeave = () =>
    AppAlert.alert('Sair do treino?', 'As séries já registradas ficam salvas. Você pode retomar o treino pela tela de Treinos.', [
      { text: 'Continuar treinando', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => router.back() },
    ]);

  // ---------- plan editing (before starting) ----------
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
        (i) => (i === 0 ? setFormFor(ex) : i === 1 ? remove(ex) : undefined),
      );
    } else {
      AppAlert.alert(ex.name, undefined, [
        { text: 'Editar', onPress: () => setFormFor(ex) },
        { text: 'Remover', style: 'destructive', onPress: () => remove(ex) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  const allDone = started && allSets.length > 0 && doneCount === allSets.length;
  const showRest = started && restLeft > 0 && !selected;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface, paddingTop: insets.top + Spacing.three }}>
      {started && <KeepAwake />}
      <View style={{ paddingHorizontal: Spacing.five }}>
        <TopBar
          title={workoutTitle(day)}
          back={!started}
          onBack={started ? confirmLeave : undefined}
          actionWidth={started ? 92 : undefined}
          action={
            started ? (
              <Button size="sm" variant="soft" title="Finalizar" onPress={confirmFinish} disabled={finishing} />
            ) : (
              // The list is only editable before starting: set counts are fixed once a session is open.
              <IconButton icon={Plus} label="Adicionar exercício" variant="volt" onPress={() => setFormFor('new')} />
            )
          }
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.five, gap: Spacing.five }} keyboardShouldPersistTaps="handled">
        {other && !started && (
          <ListItem
            icon={Timer}
            title="Há um treino em andamento"
            caption="Retome essa sessão antes de iniciar outro treino."
            arrow
            onPress={() => router.replace(`/workout/${other.plan_id}/play/${other.workout_day_id}`)}
          />
        )}

        {/* Duration · volume · sets */}
        <View style={{ gap: Spacing.three }}>
          <Row style={{ paddingBottom: Spacing.three, borderBottomWidth: 1, borderBottomColor: Colors.line }}>
            <Stat label={started ? 'Duração' : 'Estimada'} value={started ? clock(elapsed) : `${workoutMinutes(day)} min`} />
            <Stat label="Volume" value={`${formatInt(volume)} kg`} />
            <Stat label="Séries" value={started ? `${doneCount}/${allSets.length}` : String(allSets.length)} />
          </Row>
          {started && <ProgressBar value={progress} knob />}
        </View>

        {exercises.length === 0 && <EmptyState icon={Dumbbell} message="Nenhum exercício neste treino." />}

        <View style={{ gap: Spacing.two }}>
          {exercises.map((ex) => {
            const sets = setsFor(ex);
            const done = sets.filter((s) => s.done).length;
            const complete = started && done === sets.length;
            return (
              <View
                key={ex.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  padding: Spacing.three,
                  paddingRight: Spacing.four,
                  borderRadius: Radius.md,
                  borderCurve: 'continuous',
                  backgroundColor: Colors.surfaceSunken,
                }}>
                <ExerciseThumbnail exercise={ex} />
                <Pressable
                  onPress={() => { setEditing(null); setSelectedId(ex.id); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${ex.name}, ${exerciseLine(ex)}${started ? `, ${done} de ${sets.length} séries feitas` : ''}`}
                  accessibilityHint="Abre as séries do exercício"
                  style={({ pressed }) => ({
                    flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center',
                    gap: Spacing.two, opacity: pressed ? 0.65 : 1,
                  })}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="titleSm" style={{ fontSize: 15 }} numberOfLines={2}>{ex.name}</Text>
                    <Text variant="caption" style={{ fontSize: 12 }} numberOfLines={1}>
                      {exerciseLine(ex)}{ex.muscle_group ? ` · ${ex.muscle_group}` : ''}
                    </Text>
                  </View>
                  {started && (
                    <Text variant="label" color={complete ? Colors.voltInk : Colors.inkMuted} style={{ fontVariant: ['tabular-nums'], fontWeight: '700' }}>
                      {done}/{sets.length}
                    </Text>
                  )}
                  <ChevronRight size={18} color={Colors.inkMuted} />
                </Pressable>
                {!started && <MoreButton size="sm" onPress={() => exerciseMenu(ex)} />}
              </View>
            );
          })}

        </View>
      </ScrollView>

      {(!started || showRest || allDone) && (
        <View style={{ paddingHorizontal: Spacing.five, paddingTop: Spacing.three, paddingBottom: insets.bottom + Spacing.three, gap: Spacing.three }}>
          {!started && (
            <Button size="lg" icon={Play} title="Iniciar Treino" onPress={start} loading={starting}
              disabled={starting || !!other || !exercises.length} />
          )}
          {showRest && <RestCard restLeft={restLeft} restTotal={restTotal} onAdjust={adjustRest} onSkip={skipRest} />}
          {allDone && <Button size="lg" title="Finalizar Treino" onPress={finish} loading={finishing} />}
        </View>
      )}

      {selected && (
        <SetsSheet
          exercise={selected}
          sets={setsFor(selected)}
          started={started}
          editing={editing}
          saving={saving}
          starting={starting}
          restLeft={restLeft}
          restTotal={restTotal}
          onChange={(i, patch) => updateSet(selected, i, patch)}
          onEdit={setEditing}
          onCompleteSet={() => completeSet(selected)}
          onSaveEdit={() => saveEdit(selected)}
          onStart={start}
          onAdjustRest={adjustRest}
          onSkipRest={skipRest}
          onClose={() => { setSelectedId(null); setEditing(null); }}
        />
      )}

      {formFor && <ExerciseFormSheet dayId={day.id} exercise={formFor === 'new' ? null : formFor} onClose={() => setFormFor(null)} onSaved={reload} />}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text variant="caption" style={{ fontSize: 12 }}>{label}</Text>
      <Text style={{ fontSize: 22, lineHeight: 28, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

/** "Treino Concluído" — shown in place of the player after finishing. */
function WorkoutDone({
  name,
  stats,
  logs,
}: {
  name: string;
  stats: { duration: number; calories: number };
  logs: Record<string, SetEntry[]>;
}) {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const streaks = useStreaks();
  const streak = streaks.data?.workout_streak;
  const all = Object.values(logs).flat();
  const done = all.filter((s) => s.done).length;
  const exercisesDone = Object.values(logs).filter((s) => s.some((x) => x.done)).length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface, paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.three }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.five, paddingTop: Spacing.eight * 2, gap: Spacing.six }}>
        <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(Motion.message)} style={{ alignItems: 'center', gap: Spacing.three }}>
          <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.voltSoft, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.volt, alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={34} color={Colors.onVolt} />
            </View>
          </View>
          <Text variant="display" style={{ marginTop: Spacing.five, textAlign: 'center' }}>
            Treino Concluído
          </Text>
          <Text muted style={{ textAlign: 'center', fontSize: 15 }}>
            {name} finalizado.
            {streak ? ` São ${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'} de treino.` : ''}
          </Text>
        </Animated.View>

        <Row style={{ gap: Spacing.four, alignItems: 'stretch' }}>
          <MetricTile icon={Heart} label="Duração" value={Math.max(1, Math.round(stats.duration / 60))} unit="min" caption="Sessão de hoje" />
          <MetricTile icon={Flame} label="Calorias" value={stats.calories} unit="kcal" caption="Estimativa" />
        </Row>

        <ListItem
          icon={ArrowUpRight}
          title={`${done} de ${all.length} séries registradas`}
          caption={`${exercisesDone} ${exercisesDone === 1 ? 'exercício' : 'exercícios'} · progresso salvo no histórico`}
        />
      </ScrollView>

      <View style={{ paddingHorizontal: Spacing.five, gap: Spacing.three }}>
        <Button size="lg" title="Voltar para o Painel" onPress={() => router.dismissTo('/')} />
        <Button size="lg" variant="soft" title="Ver Histórico" onPress={() => router.replace('/workout/history')} />
      </View>
      <Confetti />
    </View>
  );
}
