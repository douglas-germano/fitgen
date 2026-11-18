import { CheckCircle2, Sparkles } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { BENEFITS, PlanOptions, PurchaseFinePrint, subscribeTitle, usePurchaseFlow } from '@/components/paywall-view';
import { BadgeIcon, Button, Dialog, type DialogHandle, Row, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { AppAlert } from '@/lib/feedback';
import { closePremiumSheet, type PremiumFeature, usePremiumSheetState } from '@/lib/premium-sheet';
import { purchasesEnabled } from '@/lib/purchases';
import { useColors } from '@/providers/theme';

const COPY: Record<PremiumFeature | 'default', { title: string; headline: string; description: string }> = {
  coach: {
    title: 'IA Coach',
    headline: 'Converse com o Otto, seu coach de IA',
    description: 'Tire dúvidas, troque exercícios e ajuste dieta e treino a qualquer hora, com base no seu histórico.',
  },
  diet_plan: {
    title: 'Plano alimentar',
    headline: 'Seu cardápio montado pela IA',
    description: 'Refeições da semana na sua meta de calorias, com receitas e lista de compras.',
  },
  meal_estimate: {
    title: 'Calorias pela foto',
    headline: 'Fotografe e saiba as calorias',
    description: 'A IA estima calorias e macros da refeição pela foto ou descrição. Registrar manualmente continua grátis.',
  },
  workout_plan: {
    title: 'Novo treino com IA',
    headline: 'Um treino novo sempre que evoluir',
    description: 'Gere novos planos de treino ajustados ao seu nível, objetivo e equipamentos.',
  },
  default: {
    title: 'FitGen Premium',
    headline: 'Libere a IA do FitGen',
    description: 'Registrar treinos, refeições, água e medidas é grátis. O Premium libera toda a inteligência artificial.',
  },
};

/** The purchase card itself. Mounted only while open so each opening loads fresh offers. */
function PremiumSheet({ feature }: { feature: PremiumFeature | null }) {
  const Colors = useColors();
  const sheet = useRef<DialogHandle>(null);
  const copy = COPY[feature ?? 'default'];
  // Closing a sheet clears alerts shown inside it: confirm the purchase after it is gone.
  const unlockedTitle = useRef<string | null>(null);
  const flow = usePurchaseFlow({
    source: `sheet:${feature ?? 'default'}`,
    onUnlocked: (title) => {
      unlockedTitle.current = title;
      sheet.current?.dismiss();
    },
  });
  const onClose = () => {
    closePremiumSheet();
    const title = unlockedTitle.current;
    if (title) setTimeout(() => AppAlert.alert(title, 'O FitGen Premium está ativo. Aproveite!'), 0);
  };
  useEffect(() => { track('paywall_viewed', { gate: false, sheet: true, feature }); }, [feature]);

  const canBuy = purchasesEnabled && !!flow.packages?.length && !flow.active;
  const footer = canBuy ? (
    <Button
      size="lg"
      title={subscribeTitle(flow)}
      loading={flow.busy === 'buy' || flow.busy === 'confirm'}
      disabled={!flow.selected || flow.busy !== null}
      onPress={flow.subscribe}
    />
  ) : (
    <Button size="lg" variant="soft" title="Agora não" onPress={() => sheet.current?.dismiss()} />
  );

  return (
    <Dialog ref={sheet} sheet sheetSize="registration" visible onClose={onClose} title={copy.title} footer={footer}>
      <View style={{ gap: Spacing.four }}>
        <View style={{ gap: Spacing.two }}>
          <BadgeIcon icon={Sparkles} size={44} />
          <Text variant="titleLg">{copy.headline}</Text>
          <Text muted>{copy.description}</Text>
        </View>

        <View style={{ gap: Spacing.two }}>
          {BENEFITS.map((benefit) => (
            <Row key={benefit} style={{ alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color={Colors.voltInk} />
              <Text style={{ flex: 1 }}>{benefit}</Text>
            </Row>
          ))}
        </View>

        {!purchasesEnabled ? (
          <Text muted>As assinaturas ainda não estão disponíveis neste aplicativo.</Text>
        ) : flow.active ? (
          <Text muted>Sua assinatura está ativa. Se algo ainda estiver bloqueado, toque em “Restaurar compras”.</Text>
        ) : (
          <PlanOptions flow={flow} />
        )}

        <PurchaseFinePrint flow={flow} />
      </View>
    </Dialog>
  );
}

/** Rendered once in the root layout; `openPremiumSheet(feature)` shows it. */
export function PremiumSheetHost() {
  const { open, feature } = usePremiumSheetState();
  return open ? <PremiumSheet feature={feature} /> : null;
}
