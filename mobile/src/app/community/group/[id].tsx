import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { shareMessage } from '@/lib/share';
import { useState } from 'react';
import { Info, Link2, LogOut, Settings, SquarePen, Trophy, Users } from 'lucide-react-native';
import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { GroupAvatar } from '@/components/group-photo';
import { CommunityFeed } from '@/components/community-feed';
import { Button, MoreButton, Page, PageSkeleton, QueryError, Text, TopBar } from '@/components/ui';
import { useGroup, useJoinGroup, useLeaveGroup } from '@/hooks/community';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';
import { groupInviteMessage } from '@/lib/community';
import { AppAlert } from '@/lib/feedback';
import { errorMessage } from '@/lib/api';
import { useColors } from '@/providers/theme';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useGroup(id); const join = useJoinGroup(); const leave = useLeaveGroup();
  const { refreshing, refresh } = useCommunityRefresh();
  const [optionsOpen, setOptionsOpen] = useState(false);
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
    <Button title={g.member_count >= 20 ? 'Clube cheio' : 'Entrar no clube'} disabled={g.member_count >= 20} loading={join.isPending} onPress={() => join.mutate({ group_id: id }, { onError: error })} />
  </Page>;
  return <View style={{ flex: 1, backgroundColor: Colors.surface }}>
    <Page topBar={<TopBar title={g.name} titleAccessory={<GroupAvatar group={g} size={30} />} back action={g.my_role === 'admin' ? <MoreButton onPress={() => setOptionsOpen(true)} /> : undefined} />} refreshing={refreshing} onRefresh={refresh} contentStyle={{ paddingBottom: FAB_CLEARANCE }}>
      <CommunityFeed scope={{ scope: 'group', groupId: id }} />
    </Page>
    <FloatingAddButton label="Adicionar ao clube" hint="Abre publicações, desafios e informações do clube" onPress={() => setCreateOpen(true)} />
    <ActionMenu visible={createOpen} title="O que você quer fazer?" onClose={() => setCreateOpen(false)} items={[
      { key: 'post', icon: SquarePen, tone: 'volt', title: 'Nova publicação', caption: 'Compartilhe um momento com o clube', onPress: () => router.push({ pathname: '/community/post', params: { groupId: id } }) },
      { key: 'challenge', icon: Trophy, title: 'Novo desafio', caption: 'Defina uma meta para a turma', onPress: () => router.push({ pathname: '/community/create-challenge', params: { groupId: id } }) },
      { key: 'info', icon: Info, title: 'Informações do clube', caption: 'Membros, ranking e detalhes do clube', onPress: () => router.push(`/community/group/${id}/members`) },
    ]} />
    {g.my_role === 'admin' && <ActionMenu title="Opções do clube" visible={optionsOpen} onClose={() => setOptionsOpen(false)} items={[
      { key: 'settings', icon: Settings, title: 'Gerenciar clube', caption: 'Foto, nome, privacidade e administradores', onPress: () => router.push(`/community/group/${id}/settings`) },
      { key: 'members', icon: Users, title: 'Membros e ranking', onPress: () => router.push(`/community/group/${id}/members`) },
      { key: 'challenges', icon: Trophy, title: 'Desafios do clube', onPress: () => router.push(`/community/group/${id}/challenges`) },
      { key: 'invite', icon: Link2, title: 'Compartilhar convite', onPress: () => { void shareMessage(groupInviteMessage(g.name, g.invite_code ?? '')).catch(error); } },
      { key: 'leave', icon: LogOut, title: 'Sair do clube', onPress: () => AppAlert.alert('Sair do clube?', undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: () => leave.mutate(id, { onSuccess: () => router.replace('/(tabs)/social'), onError: error }) }]) },
    ]} />}
  </View>;
}
