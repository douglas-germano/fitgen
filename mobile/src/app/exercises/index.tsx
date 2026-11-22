import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, Plus, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseThumbnailImage } from '@/components/exercise-thumbnail';
import { Button, Chip, EmptyState, Input, ListItem, PageSkeleton, QueryError, Row, Text, TopBar } from '@/components/ui';
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
    <View style={{ gap: Spacing.three, marginBottom: Spacing.five }}>
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
        <TopBar title={title} back />
      </View>
      <FlatList
        data={items}
        keyExtractor={(ex) => ex.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: Spacing.five, paddingBottom: insets.bottom + Spacing.six }}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshing={library.isRefetching}
        onRefresh={library.refetch}
        ListHeaderComponent={filters}
        renderItem={({ item: ex }) => (
          <View style={{ marginBottom: Spacing.two }}>
            <ListItem
              leading={<ExerciseThumbnailImage url={ex.thumbnail_url || ex.animation_url} />}
              title={ex.name}
              caption={exerciseCaption(ex)}
              arrow={!selecting}
              right={selecting ? <Plus size={18} color={Colors.ink} /> : undefined}
              onPress={() => select(ex.id)}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={BookOpen}
            title={filtered ? 'Nada encontrado' : 'Biblioteca vazia'}
            message={filtered ? 'Tente outra busca ou limpe os filtros.' : 'Os exercícios ainda não foram carregados. Puxe para atualizar.'}
          />
        }
        ListFooterComponent={selecting ? (
          <View style={{ marginTop: Spacing.three }}>
            <Button variant="soft" title="Adicionar exercício personalizado" onPress={() => select('custom')} />
          </View>
        ) : undefined}
      />
    </KeyboardAvoidingView>
  );
}
