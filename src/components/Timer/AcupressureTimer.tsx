"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useTimer } from "@/lib/hooks/useTimer";
import clsx from "clsx";

interface IAcupressureTimerProps {
  initialDuration: number;
  onDurationChange: (duration: number) => void;
}

const PRESETS = [10, 20, 30];
const MIN_DURATION = 5;
const MAX_DURATION = 120;
const STEP = 5;

export const AcupressureTimer = ({ initialDuration, onDurationChange }: IAcupressureTimerProps) => {
  const t = useTranslations("detail");
  const [duration, setDuration] = useState(initialDuration);
  const [isEditing, setIsEditing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
    if (navigator.vibrate) navigator.vibrate(200);
    setTimeout(() => setIsComplete(false), 2000);
  }, []);

  const { timeLeft, isRunning, start, pause, reset } = useTimer(duration, handleComplete);

  const handleDurationChange = (newDuration: number) => {
    const clamped = Math.max(MIN_DURATION, Math.min(MAX_DURATION, newDuration));
    setDuration(clamped);
    onDurationChange(clamped);
    reset(clamped);
  };

  const handleDirectInput = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) handleDurationChange(num);
    setIsEditing(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className={clsx(
      "rounded-xl bg-gray-50 p-4 text-center",
      isComplete && "animate-pulse bg-green-50"
    )}>
      <h3 className="mb-2 text-xs font-bold">{t("timer")}</h3>

      {/* Presets */}
      <div className="mb-3 flex justify-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => handleDurationChange(p)}
            className={clsx(
              "rounded-full px-3.5 py-1 text-xs",
              duration === p && !isRunning
                ? "bg-blue-600 text-white"
                : "border border-gray-300"
            )}
          >
            {p}{t("seconds")}
          </button>
        ))}
      </div>

      {/* Adjustment + display */}
      <div className="mb-3 flex items-center justify-center gap-4">
        <button
          onClick={() => handleDurationChange(duration - STEP)}
          disabled={isRunning || duration <= MIN_DURATION}
          className="rounded-full border border-gray-300 px-3 py-1 text-lg disabled:opacity-30"
          aria-label="Decrease duration"
        >
          −
        </button>

        {isEditing ? (
          <input
            type="number"
            defaultValue={duration}
            onBlur={(e) => handleDirectInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDirectInput((e.target as HTMLInputElement).value)}
            autoFocus
            className="w-20 rounded border border-blue-500 text-center text-3xl font-bold"
            min={MIN_DURATION}
            max={MAX_DURATION}
          />
        ) : (
          <button
            onClick={() => !isRunning && setIsEditing(true)}
            className="text-4xl font-bold tracking-wider"
            aria-label="Edit timer duration"
          >
            {formatTime(timeLeft)}
          </button>
        )}

        <button
          onClick={() => handleDurationChange(duration + STEP)}
          disabled={isRunning || duration >= MAX_DURATION}
          className="rounded-full border border-gray-300 px-3 py-1 text-lg disabled:opacity-30"
          aria-label="Increase duration"
        >
          +
        </button>
      </div>

      {/* Start/Pause */}
      <button
        onClick={isRunning ? pause : start}
        className="rounded-full bg-blue-600 px-8 py-2 text-sm font-bold text-white hover:bg-blue-700"
      >
        {isRunning ? t("pause") : t("start")}
      </button>
    </div>
  );
};
