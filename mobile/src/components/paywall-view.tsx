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
import { useProfile } from '@/hooks/queries';
import { planSummary } from '@/lib/plan';
import { useAuth } from '@/providers/auth';
import { useColors } from '@/providers/theme';
import type { Profile } from '@/types/api';

export const BENEFITS = [
  'IA Coach Otto 24h para tirar dúvidas e ajustar seu plano',
  'Plano alimentar com receitas e lista de compras',
  'Calorias da refeição pela foto ou descrição',
  'Novos planos de treino sempre que você evoluir',
];

const IS_ANDROID = Platform.OS === 'android';
export const MANAGE_URL = IS_ANDROID
  ? 'https://play.google.com/store/account/subscriptions?package=com.douglas.fitgen'
  : 'https://apps.apple.com/account/subscriptions';
const APPLE_EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const STORE_ACCOUNT = IS_ANDROID ? 'conta Google Play' : 'conta da Apple';
const CANCEL_PATH = IS_ANDROID ? 'Play Store › Pagamentos e assinaturas › Assinaturas' : 'Ajustes › Apple ID › Assinaturas';
const SUPPORT_MAIL = 'mailto:suporte@fitgen.com';

/** Free-trial length in days, when the package has a free introductory offer. */
export function trialDays(pkg: PurchasesPackage): number | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const units = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 } as const;
  return intro.periodNumberOfUnits * (units[intro.periodUnit as keyof typeof units] ?? 1);
}

const PERIOD_LABEL: Record<string, string> = { MONTHLY: 'por mês', ANNUAL: 'por ano', THREE_MONTH: 'a cada 3 meses', SIX_MONTH: 'a cada 6 meses', WEEKLY: 'por semana' };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Premium now? Freemium backends send `is_premium`; older ones only `has_access`. */
const premiumIn = (profile: Profile) => profile.is_premium ?? profile.has_access !== false;

/**
 * Store purchase flow shared by the subscription screen and the purchase card:
 * loads the offering, buys / restores, then waits until the server reports Premium.
 */
