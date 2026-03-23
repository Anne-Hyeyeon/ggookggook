"use client";

import { useTranslations } from "next-intl";
import { RotateCcw, ArrowLeft } from "lucide-react";
import { useBodySvg } from "@/lib/hooks/useBodySvg";
import { BodySvgFront } from "./BodySvgFront";
import { BodySvgBack } from "./BodySvgBack";
import { AcupointDot } from "./AcupointDot";
import { useAppStore } from "@/store/useAppStore";
import { getAcupoints } from "@/lib/utils/data";
import clsx from "clsx";

interface IBodySvgViewerProps {
  highlightedAcupointIds?: string[];
}

export const BodySvgViewer = ({ highlightedAcupointIds = [] }: IBodySvgViewerProps) => {
  const t = useTranslations("body");
  const { currentViewBox, isZoomed, bodyView, handleRegionClick, handleZoomOut, toggleBodyView } = useBodySvg();
  const { openAcupointDetail, selectedRegion } = useAppStore();

  const acupoints = getAcupoints().filter((a) => {
    if (a.view !== bodyView) return false;
    if (isZoomed && selectedRegion && a.bodyPart !== selectedRegion) return false;
    return isZoomed || highlightedAcupointIds.includes(a.id);
  });

  return (
    <div className="relative flex flex-col items-center px-6">
      {/* View toggle — Figma: bg=#f1f1ec r=9999 p=6, active bg=#fff r=9999 shadow(y=1 blur=2) 14px w700 #476241, inactive 14px w500 #5a5c58 */}
      <div className="flex bg-surface-container-low p-1.5 rounded-full mb-4 w-fit self-end gap-1">
        <button
          type="button"
          onClick={toggleBodyView}
          className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-bold transition-all bg-white text-primary shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
          aria-label={bodyView === "front" ? t("back") : t("front")}
        >
          <RotateCcw className="h-3 w-3" />
          {bodyView === "front" ? t("back") : t("front")}
        </button>
        {isZoomed && (
          <button
            type="button"
            onClick={handleZoomOut}
            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium text-on-surface-variant transition-all"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("zoomOut")}
          </button>
        )}
      </div>
      <svg
        viewBox={currentViewBox}
        className="h-auto w-full max-w-xs transition-all duration-500 ease-in-out"
        aria-label="Body acupressure map"
      >
        {bodyView === "front"
          ? <BodySvgFront onRegionClick={handleRegionClick} />
          : <BodySvgBack onRegionClick={handleRegionClick} />
        }
        {acupoints.map((a) => (
          <AcupointDot
            key={a.id}
            acupoint={a}
            isHighlighted={highlightedAcupointIds.includes(a.id)}
            onClick={openAcupointDetail}
          />
        ))}
      </svg>
    </div>
  );
};
