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
    <circle
      cx={acupoint.position.x}
      cy={acupoint.position.y}
      r={isHighlighted ? 5 : 3}
      fill={isHighlighted ? "#ef4444" : "#3b82f6"}
      className="transition-all duration-200"
    />
    {isHighlighted && (
      <circle
        cx={acupoint.position.x}
        cy={acupoint.position.y}
        r={8}
        fill="none"
        stroke="#ef4444"
        strokeWidth="1"
        opacity="0.5"
        className="animate-ping"
      />
    )}
  </g>
);
