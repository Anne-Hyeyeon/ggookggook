import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import TodayScreen from '../app/(tabs)/index';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => ({ useDb: () => ({}) }));
jest.mock('@ggookggook/store', () => ({ latestCompletedSession: jest.fn() }));
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
