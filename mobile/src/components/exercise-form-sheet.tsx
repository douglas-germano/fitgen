import { AppAlert } from '@/lib/feedback';
import { ArrowLeftRight, BookOpen } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { KeyboardDoneBar, Stepper } from '@/components/stepper';
import { Button, Dialog, Input, ListItem, Row, Text, type DialogHandle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useExerciseLibrary } from '@/hooks/queries';
import { exerciseCaption, filterLibrary } from '@/lib/exercise-library';
import { api, errorMessage } from '@/lib/api';
import { decimal } from '@/lib/forms';
import type { Exercise } from '@/types/api';

/** Add / edit an exercise — bottom sheet with steppers for sets and rest. */
export function ExerciseFormSheet({
  dayId,
  exercise,
  onClose,
  onSaved,
}: {
  dayId: string;
  exercise: Exercise | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const sheet = useRef<DialogHandle>(null);
  const [form, setForm] = useState({
    name: exercise?.name ?? '',
    sets: String(exercise?.sets ?? 3),
    reps: exercise?.reps ?? '12',
    rest: String(exercise?.rest_seconds ?? 60),
    notes: exercise?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [libraryId, setLibraryId] = useState<string | null>(exercise?.exercise_library_id ?? null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const library = useExerciseLibrary();
  const suggestions = useMemo(
    () => {
      if (exercise) return picking ? filterLibrary(library.data ?? [], { query }).slice(0, 8) : [];
      return libraryId || form.name.trim().length < 2 ? [] : filterLibrary(library.data ?? [], { query: form.name }).slice(0, 4);
    },
    [exercise, picking, query, library.data, form.name, libraryId],
  );

  const save = async () => {
    if (!form.name.trim() || saving) return;
    const sets = decimal(form.sets), rest = decimal(form.rest);
    if (!sets || !Number.isInteger(sets) || sets > 50 || rest === undefined || !Number.isInteger(rest) || rest > 3600 || !form.reps.trim()) {
      AppAlert.alert('Revise o exercício', 'Informe de 1 a 50 séries, as repetições e um descanso de 0 a 3600 segundos.'); return;
    }
    const body = {
      name: form.name.trim(),
      sets,
      reps: form.reps,
      rest_seconds: rest,
      notes: form.notes,
      ...(libraryId && libraryId !== exercise?.exercise_library_id ? { exercise_library_id: libraryId } : {}),
    };
    setSaving(true);
    try {
      if (exercise) {
        await api(`/workouts/exercises/${exercise.id}`, { method: 'PUT', body });
      } else {
        await api(`/workouts/day/${dayId}/exercises`, { method: 'POST', body });
      }
      onSaved();
      sheet.current?.dismiss();
    } catch (e) {
      AppAlert.alert('Erro ao salvar exercício.', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      ref={sheet}
      sheet
      sheetSize="registration"
      visible
      onClose={onClose}
      title={exercise ? 'Editar Exercício' : 'Adicionar Exercício'}
      footer={picking ? undefined : <Button size="lg" title={exercise ? 'Salvar Alterações' : 'Adicionar Exercício'} onPress={save} loading={saving} disabled={!form.name.trim()} />}>
      <View style={{ gap: Spacing.two }}>
        {exercise ? (
          <>
            <Text variant="titleSm">{form.name}</Text>
            {picking ? (
              <>
                <Input label="Buscar na biblioteca" placeholder="Nome, músculo ou equipamento" value={query} onChangeText={setQuery} />
                {library.isLoading ? <Text muted>Carregando exercícios…</Text> : null}
                {library.error && !library.data ? <Button variant="soft" title="Tentar novamente" onPress={() => library.refetch()} /> : null}
                {!library.isLoading && !library.error && suggestions.length === 0 ? <Text muted>Nenhum exercício encontrado.</Text> : null}
              </>
            ) : <Button variant="soft" icon={ArrowLeftRight} title="Trocar exercício" onPress={() => { setQuery(''); setPicking(true); }} />}
          </>
        ) : (
          <Input label="Nome do Exercício" placeholder="Ex: Supino reto" value={form.name}
            onChangeText={(name) => { setForm({ ...form, name }); setLibraryId(null); }} autoCapitalize="sentences" />
        )}
        {suggestions.map((ex) => (
          <ListItem
            key={ex.id}
            icon={BookOpen}
            iconTone="chip"
            title={ex.name}
            caption={exerciseCaption(ex)}
            onPress={() => { setForm({ ...form, name: ex.name }); setLibraryId(ex.id); setPicking(false); }}
          />
        ))}
      </View>
      {picking ? <Button variant="soft" title="Voltar para edição" onPress={() => setPicking(false)} /> : (
      <>
      <Row style={{ alignItems: 'flex-start' }}>
        <Stepper label="Séries" value={form.sets} min={1} max={50} onChange={(sets) => setForm({ ...form, sets })} />
      </Row>
      <Input label="Repetições" placeholder="Ex: 12 ou 8-12" value={form.reps} onChangeText={(reps) => setForm({ ...form, reps })} />
      <Row style={{ alignItems: 'flex-start' }}>
        <Stepper label="Descanso" value={form.rest} min={0} max={3600} step={15} suffix="s" onChange={(rest) => setForm({ ...form, rest })} />
      </Row>
      <Input label="Observações" placeholder="Opcional" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} />
      </>
      )}
      <KeyboardDoneBar />
    </Dialog>
  );
}
