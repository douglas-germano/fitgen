import { router, useLocalSearchParams } from 'expo-router';
import { ChallengeCard, openProfile } from '@/components/community';
import { Button, Card, Page, PageSkeleton, QueryError, Text, TopBar } from '@/components/ui';
import { useChallenge, useDeleteChallenge, useJoinChallenge } from '@/hooks/community';
import { metricUnit } from '@/lib/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useChallenge(id); const join = useJoinChallenge(); const del = useDeleteChallenge();
  const error = (e: unknown) => AppAlert.alert('Erro no desafio', errorMessage(e));
  if (query.isLoading) return <PageSkeleton title="Desafio" back />;
  if (query.error || !query.data) return <QueryError title="Desafio" back error={query.error} onRetry={query.refetch} />;
  const c = query.data;
  return <Page topBar={<TopBar title="Desafio" back />} refreshing={query.isRefetching} onRefresh={query.refetch}>
    <ChallengeCard challenge={c} largeCover onPress={() => {}} /><Text>{c.description}</Text>
    <Text muted>{c.start_date} até {c.end_date}. Progresso calculado pelos registros do FitGen. Ao participar, seu progresso fica visível aos participantes.</Text>
    {(!c.completed && (c.joined || c.status !== 'ended')) && <Button title={c.joined ? 'Sair do desafio' : 'Participar'} variant={c.joined ? 'soft' : 'primary'} loading={join.isPending} onPress={() => {
      const run = () => join.mutate({ id, join: !c.joined }, { onError: error });
      if (c.joined) AppAlert.alert('Sair do desafio?', undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: run }]); else run();
    }} />}
    <Text variant="titleSm">Participantes</Text>
    {c.leaderboard.map(p => <Card key={p.user.id} onPress={() => openProfile(p.user.id)}><Text>{p.rank}. {p.user.name}{p.is_me ? ' (você)' : ''}</Text><Text muted>{p.progress}/{c.target} {metricUnit(c.metric)}{p.completed ? ' · Concluído 🏆' : ''}</Text></Card>)}
    {c.can_delete && <Button title="Excluir desafio" variant="soft" loading={del.isPending} onPress={() => AppAlert.alert('Excluir desafio?', undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => del.mutate(id, { onSuccess: () => router.back(), onError: error }) }])} />}
  </Page>;
}
