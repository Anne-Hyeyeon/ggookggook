import type { RoutineStep } from './content';

export interface UserRoutine {
  id: string;
  name: string;
  steps: RoutineStep[];
  sourceSymptomId: string | null;
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

export interface Settings {
  rhythmHaptics: boolean;
  pressSeconds: number;
  restSeconds: number;
  pregnancyMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  rhythmHaptics: true,
  pressSeconds: 5,
  restSeconds: 2,
  pregnancyMode: false,
};

export const PRESS_SECONDS_MIN = 3;
export const PRESS_SECONDS_MAX = 10;
export const REST_SECONDS_MIN = 1;
export const REST_SECONDS_MAX = 5;
