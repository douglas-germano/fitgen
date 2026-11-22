export type OutdoorType = 'run' | 'walk' | 'bike';
export type RoutePoint = [latitude: number, longitude: number];
export type OutdoorRoute = RoutePoint[][];

export const OUTDOOR_NAMES = {
  run: { title: 'Corrida', recent: 'Última corrida', start: 'Iniciar corrida' },
  walk: { title: 'Caminhada', recent: 'Última caminhada', start: 'Iniciar caminhada' },
  bike: { title: 'Pedal', recent: 'Último pedal', start: 'Iniciar pedal' },
} satisfies Record<OutdoorType, { title: string; recent: string; start: string }>;

export const outdoorName = (type: OutdoorType) => `${OUTDOOR_NAMES[type].title} ao ar livre`;

export const MAX_GPS_METERS_PER_SECOND: Record<OutdoorType, number> = { run: 11, walk: 11, bike: 30 };

export function metersBetween([lat1, lon1]: RoutePoint, [lat2, lon2]: RoutePoint) {
  const rad = Math.PI / 180;
  const h = Math.sin((lat2 - lat1) * rad / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
  return 12_742_000 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function elapsedLabel(seconds: number) {
  const units = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
  return units.slice(seconds >= 3600 ? 0 : 1).map((value) => String(value).padStart(2, '0')).join(':');
}

export const distanceLabel = (meters: number) => (meters / 1000).toLocaleString('pt-BR', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}) + ' km';

export function paceLabel(seconds: number, meters: number) {
  if (!seconds || meters < 20) return '—';
  const pace = Math.round(seconds * 1000 / meters);
  return `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, '0')} /km`;
}

export function speedLabel(seconds: number, meters: number) {
  if (!seconds || !meters) return '—';
  return (meters * 3.6 / seconds).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km/h';
}

const BIKE_MET_BY_MPH = [[10, 4], [12, 6.8], [14, 8], [16, 10]] as const;

export function estimatedCalories(type: OutdoorType, meters: number, weight: number | null | undefined, seconds: number) {
  if (!weight || !Number.isFinite(weight) || weight <= 0 || !meters) return null;
  if (type === 'bike') {
    if (seconds <= 0) return null;
    // Adult Compendium, 2024. Use average speed as an effort proxy and subtract resting MET.
    const mph = meters / seconds * 3600 / 1609.344;
    const met = BIKE_MET_BY_MPH.find(([upper]) => mph < upper)?.[1] ?? 12;
    return Math.round((met - 1) * weight * seconds / 3600);
  }
  return Math.round(weight * meters / 1000 * (type === 'run' ? 1 : 0.5));
}
