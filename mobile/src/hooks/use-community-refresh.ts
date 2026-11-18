import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

/** The page owns the native refresh indicator, including empty/error feeds. */
export function useCommunityRefresh() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);
  const refresh = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try { await qc.refetchQueries({ queryKey: ['community'], type: 'active' }); }
    finally { inFlight.current = false; setRefreshing(false); }
  };
  return { refreshing, refresh };
}
