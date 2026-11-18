import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';

export function ChoiceField<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string }[];
  value: T | T[];
  onChange: (value: T) => void;
}) {
  const Colors = useColors();
  return (
    <View style={{ gap: Spacing.two }}>
      <Text variant="label">{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {options.map((option) => {
          const selected = Array.isArray(value) ? value.includes(option.value) : value === option.value;
          return (
            <Pressable key={option.value} onPress={() => onChange(option.value)} accessibilityRole="button" accessibilityState={{ selected }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: selected ? (pressed ? Colors.voltStrong : Colors.volt) : Colors.surfaceChip })}>
              {selected && <Check size={14} color={Colors.onVolt} />}
              <Text variant="label" color={selected ? Colors.onVolt : Colors.ink}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
