import { useCommunityRefresh } from '@/hooks/use-community-refresh';
import { router } from 'expo-router';
import { ChevronRight, Crown, Search, Settings, SquarePen, Trophy, UserPlus, UserRound, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { GroupAvatar } from '@/components/group-photo';
import { CommunityFeed } from '@/components/community-feed';
import { ChallengeCard } from '@/components/community';
import { BellButton, Button, Card, Page, Row, Text, TopBar } from '@/components/ui';
import { tabBarClearance, Spacing } from '@/constants/theme';
import { useChallenges, useGroups, usePublicGroups } from '@/hooks/community';
import { useUnreadNotifications } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { useColors } from '@/providers/theme';

type FeedTab = 'clubs' | 'challenges' | 'following';
const TABS: { value: FeedTab; label: string }[] = [
  { value: 'clubs', label: 'Clubes' },
  { value: 'challenges', label: 'Desafios' },
  { value: 'following', label: 'Seguindo' },
];

export default function SocialScreen() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [tab, setTab] = useState<FeedTab>('clubs');
  const groups = useGroups();
  const publicGroups = usePublicGroups();
  const unread = useUnreadNotifications();
  const { refreshing, refresh } = useCommunityRefresh();
  const bottom = tabBarClearance(insets.bottom) + Spacing.five;
  const [actionsOpen, setActionsOpen] = useState(false);

  return <View style={{ flex: 1, backgroundColor: Colors.surface }}>
    <Page tab topBar={<TopBar title="Comunidade"
      action={<BellButton unread={unread.data?.length ?? 0} />} />}
      refreshing={refreshing} onRefresh={refresh}
      contentStyle={{ gap: 0, paddingBottom: FAB_CLEARANCE }}>
      <Row accessibilityRole="tablist" style={{ marginHorizontal: -Spacing.five, borderBottomWidth: 1, borderBottomColor: Colors.line }}>
        {TABS.map(t => <Pressable key={t.value} onPress={() => setTab(t.value)} accessibilityRole="tab"
          accessibilityLabel={t.label} accessibilityState={{ selected: tab === t.value }}
          style={({ pressed }) => ({ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2,
            borderBottomColor: tab === t.value ? Colors.volt : 'transparent', backgroundColor: pressed ? Colors.surfaceSunken : 'transparent' })}>
          <Text style={{ fontSize: 15, fontWeight: tab === t.value ? '700' : '500' }} color={tab === t.value ? Colors.ink : Colors.inkMuted}>{t.label}</Text>
        </Pressable>)}
      </Row>

      {tab === 'clubs' && <>
        {groups.isLoading && <View style={{ paddingVertical: 40 }}><Text muted style={{ textAlign: 'center' }}>Carregando seus clubes…</Text></View>}
        {groups.error && <View style={{ paddingVertical: 40, gap: 16 }}><Text muted>{errorMessage(groups.error)}</Text><Button title="Tentar novamente" onPress={() => groups.refetch()} /></View>}
        {!groups.isLoading && !groups.error && !groups.data?.length && !publicGroups.isLoading && !publicGroups.data?.length && <View style={{ minHeight: Math.max(420, height - insets.top - bottom - 200), justifyContent: 'center', alignItems: 'center', paddingVertical: 36, gap: 24 }}>
          <RankingIllustration />
          <View style={{ gap: 12, alignItems: 'center', maxWidth: 340 }}>
            <Text style={{ fontSize: 28, lineHeight: 35, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center' }}>Seu treino tem turma.</Text>
            <Text muted style={{ textAlign: 'center', fontSize: 15, lineHeight: 24, paddingHorizontal: 8 }}>Entre em um clube para compartilhar os treinos, incentivar outras pessoas e acompanhar o ranking da semana.</Text>
          </View>
          <Row style={{ gap: 10, width: '100%', maxWidth: 370, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button title="Entrar com código" size="lg" variant="soft" style={{ flexGrow: 1 }} onPress={() => router.push('/community/join')} />
            <Button title="Criar clube" size="lg" style={{ flexGrow: 1 }} onPress={() => router.push('/community/create-group')} />
          </Row>
        </View>}
        {!!groups.data?.length && <View style={{ paddingTop: 24, gap: 16 }}>
          <Text variant="titleSm">Seus clubes</Text>
          {groups.data.map(g => <Card key={g.id} onPress={() => router.push(`/community/group/${g.id}`)}>
            <Row style={{ gap: 12 }}>
              <GroupAvatar group={g} size={48} />
              <View style={{ flex: 1, gap: 4 }}><Text variant="titleSm">{g.name}</Text><Text variant="caption">{g.is_public ? 'Público' : 'Privado'} · {g.member_count} {g.member_count === 1 ? 'pessoa' : 'pessoas'} · {g.week_workouts ?? 0} treinos na semana</Text></View>
              <ChevronRight size={18} color={Colors.inkMuted} />
            </Row>
            {g.description && <Text muted numberOfLines={2}>{g.description}</Text>}
          </Card>)}
          <Button title="Entrar em outro clube" variant="soft" onPress={() => router.push('/community/join')} />
        </View>}
      {(!!groups.data?.length || !!publicGroups.data?.length || publicGroups.isLoading || publicGroups.error) && <View style={{ paddingTop: 24 }}><PublicClubs query={publicGroups} /></View>}
      </>}
      {tab === 'challenges' && <View style={{ paddingTop: 24, gap: 24 }}><ChallengesList /></View>}
      {tab === 'following' && <View style={{ paddingTop: 24 }}><CommunityFeed scope={{ scope: 'home' }} /></View>}
    </Page>
    <FloatingAddButton label="Adicionar à comunidade" hint="Abre as ações da comunidade" onPress={() => setActionsOpen(true)} />
    <ActionMenu visible={actionsOpen} title="O que você quer fazer?" onClose={() => setActionsOpen(false)} items={[
      { key: 'post', icon: SquarePen, tone: 'chip', title: 'Nova publicação', caption: 'Compartilhe um momento com sua turma', onPress: () => router.push('/community/post') },
      { key: 'search', icon: Search, tone: 'volt', title: 'Buscar pessoas', caption: 'Encontre amigos pelo nome e siga', onPress: () => router.push('/community/people') },
      { key: 'create', icon: Users, title: 'Criar clube', caption: 'Reúna sua turma para treinar', onPress: () => router.push('/community/create-group') },
      { key: 'join', icon: UserPlus, title: 'Entrar com código', caption: 'Use o convite de um clube', onPress: () => router.push('/community/join') },
      { key: 'challenge', icon: Trophy, title: 'Novo desafio', caption: 'Defina uma meta para seu clube', onPress: () => router.push('/community/create-challenge') },
      { key: 'settings', icon: Settings, title: 'Configurações', caption: 'Conta, pessoas e privacidade', onPress: () => router.push('/profile') },
    ]} />
  </View>;
}

/** Decorative podium: no fabricated members or standings. */
function RankingIllustration() {
  const Colors = useColors();
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: '100%', maxWidth: 270, height: 206, overflow: 'hidden' }}>
    <View style={{ marginHorizontal: 8, borderRadius: 28, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.surfaceSunken, padding: 18, paddingBottom: 0, height: 206 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '700' }}>Ranking semanal</Text>
        <View style={{ padding: 7, borderRadius: 20, backgroundColor: Colors.voltSoft }}><Trophy size={15} color={Colors.voltInk} /></View>
      </Row>
      <Row style={{ flex: 1, gap: 10, alignItems: 'flex-end', justifyContent: 'center', paddingTop: 16 }}>
        {[{ place: 2, height: 42 }, { place: 1, height: 66 }, { place: 3, height: 32 }].map(p => <View key={p.place} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
          {p.place === 1 && <Crown size={20} color={Colors.voltInk} />}
          <View style={{ width: p.place === 1 ? 48 : 38, height: p.place === 1 ? 48 : 38, borderRadius: 30, backgroundColor: p.place === 1 ? Colors.volt : Colors.surfaceChip, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: p.place === 1 ? Colors.volt : Colors.line }}>
            <UserRound size={p.place === 1 ? 24 : 19} color={p.place === 1 ? Colors.onVolt : Colors.inkMuted} />
          </View>
          <View style={{ width: '100%', height: p.height, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: p.place === 1 ? Colors.voltSoft : Colors.surfaceChip, alignItems: 'center', paddingTop: 10 }}><Text style={{ fontSize: 14, fontWeight: '700' }} color={p.place === 1 ? Colors.voltInk : Colors.inkMuted}>{p.place}</Text></View>
        </View>)}
      </Row>
    </View>
  </View>;
}

function PublicClubs({ query }: { query: ReturnType<typeof usePublicGroups> }) {
  return <View style={{ gap: 16 }}>
    <Text variant="titleSm">Clubes públicos</Text>
    {query.isLoading && <Text muted>Carregando clubes…</Text>}
    {query.error && <Button title="Tentar carregar clubes" variant="soft" onPress={() => query.refetch()} />}
    {query.data?.length === 0 && <Text muted>Ainda não há clubes públicos. Crie um e reúna sua turma.</Text>}
    {query.data?.map(g => <Card key={g.id} onPress={() => router.push(`/community/group/${g.id}`)}>
      <Row style={{ gap: 12 }}><GroupAvatar group={g} /><View style={{ flex: 1, gap: 4 }}><Text variant="titleSm">{g.name}</Text><Text variant="caption">Público · {g.member_count} {g.member_count === 1 ? 'pessoa' : 'pessoas'}{g.my_role ? ' · Você participa' : ''}</Text></View><ChevronRight size={18} /></Row>
      {g.description && <Text muted numberOfLines={2}>{g.description}</Text>}
    </Card>)}
  </View>;
}

function ChallengesList() {
  const mine = useChallenges('mine');
  const available = useChallenges('available');
  return <View style={{ gap: 24 }}>
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
  </View>;
}
