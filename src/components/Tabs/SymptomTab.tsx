"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
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
    <div>
      <div className="flex flex-wrap gap-2 px-4 py-2">
        {symptoms.map((symptom) => (
          <button
            key={symptom.id}
            onClick={() => handleSymptomClick(symptom.id)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              selectedSymptomId === symptom.id
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            )}
          >
            {getLocalizedText(symptom.name, locale)}
          </button>
        ))}
      </div>
      <BodySvgViewer highlightedAcupointIds={selectedSymptom?.acupointIds ?? []} />
    </div>
  );
};
