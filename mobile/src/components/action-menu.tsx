import * as Haptics from 'expo-haptics';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { useRef } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dialog, ListItem, type DialogHandle } from '@/components/ui';
import { tabBarClearance, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';

const FAB_SIZE = 58;
/** Extra bottom room for a tab page with a floating "+", so it never covers the last item. */
export const FAB_CLEARANCE = FAB_SIZE + Spacing.four;

/** Floating "+" in the bottom-right corner, above the native tab bar. */
export function FloatingAddButton({ onPress, label, hint, busy }: {
  onPress: () => void;
  label: string;
  hint?: string;
  busy?: boolean;
}) {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  return (
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
        bottom: tabBarClearance(insets.bottom) + Spacing.four,
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? Colors.voltStrong : Colors.volt,
        opacity: busy ? 0.6 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
        // The only floating element on the page, so the only one with a shadow.
        boxShadow: '0 6px 18px rgba(17, 18, 20, 0.22)',
      })}>
      <Plus size={28} strokeWidth={2.6} color={Colors.onVolt} />
    </Pressable>
  );
}

export type ActionMenuItem = {
  key: string;
  icon: LucideIcon;
  /** `volt` for the main action(s), `chip` for the rest. */
  tone?: 'volt' | 'chip';
  title: string;
  caption?: string;
  onPress: () => void;
};

/**
 * Bottom sheet of actions opened by the floating "+".
 * The chosen action runs only after the sheet is gone, so it can safely open another sheet.
 */
export function ActionMenu({ visible, title, items, onClose }: {
  visible: boolean;
  title: string;
  items: ActionMenuItem[];
  onClose: () => void;
}) {
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
      <View style={{ gap: Spacing.two }}>
        {items.map((item) => (
          <ListItem
            key={item.key}
            icon={item.icon}
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
