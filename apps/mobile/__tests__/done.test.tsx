import * as store from '@ggookggook/store';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import DoneScreen from '../app/done';

jest.mock('@/db/DbProvider', () => ({ useDb: () => ({}) }));
jest.mock('@ggookggook/store', () => ({ getSession: jest.fn(), setSessionFeedback: jest.fn().mockResolvedValue(undefined) }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, useLocalSearchParams: () => ({ sessionId: 's1' }) }));

const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getSession.mockResolvedValue({
    id: 's1',
    routine: { kind: 'symptom', symptomId: 'food_stagnation' },
    startedAt: '2026-09-28T00:00:00.000Z',
    completedAt: '2026-09-28T00:04:00.000Z',
    durationSeconds: 240,
    feedback: null,
  });
});

it('shows the result and records feedback', async () => {
  await render(<DoneScreen />);
  expect(await screen.findByText('식체 루틴을 마쳤어요')).toBeTruthy();
  expect(screen.getByText('4분')).toBeTruthy();
  expect(screen.getByText('합곡 · 내관')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '나아졌어요' }));
  expect(mocked.setSessionFeedback).toHaveBeenCalledWith({}, 's1', 'better');
  expect(screen.getByRole('button', { name: '나아졌어요' }).props.accessibilityState).toMatchObject({ selected: true });

  await fireEvent.press(screen.getByRole('button', { name: '처음으로' }));
  expect(router.replace).toHaveBeenCalledWith('/');
});

it('renders the heading and home link when there is no session', async () => {
  mocked.getSession.mockResolvedValue(null);

  await render(<DoneScreen />);
  expect(await screen.findByText('루틴을 마쳤어요')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '처음으로' }));
  expect(router.replace).toHaveBeenCalledWith('/');
});

it('does not crash when getSession rejects', async () => {
  mocked.getSession.mockRejectedValue(new Error('db down'));
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  await render(<DoneScreen />);
  expect(await screen.findByText('루틴을 마쳤어요')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: '처음으로' }));
  expect(router.replace).toHaveBeenCalledWith('/');

  errorSpy.mockRestore();
});
