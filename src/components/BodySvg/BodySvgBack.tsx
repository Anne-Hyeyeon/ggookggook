"use client";

import type { BodyPart } from "@/types";

interface IBodySvgProps {
  onRegionClick: (region: BodyPart) => void;
}

interface IRegionProps {
  bodyPart: BodyPart;
  label: string;
  onRegionClick: (region: BodyPart) => void;
  children: React.ReactNode;
}

const Region = ({ bodyPart, label, onRegionClick, children }: IRegionProps) => (
  <g
    id={`region-${bodyPart}`}
    onClick={() => onRegionClick(bodyPart)}
    className="cursor-pointer"
    role="button"
    aria-label={label}
  >
    {children}
  </g>
);

export const BodySvgBack = ({ onRegionClick }: IBodySvgProps) => (
  <>
    <image
      href="/body/body-back-chart-transparent.png"
      x={0}
      y={0}
      width={200}
      height={500}
      preserveAspectRatio="none"
      data-body-asset="back"
    />

    <Region bodyPart="head" label="Head" onRegionClick={onRegionClick}>
      <ellipse cx="100" cy="28" rx="21" ry="21" fill="transparent" />
    </Region>

    <Region bodyPart="neck" label="Neck" onRegionClick={onRegionClick}>
      <rect x="88" y="48" width="24" height="22" rx="8" fill="transparent" />
    </Region>

    <Region bodyPart="shoulder" label="Shoulders" onRegionClick={onRegionClick}>
      <path d="M55 69 C70 58 86 55 100 55 C114 55 130 58 145 69 L145 95 L55 95 Z" fill="transparent" />
    </Region>

    <Region bodyPart="arm" label="Arms" onRegionClick={onRegionClick}>
      <path d="M55 80 C44 95 39 119 38 150 C38 169 39 182 42 196 L62 196 C60 182 59 168 59 150 C59 123 61 100 66 84 Z" fill="transparent" />
      <path d="M145 80 C156 95 161 119 162 150 C162 169 161 182 158 196 L138 196 C140 182 141 168 141 150 C141 123 139 100 134 84 Z" fill="transparent" />
    </Region>

    <Region bodyPart="hand" label="Hands" onRegionClick={onRegionClick}>
      <ellipse cx="48" cy="207" rx="12" ry="18" fill="transparent" />
      <ellipse cx="152" cy="207" rx="12" ry="18" fill="transparent" />
    </Region>

    <Region bodyPart="back" label="Back" onRegionClick={onRegionClick}>
      <path d="M67 73 C75 67 87 65 100 65 C113 65 125 67 133 73 C137 90 138 116 137 147 C136 168 133 186 128 200 C121 214 111 221 100 223 C89 221 79 214 72 200 C67 186 64 168 63 147 C62 116 63 90 67 73 Z" fill="transparent" />
    </Region>

    <Region bodyPart="hip" label="Hip" onRegionClick={onRegionClick}>
      <path d="M72 196 C77 214 85 226 100 233 C115 226 123 214 128 196 C130 211 130 224 126 234 C120 240 111 243 100 243 C89 243 80 240 74 234 C70 224 70 211 72 196 Z" fill="transparent" />
    </Region>

    <Region bodyPart="leg" label="Legs" onRegionClick={onRegionClick}>
      <path d="M83 238 C79 259 77 289 77 326 C77 351 79 372 82 390 L98 390 C98 369 98 348 97 324 C96 290 97 260 100 238 Z" fill="transparent" />
      <path d="M117 238 C121 259 123 289 123 326 C123 351 121 372 118 390 L102 390 C102 369 102 348 103 324 C104 290 103 260 100 238 Z" fill="transparent" />
    </Region>

    <Region bodyPart="foot" label="Feet" onRegionClick={onRegionClick}>
      <ellipse cx="91" cy="401" rx="16" ry="11" fill="transparent" />
      <ellipse cx="109" cy="401" rx="16" ry="11" fill="transparent" />
    </Region>
  </>
);
