import { router } from 'expo-router';
import { BookOpen, Dumbbell, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Chip, EmptyState, Input, ListItem, Page, PageSkeleton, QueryError, Row, Text, TopBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useExerciseLibrary } from '@/hooks/queries';
import { exerciseCaption, filterLibrary, REGIONS, type Region } from '@/lib/exercise-library';
import { useColors } from '@/providers/theme';

/** The FitGen exercise library: search by name, muscle or equipment and filter by body region. */
export default function ExerciseLibraryScreen() {
  const Colors = useColors();
  const library = useExerciseLibrary();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<Region>('all');
  const [home, setHome] = useState(false);

  const items = useMemo(
    () => filterLibrary(library.data ?? [], { query, region, home }),
    [library.data, query, region, home],
  );

  const title = 'Exercícios';
  if (library.isLoading) return <PageSkeleton title={title} back tab={false} />;
  if (library.error && !library.data) return <QueryError title={title} back error={library.error} onRetry={library.refetch} />;

  const filtered = !!query.trim() || region !== 'all' || home;

  return (
    <Page tab={false} topBar={<TopBar title={title} back />} refreshing={library.isRefetching} onRefresh={library.refetch} contentStyle={{ gap: Spacing.five }}>
      <View style={{ gap: Spacing.three }}>
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

      {items.length ? (
        <View style={{ gap: Spacing.two }}>
          {items.map((ex) => (
            <ListItem
              key={ex.id}
              icon={Dumbbell}
              iconTone="chip"
              title={ex.name}
              caption={exerciseCaption(ex)}
              arrow
              onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: ex.id } })}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon={BookOpen}
          title={filtered ? 'Nada encontrado' : 'Biblioteca vazia'}
          message={filtered ? 'Tente outra busca ou limpe os filtros.' : 'Os exercícios ainda não foram carregados. Puxe para atualizar.'}
        />
      )}
    </Page>
  );
}
