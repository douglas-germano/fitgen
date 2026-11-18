import { Check, Play } from 'lucide-react-native';
import { useRef } from 'react';
import { Pressable, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { KeyboardDoneBar, Stepper } from '@/components/stepper';
import { Badge, Button, Dialog, IconButton, LinkText, ProgressBar, Row, Text, type DialogHandle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import { repsLabel } from '@/lib/workout';
import type { Exercise } from '@/types/api';

export type SetEntry = { weight: string; reps: string; done: boolean };

const pad = (n: number) => String(n).padStart(2, '0');
export const clock = (s: number) =>
  s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

/** First number of a rep target ("8-12" → "8", "12" → "12"); empty when it isn't numeric ("até a falha"). */
const targetReps = (reps: string | undefined) => {
  const n = parseInt(reps ?? '', 10);
  return Number.isFinite(n) && n > 0 ? String(n) : '';
};

/** Untouched set grid of an exercise; the reps start at the plan's target. */
export const defaultSets = (ex: Exercise): SetEntry[] =>
  Array.from({ length: ex.sets }, () => ({ weight: '', reps: targetReps(ex.reps), done: false }));

/** kg × reps of the finished sets (empty weight = bodyweight = 0). */
export const volumeOf = (sets: SetEntry[]) =>
  sets.reduce((sum, s) => {
    if (!s.done) return sum;
    const weight = parseFloat(s.weight.replace(',', '.'));
    const reps = parseInt(s.reps, 10);
    return sum + (Number.isFinite(weight) ? weight : 0) * (Number.isFinite(reps) ? reps : 0);
  }, 0);

/** Countdown card with ±15 s and skip. Pinned by the caller so it never scrolls away. */
export function RestCard({ restLeft, restTotal, onAdjust, onSkip }: {
  restLeft: number;
  restTotal: number;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
}) {
  const Colors = useColors();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ gap: Spacing.three, padding: Spacing.four, borderRadius: Radius.md, borderCurve: 'continuous', backgroundColor: Colors.voltSoft }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="titleSm">Descansando</Text>
        <Text
          accessibilityLabel={`Descanso, faltam ${restLeft} segundos`}
          style={{ fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] }}>
          {clock(restLeft)}
        </Text>
      </Row>
      <ProgressBar value={restTotal ? (restLeft / restTotal) * 100 : 0} trackColor={Colors.surface} />
      <Row style={{ gap: Spacing.two }}>
        <Button variant="soft" size="sm" title="−15 s" onPress={() => onAdjust(-15)} style={{ flex: 1 }} />
        <Button variant="soft" size="sm" title="+15 s" onPress={() => onAdjust(15)} style={{ flex: 1 }} />
        <Button variant="inverse" size="sm" title="Pular" onPress={onSkip} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}

/**
 * The card that rises when an exercise is tapped. Before the workout starts it previews the planned sets
 * (and can start the workout); once started it logs sets with steppers and lets finished sets be corrected.
 */
