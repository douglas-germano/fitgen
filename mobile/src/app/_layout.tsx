import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { AppThemeProvider, useAppTheme } from '@/providers/theme';
import { PageSkeleton, QueryError } from '@/components/ui';
import { useProfile } from '@/hooks/queries';
import { FeedbackRoot } from '@/components/feedback';
import { usePushRegistration } from '@/hooks/use-push-registration';
import { AuthProvider, useAuth } from '@/providers/auth';
import { useHealthAutoSync } from '@/hooks/use-health-sync';
import { usePurchasesIdentity } from '@/hooks/use-purchases';
import { useAnalyticsIdentity, useScreenTracking } from '@/hooks/use-analytics';
import { withMonitoring } from '@/lib/analytics';
import { PaywallView } from '@/components/paywall-view';
import { PremiumSheetHost } from '@/components/premium-sheet';
import { stopOutdoorLocation } from '@/lib/outdoor-location';
import { recoverOutdoorDraft } from '@/lib/outdoor-recording';

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
      }),
  );

  useEffect(() => {
    try {
      if (!recoverOutdoorDraft()) return;
    } catch {
      // A blocked storage API must not prevent access to the rest of FitGen.
    }
    void stopOutdoorLocation().catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <AuthProvider>
          <RootNavigator />
          <FeedbackRoot />
        </AuthProvider>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}

export default withMonitoring(RootLayout);

function RootNavigator() {
  const { colors: Colors, scheme, ready: themeReady } = useAppTheme();
  const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: Colors.ink,
      background: Colors.surface,
      card: Colors.surface,
      text: Colors.ink,
      border: Colors.line,
    },
  };

  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const profile = useProfile(signedIn);
  useHealthAutoSync(signedIn ? profile.data?.id : undefined);
  usePurchasesIdentity(profile.data?.id, signedIn);
  useAnalyticsIdentity(profile.data, signedIn);
  useScreenTracking();
  const needsOnboarding = signedIn && profile.data?.onboarding_completed === false;
  // The server says the trial/subscription is over (or never started): nothing else is reachable.
  const locked = signedIn && profile.data?.has_access === false;
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const ready = themeReady && status !== 'loading' && (fontsLoaded || !!fontError);

  usePushRegistration(signedIn);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  if (signedIn && profile.isLoading) return <PageSkeleton title="Carregando seu perfil" tab={false} />;
  if (signedIn && (profile.error || !profile.data)) return <QueryError title="Seu perfil" error={profile.error} onRetry={profile.refetch} />;

  if (locked) {
    return (
      <ThemeProvider value={navTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <PaywallView gate />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Every screen draws its own Volt Fit TopBar. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.surface } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Protected guard={!needsOnboarding}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="community" />
          <Stack.Screen name="hydration" />
          <Stack.Screen name="coach" />
          <Stack.Screen name="workout/[id]/index" />
          <Stack.Screen name="workout/history" />
          <Stack.Screen name="outdoor/index" />
          <Stack.Screen name="outdoor/[id]" />
          <Stack.Screen name="exercises/index" />
          <Stack.Screen name="exercises/[id]" />
          <Stack.Screen name="workout/[id]/play/[dayId]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="diet-plan" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="achievements" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="profile-edit" />
          <Stack.Screen name="diet-preferences" />
          <Stack.Screen name="shopping-list" />
          <Stack.Screen name="nutrition-history" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="delete-account" />
          <Stack.Screen name="paywall" />
          </Stack.Protected>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: !needsOnboarding }} />
        </Stack.Protected>

        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="register" />
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
      </Stack>
      {signedIn && <PremiumSheetHost />}
    </ThemeProvider>
  );
}
