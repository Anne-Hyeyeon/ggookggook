"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Play, Activity } from "lucide-react";
import { getSymptoms } from "@/lib/utils/data";
import { getLocalizedText } from "@/lib/utils/locale";
import { useAppStore } from "@/store/useAppStore";
import { useSetGuideStore } from "@/store/useSetGuideStore";
import { BodySvgViewer } from "@/components/BodySvg/BodySvgViewer";
import type { Locale } from "@/types";
import clsx from "clsx";

export const SymptomTab = () => {
  const locale = useLocale() as Locale;
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
    <div className="px-6 flex flex-col gap-8">
      {/* Header row */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold text-on-surface">Select Relief</h2>
        <span className="text-xs uppercase tracking-widest text-on-surface-variant/50 font-bold">
          ACUPRESSURE FOCUS
        </span>
      </div>

      {/* Symptom chips — flex wrap */}
      <div className="flex flex-wrap gap-3">
        {symptoms.map((symptom) => {
          const isSelected = selectedSymptomId === symptom.id;
          return (
            <button
              key={symptom.id}
              onClick={() => handleSymptomClick(symptom.id)}
              className={clsx(
                "rounded-full px-5 py-2.5 text-sm transition-all active:scale-95 cursor-pointer flex items-center gap-2",
                isSelected
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "bg-surface-container-high text-on-surface-variant font-semibold"
              )}
            >
              {isSelected && <Activity className="h-4 w-4" />}
              {symptom.name.en}/{symptom.name.ko}
            </button>
          );
        })}
      </div>

      {/* Body SVG area */}
      <div className="bg-surface-container-low rounded-[2.5rem] py-12 px-8">
        {selectedSymptom && (
          <div className="mb-4">
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-primary font-bold">
              Target Area
            </span>
            <h3 className="text-lg font-bold text-on-surface mt-1">
              {selectedSymptom.name.en}/{selectedSymptom.name.ko}
            </h3>
          </div>
        )}
        <BodySvgViewer highlightedAcupointIds={selectedSymptom?.acupointIds ?? []} />
      </div>

      {/* Recommend card at bottom when symptom selected */}
      {selectedSymptom && (
        <div className="bg-primary rounded-[32px] p-6 flex items-center justify-between shadow-[0_12px_40px_rgba(71,98,65,0.2)]">
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-[1.2px] text-primary-container mb-1">RECOMMENDED</span>
            <p className="text-white font-bold text-lg leading-7">
              Start {selectedSymptom.name.en} Relief Set
            </p>
            <p className="text-[#dcfcd0] text-sm mt-0.5">
              Estimated time: 3 min
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Play className="h-[14px] w-[18px] text-white" fill="currentColor" />
          </div>
        </div>
      )}
    </div>
  );
};
