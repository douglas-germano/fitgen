import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';

const MARK = require('../../assets/images/logo-mark.png');
/** Mark artwork is 717×690. */
const MARK_RATIO = 690 / 717;

/** The FitGen "F" mark (transparent, works on light and dark surfaces). */
export function BrandMark({ size = 56 }: { size?: number }) {
  return <Image source={MARK} style={{ width: size, height: size * MARK_RATIO }} contentFit="contain" accessibilityLabel="FitGen" />;
}

/** Mark + name. The wordmark is live text so it follows the light/dark theme. */
export function BrandLockup({ size = 44 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
      <BrandMark size={size} />
      <Text accessibilityRole="header" style={{ fontSize: size * 0.55, lineHeight: size * 0.7, fontWeight: '800', letterSpacing: -0.5 }}>
        FitGen
      </Text>
    </View>
  );
}
