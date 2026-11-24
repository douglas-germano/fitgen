import { QueryError, Chips, Page, PageSkeleton, ProgressBar, Text } from '@/components/ui';
import { Droplets, Flame, LayoutGrid, Lock, Sparkles, Trophy, Utensils, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { BackBar, Group, GroupRow, HeaderCard, SCREEN_COLUMN, Tile, TileColors, TileRow } from '@/components/grouped';
import { Spacing } from '@/constants/theme';
import { useAchievements, useGamificationProgress, useStreaks } from '@/hooks/queries';
import { formatDayMonth, formatInt } from '@/lib/workout';
import type { Achievement } from '@/types/api';

type Filter = 'all' | 'workout' | 'nutrition' | 'hydration';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'workout', label: 'Treino' },
  { value: 'nutrition', label: 'Dieta' },
  { value: 'hydration', label: 'Hidratação' },
];

const ICONS: Record<Filter | 'other', LucideIcon> = {
  all: Trophy,
  workout: Flame,
  nutrition: Utensils,
  hydration: Droplets,
  other: LayoutGrid,
};

function categoryOf(a: Achievement): Filter | 'other' {
  const c = (a.category || '').toLowerCase();
  if (c.includes('hidrat') || c.includes('hydra') || c.includes('water')) return 'hydration';
  if (c.includes('diet') || c.includes('nutri') || c.includes('meal')) return 'nutrition';
  if (c.includes('work') || c.includes('trein') || c.includes('streak') || c.includes('consist')) return 'workout';
  return 'other';
}

export default function AchievementsScreen() {
  const achievements = useAchievements();
  const progress = useGamificationProgress();
  const streaks = useStreaks();
  const [filter, setFilter] = useState<Filter>('all');

  if (achievements.isLoading || progress.isLoading) return <PageSkeleton title="Conquistas" back tab={false} />;

  if (achievements.error || progress.error) return <QueryError title="Conquistas" back error={achievements.error ?? progress.error} onRetry={() => { achievements.refetch(); progress.refetch(); }} />;

  const p = progress.data;
  const streak = streaks.data?.workout_streak ?? 0;
  const all = achievements.data ?? [];
  const list = all.filter((a) => filter === 'all' || categoryOf(a) === filter);
  const unlocked = list
    .filter((a) => a.unlocked)
    .sort((a, b) => (b.unlocked_at ?? '').localeCompare(a.unlocked_at ?? ''));
  const locked = list.filter((a) => !a.unlocked);

  const row = (a: Achievement) => (
    <GroupRow key={a.id} icon={a.unlocked ? ICONS[categoryOf(a)] : Lock} title={a.name} caption={a.description}
      value={a.unlocked ? (a.unlocked_at ? formatDayMonth(a.unlocked_at, false) : null) : (a.xp_reward ? `+${a.xp_reward} XP` : null)}
      accessibilityLabel={`${a.name}. ${a.description}. ${a.unlocked ? 'Desbloqueada' : 'Bloqueada'}`} />
  );

  return (
    <Page
      tab={false}
      topBar={<BackBar />}
      contentStyle={SCREEN_COLUMN}
      refreshing={achievements.isRefetching}
      onRefresh={() => {
        achievements.refetch();
        progress.refetch();
        streaks.refetch();
      }}>
      <HeaderCard title={`Nível ${p?.level ?? 1}`} value={`${formatInt(p?.xp ?? 0)} / ${formatInt(p?.next_level_xp ?? 100)} XP`}>
        <View style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.three }}>
          <ProgressBar value={p?.progress_percent ?? 0} />
          <Text muted style={{ fontSize: 13 }}>Continue treinando para passar de nível.</Text>
        </View>
      </HeaderCard>

      <TileRow>
        <Tile icon={Flame} color={TileColors.orange} title="Sequência" value={`${streak} ${streak === 1 ? 'dia' : 'dias'}`} />
        <Tile icon={Trophy} color={TileColors.green} title="Conquistas" value={`${all.filter((a) => a.unlocked).length} de ${all.length}`} />
        <Tile icon={Sparkles} color={TileColors.purple} title="Pontos" value={`${formatInt(p?.xp ?? 0)} XP`} />
      </TileRow>

      <Chips options={FILTERS} value={filter} onChange={setFilter} />

      {list.length === 0 && (
        <Group>
          <GroupRow icon={Trophy} title="Nenhuma conquista nesta categoria" />
        </Group>
      )}
      {unlocked.length > 0 && <Group title="Desbloqueadas">{unlocked.map(row)}</Group>}
      {locked.length > 0 && <Group title="Para desbloquear">{locked.map(row)}</Group>}
    </Page>
  );
}
