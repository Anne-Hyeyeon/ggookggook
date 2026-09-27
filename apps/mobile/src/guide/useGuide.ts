import { advanceGuide, guideElapsedTotal, type GuideEvent, type GuideProgress, type GuideSegment } from '@ggookggook/shared';
import { useEffect, useRef, useState } from 'react';

interface UseGuideOptions {
  segments: GuideSegment[];
  pressSeconds: number;
  restSeconds: number;
  tickMs: number;
  onEvent(event: Exclude<GuideEvent, 'finish'>): void;
  onFinish(elapsedTotal: number): void;
}

export function useGuide({ segments, pressSeconds, restSeconds, tickMs, onEvent, onFinish }: UseGuideOptions) {
  const [progress, setProgress] = useState<GuideProgress>({ index: 0, elapsed: 0, finished: false });
  const [paused, setPaused] = useState(false);
  const progressRef = useRef(progress);
  const callbacks = useRef({ onEvent, onFinish });
  callbacks.current = { onEvent, onFinish };

  useEffect(() => {
    if (segments.length > 0) callbacks.current.onEvent('press');
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
    return () => clearInterval(timer);
  }, [paused, segments, pressSeconds, restSeconds, tickMs]);

  return { progress, paused, setPaused };
}
