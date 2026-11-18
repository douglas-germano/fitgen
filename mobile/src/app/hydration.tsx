import { AppAlert } from '@/lib/feedback';
import { QueryError ,
  Button,
  Card,
  Dialog,
  EmptyState,
  Input,
  MoreButton,
  Page,
  PageSkeleton,
  ProgressBar,
  Row,
  SectionHeader,
  Text,
  TopBar,
} from '@/components/ui';
import * as Haptics from 'expo-haptics';
import { Droplets } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { WeekChart } from '@/components/charts';
import { fontFor, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { useHydration, useHydrationHistory, useLogWater, useSetWaterGoal } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { decimal } from '@/lib/forms';
import { formatLiters, WEEKDAY_SHORT } from '@/lib/workout';

export default function HydrationScreen() {
  const Colors = useColors();
  const daily = useHydration();
  const history = useHydrationHistory();
  const logWater = useLogWater();
  const [custom, setCustom] = useState('');
  const [goalOpen, setGoalOpen] = useState(false);

  if (daily.isLoading) return <PageSkeleton title="Hidratação" back tab={false} />;

  if (daily.error) return <QueryError title="Hidratação" back error={daily.error} onRetry={daily.refetch} />;

  const total = daily.data?.total_intake_ml ?? 0;
  const goal = daily.data?.daily_goal_ml ?? 2000;
  const percentage = Math.min(Math.round(daily.data?.percentage ?? (total / goal) * 100), 100);

  const add = async (amount: number) => {
    if (logWater.isPending) return;
    if (!Number.isInteger(amount) || amount <= 0) { AppAlert.alert('Quantidade inválida', 'Informe uma quantidade positiva em ml.'); return; }
    try {
      await logWater.mutateAsync(amount);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (total < goal && total + amount >= goal) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setCustom('');
    } catch (e) {
      AppAlert.alert('Erro ao registrar consumo.', errorMessage(e));
    }
  };

  const chart = (history.data ?? []).slice(-7).map((p) => ({
    label: WEEKDAY_SHORT[new Date(`${p.date.slice(0, 10)}T12:00:00`).getDay()],
    value: p.value / 1000,
  }));

  return (
    <Page
      tab={false}
      topBar={<TopBar title="Hidratação" back action={<MoreButton onPress={() => setGoalOpen(true)} />} />}
      refreshing={daily.isRefetching}
      onRefresh={() => {
        daily.refetch();
        history.refetch();
      }}>
      <Card style={{ gap: Spacing.three }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600' }}>Progresso Diário</Text>
          <Text variant="caption" style={{ fontSize: 12 }}>
            Meta: {formatLiters(goal)}
          </Text>
        </Row>
        <Row style={{ alignItems: 'baseline', gap: Spacing.one }}>
          <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.7 }}>{formatLiters(total, false)}</Text>
          <Text muted>/ {formatLiters(goal)}</Text>
        </Row>
        <ProgressBar value={percentage} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="caption" style={{ fontSize: 12 }}>
            {percentage}% da meta
          </Text>
          <Text variant="caption" style={{ fontSize: 12 }}>
            {total < goal ? `Faltam ${formatLiters(goal - total)}` : 'Meta batida!'}
          </Text>
        </Row>
      </Card>

      <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Registro Rápido:" />
        <Row style={{ gap: Spacing.four }}>
          <QuickTile label="Copo" amount={200} onPress={() => add(200)} disabled={logWater.isPending} />
          <QuickTile label="Garrafa" amount={500} onPress={() => add(500)} disabled={logWater.isPending} />
        </Row>
        <Row style={{ gap: Spacing.three }}>
          <TextInput
            placeholder="Outra quantidade (ml)"
            placeholderTextColor={Colors.inkMuted}
            keyboardType="number-pad"
            value={custom}
            onChangeText={setCustom}
            selectionColor={Colors.ink}
            accessibilityLabel="Outra quantidade em ml"
            style={{
              flex: 1,
              height: 52,
              borderRadius: Radius.full,
              backgroundColor: Colors.surfaceChip,
              paddingHorizontal: Spacing.five,
              color: Colors.ink,
              fontSize: 15,
              fontFamily: fontFor(400),
            }}
          />
          <Button
            size="lg"
            title="Adicionar"
            onPress={() => add(decimal(custom) ?? 0)}
            disabled={!custom || logWater.isPending}
            loading={logWater.isPending && !!custom}
          />
        </Row>
      </View>

      <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Últimos 7 Dias:" note="em litros" />
        {chart.length ? (
          <WeekChart
            data={chart}
            max={Math.max(4, Math.ceil(Math.max(...chart.map((c) => c.value), goal / 1000)))}
            formatTick={(v) => `${formatLiters(v * 1000, false).replace(',0', '')}L`}
            accessibilityLabel="Consumo de água nos últimos 7 dias"
          />
        ) : (
          <EmptyState icon={Droplets} message="Sem dados de histórico ainda." />
        )}
      </View>

      {goalOpen && <GoalDialog visible goal={goal} onClose={() => setGoalOpen(false)} />}
    </Page>
  );
}

function QuickTile({ label, amount, onPress, disabled }: { label: string; amount: number; onPress: () => void; disabled?: boolean }) {
  const Colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Adicionar ${label.toLowerCase()} de ${amount} ml`}
      style={({ pressed }) => ({
        flex: 1,
        gap: Spacing.two,
        padding: Spacing.five,
        borderRadius: Radius.md,
        borderCurve: 'continuous',
        backgroundColor: pressed ? Colors.voltSoft : Colors.surfaceSunken,
        opacity: disabled ? 0.6 : 1,
      })}>
      <Text variant="titleSm" style={{ fontSize: 15 }}>
        {label}
      </Text>
      <Row style={{ alignItems: 'baseline', gap: Spacing.one }}>
        <Text style={{ fontSize: 30, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 }}>{amount}</Text>
        <Text variant="caption" style={{ fontSize: 12 }}>
          ml
        </Text>
      </Row>
    </Pressable>
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
    <Dialog visible={visible} onClose={onClose} title="Meta Diária" description="Qual seu objetivo de consumo de água (em ml)?">
      <Input label="Meta (ml)" keyboardType="number-pad" value={value} onChangeText={setValue} />
      <Row style={{ gap: Spacing.three }}>
        <Button variant="soft" title="Cancelar" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Salvar Meta" onPress={save} loading={setGoal.isPending} style={{ flex: 1 }} />
      </Row>
    </Dialog>
  );
}
