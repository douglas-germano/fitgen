import { AppAlert, AppActionSheet } from '@/lib/feedback';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import {
  Button,
  Card,
  DayPicker,
  EmptyState,
  MoreButton,
  Page,
  PageSkeleton,
  QueryError,
  Row,
  SectionHeader,
  Text,
  TopBar,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { useDietPlan } from '@/hooks/queries';
import { api, errorMessage } from '@/lib/api';
import { currentWeek, formatInt, WEEKDAY_LONG, WEEKDAY_SHORT } from '@/lib/workout';
import type { DietPlan, PlannedDay } from '@/types/api';

/** JS getDay() → weekly_plan key. */
const DAY_KEYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const MEALS: { key: keyof PlannedDay; label: string }[] = [
  { key: 'cafe', label: 'Café da Manhã' },
  { key: 'lanche_manha', label: 'Lanche da manhã' },
  { key: 'pre_treino', label: 'Pré-treino' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lanche', label: 'Lanche' },
  { key: 'pos_treino', label: 'Pós-treino' },
  { key: 'jantar', label: 'Jantar' },
  { key: 'ceia', label: 'Ceia' },
];

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function planForDay(plan: DietPlan | null | undefined, day: string): PlannedDay {
  if (!plan?.weekly_plan) return {};
  const key = Object.keys(plan.weekly_plan).find((k) => normalize(k).startsWith(day));
  return key ? plan.weekly_plan[key] ?? {} : {};
}

export default function DietPlanScreen() {
  const Colors = useColors();
  const queryClient = useQueryClient();
  const { data: plan, isLoading, refetch, isRefetching, error } = useDietPlan();
  const [day, setDay] = useState(DAY_KEYS[new Date().getDay()]);
  const [regenerating, setRegenerating] = useState(false);
  const [openPrep, setOpenPrep] = useState<string | null>(null);

  if (isLoading) return <PageSkeleton title="Plano Alimentar" back tab={false} />;
  if (error) return <QueryError title="Plano Alimentar" back error={error} onRetry={refetch} />;
  if (!plan?.weekly_plan) {
    return (
      <Page tab={false} topBar={<TopBar title="Plano Alimentar" back />}>
        <EmptyState
          icon={Utensils}
          title="Nenhum plano ativo"
          message="Defina suas preferências para criar um cardápio da semana."
          action={<Button title="Criar meu plano" onPress={() => router.push('/diet-preferences')} />}
        />
      </Page>
    );
  }

  const t = plan.macro_targets;
  const calories = plan.calories || (t ? t.protein * 4 + t.carbs * 4 + t.fats * 9 : 0);
  const dayPlan = planForDay(plan, day);
  const dayIndex = DAY_KEYS.indexOf(day);

  const regenerateDay = async () => {
    if (regenerating) return;
    setRegenerating(true);
    try {
      await api('/diet/regenerate-day', { method: 'POST', body: { day } });
      await queryClient.invalidateQueries({ queryKey: ['diet-plan'] });
    } catch (e) {
      AppAlert.alert('Erro ao gerar novo cardápio.', errorMessage(e));
    } finally {
      setRegenerating(false);
    }
  };

  const openMenu = () => {
    if (Platform.OS === 'ios') {
      AppActionSheet.showActionSheetWithOptions(
        { options: ['Lista de Compras', 'Gerar Novo Cardápio para Este Dia', 'Cancelar'], cancelButtonIndex: 2 },
        (i) => (i === 0 ? router.push('/shopping-list') : i === 1 ? regenerateDay() : undefined),
      );
    } else {
      AppAlert.alert('Plano Alimentar', undefined, [
        { text: 'Lista de Compras', onPress: () => router.push('/shopping-list') },
        { text: 'Gerar Novo Cardápio', onPress: regenerateDay },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  return (
    <Page
      tab={false}
      topBar={<TopBar title="Plano Alimentar" back action={<MoreButton onPress={openMenu} />} />}
      refreshing={isRefetching}
      onRefresh={refetch}
      footer={
        <>
          <Button size="lg" title="Lista de Compras" onPress={() => router.push('/shopping-list')} />
          <Button size="lg" variant="soft" title="Gerar Novo Cardápio para Este Dia" onPress={regenerateDay} loading={regenerating} />
        </>
      }>
      <View style={{ gap: Spacing.three }}>
        <Text muted>Sua dieta personalizada da semana</Text>
        <Button variant="soft" title="Criar outro plano alimentar" onPress={() => router.push('/diet-preferences')} />
        <DayPicker
          selected={day}
          onSelect={setDay}
          days={currentWeek().map((d) => ({ key: DAY_KEYS[d.getDay()], weekday: WEEKDAY_SHORT[d.getDay()], day: String(d.getDate()) }))}
        />
      </View>

      <Card style={{ gap: Spacing.three }}>
        <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600' }}>Meta Diária</Text>
        <Row style={{ alignItems: 'flex-start', gap: Spacing.three }}>
          <Target value={formatInt(calories)} label="kcal" />
          <Target value={`${t?.protein ?? 0} g`} label="Proteína" />
          <Target value={`${t?.carbs ?? 0} g`} label="Carbos" />
          <Target value={`${t?.fats ?? 0} g`} label="Gorduras" />
        </Row>
      </Card>

      <View style={{ gap: Spacing.three }}>
        <SectionHeader title={`Cardápio de ${WEEKDAY_LONG[(dayIndex + 7) % 7]}:`} />
        {Object.keys(dayPlan).length === 0 ? (
          <EmptyState
            icon={Utensils}
            message="Nenhuma refeição planejada para este dia."
            action={<Button size="sm" icon={RefreshCw} title="Gerar cardápio" onPress={regenerateDay} loading={regenerating} />}
          />
        ) : (
          MEALS.map(({ key, label }) => {
            const meal = dayPlan[key];
            if (!meal) return null;
            const prepOpen = openPrep === key;
            return (
              <Card key={key} style={{ gap: Spacing.three, padding: Spacing.five }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="titleSm" style={{ fontSize: 15 }}>
                      {label}
                    </Text>
                    {meal.nome ? <Text variant="caption" style={{ fontSize: 12 }}>{meal.nome}</Text> : null}
                  </View>
                  <Text variant="titleSm">{formatInt(meal.calorias)} kcal</Text>
                </Row>
                {!!meal.ingredientes?.length && (
                  <View style={{ gap: 4 }}>
                    {meal.ingredientes.map((ing, i) => (
                      <Row key={i} style={{ alignItems: 'flex-start', gap: Spacing.two }}>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.inkMuted, marginTop: 8, marginLeft: 4 }} />
                        <Text muted style={{ flex: 1 }}>
                          {ing}
                        </Text>
                      </Row>
                    ))}
                  </View>
                )}
                {meal.preparo ? (
                  <View style={{ gap: Spacing.two }}>
                    <Pressable
                      onPress={() => setOpenPrep(prepOpen ? null : key)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: prepOpen }}
                      hitSlop={8}>
                      <Text variant="titleSm">{prepOpen ? '▼' : '▶'} Preparo</Text>
                    </Pressable>
                    {prepOpen && <Text muted>{meal.preparo}</Text>}
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </View>


    </Page>
  );
}

function Target({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="titleMd" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="caption" style={{ fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}
