import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#a1ec03', '#8fd400', '#111214', '#eefbcf', '#4a6b00'];
const { width: W, height: H } = Dimensions.get('window');

type Piece = { x: number; drift: number; delay: number; rotate: number; color: string; size: number };

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.5,
    drift: (Math.random() - 0.5) * W * 0.9,
    delay: Math.random() * 250,
    rotate: (Math.random() - 0.5) * 1080,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 6,
  }));
}

function ConfettiPiece({ piece }: { piece: Piece }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(piece.delay, withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }));
  }, [piece.delay, t]);
  const style = useAnimatedStyle(() => {
    // Burst upward from ~60% height, then fall with gravity.
    const up = -H * 0.35 * Math.sin(Math.min(t.value * 2, 1) * (Math.PI / 2));
    const fall = t.value > 0.5 ? (t.value - 0.5) ** 2 * H * 2.4 : 0;
    return {
      opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
      transform: [
        { translateX: piece.drift * t.value },
        { translateY: up + fall },
        { rotate: `${piece.rotate * t.value}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: piece.x,
          top: H * 0.6,
          width: piece.size,
          height: piece.size * 0.6,
          backgroundColor: piece.color,
          borderRadius: 1,
        },
        style,
      ]}
    />
  );
}

/** canvas-confetti style burst (particleCount 100, spread 70, origin y 0.6). Remount to replay. */
export function Confetti({ count = 100 }: { count?: number }) {
  const [pieces] = useState(() => makePieces(count));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} />
      ))}
    </View>
  );
}
