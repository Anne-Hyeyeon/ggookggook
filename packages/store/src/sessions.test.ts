import type { SessionLog } from '@ggookggook/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SqlDatabase } from './db';
import { migrate } from './migrate';
import { getSession, insertSession, latestCompletedSession, setSessionFeedback } from './sessions';
import { openTestDb } from './test-db';

let db: SqlDatabase;
beforeEach(async () => {
  db = openTestDb();
  await migrate(db);
});

const log = (id: string, completedAt: string | null): SessionLog => ({
  id,
  routine: { kind: 'symptom', symptomId: 'headache' },
  startedAt: '2026-09-28T00:00:00.000Z',
  completedAt,
  durationSeconds: 240,
  feedback: null,
});

describe('sessions', () => {
  it('round-trips a session', async () => {
    await insertSession(db, log('a', '2026-09-28T00:04:00.000Z'));
    expect(await getSession(db, 'a')).toEqual(log('a', '2026-09-28T00:04:00.000Z'));
    expect(await getSession(db, 'missing')).toBeNull();
  });

  it('round-trips a user routine reference', async () => {
    await insertSession(db, { ...log('u', null), routine: { kind: 'user', routineId: 'r1' } });
    expect((await getSession(db, 'u'))?.routine).toEqual({ kind: 'user', routineId: 'r1' });
  });

  it('records feedback', async () => {
    await insertSession(db, log('a', '2026-09-28T00:04:00.000Z'));
    await setSessionFeedback(db, 'a', 'better');
    expect((await getSession(db, 'a'))?.feedback).toBe('better');
  });

  it('finds the most recently completed session', async () => {
    await insertSession(db, log('old', '2026-09-27T00:04:00.000Z'));
    await insertSession(db, log('new', '2026-09-28T00:04:00.000Z'));
    await insertSession(db, log('open', null));
    expect((await latestCompletedSession(db))?.id).toBe('new');
  });
});
