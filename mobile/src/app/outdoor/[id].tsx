import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { OutdoorStats, OutdoorTrace } from '@/components/outdoor-summary';
import { Button, Page, PageSkeleton, QueryError, Text, TopBar } from '@/components/ui';
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

  if (detail.error) return <QueryError title="Ao ar livre" back error={detail.error} onRetry={detail.refetch} />;
  if (!detail.data) return <PageSkeleton title="Ao ar livre" back tab={false} />;

  const { record, pending } = detail.data;
  const date = new Date(record.started_at).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

  return (
    <Page tab={false} topBar={<TopBar title="Ao ar livre" back />}>
      <Text variant="titleLg">{record.workout_name}</Text>
      <Text muted>{date}</Text>
      <OutdoorStats seconds={record.duration_seconds} meters={record.distance_meters} calories={record.calories} />
      <OutdoorTrace route={record.route} />
      {!record.route.length && <Text muted>Nenhum ponto de GPS foi registrado nesta sessão.</Text>}
      {pending && <>
        <Text muted>Atividade salva neste aparelho. A sincronização com sua conta está pendente.</Text>
        <Button title="Tentar sincronizar" variant="soft" loading={detail.isFetching} onPress={() => void detail.refetch()} />
      </>}
      <Button title="Voltar ao histórico" variant="soft" onPress={() => router.dismissTo('/workout/history')} />
    </Page>
  );
}
