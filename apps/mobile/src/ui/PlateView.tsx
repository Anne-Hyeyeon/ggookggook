import type { GuideSide } from '@ggookggook/shared';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import type { PlateView as PlateData } from '@/content';
import { colors, space } from '@/theme';
import { Txt } from './Txt';

interface PlateViewProps {
  view: PlateData | null;
  side: GuideSide;
  size: number;
}

export function PlateView({ view, side, size }: PlateViewProps) {
  if (!view || view.image === null) {
    return (
      <View style={[styles.frame, styles.placeholder, { width: size, height: size }]}>
        <Txt variant="caption">{view ? `${view.plate.name} 그림 준비 중` : '그림 준비 중'}</Txt>
      </View>
    );
  }
  const pins = view.pins.filter((pin) => pin.side === undefined || side === 'both' || side === 'center' || pin.side === side);
  return (
    <View style={[styles.frame, { width: size, height: size }]} accessibilityLabel={`${view.plate.name} 그림`}>
      <Image source={view.image} style={StyleSheet.absoluteFill} contentFit="contain" />
      {pins.map((pin) => (
        <View
          key={`${pin.acupointId}-${pin.side ?? 'one'}`}
          testID="pin"
          style={[styles.pin, { left: pin.x * size - 8, top: pin.y * size - 8 }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.rule, alignSelf: 'center' },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: space(4) },
  pin: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 5,
    borderColor: colors.accentSoft,
  },
});
