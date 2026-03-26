"use client";

import { useTranslations } from "next-intl";
import { RotateCcw, ArrowLeft } from "lucide-react";
import { useBodySvg } from "@/lib/hooks/useBodySvg";
import { BodySvgFront } from "./BodySvgFront";
import { BodySvgBack } from "./BodySvgBack";
import { AcupointDot } from "./AcupointDot";
import { useAppStore } from "@/store/useAppStore";
import { getAcupoints } from "@/lib/utils/data";
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
      <div className="mb-4 flex w-fit self-end gap-1 rounded-full bg-white/80 p-1.5 shadow-[0_10px_22px_rgba(24,32,29,0.06)]">
        <button
          type="button"
          onClick={toggleBodyView}
          className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition-all"
          aria-label={bodyView === "front" ? t("back") : t("front")}
        >
          <RotateCcw className="h-3 w-3" />
          {bodyView === "front" ? t("back") : t("front")}
        </button>
        {isZoomed && (
          <button
            type="button"
            onClick={handleZoomOut}
            className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant transition-all"
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
