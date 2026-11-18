import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Bell, Flame, Heart, LayoutGrid, Users, Utensils, type LucideIcon } from 'lucide-react-native';
import { BadgeIcon, Button, Card, Chips, EmptyState, Page, PageSkeleton, QueryError, Row, Text, TopBar } from '@/components/ui';
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
  return <Page topBar={<TopBar title="Notificações" back />} refreshing={query.isRefetching} onRefresh={refresh}>
    <Chips options={FILTERS} value={filter} onChange={setFilter} />
    {requests.error && <Button variant="soft" title="Tentar carregar solicitações" onPress={() => requests.refetch()} />}
    {list.length === 0 && <EmptyState icon={Bell} message="Nenhuma notificação por enquanto." />}
    {groups.map(g => <View key={g.label} style={{ gap: Spacing.three }}>
      <Text variant="label" muted>{g.label}</Text>
      {g.items.map(n => {
        const request = requests.data?.received.find(r => r.id === n.link_id);
        const isRequest = n.link_type === 'community_follow_request' || n.link_type === 'community_friends';
        const busy = respond.isPending;
        const open = () => {
          if (!n.is_read) markRead.mutate(n.id, { onError: error });
          if (isRequest) {
            if (request) router.push(`/community/user/${request.user.id}`);
          } else {
            const path = communityNotificationPath(n.link_type, n.link_id);
            if (path) router.push(path as `/community/activity/${string}`);
          }
        };
        return <Card key={n.id}>
          <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${n.is_read ? '' : 'Não lida. '}${n.title}. ${n.message}`}>
            <Row style={{ gap: 12, alignItems: 'flex-start' }}>
              <BadgeIcon icon={ICONS[n.type] ?? Bell} tone={n.is_read ? 'chip' : 'volt'} size={32} />
              <View style={{ flex: 1, gap: 5 }}>
                <Text variant="titleSm">{n.title}</Text><Text muted style={{ fontSize: 13, lineHeight: 19 }}>{n.message}</Text>
                <Text variant="caption">{new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </Row>
          </Pressable>
          {isRequest && request && <Row style={{ gap: 10 }}>
            <Button title="Aceitar" style={{ flex: 1 }} loading={busy && respond.variables?.id === request.id && respond.variables.accept} disabled={busy} onPress={() => respond.mutate({ id: request.id, accept: true }, { onError: error })} />
            <Button title="Recusar" variant="soft" style={{ flex: 1 }} disabled={busy} onPress={() => respond.mutate({ id: request.id, accept: false }, { onError: error })} />
          </Row>}
          {isRequest && !request && !requests.error && <Text variant="caption">{requests.isLoading ? 'Carregando solicitação…' : 'Solicitação encerrada.'}</Text>}
        </Card>;
      })}
    </View>)}
    {unread.length > 0 && <Button size="lg" variant="soft" title="Marcar Todas como Lidas" onPress={markAll} loading={markingAll} />}
  </Page>;
}
