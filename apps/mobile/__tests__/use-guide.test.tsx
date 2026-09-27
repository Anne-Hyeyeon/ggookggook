import type { GuideSegment } from '@ggookggook/shared';
import { act, renderHook } from '@testing-library/react-native';
import { useGuide } from '@/guide/useGuide';

const segments: GuideSegment[] = [
  { stepIndex: 0, acupointId: 'GV29', side: 'center', seconds: 3 },
  { stepIndex: 1, acupointId: 'EX-HN5', side: 'both', seconds: 2 },
];

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('ticks through segments, reports events, and finishes once', async () => {
  const onEvent = jest.fn();
  const onFinish = jest.fn();
  const { result } = await renderHook(() => useGuide({ segments, pressSeconds: 1, restSeconds: 1, tickMs: 1000, onEvent, onFinish }));

  expect(onEvent).toHaveBeenCalledWith('press');
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(result.current.progress).toEqual({ index: 1, elapsed: 0, finished: false });
  expect(onEvent.mock.calls.map((call) => call[0])).toEqual(['press', 'rest', 'press', 'segment', 'press']);

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(result.current.progress.finished).toBe(true);
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(5);
});

it('stops ticking while paused', async () => {
  const onFinish = jest.fn();
  const { result } = await renderHook(() => useGuide({ segments, pressSeconds: 1, restSeconds: 1, tickMs: 1000, onEvent: jest.fn(), onFinish }));
  await act(async () => {
    result.current.setPaused(true);
  });
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(result.current.progress).toEqual({ index: 0, elapsed: 0, finished: false });
  expect(onFinish).not.toHaveBeenCalled();
});
