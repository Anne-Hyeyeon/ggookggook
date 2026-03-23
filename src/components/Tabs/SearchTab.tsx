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
    <div className="px-6 flex flex-col gap-8">
      {/* Search input */}
      <div className="flex flex-col gap-4">
        <div className="bg-surface-container-low rounded-[32px] flex items-center px-6 py-[22px] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
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
      </div>

      {/* Section label + results heading */}
      {results.length > 0 && (
        <div className="flex flex-col">
          <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant/50 mb-1">
            DISCOVERY
          </span>
          <h2 className="text-2xl font-bold text-on-surface">Recent Results</h2>
        </div>
      )}

      {/* Result cards */}
      <div className="flex flex-col gap-6">
        {query.length > 0 && results.length === 0 && (
          <div className="flex flex-col items-center text-center py-16">
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
              className="group w-full bg-surface-container-low rounded-[2rem] p-6 text-left transition-all active:scale-[0.98] cursor-pointer"
            >
              {/* Row 1: ID + body part badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-primary font-bold text-sm">{a.id}</span>
                <span className="bg-primary-container text-on-primary-container text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  {a.bodyPart}
                </span>
              </div>

              {/* Row 2: Name — English first */}
              <h3 className="text-xl font-bold text-on-surface mb-3">
                {a.name.en} ({a.name.ko})
              </h3>

              {/* Row 3: Benefit chips */}
              <div className="flex gap-2 flex-wrap mb-3">
                {benefitLabels.map((label) => (
                  <span
                    key={label}
                    className="bg-surface-container-lowest text-on-surface-variant text-xs font-semibold px-3 py-1.5 rounded-xl"
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Row 4: Description */}
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                {getLocalizedText(a.description, locale).slice(0, 70)}...
              </p>

              {/* Row 5: Chevron button right-aligned */}
              <div className="flex items-center justify-end">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom nudge card */}
      {query.length > 0 && (
        <div className="bg-primary-container/30 rounded-[48px] p-6 border border-primary/5">
          <div className="flex items-start gap-4">
            <div className="w-[38px] h-[38px] rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
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
