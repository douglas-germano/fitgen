import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import { InputAccessoryView, Keyboard, Platform, Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { IconButton, Row, Text } from '@/components/ui';
import { fontFor, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';

/** Shared id so every numeric field can show the iOS "Pronto" accessory above the keyboard. */
export const KEYBOARD_ACCESSORY_ID = 'fitgen-number-accessory';

const parse = (value: string) => {
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** 62.5 → "62,5" (pt-BR decimal comma, no float noise). */
const format = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/**
 * Numeric field with big − / + buttons, for sweaty hands in the gym. The value stays a string so the
 * field can be empty or mid-edit; typing still works for exact numbers.
 */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  suffix,
  size = 'md',
  decimal = false,
  containerStyle,
  ...rest
}: Omit<TextInputProps, 'value' | 'onChange' | 'onChangeText' | 'style'> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Unit shown after the value ("kg", "s"). */
  suffix?: string;
  /** `lg` = player (52 px targets), `md` = forms (44 px targets). */
  size?: 'md' | 'lg';
  /** Allow a decimal separator (weights). */
  decimal?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const Colors = useColors();
  const nudge = (direction: 1 | -1) => {
    const next = Math.min(max ?? Infinity, Math.max(min, parse(value) + direction * step));
    Haptics.selectionAsync();
    onChange(format(next));
  };
  const big = size === 'lg';
  const dim = big ? 52 : 44;

  return (
    <View style={[{ gap: Spacing.two, flex: 1 }, containerStyle]}>
      <Text variant="label" muted style={{ textAlign: 'center' }}>
        {label}
      </Text>
      <Row style={{ gap: Spacing.two }}>
        <IconButton icon={Minus} label={`Diminuir ${label.toLowerCase()}`} size={big ? 'xl' : 'lg'} onPress={() => nudge(-1)} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ height: dim, borderRadius: Radius.full, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <TextInput
              value={value}
              onChangeText={(t) => onChange(decimal ? t.replace(/[^0-9,.]/g, '') : t.replace(/[^0-9]/g, ''))}
              keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
              inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={Colors.inkMuted}
              selectionColor={Colors.ink}
              cursorColor={Colors.ink}
              accessibilityLabel={label}
              style={{
                minWidth: 0,
                flexShrink: 1,
                height: dim,
                textAlign: 'center',
                color: Colors.ink,
                fontSize: big ? 24 : 17,
                fontFamily: fontFor(700),
                fontVariant: ['tabular-nums'],
                paddingHorizontal: 0,
              }}
              {...rest}
            />
            {suffix ? (
              <Text variant="label" muted style={{ marginLeft: 4, marginRight: Spacing.two }}>
                {suffix}
              </Text>
            ) : null}
          </View>
        </View>
        <IconButton icon={Plus} label={`Aumentar ${label.toLowerCase()}`} size={big ? 'xl' : 'lg'} onPress={() => nudge(1)} />
      </Row>
    </View>
  );
}

/** iOS number pads have no return key: this bar adds a "Pronto" button above the keyboard. Mount once per screen. */
export function KeyboardDoneBar() {
  const Colors = useColors();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_ACCESSORY_ID}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: Colors.surfaceChip, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two }}>
        <Pressable onPress={Keyboard.dismiss} accessibilityRole="button" accessibilityLabel="Fechar teclado" hitSlop={8} style={{ paddingVertical: Spacing.two, paddingHorizontal: Spacing.three }}>
          <Text variant="titleSm" color={Colors.voltInk}>Pronto</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
