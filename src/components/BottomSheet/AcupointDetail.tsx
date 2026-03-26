"use client";

import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, MapPin } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useAppStore } from "@/store/useAppStore";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useSetGuideStore } from "@/store/useSetGuideStore";
import { getAcupointById, getSymptoms } from "@/lib/utils/data";
import { getLocalizedText } from "@/lib/utils/locale";
import { BODY_REGIONS } from "@/components/BodySvg/bodyRegions";
import { BodySvgFront } from "@/components/BodySvg/BodySvgFront";
import { BodySvgBack } from "@/components/BodySvg/BodySvgBack";
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
  const favorited = isFavorite(selectedAcupointId);

  return (
    <div className="flex flex-col gap-6 px-6 pb-8">
      {isInSet && (
        <div className="premium-panel rounded-[28px] px-4 py-4">
          <p className="mb-1 text-center text-sm font-medium text-on-surface-variant">
            현재 진행 중인 코스
          </p>
          <nav className="flex items-center justify-between">
            <button
              onClick={() => handleSetNavigate("prev")}
              disabled={currentIndex === 0}
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:text-primary disabled:opacity-25"
              aria-label="Previous acupoint"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-base font-bold tracking-[-0.04em] text-primary">
              {getLocalizedText(currentSymptom!.name, locale)} 세트 {currentIndex + 1}/{acupointIds.length}
            </span>
            <button
              onClick={() => handleSetNavigate("next")}
              disabled={currentIndex === acupointIds.length - 1}
              className="rounded-full p-2 text-on-surface-variant transition-colors hover:text-primary disabled:opacity-25"
              aria-label="Next acupoint"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <span className="self-start rounded-full bg-primary-container px-3 py-1 text-sm font-bold text-primary">
            {acupoint.id}
          </span>
          <h3 className="text-[32px] font-extrabold leading-tight tracking-[-0.06em] text-on-surface">
            {getLocalizedText(acupoint.name, locale)} ({locale === "ko" ? acupoint.name.en : acupoint.name.ko})
          </h3>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <MapPin className="h-4 w-4" />
            <span>Body Part: {acupoint.bodyPart}</span>
          </div>
        </div>
        <button
          onClick={handleFavoriteToggle}
          className={clsx(
            "flex h-12 w-12 items-center justify-center rounded-full shadow-[0_12px_20px_rgba(24,32,29,0.08)] transition-all active:scale-90",
            favorited
              ? "bg-primary-container text-primary"
              : "bg-white text-on-surface-variant"
          )}
          aria-label="Toggle favorite"
        >
          <Heart className="h-5 w-5" fill={favorited ? "currentColor" : "none"} strokeWidth={2} />
        </button>
      </div>

      <div className="relative w-full overflow-hidden rounded-[32px] premium-panel">
        <div className="flex items-center justify-center p-6">
          <svg viewBox={regionBounds.viewBox} className="h-44 w-auto">
            {acupoint.view === "front"
              ? <BodySvgFront onRegionClick={() => {}} />
              : <BodySvgBack onRegionClick={() => {}} />
            }
            <g
              className="cursor-pointer"
              role="button"
              aria-label={acupoint.name.ko}
            >
              <circle
                cx={acupoint.position.x}
                cy={acupoint.position.y}
                r={8}
                fill="transparent"
                stroke="none"
              />
              <circle
                cx={acupoint.position.x}
                cy={acupoint.position.y}
                r={6}
                fill="#b02500"
                opacity={0.15}
                className="animate-pulse"
              />
              <circle
                cx={acupoint.position.x}
                cy={acupoint.position.y}
                r={3.5}
                fill="#b02500"
                stroke="#ffffff"
                strokeWidth={1.5}
                className="transition-all duration-200"
              />
            </g>
          </svg>
        </div>
        <div className="absolute bottom-4 left-4 right-4 rounded-[20px] border border-white/70 bg-white/78 p-4 shadow-[0_12px_24px_rgba(24,32,29,0.08)] backdrop-blur-xl">
          <p className="text-sm font-medium leading-relaxed text-on-surface">
            {getLocalizedText(acupoint.technique, locale)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {benefitLabels.map((label, i) => (
          <span
            key={label}
            className={clsx(
              "rounded-full px-4 py-2 text-xs font-bold",
              i === 0
                ? "bg-primary-container text-primary"
                : "bg-white text-on-surface-variant shadow-[0_8px_18px_rgba(24,32,29,0.04)]"
            )}
          >
            #{label}
          </span>
        ))}
      </div>

      {/* Timer — Figma: bg=#f1f1ec r=48 p=24 HORIZONTAL */}
      <AcupressureTimer
        initialDuration={timerDuration}
        onDurationChange={setTimerDuration}
      />

      {/* YouTube video */}
      {acupoint.videoUrl && (
        <div>
          <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-outline">{t("video")}</label>
          <iframe
            src={acupoint.videoUrl.replace("watch?v=", "embed/")}
            className="aspect-video w-full rounded-[1.5rem]"
            allowFullScreen
            title={getLocalizedText(acupoint.name, locale)}
          />
        </div>
      )}
    </div>
  );
};
