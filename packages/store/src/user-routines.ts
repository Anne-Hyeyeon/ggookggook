import { routineStepSchema, type RoutineStep, type UserRoutine } from '@ggookggook/shared';
import type { SqlDatabase } from './db';

interface UserRoutineRow {
  id: string;
  name: string;
  steps: string;
  source_symptom_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const userRoutineStepsSchema = routineStepSchema.array();

function parseSteps(raw: string): RoutineStep[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse user routine steps', error);
    return [];
  }
  const result = userRoutineStepsSchema.safeParse(value);
  if (!result.success) {
    console.error('Failed to parse user routine steps', result.error);
    return [];
  }
  return result.data;
}

function toRoutine(row: UserRoutineRow): UserRoutine {
  return {
    id: row.id,
    name: row.name,
    steps: parseSteps(row.steps),
    sourceSymptomId: row.source_symptom_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function listUserRoutines(db: SqlDatabase): Promise<UserRoutine[]> {
  const rows = await db.getAllAsync<UserRoutineRow>(
    'SELECT * FROM user_routines WHERE deleted_at IS NULL ORDER BY updated_at DESC',
    [],
  );
  return rows.map(toRoutine);
}

export async function getUserRoutine(db: SqlDatabase, id: string): Promise<UserRoutine | null> {
  const row = await db.getFirstAsync<UserRoutineRow>('SELECT * FROM user_routines WHERE id = ?', [id]);
  return row ? toRoutine(row) : null;
}

export async function saveUserRoutine(db: SqlDatabase, routine: UserRoutine, now: Date): Promise<void> {
  const updatedAt = now.toISOString();
  await db.runAsync(
    `INSERT INTO user_routines (id, name, steps, source_symptom_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       steps = excluded.steps,
       source_symptom_id = excluded.source_symptom_id,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [routine.id, routine.name, JSON.stringify(routine.steps), routine.sourceSymptomId, routine.createdAt, updatedAt, routine.deletedAt],
  );
}

export async function deleteUserRoutine(db: SqlDatabase, id: string, now: Date): Promise<void> {
  const timestamp = now.toISOString();
  await db.runAsync('UPDATE user_routines SET deleted_at = ?, updated_at = ? WHERE id = ?', [timestamp, timestamp, id]);
}
