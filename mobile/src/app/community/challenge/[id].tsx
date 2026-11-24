import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Trash2, Trophy, Users } from 'lucide-react-native';
import { View } from 'react-native';
import { ChallengeCard, openProfile } from '@/components/community';
import { BackBar, Group, GroupRow, MediaRow, SCREEN_COLUMN } from '@/components/grouped';
import { Avatar, Button, Page, PageSkeleton, QueryError, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useChallenge, useDeleteChallenge, useJoinChallenge } from '@/hooks/community';
import { metricUnit } from '@/lib/community';
import { formatDayMonth } from '@/lib/workout';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useChallenge(id); const join = useJoinChallenge(); const del = useDeleteChallenge();
  const error = (e: unknown) => AppAlert.alert('Erro no desafio', errorMessage(e));
  if (query.isLoading) return <PageSkeleton title="Desafio" back />;
  if (query.error || !query.data) return <QueryError title="Desafio" back error={query.error} onRetry={query.refetch} />;
  const c = query.data;
  const canToggle = !c.completed && (c.joined || c.status !== 'ended');
  const toggle = () => {
    const run = () => join.mutate({ id, join: !c.joined }, { onError: error });
    if (c.joined) AppAlert.alert('Sair do desafio?', undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: run }]); else run();
  };
  return <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN} refreshing={query.isRefetching} onRefresh={query.refetch}
    footer={canToggle ? <Button size="lg" title={c.joined ? 'Sair do desafio' : 'Participar'} variant={c.joined ? 'soft' : 'primary'} loading={join.isPending} onPress={toggle} /> : undefined}>
    <ChallengeCard challenge={c} largeCover onPress={() => {}} />
    {c.description ? <Text style={{ paddingHorizontal: Spacing.two }}>{c.description}</Text> : null}
    <Group>
      <GroupRow icon={CalendarDays} title="Período" value={`${formatDayMonth(`${c.start_date}T12:00:00`, false)} a ${formatDayMonth(`${c.end_date}T12:00:00`, false)}`} />
      <GroupRow icon={Users} title="Progresso visível" caption="Calculado pelos registros do FitGen. Quem participa vê o progresso dos outros." captionLines={3} />
    </Group>
    <Group title="Participantes">
      {c.leaderboard.length === 0 && <GroupRow icon={Trophy} title="Ninguém participando ainda" />}
      {c.leaderboard.map(p => <MediaRow key={p.user.id}
        leading={<View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Text muted style={{ width: 20, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{p.rank}</Text>
          <Avatar name={p.user.name} uri={p.user.profile_picture} size={36} />
        </View>}
        title={`${p.user.name}${p.is_me ? ' (você)' : ''}`}
        caption={`${p.progress}/${c.target} ${metricUnit(c.metric)}${p.completed ? ' · Concluído 🏆' : ''}`}
        onPress={() => openProfile(p.user.id)} />)}
    </Group>
    {c.can_delete && <Group>
      <GroupRow icon={Trash2} title="Excluir desafio" onPress={del.isPending ? undefined : () => AppAlert.alert('Excluir desafio?', undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => del.mutate(id, { onSuccess: () => router.back(), onError: error }) }])} />
    </Group>}
  </Page>;
}
