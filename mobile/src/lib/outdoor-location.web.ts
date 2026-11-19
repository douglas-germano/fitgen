import { readDraft, recordLocations } from './outdoor-recording';

let watcher: number | undefined;

export async function requestOutdoorLocation() {
  if (!navigator.geolocation) throw new Error('A localização não está disponível neste navegador.');
  if (navigator.permissions && (await navigator.permissions.query({ name: 'geolocation' }).catch(() => null))?.state === 'denied') {
    throw new Error('Permita a localização do FitGen nas configurações deste navegador.');
  }
}

export async function startOutdoorLocation(owner: string, id: string, onError: () => void) {
  watcher = navigator.geolocation.watchPosition(({ coords, timestamp }) => {
    if (readDraft(owner)?.id !== id) return;
    recordLocations([{
      timestamp,
      coords: {
        latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy,
        altitude: coords.altitude, altitudeAccuracy: coords.altitudeAccuracy,
        heading: coords.heading, speed: coords.speed,
      },
    }], owner);
  }, onError, { enableHighAccuracy: true, maximumAge: 0 });
  return false;
}

export async function stopOutdoorLocation() {
  if (watcher !== undefined) navigator.geolocation.clearWatch(watcher);
  watcher = undefined;
}

export async function enableOutdoorBackground() {
  return false;
}
