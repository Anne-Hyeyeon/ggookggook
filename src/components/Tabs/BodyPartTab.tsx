"use client";

import { useMemo } from "react";
import { ArrowUpRight, Play, Sparkles } from "lucide-react";
import { BodySvgViewer } from "@/components/BodySvg/BodySvgViewer";
import { useAppStore } from "@/store/useAppStore";
import { useSetGuideStore } from "@/store/useSetGuideStore";
import { getSymptoms } from "@/lib/utils/data";

export const BodyPartTab = () => {
  const { openAcupointDetail } = useAppStore();
  const { startSetGuide } = useSetGuideStore();
  const symptoms = useMemo(() => getSymptoms(), []);
  const quickReliefSymptom = symptoms.find((symptom) => symptom.id === "shoulder_pain") ?? symptoms[0];
  const resetSymptom = symptoms.find((symptom) => symptom.id === "stress") ?? symptoms[0];

  const handleStartRoutine = (symptomId: string | undefined) => {
    if (!symptomId) return;
    const symptom = symptoms.find((item) => item.id === symptomId);
    if (!symptom || symptom.acupointIds.length === 0) return;
    startSetGuide(symptom.id, symptom.acupointIds);
    openAcupointDetail(symptom.acupointIds[0]);
  };

  return (
    <div className="flex flex-col gap-5 px-1">
      <section className="premium-panel rounded-[32px] px-5 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Body Scan
            </span>
            <h2 className="mt-4 text-[32px] font-extrabold tracking-[-0.07em] text-on-surface leading-9">
              어디가 불편한지
              <br />
              손끝으로 바로 찾기
            </h2>
            <p className="mt-3 max-w-[28ch] text-sm leading-6 text-on-surface-variant">
              몸 부위를 눌러 확대하면, 필요한 혈자리만 깔끔하게 추려서 보여줍니다.
            </p>
          </div>
          <div className="rounded-[24px] bg-brand px-4 py-3 text-right text-white shadow-[0_18px_30px_rgba(21,33,28,0.14)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">Focus</p>
            <p className="mt-1 text-lg font-bold">12 areas</p>
          </div>
        </div>
      </section>

      <section className="premium-panel rounded-[36px] p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between px-2">
          <div>
            <p className="text-sm font-bold text-on-surface">Interactive anatomy</p>
            <p className="mt-1 text-xs text-on-surface-variant">앞/뒤 전환과 부위 확대를 한 화면에서 처리합니다.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-on-surface-variant shadow-[0_8px_20px_rgba(24,32,29,0.06)]">
            Tap to zoom
          </span>
        </div>
        <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(224,234,228,0.7))] px-2 py-4">
          <BodySvgViewer />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleStartRoutine(quickReliefSymptom?.id)}
          className="premium-panel rounded-[28px] p-5 text-left transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Quick relief</span>
            <ArrowUpRight className="h-4 w-4 text-on-surface-variant" />
          </div>
          <p className="mt-3 text-lg font-bold leading-6 text-on-surface">
            {quickReliefSymptom ? `${quickReliefSymptom.name.ko} 루틴` : "기본 루틴"}
          </p>
          <p className="mt-2 text-sm leading-5 text-on-surface-variant">오래 앉아 있었을 때 가장 먼저 찾는 기본 동선.</p>
        </button>

        <button
          type="button"
          onClick={() => handleStartRoutine(resetSymptom?.id)}
          className="rounded-[28px] bg-[linear-gradient(135deg,#1a2b26,#27443c)] p-5 text-left text-white shadow-[0_22px_34px_rgba(21,33,28,0.18)] transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/68">Today</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12">
              <Play className="h-4 w-4" fill="currentColor" />
            </div>
          </div>
          <p className="mt-3 text-lg font-bold leading-6">3분 리셋 세션</p>
          <p className="mt-2 text-sm leading-5 text-white/72">집중이 떨어질 때 바로 시작할 수 있는 짧은 회복 루틴.</p>
        </button>
      </section>
    </div>
  );
};
