"use client";

import { useTranslations } from "next-intl";
import { useAppStore } from "@/store/useAppStore";
import type { TabType } from "@/types";
import clsx from "clsx";

const TABS: TabType[] = ["body", "symptom", "search"];

export const TabBar = () => {
  const t = useTranslations("tabs");
  const { activeTab, setActiveTab } = useAppStore();

  const tabLabels: Record<TabType, string> = {
    body: t("bodyPart"),
    symptom: t("symptom"),
    search: t("search"),
  };

  return (
    <div className="flex gap-2 px-4 py-3" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => setActiveTab(tab)}
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            activeTab === tab
              ? "bg-blue-600 text-white"
              : "border border-gray-300 text-gray-600 hover:bg-gray-50"
          )}
        >
          {tabLabels[tab]}
        </button>
      ))}
    </div>
  );
};
