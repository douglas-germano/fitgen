import { OutdoorTrace } from '@/components/outdoor-summary';
import type { OutdoorRoute } from '@/lib/outdoor';

// expo-maps has no web support; the PWA keeps the drawn trace.
export function OutdoorMap({ route, emptyMessage }: { route: OutdoorRoute; emptyMessage: string; live?: boolean }) {
  return <OutdoorTrace route={route} emptyMessage={emptyMessage} />;
}
