import { router } from 'expo-router';
import { useState } from 'react';
import { openProfile } from '@/components/community';
import { Button, Card, Input, Page, Row, Text, TopBar } from '@/components/ui';
import { useFollowUser, useFriends, useUserSearch } from '@/hooks/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
export default function PeopleScreen() {
  const friends = useFriends(); const follow = useFollowUser();
  const [search, setSearch] = useState(''); const results = useUserSearch(search);
  const error = (e: unknown) => AppAlert.alert('Não foi possível concluir', errorMessage(e));
  return <Page topBar={<TopBar title="Pessoas" back />} refreshing={friends.isRefetching} onRefresh={friends.refetch}>
    <Input label="Buscar pessoas por nome" value={search} onChangeText={setSearch} maxLength={80} />
    <Text muted>Encontre uma pessoa e toque em Seguir. Ela recebe uma solicitação para aceitar nas notificações.</Text>
    <Text variant="caption">A busca mostra pessoas que permitem ser encontradas e pessoas dos seus clubes.</Text>
    {results.isFetching && <Text muted>Buscando…</Text>}
    {results.error && <Button title="Tentar buscar novamente" onPress={() => results.refetch()} />}
    {results.data?.map(u => <Card key={u.id}><Row style={{ gap: 12, flexWrap: 'wrap' }}>
      <Button title={u.name} variant="soft" onPress={() => openProfile(u.id)} />
      <Button title={u.follow_state === 'accepted' ? 'Seguindo' : u.follow_state === 'pending' ? 'Solicitado' : 'Seguir'} disabled={u.follow_state === 'accepted' || u.follow_state === 'pending'} loading={follow.isPending && follow.variables?.id === u.id} onPress={() => follow.mutate({ id: u.id, follow: true }, { onError: error })} />
    </Row></Card>)}
    {search.trim().length >= 2 && results.data?.length === 0 && <Text muted>Nenhuma pessoa encontrada.</Text>}
    {friends.isLoading && <Text>Carregando…</Text>}
    {friends.error && <Button title="Tentar carregar pessoas" onPress={() => friends.refetch()} />}
    {!!friends.data?.received.length && <Button title={`Solicitações recebidas (${friends.data.received.length})`} onPress={() => router.push('/notifications')} />}
    <Text variant="titleSm">Seguindo</Text>
    {friends.data?.friends.length === 0 && <Text muted>As pessoas aparecerão aqui depois que aceitarem sua solicitação.</Text>}
    {friends.data?.friends.map(f => <Card key={f.id} onPress={() => openProfile(f.user.id)}><Text>{f.user.name} · nível {f.user.level}</Text></Card>)}
    <Text variant="titleSm">Solicitações enviadas</Text>
    {friends.data?.sent.map(f => <Card key={f.id}><Button title={f.user.name} variant="soft" onPress={() => openProfile(f.user.id)} /><Button title="Cancelar solicitação" variant="soft" loading={follow.isPending && follow.variables?.id === f.user.id} onPress={() => follow.mutate({ id: f.user.id, follow: false }, { onError: error })} /></Card>)}
  </Page>;
}
