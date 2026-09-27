import type { GuideSide } from '@ggookggook/shared';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { PlateView as PlateData } from '@/content';
import { colors, space } from '@/theme';
import { Txt } from './Txt';

interface PlateViewProps {
  view: PlateData | null;
  side: GuideSide;
  size: number;
}

function PlateViewComponent({ view, side, size }: PlateViewProps) {
  if (!view || view.image === null) {
    return (
      <View
        accessible
        accessibilityRole="image"
        style={[styles.frame, styles.placeholder, { width: size, height: size }]}
      >
        <Txt variant="caption">{view ? `${view.plate.name} 그림 준비 중` : '그림 준비 중'}</Txt>
      </View>
    );
  }
  const pins = view.pins.filter((pin) => pin.side === undefined || side === 'both' || side === 'center' || pin.side === side);
  return (
    <View
      accessible
      accessibilityRole="image"
      style={[styles.frame, { width: size, height: size }]}
      accessibilityLabel={`${view.plate.name} 그림`}
    >
      <Image source={view.image} style={StyleSheet.absoluteFill} contentFit="contain" />
      {pins.map((pin) => (
        <View
          key={`${pin.acupointId}-${pin.side ?? 'one'}`}
          testID="pin"
          style={[styles.pin, { left: pin.x * size - PIN_SIZE / 2, top: pin.y * size - PIN_SIZE / 2 }]}
        />
      ))}
    </View>
  );
}

export const PlateView = memo(PlateViewComponent);

const PIN_SIZE = 16;

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.rule, alignSelf: 'center' },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: space(4) },
  pin: {
    position: 'absolute',
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    backgroundColor: colors.accent,
    borderWidth: 5,
    borderColor: colors.accentSoft,
  },
});
