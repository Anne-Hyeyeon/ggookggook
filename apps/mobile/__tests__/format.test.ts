import { formatDateLine, formatDuration, formatRelativeDay } from '@/format';

it('formats the date line in Korean', () => {
  expect(formatDateLine(new Date(2026, 8, 28))).toBe('9월 28일 월요일');
});

it('formats relative days by calendar date', () => {
  const now = new Date(2026, 8, 28, 9, 0);
  expect(formatRelativeDay(new Date(2026, 8, 28, 1, 0).toISOString(), now)).toBe('오늘');
  expect(formatRelativeDay(new Date(2026, 8, 27, 23, 0).toISOString(), now)).toBe('어제');
  expect(formatRelativeDay(new Date(2026, 8, 25, 12, 0).toISOString(), now)).toBe('3일 전');
});

it('formats durations', () => {
  expect(formatDuration(192)).toBe('3분 12초');
  expect(formatDuration(240)).toBe('4분');
  expect(formatDuration(45)).toBe('45초');
});
