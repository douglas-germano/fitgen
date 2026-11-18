import { ClubVisibility } from '@/components/club-visibility';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';
import { GroupPhotoPicker } from '@/components/group-photo';
import { router, useLocalSearchParams } from 'expo-router';
import { shareMessage } from '@/lib/share';
import { openProfile } from '@/components/community';
import { Button, Card, Input, Page, PageSkeleton, QueryError, Row, Text, TopBar } from '@/components/ui';
import { useDeleteGroup, useGroup, useLeaveGroup, useNudge, useRemoveMember, useRotateInvite, useSetMemberRole, useUpdateGroup, useSetGroupImage } from '@/hooks/community';
import { groupInviteMessage } from '@/lib/community';
import { AppActionSheet, AppAlert } from '@/lib/feedback';
import { errorMessage } from '@/lib/api';
import { useState } from 'react';

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useGroup(id);
  const leave = useLeaveGroup(); const del = useDeleteGroup(); const nudge = useNudge(id); const remove = useRemoveMember(id); const role = useSetMemberRole(id); const rotate = useRotateInvite(id); const update = useUpdateGroup(id); const image = useSetGroupImage(id);
  const { refreshing, refresh } = useCommunityRefresh();
  const [editing, setEditing] = useState(false); const [isPublic, setIsPublic] = useState(false); const [name, setName] = useState(''); const [description, setDescription] = useState('');
  const error = (e: unknown) => AppAlert.alert('Não foi possível concluir', errorMessage(e));
  const confirm = (title: string, run: () => void) => AppAlert.alert(title, undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', style: 'destructive', onPress: run }]);
  if (query.isLoading) return <PageSkeleton title="Grupo" back />;
  if (query.error || !query.data) return <QueryError title="Grupo" back error={query.error} onRetry={query.refetch} />;
  const g = query.data;
  if (g.my_role !== 'admin') return <Page topBar={<TopBar title="Opções do clube" back />}><Text>Somente administradores podem gerenciar este clube.</Text></Page>;
  return <Page topBar={<TopBar title="Opções do clube" back />} refreshing={refreshing} onRefresh={refresh}>
    <GroupPhotoPicker group={g} name={g.name} busy={image.isPending}
      onPick={uri => image.mutate(uri, { onError: error })}
      onRemove={() => confirm('Remover a foto do clube?', () => image.mutate(null, { onError: error }))} />
    {g.description && <Text muted>{g.description}</Text>}
    <Text muted>{g.is_public ? 'Público' : 'Privado'} · {g.member_count} {g.member_count === 1 ? 'pessoa' : 'pessoas'} · Código: {g.invite_code}</Text>
    <Button title="Compartilhar convite" onPress={() => shareMessage(groupInviteMessage(g.name, g.invite_code ?? '')).catch(error)} />
      <Button title="Editar nome e privacidade" variant="soft" onPress={() => { setName(g.name); setDescription(g.description ?? ''); setIsPublic(g.is_public); setEditing(!editing); }} />
      {editing && <><Input label="Nome" value={name} onChangeText={setName} maxLength={60} /><Input label="Descrição" value={description} onChangeText={setDescription} maxLength={280} /><ClubVisibility isPublic={isPublic} onChange={setIsPublic} /><Button title="Salvar" disabled={!name.trim()} loading={update.isPending} onPress={() => update.mutate({ name, description, is_public: isPublic }, { onSuccess: () => setEditing(false), onError: error })} /></>}
    <Text variant="titleSm">Gerenciar membros</Text>
    {g.members.filter(m => !m.blocked).map(m => <Card key={m.user.id}>
      <Button title={`${m.rank}. ${m.user.name}${m.is_me ? ' (você)' : ''}`} variant="soft" onPress={() => openProfile(m.user.id)} />
      <Text muted>{m.workouts} treinos · {m.active_days} dias ativos · {m.minutes} min · {m.role === 'admin' ? 'Admin' : 'Membro'}</Text>
      {!m.is_me && <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        {m.inactive && <Button title="Chamar para treinar" loading={nudge.isPending} onPress={() => nudge.mutate(m.user.id, { onSuccess: () => AppAlert.alert('Chamado enviado!'), onError: error })} />}
        {g.my_role === 'admin' && <Button title="Gerenciar" variant="soft" onPress={() => AppActionSheet.showActionSheetWithOptions({ options: [m.role === 'admin' ? 'Tornar membro' : 'Tornar admin', 'Remover do grupo', 'Cancelar'], cancelButtonIndex: 2, destructiveButtonIndex: 1 }, i => {
          if (i === 0) role.mutate({ userId: m.user.id, role: m.role === 'admin' ? 'member' : 'admin' }, { onError: error });
          if (i === 1) confirm(`Remover ${m.user.name}?`, () => remove.mutate(m.user.id, { onError: error }));
        })} />}
      </Row>}
    </Card>)}
    {g.my_role === 'admin' && <>
      <Button title="Trocar código de convite" variant="soft" loading={rotate.isPending} onPress={() => confirm('Invalidar o convite antigo?', () => rotate.mutate(undefined, { onError: error }))} />
      <Button title="Excluir grupo" variant="soft" loading={del.isPending} onPress={() => confirm('Excluir grupo e suas publicações?', () => del.mutate(id, { onSuccess: () => router.replace('/(tabs)/social'), onError: error }))} />
    </>}
    <Button title="Sair do grupo" variant="soft" loading={leave.isPending} onPress={() => confirm('Sair do grupo?', () => leave.mutate(id, { onSuccess: () => router.replace('/(tabs)/social'), onError: error }))} />
  </Page>;
}
