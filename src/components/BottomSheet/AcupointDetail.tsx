"use client";

import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useAppStore } from "@/store/useAppStore";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useSetGuideStore } from "@/store/useSetGuideStore";
import { getAcupointById, getSymptoms } from "@/lib/utils/data";
import { getLocalizedText } from "@/lib/utils/locale";
import { BODY_REGIONS } from "@/components/BodySvg/bodyRegions";
import { BodySvgFront } from "@/components/BodySvg/BodySvgFront";
import { BodySvgBack } from "@/components/BodySvg/BodySvgBack";
import { AcupointDot } from "@/components/BodySvg/AcupointDot";
import { AcupressureTimer } from "@/components/Timer/AcupressureTimer";
import type { Locale } from "@/types";

export const AcupointDetail = () => {
  const locale = useLocale() as Locale;
  const t = useTranslations("detail");
  const router = useRouter();
  const { user } = useAuth();
  const { selectedAcupointId } = useAppStore();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { symptomId, acupointIds, currentIndex, goToNext, goToPrevious, timerDuration, setTimerDuration } = useSetGuideStore();

  if (!selectedAcupointId) return null;

  const acupoint = getAcupointById(selectedAcupointId);
  if (!acupoint) return null;

  const symptoms = getSymptoms();
  const currentSymptom = symptomId ? symptoms.find((s) => s.id === symptomId) : null;
  const isInSet = !!currentSymptom && acupointIds.length > 0;

  const benefitLabels = acupoint.benefits
    .map((id) => symptoms.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)
    .map((s) => getLocalizedText(s.name, locale));

  const handleFavoriteToggle = () => {
    if (!user) {
      router.push(`/login?next=/`);
      return;
    }
    toggleFavorite(selectedAcupointId);
  };

  const handleSetNavigate = (direction: "next" | "prev") => {
    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    const newId = acupointIds[newIndex];
    if (!newId) return;
    if (direction === "next") goToNext();
    else goToPrevious();
    useAppStore.getState().openAcupointDetail(newId);
  };

  const regionBounds = BODY_REGIONS[acupoint.bodyPart];

  return (
    <div className="px-4 pb-6">
      {/* Set navigation */}
      {isInSet && (
        <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
          <button
            onClick={() => handleSetNavigate("prev")}
            disabled={currentIndex === 0}
            className="disabled:opacity-30"
          >
            {t("prev")}
          </button>
          <span className="font-semibold text-blue-600">
            {getLocalizedText(currentSymptom!.name, locale)} {currentIndex + 1}/{acupointIds.length}
          </span>
          <button
            onClick={() => handleSetNavigate("next")}
            disabled={currentIndex === acupointIds.length - 1}
            className="disabled:opacity-30"
          >
            {t("next")}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{getLocalizedText(acupoint.name, locale)} ({acupoint.id})</h2>
          <p className="text-sm text-gray-500">
            {locale === "ko" ? acupoint.name.en : acupoint.name.ko} · {acupoint.bodyPart}
          </p>
        </div>
        <button
          onClick={handleFavoriteToggle}
          className={clsx("text-2xl", isFavorite(selectedAcupointId) && "text-red-500")}
          aria-label="Toggle favorite"
        >
          {isFavorite(selectedAcupointId) ? "♥" : "♡"}
        </button>
      </div>

      {/* Zoomed body part SVG */}
      <div className="mb-3 flex justify-center rounded-lg bg-gray-50 p-3">
        <svg viewBox={regionBounds.viewBox} className="h-36 w-auto">
          {acupoint.view === "front"
            ? <BodySvgFront onRegionClick={() => {}} />
            : <BodySvgBack onRegionClick={() => {}} />
          }
          <AcupointDot acupoint={acupoint} isHighlighted onClick={() => {}} />
        </svg>
      </div>

      {/* Benefits */}
      <div className="mb-3">
        <h3 className="mb-1 text-sm font-bold">{t("benefits")}</h3>
        <div className="flex flex-wrap gap-1">
          {benefitLabels.map((label) => (
            <span key={label} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Technique */}
      <div className="mb-4">
        <h3 className="mb-1 text-sm font-bold">{t("technique")}</h3>
        <p className="text-sm text-gray-700">{getLocalizedText(acupoint.technique, locale)}</p>
      </div>

      {/* Timer */}
      <AcupressureTimer
        initialDuration={timerDuration}
        onDurationChange={setTimerDuration}
      />

      {/* YouTube video — hidden until videoUrl exists */}
      {acupoint.videoUrl && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-bold">{t("video")}</h3>
          <iframe
            src={acupoint.videoUrl.replace("watch?v=", "embed/")}
            className="aspect-video w-full rounded-lg"
            allowFullScreen
            title={getLocalizedText(acupoint.name, locale)}
          />
        </div>
      )}
    </div>
  );
};
