import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import type { SessionLog, UserRoutine } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { formatDateLine } from '@/format';
import { useFavorites } from '@/state/favorites';
import { useSettings } from '@/state/settings';
import MineScreen from '../app/(tabs)/mine';

jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});
jest.mock('@ggookggook/store', () => ({ listCompletedSessions: jest.fn(), getUserRoutine: jest.fn(), listUserRoutines: jest.fn() }));
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
  mocked.listCompletedSessions.mockResolvedValue([]);
  mocked.listUserRoutines.mockResolvedValue([]);
  useFavorites.setState({ loaded: true, ids: new Set() });
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
});

describe('a completely fresh app', () => {
  it('shows the big empty state only when favorites, my routines, and history are all empty', async () => {
    await render(<MineScreen />);
    expect(await screen.findByText('아직 기록이 없어요.')).toBeTruthy();
    expect(screen.getByText('오늘 탭에서 불편한 곳을 골라 보세요.')).toBeTruthy();
    expect(screen.getByText('즐겨찾기를 누른 혈자리가 여기에 모여요.')).toBeTruthy();
    expect(screen.getByText('새 루틴 만들기')).toBeTruthy();
    expect(screen.queryByText('나만의 루틴 만들기는 준비 중이에요.')).toBeNull();
  });

  it('logs an error and falls back to empty sections when history rejects', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mocked.listCompletedSessions.mockRejectedValue(new Error('boom'));
    await render(<MineScreen />);
    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(screen.getByText('아직 기록이 없어요.')).toBeTruthy();
    consoleError.mockRestore();
  });

  it('logs an error and falls back to an empty 내 루틴 section when listUserRoutines rejects', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mocked.listUserRoutines.mockRejectedValue(new Error('boom'));
    await render(<MineScreen />);
    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(screen.getByText('새 루틴 만들기')).toBeTruthy();
    consoleError.mockRestore();
  });
});

describe('즐겨찾는 혈자리', () => {
  it('lists favorited acupoints with their hanja and first location sentence, navigable to the acupoint screen', async () => {
    useFavorites.setState({ ids: new Set(['LI4']) });
    await render(<MineScreen />);
    expect(await screen.findByText('즐겨찾는 혈자리')).toBeTruthy();
    expect(screen.getByText('합곡')).toBeTruthy();
    expect(screen.getByText('合谷')).toBeTruthy();
    expect(screen.getByText('손등에서 엄지와 검지 뼈 사이입니다.')).toBeTruthy();
    expect(screen.queryByText('즐겨찾기를 누른 혈자리가 여기에 모여요.')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: /^합곡,/ }));
    expect(router.push).toHaveBeenCalledWith('/acupoint/LI4');
  });

  it('shows the empty line when there are no favorites', async () => {
    await render(<MineScreen />);
    expect(await screen.findByText('즐겨찾기를 누른 혈자리가 여기에 모여요.')).toBeTruthy();
  });
});

describe('내 루틴', () => {
  it('shows a routine with its point count and rounded minutes, pregnancy-aware, navigable to its preview', async () => {
    mocked.listUserRoutines.mockResolvedValue([
      userRoutine('r1', { steps: [{ acupointId: 'LI4', seconds: 60 }, { acupointId: 'GV29', seconds: 60 }] }),
    ]);
    await render(<MineScreen />);
    expect(await screen.findByText('내 아침 루틴')).toBeTruthy();
    expect(screen.getByText('2곳 · 약 3분')).toBeTruthy();

    await fireEvent.press(screen.getByText('내 아침 루틴'));
    expect(router.push).toHaveBeenCalledWith('/routine/r1');
  });

  it('drops a pregnancy-contraindicated step from the count and minutes when pregnancy mode is on', async () => {
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } });
    mocked.listUserRoutines.mockResolvedValue([
      userRoutine('r1', { steps: [{ acupointId: 'LI4', seconds: 60 }, { acupointId: 'GV29', seconds: 60 }] }),
    ]);
    await render(<MineScreen />);
    expect(await screen.findByText('1곳 · 약 1분')).toBeTruthy();
  });

  it('includes the stored repeat count in the summary line when it is more than 1', async () => {
    mocked.listUserRoutines.mockResolvedValue([
      userRoutine('r1', { steps: [{ acupointId: 'LI4', seconds: 60 }, { acupointId: 'GV29', seconds: 60 }], repeat: 2 }),
    ]);
    await render(<MineScreen />);
    expect(await screen.findByText('2곳 · 2회 · 약 6분')).toBeTruthy();
  });

  it('always shows a 새 루틴 만들기 row that navigates to /routine/new', async () => {
    mocked.listUserRoutines.mockResolvedValue([userRoutine('r1')]);
    await render(<MineScreen />);
    await screen.findByText('내 아침 루틴');
    await fireEvent.press(screen.getByText('새 루틴 만들기'));
    expect(router.push).toHaveBeenCalledWith('/routine/new');
  });
});

describe('지난 기록', () => {
  it('shows a per-section empty line, not the big cat state, when favorites or my routines exist', async () => {
    useFavorites.setState({ ids: new Set(['LI4']) });
    await render(<MineScreen />);
    expect(await screen.findByText('아직 기록이 없어요.')).toBeTruthy();
    expect(screen.queryByText('오늘 탭에서 불편한 곳을 골라 보세요.')).toBeNull();
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

    expect(await screen.findByText('지난 기록')).toBeTruthy();
    expect(screen.getAllByText('내 루틴')).toHaveLength(2);
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

  it('shows the per-section empty line when every session is a ghost', async () => {
    mocked.listCompletedSessions.mockResolvedValue([log('ghost', today(12, 0), { routine: { kind: 'symptom', symptomId: 'no_such_symptom' } })]);

    await render(<MineScreen />);
    expect(await screen.findByText('아직 기록이 없어요.')).toBeTruthy();
  });

  it('shows a user routine session with its stored name, navigable to its preview', async () => {
    mocked.listCompletedSessions.mockResolvedValue([log('s1', today(10, 0), { routine: { kind: 'user', routineId: 'r1' } })]);
    mocked.getUserRoutine.mockResolvedValue(userRoutine('r1'));

    await render(<MineScreen />);
    expect(await screen.findByText('내 아침 루틴')).toBeTruthy();
    expect(mocked.getUserRoutine).toHaveBeenCalledWith({}, 'r1');

    await fireEvent.press(screen.getByText('내 아침 루틴'));
    expect(router.push).toHaveBeenCalledWith('/routine/r1');
  });

  it('shows 지운 루틴 for a user routine session whose routine no longer exists, not navigable', async () => {
    mocked.listCompletedSessions.mockResolvedValue([log('s1', today(10, 0), { routine: { kind: 'user', routineId: 'gone' } })]);
    mocked.getUserRoutine.mockResolvedValue(null);

    await render(<MineScreen />);
    expect(await screen.findByText('지운 루틴')).toBeTruthy();
    await fireEvent.press(screen.getByText('지운 루틴'));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('shows 지운 루틴, not the old name, for a soft-deleted user routine session', async () => {
    mocked.listCompletedSessions.mockResolvedValue([log('s1', today(10, 0), { routine: { kind: 'user', routineId: 'r1' } })]);
    mocked.getUserRoutine.mockResolvedValue(userRoutine('r1', { deletedAt: '2026-09-29T00:00:00.000Z' }));

    await render(<MineScreen />);
    expect(await screen.findByText('지운 루틴')).toBeTruthy();
    expect(screen.queryByText('내 아침 루틴')).toBeNull();
  });
});
