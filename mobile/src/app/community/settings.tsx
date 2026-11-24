import { UserRound } from 'lucide-react-native';
import { SwitchRow } from '@/components/community';
import { BackBar, Group, GroupRow, MediaRow, SCREEN_COLUMN } from '@/components/grouped';
import { Avatar, Button, Page, PageSkeleton, QueryError, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useBlocks, useBlockUser, useCommunitySettings, useSaveCommunitySettings } from '@/hooks/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
import type { CommunitySettings } from '@/types/api';
const fields: { key: keyof CommunitySettings; title: string; caption: string }[] = [
  { key: 'share_workouts', title: 'Treinos concluídos', caption: 'Publicar treinos na sua turma e incluir no ranking.' },
  { key: 'share_achievements', title: 'Conquistas', caption: 'Publicar novas conquistas.' },
  { key: 'share_streaks', title: 'Sequências', caption: 'Publicar marcos de dias seguidos e dias ativos no ranking.' },
  { key: 'share_challenges', title: 'Desafios concluídos', caption: 'Publicar quando você completar um desafio.' },
  { key: 'share_hydration', title: 'Meta de água', caption: 'Compartilhar quando bater sua meta de água.' },
  { key: 'discoverable', title: 'Aparecer na busca', caption: 'Permitir que outras pessoas encontrem seu perfil pelo nome.' },
];
export default function CommunitySettingsScreen() {
  const query = useCommunitySettings(); const save = useSaveCommunitySettings(); const blocks = useBlocks(); const block = useBlockUser();
  const error = (e: unknown) => AppAlert.alert('Erro ao salvar', errorMessage(e));
  if (query.isLoading) return <PageSkeleton title="Privacidade" back />;
  if (query.error || !query.data) return <QueryError title="Privacidade" back error={query.error} onRetry={query.refetch} />;
  return <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN}>
    <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700', paddingHorizontal: Spacing.two }}>Privacidade da comunidade</Text>
    <Group title="O que compartilhar">
      {fields.map(f => <SwitchRow key={f.key} title={f.title} caption={f.caption} value={query.data![f.key]} disabled={save.isPending} onChange={v => save.mutate({ [f.key]: v }, { onError: error })} />)}
    </Group>
    <Text muted style={{ fontSize: 13, paddingHorizontal: Spacing.two }}>Peso, medidas e fotos de evolução nunca são publicados automaticamente. Desativar não exclui publicações anteriores; você pode removê-las pelo menu de cada publicação.</Text>
    <Group title="Pessoas bloqueadas">
      {blocks.error && <GroupRow icon={UserRound} title="Não foi possível carregar" caption="Toque para tentar novamente" onPress={() => blocks.refetch()} />}
      {blocks.data?.length === 0 && <GroupRow icon={UserRound} title="Nenhuma pessoa bloqueada" />}
      {blocks.data?.map(u => <MediaRow key={u.id} leading={<Avatar name={u.name} uri={u.profile_picture} size={36} />} title={u.name}
        trailing={<Button size="sm" title="Desbloquear" variant="soft" loading={block.isPending} onPress={() => block.mutate({ userId: u.id, block: false }, { onError: error })} />} />)}
    </Group>
  </Page>;
}
