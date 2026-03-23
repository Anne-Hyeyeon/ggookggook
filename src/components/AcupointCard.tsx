"use client";

import { useLocale } from "next-intl";
import { ChevronRight } from "lucide-react";
import { getLocalizedText } from "@/lib/utils/locale";
import { getSymptoms } from "@/lib/utils/data";
import type { IAcupoint, Locale } from "@/types";

interface IAcupointCardProps {
  acupoint: IAcupoint;
  onClick: (id: string) => void;
}

export const AcupointCard = ({ acupoint, onClick }: IAcupointCardProps) => {
  const locale = useLocale() as Locale;
  const symptoms = getSymptoms();

  const benefitLabels = acupoint.benefits
    .map((id) => symptoms.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)
    .slice(0, 3)
    .map((s) => getLocalizedText(s.name, locale));

  return (
    <button
      onClick={() => onClick(acupoint.id)}
      className="group w-full bg-surface-container-low rounded-[2rem] p-6 flex flex-col text-left cursor-pointer transition-all active:scale-[0.98]"
    >
      {/* Row 1: ID + body part badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-primary font-bold text-sm">{acupoint.id}</span>
        <span className="bg-primary-container text-on-primary-container text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
          {acupoint.bodyPart}
        </span>
      </div>

      {/* Row 2: Name — English first */}
      <h3 className="text-xl font-bold text-on-surface mb-3">
        {acupoint.name.en} ({acupoint.name.ko})
      </h3>

      {/* Row 3: Benefit chips */}
      <div className="flex gap-2 flex-wrap mb-3">
        {benefitLabels.map((label) => (
          <span
            key={label}
            className="bg-surface-container-lowest text-on-surface-variant text-xs font-semibold px-3 py-1.5 rounded-xl"
          >
            {label}
          </span>
        ))}
      </div>

      {/* Row 4: Description */}
      <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
        {getLocalizedText(acupoint.description, locale).slice(0, 70)}...
      </p>

      {/* Row 5: Chevron button right-aligned */}
      <div className="flex items-center justify-end">
        <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
          <ChevronRight className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
};
