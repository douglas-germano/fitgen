import { CircleAlert, Lightbulb } from 'lucide-react-native';
import { View } from 'react-native';

import { HeaderCard } from '@/components/grouped';
import { Row, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import type { LibraryExercise } from '@/types/api';

/** How to do an exercise: numbered steps, tips and common mistakes. */
export function ExerciseGuide({ exercise, compact = false }: { exercise: LibraryExercise; compact?: boolean }) {
  const Colors = useColors();
  return (
    <View style={{ gap: compact ? Spacing.three : Spacing.four }}>
      {exercise.instructions.length > 0 && (
        <HeaderCard title="Como fazer">
          <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
            {exercise.instructions.map((step, i) => (
              <Row key={i} style={{ alignItems: 'flex-start', gap: Spacing.three }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.volt, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700' }} color={Colors.onVolt}>{i + 1}</Text>
                </View>
                <Text style={{ flex: 1 }}>{step}</Text>
              </Row>
            ))}
          </View>
        </HeaderCard>
      )}
      <GuideList icon={Lightbulb} title="Dicas" items={exercise.tips} />
      <GuideList icon={CircleAlert} title="Erros comuns" items={exercise.common_mistakes} />
    </View>
  );
}

function GuideList({ icon: Icon, title, items }: { icon: typeof Lightbulb; title: string; items: string[] }) {
  const Colors = useColors();
  if (!items.length) return null;
  return (
    <HeaderCard title={title}>
      <View style={{ gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
        {items.map((item, i) => (
          <Row key={i} style={{ alignItems: 'flex-start', gap: Spacing.three }}>
            <View style={{ width: 24, alignItems: 'center', paddingTop: 2 }}>
              <Icon size={16} color={Colors.inkMuted} />
            </View>
            <Text muted style={{ flex: 1 }}>{item}</Text>
          </Row>
        ))}
      </View>
    </HeaderCard>
  );
}
