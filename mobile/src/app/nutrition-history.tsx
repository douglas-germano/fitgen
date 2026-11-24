import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Flame, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { WeekChart } from '@/components/charts';
import { BackBar, Group, GroupRow, HeaderCard, SCREEN_COLUMN, Tile, TileColors, TileRow } from '@/components/grouped';
import { Chips, Page, PageSkeleton, QueryError } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { formatDayMonth, formatInt } from '@/lib/workout';

type History = { data: { date: string; calories: number; protein: number; carbs: number; fats: number; meals_count: number }[]; summary?: { avg_calories: number; total_calories: number; total_days: number } };

export default function NutritionHistoryScreen() {
  const [range, setRange] = useState('7');
  const query = useQuery({ queryKey: ['nutrition-history', range], queryFn: () => {
    const from = new Date(); from.setDate(from.getDate() - Number(range) + 1);
    const date = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
    return api<History>(`/nutrition/history?period=dia&start_date=${date}`);
  } });
  if (query.isLoading) return <PageSkeleton title="Histórico alimentar" back tab={false} />;
  if (query.error) return <QueryError title="Histórico alimentar" back error={query.error} onRetry={query.refetch} />;
  const records = query.data?.data ?? [];
  return (
    <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN} refreshing={query.isRefetching} onRefresh={query.refetch}>
      <Chips value={range} onChange={setRange} options={['7', '30', '90'].map((value) => ({ value, label: `${value} dias` }))} />
      <TileRow>
        <Tile icon={Flame} color={TileColors.orange} title="kcal por dia" value={formatInt(query.data?.summary?.avg_calories ?? 0)} />
        <Tile icon={Utensils} color={TileColors.green} title="Refeições" value={String(records.reduce((s, r) => s + r.meals_count, 0))} />
        <Tile icon={CalendarDays} color={TileColors.blue} title="Dias com registro" value={String(records.length)} />
      </TileRow>
      {records.length ? <>
        <HeaderCard title="Calorias por dia" value="últimos 7 registros">
          <View style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
            <WeekChart data={records.slice(-7).map((r) => ({ label: formatDayMonth(r.date + 'T12:00:00', false), value: r.calories }))} accessibilityLabel="Calorias consumidas por dia" />
          </View>
        </HeaderCard>
        <Group title="Dias">
          {[...records].reverse().map((r) => (
            <GroupRow key={r.date} icon={CalendarDays} title={formatDayMonth(r.date + 'T12:00:00', false)}
              caption={`${r.meals_count} ${r.meals_count === 1 ? 'refeição' : 'refeições'} · P ${formatInt(r.protein)} · C ${formatInt(r.carbs)} · G ${formatInt(r.fats)} g`}
              value={`${formatInt(r.calories)} kcal`} />
          ))}
        </Group>
      </> : (
        <Group>
          <GroupRow icon={Utensils} title="Nenhuma refeição registrada neste período." />
        </Group>
      )}
    </Page>
  );
}
