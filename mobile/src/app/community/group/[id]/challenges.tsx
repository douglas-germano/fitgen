import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Trophy } from 'lucide-react-native';
import { ChallengeCard } from '@/components/community';
import { BackBar, Group, GroupRow, GroupTitle, SCREEN_COLUMN } from '@/components/grouped';
import { Page, PageSkeleton, QueryError } from '@/components/ui';
import { useGroup } from '@/hooks/community';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';
export default function GroupChallengesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useGroup(id); const { refreshing, refresh } = useCommunityRefresh();
  if (query.isLoading) return <PageSkeleton title="Desafios do clube" back />;
  if (query.error || !query.data) return <QueryError title="Desafios do clube" back error={query.error} onRetry={query.refetch} />;
  const g = query.data;
  return <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN} refreshing={refreshing} onRefresh={refresh}>
    <GroupTitle title={`Desafios · ${g.name}`} />
    {g.challenges.map(c => <ChallengeCard key={c.id} challenge={c} />)}
    {!g.challenges.length && <Group><GroupRow icon={Trophy} title={g.my_role ? 'Ainda não há desafios neste clube' : 'Entre no clube para ver os desafios'} /></Group>}
    {g.my_role && <Group><GroupRow icon={Plus} title="Criar desafio" onPress={() => router.push({ pathname: '/community/create-challenge', params: { groupId: id } })} /></Group>}
  </Page>;
}
