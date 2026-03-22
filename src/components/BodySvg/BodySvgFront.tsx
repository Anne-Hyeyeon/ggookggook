"use client";

import type { BodyPart } from "@/types";

interface IBodySvgProps {
  onRegionClick: (region: BodyPart) => void;
}

export const BodySvgFront = ({ onRegionClick }: IBodySvgProps) => (
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
      {/* Ear hints */}
      <path d="M78 20 C75 18 74 24 77 26" fill="none" stroke="#c8a97a" strokeWidth="0.5" opacity="0.4" />
      <path d="M122 20 C125 18 126 24 123 26" fill="none" stroke="#c8a97a" strokeWidth="0.5" opacity="0.4" />
    </g>

    {/* Face */}
    <g
      id="region-face"
      onClick={() => onRegionClick("face")}
      className="cursor-pointer"
      role="button"
      aria-label="Face"
    >
      <path
        d="M100 14 C112 14 117 20 117 28 C117 37 111 44 100 45 C89 44 83 37 83 28 C83 20 88 14 100 14 Z"
        fill="transparent"
      />
      {/* Eyes */}
      <ellipse cx="93" cy="24" rx="3.5" ry="1.8" fill="#c8a97a" opacity="0.25" />
      <ellipse cx="107" cy="24" rx="3.5" ry="1.8" fill="#c8a97a" opacity="0.25" />
      {/* Nose */}
      <path d="M100 27 L97.5 33 Q100 34 102.5 33 Z" fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.35" />
      {/* Mouth */}
      <path d="M96 37 Q100 39.5 104 37" fill="none" stroke="#c8a97a" strokeWidth="0.5" opacity="0.25" />
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
      {/* Throat hint */}
      <path d="M98 48 L98 58" fill="none" stroke="#c8a97a" strokeWidth="0.3" opacity="0.2" />
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

    {/* Chest */}
    <g
      id="region-chest"
      onClick={() => onRegionClick("chest")}
      className="cursor-pointer"
      role="button"
      aria-label="Chest"
    >
      <path
        d="M72 84 L128 84 C128 100 127 120 126 140 L74 140 C73 120 72 100 72 84 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Collarbone */}
      <path d="M100 85 C94 87 84 89 76 87" fill="none" stroke="#c8a97a" strokeWidth="0.5" opacity="0.35" />
      <path d="M100 85 C106 87 116 89 124 87" fill="none" stroke="#c8a97a" strokeWidth="0.5" opacity="0.35" />
      {/* Subtle chest line */}
      <path d="M100 88 L100 130" fill="none" stroke="#c8a97a" strokeWidth="0.3" opacity="0.15" />
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

    {/* Abdomen */}
    <g
      id="region-abdomen"
      onClick={() => onRegionClick("abdomen")}
      className="cursor-pointer"
      role="button"
      aria-label="Abdomen"
    >
      <path
        d="M74 140 L126 140 C127 160 128 180 128 200 C124 203 112 205 100 205 C88 205 76 203 72 200 C72 180 73 160 74 140 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Navel */}
      <circle cx="100" cy="168" r="2.2" fill="none" stroke="#c8a97a" strokeWidth="0.6" opacity="0.4" />
      {/* Subtle waist lines */}
      <path d="M74 155 Q76 157 74 160" fill="none" stroke="#c8a97a" strokeWidth="0.3" opacity="0.2" />
      <path d="M126 155 Q124 157 126 160" fill="none" stroke="#c8a97a" strokeWidth="0.3" opacity="0.2" />
    </g>

    {/* Hands */}
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
      {/* Left finger lines */}
      <path d="M52 210 L50 215" fill="none" stroke="#c8a97a" strokeWidth="0.35" opacity="0.25" />
      <path d="M56 212 L55 218" fill="none" stroke="#c8a97a" strokeWidth="0.35" opacity="0.25" />
      <path d="M61 213 L60 219" fill="none" stroke="#c8a97a" strokeWidth="0.35" opacity="0.25" />
      {/* Right hand */}
      <path
        d="M150 186 C153 192 154 198 152 204 C150 211 144 216 138 215 C131 214 128 208 128 200 C128 194 130 189 132 186 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Right finger lines */}
      <path d="M148 210 L150 215" fill="none" stroke="#c8a97a" strokeWidth="0.35" opacity="0.25" />
      <path d="M144 212 L145 218" fill="none" stroke="#c8a97a" strokeWidth="0.35" opacity="0.25" />
      <path d="M139 213 L140 219" fill="none" stroke="#c8a97a" strokeWidth="0.35" opacity="0.25" />
    </g>

    {/* Pelvic / hip connector */}
    <path
      d="M72 200 C72 215 76 228 88 232 L112 232 C124 228 128 215 128 200"
      fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
    />

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
        d="M88 232 C86 255 82 280 80 310 C78 340 78 370 80 388 L96 388 C96 370 96 340 96 310 C96 280 98 255 98 232 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Right leg */}
      <path
        d="M112 232 C114 255 118 280 120 310 C122 340 122 370 120 388 L104 388 C104 370 104 340 104 310 C104 280 102 255 102 232 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Kneecap hints */}
      <ellipse cx="88" cy="308" rx="5.5" ry="3.5" fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.25" />
      <ellipse cx="112" cy="308" rx="5.5" ry="3.5" fill="none" stroke="#c8a97a" strokeWidth="0.4" opacity="0.25" />
      {/* Shin lines */}
      <path d="M86 320 L84 365" fill="none" stroke="#c8a97a" strokeWidth="0.3" opacity="0.15" />
      <path d="M114 320 L116 365" fill="none" stroke="#c8a97a" strokeWidth="0.3" opacity="0.15" />
    </g>

    {/* Feet */}
    <g
      id="region-foot"
      onClick={() => onRegionClick("foot")}
      className="cursor-pointer"
      role="button"
      aria-label="Feet"
    >
      {/* Left foot */}
      <path
        d="M80 388 C76 392 74 397 76 401 C78 405 84 407 90 405 C96 403 98 398 96 392 L96 388 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      {/* Toe hint */}
      <path d="M79 400 Q84 403 89 401" fill="none" stroke="#c8a97a" strokeWidth="0.3" opacity="0.2" />
      {/* Right foot */}
      <path
        d="M120 388 C124 392 126 397 124 401 C122 405 116 407 110 405 C104 403 102 398 104 392 L104 388 Z"
        fill="#f5d0a9" stroke="#c8a97a" strokeWidth="0.8"
      />
      <path d="M121 400 Q116 403 111 401" fill="none" stroke="#c8a97a" strokeWidth="0.3" opacity="0.2" />
    </g>
  </>
);
