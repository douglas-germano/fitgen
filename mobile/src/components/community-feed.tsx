import { Users } from 'lucide-react-native';
import { View } from 'react-native';
import { ActivityCard } from '@/components/community';
import { Button, EmptyState, Text } from '@/components/ui';
import { feedItems, useFeed, type FeedScope } from '@/hooks/community';
import { errorMessage } from '@/lib/api';

export function CommunityFeed({ scope }: { scope: FeedScope }) {
  const query = useFeed(scope);
  const items = feedItems(query.data);
  return <View>
    {query.isLoading && <Text muted>Carregando publicações…</Text>}
    {query.error && <><Text>{errorMessage(query.error)}</Text><Button title="Tentar novamente" onPress={() => query.refetch()} /></>}
    {!query.isLoading && !query.error && !items.length && <EmptyState icon={Users} message={scope.scope === 'group' ? 'Ainda não há publicações neste clube. Compartilhe o primeiro treino.' : 'Ainda não há publicações por aqui.'} />}
    {items.map(a => <ActivityCard key={a.id} activity={a} />)}
    {query.hasNextPage && <Button title="Ver mais" variant="soft" loading={query.isFetchingNextPage} onPress={() => query.fetchNextPage()} />}
  </View>;
}
