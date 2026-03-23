"use client";

import type { IAcupoint } from "@/types";

interface IAcupointDotProps {
  acupoint: IAcupoint;
  isHighlighted?: boolean;
  onClick: (id: string) => void;
}

export const AcupointDot = ({ acupoint, isHighlighted, onClick }: IAcupointDotProps) => (
  <g
    onClick={(e) => { e.stopPropagation(); onClick(acupoint.id); }}
    className="cursor-pointer"
    role="button"
    aria-label={acupoint.name.ko}
  >
    {/* Enlarged invisible hit area */}
    <circle
      cx={acupoint.position.x}
      cy={acupoint.position.y}
      r={isHighlighted ? 8 : 6}
      fill="transparent"
      stroke="none"
    />
    {/* Outer glow for highlighted */}
    {isHighlighted && (
      <circle
        cx={acupoint.position.x}
        cy={acupoint.position.y}
        r={6}
        fill="#476241"
        opacity={0.15}
        className="animate-pulse"
      />
    )}
    {/* Visible dot — sage green with border */}
    <circle
      cx={acupoint.position.x}
      cy={acupoint.position.y}
      r={isHighlighted ? 3.5 : 2.5}
      fill={isHighlighted ? "#50644b" : "transparent"}
      stroke="#476241"
      strokeWidth={isHighlighted ? 1.2 : 0.8}
      className="transition-all duration-200"
    />
  </g>
);
