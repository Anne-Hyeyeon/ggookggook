"use client";

import { useLocale, useTranslations } from "next-intl";
import { Search, ChevronRight } from "lucide-react";
import { useAcupointSearch } from "@/lib/hooks/useAcupointSearch";
import { useAppStore } from "@/store/useAppStore";
import { getLocalizedText } from "@/lib/utils/locale";
import { getSymptoms } from "@/lib/utils/data";
import type { Locale } from "@/types";

export const SearchTab = () => {
  const t = useTranslations("search_page");
  const locale = useLocale() as Locale;
  const { query, setQuery, results } = useAcupointSearch();
  const { openAcupointDetail } = useAppStore();
  const symptoms = getSymptoms();

  return (
    <div className="flex flex-col gap-5 px-1">
      <section className="premium-panel rounded-[32px] px-5 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Search Library</p>
        <h2 className="mt-3 text-[30px] font-extrabold tracking-[-0.07em] text-on-surface leading-9">
          알고 있는 이름으로
          <br />
          바로 찾기
        </h2>
        <div className="mt-5 flex items-center rounded-[28px] bg-white/88 px-5 py-4 shadow-[inset_0_0_0_1px_rgba(122,138,132,0.12),0_12px_28px_rgba(24,32,29,0.06)]">
          <Search className="h-[18px] w-[18px] text-outline mr-4 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-on-surface text-base font-normal placeholder:text-outline/60"
            aria-label={t("placeholder")}
          />
        </div>
      </section>

      {results.length > 0 && (
        <div className="px-1">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
            Discovery
          </span>
          <h2 className="text-2xl font-bold tracking-[-0.04em] text-on-surface">Recent Results</h2>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {query.length > 0 && results.length === 0 && (
          <div className="premium-panel flex flex-col items-center rounded-[32px] py-16 text-center">
            <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mb-6">
              <Search className="h-8 w-8 text-outline-variant/40" />
            </div>
            <p className="text-lg font-bold text-on-surface mb-2">{t("empty")}</p>
            <p className="text-sm text-on-surface-variant">{t("suggestion")}</p>
          </div>
        )}
        {results.map((a) => {
          const benefitLabels = a.benefits
            .map((id) => symptoms.find((s) => s.id === id))
            .filter((s): s is NonNullable<typeof s> => s !== undefined)
            .slice(0, 3)
            .map((s) => getLocalizedText(s.name, locale));

          return (
            <button
              key={a.id}
              onClick={() => openAcupointDetail(a.id)}
              className="premium-panel group w-full rounded-[32px] p-6 text-left transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-primary font-bold text-sm tracking-[0.04em]">{a.id}</span>
                <span className="bg-primary-container text-on-primary-container text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  {a.bodyPart}
                </span>
              </div>

              <h3 className="text-[22px] font-bold tracking-[-0.04em] text-on-surface mb-3">
                {a.name.en} ({a.name.ko})
              </h3>

              <div className="flex gap-2 flex-wrap mb-3">
                {benefitLabels.map((label) => (
                  <span
                    key={label}
                    className="bg-white text-on-surface-variant text-xs font-semibold px-3 py-1.5 rounded-full shadow-[0_8px_20px_rgba(24,32,29,0.04)]"
                  >
                    {label}
                  </span>
                ))}
              </div>

              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                {getLocalizedText(a.description, locale).slice(0, 70)}...
              </p>

              <div className="flex items-center justify-end">
                <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {query.length > 0 && (
        <div className="rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(213,243,237,0.7),rgba(255,255,255,0.78))] p-6 shadow-[0_16px_28px_rgba(24,32,29,0.05)]">
          <div className="flex items-start gap-4">
            <div className="w-[38px] h-[38px] rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-[0_8px_16px_rgba(24,32,29,0.06)]">
              <Search className="h-[22px] w-[22px] text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-primary">Can&apos;t find what you need?</p>
              <p className="text-xs text-primary/80 leading-[19.5px]">
                Try a more specific symptom or browse the &apos;Symptom&apos; tab for categories.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
