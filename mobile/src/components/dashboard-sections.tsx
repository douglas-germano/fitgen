import { router } from 'expo-router';
import { CalendarDays, Droplets, Flame, Footprints, Heart, Target, Utensils, Zap } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { HealthWeekCard } from '@/components/health-week';
import { OttoAvatar } from '@/components/otto';
import { Group, GroupRow } from '@/components/grouped';
import { ProfileMedals } from '@/components/profile-overview';
import {
  useActiveWorkoutPlan,
  useDailyNutrition,
  useDashboard,
  useDietPlan,
  useHealthActivity,
  useProfile,
  useStreaks,
} from '@/hooks/queries';
import { healthProviderName } from '@/lib/health';
import {
  formatInt,
  formatLiters,
  isSameDay,
  upcomingWorkouts,
  WEEKDAY_SHORT,
  workoutSummary,
  workoutTitle,
} from '@/lib/workout';

export type LogKind = 'meal' | 'water';

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

/** Today's intake, the coach, this week's workouts and activity, in grouped lists. */
export function DashboardOverview({ d }: { d: DayDashboard }) {
  const stats = d.dashboard.data;
  const plan = d.plan;
  const today = new Date();
  const upcoming = upcomingWorkouts(plan, 2);

  const kcal = stats?.nutrition?.calories ?? d.nutrition.data?.totals?.calories ?? 0;
  const kcalGoal = stats?.nutrition?.goal;
  const water = stats?.hydration?.consumed_ml ?? 0;
  const waterGoal = stats?.hydration?.goal_ml;
  const protein = d.nutrition.data?.totals?.protein ?? 0;
  const proteinGoal = d.diet.data?.macro_targets?.protein;
  const planDays = plan?.days?.length ?? 0;
  const streak = stats?.consistency?.current_streak ?? d.streaks.data?.workout_streak ?? 0;
  const workouts = stats?.consistency?.workouts_last_7_days ?? 0;
  const of = (value: string, goal: string | null) => goal ? `${value} de ${goal}` : value;

  return (
    <>
      {d.profile.data?.onboarding_completed === false && (
        <Group>
          <GroupRow icon={Target} title="Complete seu perfil" caption="Informe seus objetivos e os dias em que pode treinar para criar seu primeiro plano." dot onPress={() => router.push('/onboarding')} />
        </Group>
      )}

      <Group title="Hoje">
        <GroupRow icon={Flame} title="Calorias" value={of(formatInt(kcal), kcalGoal ? `${formatInt(kcalGoal)} kcal` : null) + (kcalGoal ? '' : ' kcal')} onPress={() => router.push('/diet')} />
        <GroupRow icon={Droplets} title="Água" value={of(formatLiters(water, !waterGoal), waterGoal ? formatLiters(waterGoal) : null)} onPress={() => router.push('/hydration')} />
        <GroupRow icon={Utensils} title="Proteína" value={of(`${formatInt(protein)}${proteinGoal ? '' : ' g'}`, proteinGoal ? `${formatInt(proteinGoal)} g` : null)} onPress={() => router.push('/diet')} />
        {d.activity.data && <GroupRow icon={Footprints} title="Passos" caption={`${d.activity.data.distanceKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km · ${healthProviderName()}`} value={formatInt(d.activity.data.steps)} />}
        {d.activity.data && <GroupRow icon={Zap} title="Energia ativa" caption={healthProviderName()} value={`${formatInt(d.activity.data.activeKcal)} kcal`} />}
        <GroupRow leading={<OttoAvatar size={26} />} title="Converse com o Otto" caption="Tire dúvidas sobre seu treino e sua dieta" onPress={() => router.push('/coach')} />
      </Group>

      <Group title="Esta semana" action={plan ? 'Ver plano' : undefined} onAction={() => plan && router.push(`/workout/${plan.id}`)}>
        <GroupRow icon={Flame} title="Sequência" value={`${streak} ${streak === 1 ? 'dia' : 'dias'}`} onPress={() => router.push('/achievements')} />
        <GroupRow icon={Heart} title="Treinos nos últimos 7 dias" value={planDays ? `${workouts} de ${planDays}` : String(workouts)} onPress={() => router.push('/workout/history')} />
        {upcoming.length ? upcoming.map(({ date, day }) => {
          const isToday = isSameDay(date, today);
          const when = isToday ? 'Hoje' : `${WEEKDAY_SHORT[date.getDay()]}, ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
          return (
            <GroupRow key={day.id} icon={CalendarDays} title={workoutTitle(day)} caption={`${when} · ${workoutSummary(day)}`} dot={isToday}
              onPress={() => plan && router.push(isToday ? `/workout/${plan.id}/play/${day.id}` : `/workout/${plan.id}`)} />
          );
        }) : (
          <GroupRow icon={CalendarDays} title={plan ? 'Nenhum treino nos próximos dias' : 'Criar plano de treino'}
            caption={plan ? undefined : 'Gere um plano com a IA na aba Treino'} onPress={() => router.push('/workouts')} />
        )}
      </Group>
    </>
  );
}

/** Medals and the weekly health summary. */
export function DashboardBottom() {
  return (
    <>
      <ProfileMedals />
      <HealthWeekCard />
    </>
  );
}
