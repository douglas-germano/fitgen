/**
 * FitGen UI kit — React Native versions of the "Volt Fit" design system
 * components (Button, IconButton, Chip, ProgressBar, MetricTile, OverviewCard,
 * DayPicker, ScheduleItem, TopBar…) plus the app pieces drawn on the
 * "Componentes" board (Input, Badge, EmptyState, Skeleton, Dialog, Sheet).
 */
import { router, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  ChevronLeft,
  CircleAlert,
  MoreHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  Animated as NativeAnimated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabBarClearance, Control, fontFor, Radius, Spacing } from '@/constants/theme';
import { useAppTheme, useColors } from '@/providers/theme';
import { Motion } from '@/constants/motion';
import { MEDIA_URL, errorMessage } from '@/lib/api';
import { FeedbackLayer } from '@/components/feedback';
import { dismissFeedbackInScope, registerFeedbackScope } from '@/lib/feedback';

// ---------- Typography ----------

export type TextVariant =
  | 'display'
  | 'metric'
  | 'titleLg'
  | 'titleMd'
  | 'titleSm'
  | 'body'
  | 'label'
  | 'caption';

const text = StyleSheet.create({
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.56 },
  metric: { fontSize: 26, lineHeight: 30, fontWeight: '700', letterSpacing: -0.26, fontVariant: ['tabular-nums'] },
  titleLg: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  titleMd: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  titleSm: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 11, lineHeight: 15 },
});

/**
 * Text in Plus Jakarta Sans. The weight in the style picks the font file
 * (custom fonts need one family per weight on Android).
 */
export function Text({
  variant = 'body',
  muted,
  color,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; muted?: boolean; color?: string }) {
  const Colors = useColors();
  const flat = StyleSheet.flatten([
    { color: Colors.ink },
    text[variant],
    (muted || variant === 'caption') && { color: Colors.inkMuted },
    color ? { color } : null,
    style,
  ]) as TextStyle;
  const { fontWeight, ...restStyle } = flat;
  return <RNText style={[restStyle, { fontFamily: fontFor(fontWeight) }]} {...rest} />;
}

// ---------- Layout ----------

export function Row({ style, ...rest }: ViewProps) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, style]} {...rest} />;
}

/**
 * Standard screen: white surface, 20px gutters, 24px between sections,
 * optional TopBar and pull-to-refresh. Navigation owns the screen transition.
 */
