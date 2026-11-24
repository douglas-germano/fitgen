import { A2uiSurface, createComponentImplementation } from '@a2ui/react';
import { Catalog, MessageProcessor } from '@a2ui/web_core';
import { A2uiColumn, A2uiText, ButtonApi, ChoicePickerApi, basicCatalog } from '@a2ui/web_core/catalogs/basic/v1';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, ArrowRight, Check, ChevronDown, Dumbbell } from 'lucide-react-native';
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';

import { fontFor } from '@/constants/theme';
import { useActiveWorkoutPlan, useExerciseLibrary } from '@/hooks/queries';
import { api, errorMessage } from '@/lib/api';
import { muscleLabel } from '@/lib/exercise-library';
import { useAppTheme } from '@/providers/theme';
import type { Exercise, LibraryExercise } from '@/types/api';

import './coach-exercise-swap.css';

const surfaceId = 'exercise-swap';

const AlternativeCards = createComponentImplementation(ChoicePickerApi, ({ props }) => {
  const groupId = useId();
  return (
    <fieldset className="fitgen-swap-options">
      <legend>{props.label}</legend>
      {props.options.map(({ value, label }) => {
        const [name, equipment] = (label ?? '').split('\n', 2);
        const selected = props.value?.includes(value);
        return (
          <label className="fitgen-swap-option" key={value}>
            <input type="radio" name={groupId} checked={selected ?? false} onChange={() => props.setValue([value])} />
            <span className="fitgen-swap-option-icon" aria-hidden><Dumbbell size={19} color="currentColor" /></span>
            <span className="fitgen-swap-option-copy">
              <strong>{name}</strong>
              {equipment && <small>{equipment}</small>}
            </span>
            <span className="fitgen-swap-option-indicator" aria-hidden>{selected && <Check size={13} color="currentColor" />}</span>
          </label>
        );
      })}
    </fieldset>
  );
});

const SaveSwap = createComponentImplementation(ButtonApi, ({ props, buildChild }) => (
  <button className="fitgen-swap-save" type="button" disabled={!props.isValid} onClick={() => { void props.action(); }}>
    {props.child && buildChild(props.child)}
    <span aria-hidden><ArrowRight size={18} color="currentColor" /></span>
  </button>
));

const swapCatalog = new Catalog(
  'https://fitgen.pro/a2ui/coach-exercise-swap/v1',
  '1.0',
  [A2uiColumn, A2uiText, AlternativeCards, SaveSwap],
  [...basicCatalog.functions.values()],
);

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
    const processor = new MessageProcessor([swapCatalog]);
    processor.processMessages([
      { version: '1.0', createSurface: { surfaceId, catalogId: swapCatalog.id } },
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
                label: [name, equipment_needed.join(', ')].filter(Boolean).join('\n'),
              })),
              value: { '@path': '/selection' },
            },
            { id: 'confirmLabel', component: 'Text', text: 'Salvar troca na ficha' },
            {
              id: 'confirm',
              component: 'Button',
              variant: 'primary',
              '@checks': [{
                condition: { '@call': 'required', args: { value: { '@path': '/selection' } } },
                message: 'Escolha uma alternativa para continuar.',
              }],
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
      <div role="status" style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--swap-muted)' }}>{status}</div>
    </>
  ) : <p role="alert">Não foi possível carregar as alternativas.</p>;
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
}

