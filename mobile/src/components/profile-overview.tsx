import { router } from 'expo-router';
import { BadgeCheck, CalendarDays, Droplets, Dumbbell, Flame, Trophy, Users, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeaderCard, Tile, TileColors, TileRow } from '@/components/grouped';
import { Dialog, ListItem, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAchievements, useWorkoutHistory } from '@/hooks/queries';
import { distanceLabel } from '@/lib/outdoor';
import { profileWeek } from '@/lib/profile-week';
import { useColors } from '@/providers/theme';
import type { Achievement } from '@/types/api';

const dateWithMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });

/** Medal finishes, newest first: gold, silver, bronze, volt, steel. */
type MedalFinish = { light: string; dark: string; rim: string; ink: string };
const MEDALS: MedalFinish[] = [
  { light: '#ffe58a', dark: '#c9971c', rim: '#f6d35b', ink: '#5a3d00' },
  { light: '#f4f6f8', dark: '#9aa3ad', rim: '#d5dbe1', ink: '#323a42' },
  { light: '#ffd2a8', dark: '#b8692e', rim: '#e9a26b', ink: '#4a2307' },
  { light: '#e4ff9c', dark: '#7fbf00', rim: '#bfef3c', ink: '#243400' },
  { light: '#cfe3ff', dark: '#4f7fc4', rim: '#93b9ee', ink: '#10284d' },
];

/** Shortcut tile glyph colors (fixed, like the rest of the medal art). */
const TILE = { week: TileColors.orange, community: TileColors.purple, premium: TileColors.blue };

export function activeTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}min` : ''}` : `${minutes} min`;
}

function AchievementGlyph({ category, color }: { category: string; color: string }) {
  const props = { size: 22, color, strokeWidth: 2.4 };
  if (/streak|consist/i.test(category)) return <Flame {...props} />;
  if (/work|trein/i.test(category)) return <Dumbbell {...props} />;
  if (/hydr|hidrat/i.test(category)) return <Droplets {...props} />;
  if (/nutri|diet/i.test(category)) return <Utensils {...props} />;
  return <Trophy {...props} />;
}

// ---------- Shortcut tiles ----------

export function ProfileTiles({ planTitle, planCaption }: { planTitle: string; planCaption: string }) {
  const history = useWorkoutHistory();
  const [weekOpen, setWeekOpen] = useState(false);
  const { days, sessions, seconds } = profileWeek(history.data ?? [], new Date());
  const range = `${dateWithMonth.format(days[0].date)} a ${dateWithMonth.format(days[6].date)}`;
  const weekCaption = history.data === undefined
    ? (history.error ? 'Indisponível' : 'Carregando…')
    : sessions.length ? `${sessions.length} ${sessions.length === 1 ? 'treino' : 'treinos'} · ${activeTime(seconds)}` : 'Nenhum treino ainda';

  return (
    <>
      <TileRow>
        <Tile icon={CalendarDays} color={TILE.week} title="Sua semana" caption={weekCaption} onPress={() => setWeekOpen(true)} />
        <Tile icon={Users} color={TILE.community} title="Comunidade" caption="Pessoas e grupos" onPress={() => router.push('/(tabs)/social')} />
        <Tile icon={BadgeCheck} color={TILE.premium} title={planTitle} caption={planCaption} onPress={() => router.push('/paywall')} />
      </TileRow>
      {weekOpen && (
        <Dialog visible title="Sua semana" description={range} onClose={() => setWeekOpen(false)}>
          {sessions.length ? sessions.map((session) => (
            <ListItem key={session.id} icon={Dumbbell} title={session.workout_name}
              caption={`${dateWithMonth.format(new Date(session.started_at))} · ${activeTime(session.duration_seconds)}${session.outdoor_type && session.distance_meters != null ? ` · ${distanceLabel(session.distance_meters)}` : ''}`} />
          )) : <Text muted>Nenhum treino registrado nesta semana.</Text>}
        </Dialog>
      )}
    </>
  );
}

// ---------- Medals ----------

export function ProfileMedals() {
  const colors = useColors();
  const achievements = useAchievements();
  const [selected, setSelected] = useState<Achievement | null>(null);
  const unlocked = (achievements.data ?? [])
    .filter((item) => item.unlocked)
    .sort((a, b) => (b.unlocked_at ?? '').localeCompare(a.unlocked_at ?? ''));

  return (
    <HeaderCard title="Minhas medalhas" value={achievements.data ? String(unlocked.length) : null} onPress={() => router.push('/achievements')}>
      {unlocked.length ? (
        <View style={styles.medalRow}>
          {unlocked.slice(0, MEDALS.length).map((item, i) => (
            <Medal key={item.id} achievement={item} finish={MEDALS[i]} onPress={() => setSelected(item)} />
          ))}
          {Array.from({ length: Math.max(0, MEDALS.length - unlocked.length) }, (_, i) => (
            <View key={`empty-${i}`} style={[styles.medal, styles.medalEmpty, { borderColor: colors.line }]} />
          ))}
        </View>
      ) : (
        <Text muted style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.four }}>
          {achievements.error ? 'Não foi possível carregar suas medalhas.' : achievements.data ? 'Treine para ganhar sua primeira medalha.' : 'Carregando suas medalhas…'}
        </Text>
      )}
      {selected && (
        <Dialog visible title={selected.name} onClose={() => setSelected(null)}>
          <Text muted>{selected.description}</Text>
        </Dialog>
      )}
    </HeaderCard>
  );
}

function Medal({ achievement, finish, onPress }: { achievement: Achievement; finish: MedalFinish; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={achievement.name} onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <View style={[styles.medal, { backgroundColor: finish.light, borderColor: finish.dark, transform: [{ rotate: '45deg' }] }]}>
        <View style={[styles.medalInner, { borderColor: finish.rim }]} />
        <View style={{ transform: [{ rotate: '-45deg' }] }}>
          <AchievementGlyph category={achievement.category} color={finish.ink} />
        </View>
      </View>
    </Pressable>
  );
}

export { Group as ProfileGroup, GroupRow as ProfileRow } from '@/components/grouped';

const styles = StyleSheet.create({
  medalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.five, paddingTop: Spacing.two, paddingBottom: Spacing.five,
  },
  medal: {
    width: 40, height: 40, borderRadius: 11, borderWidth: 2.5, margin: 8, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  medalInner: { position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: 7, borderWidth: 1.5 },
  medalEmpty: { borderStyle: 'dashed', transform: [{ rotate: '45deg' }] },
});
