import type { SessionLog } from '@ggookggook/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SqlDatabase } from './db';
import { migrate } from './migrate';
import {
  countSessionsByFeedback,
  countSessionsBySymptom,
  getSession,
  insertSession,
  latestCompletedSession,
  setSessionFeedback,
} from './sessions';
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

  describe('countSessionsByFeedback', () => {
    it('counts sessions with the given feedback', async () => {
      await insertSession(db, log('a', '2026-09-28T00:04:00.000Z'));
      await insertSession(db, log('b', '2026-09-28T00:05:00.000Z'));
      await insertSession(db, log('c', '2026-09-28T00:06:00.000Z'));
      await setSessionFeedback(db, 'a', 'better');
      await setSessionFeedback(db, 'b', 'better');
      await setSessionFeedback(db, 'c', 'worse');
      expect(await countSessionsByFeedback(db, 'better')).toBe(2);
      expect(await countSessionsByFeedback(db, 'worse')).toBe(1);
      expect(await countSessionsByFeedback(db, 'same')).toBe(0);
    });
  });

  describe('countSessionsBySymptom', () => {
    it('counts completed sessions per symptom', async () => {
      await insertSession(db, log('a', '2026-09-28T00:04:00.000Z'));
      await insertSession(db, { ...log('b', '2026-09-28T00:05:00.000Z'), routine: { kind: 'symptom', symptomId: 'insomnia' } });
      await insertSession(db, { ...log('c', '2026-09-28T00:06:00.000Z'), routine: { kind: 'symptom', symptomId: 'headache' } });
      expect(await countSessionsBySymptom(db)).toEqual({ headache: 2, insomnia: 1 });
    });

    it('excludes open sessions and user routines', async () => {
      await insertSession(db, log('open', null));
      await insertSession(db, { ...log('user', '2026-09-28T00:04:00.000Z'), routine: { kind: 'user', routineId: 'r1' } });
      expect(await countSessionsBySymptom(db)).toEqual({});
    });
  });
});
