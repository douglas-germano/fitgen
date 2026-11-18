import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Chips, Input, Page, Text, TopBar } from '@/components/ui';
import { useCreateChallenge, useGroups } from '@/hooks/community';
import { METRICS } from '@/lib/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
import type { ChallengeMetric } from '@/types/api';
export default function CreateChallenge() {
  const params = useLocalSearchParams<{ groupId?: string }>();
  const groups = useGroups(); const create = useCreateChallenge();
  const [group, setGroup] = useState(params.groupId ?? ''); const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<ChallengeMetric>('workouts'); const [target, setTarget] = useState('12'); const [days, setDays] = useState('30');
  const gid = group || groups.data?.[0]?.id;
  const valid = !!gid && !!title.trim() && /^\d+$/.test(target) && +target >= 1 && +target <= 1000 && /^\d+$/.test(days) && +days >= 1 && +days <= 90 && (!['active_days', 'hydration_days'].includes(metric) || +target <= +days);
  return <Page topBar={<TopBar title="Novo desafio" back />}>
    <Text muted>Os registros do FitGen atualizam o progresso automaticamente. Quem participa vê o progresso dos outros.</Text>
    {groups.data?.length === 0 && <Button title="Crie um grupo primeiro" onPress={() => router.replace('/community/create-group')} />}
    {groups.error && <Button title="Tentar carregar grupos" onPress={() => groups.refetch()} />}
    <Chips options={(groups.data ?? []).map(g => ({ value: g.id, label: g.name }))} value={gid ?? ''} onChange={setGroup} />
    <Input label="Título" value={title} onChangeText={setTitle} maxLength={80} />
    <Chips options={METRICS.map(m => ({ value: m.value, label: m.label }))} value={metric} onChange={m => { setMetric(m); setTarget(String(METRICS.find(x => x.value === m)?.defaultTarget ?? 12)); }} />
    <Input label="Meta (1 a 1000)" keyboardType="number-pad" value={target} onChangeText={setTarget} />
    <Input label="Duração em dias (1 a 90)" keyboardType="number-pad" value={days} onChangeText={setDays} />
    <Button title="Criar desafio" disabled={!valid} loading={create.isPending} onPress={() => create.mutate({ title: title.trim(), group_id: gid, metric, target: +target, duration_days: +days }, { onSuccess: c => router.replace(`/community/challenge/${c.id}`), onError: e => AppAlert.alert('Erro ao criar desafio', errorMessage(e)) })} />
  </Page>;
}
