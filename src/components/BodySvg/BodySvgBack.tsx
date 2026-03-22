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
      <ellipse cx="100" cy="22" rx="22" ry="20" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      <rect x="60" y="2" width="80" height="40" fill="transparent" />
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

    {/* Back */}
    <g
      id="region-back"
      onClick={() => onRegionClick("back")}
      className="cursor-pointer"
      role="button"
      aria-label="Back"
    >
      <rect x="72" y="80" width="56" height="130" rx="4" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      {/* Spine line */}
      <line x1="100" y1="82" x2="100" y2="208" stroke="#c8a97a" strokeWidth="0.8" strokeDasharray="3 2" />
      {/* Shoulder blade lines */}
      <ellipse cx="87" cy="105" rx="8" ry="10" fill="none" stroke="#c8a97a" strokeWidth="0.6" opacity="0.6" />
      <ellipse cx="113" cy="105" rx="8" ry="10" fill="none" stroke="#c8a97a" strokeWidth="0.6" opacity="0.6" />
      <rect x="55" y="90" width="90" height="130" fill="transparent" />
    </g>

    {/* Hip */}
    <g
      id="region-hip"
      onClick={() => onRegionClick("hip")}
      className="cursor-pointer"
      role="button"
      aria-label="Hip"
    >
      <rect x="72" y="210" width="56" height="40" rx="4" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      {/* Sacrum shape */}
      <ellipse cx="100" cy="230" rx="14" ry="10" fill="none" stroke="#c8a97a" strokeWidth="0.7" opacity="0.6" />
      <rect x="50" y="220" width="100" height="50" fill="transparent" />
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
      <rect x="76" y="248" width="22" height="140" rx="10" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      {/* Right leg */}
      <rect x="102" y="248" width="22" height="140" rx="10" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
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
      {/* Left foot (viewed from back — heel visible) */}
      <ellipse cx="87" cy="396" rx="12" ry="8" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      {/* Right foot */}
      <ellipse cx="113" cy="396" rx="12" ry="8" fill="#f5d0a9" stroke="#c8a97a" strokeWidth="1" />
      <rect x="55" y="420" width="90" height="70" fill="transparent" />
    </g>
  </>
);
