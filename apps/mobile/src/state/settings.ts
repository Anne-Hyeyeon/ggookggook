import { DEFAULT_SETTINGS, type Settings } from '@ggookggook/shared';
import { loadSettings, saveSettings, type SqlDatabase } from '@ggookggook/store';
import { create } from 'zustand';

interface SettingsState {
  loaded: boolean;
  settings: Settings;
  load(db: SqlDatabase): Promise<void>;
  update(db: SqlDatabase, patch: Partial<Settings>): Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  loaded: false,
  settings: { ...DEFAULT_SETTINGS },
  async load(db) {
    try {
      const settings = await loadSettings(db);
      set({ settings, loaded: true });
    } catch (error) {
      console.error('Failed to load settings, falling back to defaults', error);
      set({ settings: { ...DEFAULT_SETTINGS }, loaded: true });
    }
  },
  async update(db, patch) {
    const previous = get().settings;
    const settings = { ...previous, ...patch };
    set({ settings });
    try {
      await saveSettings(db, settings, new Date());
    } catch (error) {
      // Only roll back if nothing newer has landed since this call's optimistic set:
      // a concurrent update that already succeeded must not be clobbered by this one's failure.
      if (get().settings === settings) set({ settings: previous });
      throw error;
    }
  },
}));
