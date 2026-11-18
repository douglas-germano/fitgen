import { SwitchRow } from '@/components/community';
import { Button, Card, Page, PageSkeleton, QueryError, Text, TopBar } from '@/components/ui';
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
  return <Page topBar={<TopBar title="Privacidade da comunidade" back />}>
    <Text muted>Ative apenas o que deseja compartilhar com seus amigos e grupos. Peso, medidas e fotos de evolução nunca são publicados automaticamente. Desativar não exclui publicações anteriores; você pode removê-las pelo menu de cada publicação.</Text>
    <Card>{fields.map(f => <SwitchRow key={f.key} title={f.title} caption={f.caption} value={query.data![f.key]} disabled={save.isPending} onChange={v => save.mutate({ [f.key]: v }, { onError: error })} />)}</Card>

    <Text variant="titleSm">Pessoas bloqueadas</Text>
    {blocks.error && <Button title="Tentar carregar bloqueios" onPress={() => blocks.refetch()} />}
    {blocks.data?.length === 0 && <Text muted>Nenhuma pessoa bloqueada.</Text>}
    {blocks.data?.map(u => <Card key={u.id}><Text>{u.name}</Text><Button title="Desbloquear" variant="soft" loading={block.isPending} onPress={() => block.mutate({ userId: u.id, block: false }, { onError: error })} /></Card>)}
  </Page>;
}
