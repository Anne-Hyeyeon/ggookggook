"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useTimer } from "@/lib/hooks/useTimer";
import { Play, Pause, Minus, Plus } from "lucide-react";
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

  return (
    <div className={clsx(
      "rounded-[48px] bg-surface-container-low p-6 transition-colors duration-300",
      isComplete && "animate-timer-complete"
    )}>
      {/* DURATION label — Figma: 12px w700 ls=1.2 #767773 */}
      <span className="text-xs font-bold text-outline uppercase tracking-[1.2px]">DURATION</span>

      {/* Horizontal timer display — Figma: gap=24 */}
      <div className="mt-3 flex items-center gap-6">
        {/* Minus button — Figma: rounded-full bg=surface-container-high */}
        <button
          onClick={() => handleDurationChange(duration - STEP)}
          disabled={isRunning || duration <= MIN_DURATION}
          className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform disabled:opacity-25"
          aria-label="Decrease duration"
        >
          <Minus className="h-4 w-4" />
        </button>

        {/* Time display — Figma: large 36px+ w800 */}
        <div className="flex-1 flex items-baseline justify-center">
          {isEditing ? (
            <input
              type="number"
              defaultValue={duration}
              onBlur={(e) => handleDirectInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDirectInput((e.target as HTMLInputElement).value)}
              autoFocus
              className="w-20 rounded-xl bg-surface-container-lowest text-center text-4xl font-extrabold text-on-surface focus:outline-none"
              min={MIN_DURATION}
              max={MAX_DURATION}
            />
          ) : (
            <button
              onClick={() => !isRunning && setIsEditing(true)}
              className="text-4xl font-extrabold tracking-tighter text-on-surface"
              aria-label="Edit timer duration"
            >
              {timeLeft}
            </button>
          )}
          <span className="text-sm text-on-surface-variant font-medium ml-1">{t("seconds")}</span>
        </div>

        {/* Plus button */}
        <button
          onClick={() => handleDurationChange(duration + STEP)}
          disabled={isRunning || duration >= MAX_DURATION}
          className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform disabled:opacity-25"
          aria-label="Increase duration"
        >
          <Plus className="h-4 w-4" />
        </button>

        {/* Start/Pause CTA — Figma: r=9999, bg=primary, text=white, icon+text horizontal */}
        <button
          onClick={isRunning ? pause : start}
          className={clsx(
            "flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm transition-all active:scale-95",
            isRunning
              ? "bg-surface-container-high text-on-surface"
              : "bg-primary text-on-primary shadow-lg shadow-primary/20"
          )}
        >
          {isRunning ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4" fill="currentColor" />
          )}
          {isRunning ? t("pause") : t("start")}
        </button>
      </div>
    </div>
  );
};
