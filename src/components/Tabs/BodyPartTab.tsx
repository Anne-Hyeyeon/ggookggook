"use client";

import { Play } from "lucide-react";
import { BodySvgViewer } from "@/components/BodySvg/BodySvgViewer";

export const BodyPartTab = () => {
  return (
    <div className="px-6 flex flex-col gap-8">
      {/* Hero — Figma: gap=8 */}
      <div className="flex flex-col gap-2">
        <h2 className="text-[30px] font-bold tracking-[-0.8px] text-on-surface leading-9">
          어디가 불편하세요?
        </h2>
        <p className="text-base font-medium text-on-surface-variant opacity-80 leading-6">
          아픈 부위를 눌러주세요.
        </p>
      </div>

      {/* Body SVG — Figma: bg=#f1f1ec r=48 p=32 */}
      <div className="bg-surface-container-low rounded-[48px] p-8">
        <BodySvgViewer />
      </div>

      {/* Quick Start Card — Figma: r=32 p=24/32 shadow(y=12 blur=40) */}
      <div className="rounded-[32px] bg-gradient-to-br from-primary to-primary-dim p-6 pt-8 flex items-center justify-between shadow-[0_12px_40px_rgba(71,98,65,0.2)]">
        <div className="flex flex-col gap-[7px]">
          <span className="bg-white/20 self-start rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.5px] text-white">
            Editor&apos;s Pick
          </span>
          <p className="text-white font-bold text-lg leading-[22.5px]">
            오늘의 추천:<br />긴장성 두통 완화
          </p>
          <div className="flex items-center gap-1 pt-2">
            <span className="text-white/80 text-sm font-medium">지금 시작하기</span>
            <span className="text-white/80 text-sm">&rarr;</span>
          </div>
        </div>
        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
          <Play className="h-[30px] w-[30px] text-white" fill="currentColor" />
        </div>
      </div>
    </div>
  );
};
