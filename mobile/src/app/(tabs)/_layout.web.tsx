import { Tabs } from 'expo-router';
import { ChartNoAxesCombined, Dumbbell, House, UsersRound, Utensils } from 'lucide-react-native';

import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/providers/theme';

const tabs = [
  { name: 'index', title: 'Painel', Icon: House },
  { name: 'workouts', title: 'Treino', Icon: Dumbbell },
  { name: 'social', title: 'Comunidade', Icon: UsersRound },
  { name: 'diet', title: 'Dieta', Icon: Utensils },
  { name: 'metrics', title: 'Medidas', Icon: ChartNoAxesCombined },
];

export default function TabsLayout() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { bottom, left, right } = useSafeAreaInsets();
  const gutter = Math.max(10, Math.min(20, Math.round(width * 0.04)));
  return (
    <Tabs safeAreaInsets={{ bottom: 0 }} screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarLabelPosition: 'beside-icon',
      tabBarIconStyle: { width: 46, height: 40 },
      tabBarActiveTintColor: colors.ink,
      tabBarInactiveTintColor: colors.inkMuted,
      tabBarStyle: {
        height: 60,
        marginLeft: Math.max(gutter, left),
        marginRight: Math.max(gutter, right),
        marginTop: 6,
        marginBottom: Math.max(18, bottom + 10),
        paddingHorizontal: 6,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 30,
        backgroundColor: colors.surface,
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.12)',
      },
      tabBarItemStyle: { borderRadius: 24 },
      sceneStyle: { backgroundColor: colors.surface },
    }}>
      {tabs.map(({ name, title, Icon }) => (
        <Tabs.Screen key={name} name={name} options={{
          title,
          tabBarAccessibilityLabel: title,
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 46,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused ? colors.surfaceChip : 'transparent',
            }}>
              <Icon size={23} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }} />
      ))}
    </Tabs>
  );
}
