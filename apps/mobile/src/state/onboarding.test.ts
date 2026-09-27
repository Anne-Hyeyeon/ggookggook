import * as store from '@ggookggook/store';
import { useOnboarding } from '@/state/onboarding';

jest.mock('@ggookggook/store', () => ({
  getDisclaimerAcceptedAt: jest.fn(),
  acceptDisclaimer: jest.fn(),
}));

const db = {} as store.SqlDatabase;
const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.clearAllMocks();
  useOnboarding.setState({ loaded: false, disclaimerAcceptedAt: null });
});

it('loads the disclaimer flag', async () => {
  mocked.getDisclaimerAcceptedAt.mockResolvedValue('2026-09-28T00:00:00.000Z');
  await useOnboarding.getState().load(db);
  expect(useOnboarding.getState()).toMatchObject({ loaded: true, disclaimerAcceptedAt: '2026-09-28T00:00:00.000Z' });
});

it('accepts the disclaimer', async () => {
  mocked.acceptDisclaimer.mockResolvedValue('2026-09-28T01:00:00.000Z');
  await useOnboarding.getState().accept(db);
  expect(useOnboarding.getState().disclaimerAcceptedAt).toBe('2026-09-28T01:00:00.000Z');
});

it('leaves the disclaimer unset and rethrows when accepting fails', async () => {
  mocked.acceptDisclaimer.mockRejectedValueOnce(new Error('write failed'));

  await expect(useOnboarding.getState().accept(db)).rejects.toThrow('write failed');
  expect(useOnboarding.getState().disclaimerAcceptedAt).toBeNull();
});

it('falls back to not accepted when load fails', async () => {
  mocked.getDisclaimerAcceptedAt.mockRejectedValueOnce(new Error('read failed'));
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  await useOnboarding.getState().load(db);

  expect(useOnboarding.getState()).toMatchObject({ loaded: true, disclaimerAcceptedAt: null });
  expect(errorSpy).toHaveBeenCalled();

  errorSpy.mockRestore();
});
