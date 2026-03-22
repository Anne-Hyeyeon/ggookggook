"use client";

import { useLocale } from "next-intl";
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
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
    >
      <div className="flex-1">
        <p className="font-medium">{getLocalizedText(acupoint.name, locale)}</p>
        <p className="text-xs text-gray-500">{acupoint.id} · {acupoint.bodyPart}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {benefitLabels.map((label) => (
            <span key={label} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {label}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
};
