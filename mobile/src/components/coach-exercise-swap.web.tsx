import { A2uiSurface } from '@a2ui/react';
import { MessageProcessor } from '@a2ui/web_core';
import { basicCatalog } from '@a2ui/web_core/catalogs/basic/v1';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import { fontFor } from '@/constants/theme';
import { useActiveWorkoutPlan, useExerciseLibrary } from '@/hooks/queries';
import { api, errorMessage } from '@/lib/api';
import { muscleLabel } from '@/lib/exercise-library';
import { useColors } from '@/providers/theme';
import type { Exercise, LibraryExercise } from '@/types/api';

const surfaceId = 'exercise-swap';

function SwapOptions({ exercise, alternatives, planId, onSaved }: {
  exercise: Exercise;
  alternatives: LibraryExercise[];
  planId: string;
  onSaved: (name: string) => void;
}) {
  const queryClient = useQueryClient();
  const saving = useRef(false);
  const [status, setStatus] = useState('');
  const surface = useMemo(() => {
    const processor = new MessageProcessor([basicCatalog]);
    processor.processMessages([
      { version: '1.0', createSurface: { surfaceId, catalogId: basicCatalog.id } },
      {
        version: '1.0',
        updateComponents: {
          surfaceId,
          components: [
            { id: 'root', component: 'Column', children: ['alternatives', 'confirm'] },
            {
              id: 'alternatives',
              component: 'ChoicePicker',
              label: 'Alternativas da biblioteca',
              options: alternatives.map(({ id, name, equipment_needed }) => ({
                value: id,
                label: [name, equipment_needed.join(', ')].filter(Boolean).join(' · '),
              })),
              value: { '@path': '/selection' },
            },
            { id: 'confirmLabel', component: 'Text', text: 'Salvar troca na ficha' },
            {
              id: 'confirm',
              component: 'Button',
              variant: 'primary',
              child: 'confirmLabel',
              action: { event: { name: 'save_exercise_swap', context: { selection: { '@path': '/selection' } } } },
            },
          ],
        },
      },
      { version: '1.0', updateDataModel: { surfaceId, path: '/selection', value: [] } },
    ]);
    return processor.model.surfacesMap.get(surfaceId);
  }, [alternatives]);

  useEffect(() => {
    const subscription = surface?.onAction.subscribe(async ({ name, context }) => {
      if (name !== 'save_exercise_swap' || saving.current) return;
      const selection = context.selection;
      const replacement = alternatives.find(({ id }) => Array.isArray(selection) && selection.length === 1 && selection[0] === id);
      if (!replacement) {
        setStatus('Escolha uma alternativa para continuar.');
        return;
      }
      saving.current = true;
      setStatus('Salvando troca…');
      try {
        await api(`/workouts/exercises/${exercise.id}`, {
          method: 'PUT',
          body: {
            name: replacement.name,
            exercise_library_id: replacement.id,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_seconds: exercise.rest_seconds ?? 60,
            notes: exercise.notes ?? '',
          },
        });
        // Refresh on entry to Treino and immediately wherever the plan is already mounted.
        void queryClient.invalidateQueries({ queryKey: ['workout', planId] });
        void queryClient.invalidateQueries({ queryKey: ['workouts'] });
        onSaved(replacement.name);
      } catch (error) {
        setStatus(errorMessage(error));
      } finally {
        saving.current = false;
      }
    });
    return () => subscription?.unsubscribe();
  }, [alternatives, exercise, onSaved, planId, queryClient, surface]);

  return surface ? (
    <>
      <A2uiSurface surface={surface} />
      <div role="status">{status}</div>
    </>
  ) : <p role="alert">Não foi possível carregar as alternativas.</p>;
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}

export function CoachExerciseSwap() {
  const colors = useColors();
  const { plan, isLoading, error, refetch } = useActiveWorkoutPlan();
  const library = useExerciseLibrary();
  const [dayId, setDayId] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [saved, setSaved] = useState('');
  const days = plan?.days ?? [];
  const day = days.find(({ id }) => id === dayId) ?? days[0];
  const exercise = day?.exercises.find(({ id }) => id === exerciseId);

  const alternatives = useMemo(() => {
    if (!day || !exercise || !library.data) return [];
    const source = library.data.find(({ id }) => id === exercise.exercise_library_id)
      ?? library.data.find(({ name }) => normalize(name) === normalize(exercise.name));
    const group = source?.muscle_groups[0] ?? exercise.muscle_group;
    if (!group) return [];
    const primary = normalize(muscleLabel(group));
    const usedIds = new Set(day.exercises.map(({ exercise_library_id }) => exercise_library_id));
    const usedNames = new Set(day.exercises.map(({ name }) => normalize(name)));
    return library.data.filter((item) =>
      item.category === (source?.category ?? 'strength') &&
      !!item.muscle_groups[0] &&
      normalize(muscleLabel(item.muscle_groups[0])) === primary &&
      !usedIds.has(item.id) && !usedNames.has(normalize(item.name)),
    ).slice(0, 6);
  }, [day, exercise, library.data]);

  const style = {
    background: colors.surfaceSunken,
    color: colors.ink,
    borderRadius: 20,
    padding: 16,
    fontFamily: fontFor(400),
    display: 'grid',
    gap: 12,
    '--a2ui-color-primary': colors.volt,
    '--a2ui-color-primary-hover': colors.volt,
    '--a2ui-color-on-primary': colors.onVolt,
    '--a2ui-color-on-background': colors.ink,
    '--a2ui-color-on-surface': colors.ink,
    '--a2ui-color-border': colors.line,
    '--a2ui-color-on-input': colors.ink,
    '--a2ui-color-input': colors.surface,
    '--a2ui-button-border-radius': '24px',
  } as CSSProperties;
  const selectStyle: CSSProperties = {
    display: 'block', boxSizing: 'border-box', width: '100%', marginTop: 6, padding: 10,
    font: 'inherit', color: colors.ink, background: colors.surface, border: `1px solid ${colors.line}`, borderRadius: 10,
  };

  return (
    <section aria-label="Trocar exercício na ficha" style={style}>
      <strong>Trocar exercício na ficha</strong>
      {saved ? <div role="status">{saved} foi salvo na sua ficha.</div>
        : error || library.error ? (
          <>
            <div role="alert">{errorMessage(error ?? library.error)}</div>
            <button type="button" onClick={() => { void refetch(); void library.refetch(); }}>Tentar novamente</button>
          </>
        ) : isLoading || library.isLoading ? <div role="status">Carregando sua ficha e a biblioteca…</div>
          : !plan || !day ? <div>Ative uma ficha com treinos para trocar um exercício.</div>
            : (
              <>
                <label>
                  Treino
                  <select style={selectStyle} value={day.id} onChange={(event) => {
                    setDayId(event.target.value);
                    setExerciseId('');
                  }}>
                    {days.map((item) => <option key={item.id} value={item.id}>{item.name || item.day_of_week}</option>)}
                  </select>
                </label>
                <label>
                  Exercício atual
                  <select style={selectStyle} value={exercise?.id ?? ''} onChange={(event) => setExerciseId(event.target.value)}>
                    <option value="">Selecione um exercício</option>
                    {day.exercises.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                {exercise && (alternatives.length ? (
                  <SwapOptions key={exercise.id} exercise={exercise} alternatives={alternatives} planId={plan.id} onSaved={setSaved} />
                ) : <div>Nenhuma alternativa do mesmo grupo muscular foi encontrada para este exercício.</div>)}
              </>
            )}
    </section>
  );
}
