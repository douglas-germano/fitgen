export type OutdoorType = 'run' | 'walk';
export type RoutePoint = [latitude: number, longitude: number];
export type OutdoorRoute = RoutePoint[][];

export const outdoorName = (type: OutdoorType) => type === 'run' ? 'Corrida ao ar livre' : 'Caminhada ao ar livre';

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

export function estimatedCalories(type: OutdoorType, meters: number, weight: number | null | undefined) {
  if (!weight || weight <= 0 || !meters) return null;
  return Math.round(weight * meters / 1000 * (type === 'run' ? 1 : 0.5));
}
