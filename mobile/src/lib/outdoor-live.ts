import { Platform } from 'react-native';

import { liveActivity } from './live-activity';
import type { OutdoorDraft } from './outdoor-recording';
import { distanceLabel, elapsedLabel, outdoorName, paceLabel, speedLabel } from './outdoor';

let lastUpdate: { id: string; at: number } | undefined;

export function publishOutdoorLive(
  draft: OutdoorDraft, seconds: number, transition?: 'start' | 'pause',
) {
  if (!liveActivity || (!draft.background && Platform.OS === 'android')) return;
  const now = Date.now();
  if (!transition && lastUpdate?.id === draft.id && now - lastUpdate.at < 15_000) return;
  const update = { id: draft.id, at: now };
  lastUpdate = update;
  const timerStart = draft.runningSince === null ? null : draft.runningSince - draft.activeMs;
  const rate = draft.type === 'bike' ? speedLabel(seconds, draft.meters) : paceLabel(seconds, draft.meters);
  const retry = () => {
    if (lastUpdate === update) lastUpdate = undefined;
  };
  void liveActivity.publish(
    draft.id, outdoorName(draft.type), draft.type, timerStart,
    elapsedLabel(seconds), distanceLabel(draft.meters), rate, transition === 'start',
  ).then((posted) => { if (!posted) retry(); }, retry);
}

export function endOutdoorLive(id: string) {
  if (lastUpdate?.id === id) lastUpdate = undefined;
  void liveActivity?.end(id).catch(() => {});
}
