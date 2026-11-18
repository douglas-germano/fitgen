import { router, useLocalSearchParams } from 'expo-router';
import { ChallengeCard } from '@/components/community';
import { Button, Page, PageSkeleton, QueryError, Text, TopBar } from '@/components/ui';
import { useGroup } from '@/hooks/community';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';
export default function GroupChallengesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useGroup(id); const { refreshing, refresh } = useCommunityRefresh();
  if (query.isLoading) return <PageSkeleton title="Desafios do clube" back />;
  if (query.error || !query.data) return <QueryError title="Desafios do clube" back error={query.error} onRetry={query.refetch} />;
  const g = query.data;
  return <Page topBar={<TopBar title="Desafios do clube" back />} refreshing={refreshing} onRefresh={refresh}>
    {g.challenges.map(c => <ChallengeCard key={c.id} challenge={c} />)}
    {!g.challenges.length && <Text muted>{g.my_role ? 'Ainda não há desafios neste clube.' : 'Entre no clube para ver os desafios.'}</Text>}
    {g.my_role && <Button title="Criar desafio" onPress={() => router.push({ pathname: '/community/create-challenge', params: { groupId: id } })} />}
  </Page>;
}
