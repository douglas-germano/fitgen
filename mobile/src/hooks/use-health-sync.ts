import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { api } from '@/lib/api';
import { healthAccountMatches, isHealthEnabled, readHealthImports, readHealthFortnight } from '@/lib/health';
import { useHealthEnabled, useProfile } from '@/hooks/queries';

export function useHealthSync(userId?: string) {
  const qc = useQueryClient();
  const { data: connected } = useHealthEnabled();
  const account = useQuery({ queryKey: ['health', 'account', userId],
    queryFn: () => healthAccountMatches(userId!), enabled: !!userId && !!connected });
  const sync = useQuery({ queryKey: ['health', 'sync', userId],
    enabled: !!userId && !!connected && account.data === true,
    staleTime: 60_000, retry: false,
    refetchInterval: () => AppState.currentState === 'active' ? 60_000 : false,
    queryFn: async ({ signal }) => {
      if (!(await healthAccountMatches(userId!)) || !(await isHealthEnabled())) throw new Error('Conecte o Saúde nesta conta');
      const samples = await readHealthImports();
      let imported = 0;
      for (let offset = 0; offset < samples.length; offset += 100) {
        if (signal.aborted || !(await isHealthEnabled()) || !(await healthAccountMatches(userId!))) throw new Error('Sincronização interrompida');
        const result = await api<{ imported: number }>('/health/sync', {
          method: 'POST', body: { user_id: userId, samples: samples.slice(offset, offset + 100) },
        });
        imported += result.imported;
      }
      if (signal.aborted) throw new Error('Sincronização interrompida');
      await Promise.all(['workout-history', 'metric-history', 'health-summary-weight', 'dashboard', 'profile', 'health-week'].map(key => qc.invalidateQueries({ queryKey: [key] })));
      return { at: new Date().toISOString(), imported, found: samples.length };
    },
  });
  return { sync, account, connected };
}

/** Exactly one foreground observer, mounted within the authenticated navigator. */
export function useHealthAutoSync(userId?: string) {
  const { sync, account, connected } = useHealthSync(userId);
  const { refetch } = sync;
  useEffect(() => {
    if (!userId || !connected || !account.data) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void refetch();
    });
    return () => sub.remove();
  }, [userId, connected, account.data, refetch]);
}

export function useHealthWeek() {
  const { data: connected } = useHealthEnabled();
  const profile = useProfile();
  return useQuery({ queryKey: ['health-week', profile.data?.id], queryFn: readHealthFortnight, enabled: !!connected, staleTime: 60_000 });
}