export function Page({
  children,
  topBar,
  tab = false,
  refreshing,
  onRefresh,
  contentStyle,
  footer,
}: {
  children: ReactNode;
  /** Floats over the scroll view with a blur so content passes behind it (usually a <TopBar />). */
  topBar?: ReactNode;
  /** Pad for the native tab bar. */
  tab?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  /** Pinned at the bottom (primary actions). */
  footer?: ReactNode;
}) {
  const Colors = useColors();
  const { scheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottom = (footer ? 0 : tab ? tabBarClearance(insets.bottom) : insets.bottom) + Spacing.six;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const ios = Platform.OS === 'ios';
  // The top bar floats over the content (blurred), so the list scrolls "behind" it. Its height is the
  // scroll inset: safe area + 12 + 44 (TopBar min height) + 12, replaced by the measured value.
  const [barHeight, setBarHeight] = useState(insets.top + Spacing.three + Control.lg + Spacing.three);
  const inset = topBar ? barHeight : 0;
  const [scrolled, setScrolled] = useState(false);
  useFocusEffect(useCallback(() => {
    if (!tab) return;
    scroll.current?.scrollTo({ y: ios ? -inset : 0, animated: false });
  }, [tab, ios, inset]));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.surface }} behavior={ios ? 'padding' : undefined}>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        alwaysBounceVertical={onRefresh ? true : undefined}
        contentInsetAdjustmentBehavior="never"
        contentInset={ios ? { top: inset } : undefined}
        contentOffset={ios ? { x: 0, y: -inset } : undefined}
        scrollIndicatorInsets={ios ? { top: inset } : undefined}
        scrollEventThrottle={16}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > (ios ? -inset : 0) + 2)}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: Spacing.five, paddingTop: (topBar ? Spacing.three : 0) + (ios ? 0 : inset), paddingBottom: bottom }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={Colors.inkMuted} />
          ) : undefined
        }>
        <View style={[{ gap: Spacing.six }, contentStyle]}>
          {children}
        </View>
      </ScrollView>
      {topBar ? (
        <View
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: insets.top + Spacing.three, paddingHorizontal: Spacing.five, paddingBottom: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: scrolled ? Colors.line : 'transparent' }}>
          <BlurView pointerEvents="none" intensity={5} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface + (ios ? '14' : 'f0') }]} />
          {topBar}
        </View>
      ) : null}
      {footer ? (
        <View style={{ paddingHorizontal: Spacing.five, paddingTop: Spacing.three, paddingBottom: insets.bottom + Spacing.three, gap: Spacing.three }}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** Centered title between two 40px round buttons (back / bell / more). */
export function TopBar({
  title,
  back = false,
  onBack,
  action,
  leading,
  titleAccessory,
  actionWidth = Control.lg,
}: {
  title: string;
  /** Reserve room for a pair of header actions while keeping the title centered. */
  actionWidth?: number;
  /** Optional image beside the centered title. */
  titleAccessory?: ReactNode;
  /** Show the back button (defaults to router.back()). */
  back?: boolean;
  onBack?: () => void;
  /** Right slot, usually an <IconButton />. */
  action?: ReactNode;
  /** Optional left action on root pages, balanced with the right action. */
  leading?: ReactNode;
}) {
  return (
    // Fixed minimum height: without it the bar is as tall as its tallest child
    // (22 with no actions, 40 with a back button, 44 with the bell/avatar), so headers jumped between pages.
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: Control.lg }}>
      <View style={{ width: actionWidth }}>
        {leading ?? (back || onBack ? (
          <IconButton icon={ChevronLeft} label="Voltar" onPress={onBack ?? (() => router.back())} />
        ) : null)}
      </View>
      {titleAccessory ? <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', gap: Spacing.two, alignItems: 'center', justifyContent: 'center' }}>
        {titleAccessory}
        <Text variant="titleMd" style={{ flexShrink: 1 }} accessibilityRole="header" numberOfLines={1}>{title}</Text>
      </View> : <Text variant="titleMd" style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>}
      <View style={{ width: actionWidth, alignItems: 'flex-end' }}>{action}</View>
    </View>
  );
}

/** Bell button that opens the notifications screen, with an unread dot. */
export function BellButton({ unread = 0, size = 'md' }: { unread?: number; size?: 'md' | 'lg' }) {
  const Colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread ? `Notificações, ${unread} não lidas` : 'Notificações'}
      accessibilityHint="Abre a tela de notificações"
      onPress={() => router.push('/notifications')}
      hitSlop={8}
      style={({ pressed }) => ({
        width: Control.lg,
        height: Control.lg,
        borderRadius: Control.lg / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? Colors.volt : Colors.voltSoft,
      })}>
      <Bell size={20} color={Colors.voltInk} strokeWidth={2} />
      {unread > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: size === 'lg' ? 10 : 9,
            right: size === 'lg' ? 11 : 10,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: Colors.ink,
            borderWidth: 1.5,
            borderColor: Colors.voltSoft,
          }}
        />
      )}
    </Pressable>
  );
}

/** Section title ("Esta Semana:") with an optional underlined link on the right. */
export function SectionHeader({
  title,
  action,
  onAction,
  note,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  /** Muted text on the right instead of a link ("em litros"). */
  note?: string;
}) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Text variant="titleMd" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </Text>
      {action ? <LinkText title={action} onPress={onAction} /> : note ? <Text variant="label" muted style={{ fontSize: 12, fontWeight: '400' }}>{note}</Text> : null}
    </Row>
  );
}

