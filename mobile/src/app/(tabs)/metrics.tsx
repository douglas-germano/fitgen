import { AppAlert } from '@/lib/feedback';
import { QueryError ,
  Button,
  Card,
  Dialog,
  EmptyState,
  Input,
  Page,
  PageSkeleton,
  Row,
  SectionHeader,
  Text,
  TopBar,
  type DialogHandle,
} from '@/components/ui';
import * as Haptics from 'expo-haptics';
import { Droplets, Ruler, Scale, Utensils } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { TrendChart } from '@/components/charts';
import { DashboardBottom, DashboardOverview, useDayDashboard, type LogKind } from '@/components/dashboard-sections';
import { HydrationLogger } from '@/components/hydration-logger';
import { MealLogger } from '@/components/meal-logger';
import { Radius, Spacing } from '@/constants/theme';
import { useLogMetrics, useMetricHistory } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { decimal } from '@/lib/forms';
import { formatDayMonth, formatDecimal, formatInt } from '@/lib/workout';
import type { HistoryPoint } from '@/types/api';
import { useColors } from '@/providers/theme';

type Metric = 'weight' | 'fat' | 'muscle';
const METRICS: Record<Metric, { title: string; unit: string }> = {
  weight: { title: 'Peso', unit: 'kg' },
  fat: { title: 'Gordura', unit: '%' },
  muscle: { title: 'Músculo', unit: 'kg' },
};

function orderedHistory(history: HistoryPoint[] = []) {
  return history
    .filter(({ date, value }) => Number.isFinite(value) && Number.isFinite(new Date(date).getTime()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

const sameDay = (a: string, b: string) => a.slice(0, 10) === b.slice(0, 10);

/** Day summary + body measurements in one screen (the former home dashboard lives here). */
export default function MetricsScreen() {
  const Colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  const stackTabs = width / Math.max(1, fontScale) < 266;
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

  return (
    <View style={{ flex: 1 }}>
    <Page
      tab
      topBar={<TopBar title="Medidas" />}
      // Room for the floating "+" so it never covers the last record.
      contentStyle={{ paddingBottom: FAB_CLEARANCE }}
      refreshing={weight.isRefetching || day.isRefetching}
      onRefresh={() => {
        weight.refetch();
        fat.refetch();
        muscle.refetch();
        day.refetch();
      }}>
      <View style={{ gap: Spacing.four }}>
        <View accessibilityRole="tablist" style={{
          flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one,
          borderRadius: Radius.md, borderCurve: 'continuous',
          backgroundColor: Colors.surfaceSunken, padding: Spacing.one,
        }}>
          {(Object.keys(METRICS) as Metric[]).map((key) => {
            const selected = metric === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                aria-selected={selected}
                onPress={() => setMetric(key)}
                style={({ pressed }) => ({
                  flexGrow: 1, flexBasis: stackTabs ? '100%' : '30%', minWidth: 78, minHeight: 44,
                  alignItems: 'center', justifyContent: 'center',
                  paddingHorizontal: Spacing.two, paddingVertical: Spacing.two,
                  borderRadius: Radius.sm, borderCurve: 'continuous',
                  backgroundColor: selected ? Colors.surface : pressed ? Colors.surfaceChip : 'transparent',
                })}>
                <Text variant={selected ? 'titleSm' : 'label'} color={selected ? Colors.voltInk : Colors.inkMuted} style={{ textAlign: 'center' }}>
                  {METRICS[key].title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={{ gap: Spacing.three }}>
          <Text variant="label" muted>{title} atual</Text>
          <Text
            variant="display"
            accessibilityRole="header"
            style={{ fontSize: 34, lineHeight: 42, fontVariant: ['tabular-nums'] }}>
            {current !== undefined ? formatValue(current) : 'Sem registro'}
          </Text>
          {variation && <Text variant="label" muted>{variation}</Text>}
          {chart.length > 0 ? (
            <TrendChart data={chart} formatValue={formatValue} title={`Evolução de ${title.toLowerCase()}`} />
          ) : (
            <Text variant="label" muted>Use o botão + para registrar suas medidas.</Text>
          )}
        </Card>
      </View>

      <View style={{ gap: Spacing.three }}>
        <SectionHeader
          title="Registros de peso"
          action={records.length > 2 ? (showAll ? 'Ver menos' : 'Ver todos') : undefined}
          onAction={() => setShowAll((v) => !v)}
        />
        {records.length === 0 ? (
          <EmptyState icon={Scale} message="Registre suas medidas para acompanhar a evolução." />
        ) : (
          (showAll ? records : records.slice(0, 2)).map((r, index) => {
            const f = histories.fat.find((p) => sameDay(p.date, r.date));
            const m = histories.muscle.find((p) => sameDay(p.date, r.date));
            const details = [f && `Gordura ${formatDecimal(f.value)}%`, m && `Músculo ${formatDecimal(m.value)} kg`].filter(Boolean).join(' · ');
            return (
              <Row key={`${r.date}-${index}`} style={{
                justifyContent: 'space-between', flexWrap: 'wrap', minHeight: 44,
                borderTopWidth: StyleSheet.hairlineWidth, borderColor: Colors.line, paddingVertical: Spacing.two,
              }}>
                <View style={{ flexGrow: 1, flexShrink: 1, gap: 2 }}>
                  <Text variant="titleMd">{formatDayMonth(r.date)}</Text>
                  {details ? <Text variant="caption" style={{ fontSize: 12 }}>{details}</Text> : null}
                </View>
                <Text variant="titleSm" style={{ fontSize: 15 }}>
                  {formatDecimal(r.value)} kg
                </Text>
              </Row>
            );
          })
        )}
      </View>

      {(bmr !== undefined || bmi || volume) && (
        <View style={{ gap: Spacing.two }}>
          <SectionHeader title="Indicadores" />
          {bmr !== undefined && <Text variant="body" muted>Metabolismo basal · {formatInt(bmr)} kcal</Text>}
          {bmi && <Text variant="body" muted>IMC · {bmi}</Text>}
          {volume && (
            <Text variant="body" muted>
              Volume de treino · {formatInt(volume.volume_kg)} kg · {volume.change_percentage >= 0 ? '+' : ''}{formatDecimal(volume.change_percentage, 0)}% vs. semana anterior
            </Text>
          )}
        </View>
      )}

      <DashboardOverview d={day} />
      <DashboardBottom d={day} />

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
