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
  // The plate drawing shows only one side of the body; flip it (and every pin's x) when the
  // segment being guided is the other side, so the marker still lands on the correct hand/foot.
  const mirror = (view.plate.depicts === 'left' && side === 'right') || (view.plate.depicts === 'right' && side === 'left');
  const pins = view.pins.filter((pin) => pin.side === undefined || side === 'both' || side === 'center' || pin.side === side);
  return (
    <View
      accessible
      accessibilityRole="image"
      style={[styles.frame, { width: size, height: size }]}
      accessibilityLabel={`${view.plate.name} 그림`}
    >
      <Image
        testID="plate-image"
        source={view.image}
        style={[StyleSheet.absoluteFill, mirror && styles.mirrored]}
        contentFit="contain"
      />
      {pins.map((pin) => {
        const x = mirror ? 1 - pin.x : pin.x;
        return (
          <View
            key={`${pin.acupointId}-${pin.side ?? 'one'}`}
            style={[styles.pinWrap, { left: x * size - HALO_SIZE / 2, top: pin.y * size - HALO_SIZE / 2 }]}
          >
            <View testID="halo" style={styles.halo} />
            <View testID="pin" style={styles.dot} />
          </View>
        );
      })}
    </View>
  );
}

export const PlateView = memo(PlateViewComponent);

const DOT_SIZE = 14;
const HALO_SIZE = 30;

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.rule, alignSelf: 'center' },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: space(4) },
  mirrored: { transform: [{ scaleX: -1 }] },
  pinWrap: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: colors.accentSoft,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.accent,
  },
});
