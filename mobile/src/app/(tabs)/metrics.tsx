import { AppAlert } from '@/lib/feedback';
import { QueryError ,
  Button,
  Dialog,
  Input,
  Page,
  PageSkeleton,
  Row,
  Text,
  type DialogHandle,
} from '@/components/ui';
import * as Haptics from 'expo-haptics';
import { Droplet, Droplets, Dumbbell, Flame, Gauge, Ruler, Scale, Utensils, type LucideIcon } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { TrendChart } from '@/components/charts';
import { Group, GroupRow, HeaderCard, Tile, TileColors, TileRow } from '@/components/grouped';
import { DashboardBottom, DashboardOverview, useDayDashboard, type LogKind } from '@/components/dashboard-sections';
import { HydrationLogger } from '@/components/hydration-logger';
import { MealLogger } from '@/components/meal-logger';
import { Spacing } from '@/constants/theme';
import { useLogMetrics, useMetricHistory } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { decimal } from '@/lib/forms';
import { formatDayMonth, formatDecimal, formatInt } from '@/lib/workout';
import type { HistoryPoint } from '@/types/api';

type Metric = 'weight' | 'fat' | 'muscle';
const METRICS: Record<Metric, { title: string; unit: string; icon: LucideIcon; color: string }> = {
  weight: { title: 'Peso', unit: 'kg', icon: Scale, color: TileColors.orange },
  fat: { title: 'Gordura', unit: '%', icon: Droplet, color: TileColors.purple },
  muscle: { title: 'Músculo', unit: 'kg', icon: Dumbbell, color: TileColors.blue },
};

function orderedHistory(history: HistoryPoint[] = []) {
  return history
    .filter(({ date, value }) => Number.isFinite(value) && Number.isFinite(new Date(date).getTime()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

const sameDay = (a: string, b: string) => a.slice(0, 10) === b.slice(0, 10);

/** Day summary + body measurements in one screen (the former home dashboard lives here). */
export default function MetricsScreen() {
  const day = useDayDashboard();
  const { profile, dashboard } = day;
  const weight = useMetricHistory('weight');
  const fat = useMetricHistory('fat');
  const muscle = useMetricHistory('muscle');
  const [metric, setMetric] = useState<Metric>('weight');
  const [showAll, setShowAll] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [logger, setLogger] = useState<LogKind | null>(null);

  if (weight.isLoading || fat.isLoading || muscle.isLoading || profile.isLoading || day.isLoading) return <PageSkeleton title="Medidas" />;

  const error = profile.error ?? day.error ?? weight.error ?? fat.error ?? muscle.error;
  if (error) return <QueryError title="Medidas" tab error={error} onRetry={() => { day.refetch(); weight.refetch(); fat.refetch(); muscle.refetch(); }} />;

  const user = profile.data;
  const histories = {
    weight: orderedHistory(weight.data),
    fat: orderedHistory(fat.data),
    muscle: orderedHistory(muscle.data),
  };
  const series = histories[metric];
  const { title, unit } = METRICS[metric];
  const currentWeight = histories.weight.at(-1)?.value ?? user?.current_weight_kg ?? undefined;
  const current = metric === 'weight' ? currentWeight : series.at(-1)?.value;
  const chart = series.slice(-6).map(({ date, value }) => ({
    label: formatDayMonth(date, false),
    timestamp: new Date(date).getTime(),
    value,
  }));
  const formatValue = (value: number) => `${formatDecimal(value)}${unit === '%' ? '%' : ` ${unit}`}`;
  const latest = chart.at(-1);
  const change = latest && chart.length > 1
    ? Math.round((latest.value - chart[0].value) * 10) / 10
    : undefined;
  const variation = change === undefined ? undefined : change === 0
    ? 'Sem variação no período'
    : `${change > 0 ? '+' : '−'}${formatDecimal(Math.abs(change))} ${unit === '%' ? 'pp' : unit} no período`;

  // Mifflin-St Jeor, matching the backend calculation.
  const height = user?.height_cm ? user.height_cm / 100 : undefined;
  const bmi = height && currentWeight !== undefined ? formatDecimal(currentWeight / (height * height)) : undefined;
  const bmr = user?.height_cm && user.age && user.gender && currentWeight !== undefined
    ? 10 * currentWeight + 6.25 * user.height_cm - 5 * user.age + (user.gender === 'male' ? 5 : -161)
    : undefined;
  const volume = dashboard.data?.workout_volume;
  const records = [...histories.weight].reverse();

  const latestOf = (key: Metric) => key === 'weight' ? currentWeight : histories[key].at(-1)?.value;
  const tileValue = (key: Metric) => {
    const value = latestOf(key);
    return value === undefined ? '—' : `${formatDecimal(value)} ${METRICS[key].unit}`;
  };
  const visibleRecords = showAll ? records : records.slice(0, 3);

  return (
    <View style={{ flex: 1 }}>
    <Page
      tab
      // Room for the floating "+" so it never covers the last record.
      contentStyle={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: Spacing.four, paddingBottom: FAB_CLEARANCE }}
      refreshing={weight.isRefetching || day.isRefetching}
      onRefresh={() => {
        weight.refetch();
        fat.refetch();
        muscle.refetch();
        day.refetch();
      }}>
      <View accessibilityRole="tablist">
        <TileRow>
          {(Object.keys(METRICS) as Metric[]).map((key) => (
            <Tile key={key} role="tab" icon={METRICS[key].icon} color={METRICS[key].color} title={METRICS[key].title}
              value={tileValue(key)} selected={metric === key} onPress={() => setMetric(key)} />
          ))}
        </TileRow>
      </View>

      <HeaderCard title={`Evolução de ${title.toLowerCase()}`} value={current !== undefined ? formatValue(current) : 'Sem registro'}>
        <View style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.two }}>
          {variation && <Text muted style={{ fontSize: 13 }}>{variation}</Text>}
          {chart.length > 0 ? (
            <TrendChart data={chart} formatValue={formatValue} title={`Evolução de ${title.toLowerCase()}`} />
          ) : (
            <Text muted>Use o botão + para registrar suas medidas.</Text>
          )}
        </View>
      </HeaderCard>

      <Group title="Registros de peso" action={records.length > 3 ? (showAll ? 'Ver menos' : 'Ver todos') : undefined} onAction={() => setShowAll((v) => !v)}>
        {records.length === 0 ? (
          <GroupRow icon={Scale} title="Nenhum registro ainda" caption="Registre suas medidas para acompanhar a evolução." onPress={() => setFormOpen(true)} />
        ) : visibleRecords.map((r, index) => {
          const f = histories.fat.find((p) => sameDay(p.date, r.date));
          const m = histories.muscle.find((p) => sameDay(p.date, r.date));
          const details = [f && `Gordura ${formatDecimal(f.value)}%`, m && `Músculo ${formatDecimal(m.value)} kg`].filter(Boolean).join(' · ');
          return <GroupRow key={`${r.date}-${index}`} icon={Scale} title={formatDayMonth(r.date)} caption={details || null} value={`${formatDecimal(r.value)} kg`} />;
        })}
      </Group>

      {(bmr !== undefined || bmi || volume) && (
        <Group title="Indicadores">
          {bmr !== undefined && <GroupRow icon={Flame} title="Metabolismo basal" value={`${formatInt(bmr)} kcal`} />}
          {bmi && <GroupRow icon={Gauge} title="IMC" value={bmi} />}
          {volume && <GroupRow icon={Dumbbell} title="Volume de treino" caption={`${volume.change_percentage >= 0 ? '+' : ''}${formatDecimal(volume.change_percentage, 0)}% vs. semana anterior`} value={`${formatInt(volume.volume_kg)} kg`} />}
        </Group>
      )}

      <DashboardOverview d={day} />
      <DashboardBottom />

      {formOpen && <MetricsSheet onClose={() => setFormOpen(false)} />}
      {logger === 'meal' && <MealLogger visible onClose={() => setLogger(null)} />}
      {logger === 'water' && <HydrationLogger onClose={() => setLogger(null)} />}
    </Page>
    <FloatingAddButton label="Adicionar" hint="Abre as opções de medidas" onPress={() => setActionsOpen(true)} />
    <ActionMenu
      visible={actionsOpen}
      title="Registrar"
      compact
      onClose={() => setActionsOpen(false)}
      items={[
        {
          key: 'log', icon: Ruler, tone: 'volt',
          title: 'Registrar medidas',
          caption: 'Peso, gordura, músculo e cintura',
          onPress: () => setFormOpen(true),
        },
        { key: 'meal', icon: Utensils, title: 'Registrar refeição', caption: 'Descreva ou tire uma foto', onPress: () => setLogger('meal') },
        { key: 'water', icon: Droplets, title: 'Registrar hidratação', caption: 'Adicione a água que bebeu', onPress: () => setLogger('water') },
      ]}
    />
    </View>
  );
}

