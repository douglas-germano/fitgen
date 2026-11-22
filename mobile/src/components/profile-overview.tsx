import { router } from 'expo-router';
import { ArrowUpRight, ChevronRight, Droplets, Dumbbell, Flame, History, Ruler, Trophy, Utensils, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Dialog, IconButton, ListItem, Row, SectionHeader, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAchievements, useWorkoutHistory } from '@/hooks/queries';
import { distanceLabel } from '@/lib/outdoor';
import { profileWeek } from '@/lib/profile-week';
import { WEEKDAY_SHORT } from '@/lib/workout';
import { useAppTheme, useColors } from '@/providers/theme';
import type { Achievement } from '@/types/api';

const dateWithMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
const kilometers = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const achievementStamps = [
  { rim: '#85923c', fill: '#e5eb9d', ink: '#29320a' },
  { rim: '#659582', fill: '#c8f0dc', ink: '#1c4534' },
  { rim: '#9f7446', fill: '#f1d099', ink: '#432607' },
];

function activeTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}min` : ''}` : `${minutes} min`;
}

function achievementIcon(category: string) {
  if (/streak|consist/i.test(category)) return Flame;
  if (/work|trein/i.test(category)) return Dumbbell;
  if (/hydr|hidrat/i.test(category)) return Droplets;
  if (/nutri|diet/i.test(category)) return Utensils;
  return Trophy;
}

export function ProfileOverview() {
  const colors = useColors();
  const { scheme } = useAppTheme();
  const history = useWorkoutHistory();
  const achievements = useAchievements();
  const [weekOpen, setWeekOpen] = useState(false);
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const { days, sessions, seconds, outdoorMeters } = profileWeek(history.data ?? [], new Date());
  const start = days[0].date;
  const end = days[6].date;
  const range = `${start.getMonth() === end.getMonth() ? start.getDate() : dateWithMonth.format(start)} a ${dateWithMonth.format(end)}`;
  const weeklyStats = [
    { label: 'Treinos', value: String(sessions.length) },
    { label: 'Tempo ativo', value: activeTime(seconds) },
    { label: 'Ao ar livre', value: `${kilometers.format(outdoorMeters / 1000)} km` },
  ];
  const earned = (achievements.data ?? [])
    .filter((item) => item.unlocked)
    .sort((a, b) => (b.unlocked_at ?? '').localeCompare(a.unlocked_at ?? ''))
    .slice(0, achievementStamps.length);
  const divider = scheme === 'dark' ? '#465142' : '#d7e8b7';

  return (
    <>
      <View style={{ gap: Spacing.two }}>
        <Card style={{ gap: Spacing.three, backgroundColor: colors.voltSoft, borderWidth: 1, borderColor: divider }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMd" accessibilityRole="header">Sua semana</Text>
              <Text variant="caption">{range}</Text>
            </View>
            {history.data !== undefined && (
              <IconButton icon={ArrowUpRight} label="Ver resumo da semana" onPress={() => setWeekOpen(true)} />
            )}
          </Row>
          {history.data !== undefined ? (
            <>
              <Row style={{ marginVertical: Spacing.one, alignItems: 'flex-start' }}>
                {weeklyStats.map(({ label, value }, i) => (
                  <View key={label} style={{ flex: 1, minWidth: 0, paddingLeft: i ? Spacing.two : 0, borderLeftWidth: i ? 1 : 0, borderColor: divider }}>
                    <Text variant="titleLg" color={colors.voltInk} style={{ fontSize: 19, lineHeight: 24 }}>{value}</Text>
                    <Text variant="caption">{label}</Text>
                  </View>
                ))}
              </Row>
              <Row style={{ paddingTop: Spacing.two, borderTopWidth: 1, borderColor: divider }}>
                {days.map(({ date, active }) => (
                  <View key={date.getDay()} accessible accessibilityLabel={`${WEEKDAY_SHORT[date.getDay()]}, ${active ? 'com atividade' : 'sem atividade registrada'}`}
                    style={{ flex: 1, alignItems: 'center', gap: Spacing.one }}>
                    <View style={{ width: '76%', height: 3, borderRadius: 3, backgroundColor: active ? colors.voltInk : divider }} />
                    <Text variant="caption" style={{ fontSize: 10 }}>{WEEKDAY_SHORT[date.getDay()]}</Text>
                  </View>
                ))}
              </Row>
            </>
          ) : history.error ? (
            <Text muted>Não foi possível carregar seus treinos.</Text>
          ) : (
            <Text muted>Carregando seu resumo…</Text>
          )}
        </Card>
        <Row style={{ alignItems: 'stretch' }}>
          <ProfileShortcut label="Histórico" icon={History} onPress={() => router.push('/workout/history')} />
          <ProfileShortcut label="Medidas" icon={Ruler} onPress={() => router.push('/(tabs)/metrics')} />
        </Row>
      </View>

      <View style={{ gap: Spacing.two }}>
        <SectionHeader title="Conquistas" action="Ver todas" onAction={() => router.push('/achievements')} />
        <Card style={{ padding: Spacing.three }}>
          {earned.length ? (
            <Row style={{ alignItems: 'flex-start' }}>
              {earned.map((item, i) => {
                const stamp = achievementStamps[i];
                const Icon = achievementIcon(item.category);
                return (
                  <Pressable key={item.id} onPress={() => setAchievement(item)} accessibilityRole="button"
                    style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: Spacing.one, opacity: pressed ? 0.72 : 1 })}>
                    <View style={[styles.medal, { backgroundColor: stamp.fill, borderColor: stamp.rim }]}>
                      <Icon size={21} color={stamp.ink} />
                    </View>
                    <Text variant="titleSm" style={{ textAlign: 'center', fontSize: 12, lineHeight: 16 }}>{item.name}</Text>
                  </Pressable>
                );
              })}
            </Row>
          ) : (
            <Text muted>{achievements.error ? 'Não foi possível carregar suas conquistas.' : achievements.data ? 'Você ainda não desbloqueou conquistas.' : 'Carregando suas conquistas…'}</Text>
          )}
        </Card>
      </View>

      {weekOpen && (
        <Dialog visible title="Sua semana" description={range} onClose={() => setWeekOpen(false)}>
          {sessions.length ? sessions.map((session) => (
            <ListItem key={session.id} icon={Dumbbell} title={session.workout_name}
              caption={`${dateWithMonth.format(new Date(session.started_at))} · ${activeTime(session.duration_seconds)}${session.outdoor_type && session.distance_meters != null ? ` · ${distanceLabel(session.distance_meters)}` : ''}`} />
          )) : <Text muted>Nenhum treino registrado nesta semana.</Text>}
        </Dialog>
      )}
      {achievement && (
        <Dialog visible title={achievement.name} onClose={() => setAchievement(null)}>
          <Text muted>{achievement.description}</Text>
        </Dialog>
      )}
    </>
  );
}

function ProfileShortcut({ label, icon: Icon, onPress }: { label: string; icon: LucideIcon; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [styles.shortcut, { backgroundColor: colors.surfaceSunken, borderColor: colors.line, opacity: pressed ? 0.72 : 1 }]}>
      <Icon size={16} color={colors.voltInk} />
      <Text variant="titleSm" style={{ flex: 1, fontSize: 13 }}>{label}</Text>
      <ChevronRight size={14} color={colors.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shortcut: {
    flex: 1, minHeight: 46, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: Spacing.three,
    alignItems: 'center', flexDirection: 'row', gap: Spacing.two,
  },
  medal: {
    width: 47, height: 47, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center',
  },
});
