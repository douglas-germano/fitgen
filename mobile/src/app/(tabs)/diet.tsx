import { AppAlert } from '@/lib/feedback';
import { QueryError, Button, Dialog, Input, Page, PageSkeleton, ProgressBar, Row, Text, type DialogHandle } from '@/components/ui';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { History, PencilLine, ShoppingBasket, Utensils } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { ActionMenu, FAB_CLEARANCE, FloatingAddButton } from '@/components/action-menu';
import { Group, GroupRow, HeaderCard, SCREEN_COLUMN } from '@/components/grouped';
import { MEAL_ICONS, MEAL_TYPES, MealLogger, MealTypePicker } from '@/components/meal-logger';
import { OttoAvatar } from '@/components/otto';
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


/** "07:30" from the meal timestamp. */
function mealTime(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

  const macros = [
    { label: 'Proteína', value: totals.protein ?? 0, goal: t?.protein },
    { label: 'Carbos', value: totals.carbs ?? 0, goal: t?.carbs },
    { label: 'Gorduras', value: totals.fats ?? 0, goal: t?.fats },
  ];

  return (
    <View style={{ flex: 1 }}>
    <Page
      tab
      // Room for the floating "+" so it never covers the last meal.
      contentStyle={{ ...SCREEN_COLUMN, paddingBottom: FAB_CLEARANCE }}
      refreshing={daily.isRefetching}
      onRefresh={() => {
        daily.refetch();
        plan.refetch();
      }}>
      <HeaderCard title="Calorias de hoje" value={`${pct(calories, target)}%`}>
        <View style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.three }}>
          <Row style={{ alignItems: 'baseline', gap: Spacing.one }}>
            <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.7, fontVariant: ['tabular-nums'] }}>
              {formatInt(calories)}
            </Text>
            <Text muted>de {formatInt(target)} kcal</Text>
          </Row>
          <ProgressBar value={pct(calories, target)} />
          <Text muted style={{ fontSize: 13 }}>
            {calories <= target ? `Restam ${formatInt(target - calories)} kcal` : `${formatInt(calories - target)} kcal acima da meta`}
          </Text>
        </View>
      </HeaderCard>

      <HeaderCard title="Macronutrientes" value={t ? 'Meta do plano' : 'Sem plano ativo'} onPress={() => router.push(plan.data ? '/diet-plan' : '/diet-preferences')}>
        <Row style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.four, alignItems: 'flex-start' }}>
          {macros.map(({ label, value, goal }) => (
            <View key={label} style={{ flex: 1, minWidth: 0, gap: Spacing.two }}>
              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 18, lineHeight: 23, fontWeight: '700', fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
                  {formatInt(value)} g
                </Text>
                <Text muted style={{ fontSize: 12, lineHeight: 16 }} numberOfLines={1}>{label}{goal ? ` · ${goal} g` : ''}</Text>
              </View>
              <ProgressBar value={pct(value, goal)} thin />
            </View>
          ))}
        </Row>
      </HeaderCard>

      <Group title="Refeições de hoje">
        {meals.length === 0 ? (
          <GroupRow icon={Utensils} title="Nenhuma refeição registrada hoje" caption="Toque em + para registrar o que você comeu." onPress={() => setActionsOpen(true)} />
        ) : meals.map((meal) => {
          const type = MEAL_TYPES.find((m) => m.value === meal.meal_type);
          const time = mealTime(meal.created_at);
          return (
            <GroupRow key={meal.id} icon={MEAL_ICONS[meal.meal_type as MealType]?.icon ?? Utensils}
              title={meal.name}
              caption={[type?.label, time].filter(Boolean).join(' · ')}
              value={`${Math.round(meal.calories)} kcal`}
              onPress={() => setEditing(meal)} />
          );
        })}
      </Group>

      <Group title="Plano alimentar">
        <GroupRow leading={<OttoAvatar size={26} />} title={plan.data ? 'Cardápio da semana' : 'Peça um plano ao Otto'}
          caption={plan.data ? 'Refeições e metas montadas pelo Otto' : 'Um cardápio com base nas suas preferências'}
          onPress={() => router.push(plan.data ? '/diet-plan' : '/diet-preferences')} />
        {plan.data?.shopping_list?.length ? (
          <GroupRow icon={ShoppingBasket} title="Lista de compras" value={`${plan.data.shopping_list.length} itens`} onPress={() => router.push('/shopping-list')} />
        ) : null}
        <GroupRow icon={History} title="Histórico alimentar" onPress={() => router.push('/nutrition-history')} />
      </Group>

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
          key: 'ai',
          leading: <OttoAvatar size={34} />,
          title: 'Conte ao Otto o que você comeu',
          caption: 'Tire uma foto ou descreva a refeição',
          onPress: () => setLoggerOpen(true),
        },
        { key: 'manual', icon: PencilLine, title: 'Adicionar refeição manualmente', caption: 'Informe calorias e macros', onPress: () => setEditing('new') },
        {
          key: 'plan',
          leading: <OttoAvatar size={34} />,
          title: plan.data ? 'Ver o plano alimentar do Otto' : 'Peça um plano alimentar ao Otto',
          caption: plan.data ? 'Refeições e metas da semana' : 'O Otto monta o cardápio com base nas suas preferências',
          onPress: () => router.push(plan.data ? '/diet-plan' : '/diet-preferences'),
        },
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
      title={meal ? 'Editar refeição' : 'Adicionar refeição'}
      footer={meal ? (
        <Row style={{ gap: Spacing.three }}>
          <Button variant="soft" size="lg" title="Excluir" onPress={confirmDelete} loading={remove.isPending} disabled={saving} style={{ flex: 1 }} />
          <Button size="lg" title="Salvar" onPress={save} loading={saving} disabled={remove.isPending} style={{ flex: 1 }} />
        </Row>
      ) : (
        <Button size="lg" title="Salvar refeição" onPress={save} loading={saving} />
      )}>
      <MealTypePicker value={mealType} onChange={setMealType} />
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
