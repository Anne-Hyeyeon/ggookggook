import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
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
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'food_stagnation' }),
}));

const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
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

it('skips haptics when rhythm haptics are off', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, rhythmHaptics: false } });
  await render(<GuideScreen />);
  await act(async () => {
    jest.advanceTimersByTime(10_000);
  });
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});
