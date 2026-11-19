import { AppAlert } from '@/lib/feedback';
import { QueryError ,
  Button,
  Card,
  Dialog,
  EmptyState,
  Input,
  ListItem,
  MetricTile,
  Page,
  PageSkeleton,
  Row,
  SectionHeader,
  Text,
  TopBar,
  type DialogHandle,
} from '@/components/ui';
import * as Haptics from 'expo-haptics';
import { Droplets, Flame, Heart, LayoutGrid, Ruler, Scale, User, Utensils } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { WeekChart } from '@/components/charts';
import { DashboardBottom, DashboardTop, useDayDashboard, type LogKind } from '@/components/dashboard-sections';
import { HealthSyncStatus } from '@/components/health-week';
import { HydrationLogger } from '@/components/hydration-logger';
import { MealLogger } from '@/components/meal-logger';
import { Spacing } from '@/constants/theme';
import { useLogMetrics, useMetricHistory } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { decimal } from '@/lib/forms';
import { formatDayMonth, formatDecimal, formatInt } from '@/lib/workout';
import type { HistoryPoint } from '@/types/api';

type Metric = 'weight' | 'fat' | 'muscle';
const METRICS: Record<Metric, { title: string; unit: string }> = {
  weight: { title: 'Peso', unit: 'kg' },
  fat: { title: 'Gordura', unit: '%' },
  muscle: { title: 'Músculo', unit: 'kg' },
};

const last = (h?: HistoryPoint[]) => (h?.length ? h[h.length - 1].value : undefined);

/** Change over the last 30 days, formatted with sign ("−1,6 kg em 30 dias"). */
function delta30(h: HistoryPoint[] | undefined, unit: string) {
  if (!h || h.length < 2) return undefined;
  const since = Date.now() - 30 * 864e5;
  const base = h.find((p) => new Date(p.date).getTime() >= since) ?? h[0];
  const d = h[h.length - 1].value - base.value;
  if (base === h[h.length - 1]) return undefined;
  const sign = d > 0 ? '+' : d < 0 ? '−' : '';
  return `${sign}${formatDecimal(Math.abs(d))} ${unit} em 30 dias`;
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
  const currentWeight = last(weight.data) ?? user?.current_weight_kg ?? undefined;
  const currentFat = last(fat.data);
  const currentMuscle = last(muscle.data);

  // IMC + TMB (Mifflin-St Jeor), matching backend calculations.
  let bmi: string | undefined;
  let bmr: number | undefined;
  if (user?.height_cm && currentWeight !== undefined) {
    const h = user.height_cm / 100;
    bmi = formatDecimal(currentWeight / (h * h));
    if (user.age && user.gender) {
      bmr = 10 * currentWeight + 6.25 * user.height_cm - 5 * user.age + (user.gender === 'male' ? 5 : -161);
    }
  }

  const series = { weight: weight.data, fat: fat.data, muscle: muscle.data }[metric] ?? [];
  const chart = series.slice(-6).map((p) => ({ label: formatDayMonth(p.date, false), value: p.value }));
  const volume = dashboard.data?.workout_volume;
  const records = [...(weight.data ?? [])].reverse();

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
      <DashboardTop d={day} onLog={setLogger} />

      <View style={{ gap: Spacing.four }}>
        <Row style={{ gap: Spacing.four, alignItems: 'stretch' }}>
          <MetricTile
            icon={User}
            label="Peso"
            value={currentWeight !== undefined ? formatDecimal(currentWeight) : '--'}
            unit="kg"
            caption={delta30(weight.data, 'kg') ?? 'Sem variação'}
            onOpen={() => setMetric('weight')}
          />
          <MetricTile
            icon={Heart}
            label="Gordura"
            value={currentFat !== undefined ? formatDecimal(currentFat) : '--'}
            unit="%"
            caption={delta30(fat.data, 'pp') ?? 'Sem variação'}
            onOpen={() => setMetric('fat')}
          />
        </Row>
        <Row style={{ gap: Spacing.four, alignItems: 'stretch' }}>
          <MetricTile
            icon={LayoutGrid}
            label="Músculo"
            value={currentMuscle !== undefined ? formatDecimal(currentMuscle) : '--'}
            unit="kg"
            caption={delta30(muscle.data, 'kg') ?? 'Sem variação'}
            onOpen={() => setMetric('muscle')}
          />
          <MetricTile
            icon={Flame}
            label="TMB"
            value={bmr ? formatInt(bmr) : '--'}
            unit="kcal"
            caption={bmi ? `IMC ${bmi}` : 'Complete seu perfil'}
          />
        </Row>
      </View>

      <View style={{ gap: Spacing.three }}>
        <SectionHeader title={`${METRICS[metric].title}:`} note="últimos registros" />
        {chart.length ? (
          <WeekChart
            data={chart}
            formatTick={(v) => `${formatDecimal(v, v % 1 ? 1 : 0)}${metric === 'fat' ? '%' : ''}`}
            accessibilityLabel={`Evolução de ${METRICS[metric].title.toLowerCase()}`}
          />
        ) : (
          <EmptyState icon={Scale} message="Nenhum registro ainda." />
        )}
        {volume && (
          <ListItem
            icon={LayoutGrid}
            title={`Volume de Treino: ${formatInt(volume.volume_kg)} kg`}
            caption={`${volume.change_percentage >= 0 ? '+' : ''}${formatDecimal(volume.change_percentage, 0)}% vs semana anterior`}
          />
        )}
      </View>

      <View style={{ gap: Spacing.three }}>
        <SectionHeader
          title="Registros:"
          action={records.length > 2 ? (showAll ? 'Ver Menos' : 'Ver Todos') : undefined}
          onAction={() => setShowAll((v) => !v)}
        />
        {records.length === 0 ? (
          <EmptyState icon={Scale} message="Registre suas medidas para acompanhar a evolução." />
        ) : (
          (showAll ? records : records.slice(0, 2)).map((r) => {
            const f = fat.data?.find((p) => sameDay(p.date, r.date));
            const m = muscle.data?.find((p) => sameDay(p.date, r.date));
            const details = [f && `Gordura ${formatDecimal(f.value)}%`, m && `Músculo ${formatDecimal(m.value)} kg`].filter(Boolean).join(' · ');
            return (
              <Card key={r.date} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.four + 2, paddingHorizontal: Spacing.five }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="titleMd">{formatDayMonth(r.date)}</Text>
                  {details ? <Text variant="caption" style={{ fontSize: 12 }}>{details}</Text> : null}
                </View>
                <Text variant="titleSm" style={{ fontSize: 15 }}>
                  {formatDecimal(r.value)} kg
                </Text>
              </Card>
            );
          })
        )}
      </View>

      <DashboardBottom d={day} />

      {formOpen && <MetricsSheet onClose={() => setFormOpen(false)} />}
      {logger === 'meal' && <MealLogger visible onClose={() => setLogger(null)} />}
      {logger === 'water' && <HydrationLogger onClose={() => setLogger(null)} />}
    </Page>
    <HealthSyncStatus />
    <FloatingAddButton label="Adicionar" hint="Abre as opções de medidas" onPress={() => setActionsOpen(true)} />
    <ActionMenu
      visible={actionsOpen}
      title="O que você quer fazer?"
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
