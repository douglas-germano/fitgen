import { router } from 'expo-router';
import { Droplets, Flame, Footprints, Heart, Trophy, Utensils } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';

import { HealthWeekCard } from '@/components/health-week';
import { OttoAvatar } from '@/components/otto';
import {
  Button,
  Card,
  DayPicker,
  EmptyState,
  ListItem,
  MetricTile,
  OverviewCard,
  Row,
  ScheduleItem,
  SectionHeader,
  Text,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  useActiveWorkoutPlan,
  useDailyNutrition,
  useDashboard,
  useDietPlan,
  useHealthActivity,
  useProfile,
  useStreaks,
} from '@/hooks/queries';
import {
  currentWeek,
  formatInt,
  formatLiters,
  formatLongDate,
  isSameDay,
  todaysWorkout,
  upcomingWorkouts,
  WEEKDAY_SHORT,
  workoutSummary,
  workoutTitle,
} from '@/lib/workout';

export type LogKind = 'meal' | 'water';

const pct = (v: number, goal?: number | null) => (goal ? Math.min((v / goal) * 100, 100) : 0);

/**
 * Data behind the day summary that lives on the Medidas tab (the former home dashboard).
 * The screen owns loading/error/refresh; the sections below only render.
 */
export function useDayDashboard() {
  const queryClient = useQueryClient();
  const profile = useProfile();
  const dashboard = useDashboard();
  const nutrition = useDailyNutrition();
  const diet = useDietPlan();
  const streaks = useStreaks();
  const activity = useHealthActivity();
  const planQuery = useActiveWorkoutPlan();

  const refetch = () => {
    profile.refetch();
    dashboard.refetch();
    nutrition.refetch();
    streaks.refetch();
    activity.refetch();
    void queryClient.invalidateQueries({ queryKey: ['health-week'] });
    void queryClient.invalidateQueries({ queryKey: ['health-summary-weight'] });
    void queryClient.invalidateQueries({ queryKey: ['workout-history'] });
    void queryClient.invalidateQueries({ queryKey: ['health', 'sync'] });
    planQuery.refetch();
  };

  return {
    profile, dashboard, nutrition, diet, streaks, activity,
    plan: planQuery.plan,
    isLoading: dashboard.isLoading || planQuery.isLoading,
    error: dashboard.error ?? planQuery.error,
    isRefetching: dashboard.isRefetching,
    refetch,
  };
}
export type DayDashboard = ReturnType<typeof useDayDashboard>;

