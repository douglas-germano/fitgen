import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useState } from 'react';
import { ChevronLeft, Info, Settings, SquarePen, Trophy } from 'lucide-react-native';
import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { GroupAvatar } from '@/components/group-photo';
import { CommunityFeed } from '@/components/community-feed';
import { Button, IconButton, Page, PageSkeleton, QueryError, Row, Text, TopBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useGroup, useJoinGroup } from '@/hooks/community';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';
import { AppAlert } from '@/lib/feedback';
import { errorMessage } from '@/lib/api';
import { useColors } from '@/providers/theme';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useGroup(id); const join = useJoinGroup();
  const { refreshing, refresh } = useCommunityRefresh();
  const [createOpen, setCreateOpen] = useState(false);
  const Colors = useColors();
  const error = (e: unknown) => AppAlert.alert('Não foi possível concluir', errorMessage(e));
  if (query.isLoading) return <PageSkeleton title="Clube" back />;
  if (query.error || !query.data) return <QueryError title="Clube" back error={query.error} onRetry={query.refetch} />;
  const g = query.data;
  if (!g.my_role) return <Page topBar={<TopBar title={g.name} titleAccessory={<GroupAvatar group={g} size={30} />} back />} refreshing={refreshing} onRefresh={refresh}>
    <Text variant="titleSm">Clube público · {g.member_count} {g.member_count === 1 ? 'pessoa' : 'pessoas'}</Text>
    {g.description && <Text muted>{g.description}</Text>}
    <Text muted>Entre para acompanhar o feed, o ranking e os desafios deste clube.</Text>
    <Button title="Entrar no clube" loading={join.isPending} onPress={() => join.mutate({ group_id: id }, { onError: error })} />
  </Page>;
  // Header: back · club photo and name (opens members and ranking) · gear for admins (opens the club options).
  const header = <Row style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: Spacing.two }}>
    <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/social')} />
    <Pressable onPress={() => router.push(`/community/group/${id}/members`)} accessibilityRole="button" accessibilityLabel={`${g.name}, ver membros e ranking`}
      style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: 24, backgroundColor: pressed ? Colors.surfaceSunken : 'transparent' })}>
      <GroupAvatar group={g} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 16, lineHeight: 21, fontWeight: '600' }} accessibilityRole="header" numberOfLines={1}>{g.name}</Text>
        <Text muted style={{ fontSize: 12, lineHeight: 16 }} numberOfLines={1}>{g.member_count} {g.member_count === 1 ? 'pessoa' : 'pessoas'} · ver membros</Text>
      </View>
    </Pressable>
    {g.my_role === 'admin' && <IconButton icon={Settings} label="Configurações do clube" onPress={() => router.push(`/community/group/${id}/settings`)} />}
  </Row>;
  return <View style={{ flex: 1, backgroundColor: Colors.surface }}>
    <Page topBar={header} refreshing={refreshing} onRefresh={refresh} contentStyle={{ width: '100%', maxWidth: 480, alignSelf: 'center', paddingBottom: FAB_CLEARANCE }}>
      <CommunityFeed scope={{ scope: 'group', groupId: id }} />
    </Page>
    <FloatingAddButton label="Adicionar ao clube" hint="Abre publicações, desafios e informações do clube" onPress={() => setCreateOpen(true)} />
    <ActionMenu visible={createOpen} title="O que você quer fazer?" onClose={() => setCreateOpen(false)} items={[
      { key: 'post', icon: SquarePen, tone: 'volt', title: 'Nova publicação', caption: 'Compartilhe um momento com o clube', onPress: () => router.push({ pathname: '/community/post', params: { groupId: id } }) },
      { key: 'challenge', icon: Trophy, title: 'Novo desafio', caption: 'Defina uma meta para a turma', onPress: () => router.push({ pathname: '/community/create-challenge', params: { groupId: id } }) },
      { key: 'info', icon: Info, title: 'Informações do clube', caption: 'Membros, ranking e detalhes do clube', onPress: () => router.push(`/community/group/${id}/members`) },
    ]} />
  </View>;
}
