import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { openPremiumSheet } from '@/lib/premium-sheet';
import { api, clearTokens, loadTokens, saveTokens, setPremiumRequiredHandler, setSubscriptionRequiredHandler, setUnauthorizedHandler } from '@/lib/api';
import type { SocialCredential } from '@/lib/social-auth';
import type { LoginResponse } from '@/types/api';

type Status = 'loading' | 'signedIn' | 'signedOut';

type AuthContextValue = {
  status: Status;
  signIn: (email: string, password: string) => Promise<LoginResponse>;
  signInWithProvider: (credential: SocialCredential) => Promise<LoginResponse>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    loadTokens()
      .then((hasToken) => setStatus(hasToken ? 'signedIn' : 'signedOut'))
      .catch(() => setStatus('signedOut'));

    setUnauthorizedHandler(() => {
      queryClient.clear();
      setStatus('signedOut');
    });
    // A 402 means the trial/subscription ended while the app was open: refresh the profile so the root
    // layout switches to the paywall.
    setSubscriptionRequiredHandler(() => void queryClient.invalidateQueries({ queryKey: ['profile'] }));
    // Freemium: a free user hit an AI feature the screen didn't gate first. Refresh the plan and
    // open the purchase card for that feature.
    setPremiumRequiredHandler((feature) => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      openPremiumSheet(feature);
    });
    return () => {
      setUnauthorizedHandler(null);
      setSubscriptionRequiredHandler(null);
      setPremiumRequiredHandler(null);
    };
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    const data = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email: email.trim().toLowerCase(), password },
      public: true,
    });
    await saveTokens(data.access_token, data.refresh_token);
    setStatus('signedIn');
    return data;
  };

  const signInWithProvider = async ({ provider, idToken, name }: SocialCredential) => {
    const data = await api<LoginResponse>('/auth/social', {
      method: 'POST',
      body: { provider, id_token: idToken, ...(name ? { name } : {}) },
      public: true,
    });
    await saveTokens(data.access_token, data.refresh_token);
    setStatus('signedIn');
    return data;
  };

  const signOut = async () => {
    await clearTokens();
    queryClient.clear();
    setStatus('signedOut');
  };

  return <AuthContext value={{ status, signIn, signInWithProvider, signOut }}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