/** Day summary, coach, this week's schedule and activity. */
export function DashboardOverview({ d }: { d: DayDashboard }) {
  const stats = d.dashboard.data;
  const plan = d.plan;
  const today = new Date();
  const week = currentWeek();
  const upcoming = upcomingWorkouts(plan, 2);
  const todayWorkout = todaysWorkout(plan);

  const kcal = stats?.nutrition?.calories ?? d.nutrition.data?.totals?.calories ?? 0;
  const water = stats?.hydration?.consumed_ml ?? 0;
  const protein = d.nutrition.data?.totals?.protein ?? 0;
  const proteinGoal = d.diet.data?.macro_targets?.protein;
  const planDays = plan?.days?.length ?? 0;
  const streak = stats?.consistency?.current_streak ?? d.streaks.data?.workout_streak ?? 0;

  const startToday = () => {
    if (plan && todayWorkout) router.push(`/workout/${plan.id}/play/${todayWorkout.id}`);
    else if (plan && upcoming[0]) router.push(`/workout/${plan.id}`);
    else router.push('/workouts');
  };

  return (
    <>
      {d.profile.data?.onboarding_completed === false && <Card>
        <Text variant="titleMd">Complete seu perfil</Text>
        <Text muted>Informe seus objetivos e os dias em que pode treinar para criar seu primeiro plano.</Text>
        <Button title="Configurar meu perfil" onPress={() => router.push('/onboarding')} />
      </Card>}

      <OverviewCard
        icon={Flame}
        title="Resumo do Dia"
        subtitle={plan ? plan.name : 'Sem plano de treino ativo'}
        stats={[
          {
            value: `${formatInt(kcal)} kcal`,
            label: 'Consumidas',
            progress: pct(kcal, stats?.nutrition?.goal),
            onPress: () => router.push('/diet'),
          },
          {
            value: formatLiters(water),
            label: 'Água',
            progress: pct(water, stats?.hydration?.goal_ml),
            onPress: () => router.push('/hydration'),
          },
          {
            value: `${formatInt(protein)} g`,
            label: 'Proteína',
            progress: pct(protein, proteinGoal),
            onPress: () => router.push('/diet'),
          },
        ]}
      />

      <ListItem
        leading={<OttoAvatar size={32} />}
        title="Converse com o Otto"
        caption="Tire dúvidas sobre seu treino e sua dieta"
        onPress={() => router.push('/coach')}
        arrow
      />

      {/* This week */}
      <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Esta Semana:" action="Ver Plano" onAction={() => router.push(plan ? `/workout/${plan.id}` : '/workouts')} />
        <Text variant="label" muted style={{ fontWeight: '400' }}>
          {formatLongDate(today)}
        </Text>
        <DayPicker
          selected={week.find((day) => isSameDay(day, today))?.toDateString() ?? ''}
          days={week.map((day) => ({ key: day.toDateString(), weekday: WEEKDAY_SHORT[day.getDay()], day: String(day.getDate()) }))}
        />
      </View>

      {/* Upcoming workouts */}
      <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Próximos Treinos:" action={upcoming.length ? 'Iniciar' : undefined} onAction={startToday} />
        {upcoming.length ? (
          upcoming.map(({ date, day }) => {
            const isToday = isSameDay(date, today);
            return (
              <ScheduleItem
                key={day.id}
                time={WEEKDAY_SHORT[date.getDay()]}
                period={isToday ? 'Hoje' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                title={workoutTitle(day)}
                subtitle={workoutSummary(day)}
                active={isToday}
                onPress={() =>
                  plan && (isToday ? router.push(`/workout/${plan.id}/play/${day.id}`) : router.push(`/workout/${plan.id}`))
                }
              />
            );
          })
        ) : (
          <EmptyState
            icon={Flame}
            message={plan ? 'Nenhum treino agendado para os próximos dias.' : 'Gere um plano com a IA na aba Treino.'}
          />
        )}
      </View>

      {d.activity.data && (
        <Row style={{ gap: Spacing.four, alignItems: 'stretch' }}>
          <MetricTile
            icon={Footprints}
            label="Passos"
            value={formatInt(d.activity.data.steps)}
            caption={`${d.activity.data.distanceKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km hoje · Apple Saúde`}
          />
          <MetricTile
            icon={Flame}
            label="Energia ativa"
            value={formatInt(d.activity.data.activeKcal)}
            unit="kcal"
            caption="Hoje · Apple Saúde"
          />
        </Row>
      )}

      <Row style={{ gap: Spacing.four, alignItems: 'stretch' }}>
        <MetricTile
          icon={Flame}
          label="Sequência"
          value={streak}
          unit="dias"
          caption="Dias seguidos"
          onOpen={() => router.push('/achievements')}
        />
        <MetricTile
          icon={Heart}
          label="Treinos"
          value={stats?.consistency?.workouts_last_7_days ?? 0}
          unit={planDays ? `de ${planDays}` : undefined}
          caption="Últimos 7 dias"
          onOpen={() => router.push('/workout/history')}
        />
      </Row>
    </>
  );
}

/** Recent achievements and the Apple Health week. */
export function DashboardBottom({ d }: { d: DayDashboard }) {
  const achievements = d.dashboard.data?.achievements;
  return (
    <>
      <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Conquistas Recentes:" action="Ver Todas" onAction={() => router.push('/achievements')} />
        {achievements?.length ? (
          achievements.slice(0, 3).map((a, i) => (
            <ListItem
              key={a.id ?? i}
              icon={[Flame, Heart, Droplets, Utensils][i % 4]}
              title={a.name}
              caption={a.description}
              onPress={() => router.push('/achievements')}
            />
          ))
        ) : (
          <EmptyState icon={Trophy} message="Nenhuma conquista recente." />
        )}
      </View>
      <HealthWeekCard />
    </>
  );
}
