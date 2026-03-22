"use client";

import type { BodyPart } from "@/types";

interface IBodySvgProps {
  onRegionClick: (region: BodyPart) => void;
}

export const BodySvgBack = ({ onRegionClick }: IBodySvgProps) => (
  <>
    {/* Head */}
    <g
      id="region-head"
      onClick={() => onRegionClick("head")}
      className="cursor-pointer"
      role="button"
      aria-label="Head"
    >
      <path
        d="M100 4 C116 4 122 13 122 23 C122 34 113 44 100 45 C87 44 78 34 78 23 C78 13 84 4 100 4 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Hair line hint */}
      <path d="M82 10 Q92 6 100 7 Q108 6 118 10" fill="none" stroke="#c8a97a" strokeWidth="0.5" opacity="0.3" />
      {/* Ear hints */}
      <path d="M78 20 C75 18 74 24 77 26" fill="none" stroke="#c8a97a" strokeWidth="0.5" opacity="0.4" />
      <path d="M122 20 C125 18 126 24 123 26" fill="none" stroke="#c8a97a" strokeWidth="0.5" opacity="0.4" />
    </g>

    {/* Neck */}
    <g
      id="region-neck"
      onClick={() => onRegionClick("neck")}
      className="cursor-pointer"
      role="button"
      aria-label="Neck"
    >
      <path
        d="M93 44 C93 50 92 56 91 62 L109 62 C108 56 107 50 107 44 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Cervical spine hint */}
      <circle cx="100" cy="50" r="1.2" fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.25" />
      <circle cx="100" cy="56" r="1.2" fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.25" />
    </g>

    {/* Shoulders */}
    <g
      id="region-shoulder"
      onClick={() => onRegionClick("shoulder")}
      className="cursor-pointer"
      role="button"
      aria-label="Shoulders"
    >
      {/* Left shoulder */}
      <path
        d="M91 62 C84 63 72 66 62 70 C54 74 50 78 50 84 L72 84 C78 78 86 68 91 62 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Right shoulder */}
      <path
        d="M109 62 C116 63 128 66 138 70 C146 74 150 78 150 84 L128 84 C122 78 114 68 109 62 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
    </g>

    {/* Arms */}
    <g
      id="region-arm"
      onClick={() => onRegionClick("arm")}
      className="cursor-pointer"
      role="button"
      aria-label="Arms"
    >
      {/* Left arm */}
      <path
        d="M50 84 C48 95 46 115 46 132 C46 150 48 168 50 186 L68 186 C66 168 64 150 64 132 C64 115 66 95 72 84 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Right arm */}
      <path
        d="M150 84 C152 95 154 115 154 132 C154 150 152 168 150 186 L132 186 C134 168 136 150 136 132 C136 115 134 95 128 84 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Elbow creases */}
      <path d="M52 132 Q59 130 66 132" fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.3" />
      <path d="M134 132 Q141 130 148 132" fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.3" />
    </g>

    {/* Back */}
    <g
      id="region-back"
      onClick={() => onRegionClick("back")}
      className="cursor-pointer"
      role="button"
      aria-label="Back"
    >
      <path
        d="M72 84 L128 84 C128 110 128 140 128 170 C128 185 127 195 126 200 L74 200 C73 195 72 185 72 170 C72 140 72 110 72 84 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Spine */}
      <path
        d="M100 84 L100 198"
        fill="none" stroke="#c8a97a" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.35"
      />
      {/* Left shoulder blade */}
      <path
        d="M85 98 C80 102 79 110 82 118 C85 124 90 118 92 112 C93 106 90 98 85 98 Z"
        fill="none" stroke="#c8a97a" strokeWidth="0.5" opacity="0.25"
      />
      {/* Right shoulder blade */}
      <path
        d="M115 98 C120 102 121 110 118 118 C115 124 110 118 108 112 C107 106 110 98 115 98 Z"
        fill="none" stroke="#c8a97a" strokeWidth="0.5" opacity="0.25"
      />
      {/* Lower back dimples */}
      <circle cx="92" cy="185" r="1.5" fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.2" />
      <circle cx="108" cy="185" r="1.5" fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.2" />
    </g>

    {/* Hands (same as front — viewed from back) */}
    <g
      id="region-hand"
      onClick={() => onRegionClick("hand")}
      className="cursor-pointer"
      role="button"
      aria-label="Hands"
    >
      {/* Left hand */}
      <path
        d="M50 186 C47 192 46 198 48 204 C50 211 56 216 62 215 C69 214 72 208 72 200 C72 194 70 189 68 186 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Right hand */}
      <path
        d="M150 186 C153 192 154 198 152 204 C150 211 144 216 138 215 C131 214 128 208 128 200 C128 194 130 189 132 186 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
    </g>

    {/* Hip */}
    <g
      id="region-hip"
      onClick={() => onRegionClick("hip")}
      className="cursor-pointer"
      role="button"
      aria-label="Hip"
    >
      <path
        d="M74 200 L126 200 C128 215 128 228 120 238 L80 238 C72 228 72 215 74 200 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Sacrum / gluteal cleft */}
      <path
        d="M100 205 C100 215 100 228 100 236"
        fill="none" stroke="#c8a97a" strokeWidth="0.5" opacity="0.25"
      />
      {/* Gluteal curve hints */}
      <path
        d="M85 212 Q84 222 88 232"
        fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.2"
      />
      <path
        d="M115 212 Q116 222 112 232"
        fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.2"
      />
    </g>

    {/* Legs */}
    <g
      id="region-leg"
      onClick={() => onRegionClick("leg")}
      className="cursor-pointer"
      role="button"
      aria-label="Legs"
    >
      {/* Left leg */}
      <path
        d="M80 238 C80 260 80 285 80 310 C79 340 79 370 80 388 L96 388 C96 370 96 340 96 310 C96 285 97 260 98 238 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Right leg */}
      <path
        d="M120 238 C120 260 120 285 120 310 C121 340 121 370 120 388 L104 388 C104 370 104 340 104 310 C104 285 103 260 102 238 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Back-of-knee creases */}
      <path d="M82 316 Q88 320 94 316" fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.25" />
      <path d="M106 316 Q112 320 118 316" fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.25" />
      {/* Calf muscle hints */}
      <path d="M84 330 Q87 345 86 360" fill="none" stroke="#c8a97a" strokeWidth="0.3" opacity="0.2" />
      <path d="M116 330 Q113 345 114 360" fill="none" stroke="#c8a97a" strokeWidth="0.3" opacity="0.2" />
    </g>

    {/* Feet */}
    <g
      id="region-foot"
      onClick={() => onRegionClick("foot")}
      className="cursor-pointer"
      role="button"
      aria-label="Feet"
    >
      {/* Left foot (heel view) */}
      <path
        d="M80 388 C77 392 76 397 78 401 C80 405 85 407 90 405 C95 403 96 398 96 392 L96 388 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Heel contour */}
      <path d="M82 394 Q88 396 93 394" fill="none" stroke="#c8a97a" strokeWidth="0.3" opacity="0.2" />
      {/* Right foot */}
      <path
        d="M120 388 C123 392 124 397 122 401 C120 405 115 407 110 405 C105 403 104 398 104 392 L104 388 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      <path d="M107 394 Q112 396 118 394" fill="none" stroke="#c8a97a" strokeWidth="0.3" opacity="0.2" />
    </g>
  </>
);
