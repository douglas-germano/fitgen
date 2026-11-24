import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { useActiveSession, useActiveWorkoutPlan, useDietPlan, useExerciseLibrary, useRecentRecords, useWorkoutHistory } from '@/hooks/queries';
import { api, errorMessage } from '@/lib/api';
import { currentWeek, DAY_LABELS, exerciseLine, formatDateBR, formatInt, todaysWorkout, workoutMinutes, workoutTitle } from '@/lib/workout';
import type { CoachToolRequest } from '@/lib/coach-tools';
import type { Exercise, LibraryExercise, PlannedDay } from '@/types/api';
import { OttoCard, OttoSurface } from './otto-surface.web';

function AdaptWorkout({ request }: { request: CoachToolRequest }) {
  const queryClient = useQueryClient();
  const { plan, isLoading, error } = useActiveWorkoutPlan();
  const library = useExerciseLibrary();
  const active = useActiveSession();
  const [dayId, selectDay] = useState('');
  const [minutes, setMinutes] = useState(request.minutes ?? 25);
  const [equipment, setEquipment] = useState<string>(request.equipment ?? 'any');
  const [excluded, setExcluded] = useState<string[]>([]);
  const days = plan?.days ?? [];
  const day = days.find(({ id }) => id === dayId) ?? todaysWorkout(plan) ?? days[0];
  const entries = library.data ?? [];
  const exercises = day?.exercises ?? [];
  const plannedLibraryIds = new Set(exercises.map(({ exercise_library_id }) => exercise_library_id));
  const compatible = (entry: LibraryExercise) => !!entry.equipment_needed.length &&
    entry.equipment_needed.every((item) => item === 'bodyweight' || (equipment === 'dumbbells' && item === 'dumbbells'));
  const used = new Set<string>();
  const candidates = exercises.flatMap<{ exercise: Exercise; replacement?: LibraryExercise }>((exercise) => {
    if (equipment === 'any') return [{ exercise, replacement: undefined }];
    const entry = entries.find(({ id }) => id === exercise.exercise_library_id);
    if (!entry) return [];
    if (compatible(entry)) return [{ exercise, replacement: undefined }];
    const muscle = entry.muscle_groups[0];
    if (!muscle) return [];
    const replacement = entries.find((candidate) =>
      candidate.category === entry.category && candidate.muscle_groups[0] === muscle &&
      !plannedLibraryIds.has(candidate.id) && !used.has(candidate.id) && compatible(candidate));
    if (!replacement) return [];
    used.add(replacement.id);
    return [{ exercise, replacement }];
  });
  const selected: { exercise: Exercise; replacement?: LibraryExercise }[] = [];
  let seconds = 0;
  for (const item of candidates) {
    const { exercise } = item;
    const duration = exercise.sets * (45 + (exercise.rest_seconds ?? 60));
    if (excluded.includes(exercise.id) || seconds + duration > minutes * 60) continue;
    selected.push(item);
    seconds += duration;
  }
  const create = useMutation({
    mutationFn: () => api<{ plan_id: string; day_id: string }>(`/workouts/day/${day?.id}/adaptation`, {
      method: 'POST', body: {
        exercise_ids: selected.map(({ exercise }) => exercise.id),
        replacements: Object.fromEntries(selected.flatMap(({ exercise, replacement }) => replacement ? [[exercise.id, replacement.id]] : [])),
      },
    }),
    onSuccess: async ({ plan_id, day_id }) => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] });
      await queryClient.invalidateQueries({ queryKey: ['workout-active-session'] });
      router.push({ pathname: '/workout/[id]/play/[dayId]', params: { id: plan_id, dayId: day_id } });
    },
  });
  return <OttoCard title="Adaptar treino">
    {error ? <p role="alert">{errorMessage(error)}</p> : isLoading ? <p>Carregando sua ficha…</p> : !day ? <p>Ative uma ficha para adaptar um treino.</p> : <>
      <div className="fitgen-otto-grid">
        <label>Treino<select disabled={create.isPending} value={day.id} onChange={(event) => { selectDay(event.target.value); setExcluded([]); }}>
          {days.map((item) => <option key={item.id} value={item.id}>{workoutTitle(item)}</option>)}
        </select></label>
        <label>Tempo disponível<select disabled={create.isPending} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
          {[...new Set([15, 20, 25, 30, 45, 60, 90, request.minutes ?? 25])].sort((a, b) => a - b).map((value) => <option key={value} value={value}>{value} min</option>)}
        </select></label>
        <label>Equipamento<select disabled={create.isPending} value={equipment} onChange={(event) => setEquipment(event.target.value)}>
          <option value="any">Da ficha</option><option value="dumbbells">Só halteres</option><option value="bodyweight">Sem equipamento</option>
        </select></label>
      </div>
      {equipment !== 'any' && library.isLoading ? <p>Carregando a biblioteca…</p> : equipment !== 'any' && library.error ? <p role="alert">{errorMessage(library.error)}</p> : <>
        {!!candidates.length && <fieldset><legend>Exercícios disponíveis</legend>{candidates.map(({ exercise, replacement }) =>
          <label key={exercise.id}><input type="checkbox" disabled={create.isPending} checked={!excluded.includes(exercise.id)} onChange={(event) =>
            setExcluded(event.target.checked ? excluded.filter((item) => item !== exercise.id) : [...excluded, exercise.id])} />{replacement?.name ?? exercise.name}</label>)}</fieldset>}
        {selected.length ? <OttoSurface items={[
          { title: `Prévia · ${workoutMinutes({ ...day, exercises: selected.map(({ exercise }) => exercise) })} min estimados · ${selected.length} de ${day.exercises.length} exercícios` },
          ...selected.map(({ exercise, replacement }) => ({
            title: replacement?.name ?? exercise.name,
            detail: [exerciseLine(exercise), replacement && `No lugar de ${exercise.name}`].filter(Boolean).join(' · '),
          })),
        ]} action={!active.data && !active.isPending && !active.error && !create.isPending ? { id: 'start', label: 'Iniciar treino adaptado' } : undefined}
          onAction={(id) => { if (id === 'start' && !create.isPending) create.mutate(); }} /> : <p>Nenhum exercício da ficha cabe nesses filtros.</p>}
      </>}
      {active.data && <p>Finalize a sessão em andamento antes de iniciar outra.</p>}
      {!!active.error && <p role="alert">{errorMessage(active.error)}</p>}
      {create.isPending && <p role="status">Preparando sua sessão…</p>}
      {!!create.error && <p role="alert">{errorMessage(create.error)}</p>}
    </>}
  </OttoCard>;
}

