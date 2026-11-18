import { QueryError , Chips, EmptyState, OverviewCard, Page, PageSkeleton, Row, SectionHeader, Text, TopBar } from '@/components/ui';
import { CalendarDays, Dumbbell } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { useWorkoutHistory } from '@/hooks/queries';
import { formatDayMonth, formatInt, WEEKDAY_SHORT } from '@/lib/workout';

type Range = '7' | '30' | '90';

export default function WorkoutHistoryScreen() {
  const Colors = useColors();
  const { data = [], isLoading, refetch, isRefetching, error } = useWorkoutHistory();
  const [range, setRange] = useState<Range>('30');

  if (isLoading) return <PageSkeleton title="Histórico" back tab={false} />;

  if (error) return <QueryError title="Histórico" back error={error} onRetry={refetch} />;

  const days = Number(range);
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);
  const sessions = data
    .filter((s) => new Date(s.started_at) >= from)
    .sort((a, b) => b.started_at.localeCompare(a.started_at));

  const totalSec = sessions.reduce((s, x) => s + x.duration_seconds, 0);
  const totalKcal = sessions.reduce((s, x) => s + (x.calories ?? 0), 0);
  const hours = `${Math.floor(totalSec / 3600)}:${String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')} hr`;

  return (
    <Page tab={false} topBar={<TopBar title="Histórico" back />} refreshing={isRefetching} onRefresh={refetch}>
      <Chips
        value={range}
        onChange={setRange}
        options={[
          { value: '7', label: '7 Dias' },
          { value: '30', label: '30 Dias' },
          { value: '90', label: '90 Dias' },
        ]}
      />

      <OverviewCard
        icon={Dumbbell}
        title={`Últimos ${days} Dias`}
        subtitle={`${formatDayMonth(from, false)} — ${formatDayMonth(new Date())}`}
        stats={[
          { value: String(sessions.length), label: 'Treinos' },
          { value: hours, label: 'Tempo Total' },
          { value: formatInt(totalKcal), label: 'Kcal' },
        ]}
      />

      <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Sessões:" />
        {sessions.length === 0 ? (
          <EmptyState icon={CalendarDays} message="Nenhum treino encontrado neste período." />
        ) : (
          sessions.map((s) => {
            const d = new Date(s.started_at);
            return (
              <Row
                key={s.id}
                style={{ gap: Spacing.four, padding: Spacing.four, borderRadius: Radius.md, borderCurve: 'continuous', backgroundColor: Colors.surfaceSunken }}>
                <View style={{ width: 52, paddingVertical: Spacing.two, borderRadius: Radius.sm, backgroundColor: Colors.surfaceChip, alignItems: 'center' }}>
                  <Text variant="caption" style={{ fontSize: 12 }}>
                    {WEEKDAY_SHORT[d.getDay()]}
                  </Text>
                  <Text variant="titleLg" style={{ fontSize: 18, lineHeight: 22 }}>
                    {d.getDate()}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="titleSm" style={{ fontSize: 15 }} numberOfLines={1}>
                    {s.workout_name}
                  </Text>
                  <Text variant="caption" style={{ fontSize: 12 }}>
                    {formatDayMonth(d)} · {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {s.from_health && <Text variant="caption">Apple Saúde · {s.source}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="titleSm" style={{ fontSize: 15 }}>
                    {Math.round(s.duration_seconds / 60)} min
                  </Text>
                  {s.calories ? (
                    <Text variant="caption" style={{ fontSize: 12 }}>
                      {Math.round(s.calories)} kcal
                    </Text>
                  ) : null}
                </View>
              </Row>
            );
          })
        )}
      </View>
    </Page>
  );
}
