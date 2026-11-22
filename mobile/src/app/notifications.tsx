import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Bell, CheckCheck, ChevronLeft, Flame, Heart, LayoutGrid, Users, Utensils, type LucideIcon } from 'lucide-react-native';
import { Group, GroupRow } from '@/components/grouped';
import { Button, Chips, IconButton, Page, PageSkeleton, QueryError, Row, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useFriends, useRespondFriendRequest } from '@/hooks/community';
import { useMarkNotificationRead, useNotifications } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { communityNotificationPath } from '@/lib/community';
import { AppAlert } from '@/lib/feedback';
import type { AppNotification } from '@/types/api';

type Filter = 'all' | 'goals' | 'achievements' | 'notices';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' }, { value: 'goals', label: 'Metas' },
  { value: 'achievements', label: 'Conquistas' }, { value: 'notices', label: 'Avisos' },
];
const GOAL_TYPES = ['hydration', 'nutrition', 'workout', 'goal', 'reminder'];
const ICONS: Record<string, LucideIcon> = { achievement: Flame, hydration: Heart, workout: LayoutGrid, nutrition: Utensils, social: Users };
function matches(n: AppNotification, filter: Filter) {
  if (filter === 'all') return true;
  if (filter === 'achievements') return n.type === 'achievement';
  if (filter === 'goals') return GOAL_TYPES.includes(n.type);
  return n.type !== 'achievement' && !GOAL_TYPES.includes(n.type);
}
function groupLabel(iso: string) {
  const d = new Date(iso); const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}
export default function NotificationsScreen() {
  const query = useNotifications(); const requests = useFriends(); const respond = useRespondFriendRequest();
  const markRead = useMarkNotificationRead(); const [filter, setFilter] = useState<Filter>('all'); const [markingAll, setMarkingAll] = useState(false);
  const error = (e: unknown) => AppAlert.alert('Não foi possível concluir', errorMessage(e));
  if (query.isLoading) return <PageSkeleton title="Notificações" back />;
  if (query.error) return <QueryError title="Notificações" back error={query.error} onRetry={query.refetch} />;
  const data = query.data ?? [];
  const list = data.filter(n => matches(n, filter)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const groups = list.reduce<{ label: string; items: AppNotification[] }[]>((acc, n) => {
    const label = groupLabel(n.created_at); const group = acc.find(g => g.label === label);
    if (group) group.items.push(n); else acc.push({ label, items: [n] });
    return acc;
  }, []);
  const unread = data.filter(n => !n.is_read);
  const refresh = () => { void query.refetch(); void requests.refetch(); };
  const markAll = async () => {
    setMarkingAll(true);
    try { await Promise.all(unread.map(n => markRead.mutateAsync(n.id))); } catch (e) { error(e); }
    finally { setMarkingAll(false); }
  };
  return <Page topBar={
    <Row style={{ width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'space-between' }}>
      <IconButton icon={ChevronLeft} label="Voltar" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
      {unread.length > 0 && <IconButton icon={CheckCheck} label="Marcar todas como lidas" onPress={markingAll ? undefined : markAll} />}
    </Row>
  } refreshing={query.isRefetching} onRefresh={refresh}
    contentStyle={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: Spacing.four }}>
    <Chips options={FILTERS} value={filter} onChange={setFilter} />
    {requests.error && <Group>
      <GroupRow icon={Users} title="Não foi possível carregar as solicitações" caption="Toque para tentar novamente" onPress={() => requests.refetch()} />
    </Group>}
    {list.length === 0 && <Group>
      <GroupRow icon={Bell} title="Nenhuma notificação por enquanto" caption={filter === 'all' ? 'Avisos sobre metas, conquistas e a comunidade aparecem aqui.' : 'Nada nesta categoria.'} />
    </Group>}
    {groups.map(g => <Group key={g.label} title={g.label}>
      {g.items.map(n => {
        const request = requests.data?.received.find(r => r.id === n.link_id);
        const isRequest = n.link_type === 'community_follow_request' || n.link_type === 'community_friends';
        const busy = respond.isPending;
        const path = isRequest ? (request ? `/community/user/${request.user.id}` : null) : communityNotificationPath(n.link_type, n.link_id);
        const open = () => {
          if (!n.is_read) markRead.mutate(n.id, { onError: error });
          if (path) router.push(path as `/community/activity/${string}`);
        };
        const time = new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return <View key={n.id}>
          <GroupRow icon={ICONS[n.type] ?? Bell} title={n.title} caption={n.message} captionLines={4} value={time} dot={!n.is_read}
            accessibilityLabel={`${n.is_read ? '' : 'Não lida. '}${n.title}. ${n.message}`}
            onPress={path || !n.is_read ? open : undefined} />
          {isRequest && request && <Row style={{ gap: Spacing.two, paddingLeft: 56, paddingRight: Spacing.four, paddingBottom: Spacing.three }}>
            <Button size="sm" title="Aceitar" style={{ flex: 1 }} loading={busy && respond.variables?.id === request.id && respond.variables.accept} disabled={busy} onPress={() => respond.mutate({ id: request.id, accept: true }, { onError: error })} />
            <Button size="sm" title="Recusar" variant="soft" style={{ flex: 1 }} disabled={busy} onPress={() => respond.mutate({ id: request.id, accept: false }, { onError: error })} />
          </Row>}
          {isRequest && !request && !requests.error && <Text muted style={{ fontSize: 12, paddingLeft: 56, paddingBottom: Spacing.three }}>{requests.isLoading ? 'Carregando solicitação…' : 'Solicitação encerrada.'}</Text>}
        </View>;
      })}
    </Group>)}
  </Page>;
}
