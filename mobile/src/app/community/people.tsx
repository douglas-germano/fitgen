import { router } from 'expo-router';
import { Bell, Search, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { openProfile } from '@/components/community';
import { BackBar, Group, GroupRow, MediaRow, SCREEN_COLUMN } from '@/components/grouped';
import { Avatar, Button, Input, Page, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useFollowUser, useFriends, useUserSearch } from '@/hooks/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
export default function PeopleScreen() {
  const friends = useFriends(); const follow = useFollowUser();
  const [search, setSearch] = useState(''); const results = useUserSearch(search);
  const error = (e: unknown) => AppAlert.alert('Não foi possível concluir', errorMessage(e));
  const searching = search.trim().length >= 2;
  return <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN} refreshing={friends.isRefetching} onRefresh={friends.refetch}>
    <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700', paddingHorizontal: Spacing.two }}>Pessoas</Text>
    <Input placeholder="Buscar pessoas por nome" accessibilityLabel="Buscar pessoas por nome" value={search} onChangeText={setSearch} maxLength={80} right={<Search size={18} />} />
    <Text muted style={{ fontSize: 13, paddingHorizontal: Spacing.two }}>A busca mostra quem permite ser encontrado e as pessoas dos seus clubes. Ao seguir, a pessoa recebe uma solicitação para aceitar.</Text>
    {searching && <Group title="Resultados">
      {results.isFetching && <GroupRow icon={Search} title="Buscando…" />}
      {results.error && <GroupRow icon={Search} title="Não foi possível buscar" caption="Toque para tentar novamente" onPress={() => results.refetch()} />}
      {!results.isFetching && results.data?.length === 0 && <GroupRow icon={Search} title="Nenhuma pessoa encontrada" />}
      {results.data?.map(u => <MediaRow key={u.id} leading={<Avatar name={u.name} uri={u.profile_picture} size={40} />} title={u.name} onPress={() => openProfile(u.id)}
        trailing={<Button size="sm" variant={u.follow_state === 'none' ? 'primary' : 'soft'} title={u.follow_state === 'accepted' ? 'Seguindo' : u.follow_state === 'pending' ? 'Solicitado' : 'Seguir'}
          disabled={u.follow_state === 'accepted' || u.follow_state === 'pending'} loading={follow.isPending && follow.variables?.id === u.id}
          onPress={() => follow.mutate({ id: u.id, follow: true }, { onError: error })} />} />)}
    </Group>}
    {friends.error && <Group><GroupRow icon={UserRound} title="Não foi possível carregar" caption="Toque para tentar novamente" onPress={() => friends.refetch()} /></Group>}
    {!!friends.data?.received.length && <Group>
      <GroupRow icon={Bell} title="Solicitações recebidas" value={String(friends.data.received.length)} dot onPress={() => router.push('/notifications')} />
    </Group>}
    <Group title="Seguindo">
      {friends.isLoading && <GroupRow icon={UserRound} title="Carregando…" />}
      {friends.data?.friends.length === 0 && <GroupRow icon={UserRound} title="Ninguém ainda" caption="As pessoas aparecem aqui depois que aceitarem sua solicitação." />}
      {friends.data?.friends.map(f => <MediaRow key={f.id} leading={<Avatar name={f.user.name} uri={f.user.profile_picture} size={40} />} title={f.user.name} caption={`Nível ${f.user.level}`} onPress={() => openProfile(f.user.id)} />)}
    </Group>
    {!!friends.data?.sent.length && <Group title="Solicitações enviadas">
      {friends.data.sent.map(f => <MediaRow key={f.id} leading={<Avatar name={f.user.name} uri={f.user.profile_picture} size={40} />} title={f.user.name} onPress={() => openProfile(f.user.id)}
        trailing={<Button size="sm" title="Cancelar" variant="soft" loading={follow.isPending && follow.variables?.id === f.user.id} onPress={() => follow.mutate({ id: f.user.id, follow: false }, { onError: error })} />} />)}
    </Group>}
  </Page>;
}
