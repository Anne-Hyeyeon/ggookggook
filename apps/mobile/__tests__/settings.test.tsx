import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act } from 'react-test-renderer';
import SettingsScreen from '../app/settings';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => ({ useDb: () => ({}) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('expo-constants', () => ({ expoConfig: { version: '0.1.0' } }));
jest.mock('@ggookggook/store', () => ({ loadSettings: jest.fn(), saveSettings: jest.fn() }));

const mocked = store as jest.Mocked<typeof store>;
// Captured before any test replaces it with a mock, so the race-condition test below can
// restore the real update implementation instead of the stubbed one the other tests use.
const realUpdate = useSettings.getState().update;

const update = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.saveSettings.mockResolvedValue(undefined);
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS }, update });
});

it('goes back', async () => {
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: '뒤로' }));
  expect(router.back).toHaveBeenCalled();
});

it('toggles rhythm haptics', async () => {
  await render(<SettingsScreen />);
  await fireEvent(screen.getByRole('switch', { name: '리듬 진동' }), 'valueChange', false);
  expect(update).toHaveBeenCalledWith({}, { rhythmHaptics: false });
});

it('toggles pregnancy mode with the welcome screen sub text', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText('켜면 임신 중 피해야 할 혈자리를 빼고 안내해요.')).toBeTruthy();
  await fireEvent(screen.getByRole('switch', { name: '임신 중이에요' }), 'valueChange', true);
  expect(update).toHaveBeenCalledWith({}, { pregnancyMode: true });
});

it('steps the press seconds by one within 3 to 10', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText('5초')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '누르는 시간 늘리기' }));
  expect(update).toHaveBeenCalledWith({}, { pressSeconds: 6 });

  await fireEvent.press(screen.getByRole('button', { name: '누르는 시간 줄이기' }));
  expect(update).toHaveBeenCalledWith({}, { pressSeconds: 4 });
});

it('does not lose an update when the increase button is pressed twice before either settles', async () => {
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS }, update: realUpdate });
  await render(<SettingsScreen />);

  // Fires the underlying press handler directly, twice, inside one act() scope: this is what "no
  // await between presses" means in practice (two separate fireEvent.press calls each open their
  // own act scope, and firing the second before the first settles trips React's "overlapping act
  // calls" error instead of exercising the race this test is for).
  const button = screen.getByRole('button', { name: '누르는 시간 늘리기' });
  act(() => {
    button.props.onClick();
    button.props.onClick();
  });

  expect(useSettings.getState().settings.pressSeconds).toBe(7);
});

it('disables the press seconds increase button at the upper bound', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pressSeconds: 10 } });
  await render(<SettingsScreen />);
  expect(screen.getByRole('button', { name: '누르는 시간 늘리기' }).props.accessibilityState.disabled).toBe(true);
});

it('disables the press seconds decrease button at the lower bound', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, pressSeconds: 3 } });
  await render(<SettingsScreen />);
  expect(screen.getByRole('button', { name: '누르는 시간 줄이기' }).props.accessibilityState.disabled).toBe(true);
});

it('steps the rest seconds by one within 1 to 5', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText('2초')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '쉬는 시간 늘리기' }));
  expect(update).toHaveBeenCalledWith({}, { restSeconds: 3 });

  await fireEvent.press(screen.getByRole('button', { name: '쉬는 시간 줄이기' }));
  expect(update).toHaveBeenCalledWith({}, { restSeconds: 1 });
});

it('disables the rest seconds increase button at the upper bound', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, restSeconds: 5 } });
  await render(<SettingsScreen />);
  expect(screen.getByRole('button', { name: '쉬는 시간 늘리기' }).props.accessibilityState.disabled).toBe(true);
});

it('disables the rest seconds decrease button at the lower bound', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, restSeconds: 1 } });
  await render(<SettingsScreen />);
  expect(screen.getByRole('button', { name: '쉬는 시간 줄이기' }).props.accessibilityState.disabled).toBe(true);
});

it('expands the disclaimer notices inline', async () => {
  await render(<SettingsScreen />);
  expect(screen.queryByText('통증이 심하거나 오래가면 병원 진료를 받으세요.')).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: '안내 다시 보기' }));
  expect(screen.getByText('꾹꾹은 지압 방법을 안내하는 앱이에요. 진단이나 치료를 대신하지 않아요.')).toBeTruthy();
  expect(screen.getByText('통증이 심하거나 오래가면 병원 진료를 받으세요.')).toBeTruthy();
  expect(screen.getByText('지병이 있으면 전문가와 먼저 상의하세요.')).toBeTruthy();
  expect(screen.getByText('상처나 염증, 부기가 있는 곳은 누르지 마세요.')).toBeTruthy();
});

it('shows the app version and content version', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText('0.1.0', { exact: false })).toBeTruthy();
  expect(screen.getByText('1', { exact: false })).toBeTruthy();
});
