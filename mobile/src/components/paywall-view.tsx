import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CheckCircle2, Lock, Sparkles } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, View } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

import { Badge, BadgeIcon, Button, Card, LinkText, Page, Row, Text, TopBar } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { captureError, track } from '@/lib/analytics';
import { api, WEB_URL } from '@/lib/api';
import { AppAlert } from '@/lib/feedback';
import {
  currentOffering,
  customerInfo,
  isPremium,
  PREMIUM_ENTITLEMENT,
  purchase,
  purchasesEnabled,
  restore,
} from '@/lib/purchases';
import { useAuth } from '@/providers/auth';
import { useColors } from '@/providers/theme';
import type { Profile } from '@/types/api';

const BENEFITS = [
  'Treinos personalizados que se ajustam à sua evolução',
  'Plano alimentar e coach Otto com IA',
  'Medidas, hidratação e conquistas em um só lugar',
];

const IS_ANDROID = Platform.OS === 'android';
const MANAGE_URL = IS_ANDROID
  ? 'https://play.google.com/store/account/subscriptions?package=com.douglas.fitgen'
  : 'https://apps.apple.com/account/subscriptions';
const APPLE_EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const STORE_ACCOUNT = IS_ANDROID ? 'conta Google Play' : 'conta da Apple';
const CANCEL_PATH = IS_ANDROID ? 'Play Store › Pagamentos e assinaturas › Assinaturas' : 'Ajustes › Apple ID › Assinaturas';
const SUPPORT_MAIL = 'mailto:suporte@fitgen.com';

/** Free-trial length in days, when the package has a free introductory offer. */
function trialDays(pkg: PurchasesPackage): number | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const units = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 } as const;
  return intro.periodNumberOfUnits * (units[intro.periodUnit as keyof typeof units] ?? 1);
}

const PERIOD_LABEL: Record<string, string> = { MONTHLY: 'por mês', ANNUAL: 'por ano', THREE_MONTH: 'a cada 3 meses', SIX_MONTH: 'a cada 6 meses', WEEKLY: 'por semana' };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Subscription screen. With `gate` it is the whole app for users without access
 * (no navigator, no back button); otherwise it is a normal screen opened from the profile.
 */
