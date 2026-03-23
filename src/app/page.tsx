"use client";

import { useAppStore } from "@/store/useAppStore";
import { TabBar } from "@/components/Tabs/TabBar";
import { BodyPartTab } from "@/components/Tabs/BodyPartTab";
import { SymptomTab } from "@/components/Tabs/SymptomTab";
import { SearchTab } from "@/components/Tabs/SearchTab";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { AcupointDetail } from "@/components/BottomSheet/AcupointDetail";
import { Bell } from "lucide-react";

export default function Home() {
  const { activeTab, isBottomSheetOpen, closeBottomSheet } = useAppStore();

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-surface">
      {/* Header — Figma: h=64, bg=surface/80%, px=24 */}
      <header className="sticky top-0 z-30 glass-panel">
        <div className="flex items-center justify-between px-6 h-16">
          <h1 className="text-2xl font-black text-brand tracking-[-0.6px] leading-8">꾹꾹이</h1>
          <button className="flex items-center justify-center text-brand">
            <Bell className="h-5 w-4" />
          </button>
        </div>
      </header>

      {/* Tab bar — separate from header to allow independent scroll behavior */}
      <div className="px-6 pt-2 pb-3">
        <TabBar />
      </div>

      <div role="tabpanel" className="animate-fade-in-up">
        {activeTab === "body" && <BodyPartTab />}
        {activeTab === "symptom" && <SymptomTab />}
        {activeTab === "search" && <SearchTab />}
      </div>

      <BottomSheet isOpen={isBottomSheetOpen} onClose={closeBottomSheet}>
        <AcupointDetail />
      </BottomSheet>
    </main>
  );
}
