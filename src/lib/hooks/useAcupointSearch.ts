import { useState, useEffect, useRef } from "react";
import { searchAcupoints } from "@/lib/utils/data";
import type { IAcupoint } from "@/types";

export const useAcupointSearch = (debounceMs = 300) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [query, debounceMs]);

  const results: IAcupoint[] =
    debouncedQuery.length < 1 ? [] : searchAcupoints(debouncedQuery);

  return { query, setQuery, results };
};
