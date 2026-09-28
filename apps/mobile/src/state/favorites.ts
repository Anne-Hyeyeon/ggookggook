import { listFavorites, setFavorite, type SqlDatabase } from '@ggookggook/store';
import { create } from 'zustand';

interface FavoritesState {
  loaded: boolean;
  ids: Set<string>;
  load(db: SqlDatabase): Promise<void>;
  toggle(db: SqlDatabase, acupointId: string): Promise<void>;
}

export const useFavorites = create<FavoritesState>((set, get) => ({
  loaded: false,
  ids: new Set(),
  async load(db) {
    try {
      const favorites = await listFavorites(db);
      set({ ids: new Set(favorites.map((favorite) => favorite.acupointId)), loaded: true });
    } catch (error) {
      console.error('Failed to load favorites, falling back to an empty set', error);
      set({ ids: new Set(), loaded: true });
    }
  },
  async toggle(db, acupointId) {
    const previous = get().ids;
    const on = !previous.has(acupointId);
    const ids = new Set(previous);
    if (on) ids.add(acupointId);
    else ids.delete(acupointId);
    set({ ids });
    try {
      await setFavorite(db, acupointId, on, new Date());
    } catch (error) {
      // Only roll back if nothing newer has landed since this call's optimistic set:
      // a concurrent toggle that already succeeded must not be clobbered by this one's failure.
      if (get().ids === ids) set({ ids: previous });
      throw error;
    }
  },
}));
