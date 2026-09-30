export type ColorScheme = 'light' | 'dark';

export const lightColors = {
  bg: '#F8F8F7',
  ink: '#23211E',
  sub: '#6A665E',
  // Darkened from #8A857C (3.45:1) to meet 4.5:1 against colors.bg (#F8F8F7), keeping the warm-gray hue.
  faint: '#767168',
  rule: '#E2E2DF',
  card: '#FFFFFF',
  accent: '#C23B2A',
  accentSoft: 'rgba(194, 59, 42, 0.16)',
  line: '#3A3732',
  scrim: 'rgba(35, 33, 30, 0.4)',
} as const;

// Dark tokens verified against WCAG relative-luminance contrast: ink/bg 14.93:1 (>=7:1 body
// text), sub/bg 8.11:1 and faint/bg 5.21:1 (>=4.5:1), accent/bg 5.12:1 (>=4.5:1 accent text).
// scrim stays black-based rather than ink-based here: this theme's ink is light (for text on a
// dark background), so a modal-dimming overlay still needs a dark tone regardless of scheme.
export const darkColors = {
  bg: '#171614',
  ink: '#ECE9E4',
  sub: '#B3ADA3',
  faint: '#8F897F',
  rule: '#34312C',
  card: '#211F1C',
  accent: '#E0604C',
  accentSoft: 'rgba(224, 96, 76, 0.22)',
  line: '#D9D4CC',
  scrim: 'rgba(0, 0, 0, 0.55)',
} as const;

export interface Colors {
  bg: string;
  ink: string;
  sub: string;
  faint: string;
  rule: string;
  card: string;
  accent: string;
  accentSoft: string;
  line: string;
  scrim: string;
}

export const colorSchemes: Record<ColorScheme, Colors> = {
  light: lightColors,
  dark: darkColors,
};

export const fonts = {
  regular: 'Pretendard-Regular',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  serif: 'NotoSerifKR-Bold',
} as const;

export const space = (n: number) => n * 4;