/** "Registrar Medidas" — same bottom sheet pattern as the meal logger. */
function MetricsSheet({ onClose }: { onClose: () => void }) {
  const logMetrics = useLogMetrics();
  const sheet = useRef<DialogHandle>(null);
  const [form, setForm] = useState({ weight: '', fat: '', muscle: '', waist: '', notes: '' });
  const [error, setError] = useState('');
  const num = decimal;

  const submit = async () => {
    if (logMetrics.isPending) return;
    const entry = {
      weight_kg: num(form.weight),
      body_fat_percentage: num(form.fat),
      muscle_mass_kg: num(form.muscle),
      waist_cm: num(form.waist),
      notes: form.notes,
    };
    if (!entry.weight_kg || (form.fat.trim() && (entry.body_fat_percentage === undefined || entry.body_fat_percentage > 100)) || (form.muscle.trim() && entry.muscle_mass_kg === undefined) || (form.waist.trim() && entry.waist_cm === undefined)) {
      setError('Revise os valores. Use peso positivo e gordura entre 0 e 100%.');
      return;
    }
    try {
      await logMetrics.mutateAsync(entry);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheet.current?.dismiss();
    } catch (e) {
      AppAlert.alert('Erro ao registrar medidas.', errorMessage(e));
    }
  };

  const field = (key: 'fat' | 'muscle' | 'waist', label: string, placeholder?: string) => (
    <Input containerStyle={{ flex: 1 }} label={label} placeholder={placeholder} keyboardType="decimal-pad" value={form[key]} onChangeText={(v) => setForm({ ...form, [key]: v })} />
  );

  return (
    <Dialog
      ref={sheet}
      sheet
      sheetSize="registration"
      visible
      onClose={onClose}
      title="Registrar Medidas"
      footer={<Button size="lg" title="Salvar Medidas" onPress={submit} loading={logMetrics.isPending} />}>
      <Input
        label="Peso (kg)"
        placeholder="Ex: 82,4"
        keyboardType="decimal-pad"
        value={form.weight}
        error={error || undefined}
        onChangeText={(weight) => {
          setForm({ ...form, weight });
          setError('');
        }}
      />
      <Row style={{ gap: Spacing.three }}>
        {field('fat', '% Gordura', 'Opcional')}
        {field('muscle', 'Músculo (kg)', 'Opcional')}
      </Row>
      {field('waist', 'Cintura (cm)', 'Opcional')}
      <Input label="Notas" placeholder="Ex: Em jejum, pós-treino…" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} />
    </Dialog>
  );
}
