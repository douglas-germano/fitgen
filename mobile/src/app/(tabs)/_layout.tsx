import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/native-tabs';

import { useColors } from '@/providers/theme';

/**
 * Native tab bar — kept native on purpose, tinted with the Volt Fit palette.
 * Icons identify each destination: home, training, community, meals and progress.
 */
export default function TabsLayout() {
  const Colors = useColors();
  const selectedColor = Platform.OS === 'android' ? Colors.onVolt : Colors.ink;
  return (
    <NativeTabs
      backgroundColor={Colors.surface}
      indicatorColor={Colors.volt}
      iconColor={{ default: Colors.inkMuted, selected: selectedColor }}
      labelVisibilityMode="unlabeled"
      tintColor={Colors.ink}>
      <NativeTabs.Trigger disableAutomaticContentInsets name="index" accessibilityLabel="Início">
        <NativeTabs.Trigger.Label hidden>Início</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger disableAutomaticContentInsets name="workouts" accessibilityLabel="Treino">
        <NativeTabs.Trigger.Label hidden>Treino</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }} md="fitness_center" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger disableAutomaticContentInsets name="social" accessibilityLabel="Comunidade">
        <NativeTabs.Trigger.Label hidden>Comunidade</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger disableAutomaticContentInsets name="diet" accessibilityLabel="Dieta">
        <NativeTabs.Trigger.Label hidden>Dieta</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger disableAutomaticContentInsets name="metrics" accessibilityLabel="Medidas">
        <NativeTabs.Trigger.Label hidden>Medidas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.xyaxis.line" md="monitoring" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
