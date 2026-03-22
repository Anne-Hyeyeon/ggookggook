"use client";

import { useLocale } from "next-intl";
import type { Locale } from "@/types";

export const LocaleSwitcher = () => {
  const locale = useLocale() as Locale;

  const handleSwitch = () => {
    const newLocale = locale === "ko" ? "en" : "ko";
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    window.location.reload();
  };

  return (
    <button
      onClick={handleSwitch}
      className="rounded-full border border-gray-300 px-2.5 py-1 text-xs"
      aria-label={`Switch to ${locale === "ko" ? "English" : "한국어"}`}
    >
      {locale === "ko" ? "EN" : "한국어"}
    </button>
  );
};
