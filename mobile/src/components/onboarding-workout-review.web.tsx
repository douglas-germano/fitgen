import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useWorkoutPlan } from '@/hooks/queries';
import { api, errorMessage } from '@/lib/api';
import { onboardingSteps, type Answers } from '@/lib/onboarding';
import { DAY_LABELS, sortedDays, workoutMinutes, workoutTitle } from '@/lib/workout';
import { OttoCard, OttoSurface } from './otto-surface.web';

type Job = { status: 'done' | 'pending' | 'failed' | 'idle'; plan_id?: string; draft?: boolean; preferences?: { days: string[]; location: string } };

const daysOptions = onboardingSteps.find(({ key }) => key === 'days')?.options ?? [];
const locationOptions = onboardingSteps.find(({ key }) => key === 'location')?.options ?? [];

async function waitForDraft(job: Job) {
  let current = job;
  for (let poll = 0; current.status === 'pending' && poll < 105; poll++) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    current = await api<Job>('/onboarding/generate-workout/status');
  }
  if (current.status !== 'done' || !current.draft || !current.plan_id) {
    throw new Error(current.status === 'pending'
      ? 'A ficha ainda está sendo preparada. Tente recuperar a prévia em instantes.'
      : 'Não foi possível gerar uma prévia. Tente novamente.');
  }
  return current.plan_id;
}

export function OnboardingWorkoutReview({ answers, onActivated }: { answers: Answers; onActivated: () => void }) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(() => Array.isArray(answers.days) ? answers.days : []);
  const [location, setLocation] = useState(() => typeof answers.location === 'string' ? answers.location : '');
  const [draftId, setDraftId] = useState('');
  const [activated, setActivated] = useState(false);
  const draft = useWorkoutPlan(draftId || undefined);
  const generate = useMutation({
    mutationFn: async (recover: boolean) => {
      const existing = await api<Job>('/onboarding/generate-workout/status');
      const samePreferences = existing.draft && existing.preferences?.location === location &&
        existing.preferences.days.length === days.length && days.every((day) => existing.preferences?.days.includes(day));
      if (samePreferences && (existing.status === 'pending' || existing.status === 'done')) return waitForDraft(existing);
      if (recover) throw new Error('Não há uma prévia para estes dias e equipamentos.');
      return waitForDraft(await api<Job>('/onboarding/generate-workout', { method: 'POST', body: { draft: true, days, location } }));
    },
    onSuccess: setDraftId,
  });
  const activate = useMutation({
    mutationFn: () => api(`/workouts/${draftId}/activate`, { method: 'PUT' }),
    onSuccess: () => {
      setActivated(true);
      onActivated();
      void queryClient.invalidateQueries({ queryKey: ['workouts'] });
      void queryClient.invalidateQueries({ queryKey: ['workout', draftId] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
  const working = generate.isPending || activate.isPending;
  const clearPreview = () => { setDraftId(''); generate.reset(); activate.reset(); };
  const planDays = sortedDays(draft.data);
  return <OttoCard title="Revise sua primeira ficha">
    {activated ? <p role="status">Sua ficha está ativa na aba Treino.</p> : <>
      <fieldset disabled={working}><legend>Dias disponíveis</legend>
        <div className="fitgen-otto-grid">{daysOptions.map(({ value, label }) =>
          <label key={value}><input type="checkbox" checked={days.includes(value)} onChange={(event) => {
            setDays(event.target.checked ? [...days, value] : days.filter((day) => day !== value)); clearPreview();
          }} />{label}</label>)}</div>
      </fieldset>
      <label>Equipamento disponível<select value={location} disabled={working} onChange={(event) => { setLocation(event.target.value); clearPreview(); }}>
        <option value="">Selecione</option>
        {locationOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {!draftId && !working && !!days.length && !!location && <OttoSurface items={[]} action={{ id: 'generate', label: 'Gerar prévia da ficha' }}
        onAction={() => { if (!working) generate.mutate(false); }} />}
      {!draftId && !working && !!generate.error && <button type="button" onClick={() => generate.mutate(true)}>Recuperar prévia existente</button>}
      {generate.isPending && <p role="status">Montando a divisão semanal…</p>}
      {draftId && draft.isLoading && <p role="status">Carregando a ficha…</p>}
      {draft.data && <OttoSurface items={[
        { title: draft.data.name },
        ...planDays.map((day) => ({
          title: `${DAY_LABELS[day.day_of_week] ?? day.day_of_week} · ${workoutTitle(day)}`,
          detail: `${workoutMinutes(day)} min estimados · ${day.exercises.map(({ name }) => name).join(', ')}`,
        })),
      ]} action={planDays.length && !working ? { id: 'activate', label: 'Ativar esta ficha' } : undefined}
        onAction={(id) => { if (id === 'activate' && !working) activate.mutate(); }} />}
      {activate.isPending && <p role="status">Ativando sua ficha…</p>}
      {!!(generate.error || draft.error || activate.error) && <p role="alert">{errorMessage(generate.error ?? draft.error ?? activate.error)}</p>}
    </>}
  </OttoCard>;
}
