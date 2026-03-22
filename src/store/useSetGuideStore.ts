import { create } from "zustand";

interface ISetGuideState {
  symptomId: string | null;
  acupointIds: string[];
  currentIndex: number;
  timerDuration: number;

  startSetGuide: (symptomId: string, acupointIds: string[]) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  setTimerDuration: (duration: number) => void;
  clearSetGuide: () => void;
}

export const useSetGuideStore = create<ISetGuideState>((set) => ({
  symptomId: null,
  acupointIds: [],
  currentIndex: 0,
  timerDuration: 20,

  startSetGuide: (symptomId, acupointIds) =>
    set({ symptomId, acupointIds, currentIndex: 0 }),
  goToNext: () =>
    set((s) => ({
      currentIndex: Math.min(s.currentIndex + 1, s.acupointIds.length - 1),
    })),
  goToPrevious: () =>
    set((s) => ({
      currentIndex: Math.max(s.currentIndex - 1, 0),
    })),
  setTimerDuration: (duration) => set({ timerDuration: duration }),
  clearSetGuide: () =>
    set({ symptomId: null, acupointIds: [], currentIndex: 0 }),
}));
