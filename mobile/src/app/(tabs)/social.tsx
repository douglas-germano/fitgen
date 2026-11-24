import { useCommunityRefresh } from '@/hooks/use-community-refresh';
import { router } from 'expo-router';
import { Crown, Search, Settings, Sparkles, SquarePen, Trophy, UserPlus, UserRound, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { GroupAvatar } from '@/components/group-photo';
import { CommunityFeed } from '@/components/community-feed';
import { ChallengeSection } from '@/components/community';
import { Group, GroupRow, MediaRow, SCREEN_COLUMN } from '@/components/grouped';
import { BellButton, Button, Chips, Page, Row, Text } from '@/components/ui';
import { tabBarClearance, Spacing } from '@/constants/theme';
import { useChallenges, useGroups, useJoinGroup, usePublicGroups } from '@/hooks/community';
import { usePremium } from '@/hooks/use-premium';
import { openPremiumSheet } from '@/lib/premium-sheet';
import { AppAlert } from '@/lib/feedback';
import { useUnreadNotifications } from '@/hooks/queries';
import { errorMessage, isPremiumRequired } from '@/lib/api';
import { discoverClubs } from '@/lib/community';
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
    <Page tab topBar={
      <Row style={{ width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'space-between' }}>
        <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}>Comunidade</Text>
        <BellButton unread={unread.data?.length ?? 0} />
      </Row>}
      refreshing={refreshing} onRefresh={refresh}
      contentStyle={{ ...SCREEN_COLUMN, paddingBottom: FAB_CLEARANCE }}>
      <View accessibilityRole="tablist">
        <Chips options={TABS} value={tab} onChange={setTab} />
      </View>

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
        {!!groups.data?.length && <Group title="Seus clubes">
          {groups.data.map(g => <MediaRow key={g.id} leading={<GroupAvatar group={g} size={44} />} title={g.name}
            caption={`${g.official ? 'Oficial · ' : ''}${g.is_public ? 'Público' : 'Privado'} · ${g.member_count} ${g.member_count === 1 ? 'pessoa' : 'pessoas'} · ${g.week_workouts ?? 0} treinos na semana`}
            onPress={() => router.push(`/community/group/${g.id}`)} />)}
          <GroupRow icon={UserPlus} title="Entrar em outro clube" onPress={() => router.push('/community/join')} />
        </Group>}
      <ProClub query={publicGroups} />
      {(!!groups.data?.length || !!publicGroups.data?.length || publicGroups.isLoading || publicGroups.error) && <PublicClubs query={publicGroups} />}
      </>}
      {tab === 'challenges' && <ChallengesList />}
      {tab === 'following' && <CommunityFeed scope={{ scope: 'home' }} />}
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

/** The subscribers' club: Premium joins in one tap, everyone else sees what it is and can subscribe. */
function ProClub({ query }: { query: ReturnType<typeof usePublicGroups> }) {
  const Colors = useColors();
  const { isPremium } = usePremium();
  const join = useJoinGroup();
  const pro = query.data?.find(g => g.premium_only);
  if (!pro || pro.my_role) return null;
  const enter = () => isPremium
    ? join.mutate({ group_id: pro.id }, { onSuccess: () => router.push(`/community/group/${pro.id}`), onError: e => { if (!isPremiumRequired(e)) AppAlert.alert('Não foi possível entrar', errorMessage(e)); } })
    : openPremiumSheet('pro_club');
  return <Group title="FitGen PRO">
    <MediaRow leading={<GroupAvatar group={pro} size={44} />} title={pro.name} captionLines={3}
      caption={isPremium ? 'Exclusivo para assinantes · você já pode entrar' : 'Exclusivo para quem assina o FitGen PRO'}
      onPress={join.isPending ? undefined : enter}
      trailing={isPremium
        ? <Button size="sm" title="Entrar" loading={join.isPending} onPress={enter} />
        : <View style={{ paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: 8, backgroundColor: Colors.volt }}><Text style={{ fontSize: 12, fontWeight: '700' }} color={Colors.onVolt}>PRO</Text></View>} />
  </Group>;
}

function PublicClubs({ query }: { query: ReturnType<typeof usePublicGroups> }) {
  const [showAll, setShowAll] = useState(false);
  const { forYou, popular } = discoverClubs(query.data ?? []);
  const people = (n: number) => `${n} ${n === 1 ? 'pessoa' : 'pessoas'}`;
  if (query.isLoading || query.error || !popular.length) return <Group title="Clubes públicos">
    {query.isLoading && <GroupRow icon={Users} title="Carregando clubes…" />}
    {query.error && <GroupRow icon={Users} title="Não foi possível carregar os clubes" caption="Toque para tentar novamente" onPress={() => query.refetch()} />}
    {query.data?.length === 0 && <GroupRow icon={Users} title="Ainda não há clubes públicos" caption="Crie um e reúna sua turma." onPress={() => router.push('/community/create-group')} />}
  </Group>;
  return <>
    <Group title="Para você">
      {!forYou.length && <GroupRow icon={Sparkles} title="Você já está nos clubes sugeridos" caption="Crie um clube e chame quem você segue." onPress={() => router.push('/community/create-group')} />}
      {forYou.map(g => {
        const followed = g.followed_members ?? 0;
        return <MediaRow key={g.id} leading={<GroupAvatar group={g} size={44} />} title={g.name}
          caption={[g.official ? 'Oficial' : null, followed ? `${followed} ${followed === 1 ? 'pessoa que você segue' : 'pessoas que você segue'}` : people(g.member_count), g.description].filter(Boolean).join(' · ')}
          onPress={() => router.push(`/community/group/${g.id}`)} />;
      })}
    </Group>
    <Group title="Mais populares" action={popular.length > 5 ? (showAll ? 'Ver menos' : 'Ver todos') : undefined} onAction={() => setShowAll(v => !v)}>
      {(showAll ? popular : popular.slice(0, 5)).map((g, i) => <MediaRow key={g.id}
        leading={<View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Text muted style={{ width: 18, textAlign: 'right', fontVariant: ['tabular-nums'], fontWeight: '600' }}>{i + 1}</Text>
          <GroupAvatar group={g} size={44} />
        </View>}
        title={g.name} caption={`${g.official ? 'Oficial · ' : ''}${people(g.member_count)}${g.my_role ? ' · Você participa' : ''}`}
        onPress={() => router.push(`/community/group/${g.id}`)} />)}
    </Group>
  </>;
}

function ChallengesList() {
  const mine = useChallenges('mine');
  const available = useChallenges('available');
  return <>
    <ChallengeSection title="Seus desafios" query={mine} empty="Participe de um desafio abaixo para começar." />
    <ChallengeSection title="Para participar" query={available} empty="Novos desafios aparecerão por aqui. Você também pode criar um para seu clube." />
  </>;
}
