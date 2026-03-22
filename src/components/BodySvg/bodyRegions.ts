import type { BodyPart } from "@/types";

interface IRegionBounds {
  viewBox: string;
  view: "front" | "back" | "both";
}

// These coordinates assume a 200x500 SVG canvas
export const BODY_REGIONS: Record<BodyPart, IRegionBounds> = {
  head:     { viewBox: "60 0 80 60",    view: "both" },
  face:     { viewBox: "65 15 70 50",   view: "front" },
  neck:     { viewBox: "70 55 60 30",   view: "both" },
  shoulder: { viewBox: "30 70 140 40",  view: "both" },
  arm:      { viewBox: "10 100 50 120", view: "both" },
  hand:     { viewBox: "0 210 50 60",   view: "front" },
  chest:    { viewBox: "55 90 90 80",   view: "front" },
  abdomen:  { viewBox: "60 160 80 70",  view: "front" },
  back:     { viewBox: "55 90 90 130",  view: "back" },
  hip:      { viewBox: "50 220 100 50", view: "back" },
  leg:      { viewBox: "50 270 100 150",view: "both" },
  foot:     { viewBox: "55 420 90 70",  view: "both" },
};

export const FULL_VIEWBOX = "0 0 200 500";
