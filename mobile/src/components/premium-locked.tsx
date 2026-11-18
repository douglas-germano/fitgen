import { router } from 'expo-router';
import { Check, Lock, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { BadgeIcon, Button, Card, Page, Text, TopBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';

/** Full-screen state for a Premium-only screen (freemium): explains the feature and opens the paywall. */
export function PremiumLocked({
  title,
  headline,
  description,
  perks,
  icon = Lock,
}: {
  title: string;
  headline: string;
  description: string;
  perks: string[];
  icon?: LucideIcon;
}) {
  const Colors = useColors();
  return (
    <Page topBar={<TopBar title={title} back />}>
      <View style={{ gap: Spacing.three }}>
        <BadgeIcon icon={icon} size={48} />
        <Text variant="display">{headline}</Text>
        <Text muted>{description}</Text>
      </View>
      <Card>
        <View style={{ gap: Spacing.two }}>
          {perks.map((perk) => (
            <View key={perk} style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' }}>
              <Check size={18} color={Colors.ink} />
              <Text style={{ flex: 1 }}>{perk}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Button size="lg" title="Começar 7 dias grátis" onPress={() => router.push('/paywall')} />
      <Text variant="caption" style={{ textAlign: 'center' }}>Registrar treinos, refeições, água e medidas continua grátis.</Text>
    </Page>
  );
}
