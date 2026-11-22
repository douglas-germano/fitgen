import { AppAlert } from '@/lib/feedback';
import { QueryError ,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ListItem,
  Page,
  PageSkeleton,
  Row,
  Text,
  TopBar,
  type DialogHandle,
} from '@/components/ui';
import { router, useFocusEffect } from 'expo-router';
import { BookOpen, Check, ClipboardList, Dumbbell, Flame, History, Moon, Play, Route, Sparkles, Timer } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { OutdoorCard, RecordsCard } from '@/components/workout-cards';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { useActiveSession, useActiveWorkoutPlan, useGenerateWorkout, useStreaks, useWorkoutHistory } from '@/hooks/queries';
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
import { ExerciseThumbnail } from '@/components/exercise-thumbnail';

export default function WorkoutsScreen() {
  const Colors = useColors();
  const { width } = useWindowDimensions();
  // Six thumbnails fill the content width (page gutters are Spacing.five).
  const thumbSize = Math.min(56, Math.floor((width - Spacing.five * 2 - Spacing.two * 5) / 6));
  const { plan, isLoading, refetch, error } = useActiveWorkoutPlan();
  const history = useWorkoutHistory();
  const active = useActiveSession();
  const streak = useStreaks().data?.workout_streak ?? 0;
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
    .filter((s) => !s.from_health && !s.outdoor_type && isSameDay(new Date(s.started_at), new Date()))
    .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
  const activeSession = active.data ?? null;
  const next = nextWorkout(plan);
  const start = (day: WorkoutDay) => {
    if (plan) router.push(`/workout/${plan.id}/play/${day.id}`);
  };
  const resume = () => activeSession && router.push(`/workout/${activeSession.plan_id}/play/${activeSession.workout_day_id}`);

  const lastOutdoor = sessions
    .filter((s) => s.outdoor_type)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];

  // Elapsed time is known; the API does not define a fixed plan duration.
  const weeks = weeksSince(plan?.created_at);
  const cells = weekCells(plan, sessions.filter((session) => !session.outdoor_type));

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

      <OutdoorCard last={lastOutdoor} />

      {!plan ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhum plano ativo"
          message="A IA pode criar um plano personalizado para você agora mesmo."
          action={<Button size="sm" title="Gerar Plano" onPress={confirmGenerate} loading={generate.isPending} />}
        />
      ) : (
        <>
          <View style={{ gap: Spacing.four }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Text variant="label" color={Colors.voltInk}>Treino de hoje</Text>
              <Text variant="label" muted>{formatLongDate(new Date(), false)}</Text>
            </Row>

            {today && todaySession ? (
              <>
                {/* Already trained today. */}
                <View style={{ gap: Spacing.two }}>
                  <Badge label="Concluído" tone="soft" />
                  <Text variant="display" accessibilityRole="header">{workoutTitle(today)}</Text>
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
                  <Text variant="display" accessibilityRole="header">{workoutTitle(today)}</Text>
                  <Text muted style={{ fontSize: 15, lineHeight: 22 }}>
                    {today.exercises.length} {today.exercises.length === 1 ? 'exercício' : 'exercícios'} · {workoutMinutes(today)} min
                  </Text>
                </View>
                {!activeSession && <Button title="Ver treino" onPress={() => start(today)} />}
                {/* A strip of exercise images instead of a text list: the full list is one tap away. */}
                <Row style={{ gap: Spacing.two }}>
                  {today.exercises.slice(0, today.exercises.length > 6 ? 5 : 6).map((ex) => (
                    <ExerciseThumbnail key={ex.id} exercise={ex} size={thumbSize} />
                  ))}
                  {today.exercises.length > 6 && (
                    <View style={{ width: thumbSize, height: thumbSize, borderRadius: Radius.sm, borderCurve: 'continuous', backgroundColor: Colors.surfaceChip, alignItems: 'center', justifyContent: 'center' }}>
                      <Text variant="titleSm" muted>+{today.exercises.length - 5}</Text>
                    </View>
                  )}
                </Row>
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
                    caption={`${next.day.exercises.length} exercícios · ${workoutMinutes(next.day)} min`}
                  />
                )}
                <Button variant="soft" title="Treinar mesmo assim" onPress={() => setPickerOpen(true)} />
              </>
            )}
          </View>

          <WeekStrip cells={cells} streak={streak} />
        </>
      )}

      <RecordsCard />

    </Page>
    <FloatingAddButton
      tone="neutral"
      label="Ações de treino"
      hint="Abre as opções de treino"
      busy={generate.isPending}
      onPress={() => setActionsOpen(true)}
    />
    <ActionMenu
      visible={actionsOpen}
      title="Ações de treino"
      compact
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
        {
          key: 'outdoor', icon: Route,
          title: 'Atividade ao ar livre',
          caption: 'Corrida, caminhada e pedal com GPS',
          onPress: () => router.push('/outdoor'),
        },
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
function WeekStrip({ cells, streak }: { cells: WeekCell[]; streak: number }) {
  const Colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  const wrap = width / Math.max(1, fontScale) < 266;
  const planned = cells.filter((c) => c.day).length;
  const trained = cells.filter((c) => c.done).length;
  return (
    <View style={{ gap: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, paddingTop: Spacing.four }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', rowGap: Spacing.one }}>
        <Text variant="titleMd" accessibilityRole="header">Esta semana</Text>
        <Row style={{ gap: Spacing.three }}>
          {streak > 1 && (
            <Row style={{ gap: 4 }} accessible accessibilityLabel={`Sequência de ${streak} dias de treino`}>
              <Flame size={15} color={Colors.voltInk} fill={Colors.voltInk} />
              <Text variant="label" color={Colors.voltInk} style={{ fontWeight: '700' }}>{streak} dias</Text>
            </Row>
          )}
          <Text variant="label" muted>{trained} de {planned} {planned === 1 ? 'treino' : 'treinos'}</Text>
        </Row>
      </Row>
      <Row style={{ gap: Spacing.one, flexWrap: wrap ? 'wrap' : 'nowrap' }}>
        {cells.map((c) => {
          const state = c.done ? 'concluído' : c.day ? 'treino planejado' : 'descanso';
          return (
            <View
              key={c.date.toISOString()}
              accessible
              accessibilityLabel={`${WEEKDAY_LONG[c.date.getDay()]}${c.today ? ', hoje' : ''}: ${state}${c.day ? `, ${workoutTitle(c.day)}` : ''}`}
              style={{ flex: wrap ? undefined : 1, flexBasis: wrap ? '23%' : undefined, alignItems: 'center', gap: Spacing.two }}>
              <Text variant="caption" color={c.today ? Colors.ink : Colors.inkMuted} style={c.today && { fontWeight: '700' }}>
                {c.weekday}
              </Text>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.done ? Colors.voltSoft : c.day ? Colors.surfaceSunken : 'transparent',
                  borderWidth: c.today ? 2 : 0,
                  borderColor: Colors.ink,
                }}>
                {c.done ? (
                  <Check size={16} strokeWidth={2.5} color={Colors.voltInk} />
                ) : c.day ? (
                  <Dumbbell size={16} color={c.today ? Colors.ink : Colors.inkMuted} />
                ) : (
                  <Text variant="caption">–</Text>
                )}
              </View>
              <Text variant="caption">
                {c.date.getDate()}
              </Text>
            </View>
          );
        })}
      </Row>
    </View>
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
          caption={`${d.exercises.length} exercícios · ${workoutMinutes(d)} min`}
          onPress={disabled ? undefined : () => { sheet.current?.dismiss(); onPick(d); }}
        />
      ))}
    </Dialog>
  );
}
