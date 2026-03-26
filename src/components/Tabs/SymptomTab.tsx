"use client";

import { useState } from "react";
import { Play, Activity, ArrowRight } from "lucide-react";
import { getSymptoms } from "@/lib/utils/data";
import { useAppStore } from "@/store/useAppStore";
import { useSetGuideStore } from "@/store/useSetGuideStore";
import { BodySvgViewer } from "@/components/BodySvg/BodySvgViewer";
import clsx from "clsx";

export const SymptomTab = () => {
  const symptoms = getSymptoms();
  const [selectedSymptomId, setSelectedSymptomId] = useState<string | null>(null);
  const { openAcupointDetail } = useAppStore();
  const { startSetGuide } = useSetGuideStore();

  const selectedSymptom = symptoms.find((s) => s.id === selectedSymptomId);

  const handleSymptomClick = (symptomId: string) => {
    const symptom = symptoms.find((s) => s.id === symptomId);
    if (!symptom) return;
    setSelectedSymptomId(symptomId);
    startSetGuide(symptomId, symptom.acupointIds);
    if (symptom.acupointIds.length > 0) {
      openAcupointDetail(symptom.acupointIds[0]);
    }
  };

  return (
    <div className="flex flex-col gap-5 px-1">
      <section className="premium-panel rounded-[32px] px-5 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Symptom Library</p>
            <h2 className="mt-3 text-[30px] font-extrabold tracking-[-0.07em] text-on-surface leading-9">
              증상부터 고르면
              <br />
              필요한 포인트만 남깁니다
            </h2>
          </div>
          <div className="rounded-[24px] bg-white px-4 py-3 text-right shadow-[0_12px_26px_rgba(24,32,29,0.06)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">Curated</p>
            <p className="mt-1 text-lg font-bold text-on-surface">{symptoms.length} sets</p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2.5">
        {symptoms.map((symptom) => {
          const isSelected = selectedSymptomId === symptom.id;
          return (
            <button
              key={symptom.id}
              onClick={() => handleSymptomClick(symptom.id)}
              className={clsx(
                "flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-sm transition-all active:scale-95",
                isSelected
                  ? "bg-brand text-white shadow-[0_14px_24px_rgba(21,33,28,0.12)]"
                  : "premium-panel text-on-surface-variant font-semibold"
              )}
            >
              {isSelected && <Activity className="h-4 w-4" />}
              {symptom.name.en}/{symptom.name.ko}
            </button>
          );
        })}
      </section>

      <section className="premium-panel rounded-[36px] p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-4 px-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Target view</p>
            <h3 className="mt-2 text-lg font-bold text-on-surface">
              {selectedSymptom
                ? `${selectedSymptom.name.en}/${selectedSymptom.name.ko}`
                : "원하는 증상을 선택하면 대응 부위를 바로 강조합니다"}
            </h3>
          </div>
          {selectedSymptom && (
            <span className="rounded-full bg-primary-container px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {selectedSymptom.acupointIds.length} points
            </span>
          )}
        </div>
        <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(224,234,228,0.7))] px-2 py-4">
          <BodySvgViewer highlightedAcupointIds={selectedSymptom?.acupointIds ?? []} />
        </div>
      </section>

      {selectedSymptom && (
        <section className="rounded-[32px] bg-[linear-gradient(135deg,#173c36,#205149_55%,#2d6c62)] p-6 text-white shadow-[0_24px_40px_rgba(21,33,28,0.18)]">
          <div className="flex items-start justify-between gap-5">
            <div className="flex flex-col">
              <span className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-white/68 uppercase">Recommended set</span>
              <p className="text-xl font-bold leading-7">
              Start {selectedSymptom.name.en} Relief Set
              </p>
              <p className="mt-2 text-sm text-white/72">
                선택한 증상에 맞는 혈자리 흐름을 순서대로 안내합니다. 예상 시간 3분.
              </p>
            </div>
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/14">
              <Play className="h-[14px] w-[18px] text-white" fill="currentColor" />
            </div>
          </div>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white/86">
            루틴 열기
            <ArrowRight className="h-4 w-4" />
          </div>
        </section>
      )}
    </div>
  );
};