export function LinkText({ title, onPress, style }: { title: string; onPress?: () => void; style?: StyleProp<TextStyle> }) {
  const Colors = useColors();
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="link">
      {({ pressed }) => (
        <Text
          variant="label"
          color={pressed ? Colors.ink : Colors.voltInk}
          style={[{ textDecorationLine: 'underline' }, style]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

// ---------- Surfaces ----------

/** `surface-sunken` card, radius 16. Cards never have shadows. */
export function Card({ style, children, onPress, ...rest }: ViewProps & { onPress?: () => void }) {
  const Colors = useColors();
  const base: ViewStyle = {
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    padding: Spacing.four,
    gap: Spacing.three,
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style as ViewStyle]}
        {...rest}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}

/** Round volt badge with a small icon (26px). */
export function BadgeIcon({
  icon: IconCmp,
  size = 26,
  tone = 'volt',
}: {
  icon: LucideIcon;
  size?: number;
  tone?: 'volt' | 'chip';
}) {
  const Colors = useColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tone === 'volt' ? Colors.volt : Colors.surfaceChip,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <IconCmp size={Math.round(size * 0.54)} strokeWidth={2.4} color={tone === 'volt' ? Colors.onVolt : Colors.inkMuted} />
    </View>
  );
}

export function Avatar({ name, uri, size = 44 }: { name?: string | null; uri?: string | null; size?: number }) {
  const Colors = useColors();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  if (uri && uri !== failedUri) {
    const source = /^https?:\/\//.test(uri) ? uri : `${MEDIA_URL}/static/${uri.replace(/^\//, '')}`;
    return <Image source={{ uri: source }} style={{ width: size, height: size, borderRadius: size / 2 }} onError={() => setFailedUri(uri)} accessibilityLabel={name ?? 'Foto do perfil'} />;
  }
  const initials = (name || 'A')
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Colors.surfaceChip,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontWeight: '700', fontSize: Math.round(size * 0.34) }}>{initials}</Text>
    </View>
  );
}

// ---------- Controls ----------

type ButtonVariant = 'primary' | 'soft' | 'inverse';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon: IconLeft,
  size = 'md',
  loading,
  disabled,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const Colors = useColors();
  const inactive = disabled || loading;
  const height = { sm: 36, md: Control.lg, lg: 52 }[size];
  const fg = { primary: Colors.onVolt, soft: Colors.ink, inverse: Colors.onInverse }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        {
          height,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Spacing.two,
          paddingHorizontal: size === 'sm' ? Spacing.four : Spacing.five,
          borderRadius: Radius.full,
          backgroundColor: {
            primary: pressed ? Colors.voltStrong : Colors.volt,
            soft: pressed ? Colors.line : Colors.surfaceChip,
            inverse: pressed ? Colors.inversePressed : Colors.surfaceInverse,
          }[variant],
          opacity: inactive && !loading ? 0.45 : 1,
        },
        style,
      ]}>
      {loading ? (
        <>
          <ActivityIndicator size="small" color={fg} />
          <Text style={{ color: fg, fontSize: size === 'sm' ? 13 : 14, fontWeight: '600' }}>Carregando…</Text>
        </>
      ) : (
        <>
          {IconLeft && <IconLeft size={size === 'sm' ? 16 : 18} color={fg} />}
          <Text style={{ color: fg, fontSize: size === 'sm' ? 13 : 14, fontWeight: '600' }} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

type IconButtonVariant = 'chip' | 'volt' | 'surface' | 'inverse';

export function IconButton({
  icon: IconCmp,
  label,
  onPress,
  variant = 'chip',
  size = 'md',
  disabled,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
}) {
  const Colors = useColors();
  const dim = { sm: Control.sm, md: Control.md, lg: Control.lg, xl: 52 }[size];
  const fg = variant === 'volt' ? Colors.onVolt : variant === 'inverse' ? Colors.onInverse : Colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={size === 'sm' ? 8 : 2}
      style={({ pressed }) => ({
        width: dim,
        height: dim,
        borderRadius: dim / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: {
          chip: pressed ? Colors.line : Colors.surfaceChip,
          volt: pressed ? Colors.voltStrong : Colors.volt,
          surface: pressed ? Colors.surfaceChip : Colors.surface,
          inverse: Colors.surfaceInverse,
        }[variant],
        opacity: disabled ? 0.45 : 1,
      })}>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <IconCmp size={size === 'sm' ? 15 : 20} strokeWidth={size === 'sm' ? 2.4 : 2} color={fg} />
      )}
    </Pressable>
  );
}

export function MoreButton({ onPress, size = 'md' }: { onPress?: () => void; size?: 'sm' | 'md' }) {
  return <IconButton icon={MoreHorizontal} label="Mais opções" size={size} onPress={onPress} />;
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const Colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => ({
        height: 38,
        paddingHorizontal: Spacing.five,
        borderRadius: Radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? (pressed ? Colors.voltStrong : Colors.volt) : pressed ? Colors.line : Colors.surfaceChip,
      })}>
      <Text variant="label" color={selected ? Colors.onVolt : Colors.inkMuted} style={selected && { fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <Row style={{ flexWrap: 'wrap' }} accessibilityRole="tablist">
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </Row>
  );
}

