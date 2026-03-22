"use client";

import { useTranslations } from "next-intl";
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
    <div className="relative flex flex-col items-center px-4">
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={toggleBodyView}
          className="rounded-full border border-gray-300 px-3 py-1 text-xs"
          aria-label={bodyView === "front" ? t("back") : t("front")}
        >
          {bodyView === "front" ? t("back") : t("front")}
        </button>
        {isZoomed && (
          <button
            type="button"
            onClick={handleZoomOut}
            className="rounded-full border border-gray-300 px-3 py-1 text-xs"
          >
            ← {t("zoomOut")}
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
