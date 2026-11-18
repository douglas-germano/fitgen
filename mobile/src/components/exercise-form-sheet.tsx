import { AppAlert } from '@/lib/feedback';
import { useRef, useState } from 'react';

import { KeyboardDoneBar, Stepper } from '@/components/stepper';
import { Button, Dialog, Input, Row, type DialogHandle } from '@/components/ui';
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
      footer={<Button size="lg" title={exercise ? 'Salvar Alterações' : 'Adicionar Exercício'} onPress={save} loading={saving} disabled={!form.name.trim()} />}>
      <Input label="Nome do Exercício" placeholder="Ex: Supino reto" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoCapitalize="sentences" />
      <Row style={{ alignItems: 'flex-start' }}>
        <Stepper label="Séries" value={form.sets} min={1} max={50} onChange={(sets) => setForm({ ...form, sets })} />
      </Row>
      <Input label="Repetições" placeholder="Ex: 12 ou 8-12" value={form.reps} onChangeText={(reps) => setForm({ ...form, reps })} />
      <Row style={{ alignItems: 'flex-start' }}>
        <Stepper label="Descanso" value={form.rest} min={0} max={3600} step={15} suffix="s" onChange={(rest) => setForm({ ...form, rest })} />
      </Row>
      <Input label="Observações" placeholder="Opcional" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} />
      <KeyboardDoneBar />
    </Dialog>
  );
}
