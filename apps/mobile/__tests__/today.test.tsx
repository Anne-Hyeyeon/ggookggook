import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act } from 'react-test-renderer';
import TodayScreen from '../app/(tabs)/index';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => ({ useDb: () => ({}) }));
jest.mock('@ggookggook/store', () => ({
  latestCompletedSession: jest.fn(),
  countSessionsByFeedback: jest.fn(),
  countSessionsBySymptom: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));

const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS } });
  mocked.latestCompletedSession.mockResolvedValue(null);
  mocked.countSessionsByFeedback.mockResolvedValue(0);
  mocked.countSessionsBySymptom.mockResolvedValue({});
});

it('lists every symptom with its minutes and opens one', async () => {
  await render(<TodayScreen />);
  expect(screen.getByText('두통')).toBeTruthy();
  expect(screen.getByText('급똥참기')).toBeTruthy();
  await fireEvent.press(screen.getByText('두통'));
  expect(router.push).toHaveBeenCalledWith('/symptom/headache');
});

it('opens settings from the header button', async () => {
  await render(<TodayScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '설정' }));
  expect(router.push).toHaveBeenCalledWith('/settings');
});

it('updates the displayed minutes for 두통 when pregnancy mode changes', async () => {
  await render(<TodayScreen />);
  expect(screen.getByTestId('minutes-headache')).toHaveTextContent('4분');

  act(() => {
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pregnancyMode: true } });
  });

  expect(screen.getByTestId('minutes-headache')).toHaveTextContent('2분');
});

it('filters by alias and by acupoint name, and shows an empty state', async () => {
  await render(<TodayScreen />);
  const input = screen.getByPlaceholderText('증상이나 혈자리 이름');
  await fireEvent.changeText(input, '잠이 안');
  expect(screen.getByText('불면')).toBeTruthy();
  expect(screen.queryByText('두통')).toBeNull();

  await fireEvent.changeText(input, '합곡');
  expect(screen.getByText('두통')).toBeTruthy();

  await fireEvent.changeText(input, '없는말');
  expect(screen.getByText('찾는 증상이 없어요. 다른 말로 찾아보세요.')).toBeTruthy();
});

it('shows the most recent routine', async () => {
  mocked.latestCompletedSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'headache' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: 240,
    feedback: 'better',
  });
  await render(<TodayScreen />);
  expect(await screen.findByText('최근 · 두통 · 오늘')).toBeTruthy();
});

it('starts the recent routine again from its 다시 하기 affordance', async () => {
  mocked.latestCompletedSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'headache' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: 240,
    feedback: null,
  });
  await render(<TodayScreen />);
  await fireEvent.press(await screen.findByText('다시 하기'));
  expect(router.push).toHaveBeenCalledWith('/symptom/headache');
});

it('shows the better-feedback count only when it is at least one', async () => {
  mocked.latestCompletedSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'headache' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: 240,
    feedback: 'better',
  });
  mocked.countSessionsByFeedback.mockResolvedValue(3);
  await render(<TodayScreen />);
  expect(await screen.findByText('나아졌어요 3번')).toBeTruthy();
});

it('hides the better-feedback line when there is no positive feedback yet', async () => {
  mocked.latestCompletedSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'headache' },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: 240,
    feedback: null,
  });
  mocked.countSessionsByFeedback.mockResolvedValue(0);
  await render(<TodayScreen />);
  await screen.findByText('최근 · 두통 · 오늘');
  expect(screen.queryByText(/나아졌어요/)).toBeNull();
});

it('sorts the default list by usage, keeping ties and untouched symptoms in content order', async () => {
  mocked.countSessionsBySymptom.mockResolvedValue({ neck_pain: 3, stress: 1, shoulder_pain: 1 });
  await render(<TodayScreen />);
  const order = (await screen.findAllByTestId(/^minutes-/)).map((node) => node.props.testID);
  expect(order.slice(0, 3)).toEqual(['minutes-neck_pain', 'minutes-stress', 'minutes-shoulder_pain']);
  expect(order[3]).toBe('minutes-headache');
});

it('keeps search order instead of re-sorting by usage while searching', async () => {
  mocked.countSessionsBySymptom.mockResolvedValue({ neck_pain: 5, shoulder_pain: 1 });
  await render(<TodayScreen />);
  const input = screen.getByPlaceholderText('증상이나 혈자리 이름');
  await fireEvent.changeText(input, '통증');
  const order = (await screen.findAllByTestId(/^minutes-/)).map((node) => node.props.testID);
  expect(order).toEqual(['minutes-shoulder_pain', 'minutes-back_pain', 'minutes-neck_pain']);
});

it('falls back to no history when the store rejects', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocked.countSessionsByFeedback.mockRejectedValue(new Error('boom'));
  mocked.countSessionsBySymptom.mockRejectedValue(new Error('boom'));
  await render(<TodayScreen />);
  await waitFor(() => expect(consoleError).toHaveBeenCalled());
  expect(screen.getByText('두통')).toBeTruthy();
  consoleError.mockRestore();
});
