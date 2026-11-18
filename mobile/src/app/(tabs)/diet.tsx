import { AppAlert } from '@/lib/feedback';
import { QueryError ,
  Button,
  Card,
  Chips,
  Dialog,
  EmptyState,
  Input,
  OverviewCard,
  Page,
  PageSkeleton,
  ProgressBar,
  Row,
  ScheduleItem,
  SectionHeader,
  Text,
  TopBar,
  type DialogHandle,
} from '@/components/ui';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ClipboardList, Heart, PencilLine, Sparkles, Utensils } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { MEAL_TYPES, MealLogger } from '@/components/meal-logger';
import { Spacing } from '@/constants/theme';
import {
  useDailyNutrition,
  useDeleteMeal,
  useDietPlan,
  useLogMeal,
  useUpdateMeal,
} from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { decimal } from '@/lib/forms';
import { formatInt } from '@/lib/workout';
import type { LoggedMeal, MealType } from '@/types/api';

const pct = (current: number, target?: number) => (target ? Math.min(Math.round((current / target) * 100), 100) : 0);

/** "07:30" + "AM" like the design's time column. */
function mealTime(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const h = d.getHours();
  return {
    time: `${String(h % 12 || 12).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    period: h < 12 ? 'AM' : 'PM',
  };
}

export default function DietScreen() {
  const daily = useDailyNutrition();
  const plan = useDietPlan();
  const [loggerOpen, setLoggerOpen] = useState(false);
  const [editing, setEditing] = useState<LoggedMeal | 'new' | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  if (daily.isLoading || plan.isLoading) return <PageSkeleton title="Dieta" />;

  if (daily.error || plan.error) return <QueryError title="Dieta" tab error={daily.error ?? plan.error} onRetry={() => { daily.refetch(); plan.refetch(); }} />;

  const totals = daily.data?.totals ?? {};
  const t = plan.data?.macro_targets;
  const target = plan.data?.calories || (t ? t.protein * 4 + t.carbs * 4 + t.fats * 9 : 0) || 2000;
  const calories = Math.round(totals.calories ?? 0);
  const meals = [...(daily.data?.meals ?? [])].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));

  return (
    <View style={{ flex: 1 }}>
    <Page
      tab
      topBar={<TopBar title="Dieta" />}
      // Room for the floating "+" so it never covers the last meal.
      contentStyle={{ paddingBottom: FAB_CLEARANCE }}
      refreshing={daily.isRefetching}
      onRefresh={() => {
        daily.refetch();
        plan.refetch();
      }}>
      {/* Today's calories */}
      <Card style={{ gap: Spacing.three }}>
        <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600' }}>Calorias de Hoje</Text>
        <Row style={{ alignItems: 'baseline', gap: Spacing.one }}>
          <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.7, fontVariant: ['tabular-nums'] }}>
            {formatInt(calories)}
          </Text>
          <Text muted>/ {formatInt(target)} kcal</Text>
        </Row>
        <ProgressBar value={pct(calories, target)} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="caption" style={{ fontSize: 12 }}>
            {pct(calories, target)}% da meta diária
          </Text>
          <Text variant="caption" style={{ fontSize: 12 }}>
            {calories <= target ? `Restam ${formatInt(target - calories)} kcal` : `${formatInt(calories - target)} kcal acima`}
          </Text>
        </Row>
      </Card>

      <OverviewCard
        icon={Heart}
        title="Macronutrientes"
        subtitle={t ? 'Meta do plano alimentar' : 'Sem plano alimentar ativo'}
        onMore={() => router.push('/diet-plan')}
        stats={[
          { value: `${formatInt(totals.protein ?? 0)} g`, label: `Proteínas${t ? ` · ${t.protein} g` : ''}`, progress: pct(totals.protein ?? 0, t?.protein) },
          { value: `${formatInt(totals.carbs ?? 0)} g`, label: `Carbos${t ? ` · ${t.carbs} g` : ''}`, progress: pct(totals.carbs ?? 0, t?.carbs) },
          { value: `${formatInt(totals.fats ?? 0)} g`, label: `Gorduras${t ? ` · ${t.fats} g` : ''}`, progress: pct(totals.fats ?? 0, t?.fats) },
        ]}
      />

      <View style={{ gap: Spacing.three }}>
        <SectionHeader title="Refeições de Hoje:" action="Histórico" onAction={() => router.push('/nutrition-history')} />
        {meals.length === 0 ? (
          <EmptyState icon={Utensils} message="Nenhuma refeição registrada hoje." />
        ) : (
          meals.map((meal) => {
            const time = mealTime(meal.created_at);
            const type = MEAL_TYPES.find((m) => m.value === meal.meal_type);
            return (
              <ScheduleItem
                key={meal.id}
                time={time?.time ?? type?.short ?? '—'}
                period={time?.period}
                title={type?.label ?? meal.name}
                subtitle={type ? meal.name : undefined}
                detail={`P ${Math.round(meal.protein)} g · C ${Math.round(meal.carbs)} g · G ${Math.round(meal.fats)} g`}
                onPress={() => setEditing(meal)}
                right={
                  <Text variant="titleSm" style={{ fontSize: 15 }}>
                    {Math.round(meal.calories)} kcal
                  </Text>
                }
              />
            );
          })
        )}
      </View>

      <MealLogger visible={loggerOpen} onClose={() => setLoggerOpen(false)} />
      {editing && <MealDialog meal={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Page>
    <FloatingAddButton label="Adicionar" hint="Abre as opções de refeição e plano alimentar" onPress={() => setActionsOpen(true)} />
    <ActionMenu
      visible={actionsOpen}
      title="O que você quer fazer?"
      onClose={() => setActionsOpen(false)}
      items={[
        {
          key: 'plan', icon: ClipboardList,
          title: plan.data ? 'Ver plano alimentar' : 'Criar plano alimentar',
          caption: plan.data ? 'Refeições e metas da semana' : 'Monte um plano com IA',
          onPress: () => router.push(plan.data ? '/diet-plan' : '/diet-preferences'),
        },
        { key: 'ai', icon: Sparkles, tone: 'volt', title: 'Registrar refeição com IA', caption: 'Descreva ou fotografe o que comeu', onPress: () => setLoggerOpen(true) },
        { key: 'manual', icon: PencilLine, title: 'Adicionar refeição manualmente', caption: 'Informe calorias e macros', onPress: () => setEditing('new') },
      ]}
    />
    </View>
  );
}

/** Manual add / edit of a logged meal. */
function MealDialog({ meal, onClose }: { meal: LoggedMeal | null; onClose: () => void }) {
  const update = useUpdateMeal();
  const create = useLogMeal();
  const remove = useDeleteMeal();
  const sheet = useRef<DialogHandle>(null);
  // Slide the sheet down before unmounting, like the AI logger.
  const close = () => sheet.current?.dismiss();
  const [mealType, setMealType] = useState<MealType>((meal?.meal_type as MealType) ?? 'lunch');
  const [form, setForm] = useState({
    name: meal?.name ?? '',
    calories: meal ? String(Math.round(meal.calories)) : '',
    protein: meal ? String(Math.round(meal.protein)) : '',
    carbs: meal ? String(Math.round(meal.carbs)) : '',
    fats: meal ? String(Math.round(meal.fats)) : '',
  });
  const num = (v: string) => decimal(v) ?? 0;

  const save = async () => {
    if (update.isPending || create.isPending) return;
    if (!form.name.trim()) {
      AppAlert.alert('Informe o nome da refeição.');
      return;
    }
    if ([form.calories, form.protein, form.carbs, form.fats].some((v) => v.trim() && decimal(v) === undefined)) {
      AppAlert.alert('Valores inválidos', 'Informe calorias e nutrientes com números positivos ou zero.'); return;
    }
    try {
      if (meal) {
        await update.mutateAsync({
          id: meal.id,
          data: { name: form.name.trim(), calories: num(form.calories), protein: num(form.protein), carbs: num(form.carbs), fats: num(form.fats), meal_type: mealType },
        });
      } else {
        await create.mutateAsync({
          name: form.name.trim(),
          calories: num(form.calories),
          protein: num(form.protein),
          carbs: num(form.carbs),
          fats: num(form.fats),
          meal_type: mealType,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      close();
    } catch (e) {
      AppAlert.alert('Erro ao salvar refeição.', errorMessage(e));
    }
  };

  const confirmDelete = () =>
    meal &&
    AppAlert.alert('Excluir refeição?', `"${meal.name}" será removida do seu diário.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          remove.mutate(meal.id, {
            onSuccess: close,
            onError: (e) => AppAlert.alert('Erro ao excluir refeição.', errorMessage(e)),
          }),
      },
    ]);

  const field = (key: keyof typeof form, label: string, placeholder: string) => (
    <Input
      containerStyle={{ flex: 1 }}
      label={label}
      placeholder={placeholder}
      keyboardType="decimal-pad"
      value={form[key]}
      onChangeText={(v) => setForm({ ...form, [key]: v })}
    />
  );

  const saving = update.isPending || create.isPending;

  // Same bottom sheet as "Registrar Refeição" (AI): handle, large title, pinned footer.
  return (
    <Dialog
      ref={sheet}
      sheet
      sheetSize="registration"
      visible
      onClose={onClose}
      title={meal ? 'Editar Refeição' : 'Adicionar Refeição'}
      footer={meal ? (
        <Row style={{ gap: Spacing.three }}>
          <Button variant="soft" size="lg" title="Excluir" onPress={confirmDelete} loading={remove.isPending} disabled={saving} style={{ flex: 1 }} />
          <Button size="lg" title="Salvar" onPress={save} loading={saving} disabled={remove.isPending} style={{ flex: 1 }} />
        </Row>
      ) : (
        <Button size="lg" title="Salvar Refeição" onPress={save} loading={saving} />
      )}>
      <View style={{ gap: Spacing.two }}>
        <Text variant="label">Tipo de Refeição</Text>
        <Chips value={mealType} onChange={setMealType} options={MEAL_TYPES.map((m) => ({ value: m.value, label: m.short }))} />
      </View>
      <Input label="O que você comeu?" placeholder="Ex: Arroz, feijão e frango" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
      <Row style={{ gap: Spacing.three }}>
        {field('calories', 'Calorias (kcal)', '0')}
        {field('protein', 'Proteína (g)', '0')}
      </Row>
      <Row style={{ gap: Spacing.three }}>
        {field('carbs', 'Carbos (g)', '0')}
        {field('fats', 'Gorduras (g)', '0')}
      </Row>
    </Dialog>
  );
}