export function CoachExerciseSwap() {
  const { colors, scheme } = useAppTheme();
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
    border: `1px solid ${colors.line}`,
    borderRadius: 24,
    padding: 'clamp(14px, 4vw, 22px)',
    width: '100%',
    maxWidth: 540,
    boxSizing: 'border-box',
    fontFamily: fontFor(400),
    fontSize: 14,
    lineHeight: 1.5,
    colorScheme: scheme,
    display: 'grid',
    gap: 16,
    '--swap-muted': colors.inkMuted,
    '--swap-surface': colors.surface,
    '--swap-line': colors.line,
    '--swap-focus': colors.focus,
    '--swap-accent': colors.volt,
    '--swap-accent-hover': colors.voltStrong,
    '--swap-accent-ink': colors.onVolt,
    '--swap-accent-soft': colors.voltSoft,
    '--swap-accent-text': colors.voltInk,
    '--swap-chip': colors.surfaceChip,
    '--swap-semibold': fontFor(600),
    '--a2ui-text-color-text': 'inherit',
    '--a2ui-column-gap': '16px',
  } as CSSProperties;
  const labelStyle: CSSProperties = { display: 'grid', gap: 6, fontFamily: fontFor(600), fontSize: 13 };
  const selectStyle: CSSProperties = {
    display: 'block', boxSizing: 'border-box', width: '100%', minHeight: 48, padding: '10px 34px 10px 12px',
    font: 'inherit', color: colors.ink, background: colors.surface, border: `1px solid ${colors.line}`,
    borderRadius: 12, appearance: 'none', outlineOffset: 2,
  };
  const chevron = (
    <span aria-hidden style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
      <ChevronDown color={colors.inkMuted} size={16} />
    </span>
  );

  return (
    <section aria-label="Trocar exercício na ficha" style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span aria-hidden style={{ display: 'grid', placeItems: 'center', flexShrink: 0, width: 42, height: 42, borderRadius: 14, background: colors.voltSoft }}>
          {saved ? <Check size={20} color={colors.voltInk} /> : <ArrowLeftRight size={20} color={colors.voltInk} />}
        </span>
        <h2 style={{ margin: 0, fontFamily: fontFor(700), fontSize: 18, lineHeight: 1.3 }}>
          {saved ? 'Ficha atualizada' : 'Trocar exercício'}
        </h2>
      </div>
      {saved ? <div role="status" style={{ color: colors.inkMuted }}>{saved} foi salvo na sua ficha.</div>
        : error || library.error ? (
          <>
            <div role="alert">{errorMessage(error ?? library.error)}</div>
            <button type="button" onClick={() => { void refetch(); void library.refetch(); }}>Tentar novamente</button>
          </>
        ) : isLoading || library.isLoading ? <div role="status">Carregando sua ficha e a biblioteca…</div>
          : !plan || !day ? <div>Ative uma ficha com treinos para trocar um exercício.</div>
            : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 156px), 1fr))', gap: 12 }}>
                  <label style={labelStyle}>
                    Treino
                    <span style={{ position: 'relative' }}>
                      <select style={selectStyle} value={day.id} onChange={(event) => {
                        setDayId(event.target.value);
                        setExerciseId('');
                        }}>
                        {days.map((item) => <option key={item.id} value={item.id}>{item.name || item.day_of_week}</option>)}
                      </select>
                      {chevron}
                    </span>
                  </label>
                  <label style={labelStyle}>
                    Exercício atual
                    <span style={{ position: 'relative' }}>
                      <select style={selectStyle} value={exercise?.id ?? ''} onChange={(event) => setExerciseId(event.target.value)}>
                        <option value="">Selecione um exercício</option>
                        {day.exercises.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                      {chevron}
                    </span>
                  </label>
                </div>
                {exercise && (
                  <div style={{ color: colors.inkMuted, fontSize: 13, borderTop: `1px solid ${colors.line}`, paddingTop: 12 }}>
                    {exercise.sets} séries · {exercise.reps} repetições · {exercise.rest_seconds ?? 60} s de descanso
                  </div>
                )}
                {exercise && (alternatives.length ? (
                  <SwapOptions key={exercise.id} exercise={exercise} alternatives={alternatives} planId={plan.id} onSaved={setSaved} />
                ) : <div>Nenhuma alternativa do mesmo grupo muscular foi encontrada para este exercício.</div>)}
              </>
            )}
    </section>
  );
}
