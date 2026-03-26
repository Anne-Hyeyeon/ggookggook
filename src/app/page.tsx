"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useSetGuideStore } from "@/store/useSetGuideStore";
import { TabBar } from "@/components/Tabs/TabBar";
import { BodyPartTab } from "@/components/Tabs/BodyPartTab";
import { SymptomTab } from "@/components/Tabs/SymptomTab";
import { SearchTab } from "@/components/Tabs/SearchTab";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { AcupointDetail } from "@/components/BottomSheet/AcupointDetail";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { getAcupointById, getSymptoms } from "@/lib/utils/data";
import { Bell, Sparkles } from "lucide-react";

export default function Home() {
  const { activeTab, isBottomSheetOpen, closeBottomSheet, openAcupointDetail } = useAppStore();
  const { startSetGuide } = useSetGuideStore();
  const { favoriteIds } = useFavorites();

  const symptoms = useMemo(() => getSymptoms(), []);
  const favoriteAcupoint = favoriteIds.length > 0 ? getAcupointById(favoriteIds[0]) : undefined;
  const fallbackSymptom = symptoms.find((symptom) => symptom.id === "shoulder_pain") ?? symptoms[0];
  const sessionSymptom = symptoms.find((symptom) => symptom.id === "headache") ?? fallbackSymptom;

  const handleStartRoutine = (symptomId: string) => {
    const symptom = symptoms.find((item) => item.id === symptomId);
    if (!symptom || symptom.acupointIds.length === 0) return;
    startSetGuide(symptom.id, symptom.acupointIds);
    openAcupointDetail(symptom.acupointIds[0]);
  };

  const handleRecommendedClick = () => {
    if (favoriteAcupoint) {
      openAcupointDetail(favoriteAcupoint.id);
      return;
    }
    if (fallbackSymptom) {
      handleStartRoutine(fallbackSymptom.id);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-10 pt-4">
      <header className="px-1 pb-4 pt-2">
        <div className="glass-panel rounded-[32px] px-5 py-4 shadow-[0_12px_32px_rgba(24,32,29,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Daily Recovery
              </span>
              <div>
                <h1 className="text-[30px] font-extrabold tracking-[-0.06em] text-brand leading-8">꾹꾹이</h1>
                <p className="mt-1 text-sm leading-5 text-on-surface-variant">
                  복잡한 설명 대신, 지금 필요한 지압 동선을 바로 찾게 합니다.
                </p>
              </div>
            </div>
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white/72 text-brand shadow-[0_10px_24px_rgba(24,32,29,0.08)]">
              <Bell className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleRecommendedClick}
              className="premium-panel min-h-[94px] rounded-[24px] px-4 py-3 text-left transition-transform active:scale-[0.98]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Recommended</p>
              <p className="mt-1 text-sm font-bold text-on-surface">
                {favoriteAcupoint
                  ? `${favoriteAcupoint.name.ko} 바로 열기`
                  : `${fallbackSymptom?.name.ko ?? "추천 루틴"} 시작`}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {favoriteAcupoint
                  ? "가장 최근 저장한 혈자리"
                  : "즐겨찾기가 없어서 기본 추천을 보여줍니다"}
              </p>
            </button>
            <button
              type="button"
              onClick={() => sessionSymptom && handleStartRoutine(sessionSymptom.id)}
              className="min-h-[94px] rounded-[24px] bg-brand px-4 py-3 text-left text-white shadow-[0_18px_32px_rgba(21,33,28,0.16)] transition-transform active:scale-[0.98]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Session</p>
              <p className="mt-1 text-sm font-bold">3분 루틴 시작</p>
              <p className="mt-1 text-xs text-white/70">
                {sessionSymptom ? `${sessionSymptom.name.ko} 완화 루틴` : "바로 실행"}
              </p>
            </button>
          </div>
        </div>
      </header>

      <div className="px-1 pb-4">
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
