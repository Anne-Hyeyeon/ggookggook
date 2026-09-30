import type { RoutineStats } from '@ggookggook/store';
import type { SessionLog, UserRoutine } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { formatDateLine } from '@/format';
import { startOfWeek } from '@/records';
import RecordsScreen from '../app/records';

jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});
jest.mock('@ggookggook/store', () => ({ listSessionsBetween: jest.fn(), statsByRoutine: jest.fn(), getUserRoutine: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));

const mocked = store as jest.Mocked<typeof store>;

// Real "now": sessions below are placed relative to it, the same way mine.test.tsx does,
// rather than freezing the clock, since the pure helpers under the screen are already
// covered deterministically in src/records.test.ts.
const now = new Date();
const thisWeekSession = (hourOffset = 9) => {
  const date = new Date(startOfWeek(now).getTime() + hourOffset * 3_600_000);
  return date > now ? now : date;
};
const lastWeekSession = () => new Date(startOfWeek(now).getTime() - 3 * 24 * 3_600_000);

const log = (id: string, completedAt: Date, overrides: Partial<SessionLog> = {}): SessionLog => ({
  id,
  routine: { kind: 'symptom', symptomId: 'headache' },
  startedAt: completedAt.toISOString(),
  completedAt: completedAt.toISOString(),
  durationSeconds: 240,
  feedback: null,
  ...overrides,
});

const stats = (ref: RoutineStats['ref'], completedCount: number, totalSeconds: number, better: number): RoutineStats => ({
  ref,
  completedCount,
  totalSeconds,
  feedbackCounts: { better, same: 0, worse: 0 },
});

const userRoutine = (id: string, overrides: Partial<UserRoutine> = {}): UserRoutine => ({
  id,
  name: '내 아침 루틴',
  steps: [],
  sourceSymptomId: null,
  repeat: 1,
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
  deletedAt: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mocked.listSessionsBetween.mockResolvedValue([]);
  mocked.statsByRoutine.mockResolvedValue([]);
  mocked.getUserRoutine.mockResolvedValue(null);
});

it('navigates back via the back link', async () => {
  await render(<RecordsScreen />);
  await screen.findByText('나의 기록');
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(router.back).toHaveBeenCalled();
});

describe('empty state', () => {
  it('shows the cat empty state when both this week and last week have no sessions', async () => {
    await render(<RecordsScreen />);
    expect(await screen.findByText('아직 기록이 없어요.')).toBeTruthy();
    expect(screen.queryByText('자주 한 루틴')).toBeNull();
  });
});

describe('summary', () => {
  it('shows this week and last week counts and minutes, never a percentage', async () => {
    mocked.listSessionsBetween.mockResolvedValue([
      log('a', thisWeekSession(9), { durationSeconds: 60 }),
      log('b', thisWeekSession(30), { durationSeconds: 120 }),
      log('c', lastWeekSession(), { durationSeconds: 300 }),
    ]);

    await render(<RecordsScreen />);

    expect(await screen.findByText('이번 주 2번 · 3분')).toBeTruthy();
    expect(screen.getByText('지난주 1번 · 5분')).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('reads 지난주에는 기록이 없어요 instead of a zeroed line when last week has no sessions', async () => {
    mocked.listSessionsBetween.mockResolvedValue([log('a', thisWeekSession(9))]);

    await render(<RecordsScreen />);

    expect(await screen.findByText('지난주에는 기록이 없어요.')).toBeTruthy();
    expect(screen.queryByText('지난주 0번 · 0분')).toBeNull();
  });
});

describe('calendar', () => {
  it('exposes each day as an accessible item labeled with its date, count, and 나아졌어요', async () => {
    const session = thisWeekSession(9);
    mocked.listSessionsBetween.mockResolvedValue([log('a', session, { feedback: 'better' })]);

    await render(<RecordsScreen />);
    await screen.findByText(/이번 주/);

    expect(screen.getByLabelText('최근 4주 기록')).toBeTruthy();
    expect(screen.getByLabelText(`${formatDateLine(session)}, 1번, 나아졌어요를 남긴 날`)).toBeTruthy();
  });
});

describe('자주 한 루틴', () => {
  it('shows a symptom routine with count, minutes, and its own 나아졌어요 count, navigable to its preview', async () => {
    mocked.listSessionsBetween.mockResolvedValue([log('a', thisWeekSession(9))]);
    mocked.statsByRoutine.mockResolvedValue([stats({ kind: 'symptom', symptomId: 'headache' }, 3, 360, 2)]);

    await render(<RecordsScreen />);

    expect(await screen.findByText('자주 한 루틴')).toBeTruthy();
    expect(screen.getByText('머리가 아플 때')).toBeTruthy();
    expect(screen.getByText('3번 · 6분')).toBeTruthy();
    expect(screen.getByText('나아졌어요 2번')).toBeTruthy();

    await fireEvent.press(screen.getByText('머리가 아플 때'));
    expect(router.push).toHaveBeenCalledWith('/symptom/headache');
  });

  it('shows a user routine with its stored name, navigable to its preview', async () => {
    mocked.listSessionsBetween.mockResolvedValue([log('a', thisWeekSession(9), { routine: { kind: 'user', routineId: 'r1' } })]);
    mocked.statsByRoutine.mockResolvedValue([stats({ kind: 'user', routineId: 'r1' }, 1, 60, 0)]);
    mocked.getUserRoutine.mockResolvedValue(userRoutine('r1'));

    await render(<RecordsScreen />);

    expect(await screen.findByText('내 아침 루틴')).toBeTruthy();
    await waitFor(() => expect(mocked.getUserRoutine).toHaveBeenCalledWith({}, 'r1'));
    expect(screen.getByText('나아졌어요 0번')).toBeTruthy();

    await fireEvent.press(screen.getByText('내 아침 루틴'));
    expect(router.push).toHaveBeenCalledWith('/routine/r1');
  });

  it('shows 지운 루틴 for a deleted user routine, not navigable', async () => {
    mocked.listSessionsBetween.mockResolvedValue([log('a', thisWeekSession(9), { routine: { kind: 'user', routineId: 'gone' } })]);
    mocked.statsByRoutine.mockResolvedValue([stats({ kind: 'user', routineId: 'gone' }, 1, 60, 0)]);
    mocked.getUserRoutine.mockResolvedValue(null);

    await render(<RecordsScreen />);

    expect(await screen.findByText('지운 루틴')).toBeTruthy();
    await fireEvent.press(screen.getByText('지운 루틴'));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('skips a routine whose symptom no longer exists in content', async () => {
    mocked.listSessionsBetween.mockResolvedValue([log('a', thisWeekSession(9))]);
    mocked.statsByRoutine.mockResolvedValue([stats({ kind: 'symptom', symptomId: 'no_such_symptom' }, 1, 60, 0)]);

    await render(<RecordsScreen />);

    await screen.findByText(/이번 주/);
    expect(screen.queryByText('자주 한 루틴')).toBeNull();
  });

  it('logs an error and falls back to an empty screen when loading fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mocked.listSessionsBetween.mockRejectedValue(new Error('boom'));

    await render(<RecordsScreen />);

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(screen.getByText('아직 기록이 없어요.')).toBeTruthy();
    consoleError.mockRestore();
  });
});
