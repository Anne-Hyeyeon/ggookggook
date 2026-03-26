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

export const BodySvgFront = ({ onRegionClick }: IBodySvgProps) => (
  <>
    <image
      href="/body/body-front-chart-transparent.png"
      x={0}
      y={0}
      width={200}
      height={500}
      preserveAspectRatio="none"
      data-body-asset="front"
    />

    <Region bodyPart="head" label="Head" onRegionClick={onRegionClick}>
      <ellipse cx="100" cy="28" rx="21" ry="21" fill="transparent" />
    </Region>

    <Region bodyPart="face" label="Face" onRegionClick={onRegionClick}>
      <ellipse cx="100" cy="30" rx="14" ry="17" fill="transparent" />
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

    <Region bodyPart="chest" label="Chest" onRegionClick={onRegionClick}>
      <path d="M68 73 C77 68 89 66 100 66 C111 66 123 68 132 73 C136 85 137 104 136 132 L64 132 C63 104 64 85 68 73 Z" fill="transparent" />
    </Region>

    <Region bodyPart="abdomen" label="Abdomen" onRegionClick={onRegionClick}>
      <path d="M66 132 L134 132 C135 151 134 171 131 191 C127 208 116 223 100 230 C84 223 73 208 69 191 C66 171 65 151 66 132 Z" fill="transparent" />
    </Region>

    <Region bodyPart="leg" label="Legs" onRegionClick={onRegionClick}>
      <path d="M83 228 C79 250 77 282 77 323 C77 349 79 370 82 390 L98 390 C98 368 98 345 97 320 C96 283 97 251 100 228 Z" fill="transparent" />
      <path d="M117 228 C121 250 123 282 123 323 C123 349 121 370 118 390 L102 390 C102 368 102 345 103 320 C104 283 103 251 100 228 Z" fill="transparent" />
    </Region>

    <Region bodyPart="foot" label="Feet" onRegionClick={onRegionClick}>
      <ellipse cx="91" cy="401" rx="16" ry="11" fill="transparent" />
      <ellipse cx="109" cy="401" rx="16" ry="11" fill="transparent" />
    </Region>
  </>
);
