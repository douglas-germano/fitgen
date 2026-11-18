/**
 * Volt Fit "WeekChart": thin volt bars with rounded tops, dashed horizontal
 * grid and bold tick labels on the right, x labels below. Lives on a
 * `surface-sunken` card.
 */
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';

export type ChartPoint = { label: string; value: number };

const TICK_W = 46;

/** Picks a round top value and 4 evenly spaced ticks above zero. */
function niceScale(max: number) {
  const raw = Math.max(max, 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { top: step * 4, ticks: [1, 2, 3, 4].map((i) => step * i) };
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
