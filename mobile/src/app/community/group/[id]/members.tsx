import { router, useLocalSearchParams } from 'expo-router';
import { LogOut, Sparkles, Trophy } from 'lucide-react-native';
import { View } from 'react-native';
import { openProfile } from '@/components/community';
import { GroupAvatar } from '@/components/group-photo';
import { BackBar, Group, GroupRow, HeaderCard, MediaRow, SCREEN_COLUMN } from '@/components/grouped';
import { Avatar, Page, PageSkeleton, QueryError, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useGroup, useGroupSummary, useLeaveGroup } from '@/hooks/community';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';
import { AppAlert } from '@/lib/feedback';
import { errorMessage } from '@/lib/api';
export default function GroupMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useGroup(id); const leave = useLeaveGroup(); const summary = useGroupSummary(id);
  const { refreshing, refresh } = useCommunityRefresh();
  if (query.isLoading) return <PageSkeleton title="Membros e ranking" back />;
  if (query.error || !query.data) return <QueryError title="Membros e ranking" back error={query.error} onRetry={query.refetch} />;
  const g = query.data;
  return <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN} refreshing={refreshing} onRefresh={refresh}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.two }}>
      <GroupAvatar group={g} size={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, fontWeight: '700' }} numberOfLines={2}>{g.name}</Text>
        <Text muted style={{ fontSize: 13 }}>{g.is_public ? 'Público' : 'Privado'} · {g.member_count} {g.member_count === 1 ? 'pessoa' : 'pessoas'}</Text>
      </View>
    </View>
    {g.description ? <Text muted style={{ paddingHorizontal: Spacing.two }}>{g.description}</Text> : null}
    <Group title="Ranking da semana">
      {!g.my_role && <GroupRow icon={Trophy} title="Entre no clube para ver os membros e o ranking" />}
      {g.members.filter(m => !m.blocked).map(m => <MediaRow key={m.user.id}
        leading={<View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Text muted style={{ width: 20, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{m.rank}</Text>
          <Avatar name={m.user.name} uri={m.user.profile_picture} size={36} />
        </View>}
        title={`${m.user.name}${m.is_me ? ' (você)' : ''}`}
        caption={`${m.workouts} treinos · ${m.active_days} dias ativos · ${m.minutes} min${m.role === 'admin' ? ' · Admin' : ''}`}
        onPress={() => openProfile(m.user.id)} />)}
    </Group>
    {g.my_role && (summary.data?.text ? (
      <HeaderCard title="Resumo da semana">
        <Text style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>{summary.data.text}</Text>
      </HeaderCard>
    ) : null)}
    {g.my_role && <Group>
      <GroupRow icon={Sparkles} title="Resumo da semana" caption={summary.isFetching ? 'Gerando…' : summary.error ? 'Resumo indisponível agora.' : 'O Otto resume como foi a semana do clube'} onPress={summary.isFetching ? undefined : () => summary.refetch()} />
      <GroupRow icon={Trophy} title="Desafios do clube" onPress={() => router.push(`/community/group/${id}/challenges`)} />
      <GroupRow icon={LogOut} title="Sair do clube" onPress={leave.isPending ? undefined : () => AppAlert.alert('Sair do clube?', undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: () => leave.mutate(id, { onSuccess: () => router.replace('/(tabs)/social'), onError: e => AppAlert.alert('Não foi possível sair', errorMessage(e)) }) }])} />
    </Group>}
  </Page>;
}
