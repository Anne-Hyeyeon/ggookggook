import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

export const useFavorites = () => {
  const { user } = useAuth();
  const [rawFavoriteIds, setRawFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchFavorites = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("favorites")
        .select("acupoint_id")
        .eq("user_id", user.id);
      setRawFavoriteIds(data?.map((f) => f.acupoint_id) ?? []);
      setIsLoading(false);
    };
    fetchFavorites();
    return () => { setRawFavoriteIds([]); };
  }, [user]);

  const favoriteIds = useMemo(
    () => (user ? rawFavoriteIds : []),
    [user, rawFavoriteIds]
  );

  const toggleFavorite = useCallback(async (acupointId: string) => {
    if (!user) return;
    const supabase = createClient();
    const isFavorited = rawFavoriteIds.includes(acupointId);

    setRawFavoriteIds((prev) =>
      isFavorited ? prev.filter((id) => id !== acupointId) : [...prev, acupointId]
    );

    if (isFavorited) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("acupoint_id", acupointId);
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, acupoint_id: acupointId });
    }
  }, [user, rawFavoriteIds]);

  const isFavorite = useCallback(
    (acupointId: string) => favoriteIds.includes(acupointId),
    [favoriteIds]
  );

  return { favoriteIds, isLoading, toggleFavorite, isFavorite };
};
