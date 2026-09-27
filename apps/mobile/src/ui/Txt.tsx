import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
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

// react-native-web has no CJK line-breaking rules of its own, so a long Korean word
// (e.g. "적당합니다") can wrap mid-word ("적당합니/다"). `wordBreak` isn't part of native
// TextStyle, only react-native-web's, so it's typed as a web-only extension and applied
// only there; native gets the equivalent via `lineBreakStrategyIOS` below.
type WebOnlyTextStyle = TextStyle & { wordBreak?: 'keep-all' };
const keepAllStyle: WebOnlyTextStyle | undefined = Platform.OS === 'web' ? { wordBreak: 'keep-all' } : undefined;

export function Txt({ variant = 'body', style, ...props }: TextProps & { variant?: TxtVariant }) {
  const maxFontSizeMultiplier = CLAMPED_VARIANTS.has(variant) ? 1.5 : undefined;
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      lineBreakStrategyIOS="hangul-word"
      {...props}
      style={[styles[variant], keepAllStyle, style]}
    />
  );
}
