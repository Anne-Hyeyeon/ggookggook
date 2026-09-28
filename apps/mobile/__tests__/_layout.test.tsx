import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Routes } from '../app/_layout';
import * as reminderModule from '@/notifications/reminder';
import { useFavorites } from '@/state/favorites';
import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';

jest.mock('@/db/DbProvider', () => {
  const db = {};
  return {
    DbProvider: ({ children }: { children: React.ReactNode }) => children,
    useDb: () => db,
  };
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  Stack: Object.assign(
    ({ children }: { children: React.ReactNode }) => children,
    {
      Screen: () => null,
      Protected: ({ guard, children }: { guard: boolean; children: React.ReactNode }) => (guard ? children : null),
    },
  ),
}));
jest.mock('@/notifications/reminder', () => ({
  getLastNotificationRoute: jest.fn(() => null),
  addReminderResponseListener: jest.fn(() => ({ remove: jest.fn() })),
  registerNotificationHandler: jest.fn(),
}));

const mockedReminder = reminderModule as jest.Mocked<typeof reminderModule>;
// Captured before the first beforeEach's clearAllMocks: `../app/_layout`'s module-scope call
// to registerNotificationHandler() already ran once, above, when it was imported.
const registeredAtModuleLoad = mockedReminder.registerNotificationHandler.mock.calls.length;

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS }, load: jest.fn().mockResolvedValue(undefined) });
  useOnboarding.setState({ loaded: true, disclaimerAcceptedAt: null, load: jest.fn().mockResolvedValue(undefined) } as never);
  useFavorites.setState({ loaded: true, ids: new Set(), load: jest.fn().mockResolvedValue(undefined) } as never);
});

it('registers the notification handler once, at app module load', () => {
  expect(registeredAtModuleLoad).toBe(1);
});

it('does not register a reminder response listener before the disclaimer is accepted', async () => {
  render(<Routes />);
  await waitFor(() => expect(mockedReminder.getLastNotificationRoute).not.toHaveBeenCalled());
  expect(mockedReminder.addReminderResponseListener).not.toHaveBeenCalled();
});

it('navigates to the last notification route on a cold start once accepted', async () => {
  useOnboarding.setState({ disclaimerAcceptedAt: '2026-09-28T00:00:00.000Z' } as never);
  mockedReminder.getLastNotificationRoute.mockReturnValue('/symptom/eye_fatigue');

  render(<Routes />);

  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/symptom/eye_fatigue'));
});

it('navigates to the route a tapped notification resolves to while the app is running', async () => {
  useOnboarding.setState({ disclaimerAcceptedAt: '2026-09-28T00:00:00.000Z' } as never);
  let handler: (route: '/symptom/eye_fatigue' | `/routine/${string}`) => void = () => {};
  mockedReminder.addReminderResponseListener.mockImplementation((onRoute) => {
    handler = onRoute;
    return { remove: jest.fn() };
  });

  render(<Routes />);
  await waitFor(() => expect(mockedReminder.addReminderResponseListener).toHaveBeenCalled());

  handler('/routine/r1');
  expect(router.push).toHaveBeenCalledWith('/routine/r1');
});
