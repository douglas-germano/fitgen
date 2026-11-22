import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { OutdoorMap } from '@/components/outdoor-map';
import { OutdoorStats } from '@/components/outdoor-summary';
import { Button, Card, Page, PageSkeleton, QueryError, Text, TopBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/queries';
import { api } from '@/lib/api';
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

  return (
    <Page
      topBar={<TopBar title="Resumo da atividade" back />}
      footer={<Button title="Ver histórico" variant="soft" size="lg" onPress={() => router.dismissTo('/workout/history')} />}>
      <View style={{ gap: Spacing.two }}>
        <Text variant="display" accessibilityRole="header">{record.workout_name}</Text>
        <Text variant="label" muted>{date}</Text>
      </View>

      <OutdoorStats summary type={record.outdoor_type} seconds={record.duration_seconds}
        meters={record.distance_meters} calories={record.calories} />
      <OutdoorMap route={record.route} emptyMessage="Nenhum ponto de GPS foi registrado nesta sessão." />
      {pending && (
        <Card style={{ gap: Spacing.two }}>
          <Text variant="titleMd">Sincronização pendente</Text>
          <Text muted>Esta atividade está salva no aparelho.</Text>
          <Button title="Tentar sincronizar" variant="soft" loading={detail.isFetching} onPress={() => void detail.refetch()} />
        </Card>
      )}
    </Page>
  );
}
