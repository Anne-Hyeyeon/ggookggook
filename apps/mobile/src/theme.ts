export const colors = {
  bg: '#F8F8F7',
  ink: '#23211E',
  sub: '#6A665E',
  faint: '#8A857C',
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
