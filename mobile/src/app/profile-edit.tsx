import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { ChoiceField } from '@/components/choice-field';
import { Button, Card, Input, Page, PageSkeleton, QueryError, Row, Text, TopBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/queries';
import { api, errorMessage } from '@/lib/api';
import { decimal } from '@/lib/forms';
import type { Profile } from '@/types/api';

const GOALS = [
  { value: 'lose_weight', label: 'Perder peso' }, { value: 'gain_muscle', label: 'Ganhar massa' },
  { value: 'maintain', label: 'Manter peso' }, { value: 'gain_strength', label: 'Ganhar força' }, { value: 'improve_health', label: 'Melhorar saúde' },
];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((value, i) => ({ value, label: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i] }));

export default function ProfileEditScreen() {
  const profile = useProfile();
  if (profile.isLoading) return <PageSkeleton title="Meu objetivo" back tab={false} />;
  if (profile.error || !profile.data) return <QueryError title="Meu objetivo" back error={profile.error} onRetry={profile.refetch} />;
  return <ProfileForm key={profile.data.id} profile={profile.data} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const onboarding = !profile.onboarding_completed;
  const [form, setForm] = useState({ age: String(profile.age ?? ''), height: String(profile.height_cm ?? ''), weight: String(profile.current_weight_kg ?? ''), target: String(profile.target_weight_kg ?? ''), gender: profile.gender ?? 'male', activity: profile.activity_level ?? 'moderate', goal: profile.fitness_goal ?? 'improve_health', duration: String(profile.workout_duration_minutes ?? 60), injuries: profile.injuries_limitations ?? '', diet: profile.dietary_restrictions ?? '' });
  const [days, setDays] = useState(profile.available_days ?? []);
  const [equipment, setEquipment] = useState(profile.equipment_available ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const change = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const toggle = (list: string[], value: string) => list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  const save = async () => {
    if (busy) return;
    const age = decimal(form.age), height = decimal(form.height), weight = decimal(form.weight), target = decimal(form.target), duration = decimal(form.duration);
    if (!age || !Number.isInteger(age) || !height || !weight || !target || !duration || !Number.isInteger(duration) || !days.length) {
      setError('Preencha idade, altura, pesos e duração com valores positivos e escolha os dias de treino.'); return;
    }
    setBusy(true); setError('');
    try {
      await api(onboarding ? '/onboarding' : '/profile/me', { method: onboarding ? 'POST' : 'PUT', body: { age, gender: form.gender, height_cm: height, current_weight_kg: weight, target_weight_kg: target, activity_level: form.activity, fitness_goal: form.goal, available_days: days, equipment_available: equipment, workout_duration_minutes: duration, injuries_limitations: form.injuries, dietary_restrictions: form.diet, ...(onboarding ? { experience_level: 'beginner' } : {}) } });
      await Promise.all([qc.invalidateQueries({ queryKey: ['profile'] }), qc.invalidateQueries({ queryKey: ['dashboard'] })]);
      router.replace(onboarding ? '/workouts' : '/profile');
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const field = (key: keyof typeof form, label: string) => <Input containerStyle={{ flex: 1 }} label={label} value={form[key]} keyboardType="decimal-pad" onChangeText={(v) => change(key, v)} />;
  return (
    <Page topBar={<TopBar title={onboarding ? 'Configure seu perfil' : 'Meu objetivo'} back />}>
      <Card><Text variant="titleLg">Seu ponto de partida.</Text><Text muted>Essas informações orientam o plano e as metas. Atualize quando sua rotina mudar.</Text></Card>
      <Row style={{ gap: Spacing.three }}>{field('age', 'Idade')}{field('height', 'Altura (cm)')}</Row>
      <Row style={{ gap: Spacing.three }}>{field('weight', 'Peso atual (kg)')}{field('target', 'Peso desejado (kg)')}</Row>
      <ChoiceField label="Sexo para cálculo metabólico" value={form.gender} options={[{ value: 'male', label: 'Masculino' }, { value: 'female', label: 'Feminino' }]} onChange={(v) => change('gender', v)} />
      <ChoiceField label="Objetivo" value={form.goal} options={GOALS} onChange={(v) => change('goal', v)} />
      <ChoiceField label="Nível de atividade" value={form.activity} options={[{ value: 'sedentary', label: 'Sedentário' }, { value: 'light', label: 'Leve' }, { value: 'moderate', label: 'Moderado' }, { value: 'active', label: 'Intenso' }, { value: 'very_active', label: 'Muito intenso' }]} onChange={(v) => change('activity', v)} />
      <ChoiceField label="Dias disponíveis" value={days} options={DAYS} onChange={(v) => setDays(toggle(days, v))} />
      {field('duration', 'Tempo por treino (min)')}
      <ChoiceField label="Equipamentos disponíveis" value={equipment} options={[{ value: 'bodyweight', label: 'Peso corporal' }, { value: 'dumbbells', label: 'Halteres' }, { value: 'barbell', label: 'Barra' }, { value: 'machines', label: 'Máquinas' }, { value: 'bands', label: 'Elásticos' }]} onChange={(v) => setEquipment(toggle(equipment, v))} />
      <Input label="Lesões e limitações (opcional)" multiline value={form.injuries} onChangeText={(v) => change('injuries', v)} />
      <Input label="Restrições alimentares (opcional)" multiline value={form.diet} onChangeText={(v) => change('diet', v)} />
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
      <Button size="lg" title="Salvar e continuar" onPress={save} loading={busy} />
    </Page>
  );
}
