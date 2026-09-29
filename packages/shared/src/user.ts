import type { RoutineStep } from './content';

export interface UserRoutine {
  id: string;
  name: string;
  steps: RoutineStep[];
  sourceSymptomId: string | null;
  repeat: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FavoriteAcupoint {
  acupointId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type SessionFeedback = 'better' | 'same' | 'worse';

export type SessionRoutineRef =
  | { kind: 'symptom'; symptomId: string }
  | { kind: 'user'; routineId: string };

export interface SessionLog {
  id: string;
  routine: SessionRoutineRef;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number;
  feedback: SessionFeedback | null;
}

// Same shape as apps/mobile's `RoutineRef` (src/routines.ts): kept here, independent of the
// mobile layer, so `Settings` doesn't need to import a route-facing type from `apps/mobile`.
export type ReminderRoutineRef = { kind: 'symptom'; id: string } | { kind: 'user'; id: string };

export interface Reminder {
  enabled: boolean;
  hour: number;
  minute: number;
  routine: ReminderRoutineRef;
}

export interface Settings {
  rhythmHaptics: boolean;
  pressSeconds: number;
  restSeconds: number;
  pregnancyMode: boolean;
  getReadyEnabled: boolean;
  reminder: Reminder | null;
}

export const DEFAULT_SETTINGS: Settings = {
  rhythmHaptics: true,
  pressSeconds: 5,
  restSeconds: 2,
  pregnancyMode: false,
  getReadyEnabled: true,
  reminder: null,
};

export const GET_READY_SECONDS = 3;

export const PRESS_SECONDS_MIN = 3;
export const PRESS_SECONDS_MAX = 10;
export const REST_SECONDS_MIN = 1;
export const REST_SECONDS_MAX = 5;

export const REMINDER_HOUR_MIN = 0;
export const REMINDER_HOUR_MAX = 23;
export const REMINDER_MINUTE_MIN = 0;
export const REMINDER_MINUTE_MAX = 50;
export const REMINDER_MINUTE_STEP = 10;

export const DEFAULT_REMINDER_HOUR = 15;
export const DEFAULT_REMINDER_MINUTE = 0;
export const DEFAULT_REMINDER_ROUTINE: ReminderRoutineRef = { kind: 'symptom', id: 'eye_fatigue' };
