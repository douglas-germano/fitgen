import { A2uiSurface } from '@a2ui/react';
import { MessageProcessor } from '@a2ui/web_core';
import { basicCatalog } from '@a2ui/web_core/catalogs/basic/v1';
import { useEffect, useState } from 'react';

import { useColors } from '@/providers/theme';

const surfaceId = 'exercise-swap';
const options = [
  { value: 'goblet-squat', label: 'Agachamento com halter · 3 × 12' },
  { value: 'split-squat', label: 'Agachamento búlgaro · 3 × 10 por lado' },
];

function ExerciseSwap() {
  const [feedback, setFeedback] = useState('');
  const [surface] = useState(() => {
    const processor = new MessageProcessor([basicCatalog]);
    processor.processMessages([
      { version: '1.0', createSurface: { surfaceId, catalogId: basicCatalog.id } },
      {
        version: '1.0',
        updateComponents: {
          surfaceId,
          components: [
            { id: 'root', component: 'Column', children: ['prompt', 'alternatives', 'confirm'] },
            { id: 'prompt', component: 'Text', text: 'O leg press está ocupado. Qual exercício você quer usar?' },
            {
              id: 'alternatives',
              component: 'ChoicePicker',
              label: 'Alternativas ao leg press',
              options,
              value: { '@path': '/selection' },
            },
            { id: 'confirmLabel', component: 'Text', text: 'Usar nesta sessão' },
            {
              id: 'confirm',
              component: 'Button',
              variant: 'primary',
              child: 'confirmLabel',
              action: { event: { name: 'confirm_exercise_swap', context: { selection: { '@path': '/selection' } } } },
            },
          ],
        },
      },
      { version: '1.0', updateDataModel: { surfaceId, path: '/selection', value: [] } },
    ]);
    return processor.model.surfacesMap.get(surfaceId);
  });

  useEffect(() => {
    const subscription = surface?.onAction.subscribe(({ name, context }) => {
      if (name !== 'confirm_exercise_swap') return;
      const selection = context.selection;
      const exercise = options.find(({ value }) => Array.isArray(selection) && selection.includes(value));
      setFeedback(exercise ? `Troca simulada: ${exercise.label}.` : 'Escolha um exercício para continuar.');
    });
    return () => subscription?.unsubscribe();
  }, [surface]);

  if (!surface) return <p role="alert">Não foi possível carregar a demonstração.</p>;

  return (
    <>
      <A2uiSurface surface={surface} />
      <div role="status">{feedback}</div>
    </>
  );
}

export function CoachA2uiDemo() {
  const colors = useColors();

  if (!__DEV__ && process.env.EXPO_PUBLIC_COACH_A2UI_DEMO !== '1') return null;

  return (
    <details style={{ color: colors.ink, backgroundColor: colors.surfaceSunken, borderRadius: 16, padding: 12 }}>
      <summary style={{ cursor: 'pointer' }}>Testar troca de exercício com A2UI</summary>
      <p style={{ color: colors.inkMuted }}>Demonstração com dados fictícios. A seleção vale apenas nesta simulação.</p>
      <ExerciseSwap />
    </details>
  );
}
