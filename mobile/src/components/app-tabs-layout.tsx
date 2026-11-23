import { Tabs } from 'expo-router/js-tabs';
import { ChartNoAxesCombined, Dumbbell, House, UsersRound, Utensils } from 'lucide-react-native';

import { AppTabBar, type AppTab } from '@/components/app-tab-bar';
import { useColors } from '@/providers/theme';

const tabs: AppTab[] = [
  { name: 'index', title: 'Início', Icon: House },
  { name: 'workouts', title: 'Treino', Icon: Dumbbell },
  { name: 'social', title: 'Comunidade', Icon: UsersRound },
  { name: 'diet', title: 'Dieta', Icon: Utensils },
  { name: 'metrics', title: 'Medidas', Icon: ChartNoAxesCombined },
];

export default function TabsLayout() {
  const Colors = useColors();
  return (
    <Tabs
      tabBar={props => <AppTabBar {...props} tabs={tabs} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Colors.surface } }}>
      {tabs.map(({ name, title }) => (
        <Tabs.Screen key={name} name={name} options={{ title, tabBarAccessibilityLabel: title }} />
      ))}
    </Tabs>
  );
}
