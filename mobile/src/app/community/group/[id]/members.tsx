import { router, useLocalSearchParams } from 'expo-router';
import { openProfile } from '@/components/community';
import { Button, Card, Page, PageSkeleton, QueryError, Text, TopBar } from '@/components/ui';
import { useGroup, useGroupSummary, useLeaveGroup } from '@/hooks/community';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';
import { AppAlert } from '@/lib/feedback';
import { errorMessage } from '@/lib/api';
export default function GroupMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useGroup(id); const leave = useLeaveGroup(); const summary = useGroupSummary(id);
  const { refreshing, refresh } = useCommunityRefresh();
  if (query.isLoading) return <PageSkeleton title="Membros e ranking" back />;
  if (query.error || !query.data) return <QueryError title="Membros e ranking" back error={query.error} onRetry={query.refetch} />;
  const g = query.data;
  return <Page topBar={<TopBar title="Membros e ranking" back />} refreshing={refreshing} onRefresh={refresh}>
    <Text muted>{g.my_role ? 'Ranking semanal por treinos e dias ativos compartilhados.' : 'Entre no clube para ver os membros e o ranking.'}</Text>
    {g.members.filter(m => !m.blocked).map(m => <Card key={m.user.id} onPress={() => openProfile(m.user.id)}><Text variant="titleSm">{m.rank}. {m.user.name}{m.is_me ? ' (você)' : ''}</Text><Text muted>{m.workouts} treinos · {m.active_days} dias ativos · {m.minutes} min{m.role === 'admin' ? ' · Admin' : ''}</Text></Card>)}
    {g.my_role && <Button title="Desafios do clube" variant="soft" onPress={() => router.push(`/community/group/${id}/challenges`)} />}
    {g.my_role && <Button title="Resumo da semana" variant="soft" loading={summary.isFetching} onPress={() => summary.refetch()} />}
    {summary.data?.text && <Card><Text>{summary.data.text}</Text></Card>}
    {summary.error && <Text muted>Resumo indisponível agora.</Text>}
    {g.my_role && <Button title="Sair do clube" variant="soft" loading={leave.isPending} onPress={() => AppAlert.alert('Sair do clube?', undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: () => leave.mutate(id, { onSuccess: () => router.replace('/(tabs)/social'), onError: e => AppAlert.alert('Não foi possível sair', errorMessage(e)) }) }])} />}
  </Page>;
}
