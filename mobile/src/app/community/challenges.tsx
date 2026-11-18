import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { ChallengeCard } from '@/components/community';
import { Button, IconButton, Page, Text, TopBar } from '@/components/ui';
import { useChallenges } from '@/hooks/community';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';

export default function ChallengesScreen() {
  const mine = useChallenges('mine');
  const available = useChallenges('available');
  const { refreshing, refresh } = useCommunityRefresh();
  return <Page topBar={<TopBar title="Desafios" back action={<IconButton icon={Plus} label="Criar desafio" variant="volt" onPress={() => router.push('/community/create-challenge')} />} />} refreshing={refreshing} onRefresh={refresh}>
    <View style={{ gap: 16 }}>
      <Text variant="titleSm">Seus desafios</Text>
      {mine.isLoading && <Text muted>Carregando desafios…</Text>}
      {mine.error && <Button title="Tentar carregar seus desafios" variant="soft" onPress={() => mine.refetch()} />}
      {mine.data?.length === 0 && <Text muted>Participe de um desafio abaixo para começar.</Text>}
      {mine.data?.map(c => <ChallengeCard key={c.id} challenge={c} />)}
    </View>
    <View style={{ gap: 16 }}>
      <Text variant="titleSm">Para participar</Text>
      {available.isLoading && <Text muted>Carregando…</Text>}
      {available.error && <Button title="Tentar carregar desafios disponíveis" variant="soft" onPress={() => available.refetch()} />}
      {available.data?.length === 0 && <Text muted>Novos desafios aparecerão por aqui. Você também pode criar um para seu clube.</Text>}
      {available.data?.map(c => <ChallengeCard key={c.id} challenge={c} />)}
    </View>
  </Page>;
}