export function usePurchaseFlow({ source, onUnlocked }: { source: string; onUnlocked?: (title: string) => void }) {
  const qc = useQueryClient();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | 'confirm' | null>(null);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

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

  /** Asks the server to refresh access from RevenueCat, then waits for the profile to report Premium. */
  const confirmAccess = async (customer: CustomerInfo) => {
    setInfo(customer);
    setBusy('confirm');
    try { await api('/subscriptions/sync', { method: 'POST' }); } catch { /* the webhook will catch up */ }
    for (let attempt = 0; attempt < 10 && alive.current; attempt++) {
      const profile = await qc.fetchQuery({ queryKey: ['profile'], queryFn: () => api<Profile>('/profile/me'), staleTime: 0 });
      if (premiumIn(profile)) return true;
      await sleep(2000);
    }
    return false;
  };

  const finish = async (customer: CustomerInfo, successTitle: string) => {
    const unlocked = await confirmAccess(customer);
    if (!alive.current) return;
    if (!unlocked) AppAlert.alert('Confirmando sua assinatura', 'A compra foi recebida e seu acesso será liberado em instantes. Se demorar, toque em “Restaurar compras”.');
    else onUnlocked?.(successTitle);
  };

  const subscribe = async () => {
    const pkg = packages?.find((p) => p.identifier === selected);
    if (!pkg || busy) return;
    setBusy('buy');
    const props = { package: pkg.identifier, product: pkg.product.identifier, trial_days: trialDays(pkg), source };
    track('purchase_started', props);
    try {
      const customer = await purchase(pkg);
      track(customer ? 'purchase_completed' : 'purchase_cancelled', props);
      if (customer) await finish(customer, 'Tudo certo!');
    } catch (purchaseError) {
      track('purchase_failed', props);
      captureError(purchaseError, { where: 'paywall.purchase', package: pkg.identifier, source });
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
        track('purchase_restored', { source });
        await finish(customer, 'Assinatura restaurada');
      }
      else AppAlert.alert('Nada para restaurar', `Não encontramos uma assinatura ativa nesta ${STORE_ACCOUNT}.`);
    } catch {
      AppAlert.alert('Não foi possível restaurar', 'Tente novamente em instantes.');
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  const chosen = packages?.find((p) => p.identifier === selected);
  return {
    packages, selected, setSelected, busy, error, load, subscribe, restorePurchases,
    active: info ? isPremium(info) : false,
    entitlement: info?.entitlements.active[PREMIUM_ENTITLEMENT],
    chosen,
    chosenTrial: chosen ? trialDays(chosen) : null,
  };
}

export type PurchaseFlow = ReturnType<typeof usePurchaseFlow>;

/** Selectable store packages (radio cards). */
export function PlanOptions({ flow }: { flow: PurchaseFlow }) {
  const Colors = useColors();
  if (flow.packages === null) return <ActivityIndicator color={Colors.inkMuted} />;
  return (
    <View style={{ gap: Spacing.three }}>
      {flow.error ? <Text accessibilityRole="alert" color={Colors.danger}>{flow.error}</Text> : null}
      {flow.packages.map((pkg) => {
        const isSelected = pkg.identifier === flow.selected;
        const trial = trialDays(pkg);
        return (
          <Pressable
            key={pkg.identifier}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            onPress={() => flow.setSelected(pkg.identifier)}
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
      {flow.packages.length === 0 && !flow.error ? <Text muted>Nenhum plano disponível no momento.</Text> : null}
      {flow.packages.length === 0 ? <Button variant="soft" title="Tentar novamente" onPress={flow.load} /> : null}
    </View>
  );
}

export function subscribeTitle(flow: PurchaseFlow) {
  if (flow.busy === 'confirm') return 'Confirmando assinatura…';
  return flow.chosenTrial ? `Começar ${flow.chosenTrial} dias grátis` : 'Assinar';
}

/** Restore link, store renewal terms and legal links (required next to any purchase button). */
export function PurchaseFinePrint({ flow, external = false }: { flow: PurchaseFlow; external?: boolean }) {
  return (
    <View style={{ gap: Spacing.three, alignItems: 'center' }}>
      {purchasesEnabled && (!flow.active || external) && (
        <>
          <LinkText title={flow.busy === 'restore' ? 'Restaurando…' : 'Restaurar compras'} onPress={flow.restorePurchases} />
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {flow.chosenTrial ? `Após o período grátis, a assinatura é cobrada ${flow.chosen ? `(${flow.chosen.product.priceString})` : ''} e renova automaticamente. ` : 'A assinatura renova automaticamente. '}
            O pagamento é cobrado na sua {STORE_ACCOUNT} na confirmação da compra. Para evitar a cobrança, cancele em {CANCEL_PATH} pelo menos 24 horas antes do fim do período.
          </Text>
        </>
      )}
      <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        <LinkText title="Política de Privacidade" onPress={() => (external ? Linking.openURL(`${WEB_URL}/privacidade`) : router.push('/privacy'))} />
        {!IS_ANDROID && (
          <>
            <Text variant="caption">·</Text>
            <LinkText title="Termos de Uso (Apple)" onPress={() => Linking.openURL(APPLE_EULA)} />
          </>
        )}
      </Row>
    </View>
  );
}

/**
 * Subscription screen. With `gate` it is the whole app for users without access (hard-gate
 * mode: no navigator, no back button); otherwise a normal screen opened from the profile.
 * Locked features open the purchase card (`PremiumSheet`) instead.
 */
export function PaywallView({ gate = false }: { gate?: boolean }) {
  const Colors = useColors();
  const { signOut } = useAuth();
  const flow = usePurchaseFlow({
    source: gate ? 'gate' : 'screen',
    onUnlocked: (title) => { if (!gate) AppAlert.alert(title, 'Sua assinatura está ativa.'); },
  });
  useEffect(() => { track('paywall_viewed', { gate }); }, [gate]);
  const working = flow.busy !== null;
  const profile = useProfile();
  // The server knows about every source (site, App Store, Google Play); the store SDK only its own.
  const plan = planSummary(profile.data);
  const serverPremium = !gate && plan.premium;
  const source = profile.data?.subscription_source;

  return (
    <Page topBar={<TopBar title={gate ? 'FitGen' : 'Assinatura'} back={!gate} />}>
      <View style={{ gap: Spacing.three }}>
        <BadgeIcon icon={gate ? Lock : Sparkles} size={48} />
        <Text variant="display">{gate ? 'Assine para continuar' : 'FitGen Premium'}</Text>
        <Text muted>
          {gate
            ? 'Seu acesso ao FitGen precisa de uma assinatura ativa. Comece com 7 dias grátis e cancele quando quiser.'
            : 'Registrar treinos, refeições, água e medidas é grátis. O Premium libera toda a inteligência artificial do FitGen.'}
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

      {!gate && (
        <Card>
          <Text variant="label">Seu plano</Text>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="titleLg">{plan.title}</Text>
            <Badge label={plan.premium ? 'Ativo' : 'Grátis'} tone={plan.premium ? 'volt' : 'soft'} />
          </Row>
          <Text muted>{plan.premium ? plan.caption : plan.detail}</Text>
          {serverPremium && source === 'web' ? (
            <Text muted>Assinatura feita pelo site fitgen.pro. Para cancelar ou trocar a forma de pagamento, use o link “Gerenciar assinatura” do recibo enviado para o seu email.</Text>
          ) : null}
          {serverPremium && (source === 'app_store' || source === 'play_store') ? (
            <Button variant="soft" title="Gerenciar assinatura" onPress={() => Linking.openURL(MANAGE_URL)} />
          ) : null}
        </Card>
      )}

      {serverPremium ? null : !purchasesEnabled ? (
        <Card>
          <Text muted>
            {gate
              ? 'Sua conta ainda não tem uma assinatura ativa. Se você já assinou, entre com a mesma conta; em caso de dúvida, fale com o suporte.'
              : 'As assinaturas ainda não estão disponíveis neste aplicativo.'}
          </Text>
          {gate && <Button variant="soft" title="Falar com o suporte" onPress={() => Linking.openURL(SUPPORT_MAIL)} />}
        </Card>
      ) : flow.active && !gate ? (
        <Card>
          <Badge label="Assinatura ativa" tone="soft" />
          {flow.entitlement?.expirationDate ? (
            <Text muted>
              {flow.entitlement.willRenew ? 'Renova em ' : 'Acesso até '}
              {new Date(flow.entitlement.expirationDate).toLocaleDateString('pt-BR')}
            </Text>
          ) : null}
          <Button variant="soft" title="Gerenciar assinatura" onPress={() => Linking.openURL(MANAGE_URL)} />
        </Card>
      ) : (
        <View style={{ gap: Spacing.three }}>
          <PlanOptions flow={flow} />
          {flow.packages && flow.packages.length > 0 ? (
            <Button
              size="lg"
              title={subscribeTitle(flow)}
              loading={flow.busy === 'buy' || flow.busy === 'confirm'}
              disabled={!flow.selected || working}
              onPress={flow.subscribe}
            />
          ) : null}
        </View>
      )}

      {serverPremium ? null : <PurchaseFinePrint flow={flow} external={gate} />}

      {gate && (
        <View style={{ gap: Spacing.three, alignItems: 'center' }}>
          <Button variant="inverse" title="Sair da conta" onPress={() => void signOut()} style={{ alignSelf: 'stretch' }} />
          <LinkText title="Excluir minha conta" onPress={() => Linking.openURL(`${SUPPORT_MAIL}?subject=${encodeURIComponent('Exclusão de Conta')}`)} />
        </View>
      )}
    </Page>
  );
}
