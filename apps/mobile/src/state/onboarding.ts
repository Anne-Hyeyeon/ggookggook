import { acceptDisclaimer, getDisclaimerAcceptedAt, type SqlDatabase } from '@ggookggook/store';
import { create } from 'zustand';

interface OnboardingState {
  loaded: boolean;
  disclaimerAcceptedAt: string | null;
  load(db: SqlDatabase): Promise<void>;
  accept(db: SqlDatabase): Promise<void>;
}

export const useOnboarding = create<OnboardingState>((set) => ({
  loaded: false,
  disclaimerAcceptedAt: null,
  async load(db) {
    try {
      const disclaimerAcceptedAt = await getDisclaimerAcceptedAt(db);
      set({ disclaimerAcceptedAt, loaded: true });
    } catch (error) {
      console.error('Failed to load the disclaimer flag, falling back to not accepted', error);
      set({ disclaimerAcceptedAt: null, loaded: true });
    }
  },
  async accept(db) {
    const disclaimerAcceptedAt = await acceptDisclaimer(db, new Date());
    set({ disclaimerAcceptedAt });
  },
}));
