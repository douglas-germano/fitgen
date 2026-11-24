import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { ChallengeSection } from '@/components/community';
import { BackBar, SCREEN_COLUMN } from '@/components/grouped';
import { IconButton, Page } from '@/components/ui';
import { useChallenges } from '@/hooks/community';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';

export default function ChallengesScreen() {
  const mine = useChallenges('mine');
  const available = useChallenges('available');
  const { refreshing, refresh } = useCommunityRefresh();
  return <Page topBar={<BackBar><IconButton icon={Plus} label="Criar desafio" variant="volt" onPress={() => router.push('/community/create-challenge')} /></BackBar>}
    contentStyle={SCREEN_COLUMN} refreshing={refreshing} onRefresh={refresh}>
    <ChallengeSection title="Seus desafios" query={mine} empty="Participe de um desafio abaixo para começar." />
    <ChallengeSection title="Para participar" query={available} empty="Novos desafios aparecerão por aqui. Você também pode criar um para seu clube." />
  </Page>;
}
