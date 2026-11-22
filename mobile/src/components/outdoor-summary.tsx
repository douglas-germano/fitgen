import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Row, SectionHeader, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { distanceLabel, elapsedLabel, paceLabel, type OutdoorRoute, type OutdoorType } from '@/lib/outdoor';
import { useColors } from '@/providers/theme';

export function OutdoorStats({ type, seconds, meters, calories, summary = false }: {
  type: OutdoorType;
  seconds: number;
  meters: number;
  calories: number | null;
  summary?: boolean;
}) {
  const colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  const stackStats = width / Math.max(1, fontScale) < 280;
  const speed = seconds && meters ? (meters * 3.6 / seconds).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km/h' : '—';
  const stats = [
    { label: summary ? 'Tempo ativo' : 'Distância', value: summary ? elapsedLabel(seconds) : distanceLabel(meters) },
    ...(type === 'bike' ? [] : [{ label: 'Ritmo médio', value: paceLabel(seconds, meters) }]),
    { label: 'Calorias estimadas', value: calories === null ? '—' : `${calories} kcal` },
    { label: 'Velocidade média', value: speed },
  ];
  return (
    <View style={{ gap: Spacing.four }}>
      <View style={{
        alignItems: summary ? 'flex-start' : 'center',
        padding: Spacing.five,
        borderRadius: Radius.md, borderCurve: 'continuous',
        backgroundColor: colors.surfaceSunken,
      }}>
        <Text variant="label" muted>{summary ? 'Distância total' : 'Tempo ativo'}</Text>
        <Text variant="display" style={{
          fontSize: width < 360 || fontScale > 1.3 ? 34 : 50,
          lineHeight: width < 360 || fontScale > 1.3 ? 44 : 60,
          fontVariant: ['tabular-nums'],
          textAlign: summary ? 'left' : 'center',
        }}>
          {summary ? distanceLabel(meters) : elapsedLabel(seconds)}
        </Text>
      </View>
      <Row style={{ flexWrap: 'wrap', alignItems: 'stretch', columnGap: Spacing.four, rowGap: Spacing.two }}>
        {stats.map(({ label, value }) => (
          <View key={label} style={{
            flexGrow: 1, flexBasis: stackStats ? '100%' : '45%', gap: Spacing.one,
            borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingTop: Spacing.two,
          }}>
            <Text variant="label" muted>{label}</Text>
            <Text variant="titleLg" style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
          </View>
        ))}
      </Row>
    </View>
  );
}

export function OutdoorTrace({ route, emptyMessage }: { route: OutdoorRoute; emptyMessage: string }) {
  const colors = useColors();
  const plotted = projectRoute(route);
  if (!plotted.length) return (
    <View style={{ gap: Spacing.two }}>
      <SectionHeader title="Trajeto GPS" />
      <Text variant="label" muted>{emptyMessage}</Text>
    </View>
  );
  const first = plotted[0][0];
  const last = plotted.at(-1)!.at(-1)!;

  return (
    <View style={{ gap: Spacing.three }}>
      <SectionHeader title="Trajeto GPS" />
      <View style={{ backgroundColor: colors.surfaceSunken, borderRadius: Radius.md, borderCurve: 'continuous', overflow: 'hidden' }}>
        <Svg width="100%" height={192} viewBox="0 0 320 192" accessibilityLabel="Traçado do percurso registrado por GPS">
          {plotted.map((segment, index) => segment.length > 1 && (
            <Polyline key={index} points={segment.map(([x, y]) => `${x},${y}`).join(' ')}
              stroke={colors.voltInk} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
          <Circle cx={first[0]} cy={first[1]} r={5} fill={colors.volt} stroke={colors.ink} strokeWidth={2} />
          {first !== last && <Circle cx={last[0]} cy={last[1]} r={4} fill={colors.ink} />}
        </Svg>
      </View>
    </View>
  );
}

function projectRoute(route: OutdoorRoute, width = 320, height = 192, pad = 18) {
  const nonempty = route.filter((segment) => segment.length > 0);
  const origin = nonempty[0]?.[0];
  if (!origin) return [];

  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  const latitudeScale = Math.cos(origin[0] * Math.PI / 180);
  const segments = nonempty.map((segment) => segment.map(([lat, lon]) => {
    const x = ((lon - origin[1] + 540) % 360 - 180) * latitudeScale;
    const y = origin[0] - lat;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    return [x, y];
  }));
  const scale = Math.min((width - pad * 2) / Math.max(0.00001, maxX - minX), (height - pad * 2) / Math.max(0.00001, maxY - minY));
  return segments.map((segment) => segment.map(([x, y]) => [
    width / 2 + (x - (minX + maxX) / 2) * scale,
    height / 2 + (y - (minY + maxY) / 2) * scale,
  ]));
}

/** Small square drawing of a route, for list cards. Falls back to an icon slot when there are no points. */
export function RouteThumbnail({ route, size = 64 }: { route: OutdoorRoute | undefined; size?: number }) {
  const colors = useColors();
  const plotted = route ? projectRoute(route, size, size, 10) : [];
  return (
    <View style={{ width: size, height: size, borderRadius: Radius.sm, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.surfaceChip }}>
      {plotted.length > 0 && (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {plotted.map((segment, index) => segment.length > 1 && (
            <Polyline key={index} points={segment.map(([x, y]) => `${x},${y}`).join(' ')}
              stroke={colors.voltInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
          <Circle cx={plotted[0][0][0]} cy={plotted[0][0][1]} r={3.5} fill={colors.volt} stroke={colors.ink} strokeWidth={1.5} />
        </Svg>
      )}
    </View>
  );
}
