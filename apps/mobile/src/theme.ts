export const colors = {
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
} as const;

export const fonts = {
  regular: 'Pretendard-Regular',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  serif: 'NotoSerifKR-Bold',
} as const;

export const space = (n: number) => n * 4;
