import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { readDraft, recordLocations } from './outdoor-recording';

const TASK = 'fitgen-outdoor-location';
const options = { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 };
let watcher: Location.LocationSubscription | undefined;

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (!error && data?.locations) recordLocations(data.locations);
});

export async function stopOutdoorLocation() {
  watcher?.remove();
  watcher = undefined;
  if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
}

export async function requestOutdoorLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('Permita a localização do FitGen nos ajustes para registrar o trajeto.');
  if (permission.ios?.accuracy === 'reduced' || permission.android?.accuracy === 'coarse') {
    throw new Error('Ative a localização precisa nos ajustes para registrar o trajeto por GPS.');
  }
  if (!(await Location.hasServicesEnabledAsync())) throw new Error('Ative o GPS do aparelho para continuar.');
}

export async function startOutdoorLocation(owner: string, id: string, onError: () => void) {
  const iosBackground = Platform.OS === 'ios' && (await Location.getBackgroundPermissionsAsync()).granted;
  if (iosBackground || Platform.OS === 'android') {
    if (await TaskManager.isAvailableAsync()) {
      try {
        await Location.startLocationUpdatesAsync(TASK, {
          ...options,
          activityType: Location.ActivityType.Fitness,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          foregroundService: Platform.OS === 'android' ? {
            notificationTitle: 'FitGen · Atividade ao ar livre',
            notificationBody: 'O GPS está registrando seu trajeto.',
            killServiceOnDestroy: true,
          } : undefined,
        });
        return true;
      } catch {
        // The foreground watcher remains usable in builds without background tracking.
      }
    }
  }

  watcher = await Location.watchPositionAsync(options, (point) => {
    if (readDraft(owner)?.id === id) recordLocations([point], owner);
  }, onError);
  return false;
}

export async function enableOutdoorBackground() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) return false;
  return (await Location.requestBackgroundPermissionsAsync()).granted;
}
