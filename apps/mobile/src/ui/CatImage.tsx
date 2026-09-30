import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { lightColors } from '@/theme';
import { useTheme } from '@/theme/ThemeProvider';

interface CatImageProps {
  source: number;
  style: StyleProp<ViewStyle>;
  // The home header's cat is purely decorative, next to a title the screen reader already
  // reads; every other placement is the sole content of its own accessible image row.
  decorative?: boolean;
}

// Dark mode backs the cat with a clipped, paper-colored (light bg, not the brighter card token, to cut night glare) circle; light mode is unbacked.
export function CatImage({ source, style, decorative = false }: CatImageProps) {
  const { scheme } = useTheme();
  const image = (
    <Image
      testID="cat-image"
      source={source}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      accessibilityIgnoresInvertColors
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no' : undefined}
    />
  );
  return (
    <View style={style}>
      {scheme === 'dark' ? (
        <View testID="cat-backing" style={styles.backing}>
          {image}
        </View>
      ) : (
        image
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backing: { ...StyleSheet.absoluteFill, backgroundColor: lightColors.bg, borderRadius: 9999, overflow: 'hidden' },
});
