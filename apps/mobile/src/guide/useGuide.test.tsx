import type { GuideSegment } from '@ggookggook/shared';
import { act, renderHook } from '@testing-library/react-native';
import { useGuide } from '@/guide/useGuide';

const segments: GuideSegment[] = [
  { stepIndex: 0, round: 1, acupointId: 'GV29', side: 'center', seconds: 3 },
  { stepIndex: 1, round: 1, acupointId: 'EX-HN5', side: 'both', seconds: 2 },
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

it('does nothing with no segments: no interval, no finish', async () => {
  const onEvent = jest.fn();
  const onFinish = jest.fn();
  await renderHook(() => useGuide({ segments: [], pressSeconds: 1, restSeconds: 1, tickMs: 1000, onEvent, onFinish }));
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(onEvent).not.toHaveBeenCalled();
  expect(onFinish).not.toHaveBeenCalled();
});

it('starts paused when initialPaused is set, ticking only once resumed, without an initial press event', async () => {
  const onEvent = jest.fn();
  const { result } = await renderHook(() =>
    useGuide({ segments, pressSeconds: 1, restSeconds: 1, tickMs: 1000, initialPaused: true, onEvent, onFinish: jest.fn() }),
  );
  expect(result.current.paused).toBe(true);
  expect(onEvent).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(result.current.progress).toEqual({ index: 0, elapsed: 0, finished: false });

  await act(async () => {
    result.current.setPaused(false);
  });
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(result.current.progress).toEqual({ index: 1, elapsed: 0, finished: false });
});

describe('seek', () => {
  it('jumps to the given segment, resets elapsed, and announces a press', async () => {
    const onEvent = jest.fn();
    const { result } = await renderHook(() =>
      useGuide({ segments, pressSeconds: 1, restSeconds: 1, tickMs: 1000, onEvent, onFinish: jest.fn() }),
    );
    onEvent.mockClear();

    await act(async () => {
      result.current.seek(1);
    });
    expect(result.current.progress).toEqual({ index: 1, elapsed: 0, finished: false });
    expect(onEvent).toHaveBeenCalledWith('press');
  });

  it('clamps an out-of-range index into bounds', async () => {
    const { result } = await renderHook(() =>
      useGuide({ segments, pressSeconds: 1, restSeconds: 1, tickMs: 1000, onEvent: jest.fn(), onFinish: jest.fn() }),
    );
    await act(async () => {
      result.current.seek(99);
    });
    expect(result.current.progress).toEqual({ index: 1, elapsed: 0, finished: false });
  });

  it('resumes ticking from the sought segment after seeking', async () => {
    const { result } = await renderHook(() =>
      useGuide({ segments, pressSeconds: 1, restSeconds: 1, tickMs: 1000, onEvent: jest.fn(), onFinish: jest.fn() }),
    );
    await act(async () => {
      result.current.seek(1);
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.progress.elapsed).toBe(1);
  });
});

describe('finishNow', () => {
  it('stops ticking and reports the time actually spent, not the full segment duration', async () => {
    const onFinish = jest.fn();
    const { result } = await renderHook(() =>
      useGuide({ segments, pressSeconds: 1, restSeconds: 1, tickMs: 1000, onEvent: jest.fn(), onFinish }),
    );
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await act(async () => {
      result.current.finishNow();
    });
    expect(onFinish).toHaveBeenCalledWith(1);
    expect(result.current.progress.finished).toBe(true);

    onFinish.mockClear();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('does nothing once already finished', async () => {
    const onFinish = jest.fn();
    const { result } = await renderHook(() =>
      useGuide({ segments, pressSeconds: 1, restSeconds: 1, tickMs: 1000, onEvent: jest.fn(), onFinish }),
    );
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    onFinish.mockClear();

    await act(async () => {
      result.current.finishNow();
    });
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('does not count a segment skipped over by seek toward the recorded duration', async () => {
    const onFinish = jest.fn();
    const { result } = await renderHook(() =>
      useGuide({ segments, pressSeconds: 1, restSeconds: 1, tickMs: 1000, onEvent: jest.fn(), onFinish }),
    );
    await act(async () => {
      result.current.seek(1); // skips the whole first (3-second) segment without ticking
    });
    await act(async () => {
      jest.advanceTimersByTime(1000); // 1 real tick spent on the second segment
    });
    await act(async () => {
      result.current.finishNow();
    });
    expect(onFinish).toHaveBeenCalledWith(1);
  });

  it('does not subtract time when 이전 restarts the current point or moves back a point', async () => {
    const onFinish = jest.fn();
    const { result } = await renderHook(() =>
      useGuide({ segments, pressSeconds: 1, restSeconds: 1, tickMs: 1000, onEvent: jest.fn(), onFinish }),
    );
    await act(async () => {
      jest.advanceTimersByTime(2000); // 2 real ticks into the first (3-second) segment
    });
    await act(async () => {
      result.current.seek(0); // restarts the same point in place, as 이전 does once elapsed time has passed
    });
    await act(async () => {
      result.current.finishNow();
    });
    expect(onFinish).toHaveBeenCalledWith(2);
  });
});
