import {
  formatDateLine,
  formatDayHeader,
  formatDuration,
  formatHourMinute,
  formatRelativeDay,
  formatTimeOfDay,
  greetingFor,
  localDayKey,
} from '@/format';

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

it('formats a day header, falling back to the full date past yesterday', () => {
  const now = new Date(2026, 8, 28, 9, 0);
  expect(formatDayHeader(new Date(2026, 8, 28, 1, 0).toISOString(), now)).toBe('오늘');
  expect(formatDayHeader(new Date(2026, 8, 27, 23, 0).toISOString(), now)).toBe('어제');
  expect(formatDayHeader(new Date(2026, 8, 26, 12, 0).toISOString(), now)).toBe('9월 26일 토요일');
});

it('formats the time of day in 12-hour Korean 오전/오후', () => {
  expect(formatTimeOfDay(new Date(2026, 8, 28, 15, 12).toISOString())).toBe('오후 3:12');
  expect(formatTimeOfDay(new Date(2026, 8, 28, 0, 5).toISOString())).toBe('오전 12:05');
  expect(formatTimeOfDay(new Date(2026, 8, 28, 12, 0).toISOString())).toBe('오후 12:00');
  expect(formatTimeOfDay(new Date(2026, 8, 28, 9, 30).toISOString())).toBe('오전 9:30');
});

it('formats an hour and minute in 12-hour Korean 오전/오후', () => {
  expect(formatHourMinute(15, 0)).toBe('오후 3:00');
  expect(formatHourMinute(0, 10)).toBe('오전 12:10');
  expect(formatHourMinute(12, 0)).toBe('오후 12:00');
  expect(formatHourMinute(9, 30)).toBe('오전 9:30');
});

it('greets by time of day', () => {
  expect(greetingFor(5)).toBe('좋은 아침이에요');
  expect(greetingFor(11)).toBe('좋은 아침이에요');
  expect(greetingFor(12)).toBe('오후도 잠깐 쉬어 가요');
  expect(greetingFor(17)).toBe('오후도 잠깐 쉬어 가요');
  expect(greetingFor(18)).toBe('편안한 밤 되세요');
  expect(greetingFor(4)).toBe('편안한 밤 되세요');
  expect(greetingFor(0)).toBe('편안한 밤 되세요');
});

it('keys sessions by local calendar day', () => {
  expect(localDayKey(new Date(2026, 8, 28, 1, 0).toISOString())).toBe(localDayKey(new Date(2026, 8, 28, 23, 0).toISOString()));
  expect(localDayKey(new Date(2026, 8, 27, 23, 0).toISOString())).not.toBe(localDayKey(new Date(2026, 8, 28, 0, 0).toISOString()));
});
