import { AppAlert, AppActionSheet } from '@/lib/feedback';
import { router } from 'expo-router';
import { ArrowUpRight, Droplets, Flame, Footprints, Heart, MessagesSquare, Trophy, Utensils, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Platform, Pressable, View } from 'react-native';

import { HydrationLogger } from '@/components/hydration-logger';
import { MealLogger } from '@/components/meal-logger';
import { HealthWeekCard } from '@/components/health-week';
import {
  Avatar,
  BellButton,
  BadgeIcon,
  Button,
  Card,
  DayPicker,
  EmptyState,
  ListItem,
  MetricTile,
  OverviewCard,
  Page,
  PageSkeleton,
  QueryError,
  Row,
  ScheduleItem,
  SectionHeader,
  Text,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import {
  useActiveWorkoutPlan,
  useDailyNutrition,
  useDashboard,
  useDietPlan,
  useHealthActivity,
  useProfile,
  useStreaks,
  useUnreadNotifications,
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

const pct = (v: number, goal?: number | null) => (goal ? Math.min((v / goal) * 100, 100) : 0);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia,' : h < 18 ? 'Boa tarde,' : 'Boa noite,';
}

export default function DashboardScreen() {
  const queryClient = useQueryClient();
  const [logger, setLogger] = useState<'meal' | 'water' | null>(null);
  const profile = useProfile();
  const dashboard = useDashboard();
  const nutrition = useDailyNutrition();
  const diet = useDietPlan();
  const streaks = useStreaks();
  const { data: unread } = useUnreadNotifications();
  const activity = useHealthActivity();
  const { plan, error: planError, isLoading: planLoading, refetch: refetchPlan } = useActiveWorkoutPlan();

  if (profile.isLoading || dashboard.isLoading || planLoading) return <PageSkeleton />;
  if (profile.error || dashboard.error || planError) return <QueryError title="Painel" tab error={profile.error ?? dashboard.error ?? planError} onRetry={() => { profile.refetch(); dashboard.refetch(); refetchPlan(); }} />;

  const stats = dashboard.data;
  const today = new Date();
  const week = currentWeek();
  const upcoming = upcomingWorkouts(plan, 2);
  const todayWorkout = todaysWorkout(plan);

  const kcal = stats?.nutrition?.calories ?? nutrition.data?.totals?.calories ?? 0;
  const water = stats?.hydration?.consumed_ml ?? 0;
  const protein = nutrition.data?.totals?.protein ?? 0;
  const proteinGoal = diet.data?.macro_targets?.protein;
  const planDays = plan?.days?.length ?? 0;
  const streak = stats?.consistency?.current_streak ?? streaks.data?.workout_streak ?? 0;

  const openMenu = () => {
    const options = ['Registrar Refeição', 'Hidratação', 'Cancelar'];
    const go = (i: number) => {
      if (i === 0) setLogger('meal');
      if (i === 1) setLogger('water');
    };
    if (Platform.OS === 'ios') {
      AppActionSheet.showActionSheetWithOptions({ options, cancelButtonIndex: 2 }, go);
    } else {
      AppAlert.alert('Resumo do Dia', undefined, [
        { text: options[0], onPress: () => go(0) },
        { text: options[1], onPress: () => go(1) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  const startToday = () => {
    if (plan && todayWorkout) router.push(`/workout/${plan.id}/play/${todayWorkout.id}`);
    else if (plan && upcoming[0]) router.push(`/workout/${plan.id}`);
    else router.push('/workouts');
  };

  return (
    <Page
      tab
      refreshing={dashboard.isRefetching}
      onRefresh={() => {
        profile.refetch();
        dashboard.refetch();
        nutrition.refetch();
        streaks.refetch();
        activity.refetch();
        void queryClient.invalidateQueries({ queryKey: ['health-week'] });
        void queryClient.invalidateQueries({ queryKey: ['health-summary-weight'] });
        void queryClient.invalidateQueries({ queryKey: ['workout-history'] });
        void queryClient.invalidateQueries({ queryKey: ['health', 'sync'] });
        refetchPlan();
      }}>
      {/* Greeting */}
      <Row style={{ gap: Spacing.three }}>
        <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Perfil">
          <Avatar name={profile.data?.name} uri={profile.data?.profile_picture} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" muted style={{ fontWeight: '400' }}>
            {greeting()}
          </Text>
          <Text variant="titleLg" numberOfLines={1}>
            {profile.data?.name || 'Atleta'}
          </Text>
        </View>
        <BellButton size="lg" unread={unread?.length ?? 0} />
      </Row>

      {profile.data?.onboarding_completed === false && <Card>
        <Text variant="titleMd">Complete seu perfil</Text>
        <Text muted>Informe seus objetivos e os dias em que pode treinar para criar seu primeiro plano.</Text>
        <Button title="Configurar meu perfil" onPress={() => router.push('/onboarding')} />
      </Card>}

      <OverviewCard
        icon={Flame}
        title="Resumo do Dia"
        subtitle={plan ? plan.name : 'Sem plano de treino ativo'}
        onMore={openMenu}
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

      <OttoCard />

      <Row style={{ gap: Spacing.three, alignItems: 'stretch' }}>
        <RegisterCard icon={Utensils} title="Registrar refeição" caption="Descreva ou tire uma foto" onPress={() => setLogger('meal')} />
        <RegisterCard icon={Droplets} title="Registrar hidratação" caption="Adicione a água que bebeu" onPress={() => setLogger('water')} />
      </Row>

      {/* This week */}
      <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Esta Semana:" action="Ver Plano" onAction={() => router.push(plan ? `/workout/${plan.id}` : '/workouts')} />
        <Text variant="label" muted style={{ fontWeight: '400' }}>
          {formatLongDate(today)}
        </Text>
        <DayPicker
          selected={week.find((d) => isSameDay(d, today))?.toDateString() ?? ''}
          days={week.map((d) => ({ key: d.toDateString(), weekday: WEEKDAY_SHORT[d.getDay()], day: String(d.getDate()) }))}
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

      {activity.data && (
        <Row style={{ gap: Spacing.four, alignItems: 'stretch' }}>
          <MetricTile
            icon={Footprints}
            label="Passos"
            value={formatInt(activity.data.steps)}
            caption={`${activity.data.distanceKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km hoje · Apple Saúde`}
          />
          <MetricTile
            icon={Flame}
            label="Energia ativa"
            value={formatInt(activity.data.activeKcal)}
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

      {/* Achievements */}
      <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Conquistas Recentes:" action="Ver Todas" onAction={() => router.push('/achievements')} />
        {stats?.achievements?.length ? (
          stats.achievements.slice(0, 3).map((a, i) => (
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
      {logger === 'meal' && <MealLogger visible onClose={() => setLogger(null)} />}
      {logger === 'water' && <HydrationLogger onClose={() => setLogger(null)} />}
    </Page>
  );
}

/** Entry point to the Otto chat (moved out of the tab bar). */
function OttoCard() {
  const Colors = useColors();
  return (
    <Card onPress={() => router.push('/coach')} accessibilityLabel="Conversar com o Otto" accessibilityHint="Abre o chat com seu coach de IA">
      <Row style={{ gap: Spacing.three }}>
        <BadgeIcon icon={MessagesSquare} size={44} />
        <View style={{ flex: 1, gap: Spacing.one }}>
          <Text variant="titleSm">Converse com o Otto</Text>
          <Text variant="caption">Tire dúvidas sobre seu treino e sua dieta</Text>
        </View>
        <ArrowUpRight size={18} color={Colors.ink} />
      </Row>
    </Card>
  );
}

function RegisterCard({ icon, title, caption, onPress }: { icon: LucideIcon; title: string; caption: string; onPress: () => void }) {
  const Colors = useColors();
  return (
    <Card onPress={onPress} accessibilityLabel={title} style={{ flex: 1, gap: Spacing.three }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <BadgeIcon icon={icon} size={36} />
        <ArrowUpRight size={18} color={Colors.ink} />
      </Row>
      <View style={{ gap: Spacing.one }}>
        <Text variant="titleSm">{title}</Text>
        <Text variant="caption">{caption}</Text>
      </View>
    </Card>
  );
}
