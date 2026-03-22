import type { IBilingualText, Locale } from "@/types";

export const getLocalizedText = (text: IBilingualText, locale: Locale): string =>
  text[locale];
