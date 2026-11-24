import { router, useLocalSearchParams } from 'expo-router';
import { Apple, CalendarCheck, Check, Droplets, Dumbbell, Timer, Users, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { GroupAvatar } from '@/components/group-photo';
import { BackBar, Group, GroupRow, HeaderCard, MediaRow, SCREEN_COLUMN, TileColors } from '@/components/grouped';
import { Button, Input, Page, Row, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCreateChallenge, useGroups } from '@/hooks/community';
import { METRICS } from '@/lib/community';
import { errorMessage } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
import { useColors } from '@/providers/theme';
import type { ChallengeMetric } from '@/types/api';

const METRIC_ICONS: Record<ChallengeMetric, { icon: LucideIcon; color: string; caption: string }> = {
  workouts: { icon: Dumbbell, color: TileColors.orange, caption: 'Treinos concluídos no FitGen' },
  active_days: { icon: CalendarCheck, color: TileColors.green, caption: 'Dias com algum treino' },
  workout_minutes: { icon: Timer, color: TileColors.blue, caption: 'Minutos somados de treino' },
  hydration_days: { icon: Droplets, color: TileColors.blue, caption: 'Dias batendo a meta de água' },
  meals: { icon: Apple, color: TileColors.red, caption: 'Refeições registradas' },
};

/** Round selection mark at the end of a choice row. */
function Choice({ on }: { on: boolean }) {
  const Colors = useColors();
  return <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    borderColor: on ? Colors.volt : Colors.lineStrong, backgroundColor: on ? Colors.volt : 'transparent' }}>
    {on && <Check size={15} strokeWidth={3} color={Colors.onVolt} />}
  </View>;
}

export default function CreateChallenge() {
  const params = useLocalSearchParams<{ groupId?: string }>();
  const groups = useGroups(); const create = useCreateChallenge();
  const [group, setGroup] = useState(params.groupId ?? ''); const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<ChallengeMetric>('workouts'); const [target, setTarget] = useState('12'); const [days, setDays] = useState('30');
  const gid = group || groups.data?.[0]?.id;
  const club = groups.data?.find(g => g.id === gid);
  const unit = METRICS.find(m => m.value === metric)?.unit ?? '';
  const countsDays = ['active_days', 'hydration_days'].includes(metric);
  const numbersOk = /^\d+$/.test(target) && +target >= 1 && +target <= 1000 && /^\d+$/.test(days) && +days >= 1 && +days <= 90;
  const daysOk = !countsDays || +target <= +days;
  const valid = !!gid && !!title.trim() && numbersOk && daysOk;
  const submit = () => create.mutate({ title: title.trim(), group_id: gid, metric, target: +target, duration_days: +days },
    { onSuccess: c => router.replace(`/community/challenge/${c.id}`), onError: e => AppAlert.alert('Erro ao criar desafio', errorMessage(e)) });

  return <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN}
    footer={<Button size="lg" title="Criar desafio" disabled={!valid} loading={create.isPending} onPress={submit} />}>
    <View style={{ gap: 2, paddingHorizontal: Spacing.two }}>
      <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}>Novo desafio</Text>
      <Text muted style={{ fontSize: 13 }}>O progresso é atualizado pelos registros do FitGen, e quem participa vê o progresso dos outros.</Text>
    </View>

    <Input label="Nome do desafio" placeholder="Ex: 12 treinos em dezembro" value={title} onChangeText={setTitle} maxLength={80} />

    <Group title="Clube">
      {groups.isLoading && <GroupRow icon={Users} title="Carregando clubes…" />}
      {groups.error && <GroupRow icon={Users} title="Não foi possível carregar os clubes" caption="Toque para tentar novamente" onPress={() => groups.refetch()} />}
      {groups.data?.length === 0 && <GroupRow icon={Users} title="Crie um clube primeiro" caption="Desafios acontecem dentro de um clube" onPress={() => router.replace('/community/create-group')} />}
      {groups.data?.map(g => <MediaRow key={g.id} leading={<GroupAvatar group={g} size={36} />} title={g.name}
        caption={`${g.member_count} ${g.member_count === 1 ? 'pessoa' : 'pessoas'}`}
        accessibilityLabel={`Clube ${g.name}${g.id === gid ? ', selecionado' : ''}`}
        trailing={<Choice on={g.id === gid} />} onPress={() => setGroup(g.id)} />)}
    </Group>

    <Group title="Medir por">
      {METRICS.map(m => {
        const meta = METRIC_ICONS[m.value];
        return <MediaRow key={m.value} title={m.label} caption={meta.caption}
          leading={<View style={{ width: 36, alignItems: 'center' }}><meta.icon size={22} color={meta.color} strokeWidth={2.2} /></View>}
          accessibilityLabel={`${m.label}${m.value === metric ? ', selecionado' : ''}`}
          trailing={<Choice on={m.value === metric} />}
          onPress={() => { setMetric(m.value); setTarget(String(m.defaultTarget)); }} />;
      })}
    </Group>

    <Row style={{ gap: Spacing.three, alignItems: 'flex-start' }}>
      <Input containerStyle={{ flex: 1 }} label={`Meta (${unit})`} keyboardType="number-pad" value={target} onChangeText={setTarget} maxLength={4} />
      <Input containerStyle={{ flex: 1 }} label="Duração (dias)" keyboardType="number-pad" value={days} onChangeText={setDays} maxLength={2} />
    </Row>
    {!numbersOk && <Text muted style={{ fontSize: 13, paddingHorizontal: Spacing.two }}>A meta vai de 1 a 1000 e a duração de 1 a 90 dias.</Text>}
    {numbersOk && !daysOk && <Text muted style={{ fontSize: 13, paddingHorizontal: Spacing.two }}>A meta não pode ter mais dias do que a duração do desafio.</Text>}

    {valid && <HeaderCard title="Resumo">
      <Text muted style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
        “{title.trim()}”: {target} {unit} em {days} {+days === 1 ? 'dia' : 'dias'}{club ? `, no clube ${club.name}` : ''}. Começa hoje.
      </Text>
    </HeaderCard>}
  </Page>;
}
