import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { ChoiceField } from '@/components/choice-field';
import { View } from 'react-native';

import { BackBar, SCREEN_COLUMN } from '@/components/grouped';
import { Button, Input, Page, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api, errorMessage, isPremiumRequired } from '@/lib/api';
import { decimal } from '@/lib/forms';
import { usePremium } from '@/hooks/use-premium';

export default function DietPreferencesScreen() {
  const { requirePremium } = usePremium();
  const qc = useQueryClient();
  const [goal, setGoal] = useState('saude');
  const [budget, setBudget] = useState('300_500');
  const [ingredients, setIngredients] = useState('basicos');
  const [prep, setPrep] = useState('15_30');
  const [meals, setMeals] = useState('3');
  const [calories, setCalories] = useState('');
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [cooks, setCooks] = useState('yes');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (busy) return;
    const calorieGoal = decimal(calories);
    if (!calorieGoal || !Number.isInteger(calorieGoal)) { setError('Informe sua meta diária de calorias em um número inteiro positivo.'); return; }
    setBusy(true); setError('');
    try {
      await api('/diet/onboarding', { method: 'POST', body: { goal, restrictions, allergies: allergies.trim(), dislikes: dislikes.trim(), budget, ingredient_access: ingredients, meals_per_day: Number(meals), cooks_at_home: cooks === 'yes', prep_time: prep, calorie_goal: calorieGoal } });
      // Preferences are free to save; generating the AI diet plan is Premium.
      if (!requirePremium('diet_plan')) { setBusy(false); return; }
      await api('/diet/generate', { method: 'POST' });
      await qc.invalidateQueries({ queryKey: ['diet-plan'] });
      router.replace('/diet-plan');
    } catch (error) { if (isPremiumRequired(error)) return; setError(errorMessage(error, 'Não foi possível gerar o plano. Suas preferências foram mantidas nesta tela para tentar novamente.')); }
    finally { setBusy(false); }
  };
  return (
    <Page topBar={<BackBar />} contentStyle={SCREEN_COLUMN}>
      <View style={{ gap: 2, paddingHorizontal: Spacing.two }}>
        <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700' }}>Criar plano alimentar</Text>
        <Text muted style={{ fontSize: 13 }}>Escolha suas preferências e o Otto monta um cardápio para sua rotina. A geração pode levar alguns instantes.</Text>
      </View>
      <ChoiceField label="Objetivo" value={goal} onChange={setGoal} options={[{ value: 'saude', label: 'Saúde' }, { value: 'emagrecimento', label: 'Perder peso' }, { value: 'ganho_massa', label: 'Ganhar massa' }, { value: 'manutencao', label: 'Manter peso' }]} />
      <Input label="Meta diária (kcal)" placeholder="Sua meta de calorias" value={calories} onChangeText={setCalories} keyboardType="number-pad" />
      <ChoiceField label="Refeições por dia" value={meals} onChange={setMeals} options={['3', '4', '5', '6'].map((value) => ({ value, label: value }))} />
      <ChoiceField label="Orçamento mensal" value={budget} onChange={setBudget} options={[{ value: 'ate_300', label: 'Até R$ 300' }, { value: '300_500', label: 'R$ 300–500' }, { value: '500_800', label: 'R$ 500–800' }, { value: 'acima_800', label: 'Acima de R$ 800' }]} />
      <ChoiceField label="Ingredientes" value={ingredients} onChange={setIngredients} options={[{ value: 'basicos', label: 'Básicos' }, { value: 'intermediarios', label: 'Variados' }, { value: 'sofisticados', label: 'Sofisticados' }]} />
      <ChoiceField label="Você cozinha em casa?" value={cooks} onChange={setCooks} options={[{ value: 'yes', label: 'Sim' }, { value: 'no', label: 'Não' }]} />
      <ChoiceField label="Tempo de preparo" value={prep} onChange={setPrep} options={[{ value: 'menos_15', label: 'Até 15 min' }, { value: '15_30', label: '15–30 min' }, { value: '30_60', label: '30–60 min' }, { value: 'mais_60', label: 'Mais de 1h' }]} />
      <ChoiceField label="Restrições alimentares" value={restrictions} onChange={(v) => setRestrictions(restrictions.includes(v) ? restrictions.filter((x) => x !== v) : [...restrictions, v])} options={[{ value: 'vegetariano', label: 'Vegetariano' }, { value: 'vegano', label: 'Vegano' }, { value: 'sem_lactose', label: 'Sem lactose' }, { value: 'sem_gluten', label: 'Sem glúten' }]} />
      <Input label="Alergias (opcional)" value={allergies} onChangeText={setAllergies} multiline />
      <Input label="Alimentos que não gosta (opcional)" value={dislikes} onChangeText={setDislikes} multiline />
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
      <Button size="lg" title={busy ? 'Gerando seu plano…' : 'Gerar plano com IA'} onPress={submit} loading={busy} />
    </Page>
  );
}
