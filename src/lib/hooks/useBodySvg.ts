import { useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { BODY_REGIONS, FULL_VIEWBOX } from "@/components/BodySvg/bodyRegions";
import type { BodyPart } from "@/types";

export const useBodySvg = () => {
  const { selectedRegion, isZoomed, bodyView, selectRegion, clearRegion, toggleBodyView } = useAppStore();

  const currentViewBox = isZoomed && selectedRegion
    ? BODY_REGIONS[selectedRegion].viewBox
    : FULL_VIEWBOX;

  const handleRegionClick = useCallback((region: BodyPart) => {
    selectRegion(region);
  }, [selectRegion]);

  const handleZoomOut = useCallback(() => {
    clearRegion();
  }, [clearRegion]);

  return {
    currentViewBox,
    isZoomed,
    bodyView,
    selectedRegion,
    handleRegionClick,
    handleZoomOut,
    toggleBodyView,
  };
};
