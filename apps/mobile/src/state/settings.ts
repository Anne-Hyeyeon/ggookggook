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
    const [settings, disclaimerAcceptedAt] = await Promise.all([loadSettings(db), getDisclaimerAcceptedAt(db)]);
    set({ settings, disclaimerAcceptedAt, loaded: true });
  },
  async update(db, patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    await saveSettings(db, settings, new Date());
  },
  async accept(db) {
    const disclaimerAcceptedAt = await acceptDisclaimer(db, new Date());
    set({ disclaimerAcceptedAt });
  },
}));
