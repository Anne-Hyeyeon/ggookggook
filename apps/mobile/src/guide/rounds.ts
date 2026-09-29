import { USER_ROUTINE_LIMITS } from '@ggookggook/shared';

// A route's `?rounds=` search param arrives as a string (or an array, or missing) from Expo
// Router: this turns that into a valid round count, clamped to the same 1-5 range as a user
// routine's own `repeat`, defaulting to 1 for anything missing or unparseable.
export function parseRounds(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(USER_ROUTINE_LIMITS.repeatMax, Math.max(USER_ROUTINE_LIMITS.repeatMin, Math.round(parsed)));
}
