import { AppAlert } from '@/lib/feedback';
import { QueryError ,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ListItem,
  Page,
  PageSkeleton,
  Row,
  SectionHeader,
  Text,
  TopBar,
  type DialogHandle,
} from '@/components/ui';
import { router, useFocusEffect } from 'expo-router';
import { BarChart3, BookOpen, Check, ClipboardList, Dumbbell, History, Moon, Play, Sparkles, Timer } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { WeekChart } from '@/components/charts';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { useActiveSession, useActiveWorkoutPlan, useGenerateWorkout, useWorkoutHistory } from '@/hooks/queries';
import { errorMessage, isPremiumRequired } from '@/lib/api';
import {
  formatLongDate,
  isSameDay,
  nextWorkout,
  relativeDayLabel,
  sortedDays,
  todaysWorkout,
  weekCells,
  weeksSince,
  workoutMinutes,
  workoutTitle,
  DAY_LABELS,
  WEEKDAY_LONG,
  type WeekCell,
} from '@/lib/workout';
import type { WorkoutDay, WorkoutPlan } from '@/types/api';
import { usePremium } from '@/hooks/use-premium';
import { muscleLabel } from '@/lib/exercise-library';
import { ExerciseThumbnail } from '@/components/exercise-thumbnail';

export default function WorkoutsScreen() {
  const Colors = useColors();
  const { plan, isLoading, refetch, error } = useActiveWorkoutPlan();
  const history = useWorkoutHistory();
  const active = useActiveSession();
  const generate = useGenerateWorkout();
  const { locked, requirePremium } = usePremium();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // A session left open elsewhere (or just finished) must show up when the tab regains focus.
  const refetchActive = active.refetch;
  useFocusEffect(useCallback(() => { void refetchActive(); }, [refetchActive]));

  // The first plan is free; replacing it is a Premium (AI) feature.
  const confirmGenerate = () => (plan && !requirePremium('workout_plan')) ? undefined :
    AppAlert.alert(
      'Gerar novo plano?',
      'Isso substituirá seu plano atual por um novo gerado pela IA. O progresso do plano atual será arquivado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar Plano',
          onPress: () =>
            generate.mutate(undefined, {
              onError: (e) => { if (!isPremiumRequired(e)) AppAlert.alert('Erro ao gerar plano.', errorMessage(e)); },
            }),
        },
      ],
    );

  const topBar = <TopBar title="Meus Treinos" />;
  if (isLoading || history.isLoading) return <PageSkeleton title="Meus Treinos" />;

  if (error || history.error) return <QueryError title="Meus Treinos" tab error={error ?? history.error} onRetry={() => { refetch(); history.refetch(); }} />;

  const today = todaysWorkout(plan);
  const sessions = history.data ?? [];
  const todaySession = sessions
    .filter((s) => !s.from_health && isSameDay(new Date(s.started_at), new Date()))
    .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
  const activeSession = active.data ?? null;
  const next = nextWorkout(plan);
  const start = (day: WorkoutDay) => {
    if (plan) router.push(`/workout/${plan.id}/play/${day.id}`);
  };
  const resume = () => activeSession && router.push(`/workout/${activeSession.plan_id}/play/${activeSession.workout_day_id}`);

  // Minutes per training day, last 6 days with sessions.
  const byDay = new Map<string, { ts: number; minutes: number }>();
  for (const s of sessions) {
    const d = new Date(s.started_at);
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const entry = byDay.get(key) ?? { ts: d.getTime(), minutes: 0 };
    entry.minutes += Math.round(s.duration_seconds / 60);
    byDay.set(key, entry);
  }
  const chart = [...byDay.entries()]
    .sort((a, b) => a[1].ts - b[1].ts)
    .slice(-6)
    .map(([label, { minutes }]) => ({ label, value: minutes }));

  // Elapsed time is known; the API does not define a fixed plan duration.
  const weeks = weeksSince(plan?.created_at);
  const cells = weekCells(plan, sessions);

  // The session is re-fetched whenever the tab regains focus, so the snapshot is fresh enough.
  const activeMinutes = activeSession ? Math.floor(activeSession.elapsed_seconds / 60) : 0;

  return (
    <View style={{ flex: 1 }}>
    <Page
      tab
      topBar={topBar}
      // Room for the floating "+" so it never covers the chart.
      contentStyle={{ paddingBottom: FAB_CLEARANCE }}
      refreshing={history.isRefetching}
      onRefresh={() => {
        refetch();
        history.refetch();
        active.refetch();
      }}>
      {/* A session left in progress: one clear way back into it. */}
      {activeSession && (
        <Pressable
          onPress={resume}
          accessibilityRole="button"
          accessibilityLabel={`Treino em andamento há ${activeMinutes} minutos. Retomar`}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.three,
            padding: Spacing.four,
            borderRadius: Radius.md,
            borderCurve: 'continuous',
            backgroundColor: pressed ? Colors.voltStrong : Colors.volt,
          })}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.onVolt, alignItems: 'center', justifyContent: 'center' }}>
            <Timer size={20} color={Colors.volt} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="titleSm" color={Colors.onVolt}>Treino em andamento</Text>
            <Text variant="caption" color="rgba(17,18,20,0.75)">
              {activeMinutes < 1 ? 'Iniciado agora' : `Iniciado há ${activeMinutes} min`} · toque para retomar
            </Text>
          </View>
          <Play size={20} color={Colors.onVolt} fill={Colors.onVolt} />
        </Pressable>
      )}

      {!plan ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhum plano ativo"
          message="A IA pode criar um plano personalizado para você agora mesmo."
          action={<Button size="sm" title="Gerar Plano" onPress={confirmGenerate} loading={generate.isPending} />}
        />
      ) : (
        <>
          <Card style={{ gap: Spacing.four }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600' }}>Treino de Hoje</Text>
              <Text variant="caption">{formatLongDate(new Date(), false)}</Text>
            </Row>

            {today && todaySession ? (
              <>
                {/* Already trained today. */}
                <View style={{ gap: Spacing.two }}>
                  <Badge label="Concluído" tone="soft" />
                  <Text variant="display">{workoutTitle(today)}</Text>
                  <Text muted>
                    {Math.max(1, Math.round(todaySession.duration_seconds / 60))} min
                    {todaySession.calories ? ` · ${Math.round(todaySession.calories)} kcal` : ''} · bom trabalho!
                  </Text>
                </View>
                <Button variant="soft" title="Escolher outro treino" onPress={() => setPickerOpen(true)} />
              </>
            ) : today ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text variant="display">{workoutTitle(today)}</Text>
                  <Text muted>
                    {today.exercises.length} exercícios · ~{workoutMinutes(today)} min · {today.muscle_groups?.map(muscleLabel).join(', ') || today.focus}
                  </Text>
                </View>
                <View style={{ gap: Spacing.two }}>
                  {today.exercises.slice(0, 3).map((ex) => (
                    <Row
                      key={ex.id}
                      style={{ gap: Spacing.three, paddingVertical: 10, paddingHorizontal: Spacing.three, backgroundColor: Colors.surface, borderRadius: Radius.sm }}>
                      <ExerciseThumbnail exercise={ex} />
                      <Text variant="titleSm" style={{ flex: 1 }} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Text variant="caption">
                        {ex.sets} × {ex.reps}
                      </Text>
                    </Row>
                  ))}
                  {today.exercises.length > 3 && (
                    <Text variant="caption" style={{ paddingHorizontal: Spacing.three }}>
                      + {today.exercises.length - 3} exercícios
                    </Text>
                  )}
                </View>
                {/* With a session open, the banner above is the single way in. */}
                {!activeSession && <Button title={`Ver Treino · ${workoutTitle(today)}`} onPress={() => start(today)} />}
              </>
            ) : (
              <>
                {/* Rest day: say what comes next instead of leaving a dead end. */}
                <View style={{ gap: 4 }}>
                  <Row style={{ gap: Spacing.two }}>
                    <Moon size={22} color={Colors.ink} />
                    <Text variant="display">Dia de Descanso</Text>
                  </Row>
                  <Text muted>Aproveite para recuperar suas energias.</Text>
                </View>
                {next && (
                  <ListItem
                    icon={Dumbbell}
                    iconTone="chip"
                    title={`${relativeDayLabel(next.date)} · ${workoutTitle(next.day)}`}
                    caption={`${next.day.exercises.length} exercícios · ~${workoutMinutes(next.day)} min`}
                  />
                )}
                <Button variant="soft" title="Treinar mesmo assim" onPress={() => setPickerOpen(true)} />
              </>
            )}
          </Card>

          <WeekStrip cells={cells} />
        </>
      )}

      {/* Duration chart */}
      <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Duração dos Treinos:" />
        {chart.length ? (
          <WeekChart data={chart} formatTick={(v) => `${Math.round(v)}m`} accessibilityLabel="Minutos por treino nos últimos dias" />
        ) : (
          <EmptyState icon={BarChart3} message="Nenhum treino registrado ainda." />
        )}
      </View>

    </Page>
    <FloatingAddButton
      label="Ações de treino"
      hint="Abre as opções de treino"
      busy={generate.isPending}
      onPress={() => setActionsOpen(true)}
    />
    <ActionMenu
      visible={actionsOpen}
      title="O que você quer fazer?"
      onClose={() => setActionsOpen(false)}
      items={[
        ...(activeSession ? [{
          key: 'resume', icon: Play, tone: 'volt' as const,
          title: 'Retomar treino em andamento',
          caption: activeMinutes < 1 ? 'Iniciado agora' : `Iniciado há ${activeMinutes} min`,
          onPress: resume,
        }] : plan && today && !todaySession ? [{
          key: 'start', icon: Play, tone: 'volt' as const,
          title: 'Abrir treino de hoje',
          caption: `${workoutTitle(today)} · ${today.exercises.length} exercícios`,
          onPress: () => start(today),
        }] : []),
        ...(plan ? [{
          key: 'plan', icon: ClipboardList,
          title: 'Ver plano de treino',
          caption: [plan.name, `${plan.days?.length ?? 0}× por semana`, weeks === null ? null : `${weeks + 1}ª semana`].filter(Boolean).join(' · '),
          onPress: () => router.push(`/workout/${plan.id}`),
        }] : []),
        {
          key: 'generate', icon: Sparkles, tone: plan ? 'chip' : 'volt',
          title: plan ? 'Gerar novo treino com IA' : 'Gerar plano de treino com IA',
          caption: plan ? (locked('workout_plan') ? 'Premium · substitui o plano atual' : 'Substitui o plano atual') : 'Um plano personalizado para você',
          onPress: confirmGenerate,
        },
        { key: 'library', icon: BookOpen, title: 'Biblioteca de exercícios', caption: 'Como fazer, dicas e erros comuns', onPress: () => router.push('/exercises') },
        { key: 'history', icon: History, title: 'Histórico de treinos', caption: 'Sessões e tempo de treino', onPress: () => router.push('/workout/history') },
      ]}
    />
    {plan && pickerOpen && (
      <WorkoutPicker plan={plan} disabled={!!activeSession} onClose={() => setPickerOpen(false)} onPick={start} />
    )}
    </View>
  );
}

