import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';
import GuideScreen from '../app/guide/[id]';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => ({ useDb: () => ({}) }));
jest.mock('@ggookggook/store', () => ({ insertSession: jest.fn().mockResolvedValue(undefined) }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Heavy: 'heavy', Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));
let mockParams: { id: string } = { id: 'food_stagnation' };
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockParams = { id: 'food_stagnation' };
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS }, disclaimerAcceptedAt: 'x' });
});
afterEach(() => jest.useRealTimers());

it('guides through each side of each point and records the session', async () => {
  await render(<GuideScreen />);
  expect(screen.getByText('합곡')).toBeTruthy();
  expect(screen.getByText('왼쪽')).toBeTruthy();
  expect(screen.getByText('꾹 누르세요')).toBeTruthy();
  expect(screen.getByText('1 / 9회')).toBeTruthy();
  expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(screen.getByText('잠시 떼세요')).toBeTruthy();

  await act(async () => {
    jest.advanceTimersByTime(55_000);
  });
  expect(screen.getByText('오른쪽')).toBeTruthy();

  await act(async () => {
    jest.advanceTimersByTime(180_000);
  });
  expect(mocked.insertSession).toHaveBeenCalledWith({}, expect.objectContaining({ routine: { kind: 'symptom', symptomId: 'food_stagnation' }, durationSeconds: 240, feedback: null }));
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/done', params: { sessionId: expect.any(String) } });
});

it('pauses and resumes', async () => {
  await render(<GuideScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '일시정지' }));
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(screen.getByText('1 / 9회')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '계속' }));
  await act(async () => {
    jest.advanceTimersByTime(7000);
  });
  expect(screen.getByText('2 / 9회')).toBeTruthy();
});

it('announces the press and rest phases for screen readers', async () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  await render(<GuideScreen />);
  expect(announce).toHaveBeenCalledWith('꾹 누르세요');

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(announce).toHaveBeenCalledWith('잠시 떼세요');

  announce.mockRestore();
});

it('skips haptics when rhythm haptics are off', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, rhythmHaptics: false } });
  await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});

it('shows a retry option when saving the session fails, and recovers on retry', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocked.insertSession.mockRejectedValueOnce(new Error('disk full'));
  await render(<GuideScreen />);

  await act(async () => {
    jest.advanceTimersByTime(240_000);
  });
  expect(screen.getByText('기록을 저장하지 못했어요.')).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
  expect(consoleError).toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('button', { name: '다시 저장' }));
  await act(async () => {});
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/done', params: { sessionId: expect.any(String) } });

  consoleError.mockRestore();
});

it('lets you leave the failed-save state via 처음으로 without growing the stack', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocked.insertSession.mockRejectedValueOnce(new Error('disk full'));
  await render(<GuideScreen />);

  await act(async () => {
    jest.advanceTimersByTime(240_000);
  });
  expect(screen.getByText('기록을 저장하지 못했어요.')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '처음으로' }));
  expect(router.dismissTo).toHaveBeenCalledWith('/');

  consoleError.mockRestore();
});

it('lets you leave the empty-state fallback via 닫기', async () => {
  mockParams = { id: 'nope' };
  await render(<GuideScreen />);
  expect(screen.getByText('안내할 혈자리가 없어요.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
  expect(router.back).toHaveBeenCalledTimes(1);
});
