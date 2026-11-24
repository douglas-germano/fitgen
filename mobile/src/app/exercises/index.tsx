import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, ChevronRight, Plus, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseThumbnailImage } from '@/components/exercise-thumbnail';
import { BackBar, Group, GROUP_RADIUS, GroupRow } from '@/components/grouped';
import { Chip, Input, PageSkeleton, QueryError, Row, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useExerciseLibrary } from '@/hooks/queries';
import { exerciseCaption, filterLibrary, REGIONS, type Region } from '@/lib/exercise-library';
import { useColors } from '@/providers/theme';

/** The FitGen exercise library: search by name, muscle or equipment and filter by body region. */
export default function ExerciseLibraryScreen() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const { source, workoutId, workoutDay } = useLocalSearchParams<{
    source?: string;
    workoutId?: string;
    workoutDay?: string;
  }>();
  const selecting = !!workoutId && !!workoutDay && (source === 'plan' || source === 'session');
  const library = useExerciseLibrary();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<Region>('all');
  const [home, setHome] = useState(false);

  const items = useMemo(
    () => filterLibrary(library.data ?? [], { query, region, home }),
    [library.data, query, region, home],
  );

  const title = selecting ? 'Selecionar exercício' : 'Exercícios';
  if (library.isLoading) return <PageSkeleton title={title} back tab={false} />;
  if (library.error && !library.data) return <QueryError title={title} back error={library.error} onRetry={library.refetch} />;

  const filtered = !!query.trim() || region !== 'all' || home;

  const select = (exerciseChoice: string) => {
    if (!selecting) {
      router.push({ pathname: '/exercises/[id]', params: { id: exerciseChoice } });
      return;
    }
    const params = { id: workoutId, exerciseDay: workoutDay, exerciseChoice };
    if (source === 'session') {
      router.dismissTo({ pathname: '/workout/[id]/play/[dayId]', params: { ...params, dayId: workoutDay } });
    } else {
      router.dismissTo({ pathname: '/workout/[id]', params });
    }
  };

  const filters = (
    <View style={{ gap: Spacing.three, marginBottom: Spacing.four }}>
      <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700', paddingHorizontal: Spacing.two }}>{title}</Text>
      <Input
        placeholder="Buscar por nome, músculo ou equipamento"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Buscar exercício"
        right={query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Limpar busca">
            <X size={18} color={Colors.inkMuted} />
          </Pressable>
        ) : <Search size={18} color={Colors.inkMuted} />}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }} style={{ marginHorizontal: -Spacing.five }}>
        <View style={{ width: Spacing.five - Spacing.two }} />
        {REGIONS.map((r) => (
          <Chip key={r.value} label={r.label} selected={region === r.value} onPress={() => setRegion(r.value)} />
        ))}
        <View style={{ width: Spacing.five - Spacing.two }} />
      </ScrollView>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="caption">
          {items.length === 1 ? '1 exercício' : `${items.length} exercícios`}
        </Text>
        <Chip label="Dá pra fazer em casa" selected={home} onPress={() => setHome(!home)} />
      </Row>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + Spacing.three, paddingHorizontal: Spacing.five, paddingBottom: Spacing.three }}>
        <BackBar />
      </View>
      <FlatList
        data={items}
        keyExtractor={(ex) => ex.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ width: '100%', maxWidth: 480 + Spacing.five * 2, alignSelf: 'center', paddingHorizontal: Spacing.five, paddingBottom: insets.bottom + Spacing.six }}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshing={library.isRefetching}
        onRefresh={library.refetch}
        ListHeaderComponent={filters}
        renderItem={({ item: ex, index = 0 }) => {
          const first = index === 0;
          const last = index === items.length - 1;
          // Each row is a slice of one rounded group, like the settings lists.
          return (
            <View style={{
              backgroundColor: Colors.surfaceSunken, overflow: 'hidden',
              borderTopLeftRadius: first ? GROUP_RADIUS : 0, borderTopRightRadius: first ? GROUP_RADIUS : 0,
              borderBottomLeftRadius: last ? GROUP_RADIUS : 0, borderBottomRightRadius: last ? GROUP_RADIUS : 0,
            }}>
              <Pressable onPress={() => select(ex.id)} accessibilityRole="button"
                style={({ pressed }) => ({ backgroundColor: pressed ? Colors.surfaceChip : 'transparent' })}>
                {!first && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Colors.line, marginLeft: 72, marginRight: Spacing.four }} />}
                <Row style={{ gap: Spacing.three, paddingLeft: Spacing.three, paddingRight: Spacing.four, paddingVertical: Spacing.three }}>
                  <ExerciseThumbnailImage url={ex.thumbnail_url || ex.animation_url} size={48} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ fontSize: 16, lineHeight: 22 }} numberOfLines={2}>{ex.name}</Text>
                    <Text muted style={{ fontSize: 13, lineHeight: 18 }} numberOfLines={1}>{exerciseCaption(ex)}</Text>
                  </View>
                  {selecting ? <Plus size={18} color={Colors.ink} /> : <ChevronRight size={16} color={Colors.inkMuted} />}
                </Row>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <Group>
            <GroupRow icon={BookOpen} title={filtered ? 'Nada encontrado' : 'Biblioteca vazia'}
              caption={filtered ? 'Tente outra busca ou limpe os filtros.' : 'Os exercícios ainda não foram carregados. Puxe para atualizar.'} />
          </Group>
        }
        ListFooterComponent={selecting ? (
          <View style={{ marginTop: Spacing.four }}>
            <Group>
              <GroupRow icon={Plus} title="Exercício personalizado" caption="Crie um exercício que não está na biblioteca" onPress={() => select('custom')} />
            </Group>
          </View>
        ) : undefined}
      />
    </KeyboardAvoidingView>
  );
}
