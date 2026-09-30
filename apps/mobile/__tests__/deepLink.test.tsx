import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { Routes } from '../app/_layout';
import { useFavorites } from '@/state/favorites';
import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WIDGET_SCHEME, widgetUrl } from '@/widget/snapshot';

jest.mock('@/db/DbProvider', () => {
  const db = {};
  return { DbProvider: ({ children }: { children: React.ReactNode }) => children, useDb: () => db };
});
jest.mock('@/widget/useWidgetSync', () => ({ useWidgetSync: jest.fn() }));
jest.mock('@/notifications/reminder', () => ({
  getLastNotificationRoute: jest.fn(() => null),
  addReminderResponseListener: jest.fn(() => ({ remove: jest.fn() })),
  registerNotificationHandler: jest.fn(),
}));

function Layout() {
  return (
    <ThemeProvider>
      <Routes />
    </ThemeProvider>
  );
}

// Stand-ins for the real screens: only which one the widget's link lands on matters here.
const routes = {
  _layout: Layout,
  '(tabs)/index': () => <Text>today</Text>,
  welcome: () => <Text>welcome</Text>,
  'symptom/[id]': () => <Text>symptom</Text>,
  'routine/[id]/index': () => <Text>routine</Text>,
};

// Expo Router reads a custom-scheme link's host as the first path segment; renderRouter takes that path.
function routerPathOf(url: string): string {
  const parsed = new URL(url);
  return `/${parsed.hostname}${parsed.pathname}`;
}

const openLink = (url: string) => renderRouter(routes, { initialUrl: routerPathOf(url) });

it('maps widget links to the preview route paths', () => {
  expect(widgetUrl({ kind: 'symptom', id: 'headache' })).toBe(`${WIDGET_SCHEME}://symptom/headache`);
  expect(routerPathOf(widgetUrl({ kind: 'symptom', id: 'headache' }))).toBe('/symptom/headache');
  expect(routerPathOf(widgetUrl({ kind: 'user', id: 'r1' }))).toBe('/routine/r1');
});

function setAccepted(accepted: boolean) {
  useOnboarding.setState({ loaded: true, disclaimerAcceptedAt: accepted ? '2026-09-28T00:00:00.000Z' : null, load: jest.fn().mockResolvedValue(undefined) } as never);
}

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  useSettings.setState({ loaded: true, settings: { ...DEFAULT_SETTINGS }, load: jest.fn().mockResolvedValue(undefined) });
  useFavorites.setState({ loaded: true, ids: new Set(), load: jest.fn().mockResolvedValue(undefined) } as never);
});

it('opens a widget symptom link on its preview once the disclaimer is accepted', async () => {
  setAccepted(true);
  const result = openLink(widgetUrl({ kind: 'symptom', id: 'headache' }));
  // RNTL 14's render is async; renderRouter decorates the pending result, so await it separately.
  await result;
  expect(result.getPathname()).toBe('/symptom/headache');
  expect(screen.getByText('symptom')).toBeTruthy();
});

it('opens a widget user routine link on its preview once the disclaimer is accepted', async () => {
  setAccepted(true);
  const result = openLink(widgetUrl({ kind: 'user', id: 'r1' }));
  // RNTL 14's render is async; renderRouter decorates the pending result, so await it separately.
  await result;
  expect(result.getPathname()).toBe('/routine/r1');
  expect(screen.getByText('routine')).toBeTruthy();
});

it('lands on the welcome screen first when the disclaimer has not been accepted', async () => {
  setAccepted(false);
  const result = openLink(widgetUrl({ kind: 'symptom', id: 'headache' }));
  // RNTL 14's render is async; renderRouter decorates the pending result, so await it separately.
  await result;
  expect(result.getPathname()).toBe('/welcome');
  expect(screen.getByText('welcome')).toBeTruthy();
  expect(screen.queryByText('symptom')).toBeNull();
});
