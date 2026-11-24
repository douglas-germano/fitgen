import { AppAlert } from '@/lib/feedback';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Apple, Camera, Coffee, ImagePlus, Soup, Sparkles, Utensils, X, type LucideIcon } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';

import { Group, GroupRow, HeaderCard, Tile, TileColors, TileRow } from '@/components/grouped';
import { OttoAvatar } from '@/components/otto';
import { Button, Dialog, Input, Row, Text, type DialogHandle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { useEstimateMeal, useLogMeal } from '@/hooks/queries';
import { errorMessage, isPremiumRequired } from '@/lib/api';
import type { MealEstimate, MealType } from '@/types/api';
import { usePremium } from '@/hooks/use-premium';
import { decimal } from '@/lib/forms';
import { openPremiumSheet } from '@/lib/premium-sheet';

export const MEAL_TYPES: { value: MealType; label: string; short: string }[] = [
  { value: 'breakfast', label: 'Café da Manhã', short: 'Café' },
  { value: 'lunch', label: 'Almoço', short: 'Almoço' },
  { value: 'snack', label: 'Lanche', short: 'Lanche' },
  { value: 'dinner', label: 'Jantar', short: 'Jantar' },
];

export const MEAL_ICONS: Record<MealType, { icon: LucideIcon; color: string }> = {
  breakfast: { icon: Coffee, color: TileColors.orange },
  lunch: { icon: Utensils, color: TileColors.green },
  snack: { icon: Apple, color: TileColors.red },
  dinner: { icon: Soup, color: TileColors.purple },
};

/** Four tiles to pick the meal type, like the measurement tiles. */
export function MealTypePicker({ value, onChange }: { value: MealType; onChange: (type: MealType) => void }) {
  return (
    <View accessibilityRole="tablist" style={{ gap: Spacing.two }}>
      <Text variant="label">Tipo de refeição</Text>
      <TileRow>
        {MEAL_TYPES.map((t) => (
          <Tile key={t.value} role="tab" icon={MEAL_ICONS[t.value].icon} color={MEAL_ICONS[t.value].color}
            title={t.short} selected={value === t.value} onPress={() => onChange(t.value)} />
        ))}
      </TileRow>
    </View>
  );
}

/** Meal type that fits the current hour. */
function defaultMealType(): MealType {
  const h = new Date().getHours();
  return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h < 19 ? 'snack' : 'dinner';
}

/** "Registrar Refeição" bottom sheet — describe and/or photograph a meal, let the AI estimate, save. */
export function MealLogger({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const Colors = useColors();
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const sheet = useRef<DialogHandle>(null);
  const estimateMeal = useEstimateMeal();
  const { locked } = usePremium();
  // Freemium: free users log meals manually; the AI estimate is Premium.
  const manual = locked('meal_estimate');
  const [macros, setMacros] = useState({ calories: '', protein: '', carbs: '', fats: '' });
  const upsell = useRef(false);
  const logMeal = useLogMeal();

  const close = () => sheet.current?.dismiss();
  const afterClose = () => {
    setDescription('');
    setPhotos([]);
    setEstimate(null);
    setMacros({ calories: '', protein: '', carbs: '', fats: '' });
    setMealType(defaultMealType());
    onClose();
  };
  // iOS shows one modal at a time: open the purchase card once this sheet is fully gone.
  const afterDismiss = () => {
    if (!upsell.current) return;
    upsell.current = false;
    openPremiumSheet('meal_estimate');
  };
  const unlockAi = () => {
    upsell.current = true;
    close();
  };

  const pick = async (source: 'camera' | 'library') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      AppAlert.alert('Permissão necessária', 'Autorize o acesso nas configurações do aparelho.');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.6,
      allowsMultipleSelection: source === 'library',
      selectionLimit: 3,
    };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, 3));
  };

  const analyze = async () => {
    if ((!description.trim() && !photos.length) || estimateMeal.isPending || logMeal.isPending) return;
    if (manual) { unlockAi(); return; }
    Keyboard.dismiss();
    try {
      setEstimate(await estimateMeal.mutateAsync({ description: description.trim(), photos }));
    } catch (e) {
      if (!isPremiumRequired(e)) AppAlert.alert('Erro ao analisar refeição.', errorMessage(e));
    }
  };

  const save = async () => {
    if (!estimate || logMeal.isPending) return;
    try {
      await logMeal.mutateAsync({ ...estimate, meal_type: mealType });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      close();
    } catch (e) {
      AppAlert.alert('Erro ao registrar refeição.', errorMessage(e));
    }
  };

  const canAnalyze = !!description.trim() || photos.length > 0;
  const manualCalories = decimal(macros.calories);
  const canSaveManual = !!description.trim() && manualCalories !== undefined && manualCalories > 0;
  const saveManual = async () => {
    if (!canSaveManual || logMeal.isPending) return;
    try {
      await logMeal.mutateAsync({
        name: description.trim(), meal_type: mealType, calories: manualCalories!,
        protein: decimal(macros.protein) ?? 0, carbs: decimal(macros.carbs) ?? 0, fats: decimal(macros.fats) ?? 0,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      close();
    } catch (e) {
      AppAlert.alert('Erro ao registrar refeição.', errorMessage(e));
    }
  };
  const macro = (key: keyof typeof macros) => (t: string) => setMacros((m) => ({ ...m, [key]: t }));

  return (
    <Dialog ref={sheet} sheet sheetSize="registration" scrollable={manual} visible={visible} onClose={afterClose} onDismissed={afterDismiss} title="Registrar refeição"
      footer={manual ? (
        <Button size="lg" title="Salvar refeição" onPress={saveManual} loading={logMeal.isPending} disabled={!canSaveManual} />
      ) : estimate ? (
        <Row style={{ gap: Spacing.three }}>
          <Button variant="soft" size="lg" title="Editar refeição" onPress={() => setEstimate(null)} disabled={logMeal.isPending} style={{ flex: 1 }} />
          <Button size="lg" title="Salvar refeição" onPress={save} loading={logMeal.isPending} style={{ flex: 1 }} />
        </Row>
      ) : (
        <Button size="lg" icon={Sparkles} title="Analisar com o Otto" onPress={analyze} loading={estimateMeal.isPending} disabled={!canAnalyze} />
      )}>
      {!estimate && <>
      <MealTypePicker value={mealType} onChange={setMealType} />

      <Input
        label="O que você comeu?"
        placeholder="Ex: Arroz, feijão, 1 filé de frango grelhado e salada"
        value={description}
        onChangeText={(t) => {
          setDescription(t);
          if (estimate) setEstimate(null);
        }}
        multiline
      />

      {photos.length > 0 && (
        <Row style={{ gap: Spacing.two }}>
          {photos.map((uri) => (
            <View key={uri}>
              <Image source={{ uri }} style={{ width: 48, height: 48, borderRadius: Radius.sm }} />
              <Pressable
                onPress={() => setPhotos((p) => p.filter((x) => x !== uri))}
                accessibilityLabel="Remover foto"
                hitSlop={6}
                style={{ position: 'absolute', top: -6, right: -6, backgroundColor: Colors.surfaceInverse, borderRadius: 10, padding: 3 }}>
                <X size={12} color={Colors.onInverse} />
              </Pressable>
            </View>
          ))}
        </Row>
      )}

      {manual ? (
        <>
          <Row style={{ gap: Spacing.three }}>
            <Input label="Calorias (kcal)" placeholder="Ex: 550" keyboardType="decimal-pad" value={macros.calories} onChangeText={macro('calories')} containerStyle={{ flex: 1 }} />
            <Input label="Proteína (g)" placeholder="Opcional" keyboardType="decimal-pad" value={macros.protein} onChangeText={macro('protein')} containerStyle={{ flex: 1 }} />
          </Row>
          <Row style={{ gap: Spacing.three }}>
            <Input label="Carboidratos (g)" placeholder="Opcional" keyboardType="decimal-pad" value={macros.carbs} onChangeText={macro('carbs')} containerStyle={{ flex: 1 }} />
            <Input label="Gordura (g)" placeholder="Opcional" keyboardType="decimal-pad" value={macros.fats} onChangeText={macro('fats')} containerStyle={{ flex: 1 }} />
          </Row>
          <Group>
            <GroupRow leading={<OttoAvatar size={24} />} title="Calcular com o Otto" caption="Premium · foto ou descrição viram calorias e macros" onPress={unlockAi} />
          </Group>
        </>
      ) : (
        <Group>
          <GroupRow icon={Camera} title="Tirar foto" caption={photos.length >= 3 ? 'Máximo de 3 fotos' : 'O Otto estima pela imagem'}
            onPress={photos.length >= 3 ? undefined : () => { void pick('camera'); }} />
          <GroupRow icon={ImagePlus} title="Escolher da galeria" caption={`${photos.length} de 3 fotos`}
            onPress={photos.length >= 3 ? undefined : () => { void pick('library'); }} />
        </Group>
      )}
      </>}

      {estimate && (
        <HeaderCard title="Análise do Otto" value="Valores estimados">
          <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
            {estimate.name ? (
              <Text muted style={{ fontSize: 13, marginTop: -Spacing.two }}>
                {estimate.name}
                {estimate.portion_size ? ` · ${estimate.portion_size}` : ''}
              </Text>
            ) : null}
            <Row style={{ alignItems: 'flex-start' }}>
              <Macro value={`${Math.round(estimate.calories)}`} label="kcal" />
              <Macro value={`${Math.round(estimate.protein)} g`} label="Proteína" />
              <Macro value={`${Math.round(estimate.carbs)} g`} label="Carbos" />
              <Macro value={`${Math.round(estimate.fats)} g`} label="Gorduras" />
            </Row>
          </View>
        </HeaderCard>
      )}

    </Dialog>
  );
}

function Macro({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontSize: 18, lineHeight: 23, fontWeight: '700', fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="caption" style={{ fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}