export function PaywallView({ gate = false }: { gate?: boolean }) {
  const Colors = useColors();
  const qc = useQueryClient();
  const { signOut } = useAuth();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | 'confirm' | null>(null);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => { track('paywall_viewed', { gate }); }, [gate]);

  const load = useCallback(async () => {
    setError('');
    try {
      const [offering, customer] = await Promise.all([currentOffering(), customerInfo()]);
      setPackages(offering?.availablePackages ?? []);
      setSelected((current) => current ?? offering?.availablePackages[0]?.identifier ?? null);
      setInfo(customer);
    } catch {
      setPackages([]);
      setError('Não foi possível carregar os planos. Verifique sua conexão e tente novamente.');
    }
  }, []);

  useEffect(() => {
    if (purchasesEnabled) void Promise.resolve().then(load);
  }, [load]);

  /** Asks the server to refresh access from RevenueCat, then waits for the profile to unlock. */
  const confirmAccess = async (customer: CustomerInfo) => {
    setInfo(customer);
    setBusy('confirm');
    try { await api('/subscriptions/sync', { method: 'POST' }); } catch { /* the webhook will catch up */ }
    for (let attempt = 0; attempt < 10 && alive.current; attempt++) {
      const profile = await qc.fetchQuery({ queryKey: ['profile'], queryFn: () => api<Profile>('/profile/me'), staleTime: 0 });
      if (profile.has_access !== false) return true;
      await sleep(2000);
    }
    return false;
  };

  const finish = async (customer: CustomerInfo, successTitle: string) => {
    const unlocked = await confirmAccess(customer);
    if (!alive.current) return;
    if (!unlocked) AppAlert.alert('Confirmando sua assinatura', 'A compra foi recebida e seu acesso será liberado em instantes. Se demorar, toque em “Restaurar compras”.');
    else if (!gate) AppAlert.alert(successTitle, 'Sua assinatura está ativa.');
  };

  const subscribe = async () => {
    const pkg = packages?.find((p) => p.identifier === selected);
    if (!pkg || busy) return;
    setBusy('buy');
    const props = { package: pkg.identifier, product: pkg.product.identifier, trial_days: trialDays(pkg), gate };
    track('purchase_started', props);
    try {
      const customer = await purchase(pkg);
      track(customer ? 'purchase_completed' : 'purchase_cancelled', props);
      if (customer) await finish(customer, 'Tudo certo!');
    } catch (purchaseError) {
      track('purchase_failed', props);
      captureError(purchaseError, { where: 'paywall.purchase', package: pkg.identifier });
      AppAlert.alert('Não foi possível concluir', 'A compra não foi finalizada. Você não foi cobrado. Tente novamente.');
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  const restorePurchases = async () => {
    if (busy) return;
    setBusy('restore');
    try {
      const customer = await restore();
      if (isPremium(customer)) {
        track('purchase_restored', { gate });
        await finish(customer, 'Assinatura restaurada');
      }
      else AppAlert.alert('Nada para restaurar', `Não encontramos uma assinatura ativa nesta ${STORE_ACCOUNT}.`);
    } catch {
      AppAlert.alert('Não foi possível restaurar', 'Tente novamente em instantes.');
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  const active = info ? isPremium(info) : false;
  const entitlement = info?.entitlements.active[PREMIUM_ENTITLEMENT];
  const chosen = packages?.find((p) => p.identifier === selected);
  const chosenTrial = chosen ? trialDays(chosen) : null;
  const working = busy !== null;

  return (
    <Page topBar={<TopBar title={gate ? 'FitGen' : 'Assinatura'} back={!gate} />}>
      <View style={{ gap: Spacing.three }}>
        <BadgeIcon icon={gate ? Lock : Sparkles} size={48} />
        <Text variant="display">{gate ? 'Assine para continuar' : 'FitGen Premium'}</Text>
        <Text muted>
          {gate
            ? 'Seu acesso ao FitGen precisa de uma assinatura ativa. Comece com 7 dias grátis e cancele quando quiser.'
            : 'Tudo para treinar e comer melhor, com acompanhamento de IA.'}
        </Text>
      </View>

      <Card>
        {BENEFITS.map((benefit) => (
          <Row key={benefit} style={{ alignItems: 'flex-start' }}>
            <CheckCircle2 size={20} color={Colors.voltInk} />
            <Text style={{ flex: 1 }}>{benefit}</Text>
          </Row>
        ))}
      </Card>

      {!purchasesEnabled ? (
        <Card>
          <Text muted>
            {gate
              ? 'Sua conta ainda não tem uma assinatura ativa. Se você já assinou, entre com a mesma conta; em caso de dúvida, fale com o suporte.'
              : 'As assinaturas ainda não estão disponíveis neste aplicativo.'}
          </Text>
          {gate && <Button variant="soft" title="Falar com o suporte" onPress={() => Linking.openURL(SUPPORT_MAIL)} />}
        </Card>
      ) : packages === null ? (
        <ActivityIndicator color={Colors.inkMuted} />
      ) : active && !gate ? (
        <Card>
          <Badge label="Assinatura ativa" tone="soft" />
          {entitlement?.expirationDate ? (
            <Text muted>
              {entitlement.willRenew ? 'Renova em ' : 'Acesso até '}
              {new Date(entitlement.expirationDate).toLocaleDateString('pt-BR')}
            </Text>
          ) : null}
          <Button variant="soft" title="Gerenciar assinatura" onPress={() => Linking.openURL(MANAGE_URL)} />
        </Card>
      ) : (
        <View style={{ gap: Spacing.three }}>
          {error ? <Text accessibilityRole="alert" color={Colors.danger}>{error}</Text> : null}
          {packages.map((pkg) => {
            const isSelected = pkg.identifier === selected;
            const trial = trialDays(pkg);
            return (
              <Pressable
                key={pkg.identifier}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelected(pkg.identifier)}
                style={{
                  borderRadius: Radius.md,
                  borderCurve: 'continuous',
                  borderWidth: 2,
                  borderColor: isSelected ? Colors.ink : Colors.line,
                  backgroundColor: isSelected ? Colors.voltSoft : Colors.surfaceSunken,
                  padding: Spacing.four,
                  gap: Spacing.one,
                }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="titleMd">{pkg.product.title.replace(/\s*\(.*\)$/, '') || 'FitGen Premium'}</Text>
                  {trial ? <Badge label={`${trial} dias grátis`} /> : null}
                </Row>
                <Text variant="titleLg">
                  {pkg.product.priceString} <Text muted>{PERIOD_LABEL[pkg.packageType] ?? ''}</Text>
                </Text>
              </Pressable>
            );
          })}
          {packages.length === 0 && !error ? <Text muted>Nenhum plano disponível no momento.</Text> : null}
          {packages.length > 0 ? (
            <Button
              size="lg"
              title={busy === 'confirm' ? 'Confirmando assinatura…' : chosenTrial ? `Começar ${chosenTrial} dias grátis` : 'Assinar'}
              loading={busy === 'buy' || busy === 'confirm'}
              disabled={!selected || working}
              onPress={subscribe}
            />
          ) : (
            <Button variant="soft" title="Tentar novamente" onPress={load} />
          )}
        </View>
      )}

      {purchasesEnabled && (
        <View style={{ gap: Spacing.three, alignItems: 'center' }}>
          {(!active || gate) && <LinkText title={busy === 'restore' ? 'Restaurando…' : 'Restaurar compras'} onPress={restorePurchases} />}
          {(!active || gate) && <Text variant="caption" style={{ textAlign: 'center' }}>
            {chosenTrial ? `Após o período grátis, a assinatura é cobrada ${chosen ? `(${chosen.product.priceString})` : ''} e renova automaticamente. ` : 'A assinatura renova automaticamente. '}
            O pagamento é cobrado na sua {STORE_ACCOUNT} na confirmação da compra. Para evitar a cobrança, cancele em {CANCEL_PATH} pelo menos 24 horas antes do fim do período.
          </Text>}
        </View>
      )}

      <View style={{ gap: Spacing.three, alignItems: 'center' }}>
        <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <LinkText title="Política de Privacidade" onPress={() => (gate ? Linking.openURL(`${WEB_URL}/privacidade`) : router.push('/privacy'))} />
          {!IS_ANDROID && (
            <>
              <Text variant="caption">·</Text>
              <LinkText title="Termos de Uso (Apple)" onPress={() => Linking.openURL(APPLE_EULA)} />
            </>
          )}
        </Row>
        {gate && (
          <>
            <Button variant="inverse" title="Sair da conta" onPress={() => void signOut()} style={{ alignSelf: 'stretch' }} />
            <LinkText title="Excluir minha conta" onPress={() => Linking.openURL(`${SUPPORT_MAIL}?subject=${encodeURIComponent('Exclusão de Conta')}`)} />
          </>
        )}
      </View>
    </Page>
  );
}
