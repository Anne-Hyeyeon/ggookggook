import { create } from "zustand";
import type { BodyPart, BodyView, TabType } from "@/types";

interface IAppState {
  activeTab: TabType;
  selectedRegion: BodyPart | null;
  bodyView: BodyView;
  isZoomed: boolean;
  selectedAcupointId: string | null;
  isBottomSheetOpen: boolean;

  setActiveTab: (tab: TabType) => void;
  selectRegion: (region: BodyPart) => void;
  clearRegion: () => void;
  toggleBodyView: () => void;
  openAcupointDetail: (id: string) => void;
  closeBottomSheet: () => void;
  resetView: () => void;
}

export const useAppStore = create<IAppState>((set) => ({
  activeTab: "body",
  selectedRegion: null,
  bodyView: "front",
  isZoomed: false,
  selectedAcupointId: null,
  isBottomSheetOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab, selectedRegion: null, isZoomed: false }),
  selectRegion: (region) => set({ selectedRegion: region, isZoomed: true }),
  clearRegion: () => set({ selectedRegion: null, isZoomed: false }),
  toggleBodyView: () => set((s) => ({ bodyView: s.bodyView === "front" ? "back" : "front" })),
  openAcupointDetail: (id) => set({ selectedAcupointId: id, isBottomSheetOpen: true }),
  closeBottomSheet: () => set({ selectedAcupointId: null, isBottomSheetOpen: false }),
  resetView: () => set({ selectedRegion: null, isZoomed: false, selectedAcupointId: null, isBottomSheetOpen: false }),
}));