export function ProgressBar({
  value,
  thin,
  knob,
  color,
  trackColor,
}: {
  value: number;
  thin?: boolean;
  knob?: boolean;
  color?: string;
  trackColor?: string;
}) {
  const Colors = useColors();
  const pct = Math.max(0, Math.min(100, value || 0));
  const h = thin ? 3 : 4;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={{ height: knob ? 12 : h, justifyContent: 'center' }}>
      <View style={{ height: h, borderRadius: h, backgroundColor: trackColor ?? Colors.voltSoft }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color ?? Colors.volt, borderRadius: h }} />
      </View>
      {knob && (
        <View
          style={{
            position: 'absolute',
            left: `${pct}%`,
            marginLeft: -6,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: Colors.surfaceInverse,
            borderWidth: 2,
            borderColor: Colors.volt,
          }}
        />
      )}
    </View>
  );
}

export function Input({
  label,
  right,
  labelRight,
  error,
  style,
  containerStyle,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: TextInputProps & {
  label?: string;
  /** Element rendered inside the field, on the right ("Mostrar", unit…). */
  right?: ReactNode;
  /** Element rendered next to the label (e.g. "Esqueceu a senha?"). */
  labelRight?: ReactNode;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const Colors = useColors();
  const [focused, setFocused] = useState(false);
  const disabled = rest.editable === false;
  return (
    <View style={[{ gap: Spacing.two }, containerStyle]}>
      {(label || labelRight) && (
        <Row style={{ justifyContent: 'space-between' }}>
          {label ? <Text variant="label" color={disabled ? Colors.inkMuted : Colors.ink}>{label}</Text> : <View />}
          {labelRight}
        </Row>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          backgroundColor: Colors.surfaceChip,
          borderWidth: 2,
          borderColor: focused || error ? Colors.focus : 'transparent',
          borderRadius: multiline ? 20 : Radius.full,
          borderCurve: 'continuous',
          minHeight: multiline ? 96 : 48,
          opacity: disabled ? 0.6 : 1,
        }}>
        <TextInput
          placeholderTextColor={Colors.inkMuted}
          selectionColor={Colors.ink}
          cursorColor={Colors.ink}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              minWidth: 0,
              color: Colors.ink,
              fontSize: 15,
              fontFamily: fontFor(400),
              paddingHorizontal: Spacing.five - 2,
              paddingVertical: multiline ? Spacing.four : 0,
              minHeight: multiline ? 92 : 44,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            style,
          ]}
          {...rest}
        />
        {right && <View style={{ paddingRight: Spacing.five - 2, alignSelf: 'center' }}>{right}</View>}
      </View>
      {error ? (
        <Text variant="caption" color={Colors.ink} style={{ fontWeight: '500' }} accessibilityLiveRegion="polite">
          Erro: {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Badge({ label, tone = 'volt' }: { label: string; tone?: 'volt' | 'chip' | 'inverse' | 'soft' }) {
  const Colors = useColors();
  const bg = { volt: Colors.volt, chip: Colors.surfaceChip, inverse: Colors.surfaceInverse, soft: Colors.voltSoft }[tone];
  const fg = { volt: Colors.onVolt, chip: Colors.ink, inverse: Colors.onInverse, soft: Colors.voltInk }[tone];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: fg, fontSize: 12, lineHeight: 16, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ---------- Volt Fit composites ----------

/** Card with a volt badge, label, big number + unit, caption and a volt arrow button. */
export function MetricTile({
  icon,
  label,
  value,
  unit,
  caption,
  onOpen,
  style,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  caption?: string;
  onOpen?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const Colors = useColors();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: Colors.surfaceSunken,
          borderRadius: Radius.md,
          borderCurve: 'continuous',
          paddingTop: Spacing.four,
          paddingHorizontal: Spacing.three + 2,
          paddingBottom: Spacing.three + 2,
          gap: Spacing.three,
        },
        style,
      ]}>
      <Row>
        <BadgeIcon icon={icon} />
        <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600' }}>{label}</Text>
      </Row>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Row style={{ alignItems: 'baseline', gap: Spacing.one }}>
            <Text variant="metric" style={{ flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit>
              {value}
            </Text>
            {unit ? <Text style={{ fontSize: 12, lineHeight: 16, color: Colors.inkMuted }}>{unit}</Text> : null}
          </Row>
          {caption ? <Text variant="caption" numberOfLines={1}>{caption}</Text> : null}
        </View>
        {onOpen && <IconButton icon={ArrowDownRight} label={`Abrir ${label}`} variant="volt" size="sm" onPress={onOpen} />}
      </Row>
    </View>
  );
}

export type OverviewStat = { value: string; label: string; progress?: number; onPress?: () => void };

/** "Resumo do Dia" card: volt icon, title/subtitle, more button, 3 stats with thin bars. */
export function OverviewCard({
  icon: IconCmp,
  title,
  subtitle,
  stats,
  onMore,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  stats: OverviewStat[];
  onMore?: () => void;
}) {
  const Colors = useColors();
  return (
    <Card style={{ gap: Spacing.four }}>
      <Row style={{ gap: Spacing.three }}>
        <View style={{ width: Control.md, height: Control.md, borderRadius: Control.md / 2, backgroundColor: Colors.volt, alignItems: 'center', justifyContent: 'center' }}>
          <IconCmp size={18} color={Colors.onVolt} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="titleSm">{title}</Text>
          {subtitle ? <Text variant="caption" numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {onMore && <MoreButton size="sm" onPress={onMore} />}
      </Row>
      <Row style={{ gap: Spacing.four, alignItems: 'flex-start' }}>
        {stats.map((s) => {
          const body = (
            <View style={{ gap: 2 }}>
              <Text variant="titleSm" style={{ fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
                {s.value}
              </Text>
              <Text variant="caption" numberOfLines={1}>{s.label}</Text>
              {s.progress !== undefined && (
                <View style={{ marginTop: Spacing.two }}>
                  <ProgressBar value={s.progress} thin />
                </View>
              )}
            </View>
          );
          return s.onPress ? (
            <Pressable key={s.label} style={{ flex: 1 }} onPress={s.onPress} accessibilityRole="button" accessibilityLabel={`${s.label}: ${s.value}`}>
              {body}
            </Pressable>
          ) : (
            <View key={s.label} style={{ flex: 1 }}>
              {body}
            </View>
          );
        })}
      </Row>
    </Card>
  );
}

export type PickerDay = { weekday: string; day: string; key: string };

/** Horizontal row of day cells (Seg / 16), selected = volt. */
export function DayPicker({
  days,
  selected,
  onSelect,
}: {
  days: PickerDay[];
  selected: string;
  onSelect?: (key: string) => void;
}) {
  const Colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
      {days.map((d) => {
        const on = d.key === selected;
        return (
          <Pressable
            key={d.key}
            onPress={onSelect ? () => onSelect(d.key) : undefined}
            disabled={!onSelect}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              width: 50,
              paddingVertical: Spacing.two + 2,
              borderRadius: Radius.sm,
              borderCurve: 'continuous',
              alignItems: 'center',
              gap: Spacing.two,
              backgroundColor: on ? Colors.volt : Colors.surfaceChip,
            }}>
            <Text variant="label" color={on ? Colors.onVolt : Colors.inkMuted} style={on && { fontWeight: '700' }}>
              {d.weekday}
            </Text>
            <View style={{ width: '60%', height: 1, backgroundColor: on ? 'rgba(17,18,20,0.35)' : Colors.line }} />
            <Text variant="label" color={on ? Colors.onVolt : Colors.inkMuted} style={[{ fontVariant: ['tabular-nums'] }, on && { fontWeight: '700' }]}>
              {d.day}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Time column | rule | title + caption | radio dot. Active = volt fill. */
export function ScheduleItem({
  time,
  period,
  title,
  subtitle,
  detail,
  active,
  onPress,
  right,
}: {
  time: string;
  period?: string;
  title: string;
  subtitle?: string;
  /** Second caption line. */
  detail?: string;
  active?: boolean;
  onPress?: () => void;
  /** Replaces the radio dot (e.g. "520 kcal"). */
  right?: ReactNode;
}) {
  const Colors = useColors();
  const fg = active ? Colors.onVolt : Colors.ink;
  const muted = active ? 'rgba(17,18,20,0.75)' : Colors.inkMuted;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three + 2,
        paddingHorizontal: Spacing.four,
        borderRadius: Radius.md,
        borderCurve: 'continuous',
        backgroundColor: active ? (pressed ? Colors.voltStrong : Colors.volt) : pressed ? Colors.surfaceChip : Colors.surfaceSunken,
      })}>
      <View style={{ width: 52 }}>
        <Text style={{ fontSize: 14, lineHeight: 18, fontWeight: '600', color: fg, fontVariant: ['tabular-nums'] }}>{time}</Text>
        {period ? <Text variant="caption" color={muted}>{period}</Text> : null}
      </View>
      <View style={{ alignSelf: 'stretch', width: 1, backgroundColor: active ? Colors.onVolt : Colors.lineStrong }} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="titleSm" color={fg} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text variant="caption" color={muted} numberOfLines={1}>{subtitle}</Text> : null}
        {detail ? <Text variant="caption" color={muted} numberOfLines={1}>{detail}</Text> : null}
      </View>
      {right ?? (
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: active ? Colors.onVolt : Colors.lineStrong,
            backgroundColor: active ? Colors.onVolt : 'transparent',
          }}
        />
      )}
    </Pressable>
  );
}

/** Row card: badge icon + title + caption (+ optional right element / arrow). */
export function ListItem({
  icon,
  iconTone = 'volt',
  leading,
  title,
  caption,
  right,
  onPress,
  arrow,
}: {
  icon?: LucideIcon;
  iconTone?: 'volt' | 'chip';
  leading?: ReactNode;
  title: string;
  caption?: string;
  right?: ReactNode;
  onPress?: () => void;
  /** Show the ↗ arrow on the right. */
  arrow?: boolean;
}) {
  const Colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.three + 2,
        paddingHorizontal: Spacing.four,
        borderRadius: Radius.md,
        borderCurve: 'continuous',
        backgroundColor: pressed ? Colors.surfaceChip : Colors.surfaceSunken,
      })}>
      {leading ?? (icon && <BadgeIcon icon={icon} tone={iconTone} size={iconTone === 'chip' ? 32 : 30} />)}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="titleSm">{title}</Text>
        {caption ? <Text variant="caption">{caption}</Text> : null}
      </View>
      {right}
      {arrow && <ArrowUpRight size={18} color={Colors.ink} />}
    </Pressable>
  );
}

