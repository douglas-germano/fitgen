import { Platform } from 'react-native';

/**
 * FitGen design tokens — "Volt Fit" design system.
 * Source: the FitGen — Volt Fit design canvas (tokens.json).
 */
export const LightColors = {
  /** Brand green. Fills (chips, active items, progress, round action buttons). Never as text on white. */
  volt: '#a1ec03',
  /** Pressed state of any `volt` surface. */
  voltStrong: '#8fd400',
  /** Progress track and soft highlight behind volt content. */
  voltSoft: '#eefbcf',
  /** Green as text / small icons on light surfaces (links, "Feita", "Desbloqueada"). */
  voltInk: '#4a6b00',
  /** Text and icons on top of `volt`. */
  onVolt: '#111214',

  ink: '#111214',
  inkMuted: '#62666d',
  danger: '#b42318',
  dangerSoft: '#fef3f2',

  ground: '#eaeaea',
  /** Screen background, sheets, white round buttons. */
  surface: '#ffffff',
  /** Cards inside a screen. */
  surfaceSunken: '#f6f7f9',
  /** Inactive chips, unselected days, inputs, soft buttons. */
  surfaceChip: '#eff1f3',
  /** Active tab pill, user chat bubble, inverse buttons. */
  surfaceInverse: '#111214',
  inversePressed: '#2a2c30',
  onInverse: '#ffffff',

  line: '#e3e6ea',
  lineStrong: '#8a8f97',
  focus: '#111214',
  scrim: 'rgba(17,18,20,0.45)',
} as const;

/** Semantic palette shared by all screens and components. */
export type ThemeColors = { [Key in keyof typeof LightColors]: string };
export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

export const DarkColors: ThemeColors = {
  ...LightColors,
  voltSoft: '#283615',
  voltInk: '#b5ef52',
  ink: '#f3f5f7',
  inkMuted: '#a9afb8',
  danger: '#ffb4ab',
  dangerSoft: '#40201f',
  ground: '#0d0f11',
  surface: '#111416',
  surfaceSunken: '#1c2024',
  surfaceChip: '#282e34',
  surfaceInverse: '#f3f5f7',
  inversePressed: '#d4d9df',
  onInverse: '#111214',
  line: '#353d45',
  lineStrong: '#76818d',
  focus: '#a1ec03',
  scrim: 'rgba(0,0,0,0.7)',
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveTheme(preference: ThemePreference, systemScheme: string | null | undefined): ColorScheme {
  return preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
}

export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

/** Maps a CSS-like font weight to the matching Plus Jakarta Sans family. */
export function fontFor(weight?: string | number) {
  const w = Number(weight ?? 400);
  if (w >= 800) return Fonts.extrabold;
  if (w >= 700) return Fonts.bold;
  if (w >= 600) return Fonts.semibold;
  if (w >= 500) return Fonts.medium;
  return Fonts.regular;
}

/** `rgba()` helper for tints. */
export function alpha(hex: string, opacity: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
}

export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 28,
  full: 999,
} as const;

export const Control = {
  sm: 28,
  md: 40,
  lg: 44,
} as const;

/** Content and fade dimensions of the shared Android and web tab bar. */
export const AppTabBar = { height: 64, fadeHeight: 24 } as const;

/** Space reserved at the bottom of tab screens so content clears the native tab bar. */
export const BottomTabInset = Platform.select({ ios: 50, android: 0 }) ?? 0;

/** Bottom space a tab screen needs so its content and the "+" clear the tab bar. */
export function tabBarClearance(insetBottom: number) {
  if (Platform.OS === 'android' || Platform.OS === 'web') return insetBottom + AppTabBar.height;
  return Math.max(insetBottom, BottomTabInset);
}
