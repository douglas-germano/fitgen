import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppleLogo, GoogleLogo } from '@/components/provider-logos';
import { Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { errorMessage } from '@/lib/api';
import {
  appleCredential,
  appleSignInAvailable,
  googleCredential,
  googleSignInEnabled,
  SocialSignInError,
  type SocialCredential,
  type SocialProvider,
} from '@/lib/social-auth';
import { useAuth } from '@/providers/auth';
import { useColors } from '@/providers/theme';

/** "ou continue com" divider + Apple / Google buttons. Renders nothing when neither provider is available. */
export function SocialSignIn({ referralCode }: { referralCode?: string }) {
  const Colors = useColors();
  const { signInWithProvider } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void appleSignInAvailable().then(setAppleAvailable);
  }, []);

  if (!appleAvailable && !googleSignInEnabled) return null;

  const run = async (provider: SocialProvider, getCredential: () => Promise<SocialCredential | null>) => {
    if (busy) return;
    setBusy(provider);
    setError('');
    try {
      const credential = await getCredential();
      if (!credential) return; // user cancelled
      // On success the auth guard swaps the stack (onboarding or tabs) automatically.
      const data = await signInWithProvider(credential, referralCode);
      track(data.created ? 'signed_up' : 'logged_in', { method: provider });
    } catch (e) {
      console.warn(`[social-sign-in] ${provider}`, e);
      const fallback = `Não foi possível entrar com ${provider === 'google' ? 'o Google' : 'a Apple'}.`;
      setError(e instanceof SocialSignInError ? e.message : errorMessage(e, fallback));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View style={{ flex: 1, height: 1, backgroundColor: Colors.line }} />
        <Text muted variant="caption">ou continue com</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: Colors.line }} />
      </View>
      {appleAvailable && (
        <ProviderButton
          title="Continuar com a Apple"
          logo={<AppleLogo color={Colors.ink} />}
          loading={busy === 'apple'}
          disabled={!!busy && busy !== 'apple'}
          onPress={() => void run('apple', appleCredential)}
        />
      )}
      {googleSignInEnabled && (
        <ProviderButton
          title="Continuar com o Google"
          logo={<GoogleLogo />}
          loading={busy === 'google'}
          disabled={!!busy && busy !== 'google'}
          onPress={() => void run('google', googleCredential)}
        />
      )}
      {!!error && (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
          {error}
        </Text>
      )}
    </View>
  );
}

/** Outlined pill with the provider's logo: the common "Continue with …" look. */
function ProviderButton({
  title,
  logo,
  loading,
  disabled,
  onPress,
}: {
  title: string;
  logo: ReactNode;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const Colors = useColors();
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => ({
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.three,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: Colors.line,
        backgroundColor: pressed ? Colors.surfaceChip : Colors.surface,
        opacity: disabled ? 0.45 : 1,
      })}>
      {loading ? <ActivityIndicator size="small" color={Colors.ink} /> : logo}
      <Text style={{ fontSize: 15, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}
