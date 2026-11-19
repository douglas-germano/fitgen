import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Card, Row, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { distanceLabel, elapsedLabel, paceLabel, type OutdoorRoute } from '@/lib/outdoor';
import { useColors } from '@/providers/theme';

export function OutdoorStats({ seconds, meters, calories }: { seconds: number; meters: number; calories: number | null }) {
  const speed = seconds && meters ? (meters * 3.6 / seconds).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km/h' : '—';
  return (
    <Card style={{ gap: Spacing.four }}>
      <View style={{ alignItems: 'center' }}>
        <Text variant="caption">Tempo ativo</Text>
        <Text variant="display" style={{ fontSize: 50, lineHeight: 62, fontVariant: ['tabular-nums'] }}>{elapsedLabel(seconds)}</Text>
      </View>
      <Row style={{ gap: Spacing.three }}>
        <Stat label="Distância" value={distanceLabel(meters)} />
        <Stat label="Ritmo médio" value={paceLabel(seconds, meters)} />
      </Row>
      <Row style={{ gap: Spacing.three }}>
        <Stat label="Calorias ativas estimadas" value={calories === null ? '—' : `${calories} kcal`} />
        <Stat label="Velocidade média" value={speed} />
      </Row>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption">{label}</Text>
      <Text variant="titleMd" style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

export function OutdoorTrace({ route }: { route: OutdoorRoute }) {
  const colors = useColors();
  const plotted = projectRoute(route);
  if (!plotted.length) return null;
  const first = plotted[0][0];
  const last = plotted.at(-1)!.at(-1)!;

  return (
    <Card style={{ gap: Spacing.two }}>
      <Text variant="titleMd">Trajeto GPS</Text>
      <View style={{ backgroundColor: colors.surfaceSunken, borderRadius: 16, overflow: 'hidden' }}>
        <Svg width="100%" height={192} viewBox="0 0 320 192" accessibilityLabel="Traçado do percurso registrado por GPS">
          {plotted.map((segment, index) => segment.length > 1 && (
            <Polyline key={index} points={segment.map(([x, y]) => `${x},${y}`).join(' ')}
              stroke={colors.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
          <Circle cx={first[0]} cy={first[1]} r={5} fill={colors.volt} stroke={colors.ink} strokeWidth={2} />
          {first !== last && <Circle cx={last[0]} cy={last[1]} r={4} fill={colors.ink} />}
        </Svg>
      </View>
    </Card>
  );
}

function projectRoute(route: OutdoorRoute) {
  const origin = route[0]?.[0];
  if (!origin) return [];

  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  const latitudeScale = Math.cos(origin[0] * Math.PI / 180);
  const segments = route.map((segment) => segment.map(([lat, lon]) => {
    const x = ((lon - origin[1] + 540) % 360 - 180) * latitudeScale;
    const y = origin[0] - lat;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    return [x, y];
  }));
  const scale = Math.min(276 / Math.max(0.00001, maxX - minX), 156 / Math.max(0.00001, maxY - minY));
  return segments.map((segment) => segment.map(([x, y]) => [
    160 + (x - (minX + maxX) / 2) * scale,
    96 + (y - (minY + maxY) / 2) * scale,
  ]));
}
