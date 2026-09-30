import { darkColors, lightColors, type Colors } from '@/theme';

export interface WidgetPalette {
  bg: string;
  ink: string;
  sub: string;
  accent: string;
  rule: string;
}

function pick(colors: Colors): WidgetPalette {
  return { bg: colors.bg, ink: colors.ink, sub: colors.sub, accent: colors.accent, rule: colors.rule };
}

export const WIDGET_PALETTES = { light: pick(lightColors), dark: pick(darkColors) } as const;
