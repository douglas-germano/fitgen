import { useQuery } from '@tanstack/react-query';
import { Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { WeekChart } from '@/components/charts';
import { Card, Chips, EmptyState, OverviewCard, Page, PageSkeleton, QueryError, Row, SectionHeader, Text, TopBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { formatDayMonth, formatInt } from '@/lib/workout';

type History = { data: { date: string; calories: number; protein: number; carbs: number; fats: number; meals_count: number }[]; summary: { avg_calories: number; total_calories: number; total_days: number } };

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
    <Page topBar={<TopBar title="Histórico alimentar" back />} refreshing={query.isRefetching} onRefresh={query.refetch}>
      <Chips value={range} onChange={setRange} options={['7', '30', '90'].map((value) => ({ value, label: `${value} dias` }))} />
      <OverviewCard icon={Utensils} title={`Últimos ${range} dias`} subtitle="Média dos dias com registros" stats={[{ value: formatInt(query.data?.summary.avg_calories ?? 0), label: 'kcal / dia' }, { value: String(records.reduce((s, r) => s + r.meals_count, 0)), label: 'Refeições' }, { value: String(records.length), label: 'Dias registrados' }]} />
      {records.length ? <>
        <SectionHeader title="Calorias por dia" note="últimos 7 registros" />
        <WeekChart data={records.slice(-7).map((r) => ({ label: formatDayMonth(r.date + 'T12:00:00', false), value: r.calories }))} accessibilityLabel="Calorias consumidas por dia" />
        <View style={{ gap: Spacing.three }}>
          {[...records].reverse().map((r) => <Card key={r.date}>
            <Row style={{ justifyContent: 'space-between' }}><Text variant="titleSm">{formatDayMonth(r.date + 'T12:00:00')}</Text><Text variant="titleSm">{formatInt(r.calories)} kcal</Text></Row>
            <Text muted>{r.meals_count} refeições · P {formatInt(r.protein)} g · C {formatInt(r.carbs)} g · G {formatInt(r.fats)} g</Text>
          </Card>)}
        </View>
      </> : <EmptyState icon={Utensils} message="Nenhuma refeição registrada neste período." />}
    </Page>
  );
}