// ---------- Loading & empty ----------

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const Colors = useColors();
  const opacity = useSharedValue(0.6);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ backgroundColor: Colors.surfaceChip, borderRadius: Radius.md }, animated, style]} />;
}

/** Generic page skeleton: a title bar, one large block and two tiles. */
export function PageSkeleton({ title, back, tab = true }: { title?: string; back?: boolean; tab?: boolean }) {
  return (
    <Page tab={tab} topBar={title ? <TopBar title={title} back={back} /> : undefined}>
      <Skeleton style={{ width: 180, height: 22, borderRadius: Radius.full }} />
      <Skeleton style={{ height: 150 }} />
      <Row style={{ gap: Spacing.four }}>
        <Skeleton style={{ flex: 1, height: 110 }} />
        <Skeleton style={{ flex: 1, height: 110 }} />
      </Row>
      <Skeleton style={{ height: 76 }} />
      <Skeleton style={{ height: 76 }} />
    </Page>
  );
}

export function EmptyState({
  icon: IconCmp,
  title,
  message,
  action,
}: {
  icon: LucideIcon;
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  const Colors = useColors();
  return (
    <Card style={{ alignItems: 'center', paddingVertical: Spacing.eight, paddingHorizontal: Spacing.six, gap: Spacing.three }}>
      <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.surfaceChip, alignItems: 'center', justifyContent: 'center' }}>
        <IconCmp size={22} color={Colors.inkMuted} />
      </View>
      {title && <Text variant="titleMd">{title}</Text>}
      <Text muted style={{ textAlign: 'center', fontSize: 13, lineHeight: 18 }}>
        {message}
      </Text>
      {action}
    </Card>
  );
}