function ReviewWeek({ request }: { request: CoachToolRequest }) {
  const [topic, setTopic] = useState<string>(request.topic ?? 'training');
  const week = currentWeek();
  const monday = week[0];
  monday.setHours(0, 0, 0, 0);
  const sunday = week[6];
  sunday.setHours(23, 59, 59, 999);
  const from = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  const history = useWorkoutHistory();
  const records = useRecentRecords();
  const nutrition = useQuery({
    queryKey: ['nutrition-history', 'coach-week', from], enabled: topic === 'nutrition',
    queryFn: () => api<{ data: { date: string; calories: number; meals_count: number }[] }>(`/nutrition/history?period=dia&start_date=${from}`),
  });
  const inWeek = (iso: string) => {
    const date = new Date(iso);
    return date >= monday && date <= sunday;
  };
  const sessions = (history.data ?? []).filter(({ started_at }) => inWeek(started_at))
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
  const bests = (records.data ?? []).filter(({ achieved_at }) => inWeek(achieved_at));
  const meals = (nutrition.data?.data ?? []).filter(({ date }) => date.slice(0, 10) >= from);
  const rows = topic === 'training' ? [
    { title: `${sessions.length} sessões registradas`, detail: `${Math.round(sessions.reduce((sum, item) => sum + item.duration_seconds, 0) / 60)} min no total` },
    ...sessions.slice(0, 12).map((session) => ({ title: session.workout_name, detail: `${formatDateBR(session.started_at)} · ${Math.round(session.duration_seconds / 60)} min` })),
    ...bests.map((record) => ({ title: record.name, detail: `Recorde de carga · ${record.previous_kg} → ${record.weight_kg} kg` })),
  ] : meals.length ? meals.map((row) => ({ title: row.date.slice(0, 10).split('-').reverse().join('/'), detail: `${row.meals_count} refeições · ${formatInt(row.calories)} kcal registradas` })) : [{ title: 'Nenhuma refeição registrada nesta semana.' }];
  const query = topic === 'training' ? history : nutrition;
  return <OttoCard title="Revisar minha semana">
    <label>O que você quer revisar?<select value={topic} onChange={(event) => setTopic(event.target.value)}>
      <option value="training">Treinos e cargas</option><option value="nutrition">Diário alimentar</option>
    </select></label>
    {query.error ? <p role="alert">{errorMessage(query.error)}</p> : query.isLoading ? <p>Carregando seus registros…</p> : <OttoSurface items={rows} />}
    {topic === 'training' && records.error && <p>Os recordes de carga estão indisponíveis agora.</p>}
  </OttoCard>;
}

