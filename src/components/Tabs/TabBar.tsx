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
    <nav
      className="flex w-full bg-surface-container-low rounded-full p-1.5 gap-1"
      role="tablist"
    >
      {TABS.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => setActiveTab(tab)}
          className={clsx(
            "flex-1 py-2.5 text-center rounded-full cursor-pointer text-sm transition-all duration-300",
            activeTab === tab
              ? "bg-primary text-on-primary font-bold shadow-sm"
              : "text-on-surface-variant font-semibold"
          )}
        >
          {tabLabels[tab]}
        </button>
      ))}
    </nav>
  );
};
