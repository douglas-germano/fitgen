import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { PlatformPressable, useLinkBuilder } from 'expo-router/react-navigation';
import type { LucideIcon } from 'lucide-react-native';
import { Platform, View } from 'react-native';

import { Text } from '@/components/ui';
import { alpha, AppTabBar as Bar } from '@/constants/theme';
import { useColors } from '@/providers/theme';

export type AppTab = { name: string; title: string; Icon: LucideIcon };

export function AppTabBar({ state, descriptors, emitter, navigateToTab, insets, tabs }: BottomTabBarProps & { tabs: AppTab[] }) {
  const Colors = useColors();
  const { buildHref } = useLinkBuilder();
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: insets.bottom,
        backgroundColor: Colors.surface,
      }}>
      <LinearGradient
        pointerEvents="none"
        colors={[alpha(Colors.surface, 0), Colors.surface]}
        style={{ position: 'absolute', left: 0, right: 0, top: -Bar.fadeHeight, height: Bar.fadeHeight }}
      />
      <View style={{ paddingLeft: insets.left, paddingRight: insets.right }}>
        <View role="tablist" style={{ height: Bar.height, flexDirection: 'row', width: '100%', maxWidth: 600, alignSelf: 'center' }}>
          {state.routes.map((route, index) => {
            const focused = index === state.index;
            const tab = tabs.find(t => t.name === route.name);
            const { options } = descriptors[route.key];
            const title = tab?.title ?? options.title ?? route.name;
            const Icon = tab?.Icon;
            const onPress = () => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                if (Platform.OS === 'android') void Haptics.selectionAsync();
                navigateToTab(route.key);
              }
            };
            return (
              <PlatformPressable
                key={route.key}
                href={buildHref(route.name, route.params)}
                onPress={onPress}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                role="tab"
                accessibilityLabel={options.tabBarAccessibilityLabel ?? title}
                accessibilityState={{ selected: focused }}
                android_ripple={{ color: Colors.surfaceChip, borderless: false, foreground: true }}
                pressOpacity={0.76}
                style={{
                  flex: 1,
                  height: '100%',
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  paddingHorizontal: 2,
                }}>
                {Icon && <Icon size={24} color={focused ? Colors.voltInk : Colors.inkMuted} strokeWidth={focused ? 2.6 : 1.8} />}
                <Text variant="caption" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} maxFontSizeMultiplier={1.3}
                  color={focused ? Colors.ink : Colors.inkMuted} style={{ fontSize: 11, fontWeight: focused ? '700' : '500' }}>
                  {title}
                </Text>
              </PlatformPressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
