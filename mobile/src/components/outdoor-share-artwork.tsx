import { G, Image, Line, Polyline, Rect, Text } from 'react-native-svg';

import { projectRoute } from '@/components/outdoor-summary';
import { LightColors } from '@/constants/theme';
import { distanceLabel, elapsedLabel, OUTDOOR_NAMES, paceLabel, speedLabel } from '@/lib/outdoor';
import type { OutdoorRecord } from '@/lib/outdoor-recording';

export const outdoorShareModels = [
  { id: 'summary', label: 'Resumo' },
  { id: 'route', label: 'Percurso' },
  { id: 'details', label: 'Ficha' },
  { id: 'grid', label: 'Blocos' },
  { id: 'date', label: 'Data' },
  { id: 'strip', label: 'Faixa' },
] as const;

export type OutdoorShareModel = (typeof outdoorShareModels)[number]['id'];

const ink = '#fff';
const accent = LightColors.volt;

type Metric = { label: string; value: string };

function Brand({ x, y, mark }: { x: number; y: number; mark: string }) {
  return (
    <G x={x} y={y}>
      <Image href={mark} y={-15} width={19} height={18} />
      <Text x={25} fill={ink} fontSize={15} fontWeight="800">FitGen</Text>
    </G>
  );
}

function Stat({ x, y, metric, size = 24 }: { x: number; y: number; metric: Metric; size?: number }) {
  return (
    <G x={x} y={y}>
      <Text fill={ink} fontSize={11} fontWeight="600">{metric.label}</Text>
      <Text y={size + 5} fill={ink} fontSize={size} fontWeight="800">{metric.value}</Text>
    </G>
  );
}

export function OutdoorShareArtwork({ model, record, height, showRoute, mark }: {
  model: OutdoorShareModel;
  record: OutdoorRecord;
  height: number;
  showRoute: boolean;
  mark: string;
}) {
  const { outdoor_type: type, duration_seconds: seconds, distance_meters: meters } = record;
  const title = OUTDOOR_NAMES[type].title;
  const start = new Date(record.started_at);
  const day = start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  const distance = { label: 'Distância', value: distanceLabel(meters) };
  const time = { label: 'Tempo ativo', value: elapsedLabel(seconds) };
  const average = type === 'bike'
    ? { label: 'Velocidade média', value: speedLabel(seconds, meters) }
    : { label: 'Ritmo médio', value: paceLabel(seconds, meters) };
  const metrics = [distance, time, average];
  if (record.calories != null) metrics.push({ label: 'Calorias estimadas', value: `${record.calories} kcal` });

  const midpoint = height / 2;
  if (model === 'date') {
    const weekday = start.toLocaleDateString('pt-BR', { weekday: 'long' });
    return (
      <G x={40} y={midpoint - 77}>
        <Rect width={280} height={154} rx={26} fill="none" stroke={ink} strokeWidth={1.5} />
        <Brand mark={mark} x={20} y={33} />
        <Text x={260} y={33} textAnchor="end" fill={accent} fontSize={13} fontWeight="700">{title}</Text>
        <Text x={20} y={95} fill={ink} fontSize={30} fontWeight="800">{weekday}</Text>
        <Text x={20} y={122} fill={ink} fontSize={14}>{day}</Text>
      </G>
    );
  }

  if (model === 'grid') {
    return (
      <G x={32} y={midpoint - 106}>
        <Brand mark={mark} x={0} y={16} />
        <Text x={296} y={16} textAnchor="end" fill={accent} fontSize={13} fontWeight="700">{title}</Text>
        {metrics.map((metric, index) => {
          const x = index % 2 * 152;
          const y = 34 + Math.floor(index / 2) * 83;
          return (
            <G key={metric.label} x={x} y={y}>
              <Rect width={144} height={75} rx={13} fill="none" stroke={ink} strokeWidth={1} />
              <Stat x={11} y={23} metric={metric} size={22} />
            </G>
          );
        })}
      </G>
    );
  }

  if (model === 'details') {
    return (
      <G x={34} y={midpoint - 112}>
        <Brand mark={mark} x={0} y={0} />
        <Text x={292} textAnchor="end" fill={accent} fontSize={14} fontWeight="700">{title}</Text>
        <Text y={29} fill={ink} fontSize={12}>{day}</Text>
        {metrics.map((metric, index) => (
          <G key={metric.label} y={52 + 39 * index}>
            <Line x2={292} stroke={ink} strokeOpacity={0.55} />
            <Text y={25} fill={ink} fontSize={13}>{metric.label}</Text>
            <Text x={292} y={25} textAnchor="end" fill={ink} fontSize={19} fontWeight="800">{metric.value}</Text>
          </G>
        ))}
      </G>
    );
  }

  if (model === 'strip') {
    return (
      <G x={28} y={height - 138}>
        <Brand mark={mark} x={0} y={0} />
        <Text x={304} textAnchor="end" fill={accent} fontSize={13} fontWeight="700">{title}</Text>
        <Line y1={16} x2={304} y2={16} stroke={accent} strokeWidth={2} />
        {metrics.slice(0, 3).map((metric, index) => (
          <Stat key={metric.label} x={index * 103} y={43} metric={metric} size={18} />
        ))}
      </G>
    );
  }

  const route = model === 'route' && showRoute ? projectRoute(record.route, 296, height - 282, 20) : [];
  const top = route.length ? 48 : midpoint - 108;
  return (
    <G x={32} y={top}>
      <Brand mark={mark} x={0} y={14} />
      <Text x={296} y={14} textAnchor="end" fill={accent} fontSize={14} fontWeight="700">{title}</Text>
      <Stat x={0} y={62} metric={distance} size={51} />
      {route.length > 0 && (
        <G y={126}>
          {route.map((segment, index) => segment.length > 1 && (
            <Polyline key={index} points={segment.map(([x, y]) => `${x},${y}`).join(' ')}
              stroke={accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </G>
      )}
      <G y={route.length ? height - 151 : 143}>
        <Line x2={296} stroke={accent} strokeWidth={2} />
        <Stat x={0} y={26} metric={time} />
        <Stat x={150} y={26} metric={average} />
      </G>
    </G>
  );
}
