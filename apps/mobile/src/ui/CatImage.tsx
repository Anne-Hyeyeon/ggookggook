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

// The cat keeps its red paw pads (never tinted); in dark mode it instead sits on a small
// paper-colored rounded backing so it doesn't disappear against a dark background.
export function CatImage({ source, style, decorative = false }: CatImageProps) {
  const { scheme } = useTheme();
  return (
    <View style={style}>
      {scheme === 'dark' && <View style={styles.backing} />}
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        accessibilityIgnoresInvertColors
        accessibilityElementsHidden={decorative}
        importantForAccessibility={decorative ? 'no' : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backing: { ...StyleSheet.absoluteFill, backgroundColor: lightColors.card, borderRadius: 9999 },
});
