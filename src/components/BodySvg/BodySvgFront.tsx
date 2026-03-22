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
      <ellipse cx="100" cy="22" rx="22" ry="20" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      <rect x="60" y="2" width="80" height="40" fill="transparent" />
    </g>

    {/* Face */}
    <g
      id="region-face"
      onClick={() => onRegionClick("face")}
      className="cursor-pointer"
      role="button"
      aria-label="Face"
    >
      <ellipse cx="100" cy="28" rx="14" ry="12" fill="#f8e0c0" stroke="#c8a97a" strokeWidth="0.5" opacity="0.6" />
      <rect x="65" y="15" width="70" height="50" fill="transparent" />
    </g>

    {/* Neck */}
    <g
      id="region-neck"
      onClick={() => onRegionClick("neck")}
      className="cursor-pointer"
      role="button"
      aria-label="Neck"
    >
      <rect x="88" y="42" width="24" height="20" rx="3" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      <rect x="70" y="55" width="60" height="30" fill="transparent" />
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
      <rect x="55" y="62" width="35" height="18" rx="8" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      {/* Right shoulder */}
      <rect x="110" y="62" width="35" height="18" rx="8" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      <rect x="30" y="70" width="140" height="40" fill="transparent" />
    </g>

    {/* Chest */}
    <g
      id="region-chest"
      onClick={() => onRegionClick("chest")}
      className="cursor-pointer"
      role="button"
      aria-label="Chest"
    >
      <rect x="72" y="80" width="56" height="60" rx="4" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      {/* Collarbone lines */}
      <line x1="100" y1="80" x2="72" y2="85" stroke="#c8a97a" strokeWidth="0.8" />
      <line x1="100" y1="80" x2="128" y2="85" stroke="#c8a97a" strokeWidth="0.8" />
      <rect x="55" y="90" width="90" height="80" fill="transparent" />
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
      <rect x="50" y="80" width="22" height="110" rx="10" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      {/* Right arm */}
      <rect x="128" y="80" width="22" height="110" rx="10" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      <rect x="10" y="100" width="50" height="120" fill="transparent" />
    </g>

    {/* Abdomen */}
    <g
      id="region-abdomen"
      onClick={() => onRegionClick("abdomen")}
      className="cursor-pointer"
      role="button"
      aria-label="Abdomen"
    >
      <rect x="75" y="140" width="50" height="60" rx="4" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      {/* Navel */}
      <circle cx="100" cy="168" r="2.5" fill="none" stroke="#c8a97a" strokeWidth="0.8" />
      <rect x="60" y="160" width="80" height="70" fill="transparent" />
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
      <ellipse cx="61" cy="202" rx="11" ry="14" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      {/* Right hand */}
      <ellipse cx="139" cy="202" rx="11" ry="14" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      <rect x="0" y="210" width="50" height="60" fill="transparent" />
    </g>

    {/* Pelvic / lower torso (connecting waist to legs) */}
    <rect x="75" y="200" width="50" height="30" rx="2" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />

    {/* Legs */}
    <g
      id="region-leg"
      onClick={() => onRegionClick("leg")}
      className="cursor-pointer"
      role="button"
      aria-label="Legs"
    >
      {/* Left leg */}
      <rect x="76" y="228" width="22" height="160" rx="10" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      {/* Right leg */}
      <rect x="102" y="228" width="22" height="160" rx="10" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      <rect x="50" y="270" width="100" height="150" fill="transparent" />
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
      <ellipse cx="87" cy="396" rx="13" ry="8" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      {/* Right foot */}
      <ellipse cx="113" cy="396" rx="13" ry="8" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      <rect x="55" y="420" width="90" height="70" fill="transparent" />
    </g>
  </>
);
