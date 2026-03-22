import type { BodyPart } from "@/types";

interface IRegionBounds {
  viewBox: string;
  view: "front" | "back" | "both";
}

// Coordinates match the 200x500 SVG canvas used by BodySvgFront/BodySvgBack
export const BODY_REGIONS: Record<BodyPart, IRegionBounds> = {
  head:     { viewBox: "60 0 80 48",    view: "both" },
  face:     { viewBox: "78 10 44 32",   view: "front" },
  neck:     { viewBox: "75 35 50 35",   view: "both" },
  shoulder: { viewBox: "35 55 130 35",  view: "both" },
  arm:      { viewBox: "30 70 45 125",  view: "both" },
  hand:     { viewBox: "40 182 42 35",  view: "front" },
  chest:    { viewBox: "60 72 80 78",   view: "front" },
  abdomen:  { viewBox: "62 135 76 62",  view: "front" },
  back:     { viewBox: "60 75 80 120",  view: "back" },
  hip:      { viewBox: "55 205 90 55",  view: "back" },
  leg:      { viewBox: "62 222 65 175", view: "both" },
  foot:     { viewBox: "65 378 70 30",  view: "both" },
};

export const FULL_VIEWBOX = "0 0 200 500";
