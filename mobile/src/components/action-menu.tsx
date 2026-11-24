import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Plus, type LucideIcon } from 'lucide-react-native';
import { useRef, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OttoAvatar } from '@/components/otto';
import { Dialog, ListItem, Text, type DialogHandle } from '@/components/ui';
import { tabBarClearance, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';

const FAB_SIZE = 58;
const OTTO_SIZE = 50;
/** Background of the Otto mark artwork, so the clipped circle has no seams. */
const OTTO_INK = '#0e0e12';
const FAB_GAP = Spacing.three;
/** Extra bottom room for a page with the floating "+" and Otto, so they never cover the last item. */
export const FAB_CLEARANCE = FAB_SIZE + FAB_GAP + OTTO_SIZE + Spacing.four;

/** Floating "+" in the bottom-right corner, above the native tab bar, with the Otto chat button above it. */
export function FloatingAddButton({ onPress, label, hint, busy, tone = 'volt', otto = true }: {
  onPress: () => void;
  label: string;
  hint?: string;
  busy?: boolean;
  tone?: 'volt' | 'neutral';
  /** Show the "talk to Otto" button above the "+". */
  otto?: boolean;
}) {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const bottom = tabBarClearance(insets.bottom) + Spacing.four;
  return (
    <>
    {otto && (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/coach');
        }}
        accessibilityRole="button"
        accessibilityLabel="Conversar com o Otto"
        accessibilityHint="Abre o chat com o Otto, seu coach de treino e dieta"
        hitSlop={6}
        style={({ pressed }) => ({
          position: 'absolute',
          right: Spacing.five + (FAB_SIZE - OTTO_SIZE) / 2,
          bottom: bottom + FAB_SIZE + FAB_GAP,
          width: OTTO_SIZE,
          height: OTTO_SIZE,
          borderRadius: OTTO_SIZE / 2,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          boxShadow: '0 6px 16px rgba(17, 18, 20, 0.26)',
        })}>
        {({ pressed }) => (
          // The Otto mark is a dark rounded tile; clipping it to a circle of the same dark makes the button the mark itself.
          <View style={[styles.otto, { opacity: pressed ? 0.85 : 1 }]}>
            <OttoAvatar size={OTTO_SIZE * 0.86} />
          </View>
        )}
      </Pressable>
    )}
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ busy: !!busy, disabled: !!busy }}
      hitSlop={8}
      style={({ pressed }) => ({
        position: 'absolute',
        right: Spacing.five,
        bottom,
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone === 'neutral'
          ? (pressed ? Colors.surfaceChip : Colors.surface)
          : (pressed ? Colors.voltStrong : Colors.volt),
        borderWidth: tone === 'neutral' ? StyleSheet.hairlineWidth : 0,
        borderColor: Colors.line,
        opacity: busy ? 0.6 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
        boxShadow: tone === 'neutral' ? '0 3px 12px rgba(17, 18, 20, 0.14)' : '0 6px 18px rgba(17, 18, 20, 0.22)',
      })}>
      <Plus size={28} strokeWidth={2.6} color={tone === 'neutral' ? Colors.ink : Colors.onVolt} />
    </Pressable>
    </>
  );
}

export type ActionMenuItem = {
  key: string;
  /** `volt` for the main action(s), `chip` for the rest. */
  tone?: 'volt' | 'chip';
  title: string;
  caption?: string;
  onPress: () => void;
} & ({ icon: LucideIcon; leading?: never } | { leading: ReactNode; icon?: never });

/**
 * Bottom sheet of actions opened by the floating "+".
 * The chosen action runs only after the sheet is gone, so it can safely open another sheet.
 */
export function ActionMenu({ visible, title, items, onClose, compact = false }: {
  visible: boolean;
  title: string;
  items: ActionMenuItem[];
  onClose: () => void;
  compact?: boolean;
}) {
  const Colors = useColors();
  const sheet = useRef<DialogHandle>(null);
  const pending = useRef<(() => void) | null>(null);

  const run = () => {
    const action = pending.current;
    pending.current = null;
    action?.();
  };
  const choose = (item: ActionMenuItem) => {
    pending.current = item.onPress;
    sheet.current?.dismiss();
  };

  return (
    <Dialog
      ref={sheet}
      sheet
      visible={visible}
      title={title}
      onClose={() => {
        onClose();
        // iOS can't present the next modal until this one is gone: wait for onDismissed there.
        if (Platform.OS !== 'ios') run();
      }}
      onDismissed={run}>
      <View style={compact ? undefined : { gap: Spacing.two }}>
        {items.map((item, index) => compact ? (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            onPress={() => choose(item)}
            style={({ pressed }) => ({
              minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: Spacing.three,
              paddingVertical: Spacing.two, paddingHorizontal: Spacing.one,
              borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth, borderColor: Colors.line,
              backgroundColor: pressed ? Colors.surfaceSunken : Colors.surface,
            })}>
            {item.leading ?? (item.icon && <item.icon size={21} color={item.tone === 'volt' ? Colors.voltInk : Colors.inkMuted} />)}
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="titleMd">{item.title}</Text>
              {item.caption && <Text variant="label" muted>{item.caption}</Text>}
            </View>
            <ChevronRight size={17} color={Colors.inkMuted} />
          </Pressable>
        ) : (
          <ListItem
            key={item.key}
            icon={item.icon}
            leading={item.leading}
            iconTone={item.tone ?? 'chip'}
            title={item.title}
            caption={item.caption}
            onPress={() => choose(item)}
            arrow
          />
        ))}
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  otto: {
    flex: 1,
    borderRadius: OTTO_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OTTO_INK,
    // Thin volt ring: ties it to the "+" and keeps the dark coin visible on the dark theme.
    borderWidth: 1.5,
    borderColor: 'rgba(161, 236, 3, 0.55)',
  },
});
