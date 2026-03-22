"use client";

import { useAppStore } from "@/store/useAppStore";
import { TabBar } from "@/components/Tabs/TabBar";
import { BodyPartTab } from "@/components/Tabs/BodyPartTab";
import { SymptomTab } from "@/components/Tabs/SymptomTab";
import { SearchTab } from "@/components/Tabs/SearchTab";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { AcupointDetail } from "@/components/BottomSheet/AcupointDetail";

export default function Home() {
  const { activeTab, isBottomSheetOpen, closeBottomSheet } = useAppStore();

  return (
    <main className="mx-auto min-h-screen max-w-md pb-16">
      <TabBar />
      <div role="tabpanel">
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
