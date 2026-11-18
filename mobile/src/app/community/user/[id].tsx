import { useCommunityRefresh } from '@/hooks/use-community-refresh';
import { useLocalSearchParams } from 'expo-router';
import { CommunityFeed } from '@/components/community-feed';
import { Avatar, Button, Page, PageSkeleton, QueryError, Text, TopBar } from '@/components/ui';
import { useFollowUser, useBlockUser, useCommunityProfile, useReport, useRespondFriendRequest, } from '@/hooks/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useCommunityProfile(id); const respond = useRespondFriendRequest(); const block = useBlockUser(); const report = useReport(); const follow = useFollowUser();
  const { refreshing, refresh } = useCommunityRefresh();
  const error = (e: unknown) => AppAlert.alert('Não foi possível concluir', errorMessage(e));
  if (query.isLoading) return <PageSkeleton title="Perfil" back />;
  if (query.error || !query.data) return <QueryError title="Perfil" back error={query.error} onRetry={query.refetch} />;
  const p = query.data;
  return <Page topBar={<TopBar title={p.name} back />} refreshing={refreshing} onRefresh={refresh}>
    <Avatar name={p.name} uri={p.profile_picture} size={72} /><Text variant="titleSm">{p.name} · nível {p.level}</Text>
    <Text muted>{p.friend_count} seguindo · {p.shared_groups} grupos em comum</Text>
    {p.stats.month_workouts !== undefined && <Text>{p.stats.month_workouts} treinos neste mês · {p.stats.month_minutes} min</Text>}
    {p.stats.workout_streak !== undefined && <Text>{p.stats.workout_streak} dias de sequência</Text>}
    {p.incoming_request_id && <Button title="Aceitar solicitação para seguir você" loading={respond.isPending} onPress={() => respond.mutate({ id: p.incoming_request_id!, accept: true }, { onError: error })} />}
    {p.friendship !== 'self' && <>
      <Button title={p.follow_state === 'accepted' ? 'Deixar de seguir' : p.follow_state === 'pending' ? 'Cancelar solicitação' : 'Seguir'} variant={p.follow_state === 'none' ? 'primary' : 'soft'} loading={follow.isPending} onPress={() => follow.mutate({ id, follow: p.follow_state === 'none' }, { onError: error })} />
      {p.follow_state === 'pending' && <Text muted>Solicitação enviada. Aguardando o aceite.</Text>}
      <Button title={p.blocked_by_me ? 'Desbloquear' : 'Bloquear pessoa'} variant="soft" loading={block.isPending} onPress={() => AppAlert.alert(p.blocked_by_me ? 'Desbloquear pessoa?' : 'Bloquear pessoa?', 'O bloqueio oculta publicações e remove as conexões.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', style: 'destructive', onPress: () => block.mutate({ userId: id, block: !p.blocked_by_me }, { onError: error }) }])} />
      <Button title="Denunciar perfil" variant="soft" loading={report.isPending} onPress={() => report.mutate({ target_type: 'user', target_id: id }, { onSuccess: () => AppAlert.alert('Denúncia enviada'), onError: error })} />
    </>}
    {!p.blocked_by_me && <CommunityFeed scope={{ scope: 'user', userId: id }} />}
  </Page>;
}
