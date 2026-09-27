import { DEFAULT_SETTINGS } from '@ggookggook/shared';
import * as store from '@ggookggook/store';
import { useSettings } from '@/state/settings';

jest.mock('@ggookggook/store', () => ({
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
}));

const db = {} as store.SqlDatabase;
const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ loaded: false, settings: { ...DEFAULT_SETTINGS } });
});

it('loads settings', async () => {
  mocked.loadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, pregnancyMode: true });
  await useSettings.getState().load(db);
  expect(useSettings.getState()).toMatchObject({ loaded: true, settings: { pregnancyMode: true } });
});

it('updates and persists a partial change', async () => {
  await useSettings.getState().update(db, { rhythmHaptics: false });
  expect(useSettings.getState().settings.rhythmHaptics).toBe(false);
  expect(mocked.saveSettings).toHaveBeenCalledWith(db, { ...DEFAULT_SETTINGS, rhythmHaptics: false }, expect.any(Date));
});

it('rolls back to the previous settings and rethrows when the save fails', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, rhythmHaptics: true } });
  mocked.saveSettings.mockRejectedValueOnce(new Error('write failed'));

  await expect(useSettings.getState().update(db, { rhythmHaptics: false })).rejects.toThrow('write failed');
  expect(useSettings.getState().settings.rhythmHaptics).toBe(true);
});

it('does not roll back over a later concurrent update that already succeeded', async () => {
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS, rhythmHaptics: true, pregnancyMode: false } });

  let rejectFirstSave!: (error: Error) => void;
  mocked.saveSettings.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectFirstSave = reject;
      }),
  );
  mocked.saveSettings.mockImplementationOnce(() => Promise.resolve());

  const firstUpdate = useSettings.getState().update(db, { rhythmHaptics: false });
  const secondUpdate = useSettings.getState().update(db, { pregnancyMode: true });

  await secondUpdate;
  expect(useSettings.getState().settings).toMatchObject({ rhythmHaptics: false, pregnancyMode: true });

  rejectFirstSave(new Error('write failed'));
  await expect(firstUpdate).rejects.toThrow('write failed');

  // The first update's failure must not clobber the second update's already-saved result.
  expect(useSettings.getState().settings).toMatchObject({ rhythmHaptics: false, pregnancyMode: true });
});

it('falls back to defaults when load fails', async () => {
  mocked.loadSettings.mockRejectedValueOnce(new Error('read failed'));
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  await useSettings.getState().load(db);

  expect(useSettings.getState()).toMatchObject({ loaded: true, settings: DEFAULT_SETTINGS });
  expect(errorSpy).toHaveBeenCalled();

  errorSpy.mockRestore();
});
