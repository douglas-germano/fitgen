import { AppAlert } from '@/lib/feedback';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, RefreshCw, ShoppingBasket, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BackBar, Group, GroupRow, GroupTitle, HeaderCard, SCREEN_COLUMN } from '@/components/grouped';
import { OttoAvatar } from '@/components/otto';
import { DayPicker, Page, PageSkeleton, QueryError, Row, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { useDietPlan } from '@/hooks/queries';
import { api, errorMessage, isPremiumRequired } from '@/lib/api';
import { currentWeek, formatInt, WEEKDAY_LONG, WEEKDAY_SHORT } from '@/lib/workout';
import type { DietPlan, PlannedDay } from '@/types/api';
import { usePremium } from '@/hooks/use-premium';

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
  const { requirePremium } = usePremium();
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
      <Page tab={false} topBar={<BackBar />} contentStyle={SCREEN_COLUMN}>
        <Group>
          <GroupRow leading={<OttoAvatar size={26} />} title="Nenhum plano ativo"
            caption="Defina suas preferências para o Otto montar o cardápio da semana."
            onPress={() => router.push('/diet-preferences')} />
        </Group>
      </Page>
    );
  }

  const t = plan.macro_targets;
  const calories = plan.calories || (t ? t.protein * 4 + t.carbs * 4 + t.fats * 9 : 0);
  const dayPlan = planForDay(plan, day);
  const dayIndex = DAY_KEYS.indexOf(day);

  const regenerateDay = async () => {
    if (regenerating || !requirePremium('diet_plan')) return;
    setRegenerating(true);
    try {
      await api('/diet/regenerate-day', { method: 'POST', body: { day } });
      await queryClient.invalidateQueries({ queryKey: ['diet-plan'] });
    } catch (e) {
      if (!isPremiumRequired(e)) AppAlert.alert('Erro ao gerar novo cardápio.', errorMessage(e));
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Page
      tab={false}
      topBar={<BackBar />}
      contentStyle={SCREEN_COLUMN}
      refreshing={isRefetching}
      onRefresh={refetch}>
      <View style={{ gap: 2, paddingHorizontal: Spacing.two }}>
        <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}>Plano alimentar</Text>
        <Text muted style={{ fontSize: 13 }}>Sua dieta personalizada da semana</Text>
      </View>

      <DayPicker
        selected={day}
        onSelect={setDay}
        days={currentWeek().map((d) => ({ key: DAY_KEYS[d.getDay()], weekday: WEEKDAY_SHORT[d.getDay()], day: String(d.getDate()) }))}
      />

      <HeaderCard title="Meta diária">
        <Row style={{ alignItems: 'flex-start', gap: Spacing.three, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
          <Target value={formatInt(calories)} label="kcal" />
          <Target value={`${t?.protein ?? 0} g`} label="Proteína" />
          <Target value={`${t?.carbs ?? 0} g`} label="Carbos" />
          <Target value={`${t?.fats ?? 0} g`} label="Gorduras" />
        </Row>
      </HeaderCard>

      <GroupTitle title={`Cardápio de ${WEEKDAY_LONG[(dayIndex + 7) % 7].toLowerCase()}`} />
      {Object.keys(dayPlan).length === 0 ? (
        <Group>
          <GroupRow icon={RefreshCw} title="Nenhuma refeição planejada para este dia"
            caption={regenerating ? 'Gerando cardápio…' : 'Toque para o Otto gerar o cardápio'} onPress={regenerating ? undefined : regenerateDay} />
        </Group>
      ) : (
        MEALS.map(({ key, label }) => {
          const meal = dayPlan[key];
          if (!meal) return null;
          const prepOpen = openPrep === key;
          return (
            <HeaderCard key={key} title={label} value={`${formatInt(meal.calorias)} kcal`}>
              <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
                {meal.nome ? <Text muted style={{ fontSize: 13, marginTop: -Spacing.two }}>{meal.nome}</Text> : null}
                {!!meal.ingredientes?.length && (
                  <View style={{ gap: 4 }}>
                    {meal.ingredientes.map((ing, i) => (
                      <Row key={i} style={{ alignItems: 'flex-start', gap: Spacing.two }}>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.inkMuted, marginTop: 9, marginLeft: 4 }} />
                        <Text style={{ flex: 1 }}>{ing}</Text>
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
                      hitSlop={8}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                      {prepOpen ? <ChevronDown size={16} color={Colors.voltInk} /> : <ChevronRight size={16} color={Colors.voltInk} />}
                      <Text style={{ fontSize: 14, fontWeight: '600' }} color={Colors.voltInk}>Modo de preparo</Text>
                    </Pressable>
                    {prepOpen && <Text muted>{meal.preparo}</Text>}
                  </View>
                ) : null}
              </View>
            </HeaderCard>
          );
        })
      )}

      <Group title="Opções">
        <GroupRow icon={ShoppingBasket} title="Lista de compras" onPress={() => router.push('/shopping-list')} />
        <GroupRow icon={RefreshCw} title="Gerar novo cardápio para este dia"
          caption={regenerating ? 'Gerando…' : 'O Otto troca as refeições do dia'} onPress={regenerating ? undefined : regenerateDay} />
        <GroupRow icon={Sparkles} title="Criar outro plano alimentar" onPress={() => router.push('/diet-preferences')} />
      </Group>
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
