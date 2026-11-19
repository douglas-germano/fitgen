/**
 * Volt Fit "WeekChart": thin volt bars with rounded tops, dashed horizontal
 * grid and bold tick labels on the right, x labels below. Lives on a
 * `surface-sunken` card.
 */
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';

export type ChartPoint = { label: string; value: number };
export type TrendPoint = ChartPoint & { timestamp: number };

const TICK_W = 46;

/** Picks a round top value and 4 evenly spaced ticks above zero. */
function niceScale(max: number) {
  const raw = Math.max(max, 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { top: step * 4, ticks: [1, 2, 3, 4].map((i) => step * i) };
}

/** A time series with a labeled axis that fits the observations. */
export function TrendChart({ data, formatValue, title }: {
  data: TrendPoint[];
  formatValue: (value: number) => string;
  title: string;
}) {
  const Colors = useColors();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const first = data[0];
  const latest = data.at(-1);
  if (!first || !latest) return null;

  const low = Math.min(...data.map(({ value }) => value));
  const high = Math.max(...data.map(({ value }) => value));
  const step = Math.max(1, niceScale(high - low).ticks[0] * 2);
  const bottom = Math.max(0, Math.floor((low - step / 4) / step) * step);
  const top = Math.ceil((high + step / 4) / step) * step;
  const ticks = [top, (top + bottom) / 2, bottom];
  const height = Math.max(108, 82 * fontScale);
  const axisWidth = Math.min(width * 0.42, 68 * fontScale);
  const plotWidth = Math.max(0, width - axisWidth - Spacing.two);
  const inset = 5;
  const y = (value: number) => inset + (top - value) / (top - bottom) * (height - inset * 2);
  const duration = latest.timestamp - first.timestamp;
  const points = data.map((point) => ({
    x: duration > 0 ? inset + (point.timestamp - first.timestamp) / duration * Math.max(0, plotWidth - inset * 2) : plotWidth / 2,
    y: y(point.value),
  }));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${title}. ${data.map((point) => `${point.label}: ${formatValue(point.value)}`).join('; ')}`}>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', gap: Spacing.two, minHeight: height }}>
        {width > 0 && <>
          <Svg width={plotWidth} height={height}>
            {ticks.map((tick) => <Line key={tick} x1={0} x2={plotWidth} y1={y(tick)} y2={y(tick)} stroke={Colors.line} />)}
            {points.length > 1 && (
              <Polyline points={points.map(({ x, y: py }) => `${x},${py}`).join(' ')} fill="none" stroke={Colors.voltInk} strokeWidth={2.5} strokeLinejoin="round" />
            )}
            {points.map(({ x, y: py }, index) => (
              <Circle key={index} cx={x} cy={py} r={index === points.length - 1 ? 4 : 2.5} fill={Colors.voltInk} />
            ))}
          </Svg>
          <View style={{ width: axisWidth, justifyContent: 'space-between' }}>
            {ticks.map((tick) => <Text key={tick} variant="caption" style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>{formatValue(tick)}</Text>)}
          </View>
        </>}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two, marginRight: axisWidth, marginTop: Spacing.one }}>
        <Text variant="caption" style={{ flexShrink: 1 }}>{first.label}</Text>
        {first.label !== latest.label && <Text variant="caption" style={{ flexShrink: 1, textAlign: 'right' }}>{latest.label}</Text>}
      </View>
    </View>
  );
}

export function WeekChart({
  data,
  formatTick = (v) => `${Math.round(v)}`,
  height = 150,
  max,
  accessibilityLabel,
}: {
  data: ChartPoint[];
  formatTick?: (v: number) => string;
  height?: number;
  /** Fixed top of the scale; otherwise derived from the data. */
  max?: number;
  accessibilityLabel?: string;
}) {
  const Colors = useColors();
  const [width, setWidth] = useState(0);
  data = data.filter((point) => Number.isFinite(point.value));
  const scale = max ? { top: max, ticks: [1, 2, 3, 4].map((i) => (max / 4) * i) } : niceScale(Math.max(...data.map((d) => d.value), 0));
  const plotW = Math.max(width - TICK_W - Spacing.two, 0);
  const slot = plotW / Math.max(data.length, 1);
  const barW = 6;
  const y = (v: number) => height - (Math.max(0, Math.min(v, scale.top)) / scale.top) * height;

  return (
    <View
      accessible
      accessibilityLabel={
        accessibilityLabel ?? data.map((d) => `${d.label}: ${formatTick(d.value)}`).join(', ')
      }
      style={{ backgroundColor: Colors.surfaceSunken, borderRadius: Radius.md, borderCurve: 'continuous', padding: Spacing.four, paddingTop: Spacing.five }}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 && (
          <>
            <Svg width={plotW} height={height}>
              {scale.ticks.map((t) => (
                <Line key={t} x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={Colors.lineStrong} strokeOpacity={0.5} strokeDasharray="4 4" />
              ))}
              {data.map((d, i) => {
                const h = Math.max(height - y(d.value), d.value > 0 ? 4 : 0);
                return (
                  <Rect
                    key={i}
                    x={slot * i + slot / 2 - barW / 2}
                    y={height - h}
                    width={barW}
                    height={h}
                    rx={barW / 2}
                    fill={Colors.volt}
                  />
                );
              })}
            </Svg>
            {scale.ticks.map((t) => (
              <Text
                key={t}
                style={{ position: 'absolute', right: 0, top: y(t) - 8, width: TICK_W, textAlign: 'right', fontSize: 11, lineHeight: 16, fontWeight: '600' }}>
                {formatTick(t)}
              </Text>
            ))}
          </>
        )}
      </View>
      <View style={{ flexDirection: 'row', width: plotW, paddingTop: Spacing.three }}>
        {data.map((d, i) => (
          <Text key={i} variant="caption" style={{ flex: 1, textAlign: 'center', fontSize: 12 }} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
