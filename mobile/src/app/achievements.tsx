import { QueryError , BadgeIcon, Chips, EmptyState, Page, PageSkeleton, ProgressBar, Row, Text, TopBar } from '@/components/ui';
import { Droplets, Flame, Heart, LayoutGrid, Lock, Trophy, Utensils, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';
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

const ICONS: Record<string, LucideIcon> = {
  workout: Flame,
  consistency: Flame,
  nutrition: Utensils,
  diet: Utensils,
  hydration: Heart,
};

function categoryOf(a: Achievement): Filter | 'other' {
  const c = (a.category || '').toLowerCase();
  if (c.includes('hidrat') || c.includes('hydra') || c.includes('water')) return 'hydration';
  if (c.includes('diet') || c.includes('nutri') || c.includes('meal')) return 'nutrition';
  if (c.includes('work') || c.includes('trein') || c.includes('streak') || c.includes('consist')) return 'workout';
  return 'other';
}

export default function AchievementsScreen() {
  const Colors = useColors();
  const achievements = useAchievements();
  const progress = useGamificationProgress();
  const streaks = useStreaks();
  const [filter, setFilter] = useState<Filter>('all');

  if (achievements.isLoading || progress.isLoading) return <PageSkeleton title="Conquistas" back tab={false} />;

  if (achievements.error || progress.error) return <QueryError title="Conquistas" back error={achievements.error ?? progress.error} onRetry={() => { achievements.refetch(); progress.refetch(); }} />;

  const p = progress.data;
  const streak = streaks.data?.workout_streak ?? 0;
  const list = (achievements.data ?? [])
    .filter((a) => filter === 'all' || categoryOf(a) === filter)
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked));

  return (
    <Page
      tab={false}
      topBar={<TopBar title="Conquistas" back />}
      refreshing={achievements.isRefetching}
      onRefresh={() => {
        achievements.refetch();
        progress.refetch();
        streaks.refetch();
      }}>
      {/* Level card */}
      <View style={{ backgroundColor: Colors.volt, borderRadius: 20, borderCurve: 'continuous', padding: Spacing.five, gap: Spacing.four }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text variant="titleSm" color={Colors.onVolt}>
              Nível
            </Text>
            <Text color={Colors.onVolt} style={{ fontSize: 64, lineHeight: 68, fontWeight: '800', letterSpacing: -2 }}>
              {String(p?.level ?? 1).padStart(2, '0')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', paddingBottom: Spacing.two }}>
            <Text variant="titleLg" color={Colors.onVolt}>
              {streak} {streak === 1 ? 'dia' : 'dias'}
            </Text>
            <Text variant="label" color={Colors.onVolt} style={{ fontWeight: '400' }}>
              de sequência
            </Text>
          </View>
        </Row>
        <ProgressBar value={p?.progress_percent ?? 0} color={Colors.onVolt} trackColor="rgba(17,18,20,0.15)" />
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="label" color={Colors.onVolt} style={{ fontWeight: '400', fontSize: 12, flex: 1 }}>
            Continue treinando para passar de nível!
          </Text>
          <Text variant="label" color={Colors.onVolt} style={{ fontSize: 12 }}>
            {formatInt(p?.xp ?? 0)} / {formatInt(p?.next_level_xp ?? 100)} XP
          </Text>
        </Row>
      </View>

      <Chips options={FILTERS} value={filter} onChange={setFilter} />

      {list.length === 0 ? (
        <EmptyState icon={Trophy} message="Nenhuma conquista nesta categoria." />
      ) : (
        <Row style={{ flexWrap: 'wrap', gap: Spacing.four, alignItems: 'stretch' }}>
          {list.map((a) => {
            const cat = categoryOf(a);
            const icon = ICONS[cat] ?? (cat === 'other' ? LayoutGrid : Droplets);
            return (
              <View
                key={a.id}
                accessible
                accessibilityLabel={`${a.name}. ${a.description}. ${a.unlocked ? 'Desbloqueada' : 'Bloqueada'}`}
                style={{
                  width: '47%',
                  flexGrow: 1,
                  backgroundColor: Colors.surfaceSunken,
                  borderRadius: Radius.md,
                  borderCurve: 'continuous',
                  padding: Spacing.five,
                  gap: Spacing.two,
                }}>
                <BadgeIcon icon={a.unlocked ? icon : Lock} tone={a.unlocked ? 'volt' : 'chip'} size={44} />
                <Text variant="titleSm" style={{ fontSize: 15, marginTop: Spacing.three }}>
                  {a.name}
                </Text>
                <Text muted style={{ fontSize: 12, lineHeight: 17 }}>
                  {a.description}
                </Text>
                <View style={{ flex: 1 }} />
                {a.unlocked ? (
                  <Text variant="label" color={Colors.voltInk} style={{ fontWeight: '600', marginTop: Spacing.two }}>
                    Desbloqueada{a.unlocked_at ? ` · ${formatDayMonth(a.unlocked_at, false)}` : ''}
                  </Text>
                ) : (
                  <Text variant="caption" style={{ fontSize: 12, marginTop: Spacing.two }}>
                    Bloqueada{a.xp_reward ? ` · +${a.xp_reward} XP` : ''}
                  </Text>
                )}
              </View>
            );
          })}
        </Row>
      )}
    </Page>
  );
}
