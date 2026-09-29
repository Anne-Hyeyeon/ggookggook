import { DEFAULT_SETTINGS, type UserRoutine } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import GuideRoutineScreen from '../app/guide/routine/[id]';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { useDb: () => db };
});
jest.mock('@ggookggook/store', () => ({
  getUserRoutine: jest.fn(),
  insertSession: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Heavy: 'heavy', Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));
let mockParams: { id: string; rounds?: string } = { id: 'r1' };
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));

const mocked = store as jest.Mocked<typeof store>;

const userRoutine: UserRoutine = {
  id: 'r1',
  name: '아침 루틴',
  steps: [{ acupointId: 'GV20', seconds: 10 }, { acupointId: 'GV29', seconds: 10 }],
  sourceSymptomId: null,
  repeat: 1,
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
  deletedAt: null,
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockParams = { id: 'r1' };
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS, getReadyEnabled: false } });
});
afterEach(() => jest.useRealTimers());

it('shows nothing while the routine loads, then the guide once it resolves', async () => {
  let resolveGet: ((routine: UserRoutine | null) => void) | undefined;
  mocked.getUserRoutine.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveGet = resolve;
    }),
  );
  await render(<GuideRoutineScreen />);
  expect(screen.queryByText('백회')).toBeNull();

  await act(async () => {
    resolveGet?.(userRoutine);
  });
  expect(screen.getByText('백회')).toBeTruthy();
  expect(screen.getByText('아침 루틴')).toBeTruthy();
});

it('shows the empty state via 닫기 when the routine is missing or deleted', async () => {
  mocked.getUserRoutine.mockResolvedValue(null);
  await render(<GuideRoutineScreen />);
  expect(await screen.findByText('안내할 혈자리가 없어요.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('guides through a two-step user routine and records the session with the routine ref', async () => {
  mocked.getUserRoutine.mockResolvedValue(userRoutine);
  await render(<GuideRoutineScreen />);
  await screen.findByText('백회');

  await act(async () => {
    jest.advanceTimersByTime(20_000);
  });
  expect(mocked.insertSession).toHaveBeenCalledWith(
    {},
    expect.objectContaining({ routine: { kind: 'user', routineId: 'r1' }, durationSeconds: 20, feedback: null }),
  );
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/done', params: { sessionId: expect.any(String) } });
});
