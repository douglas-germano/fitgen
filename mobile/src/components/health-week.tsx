import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Row, SectionHeader, Text } from '@/components/ui';
import { WeekChart } from '@/components/charts';
import { Spacing } from '@/constants/theme';
import { useHealthEnabled, useProfile, useWorkoutHistory } from '@/hooks/queries';
import { useHealthSync, useHealthWeek } from '@/hooks/use-health-sync';
import { api, errorMessage } from '@/lib/api';
import { healthProviderName } from '@/lib/health';
import { healthWindows, weeklySummary } from '@/lib/health-summary';
import type { HistoryPoint } from '@/types/api';

const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const change = (a: number | null, b: number | null, unit: string) => a === null || b === null ? 'Sem comparação disponível' :
  `${a > b ? '+' : a < b ? '−' : ''}${fmt(Math.abs(a - b))} ${unit} em relação aos 7 dias anteriores`;

export function HealthSyncStatus() {
  const profile = useProfile();
  const { sync, account, connected } = useHealthSync(profile.data?.id);
  if (!connected) return null;
  return <View style={{ gap: Spacing.two }}>
    <Text variant="titleSm">Sincronização do {healthProviderName()}</Text>
    <Text variant="caption">{account.data === false ? `Conecte o ${healthProviderName()} no Perfil para sincronizar com esta conta.` : sync.isFetching ? 'Buscando treinos e pesos…' :
      sync.error ? errorMessage(sync.error, 'Não foi possível sincronizar. Tentaremos novamente automaticamente.') : sync.data ?
        `${sync.data.found ? 'Atualizado' : 'Nenhum registro externo disponível'} · ${new Date(sync.data.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'Aguardando sincronização.'}</Text>
    <Text variant="caption">Atualização automática ao abrir e voltar ao app, e a cada minuto enquanto estiver aberto. Sem dados? Confira as permissões no Saúde.</Text>
  </View>;
}

export function HealthWeekCard() {
  const profile = useProfile();
  const sessions = useWorkoutHistory();
  const health = useHealthWeek();
  const { data: connected } = useHealthEnabled();
  const weights = useQuery({ queryKey: ['health-summary-weight', profile.data?.id],
    queryFn: () => api<HistoryPoint[]>('/metrics/history?type=weight&limit=1000') });
  const summary = weeklySummary(sessions.data ?? [], weights.data ?? [], health.data ?? []);
  const { current, previous } = summary;
  const start = healthWindows().start;
  const chart = (health.data ?? []).filter(d => d.date >= `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}` && d.steps !== null);
  return <Card>
    <SectionHeader title="Resumo semanal" action="Histórico" onAction={() => router.push('/workout/history')} />
    <Text variant="caption">Últimos 7 dias, incluindo hoje · comparação com os 7 anteriores</Text>
    {sessions.isLoading || weights.isLoading ? <Text muted>Carregando seu resumo…</Text> : sessions.error || weights.error ?
      <Button title="Tentar carregar o resumo novamente" variant="soft" onPress={() => { void sessions.refetch(); void weights.refetch(); }} /> : <>
      <SummaryRow title="Treinos" value={fmt(current.workouts)} caption={change(current.workouts, previous.workouts, 'treinos')} />
      <SummaryRow title="Tempo de treino" value={`${fmt(current.minutes)} min`} caption={change(current.minutes, previous.minutes, 'min')} />
      <SummaryRow title="Último peso no período" value={current.weight === null ? 'Sem registro' : `${fmt(current.weight)} kg`} caption={change(current.weight, previous.weight, 'kg')} />
    </>}
    {connected && <>
      <SummaryRow title="Passos registrados" value={current.steps === null ? 'Sem dados disponíveis' : fmt(current.steps)}
        caption={health.error ? 'Não foi possível ler os passos. Atualize novamente.' : `${current.coverage} de 7 dias com registros · ${change(current.steps, previous.steps, 'passos')}`} />
      {chart.length > 0 && <WeekChart data={chart.map(d => ({ label: d.date.slice(8), value: d.steps! }))} height={100}
        accessibilityLabel="Passos registrados em cada dia dos últimos sete dias" formatTick={v => v >= 1000 ? `${fmt(v / 1000)} mil` : fmt(v)} />}
    </>}
  </Card>;
}

function SummaryRow({ title, value, caption }: { title: string; value: string; caption: string }) {
  return <View style={{ gap: Spacing.one }}><Row style={{ justifyContent: 'space-between', gap: Spacing.two }}>
    <Text variant="label" style={{ flex: 1 }}>{title}</Text><Text variant="titleSm">{value}</Text>
  </Row><Text variant="caption">{caption}</Text></View>;
}
