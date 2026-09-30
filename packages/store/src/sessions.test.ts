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
  listCompletedSessions,
  listSessionsBetween,
  setSessionFeedback,
  statsByRoutine,
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

  describe('listCompletedSessions', () => {
    it('lists completed sessions newest first', async () => {
      await insertSession(db, log('old', '2026-09-27T00:04:00.000Z'));
      await insertSession(db, log('new', '2026-09-28T00:04:00.000Z'));
      expect((await listCompletedSessions(db, 60)).map((session) => session.id)).toEqual(['new', 'old']);
    });

    it('excludes open sessions', async () => {
      await insertSession(db, log('open', null));
      await insertSession(db, log('done', '2026-09-28T00:04:00.000Z'));
      expect((await listCompletedSessions(db, 60)).map((session) => session.id)).toEqual(['done']);
    });

    it('respects the limit', async () => {
      await insertSession(db, log('a', '2026-09-28T00:01:00.000Z'));
      await insertSession(db, log('b', '2026-09-28T00:02:00.000Z'));
      await insertSession(db, log('c', '2026-09-28T00:03:00.000Z'));
      expect((await listCompletedSessions(db, 2)).map((session) => session.id)).toEqual(['c', 'b']);
    });
  });

  describe('listSessionsBetween', () => {
    it('returns completed sessions within the inclusive range, oldest first', async () => {
      await insertSession(db, log('a', '2026-09-01T00:00:00.000Z'));
      await insertSession(db, log('b', '2026-09-15T00:00:00.000Z'));
      await insertSession(db, log('c', '2026-09-20T00:00:00.000Z'));
      await insertSession(db, log('d', '2026-09-25T00:00:00.000Z'));
      const result = await listSessionsBetween(db, '2026-09-15T00:00:00.000Z', '2026-09-20T00:00:00.000Z');
      expect(result.map((session) => session.id)).toEqual(['b', 'c']);
    });

    it('excludes open sessions', async () => {
      await insertSession(db, log('open', null));
      await insertSession(db, log('done', '2026-09-28T00:04:00.000Z'));
      const result = await listSessionsBetween(db, '2020-01-01T00:00:00.000Z', '2030-01-01T00:00:00.000Z');
      expect(result.map((session) => session.id)).toEqual(['done']);
    });
  });

  describe('statsByRoutine', () => {
    it('aggregates completed count, total seconds, and feedback counts per routine ref from a given start', async () => {
      await insertSession(db, { ...log('a', '2026-09-10T00:00:00.000Z'), durationSeconds: 60 });
      await setSessionFeedback(db, 'a', 'better');
      await insertSession(db, { ...log('b', '2026-09-11T00:00:00.000Z'), durationSeconds: 120 });
      await setSessionFeedback(db, 'b', 'same');
      await insertSession(db, { ...log('c', '2026-09-05T00:00:00.000Z'), durationSeconds: 300 });

      const result = await statsByRoutine(db, '2026-09-06T00:00:00.000Z');

      expect(result).toEqual([
        {
          ref: { kind: 'symptom', symptomId: 'headache' },
          completedCount: 2,
          totalSeconds: 180,
          feedbackCounts: { better: 1, same: 1, worse: 0 },
        },
      ]);
    });

    it('keeps stats separate per routine ref, including user routines', async () => {
      await insertSession(db, { ...log('a', '2026-09-10T00:00:00.000Z'), routine: { kind: 'user', routineId: 'r1' } });
      await insertSession(db, log('b', '2026-09-10T00:00:00.000Z'));

      const result = await statsByRoutine(db, '2026-09-01T00:00:00.000Z');

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ ref: { kind: 'user', routineId: 'r1' }, completedCount: 1 }),
          expect.objectContaining({ ref: { kind: 'symptom', symptomId: 'headache' }, completedCount: 1 }),
        ]),
      );
    });

    it('excludes open sessions', async () => {
      await insertSession(db, log('open', null));
      expect(await statsByRoutine(db, '2020-01-01T00:00:00.000Z')).toEqual([]);
    });
  });
});
