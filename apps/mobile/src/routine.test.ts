import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { content } from '@/content';
import { firstSentence, routineSummary, sideLabel, summaryLine, topic, visibleSteps } from '@/routine';

const headache = content.symptom('headache')!;

it('keeps every step outside pregnancy mode', () => {
  expect(visibleSteps(headache, DEFAULT_SETTINGS).map((s) => s.acupointId)).toEqual(['LI4', 'EX-HN5', 'GB20']);
});

it('drops contraindicated steps in pregnancy mode', () => {
  expect(visibleSteps(headache, { ...DEFAULT_SETTINGS, pregnancyMode: true }).map((s) => s.acupointId)).toEqual(['EX-HN5', 'GB20']);
});

it('summarizes count and minutes, counting both sides of sequential points', () => {
  expect(routineSummary(visibleSteps(headache, DEFAULT_SETTINGS))).toEqual({ count: 3, minutes: 4 });
});

it('multiplies minutes by the repeat count, rounding up', () => {
  expect(routineSummary(visibleSteps(headache, DEFAULT_SETTINGS), 2)).toEqual({ count: 3, minutes: 8 });
});

describe('summaryLine', () => {
  it('leaves out the repeat count when it is 1', () => {
    expect(summaryLine(3, 4, 1)).toBe('3곳 · 약 4분');
  });

  it('shows the repeat count when it is above 1', () => {
    expect(summaryLine(3, 8, 2)).toBe('3곳 · 2회 · 약 8분');
  });
});

it('labels sides', () => {
  expect(sideLabel('sequential')).toBe('양쪽 번갈아');
  expect(sideLabel('together')).toBe('양쪽 함께');
  expect(sideLabel('single')).toBe('');
});

it('picks 은 or 는 by the final consonant', () => {
  expect(topic('합곡')).toBe('합곡은');
  expect(topic('삼음교')).toBe('삼음교는');
  expect(topic('합곡, 삼음교')).toBe('합곡, 삼음교는');
});

it('takes the first sentence', () => {
  expect(firstSentence('손등입니다. 누르면 뻐근합니다.')).toBe('손등입니다.');
  expect(firstSentence('한 문장입니다.')).toBe('한 문장입니다.');
});
