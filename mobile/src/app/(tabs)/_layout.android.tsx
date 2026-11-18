import { Tabs } from 'expo-router/js-tabs';
import { ChartNoAxesCombined, Dumbbell, House, UsersRound, Utensils } from 'lucide-react-native';

import { FloatingTabBar, type FloatingTab } from '@/components/floating-tab-bar';
import { useColors } from '@/providers/theme';

const tabs: FloatingTab[] = [
  { name: 'index', title: 'Painel', Icon: House },
  { name: 'workouts', title: 'Treino', Icon: Dumbbell },
  { name: 'social', title: 'Comunidade', Icon: UsersRound },
  { name: 'diet', title: 'Dieta', Icon: Utensils },
  { name: 'metrics', title: 'Medidas', Icon: ChartNoAxesCombined },
];

/** Android: floating capsule like the iOS tab bar (the native Material bar spans the whole width). */
export default function TabsLayout() {
  const Colors = useColors();
  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} tabs={tabs} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Colors.surface } }}>
      {tabs.map(({ name, title }) => (
        <Tabs.Screen key={name} name={name} options={{ title, tabBarAccessibilityLabel: title }} />
      ))}
    </Tabs>
  );
}
