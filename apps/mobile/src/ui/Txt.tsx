import { StyleSheet, Text, type TextProps } from 'react-native';
import { colors, fonts } from '@/theme';

export type TxtVariant = 'title' | 'heading' | 'body' | 'sub' | 'caption' | 'point' | 'pointSmall' | 'number';

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 25, lineHeight: 33, letterSpacing: -0.6, color: colors.ink },
  heading: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 26, letterSpacing: -0.4, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, color: colors.sub },
  caption: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: colors.faint },
  point: { fontFamily: fonts.serif, fontSize: 27, lineHeight: 36, letterSpacing: -0.4, color: colors.ink },
  pointSmall: { fontFamily: fonts.serif, fontSize: 12.5, lineHeight: 18, color: colors.line },
  number: { fontFamily: fonts.bold, fontSize: 46, lineHeight: 52, letterSpacing: -1.2, color: colors.accent, fontVariant: ['tabular-nums'] },
});

const CLAMPED_VARIANTS = new Set<TxtVariant>(['number', 'point', 'title']);

export function Txt({ variant = 'body', style, ...props }: TextProps & { variant?: TxtVariant }) {
  const maxFontSizeMultiplier = CLAMPED_VARIANTS.has(variant) ? 1.5 : undefined;
  return <Text maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} style={[styles[variant], style]} />;
}