/** Failed requests must not look like an empty diary or a missing plan. */
export function QueryError({ title, error, onRetry, back = false, tab = false }: {
  title: string;
  error: unknown;
  onRetry: () => void;
  back?: boolean;
  tab?: boolean;
}) {
  return (
    <Page tab={tab} topBar={<TopBar title={title} back={back} />}>
      <EmptyState icon={CircleAlert} title="Não foi possível carregar" message={errorMessage(error, 'Tente novamente em instantes.')} action={<Button title="Tentar novamente" onPress={onRetry} />} />
    </Page>
  );
}

// ---------- Dialog & sheet ----------

/**
 * Centered dialog (Nova Medição, Confirmação) or bottom sheet
 * (Registrar Refeição) over the scrim.
 */
export type DialogHandle = { dismiss: () => void };

export function Dialog({
  ref,
  visible,
  onClose,
  title,
  description,
  children,
  sheet = false,
  sheetSize = 'content',
  scrollable = true,
  footer,
  onDismissed,
}: {
  ref?: Ref<DialogHandle>;
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Bottom sheet with a grab handle and a round back button. */
  sheet?: boolean;
  /** Shared opening heights for bottom sheets; registration forms use the same larger size. */
  sheetSize?: 'content' | 'half' | 'registration';
  scrollable?: boolean;
  footer?: ReactNode;
  /** iOS: the native modal is fully gone, so another modal can be presented safely. */
  onDismissed?: () => void;
}) {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const scope = useId();
  useEffect(() => visible ? registerFeedbackScope(scope) : undefined, [scope, visible]);
  const [progress] = useState(() => new NativeAnimated.Value(0));
  const closing = useRef(false);
  const height = sheetSize === 'registration' ? Math.min(window.height * 0.7, 640) : sheetSize === 'half' ? window.height * 0.5 : undefined;
  const open = useCallback(() => {
    closing.current = false;
    progress.setValue(0);
    NativeAnimated.timing(progress, { toValue: 1, duration: reducedMotion ? 0 : Motion.open, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [progress, reducedMotion]);
  const close = useCallback(() => {
    if (dismissFeedbackInScope(scope)) return;
    if (closing.current) return;
    closing.current = true;
    NativeAnimated.timing(progress, { toValue: 0, duration: reducedMotion ? 0 : Motion.close, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [onClose, progress, reducedMotion, scope]);
  useImperativeHandle(ref, () => ({ dismiss: close }), [close]);
  useEffect(() => () => progress.stopAnimation(), [progress]);

  return (
    <Modal visible={visible} transparent animationType="none" onShow={open} onRequestClose={close} onDismiss={onDismissed} statusBarTranslucent>
      <NativeAnimated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: Colors.scrim }]} onPress={close} accessibilityLabel="Fechar painel" accessibilityRole="button" />
      </NativeAnimated.View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={sheet ? -insets.bottom : 0} pointerEvents="box-none">
        <View
          style={{ flex: 1, justifyContent: sheet ? 'flex-end' : 'center', padding: sheet ? 0 : Spacing.five }}
          pointerEvents="box-none">
          <NativeAnimated.View
            accessibilityViewIsModal
            style={{
              opacity: sheet ? 1 : progress,
              transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: reducedMotion ? [0, 0] : [sheet ? (height ?? window.height * 0.75) : 8, 0] }) }],
              backgroundColor: Colors.surface,
              borderRadius: Radius.lg,
              borderBottomLeftRadius: sheet ? 0 : Radius.lg,
              borderBottomRightRadius: sheet ? 0 : Radius.lg,
              borderCurve: 'continuous',
              paddingHorizontal: Spacing.five,
              paddingTop: sheet ? Spacing.three : Spacing.six,
              paddingBottom: sheet ? insets.bottom + Spacing.five : Spacing.six,
              gap: sheetSize === 'registration' ? Spacing.three : Spacing.five,
              maxHeight: '92%',
              height: sheet ? height : undefined,
              flexShrink: 1,
            }}>
            {sheet && <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.line }} />}
            <Row style={{ alignItems: 'flex-start', gap: Spacing.three }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant={sheet ? 'titleLg' : 'titleMd'} style={sheet && { fontSize: 22, lineHeight: 28 }}>
                  {title}
                </Text>
                {description && <Text muted style={{ fontSize: 13, lineHeight: 18 }}>{description}</Text>}
              </View>
              <IconButton icon={X} label="Fechar" onPress={close} />
            </Row>
            {scrollable ? (
              <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: Spacing.four }} bounces={false}>
                {children}
              </ScrollView>
            ) : (
              <View style={{ flex: 1, minHeight: 0, gap: Spacing.three }}>{children}</View>
            )}
            {footer}
          </NativeAnimated.View>
        </View>
      </KeyboardAvoidingView>
      <FeedbackLayer scope={scope} />
    </Modal>
  );
}
