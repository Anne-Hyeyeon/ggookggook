import { DEFAULT_SETTINGS, type Settings } from '@ggookggook/shared';
import { acceptDisclaimer, getDisclaimerAcceptedAt, loadSettings, saveSettings, type SqlDatabase } from '@ggookggook/store';
import { create } from 'zustand';

interface SettingsState {
  loaded: boolean;
  settings: Settings;
  disclaimerAcceptedAt: string | null;
  load(db: SqlDatabase): Promise<void>;
  update(db: SqlDatabase, patch: Partial<Settings>): Promise<void>;
  accept(db: SqlDatabase): Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  loaded: false,
  settings: { ...DEFAULT_SETTINGS },
  disclaimerAcceptedAt: null,
  async load(db) {
    try {
      const [settings, disclaimerAcceptedAt] = await Promise.all([loadSettings(db), getDisclaimerAcceptedAt(db)]);
      set({ settings, disclaimerAcceptedAt, loaded: true });
    } catch (error) {
      console.error('Failed to load settings, falling back to defaults', error);
      set({ settings: { ...DEFAULT_SETTINGS }, disclaimerAcceptedAt: null, loaded: true });
    }
  },
  async update(db, patch) {
    const previous = get().settings;
    const settings = { ...previous, ...patch };
    set({ settings });
    try {
      await saveSettings(db, settings, new Date());
    } catch (error) {
      set({ settings: previous });
      throw error;
    }
  },
  async accept(db) {
    const disclaimerAcceptedAt = await acceptDisclaimer(db, new Date());
    set({ disclaimerAcceptedAt });
  },
}));
