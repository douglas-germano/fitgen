import { QueryError, Chips, Page, PageSkeleton } from '@/components/ui';
import { router } from 'expo-router';
import { CalendarDays, Clock, Dumbbell, Flame, Route } from 'lucide-react-native';
import { useState } from 'react';

import { BackBar, Group, GroupRow, SCREEN_COLUMN, Tile, TileColors, TileRow } from '@/components/grouped';
import { useWorkoutHistory } from '@/hooks/queries';
import { distanceLabel, elapsedLabel } from '@/lib/outdoor';
import { formatDayMonth, formatInt, WEEKDAY_SHORT } from '@/lib/workout';

type Range = '7' | '30' | '90';

export default function WorkoutHistoryScreen() {
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
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  const totalSec = sessions.reduce((s, x) => s + x.duration_seconds, 0);
  const totalKcal = sessions.reduce((s, x) => s + (x.calories ?? 0), 0);
  const hours = `${Math.floor(totalSec / 3600)}h${String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')}`;

  return (
    <Page tab={false} topBar={<BackBar />} contentStyle={SCREEN_COLUMN} refreshing={isRefetching} onRefresh={refetch}>
      <Chips
        value={range}
        onChange={setRange}
        options={[
          { value: '7', label: '7 dias' },
          { value: '30', label: '30 dias' },
          { value: '90', label: '90 dias' },
        ]}
      />

      <TileRow>
        <Tile icon={Dumbbell} color={TileColors.orange} title="Treinos" value={String(sessions.length)} />
        <Tile icon={Clock} color={TileColors.blue} title="Tempo total" value={hours} />
        <Tile icon={Flame} color={TileColors.red} title="Kcal" value={formatInt(totalKcal)} />
      </TileRow>

      <Group title={`${formatDayMonth(from, false)} a ${formatDayMonth(new Date(), false)}`}>
        {sessions.length === 0 ? (
          <GroupRow icon={CalendarDays} title="Nenhum treino neste período" caption="Os treinos que você concluir aparecem aqui." />
        ) : sessions.map((s) => {
          const d = new Date(s.started_at);
          const when = `${WEEKDAY_SHORT[d.getDay()]}, ${formatDayMonth(d, false)} · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
          if (s.outdoor_type) {
            return (
              <GroupRow key={s.id} icon={Route} title={s.workout_name} caption={`${when} · ${elapsedLabel(s.duration_seconds)}`}
                value={distanceLabel(s.distance_meters ?? 0)}
                onPress={() => router.push({ pathname: '/outdoor/[id]', params: { id: s.id } })} />
            );
          }
          return (
            <GroupRow key={s.id} icon={Dumbbell} title={s.workout_name}
              caption={[when, s.calories ? `${Math.round(s.calories)} kcal` : null, s.from_health ? `Apple Saúde · ${s.source}` : null].filter(Boolean).join(' · ')}
              value={`${Math.round(s.duration_seconds / 60)} min`} />
          );
        })}
      </Group>
    </Page>
  );
}
