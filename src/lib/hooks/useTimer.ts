import { useState, useRef, useCallback, useEffect } from "react";

export const useTimer = (initialDuration: number, onComplete?: () => void) => {
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (timeLeft <= 0) return;
    setIsRunning(true);
    clearTimer();
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timeLeft, clearTimer, onComplete]);

  const pause = useCallback(() => {
    setIsRunning(false);
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback((duration: number) => {
    clearTimer();
    setIsRunning(false);
    setTimeLeft(duration);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { timeLeft, isRunning, start, pause, reset };
};
