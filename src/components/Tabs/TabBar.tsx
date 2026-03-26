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
      className="glass-panel flex w-full gap-1 rounded-[28px] p-1.5 shadow-[0_10px_28px_rgba(24,32,29,0.05)]"
      role="tablist"
    >
      {TABS.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => setActiveTab(tab)}
          className={clsx(
            "flex-1 rounded-[22px] px-4 py-3 text-center text-sm transition-all duration-300 cursor-pointer",
            activeTab === tab
              ? "bg-brand text-white font-bold shadow-[0_14px_24px_rgba(21,33,28,0.12)]"
              : "text-on-surface-variant font-semibold hover:text-on-surface"
          )}
        >
          {tabLabels[tab]}
        </button>
      ))}
    </nav>
  );
};
