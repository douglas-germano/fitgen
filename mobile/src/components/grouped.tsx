import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/providers/theme';

/**
 * Screen kit in the style of the profile (Huawei Health "Eu" layout):
 * rounded groups of rows with inset dividers, square shortcut tiles and header cards.
 */

/** Fixed glyph colors for tiles, readable on both themes. */
export const TileColors = {
  orange: '#ff8a3d',
  purple: '#a77bff',
  blue: '#3d8bff',
  green: '#34c26b',
  red: '#ff5a5f',
} as const;

export const GROUP_RADIUS = Radius.md + 4;

/** Bold section title that sits outside a group or card. */
export function GroupTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.two, gap: Spacing.two }}>
      <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '700' }}>{title}</Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ fontSize: 14, fontWeight: '600' }} color={colors.voltInk}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Rounded group of rows with inset dividers, like the system settings lists. */
export function Group({ title, action, onAction, children, nativeID }: {
  title?: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  nativeID?: string;
}) {
  const colors = useColors();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View nativeID={nativeID} style={{ gap: Spacing.three }}>
      {title ? <GroupTitle title={title} action={action} onAction={onAction} /> : null}
      <View style={[styles.group, { backgroundColor: colors.surfaceSunken }]}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 56, marginRight: Spacing.four }} />}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export function GroupRow({ icon: Icon, leading, title, caption, captionLines = 2, value, dot, onPress, accessibilityLabel }: {
  icon?: LucideIcon;
  /** Custom 24px leading view instead of an icon (avatar, mascot). */
  leading?: ReactNode;
  title: string;
  /** Muted second line. */
  caption?: string | null;
  captionLines?: number;
  accessibilityLabel?: string;
  /** Muted text before the chevron ("Versão: 1.0.12", "82,4 kg"). */
  value?: string | null;
  /** Small red attention dot after the title. */
  dot?: boolean;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={accessibilityLabel} disabled={!onPress} onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceChip : 'transparent' }]}>
      <View style={{ width: 24, alignItems: 'center' }}>
        {leading ?? (Icon && <Icon size={24} color={colors.ink} strokeWidth={1.6} />)}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <Text style={{ fontSize: 16, lineHeight: 22, flexShrink: 1 }} numberOfLines={1}>{title}</Text>
          {dot && <View style={[styles.dot, { backgroundColor: colors.danger }]} />}
        </View>
        {caption ? <Text muted style={{ fontSize: 13, lineHeight: 18 }} numberOfLines={captionLines}>{caption}</Text> : null}
      </View>
      {value ? <Text muted style={{ fontSize: 14, maxWidth: '50%', fontVariant: ['tabular-nums'] }} numberOfLines={1}>{value}</Text> : null}
      {onPress && <ChevronRight size={16} color={colors.inkMuted} />}
    </Pressable>
  );
}

export function TileRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'stretch' }}>{children}</View>;
}

/** Square shortcut tile: colored glyph, optional big value, title and caption. */
export function Tile({ icon: Icon, color, title, value, caption, selected, onPress, role = 'button' }: {
  icon: LucideIcon;
  color: string;
  title: string;
  value?: string;
  caption?: string;
  selected?: boolean;
  onPress?: () => void;
  role?: 'button' | 'tab';
}) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole={role} aria-selected={role === 'tab' ? !!selected : undefined}
      accessibilityLabel={[title, value, caption].filter(Boolean).join('. ')} onPress={onPress} disabled={!onPress}
      style={({ pressed }) => [styles.tile, {
        backgroundColor: pressed ? colors.surfaceChip : colors.surfaceSunken,
        borderColor: selected ? colors.volt : 'transparent',
      }]}>
      <Icon size={30} color={color} fill={color} fillOpacity={0.22} strokeWidth={2} />
      {value ? (
        <Text style={{ textAlign: 'center', fontSize: 18, lineHeight: 23, fontWeight: '700', fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      ) : null}
      <Text variant="titleSm" style={{ textAlign: 'center', fontSize: 14, lineHeight: 18 }} numberOfLines={2}>{title}</Text>
      {caption ? <Text muted style={{ textAlign: 'center', fontSize: 12, lineHeight: 16 }} numberOfLines={3}>{caption}</Text> : null}
    </Pressable>
  );
}

/** Card with a "Title  value >" header row, like "Minhas medalhas  13 >". */
export function HeaderCard({ title, value, onPress, children }: {
  title: string;
  value?: string | null;
  onPress?: () => void;
  children?: ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.group, { backgroundColor: colors.surfaceSunken }]}>
      <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress}
        style={({ pressed }) => [styles.headerRow, { opacity: pressed ? 0.7 : 1 }]}>
        <Text style={{ flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '600' }} accessibilityRole="header" numberOfLines={1}>{title}</Text>
        {value ? <Text muted style={{ fontSize: 15, lineHeight: 20, flexShrink: 1 }} numberOfLines={1}>{value}</Text> : null}
        {onPress && <ChevronRight size={18} color={colors.inkMuted} />}
      </Pressable>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: GROUP_RADIUS, borderCurve: 'continuous', overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.four, minHeight: 56,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tile: {
    flex: 1, minWidth: 0, borderRadius: Radius.md, borderCurve: 'continuous', borderWidth: 2, alignItems: 'center',
    paddingVertical: Spacing.four, paddingHorizontal: Spacing.two, gap: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: Spacing.three,
  },
});
