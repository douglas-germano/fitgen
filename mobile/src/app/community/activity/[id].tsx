import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityCard, openProfile } from '@/components/community';
import { Pressable, View } from 'react-native';
import { BackBar, GroupTitle, SCREEN_COLUMN } from '@/components/grouped';
import { Avatar, Button, Input, Page, PageSkeleton, QueryError, Row, Text } from '@/components/ui';
import { timeAgo } from '@/lib/community';
import { useActivity, useAddComment, useComments, useDeleteComment, useReport } from '@/hooks/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useActivity(id); const comments = useComments(id); const add = useAddComment(id); const del = useDeleteComment(id); const report = useReport(); const [text, setText] = useState('');
  const error = (e: unknown) => AppAlert.alert('Não foi possível concluir', errorMessage(e));
  if (query.isLoading) return <PageSkeleton title="Publicação" back />;
  if (query.error || !query.data) return <QueryError title="Publicação" back error={query.error} onRetry={query.refetch} />;
  return <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN} refreshing={query.isRefetching} onRefresh={() => { query.refetch(); comments.refetch(); }}>
    <ActivityCard activity={query.data} detail />
    <GroupTitle title="Comentários" />
    {comments.isLoading && <Text>Carregando comentários…</Text>}
    {comments.error && <Button title="Tentar carregar comentários" onPress={() => comments.refetch()} />}
    {comments.data?.map(c => <Row key={c.id} style={{ alignItems: 'flex-start', gap: 12 }}>
      <Pressable onPress={() => openProfile(c.user.id)} accessibilityRole="button" accessibilityLabel={`Perfil de ${c.user.name}`}><Avatar name={c.user.name} uri={c.user.profile_picture} size={32} /></Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 14, lineHeight: 20 }}><Text style={{ fontSize: 14, lineHeight: 20, fontWeight: '700' }}>{c.user.name.split(' ')[0]} </Text>{c.text}</Text>
        <Row style={{ gap: 16 }}>
          <Text variant="caption">{timeAgo(c.created_at)}</Text>
          {c.is_mine || query.data?.is_mine
            ? <Pressable hitSlop={8} accessibilityRole="button" onPress={() => AppAlert.alert('Excluir comentário?', undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => del.mutate(c.id, { onError: error }) }])}><Text variant="caption" style={{ fontWeight: '600' }}>Excluir</Text></Pressable>
            : <Pressable hitSlop={8} accessibilityRole="button" onPress={() => report.mutate({ target_type: 'comment', target_id: c.id }, { onSuccess: () => AppAlert.alert('Denúncia enviada'), onError: error })}><Text variant="caption" style={{ fontWeight: '600' }}>Denunciar</Text></Pressable>}
        </Row>
      </View>
    </Row>)}
    <Input label="Seu comentário" value={text} onChangeText={setText} maxLength={500} multiline />
    <Button title="Comentar" disabled={!text.trim()} loading={add.isPending} onPress={() => add.mutate(text.trim(), { onSuccess: () => setText(''), onError: error })} />
  </Page>;
}
