"use client";

import { useTranslations } from "next-intl";
import { useAcupointSearch } from "@/lib/hooks/useAcupointSearch";
import { useAppStore } from "@/store/useAppStore";
import { AcupointCard } from "@/components/AcupointCard";

export const SearchTab = () => {
  const t = useTranslations("search_page");
  const { query, setQuery, results } = useAcupointSearch();
  const { openAcupointDetail } = useAppStore();

  return (
    <div className="px-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("placeholder")}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        aria-label={t("placeholder")}
      />
      <div className="mt-3 flex flex-col gap-2">
        {query.length > 0 && results.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-500">
            <p>{t("empty")}</p>
            <p className="mt-1 text-xs">{t("suggestion")}</p>
          </div>
        )}
        {results.map((a) => (
          <AcupointCard key={a.id} acupoint={a} onClick={openAcupointDetail} />
        ))}
      </div>
    </div>
  );
};
