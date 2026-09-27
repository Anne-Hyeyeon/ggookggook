import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { useSettings } from '@/state/settings';

jest.mock('@ggookggook/store', () => ({
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
  getDisclaimerAcceptedAt: jest.fn(),
  acceptDisclaimer: jest.fn(),
}));

const db = {} as store.SqlDatabase;
const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ loaded: false, settings: { ...DEFAULT_SETTINGS }, disclaimerAcceptedAt: null });
});

it('loads settings and the disclaimer flag', async () => {
  mocked.loadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, pregnancyMode: true });
  mocked.getDisclaimerAcceptedAt.mockResolvedValue('2026-09-28T00:00:00.000Z');
  await useSettings.getState().load(db);
  expect(useSettings.getState()).toMatchObject({ loaded: true, settings: { pregnancyMode: true }, disclaimerAcceptedAt: '2026-09-28T00:00:00.000Z' });
});

it('updates and persists a partial change', async () => {
  await useSettings.getState().update(db, { rhythmHaptics: false });
  expect(useSettings.getState().settings.rhythmHaptics).toBe(false);
  expect(mocked.saveSettings).toHaveBeenCalledWith(db, { ...DEFAULT_SETTINGS, rhythmHaptics: false }, expect.any(Date));
});

it('accepts the disclaimer', async () => {
  mocked.acceptDisclaimer.mockResolvedValue('2026-09-28T01:00:00.000Z');
  await useSettings.getState().accept(db);
  expect(useSettings.getState().disclaimerAcceptedAt).toBe('2026-09-28T01:00:00.000Z');
});
