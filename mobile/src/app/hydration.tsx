import { AppAlert } from '@/lib/feedback';
import { QueryError, Button, Dialog, Input, Page, PageSkeleton, ProgressBar, Row, Text } from '@/components/ui';
import * as Haptics from 'expo-haptics';
import { CupSoda, Droplets, GlassWater, Plus, Target } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { WeekChart } from '@/components/charts';
import { BackBar, Group, GroupRow, HeaderCard, SCREEN_COLUMN, Tile, TileColors, TileRow } from '@/components/grouped';
import { Spacing } from '@/constants/theme';
import { useHydration, useHydrationHistory, useLogWater, useSetWaterGoal } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { decimal } from '@/lib/forms';
import { formatLiters, WEEKDAY_SHORT } from '@/lib/workout';

export default function HydrationScreen() {
  const daily = useHydration();
  const history = useHydrationHistory();
  const logWater = useLogWater();
  const [goalOpen, setGoalOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  if (daily.isLoading) return <PageSkeleton title="Hidratação" back tab={false} />;

  if (daily.error) return <QueryError title="Hidratação" back error={daily.error} onRetry={daily.refetch} />;

  const total = daily.data?.total_intake_ml ?? 0;
  const goal = daily.data?.daily_goal_ml ?? 2000;
  const percentage = Math.min(Math.round(daily.data?.percentage ?? (total / goal) * 100), 100);

  /** Resolves to true when the amount was saved. */
  const add = async (amount: number) => {
    if (logWater.isPending) return false;
    if (!Number.isInteger(amount) || amount <= 0) { AppAlert.alert('Quantidade inválida', 'Informe uma quantidade positiva em ml.'); return false; }
    try {
      await logWater.mutateAsync(amount);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (total < goal && total + amount >= goal) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return true;
    } catch (e) {
      AppAlert.alert('Erro ao registrar consumo.', errorMessage(e));
      return false;
    }
  };

  const chart = (history.data ?? []).slice(-7).map((p) => ({
    label: WEEKDAY_SHORT[new Date(`${p.date.slice(0, 10)}T12:00:00`).getDay()],
    value: p.value / 1000,
  }));

  return (
    <Page
      tab={false}
      topBar={<BackBar />}
      contentStyle={SCREEN_COLUMN}
      refreshing={daily.isRefetching}
      onRefresh={() => {
        daily.refetch();
        history.refetch();
      }}>
      <HeaderCard title="Hidratação de hoje" value={`${percentage}%`}>
        <View style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.three }}>
          <Row style={{ alignItems: 'baseline', gap: Spacing.one }}>
            <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.7, fontVariant: ['tabular-nums'] }}>{formatLiters(total, false)}</Text>
            <Text muted>de {formatLiters(goal)}</Text>
          </Row>
          <ProgressBar value={percentage} />
          <Text muted style={{ fontSize: 13 }}>{total < goal ? `Faltam ${formatLiters(goal - total)} para a meta` : 'Meta de hoje batida!'}</Text>
        </View>
      </HeaderCard>

      <TileRow>
        <Tile icon={GlassWater} color={TileColors.blue} title="Copo" value="200 ml" onPress={logWater.isPending ? undefined : () => { void add(200); }} />
        <Tile icon={CupSoda} color={TileColors.blue} title="Garrafa" value="500 ml" onPress={logWater.isPending ? undefined : () => { void add(500); }} />
        <Tile icon={Plus} color={TileColors.green} title="quantidade" value="Outra" onPress={() => setCustomOpen(true)} />
      </TileRow>

      <HeaderCard title="Últimos 7 dias" value="em litros">
        <View style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
          {chart.length ? (
            <WeekChart
              data={chart}
              max={Math.max(4, Math.ceil(Math.max(...chart.map((c) => c.value), goal / 1000)))}
              formatTick={(v) => `${formatLiters(v * 1000, false).replace(',0', '')}L`}
              accessibilityLabel="Consumo de água nos últimos 7 dias"
            />
          ) : (
            <Text muted>Sem dados de histórico ainda.</Text>
          )}
        </View>
      </HeaderCard>

      <Group title="Configurações">
        <GroupRow icon={Target} title="Meta diária" value={formatLiters(goal)} onPress={() => setGoalOpen(true)} />
      </Group>

      {goalOpen && <GoalDialog visible goal={goal} onClose={() => setGoalOpen(false)} />}
      {customOpen && <CustomAmountDialog saving={logWater.isPending} onSave={add} onClose={() => setCustomOpen(false)} />}
    </Page>
  );
}

function CustomAmountDialog({ saving, onSave, onClose }: { saving: boolean; onSave: (ml: number) => Promise<boolean>; onClose: () => void }) {
  const [value, setValue] = useState('');
  const save = async () => {
    if (await onSave(decimal(value) ?? 0)) onClose();
  };
  return (
    <Dialog visible onClose={onClose} title="Outra quantidade" description="Quanto você bebeu (em ml)?">
      <Input label="Quantidade (ml)" placeholder="Ex: 350" keyboardType="number-pad" value={value} onChangeText={setValue} autoFocus />
      <Row style={{ gap: Spacing.three }}>
        <Button icon={Droplets} title="Adicionar" onPress={save} disabled={!value} loading={saving} style={{ flex: 1 }} />
      </Row>
    </Dialog>
  );
}

function GoalDialog({ visible, goal, onClose }: { visible: boolean; goal: number; onClose: () => void }) {
  const setGoal = useSetWaterGoal();
  const [value, setValue] = useState(String(goal));

  const save = async () => {
    const n = decimal(value);
    if (!n || !Number.isInteger(n)) {
      AppAlert.alert('Meta inválida.');
      return;
    }
    try {
      await setGoal.mutateAsync(n);
      onClose();
    } catch (e) {
      AppAlert.alert('Erro ao atualizar meta.', errorMessage(e));
    }
  };

  return (
    <Dialog visible={visible} onClose={onClose} title="Meta diária" description="Qual seu objetivo de consumo de água (em ml)?">
      <Input label="Meta (ml)" keyboardType="number-pad" value={value} onChangeText={setValue} />
      <Row style={{ gap: Spacing.three }}>
        <Button title="Salvar meta" onPress={save} loading={setGoal.isPending} style={{ flex: 1 }} />
      </Row>
    </Dialog>
  );
}
