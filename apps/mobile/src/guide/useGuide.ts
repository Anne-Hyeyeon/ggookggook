import { advanceGuide, guideElapsedTotal, seekSegment, type GuideEvent, type GuideProgress, type GuideSegment } from '@ggookggook/shared';
import { useEffect, useRef, useState } from 'react';

interface UseGuideOptions {
  segments: GuideSegment[];
  pressSeconds: number;
  restSeconds: number;
  tickMs: number;
  initialPaused?: boolean;
  onEvent(event: Exclude<GuideEvent, 'finish'>): void;
  onFinish(elapsedTotal: number): void;
}

export function useGuide({ segments, pressSeconds, restSeconds, tickMs, initialPaused, onEvent, onFinish }: UseGuideOptions) {
  const [progress, setProgress] = useState<GuideProgress>({ index: 0, elapsed: 0, finished: false });
  const [paused, setPaused] = useState(initialPaused ?? false);
  const progressRef = useRef(progress);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbacks = useRef({ onEvent, onFinish });
  callbacks.current = { onEvent, onFinish };

  useEffect(() => {
    // Suppressed when starting paused (the get-ready countdown holds the guide there): the
    // caller announces the first press itself, once that countdown ends or is skipped, via `seek`.
    if (segments.length > 0 && !(initialPaused ?? false)) callbacks.current.onEvent('press');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  useEffect(() => {
    if (paused || progressRef.current.finished || segments.length === 0) return;
    const timer = setInterval(() => {
      const { progress: next, events } = advanceGuide(progressRef.current, segments, pressSeconds, restSeconds);
      progressRef.current = next;
      setProgress(next);
      for (const event of events) {
        if (event === 'finish') callbacks.current.onFinish(guideElapsedTotal(next, segments));
        else callbacks.current.onEvent(event);
      }
      if (next.finished) clearInterval(timer);
    }, tickMs);
    intervalRef.current = timer;
    return () => clearInterval(timer);
  }, [paused, segments, pressSeconds, restSeconds, tickMs]);

  // Jumps to a segment picked by the previous/next controls: resets the rhythm to the start
  // of that segment and re-announces the press, same as a fresh segment reached by ticking.
  function seek(index: number) {
    if (progressRef.current.finished) return;
    const next = seekSegment(progressRef.current, segments, index);
    progressRef.current = next;
    setProgress(next);
    callbacks.current.onEvent('press');
  }

  // 마치기, pressed before the last segment's timer has naturally run out: stops ticking and
  // reports the time actually spent, rather than the full segment duration.
  function finishNow() {
    if (progressRef.current.finished) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    const total = guideElapsedTotal(progressRef.current, segments);
    const finished: GuideProgress = { ...progressRef.current, finished: true };
    progressRef.current = finished;
    setProgress(finished);
    callbacks.current.onFinish(total);
  }

  return { progress, paused, setPaused, seek, finishNow };
}
