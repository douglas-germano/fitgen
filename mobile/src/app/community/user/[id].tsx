import { router, useLocalSearchParams } from 'expo-router';
import { Ban, Check, Clock, Flame, Flag, MoreHorizontal, Timer, UserCheck, UserPlus, Users, Dumbbell, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ActionMenu } from '@/components/action-menu';
import { CommunityFeed } from '@/components/community-feed';
import { BackBar, GROUP_RADIUS, GroupTitle, SCREEN_COLUMN, Tile, TileColors, TileRow } from '@/components/grouped';
import { Avatar, Badge, Button, Card, IconButton, Page, PageSkeleton, QueryError, Row, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useBlockUser, useCommunityProfile, useFollowUser, useReport, useRespondFriendRequest } from '@/hooks/community';
import { useCommunityRefresh } from '@/hooks/use-community-refresh';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
import { useColors } from '@/providers/theme';

/** Profile of another person: identity, social counts, follow action, month highlights and posts. */
export default function UserScreen() {
  const Colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useCommunityProfile(id);
  const respond = useRespondFriendRequest();
  const block = useBlockUser();
  const report = useReport();
  const follow = useFollowUser();
  const { refreshing, refresh } = useCommunityRefresh();
  const [menuOpen, setMenuOpen] = useState(false);
  const error = (e: unknown) => AppAlert.alert('Não foi possível concluir', errorMessage(e));

  if (query.isLoading) return <PageSkeleton title="Perfil" back />;
  if (query.error || !query.data) return <QueryError title="Perfil" back error={query.error} onRetry={query.refetch} />;

  const p = query.data;
  const isSelf = p.friendship === 'self';
  const firstName = p.name.split(' ')[0];
  const { month_workouts: workouts, month_minutes: minutes, workout_streak: streak } = p.stats;
  const highlights: { icon: LucideIcon; color: string; value: string; label: string }[] = [];
  if (workouts !== undefined) highlights.push({ icon: Dumbbell, color: TileColors.orange, value: String(workouts), label: workouts === 1 ? 'treino no mês' : 'treinos no mês' });
  if (minutes !== undefined) highlights.push({ icon: Timer, color: TileColors.blue, value: String(minutes), label: 'min no mês' });
  if (streak !== undefined) highlights.push({ icon: Flame, color: TileColors.red, value: String(streak), label: streak === 1 ? 'dia seguido' : 'dias seguidos' });

  const toggleBlock = () => AppAlert.alert(
    p.blocked_by_me ? 'Desbloquear pessoa?' : 'Bloquear pessoa?',
    'O bloqueio oculta publicações e remove as conexões.',
    [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', style: 'destructive', onPress: () => block.mutate({ userId: id, block: !p.blocked_by_me }, { onError: error }) }],
  );

  const followTitle = p.follow_state === 'accepted' ? 'Seguindo' : p.follow_state === 'pending' ? 'Solicitado' : p.follows_me ? 'Seguir de volta' : 'Seguir';
  const followIcon = p.follow_state === 'accepted' ? UserCheck : p.follow_state === 'pending' ? Clock : UserPlus;

  return <>
    <Page
      topBar={<BackBar>{isSelf ? null : <IconButton icon={MoreHorizontal} label="Mais opções" onPress={() => setMenuOpen(true)} />}</BackBar>}
      refreshing={refreshing} onRefresh={refresh} contentStyle={SCREEN_COLUMN}>

      <View style={{ alignItems: 'center', gap: Spacing.three }}>
        <View style={{ padding: 4, borderRadius: 64, borderWidth: 2, borderColor: Colors.volt }}>
          <Avatar name={p.name} uri={p.profile_picture} size={104} />
        </View>
        <View style={{ alignItems: 'center', gap: Spacing.two }}>
          <Text variant="titleLg" style={{ textAlign: 'center' }}>{p.name}</Text>
          <Row style={{ gap: Spacing.two, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Badge label={`Nível ${p.level}`} tone="soft" />
            {p.follows_me && !isSelf && <Badge label="Segue você" tone="chip" />}
          </Row>
        </View>
      </View>

      <Row style={{ borderRadius: GROUP_RADIUS, borderCurve: 'continuous', backgroundColor: Colors.surfaceSunken, paddingVertical: Spacing.four }}>
        <Count value={p.follower_count} label="Seguidores" />
        <Divider />
        <Count value={p.friend_count} label="Seguindo" />
        <Divider />
        <Count value={p.shared_groups} label={isSelf ? 'Clubes' : 'Clubes em comum'} />
      </Row>

      {p.incoming_request_id && <Card style={{ backgroundColor: Colors.voltSoft }}>
        <Text style={{ fontWeight: '600' }} color={Colors.voltInk}>{firstName} quer seguir você</Text>
        <Row style={{ gap: Spacing.three }}>
          <Button title="Aceitar" icon={Check} style={{ flex: 1 }} loading={respond.isPending && respond.variables?.accept === true}
            onPress={() => respond.mutate({ id: p.incoming_request_id!, accept: true }, { onError: error })} />
          <Button title="Recusar" variant="soft" style={{ flex: 1 }} loading={respond.isPending && respond.variables?.accept === false}
            onPress={() => respond.mutate({ id: p.incoming_request_id!, accept: false }, { onError: error })} />
        </Row>
      </Card>}

      {isSelf
        ? <Button title="Editar meu perfil" variant="soft" onPress={() => router.push('/profile-edit')} />
        : !p.blocked_by_me && <Button
          title={followTitle} icon={followIcon} size="lg"
          variant={p.follow_state === 'none' ? 'primary' : 'soft'}
          loading={follow.isPending}
          onPress={() => follow.mutate({ id, follow: p.follow_state === 'none' }, { onError: error })}
          accessibilityLabel={p.follow_state === 'accepted' ? `Deixar de seguir ${p.name}` : p.follow_state === 'pending' ? `Cancelar solicitação para ${p.name}` : `Seguir ${p.name}`} />}
      {p.follow_state === 'pending' && <Text variant="caption" style={{ textAlign: 'center', marginTop: -Spacing.two }}>Aguardando {firstName} aceitar. Toque para cancelar.</Text>}

      {p.blocked_by_me && <Card style={{ alignItems: 'center' }}>
        <Text muted style={{ textAlign: 'center' }}>Você bloqueou {firstName}. As publicações ficam ocultas.</Text>
        <Button title="Desbloquear" variant="soft" loading={block.isPending} onPress={toggleBlock} />
      </Card>}

      {!p.blocked_by_me && <>
        {!!highlights.length && <View style={{ gap: Spacing.three }}>
          <GroupTitle title="Este mês" />
          <TileRow>
            {highlights.map(h => <Tile key={h.label} icon={h.icon} color={h.color} value={h.value} title={h.label} />)}
          </TileRow>
        </View>}

        {!!p.shared_group_list?.length && <View style={{ gap: Spacing.three }}>
          <GroupTitle title={isSelf ? 'Seus clubes' : 'Clubes em comum'} />
          <Row style={{ flexWrap: 'wrap', gap: Spacing.two }}>
            {p.shared_group_list.map(g => <Pressable key={g.id} onPress={() => router.push(`/community/group/${g.id}`)} accessibilityRole="button" accessibilityLabel={`Abrir clube ${g.name}`}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: pressed ? Colors.volt : Colors.surfaceChip })}>
              <Users size={14} color={Colors.ink} />
              <Text style={{ fontSize: 13, fontWeight: '600' }}>{g.name}</Text>
            </Pressable>)}
          </Row>
        </View>}

        <View style={{ gap: Spacing.three }}>
          <GroupTitle title="Publicações" />
          <CommunityFeed scope={{ scope: 'user', userId: id }} />
        </View>
      </>}
    </Page>

    <ActionMenu visible={menuOpen} title={p.name} onClose={() => setMenuOpen(false)} items={[
      { key: 'block', icon: Ban, title: p.blocked_by_me ? 'Desbloquear' : 'Bloquear pessoa', caption: 'Oculta publicações e remove as conexões', onPress: toggleBlock },
      { key: 'report', icon: Flag, title: 'Denunciar perfil', caption: 'Avise a equipe sobre conteúdo impróprio', onPress: () => report.mutate({ target_type: 'user', target_id: id }, { onSuccess: () => AppAlert.alert('Denúncia enviada'), onError: error }) },
    ]} />
  </>;
}

function Count({ value, label }: { value?: number; label: string }) {
  return <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
    <Text variant="titleMd">{value ?? '–'}</Text>
    <Text variant="caption" style={{ textAlign: 'center' }}>{label}</Text>
  </View>;
}

function Divider() {
  const Colors = useColors();
  return <View style={{ width: 1, height: 28, backgroundColor: Colors.line }} />;
}