const slots: Record<keyof PlannedDay, string> = {
  cafe: 'Café da manhã', lanche_manha: 'Lanche da manhã', pre_treino: 'Pré-treino', almoco: 'Almoço',
  lanche: 'Lanche', pos_treino: 'Pós-treino', jantar: 'Jantar', ceia: 'Ceia',
};
const weekdayLabels = Object.values(DAY_LABELS);
const dietDays = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
const dayLabel = (key: string) => weekdayLabels[dietDays.indexOf(key)] ?? key;
const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

function AdjustMeal({ request }: { request: CoachToolRequest }) {
  const queryClient = useQueryClient();
  const { data: plan, isLoading, error } = useDietPlan();
  const [targetDay, setDay] = useState('');
  const [slot, setSlot] = useState<keyof PlannedDay>('almoco');
  const [ingredient, setIngredient] = useState(request.ingredient ?? '');
  const [source, setSource] = useState('');
  const weekly = plan?.weekly_plan ?? {};
  const keys = Object.keys(weekly);
  const day = keys.includes(targetDay) ? targetDay : keys.find((key) => normalize(key) === dietDays[(new Date().getDay() + 6) % 7]) ?? keys[0];
  const dayMeals = weekly[day] ?? {};
  const selectedSlot = dayMeals[slot] ? slot : (Object.keys(dayMeals) as (keyof PlannedDay)[]).find((key) => slots[key]);
  const current = selectedSlot ? dayMeals[selectedSlot] : undefined;
  const options = selectedSlot ? keys.flatMap((key) => {
    const meal = weekly[key]?.[selectedSlot];
    const excluded = normalize(ingredient);
    if (key === day || !meal || meal.nome === current?.nome || (excluded && normalize([meal.nome, ...(meal.ingredientes ?? [])].join(' ')).includes(excluded))) return [];
    return [{ key, meal }];
  }) : [];
  const chosen = options.find(({ key }) => key === source);
  const swap = useMutation({
    mutationFn: () => api(`/diet/plan/${plan?.id}/meal-swap`, { method: 'PUT', body: { day, source_day: chosen?.key, slot: selectedSlot, expected_meal: chosen?.meal, expected_current: current } }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['diet-plan'] }); setSource(''); },
  });
  return <OttoCard title="Ajustar refeição do plano">
    {error ? <p role="alert">{errorMessage(error)}</p> : isLoading ? <p>Carregando seu plano alimentar…</p> : !day ? <p>Crie um plano alimentar para comparar refeições.</p> : <>
      <div className="fitgen-otto-grid">
        <label>Dia<select disabled={swap.isPending} value={day} onChange={(event) => { setDay(event.target.value); setSource(''); swap.reset(); }}>
          {keys.map((key) => <option key={key} value={key}>{dayLabel(key)}</option>)}
        </select></label>
        <label>Refeição<select disabled={swap.isPending} value={selectedSlot ?? ''} onChange={(event) => { setSlot(event.target.value as keyof PlannedDay); setSource(''); swap.reset(); }}>
          {Object.entries(slots).filter(([key]) => dayMeals[key as keyof PlannedDay]).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
      </div>
      <label>Ingrediente indisponível<input disabled={swap.isPending} value={ingredient} onChange={(event) => { setIngredient(event.target.value); setSource(''); swap.reset(); }} placeholder="Ex.: frango" /></label>
      {current && <p>No plano agora: <strong>{current.nome}</strong> · {formatInt(current.calorias)} kcal estimadas</p>}
      {options.length ? <>
        <fieldset><legend>Opções da mesma refeição no seu plano</legend>{options.map(({ key, meal }) =>
          <label key={key}><input type="radio" name="fitgen-meal-swap" checked={source === key} disabled={swap.isPending} onChange={() => { setSource(key); swap.reset(); }} />{meal.nome} · {formatInt(meal.calorias)} kcal</label>)}</fieldset>
        {chosen && <OttoSurface items={[{ title: chosen.meal.nome, detail: chosen.meal.ingredientes?.join(' · ') }]}
          action={!swap.isPending ? { id: 'apply', label: 'Aplicar nesta refeição' } : undefined} onAction={(id) => { if (id === 'apply' && !swap.isPending) swap.mutate(); }} />}
      </> : <p>Não encontramos outra refeição desse tipo com os filtros escolhidos.</p>}
      {swap.isPending && <p role="status">Salvando a refeição…</p>}
      {swap.isSuccess && <p role="status">Refeição atualizada no plano.</p>}
      {!!swap.error && <p role="alert">{errorMessage(swap.error)}</p>}
    </>}
  </OttoCard>;
}

export function CoachTools({ request }: { request: CoachToolRequest }) {
  if (request.tool === 'adapt') return <AdaptWorkout request={request} />;
  if (request.tool === 'week') return <ReviewWeek request={request} />;
  return <AdjustMeal request={request} />;
}
