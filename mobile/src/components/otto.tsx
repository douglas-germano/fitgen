import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation, Easing, interpolate, measure, useAnimatedRef, useAnimatedStyle, useReducedMotion,
  useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';

const mark = require('../../assets/brand/otto.png');
const LIME = '#a7ee05';
const DURATION = 1050;
const FLIGHT = [0, 0.09, 0.33, 0.73, 0.84, 0.93, 1];

export const OTTO_KEYBOARD_DELAY = 520;
export const OTTO_GREETING_DELAY = 615;

export function OttoAvatar({ size = 28 }: { size?: number }) {
  return <Image source={mark} contentFit="contain" style={{ width: size, height: size }} accessible={false} />;
}

/** Full-size leap travels in screen coordinates while its destination follows the chat layout. */
export function OttoArrival({ size, variant }: { size: number; variant: 'chat' | 'welcome' }) {
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const anchor = useAnimatedRef<View>();
  const progress = useSharedValue(0);
  const idle = useSharedValue(0);
  const [laidOut, setLaidOut] = useState(false);
  const chat = variant === 'chat';

  useEffect(() => {
    if (!laidOut || reducedMotion) return;
    const launch = Easing.bezier(0.15, 0.7, 0.19, 1);
    const fall = Easing.bezier(0.42, 0, 0.3, 1);
    progress.set(withSequence(
      withTiming(0.09, { duration: 95, easing: Easing.out(Easing.quad) }),
      withTiming(0.33, { duration: 250, easing: launch }),
      withTiming(0.73, { duration: 420, easing: fall }),
      withTiming(0.84, { duration: 115, easing: Easing.in(Easing.quad) }),
      withTiming(0.93, { duration: 95, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 75, easing: Easing.inOut(Easing.quad) }),
    ));
    idle.set(withDelay(DURATION + 250, withRepeat(withTiming(1, { duration: 4400, easing: Easing.linear }), -1)));
    return () => {
      cancelAnimation(progress);
      cancelAnimation(idle);
    };
  }, [idle, laidOut, progress, reducedMotion]);

  const flightStyle = useAnimatedStyle(() => {
    if (!laidOut) return { opacity: 0 };
    const phase = progress.value;
    if (phase >= 1) return { opacity: 1, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }, { rotate: '0deg' }] };
    const box = chat ? measure(anchor) : null;
    const centerX = box ? box.pageX + size / 2 : width / 2;
    const centerY = box ? box.pageY + size / 2 : height * 0.48;
    const startX = width / 2 - centerX;
    const startY = box ? height * 0.46 - centerY : 12;
    const apexY = box ? height * 0.23 - centerY : -55;
    const startScale = chat ? 2.1 : 0.92;
    const apexScale = chat ? 4.2 : 1.52;
    return {
      opacity: interpolate(phase, [0, 0.035, 1], [0.55, 1, 1]),
      transform: [
        { translateX: interpolate(phase, FLIGHT, [startX, startX + 3, startX, 0, 1, -1, 0]) },
        { translateY: interpolate(phase, FLIGHT, [startY, startY + 9, apexY, -20, 3, -4, 0]) },
        { scale: interpolate(phase, FLIGHT, [startScale, startScale * 0.92, apexScale, 1.13, 0.94, 1.05, 1]) },
        { rotate: `${interpolate(phase, FLIGHT, [0, 4, -8, 0, 1, -1, 0])}deg` },
      ],
    };
  });

  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.19, 0.33, 0.43, 0.56, 1], [0, 0, 0.8, 0.28, 0, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 0.19, 0.56, 1], [0.58, 0.58, 1.38, 1.38]) }],
  }));

  const gazeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: size * interpolate(progress.value, [0, 0.09, 0.33, 0.58, 0.76, 1], [0, -0.028, 0.01, 0.046, 0.036, 0])
        + size * interpolate(idle.value, [0, 0.19, 0.29, 0.39, 1], [0, 0, 0.039, 0, 0]) },
      { translateY: size * interpolate(progress.value, [0, 0.09, 0.33, 0.64, 1], [0, 0.018, -0.031, 0.021, 0]) },
    ],
  }));

  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(progress.value, [0, 0.09, 0.33, 0.51, 0.87, 0.96, 1], [1, 0.72, 1.65, 1.42, 0.08, 1.14, 1])
      * interpolate(idle.value, [0, 0.58, 0.60, 0.63, 1], [1, 1, 0.08, 1, 1]) }],
  }));

  if (reducedMotion) return <OttoAvatar size={size} />;
  return (
    <View ref={anchor} collapsable={false} onLayout={() => setLaidOut(true)} style={{ width: size, height: size, zIndex: 2 }} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, flightStyle]}>
        <Animated.View style={[styles.burst, { borderRadius: size }, burstStyle]}>
          <View style={[styles.streak, { left: '-12%', top: '24%', transform: [{ rotate: '25deg' }] }]} />
          <View style={[styles.streak, { right: '-12%', top: '32%', transform: [{ rotate: '-35deg' }] }]} />
          <View style={[styles.streak, { right: '-12%', bottom: '20%', transform: [{ rotate: '25deg' }] }]} />
        </Animated.View>
        <OttoAvatar size={size} />
        <View style={[styles.cover, { left: '34.4%' }]} />
        <View style={[styles.cover, { left: '53.2%' }]} />
        <Animated.View style={[StyleSheet.absoluteFill, gazeStyle]}>
          <Animated.View style={[styles.eye, { left: '34.85%' }, eyeStyle]} />
          <Animated.View style={[styles.eye, { left: '53.67%' }, eyeStyle]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { position: 'absolute', top: '45.8%', width: '12.2%', height: '6.8%', borderRadius: 100, backgroundColor: '#0d0d12' },
  eye: { position: 'absolute', top: '46.17%', width: '11.24%', height: '6.06%', borderRadius: 100, backgroundColor: LIME },
  burst: { position: 'absolute', left: '-7%', top: '-7%', width: '114%', height: '114%', borderWidth: 1, borderColor: LIME },
  streak: { position: 'absolute', width: '15%', height: '1.8%', borderRadius: 8, backgroundColor: LIME },
});
