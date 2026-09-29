import { USER_ROUTINE_LIMITS } from '@ggookggook/shared';
import type { SqlDatabase } from './db';

export async function getValue(db: SqlDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setValue(db: SqlDatabase, key: string, value: string, now: Date): Promise<void> {
  await db.runAsync(
    'INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    [key, value, now.toISOString()],
  );
}

const SYMPTOM_REPEAT_KEY_PREFIX = 'repeat:';
const DEFAULT_SYMPTOM_REPEAT = 1;

export async function getSymptomRepeat(db: SqlDatabase, symptomId: string): Promise<number> {
  const raw = await getValue(db, `${SYMPTOM_REPEAT_KEY_PREFIX}${symptomId}`);
  if (raw === null) return DEFAULT_SYMPTOM_REPEAT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < USER_ROUTINE_LIMITS.repeatMin || parsed > USER_ROUTINE_LIMITS.repeatMax) {
    return DEFAULT_SYMPTOM_REPEAT;
  }
  return parsed;
}

export async function setSymptomRepeat(db: SqlDatabase, symptomId: string, repeat: number, now: Date): Promise<void> {
  await setValue(db, `${SYMPTOM_REPEAT_KEY_PREFIX}${symptomId}`, String(repeat), now);
}
