import type { SessionFeedback, SessionLog } from '@ggookggook/shared';
import type { SqlDatabase } from './db';

interface SessionRow {
  id: string;
  routine_kind: 'symptom' | 'user';
  routine_ref: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number;
  feedback: SessionFeedback | null;
}

function toLog(row: SessionRow): SessionLog {
  return {
    id: row.id,
    routine: row.routine_kind === 'symptom' ? { kind: 'symptom', symptomId: row.routine_ref } : { kind: 'user', routineId: row.routine_ref },
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
    feedback: row.feedback,
  };
}

export async function insertSession(db: SqlDatabase, log: SessionLog): Promise<void> {
  const ref = log.routine.kind === 'symptom' ? log.routine.symptomId : log.routine.routineId;
  await db.runAsync(
    'INSERT INTO sessions (id, routine_kind, routine_ref, started_at, completed_at, duration_seconds, feedback) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [log.id, log.routine.kind, ref, log.startedAt, log.completedAt, log.durationSeconds, log.feedback],
  );
}

export async function setSessionFeedback(db: SqlDatabase, id: string, feedback: SessionFeedback): Promise<void> {
  await db.runAsync('UPDATE sessions SET feedback = ? WHERE id = ?', [feedback, id]);
}

export async function getSession(db: SqlDatabase, id: string): Promise<SessionLog | null> {
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE id = ?', [id]);
  return row ? toLog(row) : null;
}

export async function latestCompletedSession(db: SqlDatabase): Promise<SessionLog | null> {
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM sessions WHERE completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1', []);
  return row ? toLog(row) : null;
}
