import type { SessionFeedback, SessionLog, SessionRoutineRef } from '@ggookggook/shared';
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

export interface RoutineStats {
  ref: SessionRoutineRef;
  completedCount: number;
  totalSeconds: number;
  feedbackCounts: Record<SessionFeedback, number>;
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

export async function listCompletedSessions(db: SqlDatabase, limit: number): Promise<SessionLog[]> {
  const rows = await db.getAllAsync<SessionRow>(
    'SELECT * FROM sessions WHERE completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(toLog);
}

export async function countSessionsByFeedback(db: SqlDatabase, feedback: SessionFeedback): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sessions WHERE feedback = ?', [feedback]);
  return row?.count ?? 0;
}

export async function countSessionsBySymptom(db: SqlDatabase): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ routine_ref: string; count: number }>(
    "SELECT routine_ref, COUNT(*) as count FROM sessions WHERE routine_kind = 'symptom' AND completed_at IS NOT NULL GROUP BY routine_ref",
    [],
  );
  return Object.fromEntries(rows.map((row) => [row.routine_ref, row.count]));
}

// Inclusive on both ends: the records screen passes `now` as `toIso`, and a session
// completed at that exact instant must still show up.
export async function listSessionsBetween(db: SqlDatabase, fromIso: string, toIso: string): Promise<SessionLog[]> {
  const rows = await db.getAllAsync<SessionRow>(
    'SELECT * FROM sessions WHERE completed_at IS NOT NULL AND completed_at >= ? AND completed_at <= ? ORDER BY completed_at ASC',
    [fromIso, toIso],
  );
  return rows.map(toLog);
}

interface RoutineStatsRow {
  routine_kind: 'symptom' | 'user';
  routine_ref: string;
  completed_count: number;
  total_seconds: number;
  better: number;
  same: number;
  worse: number;
}

// From `fromIso` through now (no upper bound): the records screen's "자주 한 루틴" list
// windows on the same start as its 28-day calendar.
export async function statsByRoutine(db: SqlDatabase, fromIso: string): Promise<RoutineStats[]> {
  const rows = await db.getAllAsync<RoutineStatsRow>(
    `SELECT routine_kind, routine_ref,
            COUNT(*) as completed_count,
            SUM(duration_seconds) as total_seconds,
            SUM(CASE WHEN feedback = 'better' THEN 1 ELSE 0 END) as better,
            SUM(CASE WHEN feedback = 'same' THEN 1 ELSE 0 END) as same,
            SUM(CASE WHEN feedback = 'worse' THEN 1 ELSE 0 END) as worse
       FROM sessions
      WHERE completed_at IS NOT NULL AND completed_at >= ?
      GROUP BY routine_kind, routine_ref`,
    [fromIso],
  );
  return rows.map((row) => ({
    ref: row.routine_kind === 'symptom' ? { kind: 'symptom', symptomId: row.routine_ref } : { kind: 'user', routineId: row.routine_ref },
    completedCount: row.completed_count,
    totalSeconds: row.total_seconds,
    feedbackCounts: { better: row.better, same: row.same, worse: row.worse },
  }));
}
