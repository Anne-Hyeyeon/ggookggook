import * as store from '@ggookggook/store';
import { useFavorites } from '@/state/favorites';

jest.mock('@ggookggook/store', () => ({
  listFavorites: jest.fn(),
  setFavorite: jest.fn(),
}));

const db = {} as store.SqlDatabase;
const mocked = store as jest.Mocked<typeof store>;

beforeEach(() => {
  jest.clearAllMocks();
  useFavorites.setState({ loaded: false, ids: new Set() });
});

it('loads favorites into a set of ids', async () => {
  mocked.listFavorites.mockResolvedValue([
    { acupointId: 'LI4', createdAt: 'a', updatedAt: 'a', deletedAt: null },
    { acupointId: 'ST36', createdAt: 'a', updatedAt: 'a', deletedAt: null },
  ]);

  await useFavorites.getState().load(db);

  expect(useFavorites.getState()).toMatchObject({ loaded: true, ids: new Set(['LI4', 'ST36']) });
});

it('falls back to an empty set when load fails', async () => {
  mocked.listFavorites.mockRejectedValueOnce(new Error('read failed'));
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  await useFavorites.getState().load(db);

  expect(useFavorites.getState()).toMatchObject({ loaded: true, ids: new Set() });
  expect(errorSpy).toHaveBeenCalled();

  errorSpy.mockRestore();
});

it('optimistically adds an id and persists it', async () => {
  mocked.setFavorite.mockResolvedValue(undefined);

  await useFavorites.getState().toggle(db, 'LI4');

  expect(useFavorites.getState().ids.has('LI4')).toBe(true);
  expect(mocked.setFavorite).toHaveBeenCalledWith(db, 'LI4', true, expect.any(Date));
});

it('optimistically removes an id already favorited', async () => {
  useFavorites.setState({ ids: new Set(['LI4']) });
  mocked.setFavorite.mockResolvedValue(undefined);

  await useFavorites.getState().toggle(db, 'LI4');

  expect(useFavorites.getState().ids.has('LI4')).toBe(false);
  expect(mocked.setFavorite).toHaveBeenCalledWith(db, 'LI4', false, expect.any(Date));
});

it('rolls back to the previous set and rethrows when the save fails', async () => {
  useFavorites.setState({ ids: new Set(['ST36']) });
  mocked.setFavorite.mockRejectedValueOnce(new Error('write failed'));

  await expect(useFavorites.getState().toggle(db, 'LI4')).rejects.toThrow('write failed');

  expect(useFavorites.getState().ids).toEqual(new Set(['ST36']));
});

it('does not roll back over a later concurrent toggle that already succeeded', async () => {
  let rejectFirstSave!: (error: Error) => void;
  mocked.setFavorite.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectFirstSave = reject;
      }),
  );
  mocked.setFavorite.mockImplementationOnce(() => Promise.resolve());

  const firstToggle = useFavorites.getState().toggle(db, 'LI4');
  const secondToggle = useFavorites.getState().toggle(db, 'ST36');

  await secondToggle;
  expect(useFavorites.getState().ids).toEqual(new Set(['LI4', 'ST36']));

  rejectFirstSave(new Error('write failed'));
  await expect(firstToggle).rejects.toThrow('write failed');

  // The first toggle's failure must not clobber the second toggle's already-saved result.
  expect(useFavorites.getState().ids).toEqual(new Set(['LI4', 'ST36']));
});
