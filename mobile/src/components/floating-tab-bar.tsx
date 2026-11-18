import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { FloatingTabBar as Bar } from '@/constants/theme';
import { useColors } from '@/providers/theme';

export type FloatingTab = { name: string; title: string; Icon: LucideIcon };

/**
 * Floating capsule tab bar (icons only), modelled on the iOS 26 tab bar.
 * Used on Android, where the native tab bar is a full-width Material bar.
 * It floats over the content, so tab screens reserve `tabBarClearance()` at the bottom.
 */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets, tabs }: BottomTabBarProps & { tabs: FloatingTab[] }) {
  const Colors = useColors();
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: Bar.side + insets.left,
        right: Bar.side + insets.right,
        bottom: insets.bottom + Bar.gap,
      }}>
      <View
        role="tablist"
        style={{
          height: Bar.height,
          flexDirection: 'row',
          alignItems: 'center',
          padding: Bar.padding,
          borderRadius: Bar.height / 2,
          backgroundColor: Colors.surface + 'F2',
          borderWidth: 1,
          borderColor: Colors.line,
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)',
        }}>
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const tab = tabs.find(t => t.name === route.name);
          const { options } = descriptors[route.key];
          const title = tab?.title ?? options.title ?? route.name;
          const Icon = tab?.Icon;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              Haptics.selectionAsync();
              navigateToTab(route.key);
            }
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              role="tab"
              accessibilityLabel={options.tabBarAccessibilityLabel ?? title}
              accessibilityState={{ selected: focused }}
              android_ripple={{ color: Colors.surfaceChip, borderless: false, foreground: true }}
              style={({ pressed }) => ({
                flex: 1,
                height: '100%',
                borderRadius: (Bar.height - Bar.padding * 2) / 2,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? Colors.surfaceChip : 'transparent',
                opacity: pressed && !focused ? 0.7 : 1,
              })}>
              {Icon && <Icon size={24} color={focused ? Colors.ink : Colors.inkMuted} strokeWidth={focused ? 2.4 : 1.9} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
