"use client";

import { useAuth } from "@/components/AuthProvider";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { getAcupointById, getSymptoms } from "@/lib/utils/data";
import { BODY_REGIONS } from "@/components/BodySvg/bodyRegions";
import { BodySvgFront } from "@/components/BodySvg/BodySvgFront";
import { BodySvgBack } from "@/components/BodySvg/BodySvgBack";
import { AcupointDot } from "@/components/BodySvg/AcupointDot";
import { useAppStore } from "@/store/useAppStore";
import type { IAcupoint } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Bookmark, Home, Leaf } from "lucide-react";

const noop = () => {};

export default function FavoritesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { favoriteIds, isLoading, toggleFavorite } = useFavorites();
  const { openAcupointDetail } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?next=/favorites");
    }
  }, [user, authLoading, router]);

  const symptoms = useMemo(() => getSymptoms(), []);

  const getFirstBenefitName = (acupoint: IAcupoint): string => {
    const firstBenefitId = acupoint.benefits[0];
    if (!firstBenefitId) return "";
    const symptom = symptoms.find((s) => s.id === firstBenefitId);
    return symptom?.name.en ?? firstBenefitId;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-container border-t-primary" />
      </div>
    );
  }

  const favoriteAcupoints = favoriteIds
    .map((id) => getAcupointById(id))
    .filter((a): a is IAcupoint => a !== undefined);

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-surface px-6 pb-24 pt-8">
      {/* Title section */}
      <h1 className="text-[36px] font-extrabold tracking-[-0.9px] leading-10 text-on-surface">
        즐겨찾기
      </h1>
      {favoriteAcupoints.length > 0 && (
        <p className="text-base font-medium text-on-surface-variant mt-2 mb-8">
          내가 저장한 {favoriteAcupoints.length}개의 혈자리가 있습니다.
        </p>
      )}

      {favoriteAcupoints.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-low mb-6">
            <Bookmark className="h-10 w-10 text-on-surface-variant/40" />
          </div>
          <p className="text-xl font-bold text-on-surface mb-2">
            즐겨찾기한 혈자리가 없습니다
          </p>
          <Link
            href="/"
            className="mt-4 flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-bold text-on-primary transition-transform active:scale-95"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            홈으로 가기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {favoriteAcupoints.map((acupoint) => {
            const region = BODY_REGIONS[acupoint.bodyPart];
            const benefitLabel = getFirstBenefitName(acupoint);

            return (
              <article
                key={acupoint.id}
                className="flex items-center gap-5 rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-[0_4px_24px_rgba(48,51,46,0.04)]"
                role="button"
                tabIndex={0}
                aria-label={`${acupoint.name.ko} (${acupoint.name.en})`}
                onClick={() => openAcupointDetail(acupoint.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openAcupointDetail(acupoint.id);
                  }
                }}
              >
                {/* Thumbnail — zoomed body region with acupoint dot */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary-container overflow-hidden">
                  <svg
                    viewBox={region.viewBox}
                    className="h-full w-full"
                    aria-hidden="true"
                  >
                    {acupoint.view === "front" ? (
                      <BodySvgFront onRegionClick={noop} />
                    ) : (
                      <BodySvgBack onRegionClick={noop} />
                    )}
                    <AcupointDot
                      acupoint={acupoint}
                      isHighlighted
                      onClick={noop}
                    />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
                        {acupoint.bodyPart.toUpperCase()}
                        {benefitLabel ? ` / ${benefitLabel.toUpperCase()}` : ""}
                      </span>
                      <span className="text-lg font-bold leading-tight text-on-surface">
                        {acupoint.name.ko} ({acupoint.name.en})
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`${acupoint.name.ko} 즐겨찾기 해제`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(acupoint.id);
                      }}
                      className="ml-2 shrink-0"
                    >
                      <Bookmark className="h-5 w-5 fill-primary text-primary" />
                    </button>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {acupoint.benefits.slice(0, 3).map((benefitId) => {
                      const symptom = symptoms.find((s) => s.id === benefitId);
                      const label = symptom?.name.en ?? benefitId;
                      return (
                        <span
                          key={benefitId}
                          className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold uppercase text-on-surface-variant"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}

          {/* Bottom hint card */}
          <div className="flex items-center gap-4 rounded-[48px] border border-primary-container/50 bg-primary-container/20 p-6">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-container">
              <Leaf className="h-4 w-4 text-on-primary-container" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-primary">
                더 많은 혈자리를 찾아보세요
              </span>
              <span className="text-xs text-primary/80">
                탐색 탭에서 당신의 컨디션에 맞는 혈자리를 추천해 드립니다.
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
