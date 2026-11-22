import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { errorMessage } from '@/lib/api';
import { appleCredential, appleSignInAvailable, googleCredential, googleSignInEnabled, type SocialCredential } from '@/lib/social-auth';
import { useAuth } from '@/providers/auth';
import { useAppTheme, useColors } from '@/providers/theme';

/** "Continuar com Apple / Google" + an "ou" divider. Renders nothing when neither provider is available. */
export function SocialSignIn() {
  const Colors = useColors();
  const { scheme } = useAppTheme();
  const { signInWithProvider } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void appleSignInAvailable().then(setAppleAvailable);
  }, []);

  if (!appleAvailable && !googleSignInEnabled) return null;

  const run = async (provider: 'google' | 'apple', getCredential: () => Promise<SocialCredential | null>) => {
    if (busy) return;
    setBusy(provider);
    setError('');
    try {
      const credential = await getCredential();
      if (!credential) return; // user cancelled
      // On success the auth guard swaps the stack (onboarding or tabs) automatically.
      const data = await signInWithProvider(credential);
      track(data.created ? 'signed_up' : 'logged_in', { method: provider });
    } catch (e) {
      setError(errorMessage(e, `Não foi possível entrar com ${provider === 'google' ? 'o Google' : 'a Apple'}.`));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: Spacing.three }}>
      {appleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            scheme === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={26}
          style={{ height: 52, opacity: busy && busy !== 'apple' ? 0.45 : 1 }}
          onPress={() => void run('apple', appleCredential)}
        />
      )}
      {googleSignInEnabled && (
        <Button
          size="lg"
          variant="soft"
          title="Continuar com Google"
          loading={busy === 'google'}
          disabled={!!busy && busy !== 'google'}
          onPress={() => void run('google', googleCredential)}
        />
      )}
      {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View style={{ flex: 1, height: 1, backgroundColor: Colors.line }} />
        <Text muted variant="caption">ou com email</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: Colors.line }} />
      </View>
    </View>
  );
}