export function SetsSheet({
  exercise,
  sets,
  started,
  editing,
  saving,
  starting,
  restLeft,
  restTotal,
  onChange,
  onEdit,
  onCompleteSet,
  onSaveEdit,
  onStart,
  onAdjustRest,
  onSkipRest,
  onClose,
}: {
  exercise: Exercise;
  sets: SetEntry[];
  started: boolean;
  editing: number | null;
  saving: boolean;
  starting: boolean;
  restLeft: number;
  restTotal: number;
  onChange: (setIndex: number, patch: Partial<SetEntry>) => void;
  onEdit: (setIndex: number | null) => void;
  onCompleteSet: () => void;
  onSaveEdit: () => void;
  onStart: () => void;
  onAdjustRest: (delta: number) => void;
  onSkipRest: () => void;
  onClose: () => void;
}) {
  const Colors = useColors();
  const sheet = useRef<DialogHandle>(null);
  const current = sets.findIndex((s) => !s.done);
  const exerciseDone = current === -1;
  const editingSet = started && editing !== null && sets[editing]?.done ? editing : null;
  /** The set whose numbers are on the steppers: the one being corrected, or the next one to do. */
  const focusIdx = !started ? -1 : editingSet ?? (exerciseDone ? -1 : current);
  const doneCount = sets.filter((s) => s.done).length;

  const primary = !started
    ? { title: 'Iniciar Treino', onPress: onStart, loading: starting }
    : editingSet !== null
      ? { title: `Salvar Série ${editingSet + 1}`, onPress: onSaveEdit, loading: saving }
      : !exerciseDone
        ? { title: `Concluir Série ${current + 1}`, onPress: onCompleteSet, loading: saving }
        : { title: 'Voltar à Lista', onPress: () => sheet.current?.dismiss(), loading: false };

  const description = [
    `${exercise.sets} séries · ${repsLabel(exercise.reps)} reps`,
    exercise.rest_seconds ? `descanso ${exercise.rest_seconds} s` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Dialog
      ref={sheet}
      sheet
      sheetSize="registration"
      visible
      onClose={onClose}
      title={exercise.name}
      description={description}
      footer={
        <View style={{ gap: Spacing.three }}>
          {started && restLeft > 0 && <RestCard restLeft={restLeft} restTotal={restTotal} onAdjust={onAdjustRest} onSkip={onSkipRest} />}
          <Button size="lg" title={primary.title} onPress={primary.onPress} loading={primary.loading} disabled={saving || starting} />
        </View>
      }>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: Spacing.two, flex: 1 }}>
          {exercise.muscle_group ? <Badge label={exercise.muscle_group} tone="chip" /> : null}
          {started && <Badge label={`${doneCount}/${sets.length} séries`} tone={exerciseDone ? 'soft' : 'chip'} />}
        </Row>
        {exercise.video_url ? (
          <IconButton icon={Play} variant="surface" size="lg" label="Ver vídeo do exercício" onPress={() => WebBrowser.openBrowserAsync(exercise.video_url!)} />
        ) : null}
      </Row>

      <View style={{ gap: Spacing.two }}>
        {sets.map((s, i) => {
          if (i === focusIdx) {
            const correcting = editingSet === i;
            return (
              <View key={i} style={{ gap: Spacing.three, padding: Spacing.four, borderRadius: Radius.md, borderCurve: 'continuous', backgroundColor: Colors.voltSoft }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="titleSm">{correcting ? `Corrigindo série ${i + 1}` : `Série ${i + 1} de ${sets.length}`}</Text>
                  {correcting && <LinkText title="Cancelar" onPress={() => onEdit(null)} />}
                </Row>
                <Stepper size="lg" label="Carga" suffix="kg" decimal step={2.5} value={s.weight} onChange={(weight) => onChange(i, { weight })} />
                <Stepper size="lg" label="Repetições" value={s.reps} onChange={(reps) => onChange(i, { reps })} />
              </View>
            );
          }
          const canEdit = started && s.done && !saving;
          return (
            <Pressable
              key={i}
              disabled={!canEdit}
              onPress={() => onEdit(i)}
              accessibilityRole={canEdit ? 'button' : undefined}
              accessibilityLabel={s.done ? `Série ${i + 1}: ${s.weight || 0} quilos por ${s.reps} repetições. Toque para corrigir` : `Série ${i + 1}, pendente`}
              style={({ pressed }) => ({
                minHeight: 48,
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                paddingHorizontal: Spacing.three,
                borderRadius: Radius.sm,
                backgroundColor: pressed ? Colors.line : Colors.surfaceChip,
              })}>
              <Text style={{ width: 24, fontSize: 16, fontWeight: '700', color: s.done ? Colors.ink : Colors.inkMuted }}>{i + 1}</Text>
              <Text style={{ flex: 1, fontSize: 16, fontVariant: ['tabular-nums'] }} muted={!s.done}>
                {s.done ? `${s.weight || 0} kg × ${s.reps}` : started ? 'Pendente' : `${repsLabel(exercise.reps)} reps`}
              </Text>
              {s.done ? <Check size={20} strokeWidth={3} color={Colors.voltInk} /> : null}
            </Pressable>
          );
        })}
      </View>

      {exercise.notes ? <Text variant="caption" style={{ fontSize: 12 }}>Observações: {exercise.notes}</Text> : null}
      <KeyboardDoneBar />
    </Dialog>
  );
}