/** Monday → Sunday: trained (volt check), planned (dumbbell), rest (dash). Today is outlined. */
function WeekStrip({ cells }: { cells: WeekCell[] }) {
  const Colors = useColors();
  const planned = cells.filter((c) => c.day).length;
  const trained = cells.filter((c) => c.done).length;
  return (
    <Card style={{ gap: Spacing.four }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600' }}>Esta Semana</Text>
        <Text variant="caption">{trained} de {planned} treinos</Text>
      </Row>
      <Row style={{ gap: Spacing.one }}>
        {cells.map((c) => {
          const state = c.done ? 'concluído' : c.day ? 'treino planejado' : 'descanso';
          return (
            <View
              key={c.date.toISOString()}
              accessible
              accessibilityLabel={`${WEEKDAY_LONG[c.date.getDay()]}${c.today ? ', hoje' : ''}: ${state}${c.day ? `, ${workoutTitle(c.day)}` : ''}`}
              style={{ flex: 1, alignItems: 'center', gap: Spacing.two }}>
              <Text variant="caption" color={c.today ? Colors.ink : Colors.inkMuted} style={c.today && { fontWeight: '700' }}>
                {c.weekday}
              </Text>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.done ? Colors.volt : c.day ? Colors.surface : 'transparent',
                  borderWidth: c.today ? 2 : 0,
                  borderColor: Colors.ink,
                }}>
                {c.done ? (
                  <Check size={18} strokeWidth={3} color={Colors.onVolt} />
                ) : c.day ? (
                  <Dumbbell size={16} color={c.today ? Colors.ink : Colors.inkMuted} />
                ) : (
                  <Text variant="caption">–</Text>
                )}
              </View>
              <Text variant="caption" numberOfLines={1} style={{ fontSize: 10, lineHeight: 13 }}>
                {c.date.getDate()}
              </Text>
            </View>
          );
        })}
      </Row>
    </Card>
  );
}

/** Bottom sheet to train a day other than today's. */
function WorkoutPicker({ plan, disabled, onClose, onPick }: {
  plan: WorkoutPlan;
  disabled: boolean;
  onClose: () => void;
  onPick: (day: WorkoutDay) => void;
}) {
  const sheet = useRef<DialogHandle>(null);
  const days = sortedDays(plan).filter((d) => d.exercises.length > 0);
  return (
    <Dialog
      ref={sheet}
      sheet
      visible
      onClose={onClose}
      title="Qual treino?"
      description={disabled ? 'Finalize ou retome o treino em andamento antes de iniciar outro.' : 'Escolha o treino que você quer fazer agora.'}>
      {days.map((d) => (
        <ListItem
          key={d.id}
          icon={Dumbbell}
          iconTone="chip"
          title={`${DAY_LABELS[d.day_of_week] ?? d.day_of_week} · ${workoutTitle(d)}`}
          caption={`${d.exercises.length} exercícios · ~${workoutMinutes(d)} min`}
          onPress={disabled ? undefined : () => { sheet.current?.dismiss(); onPick(d); }}
        />
      ))}
    </Dialog>
  );
}
