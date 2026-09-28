import type { SessionLog } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { formatDateLine } from '@/format';
import MineScreen from '../app/(tabs)/mine';

jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});
jest.mock('@ggookggook/store', () => ({ listCompletedSessions: jest.fn(), getUserRoutine: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));

const mocked = store as jest.Mocked<typeof store>;

const now = new Date();
const today = (hour: number, minute: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
const yesterday = (hour: number, minute: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - 1);
  date.setHours(hour, minute, 0, 0);
  return date;
};
const daysAgo = (n: number, hour: number, minute: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - n);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const log = (id: string, completedAt: Date, overrides: Partial<SessionLog> = {}): SessionLog => ({
  id,
  routine: { kind: 'symptom', symptomId: 'headache' },
  startedAt: completedAt.toISOString(),
  completedAt: completedAt.toISOString(),
  durationSeconds: 240,
  feedback: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

it('shows the empty state when there is no history', async () => {
  mocked.listCompletedSessions.mockResolvedValue([]);
  await render(<MineScreen />);
  expect(await screen.findByText('아직 기록이 없어요.')).toBeTruthy();
  expect(screen.getByText('오늘 탭에서 불편한 곳을 골라 보세요.')).toBeTruthy();
});

it('shows the empty state and logs an error when the store rejects', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocked.listCompletedSessions.mockRejectedValue(new Error('boom'));
  await render(<MineScreen />);
  await waitFor(() => expect(consoleError).toHaveBeenCalled());
  expect(screen.getByText('아직 기록이 없어요.')).toBeTruthy();
  consoleError.mockRestore();
});

it('groups sessions by local day, newest first, with a day header and feedback label', async () => {
  const oldDate = daysAgo(5, 8, 0);
  mocked.listCompletedSessions.mockResolvedValue([
    log('s1', today(15, 12), { routine: { kind: 'symptom', symptomId: 'headache' }, feedback: 'better' }),
    log('s2', today(9, 30), { routine: { kind: 'symptom', symptomId: 'insomnia' }, feedback: 'same' }),
    log('s3', yesterday(20, 0), { routine: { kind: 'symptom', symptomId: 'food_stagnation' }, feedback: null }),
    log('s4', oldDate, { routine: { kind: 'symptom', symptomId: 'headache' }, feedback: 'worse' }),
  ]);

  await render(<MineScreen />);

  expect(await screen.findByText('내 루틴')).toBeTruthy();
  expect(screen.getByText('지난 기록')).toBeTruthy();
  expect(screen.getByText('오늘')).toBeTruthy();
  expect(screen.getByText('어제')).toBeTruthy();
  expect(screen.getByText(formatDateLine(oldDate))).toBeTruthy();

  expect(screen.getAllByText('머리가 아플 때')).toHaveLength(2);
  expect(screen.getByText('잠이 안 올 때')).toBeTruthy();
  expect(screen.getByText('체했을 때')).toBeTruthy();

  expect(screen.getByText('오후 3:12 · 4분')).toBeTruthy();
  expect(screen.getByText('오전 9:30 · 4분')).toBeTruthy();

  expect(screen.getByText('나아졌어요')).toBeTruthy();
  expect(screen.getByText('비슷해요')).toBeTruthy();
  expect(screen.getByText('더 불편해요')).toBeTruthy();

  expect(screen.getByText('나만의 루틴 만들기는 준비 중이에요.')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: /^머리가 아플 때 · 오후 3:12/ }));
  expect(router.push).toHaveBeenCalledWith('/symptom/headache');
});

it('skips a session whose symptom no longer exists in content, without crashing', async () => {
  mocked.listCompletedSessions.mockResolvedValue([
    log('ghost', today(12, 0), { routine: { kind: 'symptom', symptomId: 'no_such_symptom' } }),
    log('s1', today(9, 0), { routine: { kind: 'symptom', symptomId: 'headache' } }),
  ]);

  await render(<MineScreen />);
  expect(await screen.findByText('머리가 아플 때')).toBeTruthy();
  expect(screen.queryByText('아직 기록이 없어요.')).toBeNull();
});

it('shows the empty state when every session is a ghost', async () => {
  mocked.listCompletedSessions.mockResolvedValue([log('ghost', today(12, 0), { routine: { kind: 'symptom', symptomId: 'no_such_symptom' } })]);

  await render(<MineScreen />);
  expect(await screen.findByText('아직 기록이 없어요.')).toBeTruthy();
});

it('shows a user routine session with its stored name, not navigable to a symptom detail', async () => {
  mocked.listCompletedSessions.mockResolvedValue([log('s1', today(10, 0), { routine: { kind: 'user', routineId: 'r1' } })]);
  mocked.getUserRoutine.mockResolvedValue({
    id: 'r1',
    name: '내 아침 루틴',
    steps: [],
    sourceSymptomId: null,
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z',
    deletedAt: null,
  });

  await render(<MineScreen />);
  expect(await screen.findByText('내 아침 루틴')).toBeTruthy();
  expect(mocked.getUserRoutine).toHaveBeenCalledWith({}, 'r1');

  await fireEvent.press(screen.getByText('내 아침 루틴'));
  expect(router.push).not.toHaveBeenCalled();
});

it('shows 지운 루틴 for a user routine session whose routine no longer exists', async () => {
  mocked.listCompletedSessions.mockResolvedValue([log('s1', today(10, 0), { routine: { kind: 'user', routineId: 'gone' } })]);
  mocked.getUserRoutine.mockResolvedValue(null);

  await render(<MineScreen />);
  expect(await screen.findByText('지운 루틴')).toBeTruthy();
});

it('shows 지운 루틴, not the old name, for a soft-deleted user routine session', async () => {
  mocked.listCompletedSessions.mockResolvedValue([log('s1', today(10, 0), { routine: { kind: 'user', routineId: 'r1' } })]);
  mocked.getUserRoutine.mockResolvedValue({
    id: 'r1',
    name: '내 아침 루틴',
    steps: [],
    sourceSymptomId: null,
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z',
    deletedAt: '2026-09-29T00:00:00.000Z',
  });

  await render(<MineScreen />);
  expect(await screen.findByText('지운 루틴')).toBeTruthy();
  expect(screen.queryByText('내 아침 루틴')).toBeNull();
});
