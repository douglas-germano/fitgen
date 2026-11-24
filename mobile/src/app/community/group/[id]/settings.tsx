import { ClubVisibility } from '@/components/club-visibility';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';
import { GroupPhotoPicker } from '@/components/group-photo';
import { router, useLocalSearchParams } from 'expo-router';
import { shareMessage } from '@/lib/share';
import { openProfile } from '@/components/community';
import { LogOut, MoreHorizontal, Pencil, RefreshCw, Share2, ShieldCheck, Trash2, Trophy, Users } from 'lucide-react-native';
import { BackBar, Group, GroupRow, MediaRow, SCREEN_COLUMN } from '@/components/grouped';
import { Avatar, Button, Dialog, IconButton, Input, Page, PageSkeleton, QueryError, Row, Text, type DialogHandle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useDeleteGroup, useGroup, useLeaveGroup, useNudge, useRemoveMember, useRotateInvite, useSetMemberRole, useUpdateGroup, useSetGroupImage } from '@/hooks/community';
import { groupInviteMessage } from '@/lib/community';
import { AppActionSheet, AppAlert } from '@/lib/feedback';
import { errorMessage } from '@/lib/api';
import { useRef, useState } from 'react';

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useGroup(id);
  const leave = useLeaveGroup(); const del = useDeleteGroup(); const nudge = useNudge(id); const remove = useRemoveMember(id); const role = useSetMemberRole(id); const rotate = useRotateInvite(id); const update = useUpdateGroup(id); const image = useSetGroupImage(id);
  const { refreshing, refresh } = useCommunityRefresh();
  const [editing, setEditing] = useState(false);
  const error = (e: unknown) => AppAlert.alert('Não foi possível concluir', errorMessage(e));
  const confirm = (title: string, run: () => void) => AppAlert.alert(title, undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', style: 'destructive', onPress: run }]);
  if (query.isLoading) return <PageSkeleton title="Grupo" back />;
  if (query.error || !query.data) return <QueryError title="Grupo" back error={query.error} onRetry={query.refetch} />;
  const g = query.data;
  if (g.my_role !== 'admin') return <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN}>
    <Group><GroupRow icon={ShieldCheck} title="Somente administradores podem gerenciar este clube" /></Group>
  </Page>;
  return <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN} refreshing={refreshing} onRefresh={refresh}>
    <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700', paddingHorizontal: Spacing.two }}>Opções do clube</Text>
    <GroupPhotoPicker group={g} name={g.name} busy={image.isPending}
      onPick={uri => image.mutate(uri, { onError: error })}
      onRemove={() => confirm('Remover a foto do clube?', () => image.mutate(null, { onError: error }))} />
    <Group title="Clube">
      <GroupRow icon={Pencil} title="Nome e privacidade" caption={`${g.name} · ${g.is_public ? 'Público' : 'Privado'}`}
        onPress={() => setEditing(true)} />
      <GroupRow icon={Share2} title="Compartilhar convite" value={g.invite_code ?? null} onPress={() => { void shareMessage(groupInviteMessage(g.name, g.invite_code ?? '')).catch(error); }} />
      <GroupRow icon={RefreshCw} title="Trocar código de convite" caption="O código antigo deixa de funcionar" onPress={rotate.isPending ? undefined : () => confirm('Invalidar o convite antigo?', () => rotate.mutate(undefined, { onError: error }))} />
    </Group>
    <Group title="Atalhos">
      <GroupRow icon={Users} title="Membros e ranking" onPress={() => router.push(`/community/group/${id}/members`)} />
      <GroupRow icon={Trophy} title="Desafios do clube" onPress={() => router.push(`/community/group/${id}/challenges`)} />
    </Group>
    <Group title="Membros">
      {g.members.filter(m => !m.blocked).map(m => <MediaRow key={m.user.id}
        leading={<Avatar name={m.user.name} uri={m.user.profile_picture} size={40} />}
        title={`${m.user.name}${m.is_me ? ' (você)' : ''}`}
        caption={`${m.role === 'admin' ? 'Admin' : 'Membro'} · ${m.workouts} treinos · ${m.active_days} dias ativos`}
        onPress={() => openProfile(m.user.id)}
        trailing={m.is_me ? undefined : <Row style={{ gap: Spacing.two }}>
          {m.inactive && <Button size="sm" variant="soft" title="Chamar" loading={nudge.isPending} onPress={() => nudge.mutate(m.user.id, { onSuccess: () => AppAlert.alert('Chamado enviado!'), onError: error })} />}
          <IconButton icon={MoreHorizontal} size="sm" label={`Gerenciar ${m.user.name}`} onPress={() => AppActionSheet.showActionSheetWithOptions({ options: [m.role === 'admin' ? 'Tornar membro' : 'Tornar admin', 'Remover do clube', 'Cancelar'], cancelButtonIndex: 2, destructiveButtonIndex: 1 }, i => {
            if (i === 0) role.mutate({ userId: m.user.id, role: m.role === 'admin' ? 'member' : 'admin' }, { onError: error });
            if (i === 1) confirm(`Remover ${m.user.name}?`, () => remove.mutate(m.user.id, { onError: error }));
          })} />
        </Row>} />)}
    </Group>
    <Group>
      <GroupRow icon={LogOut} title="Sair do clube" onPress={leave.isPending ? undefined : () => confirm('Sair do clube?', () => leave.mutate(id, { onSuccess: () => router.replace('/(tabs)/social'), onError: error }))} />
      <GroupRow icon={Trash2} title="Excluir clube" caption="Apaga o clube e todas as publicações" onPress={del.isPending ? undefined : () => confirm('Excluir clube e suas publicações?', () => del.mutate(id, { onSuccess: () => router.replace('/(tabs)/social'), onError: error }))} />
    </Group>
    {editing && <EditClubSheet group={g} saving={update.isPending} onClose={() => setEditing(false)}
      onSave={(data, done) => update.mutate(data, { onSuccess: done, onError: error })} />}
  </Page>;
}

/** Name, description and visibility in a bottom sheet, like the other edit forms. */
function EditClubSheet({ group, saving, onSave, onClose }: {
  group: { name: string; description?: string | null; is_public: boolean };
  saving: boolean;
  onSave: (data: { name: string; description: string; is_public: boolean }, done: () => void) => void;
  onClose: () => void;
}) {
  const sheet = useRef<DialogHandle>(null);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [isPublic, setIsPublic] = useState(group.is_public);
  return (
    <Dialog ref={sheet} sheet sheetSize="registration" visible onClose={onClose} title="Nome e privacidade"
      footer={<Button size="lg" title="Salvar" disabled={!name.trim()} loading={saving}
        onPress={() => onSave({ name: name.trim(), description, is_public: isPublic }, () => sheet.current?.dismiss())} />}>
      <Input label="Nome do clube" value={name} onChangeText={setName} maxLength={60} />
      <Input label="Descrição (opcional)" value={description} onChangeText={setDescription} maxLength={280} multiline />
      <ClubVisibility isPublic={isPublic} onChange={setIsPublic} />
    </Dialog>
  );
}
