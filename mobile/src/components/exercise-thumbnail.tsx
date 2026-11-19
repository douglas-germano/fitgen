import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Dumbbell } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useColors } from '@/providers/theme';
import type { Exercise } from '@/types/api';

export function ExerciseThumbnail({ exercise, size = 52 }: { exercise: Exercise; size?: number }) {
  const Colors = useColors();
  const [failedUrl, setFailedUrl] = useState<string>();
  const url = exercise.animation_url;
  const libraryId = exercise.exercise_library_id;
  const content = (
    <View style={{ width: size, height: size, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: Colors.surfaceChip, alignItems: 'center', justifyContent: 'center' }}>
      {url && failedUrl !== url ? (
        <Image source={url} autoplay={false} contentFit="contain" style={{ width: '100%', height: '100%', backgroundColor: '#fff' }} onError={() => setFailedUrl(url)} />
      ) : <Dumbbell size={size > 40 ? 22 : 16} color={Colors.inkMuted} />}
    </View>
  );
  if (!libraryId) return content;

  return (
    <Pressable
      hitSlop={size < 44 ? 4 : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Ver execução de ${exercise.name}`}
      onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: libraryId } })}>
      {content}
    </Pressable>
  );
}
