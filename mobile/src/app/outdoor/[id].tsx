import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock, Flame, Gauge, Route, Timer } from 'lucide-react-native';
import { View } from 'react-native';

import { OutdoorMap } from '@/components/outdoor-map';
import { OutdoorShare } from '@/components/outdoor-share';
import { BackBar, Group, GroupRow, HeaderCard, SCREEN_COLUMN, Tile, TileColors, TileRow } from '@/components/grouped';
import { Button, Page, PageSkeleton, QueryError, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/queries';
import { api } from '@/lib/api';
import { distanceLabel, elapsedLabel, paceLabel, speedLabel } from '@/lib/outdoor';
import { syncOutdoor } from '@/lib/outdoor-api';
import { readPending, type OutdoorRecord } from '@/lib/outdoor-recording';

export default function OutdoorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const owner = useProfile().data?.id;
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: ['outdoor-detail', owner, id],
    enabled: !!owner && !!id,
    initialData: () => {
      const pending = owner && readPending(owner).find((record) => record.id === id);
      return pending ? { record: pending, pending: true } : undefined;
    },
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      const pending = readPending(owner!).find((record) => record.id === id);
      if (pending) {
        try {
          const saved = await syncOutdoor(owner!, pending);
          void client.invalidateQueries({ queryKey: ['workout-history'] });
          return { record: saved, pending: false };
        } catch {
          return { record: pending, pending: true };
        }
      }
      return { record: await api<OutdoorRecord>(`/exercises/outdoor/${encodeURIComponent(id!)}`), pending: false };
    },
  });

  if (detail.error) return <QueryError title="Resumo da atividade" back error={detail.error} onRetry={detail.refetch} />;
  if (!detail.data) return <PageSkeleton title="Resumo da atividade" back tab={false} />;

  const { record, pending } = detail.data;
  const date = new Date(record.started_at).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

  const speed = speedLabel(record.duration_seconds, record.distance_meters);

  return (
    <Page
      topBar={<BackBar />}
      contentStyle={SCREEN_COLUMN}
      footer={<Button title="Ver histórico" variant="soft" size="lg" onPress={() => router.dismissTo('/workout/history')} />}>
      <View style={{ gap: 2, paddingHorizontal: Spacing.two }}>
        <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}>{record.workout_name}</Text>
        <Text muted style={{ fontSize: 13 }}>{date}</Text>
      </View>

      <TileRow>
        <Tile icon={Route} color={TileColors.green} title="Distância" value={distanceLabel(record.distance_meters)} />
        <Tile icon={Clock} color={TileColors.blue} title="Tempo ativo" value={elapsedLabel(record.duration_seconds)} />
        <Tile icon={Flame} color={TileColors.red} title="Calorias" value={record.calories === null ? '—' : `${record.calories} kcal`} />
      </TileRow>

      <Group>
        {record.outdoor_type !== 'bike' && <GroupRow icon={Timer} title="Ritmo médio" value={paceLabel(record.duration_seconds, record.distance_meters)} />}
        <GroupRow icon={Gauge} title="Velocidade média" value={speed} />
      </Group>

      <OutdoorMap route={record.route} emptyMessage="Nenhum ponto de GPS foi registrado nesta sessão." />
      <OutdoorShare key={record.id} record={record} />
      {pending && (
        <HeaderCard title="Sincronização pendente">
          <View style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.three }}>
            <Text muted>Esta atividade está salva no aparelho.</Text>
            <Button title="Tentar sincronizar" variant="soft" loading={detail.isFetching} onPress={() => void detail.refetch()} />
          </View>
        </HeaderCard>
      )}
    </Page>
  );
}
